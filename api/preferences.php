<?php
/**
 * User Preferences API
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

require_once '../config/config.php';
require_once 'database.php';

setCorsHeaders();

class PreferencesAPI {
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
                $this->getPreferences();
                break;
            case 'POST':
                $this->savePreferences();
                break;
            default:
                http_response_code(405);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Method not allowed']);
                break;
        }
    }
    
    /**
     * Get user preferences
     */
    private function getPreferences() {
        try {
            // For now, we'll use session-based preferences
            // In a full implementation, you'd have user authentication
            $userId = $this->getCurrentUserId();
            
            if (!$userId) {
                // Return default preferences for guest users
                echo json_encode($this->getDefaultPreferences());
                return;
            }
            
            $sql = "SELECT preference_key, preference_value 
                    FROM user_preferences 
                    WHERE user_id = ?";
            
            $result = $this->db->query($sql, [$userId]);
            $preferences = [];
            
            while ($row = $result->fetch()) {
                $preferences[$row['preference_key']] = json_decode($row['preference_value'], true);
            }
            
            // Merge with defaults for any missing preferences
            $preferences = array_merge($this->getDefaultPreferences(), $preferences);
            
            echo json_encode($preferences);
        } catch (Exception $e) {
            error_log("Preferences API error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch preferences']);
        }
    }
    
    /**
     * Save user preferences
     */
    private function savePreferences() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Invalid JSON data']);
                return;
            }
            
            $userId = $this->getCurrentUserId();
            
            if (!$userId) {
                // Create a guest user session
                $userId = $this->createGuestUser();
            }
            
            $this->db->beginTransaction();
            
            // Delete existing preferences
            $sql = "DELETE FROM user_preferences WHERE user_id = ?";
            $this->db->execute($sql, [$userId]);
            
            // Insert new preferences
            $sql = "INSERT INTO user_preferences (user_id, preference_key, preference_value) 
                    VALUES (?, ?, ?)";
            
            foreach ($input as $key => $value) {
                $this->db->execute($sql, [
                    $userId,
                    $key,
                    json_encode($value)
                ]);
            }
            
            $this->db->commit();
            
            echo json_encode(['success' => true, 'message' => 'Preferences saved']);
        } catch (Exception $e) {
            $this->db->rollback();
            error_log("Save preferences error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save preferences']);
        }
    }
    
    /**
     * Get current user ID (simplified for demo)
     */
    private function getCurrentUserId() {
        session_start();
        
        if (isset($_SESSION['user_id'])) {
            return $_SESSION['user_id'];
        }
        
        return null;
    }
    
    /**
     * Create a guest user for preferences storage
     */
    private function createGuestUser() {
        session_start();
        
        // Generate a unique guest ID
        $guestId = 'guest_' . uniqid();
        
        // Create user record
        $sql = "INSERT INTO users (callsign, created_at) VALUES (?, NOW())";
        $this->db->execute($sql, [$guestId]);
        
        $userId = $this->db->lastInsertId();
        $_SESSION['user_id'] = $userId;
        
        return $userId;
    }
    
    /**
     * Get default preferences
     */
    private function getDefaultPreferences() {
        global $default_preferences;
        return $default_preferences;
    }
    
    /**
     * Validate preferences data
     */
    private function validatePreferences($preferences) {
        $errors = [];
        
        // Validate callsign if provided
        if (isset($preferences['callsign']) && !empty($preferences['callsign'])) {
            if (!DatabaseUtils::validateCallsign($preferences['callsign'])) {
                $errors[] = 'Invalid callsign format';
            }
        }
        
        // Validate theme
        if (isset($preferences['theme']) && !in_array($preferences['theme'], ['light', 'dark'])) {
            $errors[] = 'Invalid theme selection';
        }
        
        // Validate Wavelog URL if provided
        if (isset($preferences['wavelogUrl']) && !empty($preferences['wavelogUrl'])) {
            if (!filter_var($preferences['wavelogUrl'], FILTER_VALIDATE_URL)) {
                $errors[] = 'Invalid Wavelog URL';
            }
        }
        
        // Validate colors
        if (isset($preferences['colors']) && is_array($preferences['colors'])) {
            foreach ($preferences['colors'] as $key => $color) {
                if (!preg_match('/^#[0-9a-fA-F]{6}$/', $color)) {
                    $errors[] = "Invalid color format for {$key}";
                }
            }
        }
        
        return $errors;
    }
}

// Handle the request
try {
    $api = new PreferencesAPI();
    $api->handleRequest();
} catch (Exception $e) {
    error_log("Preferences API fatal error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
?>