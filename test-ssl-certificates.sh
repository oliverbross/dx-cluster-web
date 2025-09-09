#!/bin/bash

echo "🔍 Testing Virtualmin SSL Certificates"
echo "======================================"
echo

SSL_KEY="/etc/ssl/virtualmin/175207398659177/ssl.key"
SSL_CERT="/etc/ssl/virtualmin/175207398659177/ssl.cert"

# Check certificate files exist and are readable
echo "📋 Certificate file status:"

if [[ -f "$SSL_CERT" ]]; then
    echo "✅ Certificate file exists: $SSL_CERT"
    ls -la "$SSL_CERT"
    echo
    echo "📜 Certificate details:"
    openssl x509 -in "$SSL_CERT" -noout -text | head -20
    echo
    echo "📅 Certificate validity:"
    openssl x509 -in "$SSL_CERT" -noout -dates
    echo
    echo "🌐 Certificate domains:"
    openssl x509 -in "$SSL_CERT" -noout -text | grep -A 1 "Subject Alternative Name" || echo "No SAN found"
    openssl x509 -in "$SSL_CERT" -noout -subject | grep -o "CN=[^,]*"
else
    echo "❌ Certificate file not found: $SSL_CERT"
fi

echo
echo "🔑 Private key status:"

if [[ -f "$SSL_KEY" ]]; then
    echo "✅ Private key exists: $SSL_KEY"
    ls -la "$SSL_KEY"
    echo
    echo "🔍 Key format check:"
    head -1 "$SSL_KEY"
    echo "📊 Key details:"
    openssl rsa -in "$SSL_KEY" -noout -text | head -5 2>/dev/null || echo "Key analysis failed (may need password)"
else
    echo "❌ Private key not found: $SSL_KEY"
fi

echo
echo "🔗 Certificate-Key pair verification:"
if [[ -f "$SSL_CERT" && -f "$SSL_KEY" ]]; then
    CERT_HASH=$(openssl x509 -noout -modulus -in "$SSL_CERT" | openssl md5)
    KEY_HASH=$(openssl rsa -noout -modulus -in "$SSL_KEY" 2>/dev/null | openssl md5)
    
    echo "Certificate hash: $CERT_HASH"
    echo "Private key hash: $KEY_HASH"
    
    if [[ "$CERT_HASH" == "$KEY_HASH" ]]; then
        echo "✅ Certificate and private key match!"
    else
        echo "❌ Certificate and private key DO NOT match!"
    fi
else
    echo "⚠️ Cannot verify pair - missing files"
fi

echo
echo "🔧 Permissions check:"
echo "Current user: $(whoami)"
echo "Certificate permissions: $(stat -c '%A %U:%G' "$SSL_CERT" 2>/dev/null || echo 'Cannot read')"
echo "Key permissions: $(stat -c '%A %U:%G' "$SSL_KEY" 2>/dev/null || echo 'Cannot read')"

# Test if we can read as current user
if [[ -r "$SSL_CERT" && -r "$SSL_KEY" ]]; then
    echo "✅ Files are readable by current user"
else
    echo "⚠️ May need to run as root or adjust permissions"
    echo "💡 Try: sudo chown $(whoami):$(whoami) $SSL_KEY $SSL_CERT"
    echo "💡 Or run bridge as: sudo node websocket-bridge-ssl.js"
fi