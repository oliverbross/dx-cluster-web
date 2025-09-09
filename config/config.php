<?php
/**
 * DX Cluster Web Application Configuration
 * Production deployment with .env support for cluster.wavelog.online
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

// Load environment variables
require_once __DIR__ . '/env-loader.php';

// Database Configuration from .env
define('DB_HOST', env('DB_HOST', 'localhost'));
define('DB_NAME', env('DB_NAME', 'dx_cluster'));
define('DB_USER', env('DB_USER', 'root'));
define('DB_PASS', env('DB_PASS', ''));
define('DB_CHARSET', env('DB_CHARSET', 'utf8mb4'));

// Application Configuration
define('APP_NAME', 'DX Cluster Web');
define('APP_VERSION', '1.0.0');
define('APP_ENV', env('APP_ENV', 'production'));
define('APP_DEBUG', env('APP_DEBUG', false));
define('APP_URL', env('APP_URL', 'https://cluster.wavelog.online'));

// WebSocket Configuration
define('WS_HOST', env('WS_HOST', '0.0.0.0'));
define('WS_PORT', env('WS_PORT', 8080));

// Session Configuration
define('SESSION_LIFETIME', env('SESSION_LIFETIME', 7200)); // 2 hours
define('SESSION_NAME', env('SESSION_NAME', 'dx_cluster_session'));
define('SESSION_TIMEOUT', 3600); // 1 hour for legacy compatibility
define('SPOT_RETENTION_HOURS', 48); // Keep spots for 48 hours

// Security Configuration
define('CSRF_TOKEN_NAME', env('CSRF_TOKEN_NAME', 'csrf_token'));

// Logging Configuration
define('LOG_LEVEL', env('LOG_LEVEL', 'INFO'));

// External APIs
define('NG3K_CLUSTER_URL', 'https://www.ng3k.com/misc/cluster.html');

// Default User Preferences
$default_preferences = [
    'theme' => 'dark',
    'auto_connect' => false,
    'default_cluster' => 1,
    'show_bands' => ['160m', '80m', '40m', '20m', '17m', '15m', '12m', '10m', '6m'],
    'show_modes' => ['CW', 'SSB', 'FT8', 'FT4', 'RTTY', 'PSK31'],
    'color_new_dxcc' => '#ff4444',
    'color_new_band' => '#44ff44',
    'color_new_mode' => '#4444ff',
    'color_worked' => '#ffaa44',
    'color_confirmed' => '#888888',
    'audio_enabled' => false,
    'audio_language' => 'en',
    'audio_speed' => 1.0,
    'audio_volume' => 0.7,
    'max_spots_display' => 500,
    'spot_timeout_minutes' => 120
];

// Error reporting based on environment
$errorReporting = env('ERROR_REPORTING', 'E_ALL & ~E_NOTICE & ~E_DEPRECATED');
if (is_string($errorReporting)) {
    eval('$errorReporting = ' . $errorReporting . ';');
}

if (APP_DEBUG) {
    error_reporting($errorReporting);
    ini_set('display_errors', 1);
} else {
    error_reporting($errorReporting);
    ini_set('display_errors', 0);
}

// Set timezone
date_default_timezone_set('UTC');

// Start session if not already started
if (session_status() == PHP_SESSION_NONE) {
    session_name(SESSION_NAME);
    session_start();
}

/**
 * Set CORS headers for API responses
 */
function setCorsHeaders() {
    $allowedOrigins = [
        'https://cluster.wavelog.online',
        'http://localhost:8000',
        'http://localhost:3000'
    ];
    
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $allowedOrigins)) {
        header("Access-Control-Allow-Origin: $origin");
    } else {
        header('Access-Control-Allow-Origin: https://cluster.wavelog.online');
    }
    
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    header('Content-Type: application/json');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

/**
 * Get current timestamp in UTC
 */
function getCurrentTimestamp() {
    return gmdate('Y-m-d H:i:s');
}

/**
 * Sanitize input data
 */
function sanitizeInput($data) {
    if (is_array($data)) {
        return array_map('sanitizeInput', $data);
    }
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

/**
 * Generate CSRF token
 */
function generateCSRFToken() {
    if (!isset($_SESSION[CSRF_TOKEN_NAME])) {
        $_SESSION[CSRF_TOKEN_NAME] = bin2hex(random_bytes(32));
    }
    return $_SESSION[CSRF_TOKEN_NAME];
}

/**
 * Verify CSRF token
 */
function verifyCSRFToken($token) {
    return isset($_SESSION[CSRF_TOKEN_NAME]) && hash_equals($_SESSION[CSRF_TOKEN_NAME], $token);
}

/**
 * Log error message
 */
function logError($message, $context = []) {
    if (in_array(LOG_LEVEL, ['DEBUG', 'ERROR', 'INFO'])) {
        $timestamp = getCurrentTimestamp();
        $contextStr = !empty($context) ? ' Context: ' . json_encode($context) : '';
        error_log("[$timestamp] [cluster.wavelog.online] DX Cluster Error: $message$contextStr");
    }
}

/**
 * Log info message  
 */
function logInfo($message, $context = []) {
    if (in_array(LOG_LEVEL, ['DEBUG', 'INFO'])) {
        $timestamp = getCurrentTimestamp();
        $contextStr = !empty($context) ? ' Context: ' . json_encode($context) : '';
        error_log("[$timestamp] [cluster.wavelog.online] DX Cluster Info: $message$contextStr");
    }
}

/**
 * Check if .env file exists, if not provide helpful message
 */
function checkConfiguration() {
    $envPath = dirname(__DIR__) . '/.env';
    if (!file_exists($envPath)) {
        if (php_sapi_name() !== 'cli') {
            http_response_code(503);
            header('Content-Type: text/html');
            echo '<!DOCTYPE html>
            <html>
            <head>
                <title>Configuration Required - DX Cluster Web</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
                    .container { background: white; padding: 40px; border-radius: 12px; max-width: 600px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); text-align: center; }
                    h1 { color: #e74c3c; margin-bottom: 20px; }
                    .logo { font-size: 48px; margin-bottom: 20px; }
                    .btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 20px; font-weight: 600; transition: transform 0.3s; }
                    .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.2); }
                    .code { background: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-family: Monaco, monospace; color: #e83e8c; }
                    .features { text-align: left; margin: 30px 0; }
                    .feature { margin: 10px 0; color: #666; }
                    .server-info { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">🌐</div>
                    <h1>DX Cluster Web Setup Required</h1>
                    <div class="server-info">
                        <h3>🚀 Production Server: cluster.wavelog.online</h3>
                        <p><strong>Database:</strong> MariaDB 10.6.22 Ready</p>
                    </div>
                    <p>Welcome to your DX Cluster Web application! To get started, please run the setup wizard to configure your database connection.</p>
                    
                    <div class="features">
                        <div class="feature">✅ Modern responsive interface</div>
                        <div class="feature">✅ Real-time DX cluster monitoring</div>
                        <div class="feature">✅ Wavelog integration</div>
                        <div class="feature">✅ Multiple cluster support</div>
                        <div class="feature">✅ Advanced filtering and alerts</div>
                    </div>
                    
                    <a href="setup.php" class="btn">🔧 Start Setup Wizard</a>
                    
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 14px; color: #666;">
                        The setup will create your <span class="code">.env</span> configuration file and set up the database automatically.
                    </p>
                </div>
            </body>
            </html>';
            exit;
        }
        return false;
    }
    return true;
}

// Check configuration on non-CLI requests
if (php_sapi_name() !== 'cli') {
    checkConfiguration();
}
?>