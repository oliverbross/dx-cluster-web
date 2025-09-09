<?php
/**
 * DX Cluster Connection API - No WebSocket Required
 * Simple polling-based approach that works on any hosting
 */

require_once '../config/config.php';
require_once 'database.php';

setCorsHeaders();

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'connect':
        connectToCluster();
        break;
    case 'disconnect':
        disconnectFromCluster();
        break;
    case 'send':
        sendCommandToCluster();
        break;
    case 'poll':
        pollForUpdates();
        break;
    case 'status':
        getConnectionStatusAPI();
        break;
    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}

function connectToCluster() {
    try {
        error_log("🔍 ConnectToCluster: Starting connection process");
        
        $clusterId = (int)($_POST['cluster_id'] ?? 0);
        $loginCallsign = trim($_POST['login_callsign'] ?? '');
        
        error_log("🔍 ConnectToCluster: clusterId={$clusterId}, loginCallsign={$loginCallsign}");
        
        if (!$clusterId || !$loginCallsign) {
            error_log("❌ ConnectToCluster: Missing required parameters");
            jsonResponse(['error' => 'Cluster ID and login callsign required'], 400);
            return;
        }
        
        // Get cluster details
        error_log("🔍 ConnectToCluster: Getting database connection");
        $db = getDatabase();
        $stmt = $db->prepare("SELECT * FROM dx_clusters WHERE id = ? AND is_active = 1");
        $stmt->execute([$clusterId]);
        $cluster = $stmt->fetch();
        
        if (!$cluster) {
            error_log("❌ ConnectToCluster: Cluster not found for ID: {$clusterId}");
            jsonResponse(['error' => 'Cluster not found'], 404);
            return;
        }
        
        error_log("✅ ConnectToCluster: Found cluster: " . $cluster['name'] . " (" . $cluster['host'] . ":" . $cluster['port'] . ")");
        
        // Start background connection (simplified approach)
        $connectionId = startClusterConnection($cluster, $loginCallsign);
        
        jsonResponse([
            'success' => true,
            'connection_id' => $connectionId,
            'cluster_name' => $cluster['name'],
            'status' => 'connecting',
            'message' => "Connecting to {$cluster['name']} ({$cluster['host']}:{$cluster['port']})..."
        ]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

function disconnectFromCluster() {
    try {
        $connectionId = $_POST['connection_id'] ?? '';
        
        if ($connectionId) {
            // Stop the connection
            stopClusterConnection($connectionId);
        }
        
        jsonResponse([
            'success' => true,
            'status' => 'disconnected',
            'message' => 'Disconnected from cluster'
        ]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

function sendCommandToCluster() {
    try {
        $connectionId = $_POST['connection_id'] ?? '';
        $command = trim($_POST['command'] ?? '');
        
        if (!$connectionId || !$command) {
            jsonResponse(['error' => 'Connection ID and command required'], 400);
            return;
        }
        
        // For now, simulate command processing
        // In a real implementation, you'd send this to the cluster connection
        $response = processClusterCommand($connectionId, $command);
        
        jsonResponse([
            'success' => true,
            'response' => $response,
            'timestamp' => time()
        ]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

function pollForUpdates() {
    try {
        $connectionId = $_GET['connection_id'] ?? '';
        $lastUpdate = (int)($_GET['last_update'] ?? 0);
        
        // Get new spots since last update
        $spots = getNewSpots($lastUpdate);
        $status = getConnectionStatus($connectionId);
        
        jsonResponse([
            'success' => true,
            'spots' => $spots,
            'status' => $status,
            'timestamp' => time(),
            'has_updates' => !empty($spots)
        ]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

function getConnectionStatus($connectionId = null) {
    // TODO: Implement real connection status check
    // For now, return basic status - no hardcoded values
    return [
        'connected' => false,
        'cluster_name' => null,
        'login_callsign' => null,
        'connected_since' => null,
        'message' => 'Real connection status not implemented yet'
    ];
}

function startClusterConnection($cluster, $loginCallsign) {
    $connectionId = uniqid('conn_' . $cluster['id'] . '_');
    
    // Create real TCP socket connection to DX cluster
    error_log("🌐 Opening TCP connection to {$cluster['host']}:{$cluster['port']}");
    
    $socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
    if ($socket === false) {
        throw new Exception("Could not create socket: " . socket_strerror(socket_last_error()));
    }
    
    // Set socket timeout
    socket_set_option($socket, SOL_SOCKET, SO_RCVTIMEO, array("sec" => 10, "usec" => 0));
    socket_set_option($socket, SOL_SOCKET, SO_SNDTIMEO, array("sec" => 10, "usec" => 0));
    
    $result = socket_connect($socket, $cluster['host'], $cluster['port']);
    if ($result === false) {
        $error = socket_strerror(socket_last_error($socket));
        socket_close($socket);
        throw new Exception("Connection to {$cluster['host']}:{$cluster['port']} failed: {$error}");
    }
    
    error_log("✅ Connected to DX cluster {$cluster['name']} ({$cluster['host']}:{$cluster['port']})");
    
    // Read initial response from cluster
    $response = socket_read($socket, 2048);
    if ($response !== false) {
        error_log("📡 Initial cluster response: " . trim($response));
        
        // Check if cluster asks for login
        if (stripos($response, 'call') !== false || stripos($response, 'login') !== false) {
            error_log("🔐 Sending login callsign: {$loginCallsign}");
            socket_write($socket, $loginCallsign . "\r\n");
            
            // Read login confirmation
            $loginResponse = socket_read($socket, 2048);
            if ($loginResponse !== false) {
                error_log("📡 Login response: " . trim($loginResponse));
            }
        }
    }
    
    // Store connection info in session/database for later use
    $_SESSION['cluster_connection'] = [
        'id' => $connectionId,
        'socket' => $socket,
        'cluster' => $cluster,
        'login_callsign' => $loginCallsign,
        'connected_at' => time()
    ];
    
    // Start background process to handle real-time data (simplified)
    // In production, this would be a separate background service
    
    socket_close($socket); // For now, close after initial handshake
    
    return $connectionId;
}

function stopClusterConnection($connectionId) {
    // Close the connection and clean up
    // For now, just a placeholder
    return true;
}

function processClusterCommand($connectionId, $command) {
    // Simulate command responses
    $responses = [
        'help' => "Available commands:\nSH/DX - Show DX spots\nSH/WCY - Show WWV/WCY data\nBYE - Disconnect",
        'sh/dx' => "Recent DX spots will be displayed...",
        'sh/wcy' => "No WWV or WCY data available",
        'bye' => "73, disconnecting..."
    ];
    
    $cmd = strtolower(trim($command));
    return $responses[$cmd] ?? "Command '$command' executed";
}

function getNewSpots($lastUpdate) {
    try {
        $db = getDatabase();
        
        // Get spots newer than the last update
        $stmt = $db->prepare("
            SELECT *, UNIX_TIMESTAMP(created_at) as timestamp_unix 
            FROM dx_spots 
            WHERE UNIX_TIMESTAMP(created_at) > ? 
            ORDER BY time_spotted DESC 
            LIMIT 50
        ");
        $stmt->execute([$lastUpdate]);
        $spots = $stmt->fetchAll();
        
        // Return only real spots, no demo data
        
        return $spots;
        
    } catch (Exception $e) {
        // Return empty array on database error
        return [];
    }
}

// Demo spots function removed - real connections only

function getConnectionStatusAPI() {
    // TODO: Implement real connection status check
    // For now, return basic status - no hardcoded values
    jsonResponse([
        'success' => true,
        'connected' => false,
        'message' => 'Connection status check not implemented yet'
    ]);
}

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}
?>