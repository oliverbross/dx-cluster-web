<?php
/**
 * WebSocket Server for DX Cluster Connections
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

require_once '../config/config.php';
require_once '../api/database.php';

// Use Ratchet for WebSocket server
// Note: In production, you'd install this via Composer
// For now, we'll create a basic implementation

class DXClusterWebSocketServer {
    private $clients;
    private $clusterConnections;
    private $db;
    
    public function __construct() {
        $this->clients = new SplObjectStorage();
        $this->clusterConnections = [];
        $this->db = new Database();
        
        echo "🚀 DX Cluster WebSocket Server starting...\n";
    }
    
    /**
     * Start the WebSocket server
     */
    public function start() {
        $host = WS_HOST;
        $port = WS_PORT;
        
        echo "📡 Starting WebSocket server on {$host}:{$port}\n";
        
        // Create socket
        $socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
        socket_set_option($socket, SOL_SOCKET, SO_REUSEADDR, 1);
        socket_bind($socket, $host, $port);
        socket_listen($socket);
        
        echo "✅ WebSocket server listening on {$host}:{$port}\n";
        
        // Main server loop
        while (true) {
            $read = [$socket];
            
            // Add client sockets to read array
            foreach ($this->clients as $client) {
                $read[] = $client->socket;
            }
            
            // Add cluster sockets to read array
            foreach ($this->clusterConnections as $connection) {
                if ($connection['socket']) {
                    $read[] = $connection['socket'];
                }
            }
            
            $write = null;
            $except = null;
            
            if (socket_select($read, $write, $except, 1) > 0) {
                // Handle new client connections
                if (in_array($socket, $read)) {
                    $this->handleNewClient($socket);
                    $key = array_search($socket, $read);
                    unset($read[$key]);
                }
                
                // Handle client messages
                foreach ($read as $clientSocket) {
                    $this->handleClientMessage($clientSocket);
                }
            }
            
            // Process cluster data
            $this->processClusterData();
            
            // Small delay to prevent high CPU usage
            usleep(10000); // 10ms
        }
    }
    
    /**
     * Handle new client connection
     */
    private function handleNewClient($serverSocket) {
        $clientSocket = socket_accept($serverSocket);
        
        if ($clientSocket) {
            // Perform WebSocket handshake
            $this->performHandshake($clientSocket);
            
            $client = new stdClass();
            $client->socket = $clientSocket;
            $client->id = uniqid();
            
            $this->clients->attach($client);
            
            echo "👤 New client connected: {$client->id}\n";
            
            // Send welcome message
            $this->sendToClient($client, json_encode([
                'type' => 'status',
                'data' => 'Connected to DX Cluster WebSocket Server'
            ]));
        }
    }
    
    /**
     * Perform WebSocket handshake
     */
    private function performHandshake($clientSocket) {
        $request = socket_read($clientSocket, 5000);
        
        preg_match('#Sec-WebSocket-Key: (.*)\r\n#', $request, $matches);
        $key = base64_encode(pack('H*', sha1($matches[1] . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')));
        
        $headers = "HTTP/1.1 101 Switching Protocols\r\n";
        $headers .= "Upgrade: websocket\r\n";
        $headers .= "Connection: Upgrade\r\n";
        $headers .= "Sec-WebSocket-Accept: $key\r\n\r\n";
        
        socket_write($clientSocket, $headers, strlen($headers));
    }
    
    /**
     * Handle client messages
     */
    private function handleClientMessage($clientSocket) {
        $client = $this->getClientBySocket($clientSocket);
        if (!$client) return;
        
        $data = $this->receiveFrame($clientSocket);
        
        if ($data === false) {
            // Client disconnected
            $this->disconnectClient($client);
            return;
        }
        
        if (empty($data)) return;
        
        try {
            $message = json_decode($data, true);
            
            switch ($message['type']) {
                case 'connect':
                    $this->connectToCluster($client, $message['clusterId']);
                    break;
                case 'disconnect':
                    $this->disconnectFromCluster($client);
                    break;
                case 'command':
                    $this->sendClusterCommand($client, $message['data']);
                    break;
                default:
                    echo "❓ Unknown message type: {$message['type']}\n";
            }
        } catch (Exception $e) {
            echo "❌ Error handling client message: " . $e->getMessage() . "\n";
        }
    }
    
    /**
     * Connect client to DX cluster
     */
    private function connectToCluster($client, $clusterId) {
        try {
            // Get cluster info from database
            $sql = "SELECT * FROM dx_clusters WHERE id = ? AND is_active = 1";
            $result = $this->db->query($sql, [$clusterId]);
            $cluster = $result->fetch();
            
            if (!$cluster) {
                $this->sendToClient($client, json_encode([
                    'type' => 'error',
                    'data' => 'Cluster not found'
                ]));
                return;
            }
            
            // Create socket connection to cluster
            $clusterSocket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
            socket_set_nonblock($clusterSocket);
            
            $result = @socket_connect($clusterSocket, $cluster['host'], $cluster['port']);
            
            if ($result === false && socket_last_error($clusterSocket) !== SOCKET_EINPROGRESS) {
                $this->sendToClient($client, json_encode([
                    'type' => 'error',
                    'data' => 'Failed to connect to cluster'
                ]));
                socket_close($clusterSocket);
                return;
            }
            
            // Store connection
            $connectionId = $client->id . '_' . $clusterId;
            $this->clusterConnections[$connectionId] = [
                'client' => $client,
                'cluster' => $cluster,
                'socket' => $clusterSocket,
                'connected' => false,
                'buffer' => ''
            ];
            
            $client->clusterConnection = $connectionId;
            
            echo "🔗 Connecting client {$client->id} to cluster {$cluster['name']}\n";
            
        } catch (Exception $e) {
            echo "❌ Error connecting to cluster: " . $e->getMessage() . "\n";
            $this->sendToClient($client, json_encode([
                'type' => 'error',
                'data' => 'Connection failed: ' . $e->getMessage()
            ]));
        }
    }
    
    /**
     * Disconnect client from cluster
     */
    private function disconnectFromCluster($client) {
        if (isset($client->clusterConnection)) {
            $connectionId = $client->clusterConnection;
            
            if (isset($this->clusterConnections[$connectionId])) {
                $connection = $this->clusterConnections[$connectionId];
                
                if ($connection['socket']) {
                    socket_close($connection['socket']);
                }
                
                unset($this->clusterConnections[$connectionId]);
                unset($client->clusterConnection);
                
                echo "🔌 Disconnected client {$client->id} from cluster\n";
                
                $this->sendToClient($client, json_encode([
                    'type' => 'status',
                    'data' => 'Disconnected from cluster'
                ]));
            }
        }
    }
    
    /**
     * Send command to cluster
     */
    private function sendClusterCommand($client, $command) {
        if (!isset($client->clusterConnection)) {
            $this->sendToClient($client, json_encode([
                'type' => 'error',
                'data' => 'Not connected to cluster'
            ]));
            return;
        }
        
        $connectionId = $client->clusterConnection;
        $connection = $this->clusterConnections[$connectionId];
        
        if ($connection['connected'] && $connection['socket']) {
            $command = trim($command) . "\r\n";
            socket_write($connection['socket'], $command);
            
            echo "📤 Sent command to cluster: " . trim($command) . "\n";
        }
    }
    
    /**
     * Process data from cluster connections
     */
    private function processClusterData() {
        foreach ($this->clusterConnections as $connectionId => &$connection) {
            if (!$connection['socket']) continue;
            
            // Check if connection is established
            if (!$connection['connected']) {
                $write = [$connection['socket']];
                $read = null;
                $except = null;
                
                if (socket_select($read, $write, $except, 0) > 0) {
                    $connection['connected'] = true;
                    
                    echo "✅ Connected to cluster {$connection['cluster']['name']}\n";
                    
                    $this->sendToClient($connection['client'], json_encode([
                        'type' => 'status',
                        'data' => 'Connected to ' . $connection['cluster']['name']
                    ]));
                    
                    // Send initial login if needed
                    $this->sendInitialClusterCommands($connection);
                }
                continue;
            }
            
            // Read data from cluster
            $data = @socket_read($connection['socket'], 4096, PHP_NORMAL_READ);
            
            if ($data === false) {
                $error = socket_last_error($connection['socket']);
                if ($error !== SOCKET_EWOULDBLOCK) {
                    // Connection lost
                    $this->handleClusterDisconnection($connectionId);
                }
                continue;
            }
            
            if ($data) {
                $connection['buffer'] .= $data;
                $this->processClusterBuffer($connection);
            }
        }
    }
    
    /**
     * Send initial commands to cluster
     */
    private function sendInitialClusterCommands($connection) {
        // Send callsign as login (simplified)
        $callsign = "DX-WEB"; // Default callsign
        socket_write($connection['socket'], $callsign . "\r\n");
        
        // Send initial commands
        $commands = [
            "set/page 0",  // Disable paging
            "set/beep 0",  // Disable beeps
            "sh/dx/10"     // Show last 10 spots
        ];
        
        foreach ($commands as $command) {
            socket_write($connection['socket'], $command . "\r\n");
            usleep(100000); // 100ms delay between commands
        }
    }
    
    /**
     * Process cluster buffer for complete lines
     */
    private function processClusterBuffer($connection) {
        while (($pos = strpos($connection['buffer'], "\n")) !== false) {
            $line = substr($connection['buffer'], 0, $pos);
            $connection['buffer'] = substr($connection['buffer'], $pos + 1);
            
            $line = trim($line);
            if (!empty($line)) {
                $this->processClusterLine($connection, $line);
            }
        }
    }
    
    /**
     * Process a single line from cluster
     */
    private function processClusterLine($connection, $line) {
        echo "📡 Cluster data: $line\n";
        
        // Check if it's a DX spot
        if (preg_match('/^DX de\s+\w+:\s+[\d.]+\s+\w+/', $line)) {
            // It's a spot
            $this->sendToClient($connection['client'], json_encode([
                'type' => 'spot',
                'data' => $line
            ]));
            
            // Store spot in database
            $this->storeSpot($line);
        } else {
            // Regular terminal output
            $this->sendToClient($connection['client'], json_encode([
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
    private function handleClusterDisconnection($connectionId) {
        $connection = $this->clusterConnections[$connectionId];
        
        echo "🔌 Cluster connection lost: {$connection['cluster']['name']}\n";
        
        $this->sendToClient($connection['client'], json_encode([
            'type' => 'status',
            'data' => 'Cluster connection lost'
        ]));
        
        if ($connection['socket']) {
            socket_close($connection['socket']);
        }
        
        unset($this->clusterConnections[$connectionId]);
        unset($connection['client']->clusterConnection);
    }
    
    /**
     * Disconnect client
     */
    private function disconnectClient($client) {
        echo "👋 Client disconnected: {$client->id}\n";
        
        // Disconnect from cluster if connected
        $this->disconnectFromCluster($client);
        
        // Remove client
        $this->clients->detach($client);
        socket_close($client->socket);
    }
    
    /**
     * Get client by socket
     */
    private function getClientBySocket($socket) {
        foreach ($this->clients as $client) {
            if ($client->socket === $socket) {
                return $client;
            }
        }
        return null;
    }
    
    /**
     * Send message to client
     */
    private function sendToClient($client, $message) {
        $frame = $this->createFrame($message);
        socket_write($client->socket, $frame);
    }
    
    /**
     * Create WebSocket frame
     */
    private function createFrame($message) {
        $length = strlen($message);
        
        if ($length < 126) {
            return chr(129) . chr($length) . $message;
        } elseif ($length < 65536) {
            return chr(129) . chr(126) . pack('n', $length) . $message;
        } else {
            return chr(129) . chr(127) . pack('J', $length) . $message;
        }
    }
    
    /**
     * Receive WebSocket frame
     */
    private function receiveFrame($socket) {
        $header = socket_read($socket, 2);
        if (strlen($header) < 2) return false;
        
        $opcode = ord($header[0]) & 15;
        $masked = ord($header[1]) & 128;
        $length = ord($header[1]) & 127;
        
        if ($length == 126) {
            $header = socket_read($socket, 2);
            $length = unpack('n', $header)[1];
        } elseif ($length == 127) {
            $header = socket_read($socket, 8);
            $length = unpack('J', $header)[1];
        }
        
        if ($masked) {
            $mask = socket_read($socket, 4);
        }
        
        $data = socket_read($socket, $length);
        
        if ($masked) {
            for ($i = 0; $i < $length; $i++) {
                $data[$i] = chr(ord($data[$i]) ^ ord($mask[$i % 4]));
            }
        }
        
        return $data;
    }
}

// Start the server
if (php_sapi_name() === 'cli') {
    $server = new DXClusterWebSocketServer();
    $server->start();
} else {
    echo "This script must be run from command line\n";
}
?>