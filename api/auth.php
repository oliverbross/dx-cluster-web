<?php
/**
 * User Authentication API
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

require_once '../config/config.php';
require_once 'database.php';

setCorsHeaders();

class AuthAPI {
    private $db;
    
    public function __construct() {
        $this->db = new Database();
    }
    
    /**
     * Handle API requests
     */
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $action = isset($_GET['action']) ? $_GET['action'] : 'login';
        
        switch ($method) {
            case 'POST':
                switch ($action) {
                    case 'login':
                        $this->login();
                        break;
                    case 'register':
                        $this->register();
                        break;
                    case 'logout':
                        $this->logout();
                        break;
                    case 'change-password':
                        $this->changePassword();
                        break;
                    default:
                        http_response_code(400);
                        echo json_encode(['error' => 'Invalid action']);
                        break;
                }
                break;
            case 'GET':
                switch ($action) {
                    case 'session':
                        $this->getSession();
                        break;
                    case 'profile':
                        $this->getProfile();
                        break;
                    default:
                        http_response_code(400);
                        header('Content-Type: application/json');
                        echo json_encode(['error' => 'Invalid action']);
                        break;
                }
                break;
            default:
                http_response_code(405);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Method not allowed']);
                break;
        }
    }
    
    /**
     * User login
     */
    private function login() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input || !isset($input['callsign']) || !isset($input['password'])) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Callsign and password required']);
                return;
            }
            
            $callsign = DatabaseUtils::sanitize($input['callsign']);
            $password = $input['password'];
            
            // Check if user exists
            $sql = "SELECT * FROM users WHERE callsign = ? AND is_active = 1";
            $result = $this->db->query($sql, [$callsign]);
            $user = $result->fetch();
            
            if (!$user) {
                http_response_code(401);
                echo json_encode(['error' => 'Invalid credentials']);
                return;
            }
            
            // Verify password
            if (!DatabaseUtils::verifyPassword($password, $user['password_hash'])) {
                http_response_code(401);
                echo json_encode(['error' => 'Invalid credentials']);
                return;
            }
            
            // Start session
            session_start();
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['callsign'] = $user['callsign'];
            $_SESSION['logged_in'] = time();
            
            // Update last login
            $sql = "UPDATE users SET last_login = NOW() WHERE id = ?";
            $this->db->execute($sql, [$user['id']]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Login successful',
                'user' => [
                    'id' => $user['id'],
                    'callsign' => $user['callsign'],
                    'email' => $user['email'],
                    'wavelog_url' => $user['wavelog_url'],
                    'wavelog_logbook_slug' => $user['wavelog_logbook_slug']
                ]
            ]);
        } catch (Exception $e) {
            error_log("Login error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Login failed: ' . $e->getMessage()]);
        }
    }
    
    /**
     * User registration
     */
    private function register() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input || !isset($input['callsign']) || !isset($input['password']) || !isset($input['email'])) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Callsign, email, and password required']);
                return;
            }
            
            $callsign = DatabaseUtils::sanitize($input['callsign']);
            $email = DatabaseUtils::sanitize($input['email']);
            $password = $input['password'];
            
            // Validate input
            if (!DatabaseUtils::validateCallsign($callsign)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid callsign format']);
                return;
            }
            
            if (!DatabaseUtils::validateEmail($email)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid email format']);
                return;
            }
            
            // Check if callsign already exists
            $sql = "SELECT id FROM users WHERE callsign = ?";
            $result = $this->db->query($sql, [$callsign]);
            if ($result->fetch()) {
                http_response_code(409);
                echo json_encode(['error' => 'Callsign already registered']);
                return;
            }
            
            // Check if email already exists
            $sql = "SELECT id FROM users WHERE email = ?";
            $result = $this->db->query($sql, [$email]);
            if ($result->fetch()) {
                http_response_code(409);
                echo json_encode(['error' => 'Email already registered']);
                return;
            }
            
            // Hash password
            $passwordHash = DatabaseUtils::hashPassword($password);
            
            // Create user
            $sql = "INSERT INTO users (callsign, email, password_hash, created_at) VALUES (?, ?, ?, NOW())";
            $this->db->execute($sql, [$callsign, $email, $passwordHash]);
            
            $userId = $this->db->lastInsertId();
            
            echo json_encode([
                'success' => true,
                'message' => 'Registration successful',
                'user' => [
                    'id' => $userId,
                    'callsign' => $callsign,
                    'email' => $email
                ]
            ]);
        } catch (Exception $e) {
            error_log("Registration error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Registration failed']);
        }
    }
    
    /**
     * User logout
     */
    private function logout() {
        try {
            session_start();
            session_destroy();
            
            echo json_encode([
                'success' => true,
                'message' => 'Logout successful'
            ]);
        } catch (Exception $e) {
            error_log("Logout error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Logout failed']);
        }
    }
    
    /**
     * Change password
     */
    private function changePassword() {
        try {
            session_start();
            
            if (!isset($_SESSION['user_id'])) {
                http_response_code(401);
                echo json_encode(['error' => 'Not authenticated']);
                return;
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input || !isset($input['current_password']) || !isset($input['new_password'])) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Current and new password required']);
                return;
            }
            
            $userId = $_SESSION['user_id'];
            $currentPassword = $input['current_password'];
            $newPassword = $input['new_password'];
            
            // Get current user
            $sql = "SELECT password_hash FROM users WHERE id = ?";
            $result = $this->db->query($sql, [$userId]);
            $user = $result->fetch();
            
            if (!$user) {
                http_response_code(404);
                echo json_encode(['error' => 'User not found']);
                return;
            }
            
            // Verify current password
            if (!DatabaseUtils::verifyPassword($currentPassword, $user['password_hash'])) {
                http_response_code(401);
                echo json_encode(['error' => 'Current password is incorrect']);
                return;
            }
            
            // Hash new password
            $newPasswordHash = DatabaseUtils::hashPassword($newPassword);
            
            // Update password
            $sql = "UPDATE users SET password_hash = ? WHERE id = ?";
            $this->db->execute($sql, [$newPasswordHash, $userId]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Password changed successfully'
            ]);
        } catch (Exception $e) {
            error_log("Change password error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Password change failed']);
        }
    }
    
    /**
     * Get current session
     */
    private function getSession() {
        try {
            session_start();
            
            if (!isset($_SESSION['user_id'])) {
                echo json_encode(['authenticated' => false]);
                return;
            }
            
            // Check session timeout
            if (isset($_SESSION['logged_in']) && (time() - $_SESSION['logged_in']) > SESSION_TIMEOUT) {
                session_destroy();
                echo json_encode(['authenticated' => false]);
                return;
            }
            
            // Update session timestamp
            $_SESSION['logged_in'] = time();
            
            echo json_encode([
                'authenticated' => true,
                'user' => [
                    'id' => $_SESSION['user_id'],
                    'callsign' => $_SESSION['callsign']
                ]
            ]);
        } catch (Exception $e) {
            error_log("Session check error: " . $e->getMessage());
            echo json_encode(['authenticated' => false, 'error' => $e->getMessage()]);
        }
    }
    
    /**
     * Get user profile
     */
    private function getProfile() {
        try {
            session_start();
            
            if (!isset($_SESSION['user_id'])) {
                http_response_code(401);
                echo json_encode(['error' => 'Not authenticated']);
                return;
            }
            
            $userId = $_SESSION['user_id'];
            
            $sql = "SELECT id, callsign, email, wavelog_url, wavelog_logbook_slug, created_at, last_login 
                    FROM users WHERE id = ?";
            $result = $this->db->query($sql, [$userId]);
            $user = $result->fetch();
            
            if (!$user) {
                http_response_code(404);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'User not found']);
                return;
            }
            
            echo json_encode([
                'user' => [
                    'id' => $user['id'],
                    'callsign' => $user['callsign'],
                    'email' => $user['email'],
                    'wavelog_url' => $user['wavelog_url'],
                    'wavelog_logbook_slug' => $user['wavelog_logbook_slug'],
                    'created_at' => $user['created_at'],
                    'last_login' => $user['last_login']
                ]
            ]);
        } catch (Exception $e) {
            error_log("Profile error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Failed to get profile']);
        }
    }
}

// Handle the request
try {
    $api = new AuthAPI();
    $api->handleRequest();
} catch (Exception $e) {
    error_log("Auth API fatal error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
?>