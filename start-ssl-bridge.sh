#!/bin/bash

echo "🔒 Starting SSL WebSocket Bridge with Virtualmin Certificates"
echo "=============================================================="
echo

# Stop any existing bridge
echo "🛑 Stopping existing bridges..."
pkill -f "websocket-bridge"
sleep 2

# Check Virtualmin SSL certificates
SSL_KEY="/etc/ssl/virtualmin/175207398659177/ssl.key"
SSL_CERT="/etc/ssl/virtualmin/175207398659177/ssl.cert"

if [[ -f "$SSL_KEY" && -f "$SSL_CERT" ]]; then
    echo "✅ Found Virtualmin SSL certificates:"
    echo "    Key:  $SSL_KEY"
    echo "    Cert: $SSL_CERT"
    
    # Check certificate details
    echo "🔍 Certificate details:"
    openssl x509 -in "$SSL_CERT" -noout -subject -dates 2>/dev/null
    echo
else
    echo "❌ Virtualmin SSL certificates not found!"
    echo "Expected locations:"
    echo "    Key:  $SSL_KEY"
    echo "    Cert: $SSL_CERT"
    exit 1
fi

# Set environment variables
export SSL_KEY="$SSL_KEY"
export SSL_CERT="$SSL_CERT"
export WS_PORT=8080
export WSS_PORT=8443

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow 8080/tcp
ufw allow 8443/tcp
echo "✅ Opened ports 8080 (HTTP) and 8443 (HTTPS)"

# Start the bridge
echo "🚀 Starting SSL WebSocket bridge..."
node websocket-bridge-ssl.js &
BRIDGE_PID=$!

echo "💡 Bridge PID: $BRIDGE_PID"

# Wait a moment and check if it's running
sleep 3

if ps -p $BRIDGE_PID > /dev/null; then
    echo "✅ Bridge started successfully!"
    echo
    echo "🌐 Connection URLs:"
    echo "   HTTP:  ws://cluster.wavelog.online:8080"
    echo "   HTTPS: wss://cluster.wavelog.online:8443"
    echo
    echo "🔧 Management:"
    echo "   Stop: kill $BRIDGE_PID"
    echo "   Check ports: ss -tlnp | grep -E ':(8080|8443)'"
    echo "   Check logs: tail -f /var/log/syslog | grep node"
else
    echo "❌ Bridge failed to start!"
    echo "💡 Check the logs above for errors"
fi

# Keep running in foreground
wait $BRIDGE_PID