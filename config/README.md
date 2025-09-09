# DX Cluster Web - Configuration Guide

This directory contains all configuration files for the DX Cluster Web application. These files allow you to customize the application without modifying the source code, making it easy to deploy to different environments.

## Configuration Files

### 1. `server.json` - Server Configuration
```json
{
  "port": 8080,
  "host": "localhost",
  "websocket": {
    "enabled": true,
    "path": "/ws"
  },
  "cors": {
    "enabled": true,
    "origin": "*",
    "methods": "GET, POST, PUT, DELETE, OPTIONS",
    "headers": "Content-Type, Authorization, X-Requested-With"
  },
  "logging": {
    "level": "info",
    "timestamps": true
  },
  "cluster": {
    "defaultLoginCallsign": "OM0RX",
    "autoReconnect": true,
    "reconnectDelay": 30000,
    "connectionTimeout": 10000,
    "maxRetries": 3
  },
  "wavelog": {
    "defaultUrl": "https://om0rx.wavelog.online/index.php",
    "timeout": 30000,
    "retryAttempts": 2
  }
}
```

### 2. `clusters.json` - DX Cluster Definitions
```json
[
  {
    "id": 1,
    "name": "DX Summit",
    "host": "dxc.dxsummit.fi",
    "port": 8000,
    "description": "Popular DX cluster with web interface",
    "is_active": 1
  },
  {
    "id": 2,
    "name": "OH2AQ",
    "host": "oh2aq.kolumbus.fi",
    "port": 41112,
    "description": "Finnish DX cluster",
    "is_active": 1
  }
]
```

### 3. `preferences.json` - User Preferences
```json
{
  "theme": "dark",
  "callsign": "OM0RX",
  "autoConnect": false,
  "wavelogUrl": "https://om0rx.wavelog.online/index.php",
  "wavelogApiKey": "your-api-key-here",
  "wavelogLogbookSlug": "1",
  "colors": {
    "newDxcc": "#ef4444",
    "newBand": "#22c55e",
    "newMode": "#3b82f6",
    "worked": "#f59e0b",
    "confirmed": "#6b7280"
  }
}
```

## Deployment Instructions

### 1. Copy Configuration Files
Copy all files from the `config/` directory to your production server.

### 2. Update Server Configuration
Edit `server.json`:
- Change `host` to your domain or IP address
- Adjust `port` if needed (default: 8080)
- Configure CORS settings for your domain

### 3. Configure DX Clusters
Edit `clusters.json`:
- Add your preferred DX cluster servers
- Remove any clusters you don't want
- Ensure all clusters have unique IDs

### 4. Set User Preferences
Edit `preferences.json`:
- Set your callsign
- Configure your Wavelog URL and API key
- Adjust color scheme and theme preferences

### 5. Start the Server
```bash
# Install dependencies
npm install

# Start the server
node server/dev-server.js
```

## Environment Variables (Optional)

You can also use environment variables to override configuration:

```bash
# Server configuration
export DX_CLUSTER_PORT=8080
export DX_CLUSTER_HOST=your-domain.com

# Wavelog configuration
export DX_WAVELOG_URL=https://your-wavelog.com/index.php
export DX_WAVELOG_API_KEY=your-api-key

# Start server
node server/dev-server.js
```

## Security Considerations

### 1. API Keys
- Never commit API keys to version control
- Use environment variables for sensitive data
- Rotate API keys regularly

### 2. CORS Configuration
- Set specific origins instead of "*" in production
- Use HTTPS for all connections
- Implement proper authentication

### 3. File Permissions
- Ensure config files are readable by the server process
- Restrict write permissions to prevent unauthorized changes

## Troubleshooting

### Configuration Not Loading
- Check file paths are correct
- Verify JSON syntax is valid
- Ensure files are readable by the server process

### Server Won't Start
- Check port is not already in use
- Verify all dependencies are installed (`npm install`)
- Check configuration file syntax

### Clusters Not Connecting
- Verify cluster hostnames and ports are correct
- Check firewall settings
- Ensure network connectivity to cluster servers

## Advanced Configuration

### Custom Cluster Login
```json
{
  "cluster": {
    "defaultLoginCallsign": "YOUR_CALLSIGN",
    "customLoginCommands": ["set dx extension", "set dx mode"]
  }
}
```

### WebSocket Configuration
```json
{
  "websocket": {
    "enabled": true,
    "path": "/ws",
    "heartbeat": 30000,
    "maxConnections": 100
  }
}
```

### Logging Configuration
```json
{
  "logging": {
    "level": "debug",
    "timestamps": true,
    "file": "logs/dx-cluster.log",
    "maxSize": "10m",
    "maxFiles": 5
  }
}
```

## Support

For configuration help:
- Check the main README.md for detailed setup instructions
- Review server logs for error messages
- Test API endpoints individually to isolate issues

---

**Configuration files make your DX Cluster Web application portable and easy to deploy across different environments!**