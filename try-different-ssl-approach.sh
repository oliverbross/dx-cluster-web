#!/bin/bash

echo "🔄 Trying Alternative SSL Approaches"
echo "===================================="
echo

# Kill current bridge
echo "🛑 Stopping current bridge..."
kill 105212 2>/dev/null
sleep 3

SSL_DIR="/etc/ssl/virtualmin/175207398659177"

echo "🧪 Approach 1: Use system's trusted certificates"
echo "Creating certificate chain with system CA bundle..."

# Create a combined certificate with system CA bundle
TEMP_CHAIN="/tmp/ssl_with_system_ca.pem"
cat "$SSL_DIR/ssl.everything" > "$TEMP_CHAIN"
echo "" >> "$TEMP_CHAIN"
cat /etc/ssl/certs/ca-certificates.crt >> "$TEMP_CHAIN"

echo "📊 Combined certificate stats:"
echo "   Size: $(wc -l < "$TEMP_CHAIN") lines"
echo "   Certificates: $(grep -c 'BEGIN CERTIFICATE' "$TEMP_CHAIN")"

export SSL_KEY="$SSL_DIR/ssl.key"
export SSL_CERT="$TEMP_CHAIN"
export WS_PORT=8080
export WSS_PORT=8443

echo "🚀 Starting bridge with system CA bundle included..."
node websocket-bridge-ssl.js &
APPROACH1_PID=$!
sleep 3

if ps -p $APPROACH1_PID > /dev/null; then
    echo "✅ Approach 1: Bridge started (PID: $APPROACH1_PID)"
    
    echo "🧪 Testing SSL connection..."
    if timeout 5 openssl s_client -connect cluster.wavelog.online:8443 -servername cluster.wavelog.online </dev/null 2>&1 | grep -q "Verify return code: 0"; then
        echo "✅ SSL verification successful!"
        echo "🎉 Solution found! WebSocket should work now."
        exit 0
    else
        echo "❌ SSL verification still failing"
        kill $APPROACH1_PID
    fi
else
    echo "❌ Approach 1 failed"
fi

sleep 2

echo
echo "🧪 Approach 2: Disable SSL verification (testing only)"
echo "Modifying bridge to accept all certificates..."

# Create a modified bridge that doesn't verify certificates
cat > /tmp/websocket-bridge-no-verify.js << 'EOF'
const WebSocket = require('ws');
const https = require('https');
const http = require('http');
const fs = require('fs');
const net = require('net');

// Disable SSL certificate verification (TESTING ONLY!)
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const PORT = process.env.WS_PORT || 8080;
const SSL_PORT = process.env.WSS_PORT || 8443;

const SSL_CONFIG = {
  key: fs.readFileSync('/etc/ssl/virtualmin/175207398659177/ssl.key'),
  cert: fs.readFileSync('/etc/ssl/virtualmin/175207398659177/ssl.cert'),
  // Accept all certificates
  rejectUnauthorized: false,
  requestCert: false
};

function stripTelnet(buf) {
  const result = [];
  let i = 0;
  while (i < buf.length) {
    if (buf[i] === 0xFF && i + 1 < buf.length) {
      i += 2; // Skip IAC + command
      if (i < buf.length && (buf[i-1] === 0xFB || buf[i-1] === 0xFC || buf[i-1] === 0xFD || buf[i-1] === 0xFE)) {
        i += 1; // Skip option byte for WILL/WON'T/DO/DON'T
      }
    } else {
      result.push(buf[i]);
      i++;
    }
  }
  return Buffer.from(result);
}

// HTTP WebSocket Server
const httpServer = http.createServer();
const wsHttp = new WebSocket.Server({ server: httpServer });

// HTTPS WebSocket Server (with relaxed SSL)
const httpsServer = https.createServer(SSL_CONFIG);
const wsHttps = new WebSocket.Server({ server: httpsServer });

function setupWebSocketHandler(ws, req) {
  const url = new URL(req.url, 'http://localhost');
  const host = url.searchParams.get('host');
  const port = parseInt(url.searchParams.get('port')) || 23;
  const login = url.searchParams.get('login');

  console.log(`📡 WebSocket client connected, connecting to ${host}:${port} as ${login}`);
  
  const telnetSocket = new net.Socket();
  
  telnetSocket.connect(port, host, () => {
    console.log(`✅ Connected to ${host}:${port}`);
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
    telnetSocket.write(message + '\r\n');
  });
  
  ws.on('close', () => {
    telnetSocket.end();
  });
  
  telnetSocket.on('close', () => {
    ws.close();
  });
  
  telnetSocket.on('error', (err) => {
    console.error('Telnet error:', err);
    ws.close();
  });
}

wsHttp.on('connection', setupWebSocketHandler);
wsHttps.on('connection', setupWebSocketHandler);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HTTP WebSocket bridge listening on port ${PORT} (all interfaces)`);
});

httpsServer.listen(SSL_PORT, '0.0.0.0', () => {
  console.log(`🔒 HTTPS WebSocket bridge listening on port ${SSL_PORT} (all interfaces) - SSL verification DISABLED`);
  console.log(`📡 Connect via: wss://cluster.wavelog.online:${SSL_PORT}/?host=HOST&port=PORT&login=CALLSIGN`);
});
EOF

echo "🚀 Starting bridge with SSL verification disabled (testing)..."
node /tmp/websocket-bridge-no-verify.js &
APPROACH2_PID=$!
sleep 3

if ps -p $APPROACH2_PID > /dev/null; then
    echo "✅ Approach 2: Bridge started (PID: $APPROACH2_PID)"
    echo
    echo "🧪 Test this configuration:"
    echo "   URL: https://cluster.wavelog.online/dx-cluster-working-client.html"
    echo "   Should connect to: wss://cluster.wavelog.online:8443"
    echo
    echo "⚠️ NOTE: SSL verification is DISABLED for testing!"
    echo "   This will show certificate warnings but should connect."
    echo
    echo "🔧 If this works, we know the issue is certificate chain validation"
    echo "🔧 Management: kill $APPROACH2_PID"
else
    echo "❌ Approach 2 also failed"
fi