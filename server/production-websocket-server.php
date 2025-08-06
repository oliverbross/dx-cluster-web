<?php
/**
 * Production WebSocket Server for DX Cluster Connections
 * Using Ratchet library for better performance and reliability
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../api/database.php';

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

class DXClusterWebSocketServer implements MessageComponentInterface {
    protected $clients;
    protected $clusterConnections;
    protected $db;
    
    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->clusterConnections = [];
        $this->db = new Database();
        
        echo "🚀 DX Cluster WebSocket Server (Production) starting...\n";
    }
    
    public function onOpen(ConnectionInterface $conn) {
        // Store the new connection
        $this->clients->attach($conn);
        echo "👤 New connection! ({$conn->resourceId})\n";
    }
    
    public function onMessage(ConnectionInterface $from, $msg) {
        $numRecv = count($this->clients) - 1;
        echo sprintf('📥 Received message "%s" from connection %d' . "\n", $msg, $from->resourceId);
        
        try {
            $data = json_decode($msg, true);
            if (!$data) {
                $from->send(json_encode([
                    'type' => 'error',
                    'data' => 'Invalid JSON message'
                ]));
                return;
            }
            
            switch ($data['type']) {
                case 'connect':
                    $this->connectToCluster($from, $data['clusterId']);
                    break;
                case 'disconnect':
                    $this->disconnectFromCluster($from);
                    break;
                case 'command':
                    $this->sendClusterCommand($from, $data['data']);
                    break;
                default:
                    $from->send(json_encode([
                        'type' => 'error',
                        'data' => 'Unknown message type: ' . $data['type']
                    ]));
            }
        } catch (Exception $e) {
            echo "❌ Error processing message: " . $e->getMessage() . "\n";
            $from->send(json_encode([
                'type' => 'error',
                'data' => 'Error processing message: ' . $e->getMessage()
            ]));
        }
    }
    
    public function onClose(ConnectionInterface $conn) {
        // The connection is closed, remove it, as well as the reference to the cluster connection
        $this->disconnectFromCluster($conn);
        $this->clients->detach($conn);
        echo "👋 Connection {$conn->resourceId} has disconnected\n";
    }
    
    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "❌ An error has occurred: {$e->getMessage()}\n";
        $conn->close();
    }
    
    /**
     * Connect client to DX cluster
     */
    private function connectToCluster(ConnectionInterface $conn, $clusterId) {
        try {
            // Get cluster info from database
            $sql = "SELECT * FROM dx_clusters WHERE id = ? AND is_active = 1";
            $result = $this->db->query($sql, [$clusterId]);
            $cluster = $result->fetch();
            
            if (!$cluster) {
                $conn->send(json_encode([
                    'type' => 'error',
                    'data' => 'Cluster not found'
                ]));
                return;
            }
            
            // Create React Socket connection to cluster
            $loop = \React\EventLoop\Factory::create();
            $connector = new \React\Socket\Connector($loop);
            
            $clusterAddress = "tcp://{$cluster['host']}:{$cluster['port']}";
            echo "🔗 Connecting to cluster: {$clusterAddress}\n";
            
            $connector->connect($clusterAddress)->then(
                function (\React\Socket\ConnectionInterface $stream) use ($conn, $cluster) {
                    echo "✅ Connected to cluster {$cluster['name']}\n";
                    
                    // Store connection
                    $this->clusterConnections[$conn->resourceId] = [
                        'connection' => $stream,
                        'cluster' => $cluster,
                        'buffer' => ''
                    ];
                    
                    // Send connection success message
                    $conn->send(json_encode([
                        'type' => 'status',
                        'data' => 'Connected to ' . $cluster['name']
                    ]));
                    
                    // Send initial login if needed
                    $this->sendInitialClusterCommands($stream, $conn);
                    
                    // Listen for data from cluster
                    $stream->on('data', function ($data) use ($conn, $stream) {
                        $this->handleClusterData($data, $conn, $stream);
                    });
                    
                    // Handle connection close
                    $stream->on('close', function () use ($conn, $cluster) {
                        echo "🔌 Cluster connection closed: {$cluster['name']}\n";
                        $this->handleClusterDisconnection($conn);
                    });
                    
                    // Handle connection error
                    $stream->on('error', function ($error) use ($conn, $cluster) {
                        echo "❌ Cluster connection error: {$error->getMessage()}\n";
                        $this->handleClusterDisconnection($conn);
                    });
                },
                function ($error) use ($conn) {
                    echo "❌ Failed to connect to cluster: {$error->getMessage()}\n";
                    $conn->send(json_encode([
                        'type' => 'error',
                        'data' => 'Failed to connect to cluster: ' . $error->getMessage()
                    ]));
                }
            );
            
            // Run the loop in a separate thread or use a shared loop
            // For simplicity, we'll run it in the background
            // In a real production environment, you'd want to manage this better
            $loop->run();
            
        } catch (Exception $e) {
            echo "❌ Error connecting to cluster: " . $e->getMessage() . "\n";
            $conn->send(json_encode([
                'type' => 'error',
                'data' => 'Connection failed: ' . $e->getMessage()
            ]));
        }
    }
    
    /**
     * Disconnect client from cluster
     */
    private function disconnectFromCluster(ConnectionInterface $conn) {
        if (isset($this->clusterConnections[$conn->resourceId])) {
            $connection = $this->clusterConnections[$conn->resourceId];
            
            if ($connection['connection']) {
                $connection['connection']->close();
            }
            
            unset($this->clusterConnections[$conn->resourceId]);
            
            echo "🔌 Disconnected client {$conn->resourceId} from cluster\n";
            
            $conn->send(json_encode([
                'type' => 'status',
                'data' => 'Disconnected from cluster'
            ]));
        }
    }
    
    /**
     * Send command to cluster
     */
    private function sendClusterCommand(ConnectionInterface $conn, $command) {
        if (!isset($this->clusterConnections[$conn->resourceId])) {
            $conn->send(json_encode([
                'type' => 'error',
                'data' => 'Not connected to cluster'
            ]));
            return;
        }
        
        $connection = $this->clusterConnections[$conn->resourceId];
        
        if ($connection['connection']) {
            $command = trim($command) . "\r\n";
            $connection['connection']->write($command);
            
            echo "📤 Sent command to cluster: " . trim($command) . "\n";
            
            // Echo command back to client as terminal output
            $conn->send(json_encode([
                'type' => 'terminal',
                'data' => "> " . trim($command)
            ]));
        }
    }
    
    /**
     * Send initial commands to cluster
     */
    private function sendInitialClusterCommands($stream, $conn) {
        // Get user callsign from session or preferences
        $callsign = "DX-WEB"; // Default callsign
        
        // Send callsign as login
        $stream->write($callsign . "\r\n");
        
        // Send initial commands
        $commands = [
            "set/page 0",  // Disable paging
            "set/beep 0",  // Disable beeps
            "sh/dx/10"     // Show last 10 spots
        ];
        
        foreach ($commands as $command) {
            $stream->write($command . "\r\n");
        }
    }
    
    /**
     * Handle data from cluster
     */
    private function handleClusterData($data, $conn, $stream) {
        echo "📡 Cluster data received: " . substr($data, 0, 100) . "...\n";
        
        // Store data in buffer
        if (!isset($this->clusterConnections[$conn->resourceId]['buffer'])) {
            $this->clusterConnections[$conn->resourceId]['buffer'] = '';
        }
        
        $this->clusterConnections[$conn->resourceId]['buffer'] .= $data;
        
        // Process complete lines
        $buffer = $this->clusterConnections[$conn->resourceId]['buffer'];
        $lines = explode("\n", $buffer);
        
        // Keep the last incomplete line in buffer
        $this->clusterConnections[$conn->resourceId]['buffer'] = array_pop($lines);
        
        foreach ($lines as $line) {
            $line = trim($line);
            if (!empty($line)) {
                $this->processClusterLine($line, $conn);
            }
        }
    }
    
    /**
     * Process a single line from cluster
     */
    private function processClusterLine($line, $conn) {
        echo "📡 Processing cluster line: $line\n";
        
        // Check if it's a DX spot
        if (preg_match('/^DX de\s+\w+:\s+[\d.]+\s+\w+/', $line)) {
            // It's a spot
            $conn->send(json_encode([
                'type' => 'spot',
                'data' => $line
            ]));
            
            // Store spot in database
            $this->storeSpot($line);
        } else {
            // Regular terminal output
            $conn->send(json_encode([
                'type' => 'terminal',
                'data' => $line
            ]));
        }
    }
    
    /**
     * Store spot in database
     */
    private function storeSpot($spotLine) {
        try {
            // Parse spot (simplified)
            if (preg_match('/DX de\s+(\w+):\s+([\d.]+)\s+(\w+)\s+(.*?)\s+(\d{4}Z)/i', $spotLine, $matches)) {
                $spotter = $matches[1];
                $frequency = floatval($matches[2]);
                $callsign = $matches[3];
                $comment = trim($matches[4]);
                $time = $matches[5];
                
                // Determine band
                $band = $this->frequencyToBand($frequency);
                
                $sql = "INSERT INTO dx_spots (callsign, frequency, spotter, comment, time_spotted, band, cluster_source) 
                        VALUES (?, ?, ?, ?, NOW(), ?, ?)";
                
                $this->db->execute($sql, [
                    $callsign,
                    $frequency,
                    $spotter,
                    $comment,
                    $band,
                    'websocket'
                ]);
                
                echo "💾 Spot stored: {$callsign} on {$band}\n";
            }
        } catch (Exception $e) {
            echo "❌ Error storing spot: " . $e->getMessage() . "\n";
        }
    }
    
    /**
     * Convert frequency to band
     */
    private function frequencyToBand($frequency) {
        $bands = [
            [1800, 2000, '160m'],
            [3500, 4000, '80m'],
            [7000, 7300, '40m'],
            [10100, 10150, '30m'],
            [14000, 14350, '20m'],
            [18068, 18168, '17m'],
            [21000, 21450, '15m'],
            [24890, 24990, '12m'],
            [28000, 29700, '10m'],
            [50000, 54000, '6m']
        ];
        
        foreach ($bands as $band) {
            if ($frequency >= $band[0] && $frequency <= $band[1]) {
                return $band[2];
            }
        }
        
        return 'Unknown';
    }
    
    /**
     * Handle cluster disconnection
     */
    private function handleClusterDisconnection($conn) {
        if (isset($this->clusterConnections[$conn->resourceId])) {
            $connection = $this->clusterConnections[$conn->resourceId];
            
            echo "🔌 Cluster connection lost: {$connection['cluster']['name']}\n";
            
            $conn->send(json_encode([
                'type' => 'status',
                'data' => 'Cluster connection lost'
            ]));
            
            unset($this->clusterConnections[$conn->resourceId]);
        }
    }
}

// Run the server
if (php_sapi_name() === 'cli') {
    $port = WS_PORT;
    $host = WS_HOST;
    
    echo "📡 Starting WebSocket server on {$host}:{$port}\n";
    
    $server = IoServer::factory(
        new HttpServer(
            new WsServer(
                new DXClusterWebSocketServer()
            )
        ),
        $port,
        $host
    );
    
    $server->run();
} else {
    echo "This script must be run from command line\n";
}
?>