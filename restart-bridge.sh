#!/bin/bash

echo "🔄 Restarting WebSocket Bridge"
echo "=============================="

# Kill existing bridge
echo "🛑 Stopping existing bridge..."
pkill -f "websocket-bridge"
sleep 2

# Check if really stopped
if pgrep -f "websocket-bridge" > /dev/null; then
    echo "❌ Force killing bridge..."
    pkill -9 -f "websocket-bridge"
    sleep 1
fi

# Start fresh bridge with logging
echo "🚀 Starting new bridge with enhanced logging..."

cat > /tmp/websocket-bridge-debug.js << 'EOF'
const WebSocket = require('ws');
const net = require('net');
const https = require('https');
const fs = require('fs');

console.log('🌐 DX Cluster WebSocket Bridge - Debug Version');
console.log('==============================================');

// SSL Configuration
const SSL_CONFIG = {
  key: fs.readFileSync('/etc/letsencrypt/live/wavelog.online/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/wavelog.online/fullchain.pem')
};

console.log('🔒 SSL certificates loaded successfully');

// HTTPS server for WebSocket
const httpsServer = https.createServer(SSL_CONFIG, (req, res) => {
  console.log(`📡 HTTP request: ${req.method} ${req.url}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.writeHead(404);
  res.end('WebSocket bridge - use WebSocket connection');
});

// WebSocket server
const wss = new WebSocket.Server({ 
  server: httpsServer,
  perMessageDeflate: false,
  verifyClient: (info) => {
    console.log(`🔍 WebSocket client connecting from: ${info.origin || 'unknown'}`);
    console.log(`🔍 Request URL: ${info.req.url}`);
    console.log(`🔍 Headers:`, info.req.headers);
    return true;
  }
});

console.log('🛠️ WebSocket server configured');

wss.on('connection', async (ws, req) => {
  console.log('🎯 WebSocket client connected!');
  console.log('📋 Request URL:', req.url);
  
  const url = new URL(req.url, 'https://localhost');
  const host = url.searchParams.get('host');
  const port = parseInt(url.searchParams.get('port'));
  const login = url.searchParams.get('login');
  
  console.log(`🎯 Connection parameters:`, { host, port, login });
  
  if (!host || !port || !login) {
    console.log('❌ Missing parameters');
    ws.send('Error: Missing host, port, or login parameter');
    ws.close();
    return;
  }
  
  console.log(`🔗 Connecting to DX cluster: ${host}:${port} as ${login}`);
  
  // Connect to DX cluster
  const clusterSocket = new net.Socket();
  let isConnected = false;
  
  clusterSocket.connect(port, host, () => {
    console.log(`✅ Connected to cluster: ${host}:${port}`);
    isConnected = true;
    
    // Send login
    clusterSocket.write(login + '\r\n');
    console.log(`📤 Sent login: ${login}`);
  });
  
  clusterSocket.on('data', (data) => {
    const message = data.toString();
    console.log(`📥 From cluster: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
  
  clusterSocket.on('error', (error) => {
    console.log(`❌ Cluster connection error: ${error.message}`);
    ws.send(`Cluster error: ${error.message}`);
    ws.close();
  });
  
  clusterSocket.on('close', () => {
    console.log(`🔌 Cluster connection closed`);
    ws.close();
  });
  
  // Handle WebSocket messages (commands from client)
  ws.on('message', (data) => {
    const command = data.toString();
    console.log(`📤 Command from client: ${command}`);
    
    if (isConnected) {
      clusterSocket.write(command + '\r\n');
    } else {
      ws.send('Error: Not connected to cluster');
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
    clusterSocket.end();
  });
  
  ws.on('error', (error) => {
    console.log(`❌ WebSocket error: ${error.message}`);
    clusterSocket.end();
  });
});

// Start HTTPS server
httpsServer.listen(8443, () => {
  console.log('🚀 WebSocket bridge listening on port 8443 (HTTPS)');
  console.log('🔒 SSL enabled with Let\'s Encrypt certificates');
  console.log('📡 Ready to accept WebSocket connections');
  console.log('🌐 Test URL: wss://cluster.wavelog.online:8443/?host=cluster.om0rx.com&port=7300&login=test');
});

httpsServer.on('error', (error) => {
  console.log(`❌ HTTPS server error: ${error.message}`);
});
EOF

echo "📝 Created debug bridge script"

# Start the debug bridge
nohup node /tmp/websocket-bridge-debug.js > /tmp/websocket-bridge.log 2>&1 &
BRIDGE_PID=$!

echo "✅ Started debug bridge (PID: $BRIDGE_PID)"
echo "📄 Logs: tail -f /tmp/websocket-bridge.log"
echo ""
echo "🧪 Test with:"
echo "   https://cluster.wavelog.online/"
echo ""
echo "🔍 Monitor logs:"
echo "   tail -f /tmp/websocket-bridge.log"