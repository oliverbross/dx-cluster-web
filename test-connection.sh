#!/bin/bash

echo "🧪 Testing DX Cluster Connection"
echo "================================"
echo

# Test if websocat is available for testing
if ! command -v websocat &> /dev/null; then
    echo "📦 Installing websocat for WebSocket testing..."
    
    # Try different installation methods
    if command -v snap &> /dev/null; then
        sudo snap install websocat
    elif command -v cargo &> /dev/null; then
        cargo install websocat
    else
        echo "⚠️  websocat not available. Testing via curl instead..."
        echo "🌐 Testing if bridge server is responding..."
        
        response=$(curl -s --connect-timeout 5 http://localhost:8080 2>/dev/null)
        if [ $? -eq 0 ] || [[ "$response" == *"upgrade"* ]]; then
            echo "✅ WebSocket bridge is responding on port 8080"
        else
            echo "❌ Cannot connect to WebSocket bridge"
            echo "💡 Make sure to run: node websocket-bridge-exact.js"
            exit 1
        fi
    fi
fi

echo "🔗 Testing WebSocket connection to OM0RX cluster..."
echo "📡 Connecting to cluster.om0rx.com:7300 as 'om0rx'"
echo "💡 You should see cluster welcome message and DX spots"
echo "💡 Press Ctrl+C to disconnect"
echo

# Test the WebSocket connection
if command -v websocat &> /dev/null; then
    websocat "ws://localhost:8080/?host=cluster.om0rx.com&port=7300&login=om0rx"
else
    echo "🌐 Open your browser and go to: dx-cluster-working-client.html"
    echo "📱 Or test with a WebSocket client tool"
    echo ""
    echo "Connection URL: ws://localhost:8080/?host=cluster.om0rx.com&port=7300&login=om0rx"
fi