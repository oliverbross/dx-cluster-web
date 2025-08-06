<?php
/**
 * Wavelog API Proxy
 * Server-side proxy to handle Wavelog API calls and avoid CORS issues
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

require_once '../config/config.php';
require_once 'database.php';

setCorsHeaders();

class WavelogProxy {
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
            case 'POST':
                $this->proxyWavelogRequest();
                break;
            default:
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                break;
        }
    }
    
    /**
     * Proxy Wavelog API requests
     */
    private function proxyWavelogRequest() {
        try {
            // Get request data
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input || !isset($input['endpoint']) || !isset($input['data'])) {
                error_log("Wavelog proxy: Invalid input - " . print_r($input, true));
                http_response_code(400);
                echo json_encode(['error' => 'Endpoint and data required', 'input' => $input]);
                return;
            }
            
            $endpoint = $input['endpoint'];
            $data = $input['data'];
            
            // Get user's Wavelog settings from database
            $wavelogSettings = $this->getUserWavelogSettings();
            if (!$wavelogSettings) {
                error_log("Wavelog proxy: User settings not found or incomplete");
                http_response_code(400);
                echo json_encode(['error' => 'Wavelog settings not configured', 'settings' => $wavelogSettings]);
                return;
            }
            
            // Validate settings
            if (empty($wavelogSettings['url']) || empty($wavelogSettings['api_key'])) {
                error_log("Wavelog proxy: Missing URL or API key in settings - " . print_r($wavelogSettings, true));
                http_response_code(400);
                echo json_encode(['error' => 'Wavelog URL or API key not configured', 'settings' => $wavelogSettings]);
                return;
            }
            
            // Build full API URL
            $baseUrl = $wavelogSettings['url'] ?? '';
            if (empty($baseUrl)) {
                // Use default Wavelog URL from preferences if not set in user settings
                $baseUrl = 'https://om0rx.wavelog.online'; // Default fallback
            }
            $apiUrl = rtrim($baseUrl, '/') . '/api/' . ltrim($endpoint, '/');
            
            // Make request to Wavelog API
            $response = $this->makeWavelogRequest($apiUrl, $data);
            
            if ($response === false) {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to connect to Wavelog API']);
                return;
            }
            
            // Return response
            echo $response;
        } catch (Exception $e) {
            error_log("Wavelog proxy error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Proxy request failed']);
        }
    }
    
    /**
     * Get user's Wavelog settings from database
     */
    private function getUserWavelogSettings() {
        try {
            session_start();
            
            if (!isset($_SESSION['user_id'])) {
                return null;
            }
            
            $userId = $_SESSION['user_id'];
            
            $sql = "SELECT wavelog_url as url, wavelog_api_key as api_key, wavelog_logbook_slug as logbook_slug
                    FROM users WHERE id = ?";
            $result = $this->db->query($sql, [$userId]);
            $user = $result->fetch();
            
            // Allow returning partial settings for testing
            if (!$user) {
                return null;
            }
            
            return $user;
        } catch (Exception $e) {
            error_log("Error getting Wavelog settings: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Make request to Wavelog API
     */
    private function makeWavelogRequest($url, $data) {
        $ch = curl_init();
        
        // Set cURL options
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'User-Agent: DX Cluster Web Application/1.0'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        
        // Execute request
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        if (curl_error($ch)) {
            error_log("cURL error: " . curl_error($ch));
            curl_close($ch);
            return false;
        }
        
        curl_close($ch);
        
        // Check HTTP status code
        if ($httpCode >= 400) {
            error_log("Wavelog API returned HTTP $httpCode: " . $response);
            // Return the error response so the frontend can handle it
            return $response;
        }
        
        return $response;
    }
}

// Handle the request
try {
    $proxy = new WavelogProxy();
    $proxy->handleRequest();
} catch (Exception $e) {
    error_log("Wavelog proxy fatal error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
?>