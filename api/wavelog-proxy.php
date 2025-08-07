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
        error_log("Wavelog proxy: Request received - Method: " . $_SERVER['REQUEST_METHOD'] . ", URI: " . $_SERVER['REQUEST_URI']);
        error_log("Wavelog proxy: Headers: " . print_r(getallheaders(), true));
        error_log("Wavelog proxy: Raw input: " . file_get_contents('php://input'));
        
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
                error_log("Wavelog proxy: Raw input - " . file_get_contents('php://input'));
                http_response_code(400);
                header('Content-Type: application/json');
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
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Wavelog settings not configured', 'settings' => $wavelogSettings]);
                return;
            }
            
            // Validate settings
            if (empty($wavelogSettings['url']) || empty($wavelogSettings['api_key'])) {
                error_log("Wavelog proxy: Missing URL or API key in settings - " . print_r($wavelogSettings, true));
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Wavelog URL or API key not configured', 'settings' => $wavelogSettings]);
                return;
            }
            
            // Build full API URL
            $baseUrl = $wavelogSettings['url'] ?? '';
            if (empty($baseUrl)) {
                // Use default Wavelog URL from preferences if not set in user settings
                $baseUrl = 'https://om0rx.wavelog.online/index.php'; // Default fallback with index.php
            }
            // Ensure the base URL ends with index.php
            if (!str_ends_with($baseUrl, 'index.php')) {
                $baseUrl = rtrim($baseUrl, '/') . '/index.php';
            }
            // Remove index.php from the base URL since we're adding /api/
            $baseUrl = str_replace('/index.php', '', $baseUrl);
            $apiUrl = rtrim($baseUrl, '/') . '/api/' . ltrim($endpoint, '/');
            
            // Make request to Wavelog API
            $response = $this->makeWavelogRequest($apiUrl, $data);
            
            if ($response === false) {
                http_response_code(500);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Failed to connect to Wavelog API']);
                return;
            }
            
            // Return response
            echo $response;
        } catch (Exception $e) {
            error_log("Wavelog proxy error: " . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Proxy request failed']);
        }
    }
    
    /**
     * Get user's Wavelog settings from database
     */
    private function getUserWavelogSettings() {
        try {
            session_start();
            
            error_log("Wavelog proxy: Session data - " . print_r($_SESSION, true));
            
            if (!isset($_SESSION['user_id'])) {
                error_log("Wavelog proxy: No user_id in session");
                return null;
            }
            
            $userId = $_SESSION['user_id'];
            error_log("Wavelog proxy: User ID - " . $userId);
            
            $sql = "SELECT wavelog_url as url, wavelog_api_key as api_key, wavelog_logbook_slug as logbook_slug
                    FROM users WHERE id = ?";
            $result = $this->db->query($sql, [$userId]);
            $user = $result->fetch();
            
            error_log("Wavelog proxy: User data from DB - " . print_r($user, true));
            
            // Allow returning partial settings for testing
            if (!$user) {
                error_log("Wavelog proxy: No user data found in DB");
                // Return default settings for testing - use the data from the outer scope
                error_log("Wavelog proxy: Returning defaults with API key from input data");
                return [
                    'url' => 'https://om0rx.wavelog.online/index.php',
                    'api_key' => $data['key'] ?? 'wl489abaab6e4f4', // Use API key from input data or default
                    'logbook_slug' => $data['logbook_public_slug'] ?? 'default-logbook'
                ];
            }
            
            // Ensure URL has the correct format
            if (!empty($user['url']) && !str_contains($user['url'], 'index.php')) {
                $user['url'] = rtrim($user['url'], '/') . '/index.php';
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
        error_log("Wavelog proxy: Making request to $url with data: " . json_encode($data));
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        
        error_log("Wavelog proxy: cURL response - HTTP Code: $httpCode, Response: " . substr($response, 0, 500));
        
        if ($curlError) {
            error_log("cURL error: " . $curlError);
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
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Internal server error']);
            }
?>