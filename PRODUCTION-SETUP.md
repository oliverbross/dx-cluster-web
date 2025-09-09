# DX Cluster Web - Production Setup Guide

## 🚀 Quick Setup for cluster.wavelog.online

### Prerequisites
- **Server**: cluster.wavelog.online
- **Database**: MariaDB 10.6.22
- **PHP**: 7.4+ with PDO extension
- **Web Server**: Apache/Nginx configured

### 🔧 Setup Steps

#### 1. Upload Files
Upload all project files to your web server directory on cluster.wavelog.online.

#### 2. Run Setup Wizard
Open your browser and navigate to:
```
https://cluster.wavelog.online/setup.php
```

#### 3. Enter Database Details
The setup wizard will ask for:
- **Database Host**: (usually `localhost`)
- **Database Name**: (e.g., `dx_cluster`)
- **Database Username**: Your MariaDB username
- **Database Password**: Your MariaDB password
- **Database Charset**: `utf8mb4` (recommended for MariaDB 10.6.22)

#### 4. Automatic Configuration
The setup will automatically:
- ✅ Test database connection
- ✅ Create database if it doesn't exist  
- ✅ Generate `.env` configuration file
- ✅ Create all required tables with proper indexes
- ✅ Insert default DX cluster data
- ✅ Optimize for MariaDB 10.6.22

#### 5. Security
After setup completes:
- ⚠️ **Delete `setup.php`** for security
- ✅ Verify `.env` file permissions (should not be web accessible)

### 📋 Manual Configuration (Alternative)

If you prefer manual setup, create a `.env` file:

```env
# Database Configuration for MariaDB 10.6.22
DB_HOST=localhost
DB_NAME=dx_cluster
DB_USER=your_username
DB_PASS=your_password
DB_CHARSET=utf8mb4

# Application Configuration
APP_ENV=production
APP_URL=https://cluster.wavelog.online
APP_DEBUG=false

# WebSocket Configuration
WS_HOST=0.0.0.0
WS_PORT=8080

# Session Configuration
SESSION_LIFETIME=7200
SESSION_NAME=dx_cluster_session
```

Then import the database schema:
```sql
mysql -u your_username -p your_database < database/schema.sql
```

### 🌐 Features Configured

After setup, your application includes:

#### ✅ Fixed DOM Validation Issues
- All password fields properly contained in forms
- All input fields have appropriate `autocomplete` attributes
- No more browser console warnings

#### ✅ API Endpoints Ready
- `/api/clusters.php` - DX cluster management
- `/api/preferences.php` - User preferences  
- `/api/auth.php` - Authentication
- All APIs handle database errors gracefully

#### ✅ Database Optimizations
- Tables optimized for MariaDB 10.6.22
- Proper indexes for performance
- VARCHAR lengths optimized for utf8mb4
- Foreign key constraints for data integrity

#### ✅ Default Data
- 6 pre-configured DX clusters including:
  - DX Summit (dxc.dxsummit.fi:8000)
  - OH2AQ (oh2aq.kolumbus.fi:41112)
  - VE7CC (ve7cc.net:23)
  - W3LPL (w3lpl.net:7300)
  - K3LR (k3lr.com:7300)
  - OM0RX Cluster (cluster.om0rx.com:7300)

### 🔧 Configuration Management

The application uses a robust `.env` system:
- **Production Ready**: Optimized for cluster.wavelog.online
- **Secure**: Database credentials stored in `.env` file
- **Flexible**: Easy to modify without code changes
- **Error Handling**: Graceful fallbacks and user-friendly messages

### 📊 Database Schema

Created tables:
- `users` - User authentication and Wavelog settings
- `user_preferences` - Customizable user settings
- `dx_clusters` - Available DX clusters for connection
- `dx_spots` - Received DX spots with filtering data
- `user_sessions` - WebSocket session management

### 🚀 Next Steps

1. **Start Using**: Navigate to https://cluster.wavelog.online
2. **Configure Wavelog**: Enter your Wavelog URL and API key in settings
3. **Connect to Clusters**: Choose a DX cluster and start monitoring
4. **Customize**: Adjust colors, themes, and preferences

### 🔒 Security Features

- ✅ CORS headers properly configured
- ✅ Input sanitization for all user data
- ✅ Prepared statements for database queries
- ✅ CSRF token protection
- ✅ Session management with timeout
- ✅ Environment-based configuration

### 📞 Support

If you encounter issues:
1. Check `.env` file exists and has correct database credentials
2. Verify MariaDB is running and accessible
3. Check web server error logs
4. Ensure PHP PDO extension is installed

The application is now production-ready for cluster.wavelog.online! 🎉