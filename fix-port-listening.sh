#!/bin/bash

echo "🔧 Fixing WebSocket Bridge Port Access"
echo "======================================"
echo

# Kill any existing bridge processes
echo "🛑 Stopping existing bridge processes..."
pkill -f "websocket-bridge"
sleep 2

# Install net-tools for netstat
echo "📦 Installing network tools..."
apt update
apt install -y net-tools

# Check if port is free
if ss -tlnp | grep -q :8080; then
    echo "⚠️ Port 8080 is still in use. Finding process..."
    ss -tlnp | grep :8080
    echo "🛑 Killing processes on port 8080..."
    fuser -k 8080/tcp
    sleep 2
fi

# Configure to bind to all interfaces (not just localhost)
echo "🌐 Starting bridge on all interfaces..."
export WS_HOST="0.0.0.0"

# Start the bridge
echo "🚀 Starting WebSocket bridge..."
node websocket-bridge-ssl.js &
BRIDGE_PID=$!

sleep 3

# Check if it's running and listening
if ss -tlnp | grep -q :8080; then
    echo "✅ Bridge is listening on port 8080"
    ss -tlnp | grep :8080
    echo
    echo "🌐 External access URLs:"
    echo "   HTTP:  ws://$(curl -s ifconfig.me):8080"
    echo "   Local: ws://localhost:8080"
    echo
    echo "💡 Bridge PID: $BRIDGE_PID"
    echo "💡 To stop: kill $BRIDGE_PID"
    echo "💡 To check: ss -tlnp | grep :8080"
else
    echo "❌ Bridge failed to start or bind to port"
    echo "🔍 Checking for errors..."
    jobs
fi