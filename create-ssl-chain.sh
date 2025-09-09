#!/bin/bash

echo "🔗 Creating Complete SSL Certificate Chain"
echo "=========================================="
echo

SSL_DIR="/etc/ssl/virtualmin/175207398659177"
SSL_CERT="$SSL_DIR/ssl.cert"
SSL_KEY="$SSL_DIR/ssl.key"

echo "📋 Available certificate files:"
ls -la "$SSL_DIR/"

echo
echo "🔍 Analyzing current certificate:"
openssl x509 -in "$SSL_CERT" -noout -issuer -subject

# Check if there are other certificate files
echo
echo "🔍 Looking for intermediate certificates..."
for file in "$SSL_DIR"/*; do
    if [[ -f "$file" && "$file" != "$SSL_KEY" ]]; then
        echo "📜 Checking: $file"
        if openssl x509 -in "$file" -noout -subject 2>/dev/null; then
            echo "  ✅ Contains certificate"
            openssl x509 -in "$file" -noout -issuer -subject | sed 's/^/    /'
        else
            echo "  ❌ Not a certificate"
        fi
    fi
done

echo
echo "🔗 Creating full certificate chain..."

# Create the full chain file
CHAIN_FILE="/tmp/ssl_fullchain.pem"

# Start with the server certificate
cat "$SSL_CERT" > "$CHAIN_FILE"
echo "✅ Added server certificate"

# Look for CA bundle files in common locations
POSSIBLE_CA_FILES=(
    "$SSL_DIR/ca.pem"
    "$SSL_DIR/ca.cert"
    "$SSL_DIR/ca-bundle.pem"
    "$SSL_DIR/intermediate.pem"
    "/etc/ssl/certs/ca-certificates.crt"
    "/etc/ssl/cert.pem"
    "/etc/pki/tls/certs/ca-bundle.crt"
)

CA_ADDED=false
for ca_file in "${POSSIBLE_CA_FILES[@]}"; do
    if [[ -f "$ca_file" ]]; then
        echo "📎 Found CA file: $ca_file"
        echo "" >> "$CHAIN_FILE"  # Add newline
        cat "$ca_file" >> "$CHAIN_FILE"
        CA_ADDED=true
        break
    fi
done

if [[ "$CA_ADDED" = false ]]; then
    echo "⚠️ No CA bundle found, trying to download intermediate certificates..."
    
    # Try to get intermediate certificate from the certificate's AIA extension
    AIA_URL=$(openssl x509 -in "$SSL_CERT" -noout -text | grep -A1 "Authority Information Access" | grep "CA Issuers" | sed 's/.*URI://')
    
    if [[ -n "$AIA_URL" ]]; then
        echo "🌐 Downloading intermediate certificate from: $AIA_URL"
        if curl -s -L "$AIA_URL" -o /tmp/intermediate.crt; then
            # Convert if it's in DER format
            if openssl x509 -in /tmp/intermediate.crt -noout -text 2>/dev/null; then
                echo "" >> "$CHAIN_FILE"
                cat /tmp/intermediate.crt >> "$CHAIN_FILE"
                echo "✅ Added intermediate certificate"
            else
                echo "🔄 Converting DER to PEM..."
                openssl x509 -in /tmp/intermediate.crt -inform DER -outform PEM >> "$CHAIN_FILE"
                echo "✅ Added intermediate certificate (converted from DER)"
            fi
        fi
    fi
fi

echo
echo "📊 Final certificate chain:"
echo "Size: $(wc -l < "$CHAIN_FILE") lines"
echo "Certificates in chain: $(grep -c "BEGIN CERTIFICATE" "$CHAIN_FILE")"

echo
echo "🧪 Testing certificate chain..."
if openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt "$CHAIN_FILE" 2>/dev/null; then
    echo "✅ Certificate chain verification successful!"
    
    echo
    echo "🚀 Starting WebSocket bridge with fixed certificate chain..."
    
    # Copy the working chain to a permanent location
    sudo cp "$CHAIN_FILE" "$SSL_DIR/ssl_fullchain.pem"
    sudo chown $(stat -c '%U:%G' "$SSL_CERT") "$SSL_DIR/ssl_fullchain.pem"
    
    # Export the corrected certificate path
    export SSL_CERT="$SSL_DIR/ssl_fullchain.pem"
    export SSL_KEY="$SSL_KEY"
    export WS_PORT=8080
    export WSS_PORT=8443
    
    # Start the bridge
    node websocket-bridge-ssl.js &
    NEW_PID=$!
    
    sleep 3
    if ps -p $NEW_PID > /dev/null; then
        echo "✅ Bridge started successfully with complete certificate chain!"
        echo "💡 Bridge PID: $NEW_PID"
        echo
        echo "🧪 Test the connection now:"
        echo "   HTTPS: https://cluster.wavelog.online/dx-cluster-working-client.html"
        echo "   Should connect via: wss://cluster.wavelog.online:8443"
    else
        echo "❌ Bridge failed to start"
    fi
    
else
    echo "❌ Certificate chain verification failed"
    echo "🔍 Chain contents:"
    openssl storeutl -noout -text -certs "$CHAIN_FILE" | grep -E "(subject|issuer)="
fi