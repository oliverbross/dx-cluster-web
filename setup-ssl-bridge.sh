#!/bin/bash

echo "🔒 Setting up SSL WebSocket Bridge"
echo "=================================="
echo

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (for SSL certificate access)"
   echo "💡 Run: sudo ./setup-ssl-bridge.sh"
   exit 1
fi

# Check SSL certificates
SSL_DIR="/etc/letsencrypt/live/cluster.wavelog.online"
if [[ -f "$SSL_DIR/privkey.pem" && -f "$SSL_DIR/fullchain.pem" ]]; then
    echo "✅ SSL certificates found at $SSL_DIR"
    USE_SSL=true
else
    echo "⚠️ SSL certificates not found at $SSL_DIR"
    echo "💡 You can still use HTTP WebSocket (less secure)"
    USE_SSL=false
fi

# Install dependencies
echo "📦 Installing WebSocket library..."
npm install ws

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow 8080/tcp
if [[ "$USE_SSL" == true ]]; then
    ufw allow 8443/tcp
    echo "✅ Opened ports 8080 (HTTP) and 8443 (HTTPS)"
else
    echo "✅ Opened port 8080 (HTTP only)"
fi

# Create systemd service
echo "🔧 Creating systemd service..."
cat > /etc/systemd/system/dx-cluster-bridge.service << EOF
[Unit]
Description=DX Cluster WebSocket Bridge
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node websocket-bridge-ssl.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=WS_PORT=8080
Environment=WSS_PORT=8443

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl daemon-reload
systemctl enable dx-cluster-bridge
systemctl start dx-cluster-bridge

echo
echo "🎉 SSL WebSocket Bridge Setup Complete!"
echo
echo "📊 Status:"
systemctl status dx-cluster-bridge --no-pager -l

echo
echo "🌐 Connection URLs:"
echo "   HTTP:  ws://cluster.wavelog.online:8080"
if [[ "$USE_SSL" == true ]]; then
    echo "   HTTPS: wss://cluster.wavelog.online:8443"
    echo
    echo "✅ Use WSS for HTTPS websites (recommended)"
else
    echo "   HTTPS: Not available (missing SSL certificates)"
    echo
    echo "💡 To enable WSS, set up SSL certificates first"
fi

echo
echo "🔧 Management commands:"
echo "   Start:   sudo systemctl start dx-cluster-bridge"
echo "   Stop:    sudo systemctl stop dx-cluster-bridge"
echo "   Status:  sudo systemctl status dx-cluster-bridge"
echo "   Logs:    sudo journalctl -u dx-cluster-bridge -f"