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
        getConnectionStatus();
        break;
    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}

function connectToCluster() {
    try {
        $clusterId = (int)($_POST['cluster_id'] ?? 0);
        $loginCallsign = trim($_POST['login_callsign'] ?? '');
        
        if (!$clusterId || !$loginCallsign) {
            jsonResponse(['error' => 'Cluster ID and login callsign required'], 400);
            return;
        }
        
        // Get cluster details
        $db = getDatabase();
        $stmt = $db->prepare("SELECT * FROM dx_clusters WHERE id = ? AND is_active = 1");
        $stmt->execute([$clusterId]);
        $cluster = $stmt->fetch();
        
        if (!$cluster) {
            jsonResponse(['error' => 'Cluster not found'], 404);
            return;
        }
        
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
    // For now, return mock status
    // In a real implementation, check actual connection status
    return [
        'connected' => true,
        'cluster_name' => 'DX Summit',
        'login_callsign' => 'OM0RX',
        'connected_since' => time() - 3600
    ];
}

function startClusterConnection($cluster, $loginCallsign) {
    // Generate a unique connection ID
    $connectionId = uniqid('conn_' . $cluster['id'] . '_');
    
    // In a real implementation, you would:
    // 1. Open a socket connection to the cluster
    // 2. Store the connection details in the database
    // 3. Start a background process to maintain the connection
    
    // For now, we'll simulate this and add some demo data
    addDemoSpots($cluster['id']);
    
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
        
        // If no new spots, return some demo data occasionally
        if (empty($spots) && rand(1, 10) == 1) {
            addDemoSpots();
            // Try again
            $stmt->execute([$lastUpdate]);
            $spots = $stmt->fetchAll();
        }
        
        return $spots;
        
    } catch (Exception $e) {
        // Return empty array on database error
        return [];
    }
}

function addDemoSpots($clusterId = 1) {
    try {
        $db = getDatabase();
        
        $demoSpots = [
            ['JA1ABC', 14.205, 'OM0RX', 'CQ DX', '20m', 'CW'],
            ['VK2XYZ', 21.025, 'OM0RX', '599 QSL', '15m', 'CW'],
            ['W6DEF', 7.032, 'OM0RX', 'UP 2', '40m', 'CW'],
            ['ZL1GHI', 28.015, 'OM0RX', 'CQ', '10m', 'CW'],
            ['DL9JKL', 14.015, 'OM0RX', 'QRT 5', '20m', 'CW']
        ];
        
        $stmt = $db->prepare("
            INSERT INTO dx_spots 
            (callsign, frequency, spotter, comment, time_spotted, band, mode, cluster_source, created_at) 
            VALUES (?, ?, ?, ?, NOW(), ?, ?, 'Demo Cluster', NOW())
        ");
        
        foreach ($demoSpots as $spot) {
            if (rand(1, 4) == 1) { // Add only 25% of demo spots randomly
                $stmt->execute($spot);
            }
        }
        
    } catch (Exception $e) {
        // Silently fail on database errors
    }
}

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}
?>