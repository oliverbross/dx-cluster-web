<?php
/**
 * Development Server for DX Cluster Web Application
 * Simple PHP built-in server with routing
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

// Get the requested URI
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = urldecode($uri);

// Remove leading slash and dx-cluster prefix if present
$uri = ltrim($uri, '/');
if (strpos($uri, 'dx-cluster/') === 0) {
    $uri = substr($uri, 10);
}

// Route API requests
if (strpos($uri, 'api/') === 0) {
    $apiFile = __DIR__ . '/../' . $uri . '.php';
    
    if (file_exists($apiFile)) {
        // Set proper headers for API
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }
        
        include $apiFile;
        exit();
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'API endpoint not found']);
        exit();
    }
}

// Serve static files
$staticFile = __DIR__ . '/../' . $uri;

if (file_exists($staticFile) && is_file($staticFile)) {
    // Determine content type
    $ext = pathinfo($staticFile, PATHINFO_EXTENSION);
    $contentTypes = [
        'html' => 'text/html',
        'css' => 'text/css',
        'js' => 'application/javascript',
        'json' => 'application/json',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon'
    ];
    
    $contentType = $contentTypes[$ext] ?? 'text/plain';
    header("Content-Type: $contentType");
    
    readfile($staticFile);
    exit();
}

// Default to index.html for SPA routing
if (empty($uri) || $uri === '/') {
    $indexFile = __DIR__ . '/../index.html';
    if (file_exists($indexFile)) {
        header('Content-Type: text/html');
        readfile($indexFile);
        exit();
    }
}

// 404 for everything else
http_response_code(404);
echo "404 - File not found: $uri";
?>