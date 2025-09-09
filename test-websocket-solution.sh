#!/bin/bash

echo "🧪 Testing WebSocket DX Cluster Solution"
echo "======================================="
echo

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Installing..."
    sudo apt update
    sudo apt install -y nodejs npm
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo

# Install WebSocket dependency
echo "📦 Installing WebSocket library..."
npm install ws

if [ $? -ne 0 ]; then
    echo "❌ Failed to install WebSocket library"
    exit 1
fi

# Make sure firewall allows port 8080
echo "🔥 Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 8080/tcp
    echo "✅ UFW rule added for port 8080"
fi

echo
echo "🚀 Starting WebSocket bridge..."
echo "📡 The bridge will connect to cluster.om0rx.com:7300"
echo "🌐 Open dx-cluster-working-client.html in your browser"
echo "💡 Use Ctrl+C to stop the server"
echo
echo "Expected output:"
echo "  🚀 WS–Telnet bridge listening on port 8080"
echo "  📡 New connection: om0rx@cluster.om0rx.com:7300"
echo "  ✅ TCP connected to cluster.om0rx.com:7300"
echo "  🔐 Sending login: om0rx"
echo "  📥 From cluster: Welcome to OM0RX Personal DX Cluster..."
echo

# Start the bridge
node websocket-bridge-exact.js#!/bin/bash

echo "🧪 Testing WebSocket DX Cluster Solution"
echo "======================================="
echo

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Installing..."
    sudo apt update
    sudo apt install -y nodejs npm
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo

# Install WebSocket dependency
echo "📦 Installing WebSocket library..."
npm install ws

if [ $? -ne 0 ]; then
    echo "❌ Failed to install WebSocket library"
    exit 1
fi

# Make sure firewall allows port 8080
echo "🔥 Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 8080/tcp
    echo "✅ UFW rule added for port 8080"
fi

echo
echo "🚀 Starting WebSocket bridge..."
echo "📡 The bridge will connect to cluster.om0rx.com:7300"
echo "🌐 Open dx-cluster-working-client.html in your browser"
echo "💡 Use Ctrl+C to stop the server"
echo
echo "Expected output:"
echo "  🚀 WS–Telnet bridge listening on port 8080"
echo "  📡 New connection: om0rx@cluster.om0rx.com:7300"
echo "  ✅ TCP connected to cluster.om0rx.com:7300"
echo "  🔐 Sending login: om0rx"
echo "  📥 From cluster: Welcome to OM0RX Personal DX Cluster..."
echo

# Start the bridge
node websocket-bridge-exact.js