# DX Cluster WebSocket Bridge - Ubuntu Setup

## 🐧 Ubuntu Server Installation

### Method 1: Quick Install (Recommended)
```bash
# Make installation script executable
chmod +x install-on-ubuntu.sh

# Run the installer
./install-on-ubuntu.sh
```

### Method 2: Manual Installation

#### 1. Install Node.js and npm
```bash
# Update package list
sudo apt update

# Install Node.js and npm
sudo apt install -y nodejs npm

# Verify installation
node --version
npm --version
```

#### 2. Install Dependencies
```bash
# Install WebSocket library
npm install ws

# Optional: Install PM2 for production
sudo npm install -g pm2
```

#### 3. Configure Firewall
```bash
# UFW (Ubuntu Firewall)
sudo ufw allow 8080/tcp

# OR iptables
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
sudo iptables-save > /etc/iptables/rules.v4
```

## 🚀 Running the Bridge

### Development Mode
```bash
# Start the bridge (foreground)
./start-websocket-bridge.sh

# Or manually:
node websocket-bridge.js
```

### Production Mode with PM2
```bash
# Start with PM2
pm2 start websocket-bridge.js --name "dx-cluster-bridge"

# Set to auto-start on boot
pm2 startup
pm2 save

# Monitor
pm2 status
pm2 logs dx-cluster-bridge
```

### System Service (Auto-start)
```bash
# Enable and start service
sudo systemctl enable dx-cluster-bridge
sudo systemctl start dx-cluster-bridge

# Check status
sudo systemctl status dx-cluster-bridge

# View logs
sudo journalctl -u dx-cluster-bridge -f
```

## 🌐 Web Client Configuration

### Update WebSocket URL in your HTML client:

```javascript
// For local testing on same server:
const wsUrl = `ws://localhost:8080/?host=${host}&port=${port}&login=${login}`;

// For external access (replace YOUR_SERVER_IP):
const wsUrl = `ws://192.168.1.100:8080/?host=${host}&port=${port}&login=${login}`;

// For production with domain:
const wsUrl = `ws://your-domain.com:8080/?host=${host}&port=${port}&login=${login}`;
```

## 🔧 Configuration Options

### Environment Variables
```bash
# Change port (default: 8080)
export WS_PORT=8081

# Run on specific interface (default: all interfaces)
export WS_HOST=127.0.0.1

# Start the bridge
node websocket-bridge.js
```

### PM2 Configuration File (`ecosystem.config.js`)
```javascript
module.exports = {
  apps: [{
    name: 'dx-cluster-bridge',
    script: 'websocket-bridge.js',
    env: {
      NODE_ENV: 'development',
      WS_PORT: 8080
    },
    env_production: {
      NODE_ENV: 'production',
      WS_PORT: 8080,
      WS_HOST: '0.0.0.0'
    }
  }]
};
```

## 🌍 External Access Setup

### 1. Server Firewall
```bash
# Allow port 8080
sudo ufw allow 8080/tcp

# Check firewall status
sudo ufw status
```

### 2. Router/Network Configuration
- Open port 8080 in your router if accessing from internet
- Set up port forwarding if needed

### 3. Domain Configuration (Optional)
- Point subdomain to your server: `cluster.your-domain.com`
- Use reverse proxy (nginx) for cleaner URLs
- Set up SSL certificate for WSS (secure WebSocket)

## 📊 Testing the Connection

### 1. Check if Bridge is Running
```bash
# Test locally
curl http://localhost:8080

# Check if port is listening
netstat -tlnp | grep :8080
```

### 2. Test WebSocket Connection
```bash
# Install websocat for testing
sudo apt install websocat

# Test connection
websocat ws://localhost:8080/?host=cluster.om0rx.com&port=7300&login=om0rx
```

### 3. Expected Output
```
📡 New WebSocket connection: om0rx@cluster.om0rx.com:7300
✅ TCP connected to cluster.om0rx.com:7300
🔐 Sending login: om0rx
📥 Received from cluster: Welcome to OM0RX Personal DX Cluster...
📥 Received from cluster: DX de OM0RX: 14074.0 JA1ABC CQ DX 1455Z
```

## 🚨 Troubleshooting

### Bridge Won't Start
```bash
# Check Node.js version (needs 12+)
node --version

# Check if port is in use
sudo netstat -tlnp | grep :8080

# Check firewall
sudo ufw status
```

### Can't Connect from Browser
- Update WebSocket URL with correct server IP
- Check firewall allows port 8080
- Verify bridge is running: `sudo systemctl status dx-cluster-bridge`

### No Data from Cluster
- Check cluster hostname/port are correct
- Verify cluster.om0rx.com:7300 is accessible: `telnet cluster.om0rx.com 7300`
- Check bridge logs: `sudo journalctl -u dx-cluster-bridge -f`

## 🔒 Security Considerations

### 1. Firewall Rules
```bash
# Only allow specific IPs (optional)
sudo ufw allow from YOUR_IP to any port 8080
```

### 2. Reverse Proxy with SSL
```nginx
server {
    listen 443 ssl;
    server_name cluster.your-domain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📈 Monitoring

### PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs dx-cluster-bridge --lines 100

# Restart if needed
pm2 restart dx-cluster-bridge
```

### System Logs
```bash
# Service logs
sudo journalctl -u dx-cluster-bridge -f

# System resource usage
htop
```

This setup will give you a robust, production-ready WebSocket bridge for your DX cluster application on Ubuntu!