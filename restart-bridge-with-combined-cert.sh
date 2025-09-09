#!/bin/bash

echo "🔄 Restarting Bridge with Complete SSL Certificate Chain"
echo "========================================================"
echo

# Kill any existing bridge process
echo "🛑 Stopping existing bridge..."
pkill -f "websocket-bridge" || echo "No bridge process found"
sleep 2

# Check the certificate files
SSL_DIR="/etc/ssl/virtualmin/175207398659177"
echo "📋 Available certificate files:"
ls -la "$SSL_DIR/"

echo
echo "🔍 Analyzing certificate files:"

echo "📜 ssl.cert (server certificate):"
openssl x509 -in "$SSL_DIR/ssl.cert" -noout -subject -dates
echo "   Size: $(wc -l < "$SSL_DIR/ssl.cert") lines"

echo
echo "📜 ssl.combined (server + intermediate):"
openssl x509 -in "$SSL_DIR/ssl.combined" -noout -subject -dates
echo "   Size: $(wc -l < "$SSL_DIR/ssl.combined") lines"
echo "   Certificates in file: $(grep -c "BEGIN CERTIFICATE" "$SSL_DIR/ssl.combined")"

echo
echo "📜 ssl.everything (complete bundle):"
echo "   Size: $(wc -l < "$SSL_DIR/ssl.everything") lines" 
echo "   Certificates in file: $(grep -c "BEGIN CERTIFICATE" "$SSL_DIR/ssl.everything")"

# Test certificate verification
echo
echo "🧪 Testing certificate chains:"

echo "Testing ssl.cert (current):"
if openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt "$SSL_DIR/ssl.cert" 2>/dev/null; then
    echo "   ✅ ssl.cert verifies successfully"
else
    echo "   ❌ ssl.cert verification failed"
fi

echo "Testing ssl.combined:"
if openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt "$SSL_DIR/ssl.combined" 2>/dev/null; then
    echo "   ✅ ssl.combined verifies successfully"
    BEST_CERT="ssl.combined"
else
    echo "   ❌ ssl.combined verification failed"
    BEST_CERT="ssl.everything"
fi

echo "Testing ssl.everything:"
if openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt "$SSL_DIR/ssl.everything" 2>/dev/null; then
    echo "   ✅ ssl.everything verifies successfully"
    BEST_CERT="ssl.everything"
else
    echo "   ❌ ssl.everything verification failed"
fi

echo
echo "🎯 Using certificate: $SSL_DIR/$BEST_CERT"

# Set environment variables
export SSL_KEY="$SSL_DIR/ssl.key"
export SSL_CERT="$SSL_DIR/$BEST_CERT"
export WS_PORT=8080
export WSS_PORT=8443

echo "🚀 Starting WebSocket bridge with complete certificate chain..."
node websocket-bridge-ssl.js &
BRIDGE_PID=$!

echo "💡 Bridge PID: $BRIDGE_PID"

# Wait and check status
sleep 3

if ps -p $BRIDGE_PID > /dev/null; then
    echo "✅ Bridge started successfully!"
    echo
    echo "🌐 Connection endpoints:"
    echo "   HTTP:  ws://cluster.wavelog.online:8080"
    echo "   HTTPS: wss://cluster.wavelog.online:8443"
    echo
    echo "🧪 Test SSL connection:"
    echo "   openssl s_client -connect cluster.wavelog.online:8443 -servername cluster.wavelog.online"
    echo
    echo "🌐 Test in browser:"
    echo "   https://cluster.wavelog.online/dx-cluster-working-client.html"
    echo
    echo "🔧 Management:"
    echo "   Stop: kill $BRIDGE_PID"
    echo "   Check: ss -tlnp | grep -E ':(8080|8443)'"
else
    echo "❌ Bridge failed to start!"
    echo "Check the error messages above"
fi