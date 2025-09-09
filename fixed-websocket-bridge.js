const WebSocket = require('ws');
const net = require('net');
const https = require('https');
const fs = require('fs');
const url = require('url');

console.log('🌐 DX Cluster WebSocket Bridge - FIXED URL Parsing');
console.log('==================================================');

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
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
    console.log(`🔍 User-Agent: ${info.req.headers['user-agent']}`);
    return true;
  }
});

console.log('🛠️ WebSocket server configured');

wss.on('connection', async (ws, req) => {
  console.log('🎯 WebSocket client connected!');
  console.log('📋 Full request URL:', req.url);
  
  // FIXED URL parsing - use the url module properly
  const parsedUrl = url.parse(req.url, true);
  const query = parsedUrl.query;
  
  const host = query.host;
  const port = parseInt(query.port) || 7300;
  const login = query.login;
  
  console.log(`🎯 Parsed parameters:`, { 
    host: host || 'NOT PROVIDED', 
    port: port || 'NOT PROVIDED', 
    login: login || 'NOT PROVIDED' 
  });
  console.log(`🔍 Full query object:`, query);
  
  if (!host || !port || !login) {
    console.log('❌ Missing required parameters');
    ws.send(JSON.stringify({
      type: 'error',
      message: `Missing parameters. Got: host=${host}, port=${port}, login=${login}`
    }));
    ws.close(1008, 'Missing required parameters');
    return;
  }
  
  console.log(`🔗 Connecting to DX cluster: ${host}:${port} as ${login}`);
  
  // Connect to DX cluster via TCP
  const clusterSocket = new net.Socket();
  let isConnected = false;
  let connectionTimeout;
  
  // Set connection timeout
  connectionTimeout = setTimeout(() => {
    console.log(`⏰ Connection timeout to ${host}:${port}`);
    clusterSocket.destroy();
    ws.send(JSON.stringify({
      type: 'error', 
      message: `Connection timeout to ${host}:${port}`
    }));
    ws.close();
  }, 10000); // 10 second timeout
  
  clusterSocket.connect(port, host, () => {
    clearTimeout(connectionTimeout);
    console.log(`✅ Connected to cluster: ${host}:${port}`);
    isConnected = true;
    
    // Send login immediately
    const loginCommand = login + '\r\n';
    clusterSocket.write(loginCommand);
    console.log(`📤 Sent login: ${login}`);
    
    // Send connection success to client
    ws.send(JSON.stringify({
      type: 'connected',
      message: `Connected to ${host}:${port} as ${login}`
    }));
  });
  
  clusterSocket.on('data', (data) => {
    const message = data.toString();
    console.log(`📥 From cluster (${message.length} chars): ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'data',
        message: message
      }));
    }
  });
  
  clusterSocket.on('error', (error) => {
    clearTimeout(connectionTimeout);
    console.log(`❌ Cluster connection error: ${error.message}`);
    console.log(`🔍 Error details:`, error);
    
    ws.send(JSON.stringify({
      type: 'error',
      message: `Cluster error: ${error.message}`
    }));
    ws.close(1011, `Cluster error: ${error.message}`);
  });
  
  clusterSocket.on('close', () => {
    clearTimeout(connectionTimeout);
    console.log(`🔌 Cluster connection closed for ${host}:${port}`);
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'disconnected',
        message: 'Cluster connection closed'
      }));
      ws.close(1000, 'Cluster connection closed');
    }
  });
  
  // Handle WebSocket messages (commands from client)
  ws.on('message', (data) => {
    try {
      const message = data.toString();
      console.log(`📤 Command from client: ${message}`);
      
      if (isConnected && clusterSocket.readyState === 'open') {
        clusterSocket.write(message + '\r\n');
      } else {
        console.log(`❌ Cannot send command, cluster not connected`);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Not connected to cluster'
        }));
      }
    } catch (error) {
      console.log(`❌ Error processing client message: ${error.message}`);
    }
  });
  
  ws.on('close', (code, reason) => {
    console.log(`🔌 WebSocket client disconnected: ${code} ${reason}`);
    clearTimeout(connectionTimeout);
    if (clusterSocket && clusterSocket.readyState !== 'closed') {
      clusterSocket.end();
    }
  });
  
  ws.on('error', (error) => {
    console.log(`❌ WebSocket error: ${error.message}`);
    clearTimeout(connectionTimeout);
    if (clusterSocket && clusterSocket.readyState !== 'closed') {
      clusterSocket.end();
    }
  });
});

// Error handling for server
httpsServer.on('error', (error) => {
  console.log(`❌ HTTPS server error: ${error.message}`);
  if (error.code === 'EADDRINUSE') {
    console.log('💡 Port 8443 is already in use. Kill existing process first.');
  }
});

// Start HTTPS server
httpsServer.listen(8443, () => {
  console.log('🚀 FIXED WebSocket bridge listening on port 8443 (HTTPS)');
  console.log('🔒 SSL enabled with Let\'s Encrypt certificates');
  console.log('📡 Ready to accept WebSocket connections');
  console.log('🌐 Test URL: wss://cluster.wavelog.online:8443/?host=cluster.om0rx.com&port=7300&login=test');
  console.log('');
  console.log('🧪 Test with curl:');
  console.log('curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" "https://cluster.wavelog.online:8443/?host=cluster.om0rx.com&port=7300&login=test"');
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  httpsServer.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  httpsServer.close();
  process.exit(0);
});