# DX Cluster Web - Production Setup Guide

## Server Requirements

- PHP 7.4 or higher
- MySQL 5.7 or higher
- Composer (for WebSocket server dependencies)
- Node.js (optional, for development server)

## Installation Steps

### 1. Clone/Download Files

Place all files in your web server directory (e.g., `/var/www/html/dx-cluster/` or `/home/youruser/public_html/dx-cluster/`)

### 2. Install PHP Dependencies

```bash
cd /path/to/dx-cluster
composer install
```

### 3. Database Setup

```sql
-- Create database
CREATE DATABASE dx_cluster CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (optional)
CREATE USER 'dx_cluster'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON dx_cluster.* TO 'dx_cluster'@'localhost';
FLUSH PRIVILEGES;

-- Import schema
mysql -u root -p dx_cluster < database/schema.sql
```

### 4. Configuration

Edit `config/config.php` and update database settings:

```php
// Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'dx_cluster');
define('DB_USER', 'dx_cluster');
define('DB_PASS', 'your_password');

// WebSocket Configuration (should already be set to 0.0.0.0)
define('WS_HOST', '0.0.0.0');
define('WS_PORT', 8080);
```

### 5. Start Services

#### Start WebSocket Server

```bash
# Run in background with nohup
nohup php server/production-websocket-server.php > websocket.log 2>&1 &

# Or run in foreground to see output
php server/production-websocket-server.php
```

#### Start Web Server

You can use Apache/Nginx or PHP's built-in server:

```bash
# PHP built-in server (for testing)
php -S 0.0.0.0:8000

# Or configure Apache/Nginx virtual host
```

### 6. Configure Apache/Nginx (if using)

#### Apache (.htaccess)

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ api/$1.php [L]
```

#### Nginx

```nginx
location /dx-cluster/api/ {
    try_files $uri $uri.php;
}
```

### 7. Access the Application

Open your web browser and navigate to: `http://your-server-ip:8000/`

### 8. Configure Settings

1. Click **Settings** in the navigation
2. Enter your **Wavelog URL** and **API Key**
3. Set your **callsign** and preferences
4. Click **Save Settings**

## Troubleshooting

### WebSocket Connection Issues

1. Ensure WebSocket server is running:
   ```bash
   ps aux | grep websocket
   ```

2. Check firewall settings for port 8080:
   ```bash
   sudo ufw allow 8080
   ```

3. Verify PHP socket extension is installed:
   ```bash
   php -m | grep sockets
   ```

### Database Connection

1. Check database credentials in `config/config.php`
2. Ensure MySQL service is running:
   ```bash
   sudo systemctl status mysql
   ```
3. Verify database and tables exist

### Wavelog Integration

1. Test API key in Settings
2. Check Wavelog URL format (include http/https)
3. Verify API endpoints are accessible

## Production Deployment

For production deployment, consider:

1. **Use a process manager** like Supervisor to keep the WebSocket server running:
   ```ini
   [program:dx-websocket]
   command=php /path/to/dx-cluster/server/production-websocket-server.php
   directory=/path/to/dx-cluster
   user=www-data
   autostart=true
   autorestart=true
   redirect_stderr=true
   stdout_logfile=/var/log/supervisor/dx-websocket.log
   ```

2. **Configure reverse proxy** with Apache/Nginx for WebSocket support:
   ```nginx
   location / {
       proxy_pass http://localhost:8000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
   }
   ```

3. **Set up SSL** with Let's Encrypt for secure connections

4. **Monitor logs** regularly:
   - WebSocket server logs
   - Web server logs
   - PHP error logs

## Security Considerations

- Use strong database passwords
- Restrict database user privileges
- Use HTTPS for production deployments
- Regularly update dependencies
- Implement proper input sanitization (already included)
- Use prepared statements for database queries (already included)