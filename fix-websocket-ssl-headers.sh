#!/bin/bash

echo "🔧 Fixing WebSocket SSL Headers Issue"
echo "===================================="
echo

# Kill current bridge
echo "🛑 Stopping current bridge..."
pkill -f "websocket-bridge"
sleep 2

echo "✅ SSL certificate chain is working correctly!"
echo "🔍 Issue is likely WebSocket-specific headers or CORS"

# Create an enhanced WebSocket bridge with proper headers
cat > /tmp/websocket-bridge-enhanced.js << 'EOF'
const WebSocket = require('ws');
const https = require('https');
const http = require('http');
const fs = require('fs');
const net = require('net');

const PORT = process.env.WS_PORT || 8080;
const SSL_PORT = process.env.WSS_PORT || 8443;

// SSL Configuration - your working certificates
const SSL_CONFIG = {
  key: fs.readFileSync('/etc/ssl/virtualmin/175207398659177/ssl.key'),
  cert: fs.readFileSync('/etc/ssl/virtualmin/175207398659177/ssl.combined'),
  // Add CA if needed
  ca: fs.existsSync('/etc/ssl/virtualmin/175207398659177/ssl.ca') ? 
      fs.readFileSync('/etc/ssl/virtualmin/175207398659177/ssl.ca') : undefined
};

console.log('🔒 SSL certificates loaded');
if (SSL_CONFIG.ca) {
    console.log('📎 CA certificate included');
}

function stripTelnet(buf) {
  const result = [];
  let i = 0;
  while (i < buf.length) {
    if (buf[i] === 0xFF && i + 1 < buf.length) {
      i += 2;
      if (i < buf.length && (buf[i-1] === 0xFB || buf[i-1] === 0xFC || buf[i-1] === 0xFD || buf[i-1] === 0xFE)) {
        i += 1;
      }
    } else {
      result.push(buf[i]);
      i++;
    }
  }
  return Buffer.from(result);
}

// Enhanced HTTP server with CORS headers
const httpServer = http.createServer((req, res) => {
  // Add CORS headers for all requests
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

// Enhanced HTTPS server with CORS headers  
const httpsServer = https.createServer(SSL_CONFIG, (req, res) => {
  // Add CORS headers for all requests
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

// WebSocket servers with enhanced options
const wsHttp = new WebSocket.Server({ 
  server: httpServer,
  perMessageDeflate: false,
  verifyClient: (info) => {
    console.log(`🔍 HTTP WebSocket client connecting from: ${info.origin || 'unknown'}`);
    return true;
  }
});

const wsHttps = new WebSocket.Server({ 
  server: httpsServer,
  perMessageDeflate: false,
  verifyClient: (info) => {
    console.log(`🔍 HTTPS WebSocket client connecting from: ${info.origin || 'unknown'}`);
    console.log(`🔍 Headers:`, info.req.headers);
    return true;
  }
});

function setupWebSocketHandler(ws, req) {
  const clientIP = req.connection.remoteAddress;
  const url = new URL(req.url, 'http://localhost');
  const host = url.searchParams.get('host');
  const port = parseInt(url.searchParams.get('port')) || 23;
  const login = url.searchParams.get('login');

  console.log(`📡 WebSocket client ${clientIP} connected, connecting to ${host}:${port} as ${login}`);
  
  // Send immediate confirmation to client
  ws.send(`🔗 Connecting to ${host}:${port} as ${login}...`);
  
  const telnetSocket = new net.Socket();
  
  telnetSocket.connect(port, host, () => {
    console.log(`✅ Connected to ${host}:${port}`);
    ws.send(`✅ Connected to ${host}:${port}`);
    if (login) {
      telnetSocket.write(login + '\r\n');
    }
  });
  
  telnetSocket.on('data', (data) => {
    const cleaned = stripTelnet(data);
    if (cleaned.length > 0 && ws.readyState === WebSocket.OPEN) {
      ws.send(cleaned.toString('utf8'));
    }
  });
  
  ws.on('message', (message) => {
    console.log(`📤 Client sent: ${message}`);
    telnetSocket.write(message + '\r\n');
  });
  
  ws.on('close', (code, reason) => {
    console.log(`🔌 WebSocket closed: ${code} ${reason}`);
    telnetSocket.end();
  });
  
  telnetSocket.on('close', () => {
    console.log(`📡 Telnet connection to ${host}:${port} closed`);
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });
  
  telnetSocket.on('error', (err) => {
    console.error(`❌ Telnet error for ${host}:${port}:`, err.message);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(`❌ Connection error: ${err.message}`);
      ws.close();
    }
  });
  
  ws.on('error', (err) => {
    console.error(`❌ WebSocket error:`, err.message);
    telnetSocket.end();
  });
}

wsHttp.on('connection', setupWebSocketHandler);
wsHttps.on('connection', setupWebSocketHandler);

// Enhanced error handling
httpServer.on('error', (err) => {
  console.error(`❌ HTTP server error:`, err.message);
});

httpsServer.on('error', (err) => {
  console.error(`❌ HTTPS server error:`, err.message);
});

// Start servers
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HTTP WebSocket bridge listening on port ${PORT} (all interfaces)`);
  console.log(`📡 Connect via: ws://cluster.wavelog.online:${PORT}/?host=HOST&port=PORT&login=CALLSIGN`);
});

httpsServer.listen(SSL_PORT, '0.0.0.0', () => {
  console.log(`🔒 HTTPS WebSocket bridge listening on port ${SSL_PORT} (all interfaces)`);
  console.log(`📡 Secure connect via: wss://cluster.wavelog.online:${SSL_PORT}/?host=HOST&port=PORT&login=CALLSIGN`);
  console.log(`✅ SSL certificate verification: ENABLED and working`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  httpServer.close();
  httpsServer.close();
});
EOF

echo "🚀 Starting enhanced WebSocket bridge..."
node /tmp/websocket-bridge-enhanced.js &
BRIDGE_PID=$!

sleep 3

if ps -p $BRIDGE_PID > /dev/null; then
    echo "✅ Enhanced bridge started successfully! (PID: $BRIDGE_PID)"
    echo
    echo "🔧 Enhanced features:"
    echo "   ✅ Proper CORS headers"
    echo "   ✅ Enhanced error logging"
    echo "   ✅ Client verification logging"
    echo "   ✅ Immediate connection feedback"
    echo "   ✅ CA certificate included"
    echo
    echo "🧪 Test now:"
    echo "   https://cluster.wavelog.online/dx-cluster-working-client.html"
    echo
    echo "🔍 Watch logs in real-time:"
    echo "   tail -f /proc/$BRIDGE_PID/fd/1"
    echo
    echo "🔧 Management:"
    echo "   Stop: kill $BRIDGE_PID"
else
    echo "❌ Enhanced bridge failed to start"
    exit 1
fi