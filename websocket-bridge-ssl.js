// npm i ws
const https = require("https");
const http = require("http");
const fs = require("fs");
const net = require("net");
const WebSocket = require("ws");

const PORT = process.env.WS_PORT || 8080;
const SSL_PORT = process.env.WSS_PORT || 8443;

// SSL Configuration - using your Virtualmin certificates with full chain
const SSL_CONFIG = {
  key: process.env.SSL_KEY || '/etc/ssl/virtualmin/175207398659177/ssl.key',
  cert: process.env.SSL_CERT || '/etc/ssl/virtualmin/175207398659177/ssl.combined'
};

function stripTelnet(buf) {
  // Remove basic Telnet IAC negotiation so the browser sees clean text
  const IAC = 255, SE = 240, SB = 250;
  let out = [];
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === IAC) {
      const cmd = buf[++i];
      if (cmd === SB) {
        // skip until IAC SE
        while (i < buf.length && !(buf[i] === IAC && buf[i + 1] === SE)) i++;
        i++; // skip SE
      } else {
        i++; // skip option byte for WILL/WONT/DO/DONT/etc.
      }
      continue;
    }
    out.push(buf[i]);
  }
  return Buffer.from(out);
}

function createWebSocketHandler(ws, req) {
  const url = new URL(req.url, "http://localhost");
  const host  = url.searchParams.get("host")  || "cluster.om0rx.com";
  const port  = parseInt(url.searchParams.get("port") || "7300", 10);
  const login = url.searchParams.get("login") || "om0rx";

  console.log(`📡 New connection: ${login}@${host}:${port}`);

  const tcp = net.createConnection({ host, port }, () => {
    console.log(`✅ TCP connected to ${host}:${port}`);
    // small delay lets the banner/prompt arrive first
    setTimeout(() => {
      console.log(`🔐 Sending login: ${login}`);
      tcp.write(login + "\r\n");
    }, 400);
  });

  tcp.on("data", (data) => {
    const clean = stripTelnet(data).toString("utf8");
    console.log(`📥 From cluster: ${clean.substring(0, 100)}${clean.length > 100 ? '...' : ''}`);
    if (ws.readyState === WebSocket.OPEN) ws.send(clean);
  });

  tcp.on("error", (err) => {
    console.error(`❌ TCP Error: ${err.message}`);
    if (ws.readyState === WebSocket.OPEN) ws.send(`[TCP ERROR] ${err.message}\n`);
    try { ws.close(); } catch {}
  });

  tcp.on("close", () => {
    console.log(`🔌 TCP closed for ${login}@${host}:${port}`);
    try { if (ws.readyState === WebSocket.OPEN) ws.close(); } catch {}
  });

  ws.on("message", (msg) => {
    const text = msg.toString();
    console.log(`📤 To cluster: ${text}`);
    // Ensure CRLF line endings for Telnet servers
    tcp.write(text.endsWith("\n") ? text.replace(/\n$/, "\r\n") : text + "\r\n");
  });

  ws.on("close", () => {
    console.log(`🔌 WebSocket closed for ${login}@${host}:${port}`);
    try { tcp.end(); } catch {}
  });
}

// Check if SSL certificates exist
let sslAvailable = false;
try {
  if (fs.existsSync(SSL_CONFIG.key) && fs.existsSync(SSL_CONFIG.cert)) {
    sslAvailable = true;
    console.log('🔒 SSL certificates found - enabling WSS');
  } else {
    console.log('⚠️ SSL certificates not found, using HTTP only');
  }
} catch (error) {
  console.log('⚠️ SSL check failed:', error.message);
}

// Create HTTP server (fallback)
const httpServer = http.createServer();
const wssHttp = new WebSocket.Server({ server: httpServer });

wssHttp.on("connection", createWebSocketHandler);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HTTP WebSocket bridge listening on port ${PORT} (all interfaces)`);
  console.log(`📡 Connect via: ws://YOUR_SERVER_IP:${PORT}/?host=HOST&port=PORT&login=CALLSIGN`);
});

// Create HTTPS server if SSL is available
if (sslAvailable) {
  try {
    const httpsServer = https.createServer({
      key: fs.readFileSync(SSL_CONFIG.key),
      cert: fs.readFileSync(SSL_CONFIG.cert)
    });

    const wssHttps = new WebSocket.Server({ server: httpsServer });
    wssHttps.on("connection", createWebSocketHandler);

    httpsServer.listen(SSL_PORT, '0.0.0.0', () => {
      console.log(`🔒 HTTPS WebSocket bridge listening on port ${SSL_PORT} (all interfaces)`);
      console.log(`📡 Secure connect via: wss://cluster.wavelog.online:${SSL_PORT}/?host=HOST&port=PORT&login=CALLSIGN`);
    });
  } catch (error) {
    console.error('❌ Failed to start HTTPS server:', error.message);
    console.log('💡 Continuing with HTTP only...');
  }
} else {
  console.log('💡 To enable WSS, ensure SSL certificates are available at:');
  console.log(`    Key: ${SSL_CONFIG.key}`);
  console.log(`    Cert: ${SSL_CONFIG.cert}`);
}