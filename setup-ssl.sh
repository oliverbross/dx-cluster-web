#!/bin/bash
# SSL Setup Script for DX Cluster Web Application
# This script helps set up SSL certificates for secure WebSocket connections

echo "🔐 Setting up SSL for DX Cluster Web Application..."
echo "==============================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo) to install certificates"
  exit 1
fi

# Create SSL directory if it doesn't exist
SSL_DIR="/etc/dx-cluster/ssl"
mkdir -p $SSL_DIR

echo "Creating self-signed certificate for testing..."
echo "Note: For production, use Let's Encrypt or a trusted CA"

# Generate private key
openssl genrsa -out $SSL_DIR/server.key 2048

# Generate certificate signing request
openssl req -new -key $SSL_DIR/server.key -out $SSL_DIR/server.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -days 365 -in $SSL_DIR/server.csr -signkey $SSL_DIR/server.key -out $SSL_DIR/server.crt

echo "✅ SSL certificates generated:"
echo "   Private Key: $SSL_DIR/server.key"
echo "   Certificate: $SSL_DIR/server.crt"

echo ""
echo "To enable SSL for WebSocket server, update your server configuration to use these certificates."
echo "For production deployment, replace with certificates from a trusted Certificate Authority."

echo ""
echo "🎉 SSL setup completed!"