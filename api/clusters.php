<?php
/**
 * DX Clusters API
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
        try {
            $this->db = new Database();
        } catch (Exception $e) {
            // If database connection fails, we'll return hardcoded clusters
            $this->db = null;
        }
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
                $this->addCluster();
                break;
            case 'PUT':
                $this->updateCluster();
                break;
            case 'DELETE':
                $this->deleteCluster();
                break;
            default:
                http_response_code(405);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Method not allowed']);
                break;
        }
    }
    
    /**
     * Get available DX clusters
     */
    private function getClusters() {
        try {
            if ($this->db && $this->db->tableExists('dx_clusters')) {
                $sql = "SELECT id, name, host, port, description, is_active 
                        FROM dx_clusters 
                        WHERE is_active = 1 
                        ORDER BY name";
                $result = $this->db->query($sql);
                $clusters = $result->fetchAll();
                
                if (!empty($clusters)) {
                    echo json_encode($clusters);
                    return;
                }
            }
            
            // Fallback to hardcoded clusters if database is not available
            $clusters = $this->getDefaultClusters();
            echo json_encode($clusters);
            
        } catch (Exception $e) {
            error_log("Clusters API error: " . $e->getMessage());
            
            // Return default clusters as fallback
            $clusters = $this->getDefaultClusters();
            echo json_encode($clusters);
        }
    }
    
    /**
     * Add a new cluster
     */
    private function addCluster() {
        try {
            if (!$this->db) {
                http_response_code(503);
                echo json_encode(['error' => 'Database not available']);
                return;
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input || !isset($input['name']) || !isset($input['host']) || !isset($input['port'])) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Name, host, and port are required']);
                return;
            }
            
            $sql = "INSERT INTO dx_clusters (name, host, port, description) VALUES (?, ?, ?, ?)";
            $this->db->execute($sql, [
                $input['name'],
                $input['host'],
                $input['port'],
                $input['description'] ?? ''
            ]);
            
            $clusterId = $this->db->lastInsertId();
            
            echo json_encode([
                'success' => true,
                'message' => 'Cluster added successfully',
                'cluster_id' => $clusterId
            ]);
        } catch (Exception $e) {
            error_log("Add cluster error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Failed to add cluster']);
        }
    }
    
    /**
     * Update cluster
     */
    private function updateCluster() {
        try {
            if (!$this->db) {
                http_response_code(503);
                echo json_encode(['error' => 'Database not available']);
                return;
            }
            
            $clusterId = isset($_GET['id']) ? intval($_GET['id']) : 0;
            
            if (!$clusterId) {
                http_response_code(400);
                echo json_encode(['error' => 'Cluster ID required']);
                return;
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON data']);
                return;
            }
            
            $sql = "UPDATE dx_clusters SET name = ?, host = ?, port = ?, description = ? WHERE id = ?";
            $this->db->execute($sql, [
                $input['name'],
                $input['host'],
                $input['port'],
                $input['description'] ?? '',
                $clusterId
            ]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Cluster updated successfully'
            ]);
        } catch (Exception $e) {
            error_log("Update cluster error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update cluster']);
        }
    }
    
    /**
     * Delete cluster
     */
    private function deleteCluster() {
        try {
            if (!$this->db) {
                http_response_code(503);
                echo json_encode(['error' => 'Database not available']);
                return;
            }
            
            $clusterId = isset($_GET['id']) ? intval($_GET['id']) : 0;
            
            if (!$clusterId) {
                http_response_code(400);
                echo json_encode(['error' => 'Cluster ID required']);
                return;
            }
            
            $sql = "UPDATE dx_clusters SET is_active = 0 WHERE id = ?";
            $this->db->execute($sql, [$clusterId]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Cluster deactivated successfully'
            ]);
        } catch (Exception $e) {
            error_log("Delete cluster error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete cluster']);
        }
    }
    
    /**
     * Get default clusters as fallback
     */
    private function getDefaultClusters() {
        return [
            [
                'id' => 1,
                'name' => 'DX Summit',
                'host' => 'dxc.dxsummit.fi',
                'port' => 8000,
                'description' => 'Popular DX cluster with web interface',
                'is_active' => 1
            ],
            [
                'id' => 2,
                'name' => 'OH2AQ',
                'host' => 'oh2aq.kolumbus.fi',
                'port' => 41112,
                'description' => 'Finnish DX cluster',
                'is_active' => 1
            ],
            [
                'id' => 3,
                'name' => 'VE7CC',
                'host' => 've7cc.net',
                'port' => 23,
                'description' => 'Canadian DX cluster',
                'is_active' => 1
            ],
            [
                'id' => 4,
                'name' => 'W3LPL',
                'host' => 'w3lpl.net',
                'port' => 7300,
                'description' => 'US East Coast DX cluster',
                'is_active' => 1
            ],
            [
                'id' => 5,
                'name' => 'OM0RX Cluster',
                'host' => 'cluster.om0rx.com',
                'port' => 7300,
                'description' => 'OM0RX Personal DX Cluster',
                'is_active' => 1
            ]
        ];
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