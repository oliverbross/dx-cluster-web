<?php
/**
 * Simple WebSocket test script
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

// Test WebSocket server connectivity
echo "📡 Testing WebSocket server connectivity...\n";

// Check if server is running
$host = 'localhost';
$port = 8080;

echo "🔍 Checking if WebSocket server is listening on {$host}:{$port}...\n";

$connection = @fsockopen($host, $port, $errno, $errstr, 5);

if ($connection) {
    echo "✅ WebSocket server is listening on {$host}:{$port}\n";
    fclose($connection);
    
    // Test WebSocket handshake
    echo "🔍 Testing WebSocket handshake...\n";
    
    // Create a simple HTTP request to test WebSocket upgrade
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'Connection: Upgrade',
                'Upgrade: websocket',
                'Sec-WebSocket-Version: 13',
                'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ=='
            ],
            'timeout' => 10
        ]
    ]);
    
    $url = "http://{$host}:{$port}/";
    $result = @file_get_contents($url, false, $context);
    $http_response_header_info = $http_response_header ?? [];
    
    if ($result !== false) {
        echo "✅ WebSocket handshake test completed\n";
        echo "   HTTP Response: " . implode(', ', $http_response_header_info) . "\n";
    } else {
        echo "⚠️  WebSocket handshake test failed\n";
        echo "   Error: $errstr ($errno)\n";
    }
} else {
    echo "❌ WebSocket server is NOT listening on {$host}:{$port}\n";
    echo "   Error: $errstr ($errno)\n";
}

echo "\n📋 Server status check completed.\n";
?>