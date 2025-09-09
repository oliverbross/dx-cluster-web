// npm i ws
const http = require("http");
const net = require("net");
const WebSocket = require("ws");

const PORT = process.env.WS_PORT || 8080;

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

const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
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
});

server.listen(PORT, () => {
  console.log(`🚀 WS–Telnet bridge listening on port ${PORT}`);
  console.log(`📡 Connect via: ws://localhost:${PORT}/?host=HOST&port=PORT&login=CALLSIGN`);
});