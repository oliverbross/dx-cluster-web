#!/bin/bash

echo "🔍 Debugging WSS Connection Issue"
echo "================================="
echo

# Check if bridge is running
echo "🔧 Bridge Process Status:"
if ps -p 99079 > /dev/null; then
    echo "✅ Bridge process (PID 99079) is running"
    ps aux | grep 99079
else
    echo "❌ Bridge process not found"
fi

echo
echo "🌐 Port Status:"
ss -tlnp | grep -E ":(8080|8443)" || echo "❌ Ports not listening"

echo
echo "🔒 SSL Certificate Analysis:"
SSL_CERT="/etc/ssl/virtualmin/175207398659177/ssl.cert"

# Check certificate details
echo "📜 Certificate Subject and SAN:"
openssl x509 -in "$SSL_CERT" -noout -text | grep -A 1 "Subject:"
openssl x509 -in "$SSL_CERT" -noout -text | grep -A 5 "Subject Alternative Name" || echo "No SAN found"

echo
echo "🧪 Test SSL Connection Directly:"
echo "Testing HTTPS connection to cluster.wavelog.online:8443..."

# Test if SSL handshake works
timeout 10 openssl s_client -connect cluster.wavelog.online:8443 -servername cluster.wavelog.online < /dev/null > /tmp/ssl_test.log 2>&1

if grep -q "Verify return code: 0" /tmp/ssl_test.log; then
    echo "✅ SSL handshake successful"
else
    echo "❌ SSL handshake failed"
    echo "🔍 Error details:"
    grep -E "(error|verify|return code)" /tmp/ssl_test.log
fi

echo
echo "🔥 Firewall Status:"
if command -v iptables &> /dev/null; then
    echo "📋 IPTables rules for ports 8080, 8443:"
    iptables -L INPUT -n | grep -E "(8080|8443)" || echo "No specific rules found"
else
    echo "iptables not available"
fi

echo
echo "🌐 External Connectivity Test:"
echo "Testing if port 8443 is reachable externally..."

# Check if port is open externally
if command -v nc &> /dev/null; then
    timeout 5 nc -zv cluster.wavelog.online 8443 2>&1
else
    timeout 5 telnet cluster.wavelog.online 8443 2>&1 | head -3
fi

echo
echo "📊 WebSocket Bridge Logs:"
echo "Recent bridge activity..."
tail -20 /var/log/syslog | grep -i node || echo "No node logs in syslog"

echo
echo "💡 Possible Issues:"
echo "   1. Certificate might need full chain (not just certificate)"
echo "   2. Port 8443 might be blocked externally"
echo "   3. Certificate format might be wrong"
echo "   4. WebSocket upgrade headers might be missing"

echo
echo "🔧 Next Steps:"
echo "   1. Try HTTP version: ws://cluster.wavelog.online:8080"
echo "   2. Check certificate chain"
echo "   3. Test with curl/browser tools"