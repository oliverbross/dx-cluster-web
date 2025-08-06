# DX Cluster Web Application

A modern, responsive web application for ham radio operators to monitor DX clusters with Wavelog integration.

## 🚀 Features

### Phase 1 (Current)
- **Beautiful, Responsive UI** - Modern design with dark/light themes
- **DX Cluster Integration** - Connect to multiple DX clusters via WebSocket
- **Real-time Spot Display** - Live DX spots with filtering and sorting
- **Wavelog Integration** - Check logbook status and identify needed stations
- **Terminal Interface** - Send commands directly to DX clusters
- **User Preferences** - Customizable settings and color coding
- **Spot Color Coding** - Visual indicators for new DXCC, bands, modes
- **Mobile Responsive** - Works on desktop, tablet, and mobile devices

### Phase 2 (Planned)
- **Audio Alarms** - Voice announcements for needed stations
- **Advanced Filtering** - SOTA, POTA, WWFF recognition
- **Station Alarms** - Pop-up windows for specific callsigns
- **Logging Integration** - Direct QSO logging to Wavelog
- **Statistics Dashboard** - Enhanced analytics and reporting

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript, Modern CSS, HTML5
- **Backend**: PHP 7.4+, WebSocket server
- **Database**: MySQL 5.7+
- **Real-time**: Custom WebSocket implementation
- **APIs**: Wavelog integration, ng3k.com cluster list

## 📋 Requirements

- PHP 7.4 or higher
- MySQL 5.7 or higher
- Web server (Apache/Nginx)
- Socket extension for PHP
- Modern web browser with WebSocket support

## 🖥️ Windows Installation

