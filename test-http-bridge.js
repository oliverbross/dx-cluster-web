const WebSocket = require('ws');
const net = require('net');
const http = require('http');
const url = require('url');

console.log('🌐 DX Cluster WebSocket Bridge - HTTP TEST VERSION');
console.log('=================================================');
console.log('⚠️  This is for testing only - no SSL encryption!');

// HTTP server for WebSocket (NO SSL)
const httpServer = http.createServer((req, res) => {
  console.log(`📡 HTTP request: ${req.method} ${req.url}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket bridge - HTTP test version\n');
});

// WebSocket server
const wss = new WebSocket.Server({ 
  server: httpServer,
  perMessageDeflate: false
});

wss.on('connection', async (ws, req) => {
  console.log('🎯 WebSocket client connected!');
  console.log('📋 Request URL:', req.url);
  console.log('🔍 Headers:', req.headers);
  
  const parsedUrl = url.parse(req.url, true);
  const query = parsedUrl.query;
  
  // Support both URL formats
  let host = query.host;
  let port = parseInt(query.port) || 7300;
  let login = query.login;
  
  // Map cluster ID to host/port
  if (query.cluster && !host) {
    const clusterMap = {
      '5': { host: 'cluster.om0rx.com', port: 7300 }
    };
    
    if (clusterMap[query.cluster]) {
      host = clusterMap[query.cluster].host;
      port = clusterMap[query.cluster].port;
      login = query.login;
    }
  }
  
  console.log(`🎯 Parameters: host=${host}, port=${port}, login=${login}`);
  
  if (!host || !port || !login) {
    console.log('❌ Missing parameters');
    ws.send(JSON.stringify({
      type: 'error',
      message: `Missing parameters: host=${host}, port=${port}, login=${login}`
    }));
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
    
    // Send success message
    ws.send(JSON.stringify({
      type: 'status',
      data: `Connected to ${host}:${port} as ${login}`
    }));
  });
  
  clusterSocket.on('data', (data) => {
    const message = data.toString();
    console.log(`📥 From cluster (${message.length} chars): ${message.substring(0, 80)}${message.length > 80 ? '...' : ''}`);
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'terminal',
        data: message
      }));
    }
  });
  
  clusterSocket.on('error', (error) => {
    console.log(`❌ Cluster connection error: ${error.message}`);
    ws.send(JSON.stringify({
      type: 'error',
      message: `Cluster error: ${error.message}`
    }));
    ws.close();
  });
  
  clusterSocket.on('close', () => {
    console.log(`🔌 Cluster connection closed`);
    ws.close();
  });
  
  // Handle WebSocket messages
  ws.on('message', (data) => {
    const command = data.toString();
    console.log(`📤 Command from client: ${command}`);
    
    if (isConnected) {
      clusterSocket.write(command + '\r\n');
    } else {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not connected to cluster'
      }));
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

// Start HTTP server on port 8080
httpServer.listen(8080, () => {
  console.log('🚀 HTTP WebSocket bridge listening on port 8080');
  console.log('⚠️  NO SSL - for testing only!');
  console.log('🌐 Test URL: ws://cluster.wavelog.online:8080/?host=cluster.om0rx.com&port=7300&login=test');
  console.log('');
  console.log('🧪 Test with:');
  console.log('   curl -v "http://cluster.wavelog.online:8080/"');
});

httpServer.on('error', (error) => {
  console.log(`❌ HTTP server error: ${error.message}`);
  if (error.code === 'EADDRINUSE') {
    console.log('💡 Port 8080 is already in use.');
  }
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down HTTP test bridge');
  httpServer.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down HTTP test bridge');
  httpServer.close();
  process.exit(0);
});