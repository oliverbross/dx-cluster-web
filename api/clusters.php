<?php
/**
 * DX Clusters API - Fetch and manage DX cluster list
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

require_once '../config/config.php';
require_once 'database.php';

setCorsHeaders();

class ClustersAPI {
    private $db;
    
    public function __construct() {
        $this->db = new Database();
    }
    
    /**
     * Handle API requests
     */
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        
        switch ($method) {
            case 'GET':
                $this->getClusters();
                break;
            case 'POST':
                $this->updateClusters();
                break;
            default:
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                break;
        }
    }
    
    /**
     * Get list of DX clusters
     */
    private function getClusters() {
        try {
            // First try to get from database
            $clusters = $this->getClustersFromDatabase();
            
            // If database is empty or old, fetch from ng3k.com
            if (empty($clusters) || $this->shouldUpdateClusters()) {
                $this->fetchAndStoreClusters();
                $clusters = $this->getClustersFromDatabase();
            }
            
            echo json_encode($clusters);
        } catch (Exception $e) {
            error_log("Clusters API error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch clusters']);
        }
    }
    
    /**
     * Get clusters from database
     */
    private function getClustersFromDatabase() {
        $sql = "SELECT id, name, host, port, description, is_active 
                FROM dx_clusters 
                WHERE is_active = 1 
                ORDER BY name";
        
        $result = $this->db->query($sql);
        return $result ? $result->fetchAll(PDO::FETCH_ASSOC) : [];
    }
    
    /**
     * Check if clusters should be updated (daily update)
     */
    private function shouldUpdateClusters() {
        $sql = "SELECT MAX(last_updated) as last_update FROM dx_clusters";
        $result = $this->db->query($sql);
        
        if ($result) {
            $row = $result->fetch(PDO::FETCH_ASSOC);
            if ($row['last_update']) {
                $lastUpdate = strtotime($row['last_update']);
                $dayAgo = time() - (24 * 60 * 60);
                return $lastUpdate < $dayAgo;
            }
        }
        
        return true; // Update if no data
    }
    
    /**
     * Fetch clusters from ng3k.com and store in database
     */
    private function fetchAndStoreClusters() {
        try {
            $html = $this->fetchNG3KPage();
            $clusters = $this->parseNG3KClusters($html);
            $this->storeClusters($clusters);
        } catch (Exception $e) {
            error_log("Failed to fetch clusters from ng3k.com: " . $e->getMessage());
            // Don't throw - we can still use existing database data
        }
    }
    
    /**
     * Fetch the ng3k.com cluster page
     */
    private function fetchNG3KPage() {
        $context = stream_context_create([
            'http' => [
                'timeout' => 30,
                'user_agent' => 'DX Cluster Web Application/1.0'
            ]
        ]);
        
        $html = file_get_contents(NG3K_CLUSTER_URL, false, $context);
        
        if ($html === false) {
            throw new Exception('Failed to fetch ng3k.com page');
        }
        
        return $html;
    }
    
    /**
     * Parse clusters from ng3k.com HTML
     */
    private function parseNG3KClusters($html) {
        $clusters = [];
        
        // Parse the HTML to extract cluster information
        // The ng3k.com page has clusters in a specific format
        // This is a simplified parser - you might need to adjust based on actual page structure
        
        $dom = new DOMDocument();
        @$dom->loadHTML($html);
        $xpath = new DOMXPath($dom);
        
        // Look for table rows or specific patterns
        // This is a basic implementation - adjust based on actual ng3k.com structure
        $rows = $xpath->query('//tr');
        
        foreach ($rows as $row) {
            $cells = $row->getElementsByTagName('td');
            if ($cells->length >= 3) {
                $name = trim($cells->item(0)->textContent);
                $address = trim($cells->item(1)->textContent);
                $port = trim($cells->item(2)->textContent);
                
                // Extract host and port
                if (preg_match('/^([^:]+):?(\d+)?$/', $address, $matches)) {
                    $host = $matches[1];
                    $portNum = isset($matches[2]) ? intval($matches[2]) : intval($port);
                    
                    if ($host && $portNum > 0) {
                        $clusters[] = [
                            'name' => $name,
                            'host' => $host,
                            'port' => $portNum,
                            'description' => "Cluster from ng3k.com"
                        ];
                    }
                }
            }
        }
        
        // If parsing fails, return some default clusters
        if (empty($clusters)) {
            $clusters = $this->getDefaultClusters();
        }
        
        return $clusters;
    }
    
    /**
     * Get default clusters if ng3k.com parsing fails
     */
    private function getDefaultClusters() {
        return [
            [
                'name' => 'DX Summit',
                'host' => 'dxc.dxsummit.fi',
                'port' => 8000,
                'description' => 'Popular DX cluster with web interface'
            ],
            [
                'name' => 'OH2AQ',
                'host' => 'oh2aq.kolumbus.fi',
                'port' => 41112,
                'description' => 'Finnish DX cluster'
            ],
            [
                'name' => 'VE7CC',
                'host' => 've7cc.net',
                'port' => 23,
                'description' => 'Canadian DX cluster'
            ],
            [
                'name' => 'W3LPL',
                'host' => 'w3lpl.net',
                'port' => 7300,
                'description' => 'US East Coast DX cluster'
            ],
            [
                'name' => 'K3LR',
                'host' => 'k3lr.com',
                'port' => 7300,
                'description' => 'US East Coast DX cluster'
            ],
            [
                'name' => 'DX Spider',
                'host' => 'dxspider.net',
                'port' => 8000,
                'description' => 'DX Spider cluster network'
            ]
        ];
    }
    
    /**
     * Store clusters in database
     */
    private function storeClusters($clusters) {
        try {
            $this->db->beginTransaction();
            
            // Clear existing clusters (except custom ones)
            $sql = "DELETE FROM dx_clusters WHERE description LIKE '%ng3k.com%'";
            $this->db->execute($sql);
            
            // Insert new clusters
            $sql = "INSERT INTO dx_clusters (name, host, port, description, is_active) 
                    VALUES (?, ?, ?, ?, 1)";
            
            foreach ($clusters as $cluster) {
                $this->db->execute($sql, [
                    $cluster['name'],
                    $cluster['host'],
                    $cluster['port'],
                    $cluster['description']
                ]);
            }
            
            $this->db->commit();
        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }
    
    /**
     * Update clusters (admin function)
     */
    private function updateClusters() {
        // This could be used for manual cluster updates
        // For now, just trigger a refresh
        $this->fetchAndStoreClusters();
        $this->getClusters();
    }
}

// Handle the request
try {
    $api = new ClustersAPI();
    $api->handleRequest();
} catch (Exception $e) {
    error_log("Clusters API fatal error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
?>