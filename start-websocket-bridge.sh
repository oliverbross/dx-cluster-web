#!/bin/bash

echo "🚀 Starting DX Cluster WebSocket Bridge on Ubuntu..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Installing..."
    echo "📦 Updating package list..."
    sudo apt update
    
    echo "📦 Installing Node.js and npm..."
    sudo apt install -y nodejs npm
    
    echo "✅ Node.js installed:"
    node --version
    npm --version
else
    echo "✅ Node.js found:"
    node --version
    npm --version
fi

echo
echo "📦 Installing WebSocket dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo
echo "🔧 Setting up bridge configuration..."
echo "📡 Bridge will be available at: ws://YOUR_SERVER_IP:8080"
echo "🌐 For external access, make sure port 8080 is open in firewall"

# Check if port 8080 is already in use
if netstat -tlnp | grep :8080 &> /dev/null; then
    echo "⚠️  Warning: Port 8080 is already in use"
    echo "🔧 You can change the port by setting: export WS_PORT=8081"
fi

echo
echo "🚀 Starting WebSocket Bridge..."
echo "💡 Use Ctrl+C to stop the server"
echo "📊 Console output will show all connections and data"
echo

# Start the bridge
node websocket-bridge.js