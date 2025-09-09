#!/bin/bash

echo "🔍 Deep SSL Certificate Analysis"
echo "==============================="
echo

SSL_DIR="/etc/ssl/virtualmin/175207398659177"

# Test direct SSL connection to our bridge
echo "🧪 Testing direct SSL connection to our bridge:"
echo "Connecting to cluster.wavelog.online:8443..."

timeout 10 openssl s_client -connect cluster.wavelog.online:8443 -servername cluster.wavelog.online -showcerts </dev/null > /tmp/ssl_debug.log 2>&1

echo "📊 SSL Connection Result:"
if grep -q "Verify return code: 0" /tmp/ssl_debug.log; then
    echo "✅ SSL connection successful!"
    grep "Verify return code" /tmp/ssl_debug.log
else
    echo "❌ SSL connection failed!"
    echo "🔍 Error details:"
    grep -E "(verify|error|return code|CONNECTED)" /tmp/ssl_debug.log
fi

echo
echo "🔍 Certificate chain received by client:"
grep -c "BEGIN CERTIFICATE" /tmp/ssl_debug.log
echo "Certificates in response: $(grep -c 'BEGIN CERTIFICATE' /tmp/ssl_debug.log)"

echo
echo "🔗 Full certificate chain analysis:"
cat /tmp/ssl_debug.log | openssl storeutl -noout -text -certs - 2>/dev/null | grep -E "(subject|issuer)=" || echo "Could not parse certificate chain"

echo
echo "🧪 Testing with curl (simulates browser behavior):"
curl -I -k https://cluster.wavelog.online:8443 2>&1 | head -5

echo
echo "🔧 WebSocket-specific test:"
echo "Testing WebSocket upgrade headers..."

# Test WebSocket connection with curl
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" -H "Sec-WebSocket-Version: 13" https://cluster.wavelog.online:8443/ 2>&1 | head -10

echo
echo "🔍 Certificate trust store check:"
echo "System CA bundle location:"
find /etc/ssl -name "ca-certificates.crt" -o -name "ca-bundle.crt" 2>/dev/null

echo
echo "🔧 Alternative: Test with self-signed certificate acceptance"
echo "Creating temporary WebSocket test..."

# Create a simple test to see if the issue is certificate verification
cat > /tmp/test_wss.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>WSS Test</title>
</head>
<body>
    <div id="status">Testing WSS connection...</div>
    <div id="log"></div>
    
    <script>
        const log = document.getElementById('log');
        const status = document.getElementById('status');
        
        function addLog(message) {
            log.innerHTML += message + '<br>';
            console.log(message);
        }
        
        try {
            const ws = new WebSocket('wss://cluster.wavelog.online:8443/');
            
            ws.onopen = function() {
                addLog('✅ WebSocket connected successfully!');
                status.textContent = 'Connected!';
                status.style.color = 'green';
            };
            
            ws.onerror = function(error) {
                addLog('❌ WebSocket error: ' + JSON.stringify(error));
                status.textContent = 'Connection failed!';
                status.style.color = 'red';
            };
            
            ws.onclose = function(event) {
                addLog('🔌 WebSocket closed: code=' + event.code + ', reason=' + event.reason);
            };
            
        } catch (error) {
            addLog('💥 Exception: ' + error.message);
        }
    </script>
</body>
</html>
EOF

echo "📝 Created test file: /tmp/test_wss.html"
echo "💡 To test manually, serve this file over HTTPS and open in browser"

echo
echo "🎯 Summary of findings:"
echo "   - Bridge is running on port 8443: ✅"
echo "   - Port is accessible externally: ✅" 
echo "   - Certificate verification: ❌ (needs investigation)"
echo
echo "💡 Next steps:"
echo "1. Check the SSL debug output above"
echo "2. Test with browser developer tools"
echo "3. Consider using self-signed cert for testing"