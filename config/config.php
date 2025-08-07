<?php
/**
 * DX Cluster Web Application Configuration
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'dx_cluster');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Application Settings
define('APP_NAME', 'DX Cluster Web');
define('APP_VERSION', '1.0.0');
define('APP_DEBUG', true);

// WebSocket Configuration
// Use 0.0.0.0 to bind to all interfaces for production
define('WS_HOST', '0.0.0.0');
define('WS_PORT', 8080);

// External APIs
define('NG3K_CLUSTER_URL', 'https://www.ng3k.com/misc/cluster.html');

// Session Configuration
define('SESSION_TIMEOUT', 3600); // 1 hour
define('SPOT_RETENTION_HOURS', 48); // Keep spots for 48 hours

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

// Error Reporting
if (APP_DEBUG) {
    // Suppress deprecated warnings but show other errors
    error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Timezone
date_default_timezone_set('UTC');

// CORS Headers for API
function setCorsHeaders() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Content-Type: application/json');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}