### 1. Install PHP
1. Download PHP from [windows.php.net](https://windows.php.net/download/)
2. Extract to `C:\php`
3. Add `C:\php` to your system PATH
4. Verify installation: `php --version`

### 2. Install Composer
1. Download Composer from [getcomposer.org](https://getcomposer.org/download/)
2. Run the Windows installer
3. Verify installation: `composer --version`

### 3. Install PHP Dependencies
```bash
composer install
```

### 4. Install MySQL
1. Download MySQL from [dev.mysql.com](https://dev.mysql.com/downloads/mysql/)
2. Follow the installation wizard
3. Remember your root password

## 🔧 Installation

### 1. Clone/Download Files
Place all files in your web server directory (e.g., `/var/www/html/dx-cluster/`)

### 2. Database Setup
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

### 3. Configuration
Edit `config/config.php` and update database settings:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'dx_cluster');
define('DB_USER', 'dx_cluster');
define('DB_PASS', 'your_password');
```

### 4. Install Dependencies
```bash
composer install
```

### 5. Start WebSocket Server
```bash
# For development
php server/production-websocket-server.php

# For production, use a process manager like supervisor
```

### 6. Web Server Configuration

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

## 🚀 Usage

### 1. Access the Application
Open your web browser and navigate to: `http://your-server/dx-cluster/`

### 2. Configure Settings
1. Click **Settings** in the navigation
2. Enter your **Wavelog URL** and **API Key**
3. Set your **callsign** and preferences
4. Click **Save Settings**

### 3. Connect to DX Cluster
1. Go to **Dashboard**
2. Select a DX cluster from the dropdown
3. Click **Connect**
4. Monitor real-time spots in the **DX Spots** section

### 4. Use Terminal
1. Go to **Terminal** section
2. Send commands directly to the cluster
3. Use macro buttons for common commands

## 🎨 Customization

### Color Coding
Customize spot colors in Settings:
- **New DXCC**: Red (#ef4444)
- **New Band**: Green (#22c55e)
- **New Mode**: Blue (#3b82f6)
- **Worked**: Orange (#f59e0b)
- **Confirmed**: Gray (#6b7280)

### Themes
- **Dark Theme**: Professional dark interface (default)
- **Light Theme**: Clean light interface

## 🔌 Wavelog Integration

### API Configuration
1. In Wavelog, go to **Account Settings**
2. Generate an **API Key**
3. Note your **Logbook Public Slug**
4. Enter these in DX Cluster Web settings

### Supported APIs
- `api/station_info` - Get station information
- `api/logbook_check_callsign` - Check if callsign is worked
- `api/logbook_check_grid` - Check if grid is worked
- `api/get_wp_stats` - Get QSO statistics

## 🌐 DX Clusters

The application automatically fetches cluster lists from:
- **ng3k.com** - Updated daily
- **Built-in defaults** - Fallback clusters

### Supported Clusters
- DX Summit (dxc.dxsummit.fi:8000)
- OH2AQ (oh2aq.kolumbus.fi:41112)
- VE7CC (ve7cc.net:23)
- W3LPL (w3lpl.net:7300)
- K3LR (k3lr.com:7300)

## 🔧 Troubleshooting

### WebSocket Connection Issues
1. Ensure WebSocket server is running: `php server/production-websocket-server.php`
2. Check firewall settings for port 8080
3. Verify PHP socket extension is installed

### Database Connection
1. Check database credentials in `config/config.php`
2. Ensure MySQL service is running
3. Verify database and tables exist

### Wavelog Integration
1. Test API key in Settings
2. Check Wavelog URL format (include http/https)
3. Verify API endpoints are accessible

### Cluster Connection
1. Try different clusters if one fails
2. Check internet connectivity
3. Some clusters may require registration

## 📱 Mobile Usage

The application is fully responsive:
- **Touch-friendly** interface
- **Optimized layouts** for small screens
- **Swipe gestures** for navigation
- **Readable fonts** and spacing

## 🔒 Security

- **Input sanitization** for all user data
- **Prepared statements** for database queries
- **CORS headers** for API security
- **Session management** for preferences

## 🐛 Known Issues

1. **WebSocket Reconnection**: Manual reconnection required if connection drops
2. **Cluster Compatibility**: Some clusters may use different spot formats
3. **Mobile Terminal**: Limited terminal functionality on mobile devices

## 🚧 Development

### File Structure
```
dx-cluster/
├── assets/
│   ├── css/styles.css          # Main stylesheet
│   └── js/
│       ├── app.js              # Main application
│       ├── cluster.js          # Cluster management
│       ├── wavelog.js          # Wavelog integration
│       └── ui.js               # UI helpers
├── api/
│   ├── clusters.php            # Cluster list API
│   ├── database.php            # Database class
│   └── preferences.php         # User preferences API
├── config/
│   └── config.php              # Configuration
├── database/
│   └── schema.sql              # Database schema
├── server/
│   ├── production-websocket-server.php  # Production WebSocket server
│   └── websocket-server.php    # Legacy WebSocket server
└── index.html                  # Main application
```

### Contributing
1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Wavelog** - Excellent logging software
- **ng3k.com** - DX cluster directory
- **Ham Radio Community** - Inspiration and feedback

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Contact via email
- Join the discussion on ham radio forums

---

**73 de DX Cluster Web Team** 📡

## 🚀 Quick Start for Developers

### Prerequisites
- PHP 7.4+ with Composer
- MySQL 5.7+
- Node.js (for development tools)

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/dx-cluster-web.git
   cd dx-cluster-web
   ```

2. **Install PHP dependencies:**
   ```bash
   composer install
   ```

3. **Set up the database:**
   ```sql
   CREATE DATABASE dx_cluster CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
   Import the schema:
   ```bash
   mysql -u root -p dx_cluster < database/schema.sql
   ```

4. **Configure the application:**
   Edit `config/config.php` with your database credentials.

5. **Start the WebSocket server:**
   ```bash
   php server/production-websocket-server.php
   ```

6. **Serve the web application:**
   Use your preferred web server (Apache, Nginx) or PHP's built-in server:
   ```bash
   php -S localhost:8000
   ```

7. **Access the application:**
   Open your browser to `http://localhost:8000`

### Development Server

For development, you can use the built-in PHP server:
```bash
php -S localhost:8000
```

Then start the WebSocket server in another terminal:
```bash
php server/production-websocket-server.php
```

### Production Deployment

1. **Web Server Configuration:**
   Ensure your web server is configured to serve the application and handle API requests.

2. **WebSocket Server:**
   Run the WebSocket server as a background service using systemd, supervisor, or similar.

3. **Database:**
   Ensure your database is properly configured and accessible.

4. **Security:**
   - Set proper file permissions
   - Use HTTPS in production
   - Configure firewall rules for WebSocket port (8080 by default)