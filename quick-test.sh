#!/bin/bash

echo "🧪 Quick DX Cluster Connection Test"
echo "===================================="
echo

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "🌐 Server IP: $SERVER_IP"
echo "🔗 WebSocket URL: ws://$SERVER_IP:8080"
echo

# Check if bridge is running
if ! pgrep -f "websocket-bridge-exact.js" > /dev/null; then
    echo "❌ WebSocket bridge not running!"
    echo "💡 Start it with: node websocket-bridge-exact.js"
    exit 1
fi

echo "✅ WebSocket bridge is running"
echo

# Check if port 8080 is listening
if netstat -tlnp | grep :8080 > /dev/null; then
    echo "✅ Port 8080 is listening"
else
    echo "❌ Port 8080 is not listening"
    exit 1
fi

# Test basic connectivity
echo "🔗 Testing basic connectivity to cluster.om0rx.com:7300..."
if timeout 5 bash -c "cat < /dev/null > /dev/tcp/cluster.om0rx.com/7300"; then
    echo "✅ Can reach cluster.om0rx.com:7300"
else
    echo "❌ Cannot reach cluster.om0rx.com:7300 (network issue)"
fi

echo
echo "🚀 Bridge Status: ✅ Ready"
echo "🌐 Web Client URL: http://$SERVER_IP/dx-cluster-working-client.html"
echo "📡 WebSocket URL: ws://$SERVER_IP:8080"
echo
echo "💡 Next steps:"
echo "   1. Open dx-cluster-working-client.html in browser"
echo "   2. Update WebSocket URL to: ws://$SERVER_IP:8080"
echo "   3. Connect to cluster.om0rx.com:7300 as 'om0rx'"
echo "   4. You should see DX spots streaming!"