#!/bin/bash

echo "🐧 DX Cluster WebSocket Bridge - Ubuntu Installation"
echo "=================================================="
echo

# Update system
echo "📦 Updating Ubuntu packages..."
sudo apt update

# Install Node.js and npm
echo "📦 Installing Node.js and npm..."
sudo apt install -y nodejs npm

# Install PM2 for production (process manager)
echo "📦 Installing PM2 process manager..."
sudo npm install -g pm2

# Create systemd service for auto-start
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/dx-cluster-bridge.service > /dev/null <<EOF
[Unit]
Description=DX Cluster WebSocket Bridge
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node websocket-bridge.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=WS_PORT=8080

[Install]
WantedBy=multi-user.target
EOF

# Set executable permissions
chmod +x start-websocket-bridge.sh
chmod +x websocket-bridge.js

# Configure firewall
echo "🔥 Configuring firewall for port 8080..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 8080/tcp
    echo "✅ UFW firewall rule added for port 8080"
elif command -v iptables &> /dev/null; then
    sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
    echo "✅ iptables rule added for port 8080"
fi

echo
echo "🎉 Installation complete!"
echo
echo "🚀 Quick Start:"
echo "  ./start-websocket-bridge.sh"
echo
echo "🔧 Production Start:"
echo "  sudo systemctl enable dx-cluster-bridge"
echo "  sudo systemctl start dx-cluster-bridge"
echo
echo "📊 Check Status:"
echo "  sudo systemctl status dx-cluster-bridge"
echo
echo "📱 Web Client:"
echo "  Update WebSocket URL to: ws://YOUR_SERVER_IP:8080"
echo
echo "🌍 External Access:"
echo "  Make sure port 8080 is open in your server firewall"
echo "  Update your domain's DNS if using a domain name"