#!/bin/bash

echo "🔗 Fixing SSL Certificate Chain for WebSocket"
echo "============================================="
echo

SSL_CERT="/etc/ssl/virtualmin/175207398659177/ssl.cert"
SSL_KEY="/etc/ssl/virtualmin/175207398659177/ssl.key"

# Check if there's a CA bundle or chain file
echo "🔍 Looking for certificate chain files..."
find /etc/ssl/virtualmin/175207398659177/ -name "*.pem" -o -name "*.crt" -o -name "*.chain" -o -name "*bundle*" 2>/dev/null

echo
echo "📋 Available certificate files:"
ls -la /etc/ssl/virtualmin/175207398659177/

echo
echo "🧪 Testing current certificate:"
openssl x509 -in "$SSL_CERT" -noout -text | grep -E "(Issuer|Subject):"

echo
echo "🔗 Checking certificate chain completeness:"
if openssl verify -CAfile "$SSL_CERT" "$SSL_CERT" 2>/dev/null; then
    echo "✅ Certificate chain is complete"
else
    echo "⚠️ Certificate chain may be incomplete"
    echo "🔍 Let's look for intermediate certificates..."
    
    # Look for intermediate certs in the same directory
    for file in /etc/ssl/virtualmin/175207398659177/*; do
        if [[ -f "$file" && "$file" != "$SSL_CERT" && "$file" != "$SSL_KEY" ]]; then
            echo "📜 Checking file: $file"
            if openssl x509 -in "$file" -noout -text 2>/dev/null | head -5; then
                echo "    └─ Contains certificate data"
            fi
        fi
    done
fi

echo
echo "🔧 Creating full certificate chain..."

# Try to create a full chain file
CHAIN_FILE="/tmp/ssl_fullchain.pem"
cp "$SSL_CERT" "$CHAIN_FILE"

# Look for CA bundle or intermediate certificates
if [[ -f "/etc/ssl/virtualmin/175207398659177/ca.pem" ]]; then
    echo "📎 Adding CA bundle..."
    cat "/etc/ssl/virtualmin/175207398659177/ca.pem" >> "$CHAIN_FILE"
elif [[ -f "/etc/ssl/certs/ca-certificates.crt" ]]; then
    echo "📎 Adding system CA bundle..."
    cat "/etc/ssl/certs/ca-certificates.crt" >> "$CHAIN_FILE"
fi

echo "✅ Created full chain file: $CHAIN_FILE"
echo "📊 Chain file size: $(wc -l < "$CHAIN_FILE") lines"

echo
echo "🧪 Testing the full chain:"
if openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt "$CHAIN_FILE" 2>/dev/null; then
    echo "✅ Full chain verifies successfully"
    
    echo
    echo "🔄 Restarting bridge with full chain..."
    
    # Kill current bridge
    kill 99079 2>/dev/null
    sleep 2
    
    # Start bridge with full chain
    export SSL_CERT="$CHAIN_FILE"
    export SSL_KEY="$SSL_KEY"
    export WS_PORT=8080
    export WSS_PORT=8443
    
    echo "🚀 Starting bridge with full certificate chain..."
    node websocket-bridge-ssl.js &
    NEW_PID=$!
    
    sleep 3
    echo "💡 New bridge PID: $NEW_PID"
    
    if ps -p $NEW_PID > /dev/null; then
        echo "✅ Bridge restarted successfully with full chain"
    else
        echo "❌ Bridge failed to restart"
    fi
    
else
    echo "❌ Full chain verification failed"
    echo "💡 The certificate might be missing intermediate certificates"
fi