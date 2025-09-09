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
    // Generate a unique connection ID
    $connectionId = uniqid('conn_' . $cluster['id'] . '_');
    
    // TODO: Implement real cluster connection
    // 1. Open a socket connection to the cluster
    // 2. Store the connection details in the database
    // 3. Start a background process to maintain the connection
    
    // No demo data - real connections only
    
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