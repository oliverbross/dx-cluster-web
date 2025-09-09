<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DX Cluster Web - Server Setup</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .setup-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 600px;
            width: 100%;
            overflow: hidden;
        }
        
        .setup-header {
            background: #2c3e50;
            color: white;
            text-align: center;
            padding: 30px;
        }
        
        .setup-header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        
        .setup-header p {
            opacity: 0.9;
            font-size: 16px;
        }
        
        .setup-form {
            padding: 40px;
        }
        
        .form-group {
            margin-bottom: 25px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #2c3e50;
        }
        
        .form-group input, .form-group select {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e0e6ed;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        .form-group input:focus, .form-group select:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .btn {
            background: #667eea;
            color: white;
            padding: 14px 32px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            width: 100%;
        }
        
        .btn:hover {
            background: #5a67d8;
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        }
        
        .btn:disabled {
            background: #a0aec0;
            cursor: not-allowed;
            transform: none;
        }
        
        .result {
            margin-top: 30px;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.6;
            white-space: pre-wrap;
        }
        
        .result.success {
            background: #f0fff4;
            border: 2px solid #48bb78;
            color: #2d5a3d;
        }
        
        .result.error {
            background: #fed7d7;
            border: 2px solid #e53e3e;
            color: #742a2a;
        }
        
        .result.info {
            background: #ebf8ff;
            border: 2px solid #4299e1;
            color: #2c5282;
        }
        
        .step-indicator {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            padding: 0 20px;
        }
        
        .step {
            text-align: center;
            flex: 1;
        }
        
        .step-number {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: #e0e6ed;
            color: #a0aec0;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 8px;
            font-weight: 600;
        }
        
        .step.active .step-number {
            background: #667eea;
            color: white;
        }
        
        .step.completed .step-number {
            background: #48bb78;
            color: white;
        }
        
        .step-text {
            font-size: 12px;
            color: #718096;
        }
        
        .step.active .step-text {
            color: #2c3e50;
            font-weight: 600;
        }
        
        .info-box {
            background: #f7fafc;
            border-left: 4px solid #667eea;
            padding: 16px;
            margin-bottom: 20px;
        }
        
        .info-box h4 {
            color: #2c3e50;
            margin-bottom: 8px;
        }
        
        .info-box p {
            color: #718096;
            font-size: 14px;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="setup-container">
        <div class="setup-header">
            <h1>🌐 DX Cluster Web Setup</h1>
            <p>Production Server Configuration</p>
        </div>
        
        <div class="setup-form">
            <div class="step-indicator">
                <div class="step active" id="step1">
                    <div class="step-number">1</div>
                    <div class="step-text">Database Config</div>
                </div>
                <div class="step" id="step2">
                    <div class="step-number">2</div>
                    <div class="step-text">Test Connection</div>
                </div>
                <div class="step" id="step3">
                    <div class="step-number">3</div>
                    <div class="step-text">Create Tables</div>
                </div>
                <div class="step" id="step4">
                    <div class="step-number">4</div>
                    <div class="step-text">Complete</div>
                </div>
            </div>

            <div class="info-box">
                <h4>🚀 Production Server Setup</h4>
                <p>This will configure your DX Cluster Web application on <strong>cluster.wavelog.online</strong> with MariaDB 10.6.22. Your database credentials will be saved to .env file and tables will be created automatically.</p>
            </div>

            <form id="setupForm" method="POST">
                <div class="form-group">
                    <label for="db_host">Database Host</label>
                    <input type="text" id="db_host" name="db_host" value="localhost" required>
                </div>
                
                <div class="form-group">
                    <label for="db_name">Database Name</label>
                    <input type="text" id="db_name" name="db_name" value="dx_cluster" required>
                </div>
                
                <div class="form-group">
                    <label for="db_user">Database Username</label>
                    <input type="text" id="db_user" name="db_user" required>
                </div>
                
                <div class="form-group">
                    <label for="db_pass">Database Password</label>
                    <input type="password" id="db_pass" name="db_pass" required>
                </div>
                
                <div class="form-group">
                    <label for="db_charset">Database Charset</label>
                    <select id="db_charset" name="db_charset">
                        <option value="utf8mb4">utf8mb4 (Recommended)</option>
                        <option value="utf8">utf8 (Legacy)</option>
                    </select>
                </div>
                
                <button type="submit" class="btn" id="setupBtn">
                    🔧 Start Setup Process
                </button>
            </form>
            
            <div id="setupResult"></div>
        </div>
    </div>

    <script>
        document.getElementById('setupForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const btn = document.getElementById('setupBtn');
            const result = document.getElementById('setupResult');
            
            btn.disabled = true;
            btn.textContent = '⏳ Setting up...';
            
            const formData = new FormData(this);
            formData.append('action', 'setup');
            
            fetch('setup.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.text())
            .then(data => {
                result.innerHTML = data;
                btn.disabled = false;
                btn.textContent = '🔧 Start Setup Process';
                
                // Update step indicators based on result
                if (data.includes('✅ Setup completed successfully!')) {
                    document.querySelectorAll('.step').forEach((step, index) => {
                        step.classList.add('completed');
                        step.classList.remove('active');
                    });
                    
                    // Show completion message
                    setTimeout(() => {
                        if (confirm('Setup completed! Would you like to open the application?')) {
                            window.location.href = 'index.html';
                        }
                    }, 2000);
                }
            })
            .catch(error => {
                result.innerHTML = '<div class="result error">❌ Error: ' + error.message + '</div>';
                btn.disabled = false;
                btn.textContent = '🔧 Start Setup Process';
            });
        });
    </script>
</body>
</html>

<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'setup') {
    echo '<div class="result info">';
    
    try {
        $dbHost = trim($_POST['db_host']);
        $dbName = trim($_POST['db_name']);
        $dbUser = trim($_POST['db_user']);
        $dbPass = trim($_POST['db_pass']);
        $dbCharset = trim($_POST['db_charset']);
        
        echo "🔧 Step 1: Validating inputs...\n";
        
        if (empty($dbHost) || empty($dbName) || empty($dbUser)) {
            throw new Exception("All database fields are required");
        }
        
        echo "✅ Step 1: Inputs validated\n\n";
        
        // Step 2: Test database connection
        echo "🔧 Step 2: Testing database connection...\n";
        
        $dsn = "mysql:host={$dbHost};charset={$dbCharset}";
        $pdo = new PDO($dsn, $dbUser, $dbPass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$dbCharset}"
        ]);
        
        echo "✅ Step 2: Connected to MariaDB server\n";
        
        // Get server version
        $version = $pdo->query('SELECT VERSION()')->fetchColumn();
        echo "📊 Database Server: {$version}\n\n";
        
        // Step 3: Create database
        echo "🔧 Step 3: Creating database '{$dbName}'...\n";
        
        $collation = $dbCharset === 'utf8mb4' ? 'utf8mb4_unicode_ci' : 'utf8_unicode_ci';
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET {$dbCharset} COLLATE {$collation}");
        $pdo->exec("USE `{$dbName}`");
        
        echo "✅ Step 3: Database '{$dbName}' ready\n\n";
        
        // Step 4: Save .env file
        echo "🔧 Step 4: Creating .env configuration...\n";
        
        $envContent = "# DX Cluster Web Application Configuration
# Generated on " . date('Y-m-d H:i:s') . "

# Database Configuration for MariaDB 10.6.22
DB_HOST={$dbHost}
DB_NAME={$dbName}
DB_USER={$dbUser}
DB_PASS={$dbPass}
DB_CHARSET={$dbCharset}

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

# Security
CSRF_TOKEN_NAME=csrf_token

# Logging
LOG_LEVEL=INFO
ERROR_REPORTING=E_ALL & ~E_NOTICE
";
        
        if (file_put_contents('.env', $envContent) === false) {
            throw new Exception("Could not write .env file. Check directory permissions.");
        }
        
        echo "✅ Step 4: .env file created successfully\n\n";
        
        // Step 5: Create database tables
        echo "🔧 Step 5: Creating database tables...\n";
        
        // Create tables optimized for MariaDB 10.6.22
        $tables = [
            "CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                callsign VARCHAR(20) NOT NULL UNIQUE,
                email VARCHAR(191),
                password_hash VARCHAR(255),
                wavelog_api_key VARCHAR(255),
                wavelog_url VARCHAR(191),
                wavelog_logbook_slug VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                last_login TIMESTAMP NULL,
                is_active BOOLEAN DEFAULT TRUE
            )",
            
            "CREATE TABLE IF NOT EXISTS user_preferences (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                preference_key VARCHAR(100) NOT NULL,
                preference_value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_pref (user_id, preference_key)
            )",
            
            "CREATE TABLE IF NOT EXISTS dx_clusters (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                host VARCHAR(191) NOT NULL,
                port INT NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )",
            
            "CREATE TABLE IF NOT EXISTS dx_spots (
                id INT AUTO_INCREMENT PRIMARY KEY,
                callsign VARCHAR(20) NOT NULL,
                frequency DECIMAL(10,3) NOT NULL,
                spotter VARCHAR(20) NOT NULL,
                comment TEXT,
                time_spotted TIMESTAMP NOT NULL,
                band VARCHAR(10),
                mode VARCHAR(10),
                dxcc_entity VARCHAR(100),
                grid_square VARCHAR(10),
                continent VARCHAR(5),
                cq_zone INT,
                itu_zone INT,
                cluster_source VARCHAR(100),
                is_needed BOOLEAN DEFAULT FALSE,
                logbook_status ENUM('new', 'worked', 'confirmed') DEFAULT 'new',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_callsign (callsign),
                INDEX idx_frequency (frequency),
                INDEX idx_time_spotted (time_spotted),
                INDEX idx_band (band),
                INDEX idx_is_needed (is_needed),
                INDEX idx_spots_combo (callsign, band, time_spotted)
            )",
            
            "CREATE TABLE IF NOT EXISTS user_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                session_token VARCHAR(191) NOT NULL UNIQUE,
                cluster_id INT,
                is_connected BOOLEAN DEFAULT FALSE,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (cluster_id) REFERENCES dx_clusters(id) ON DELETE SET NULL
            )"
        ];
        
        foreach ($tables as $sql) {
            $pdo->exec($sql);
        }
        
        echo "✅ Step 5: Database tables created\n\n";
        
        // Step 6: Insert default data
        echo "🔧 Step 6: Inserting default DX clusters...\n";
        
        $clusters = [
            [1, 'DX Summit', 'dxc.dxsummit.fi', 8000, 'Popular DX cluster with web interface'],
            [2, 'OH2AQ', 'oh2aq.kolumbus.fi', 41112, 'Finnish DX cluster'],
            [3, 'VE7CC', 've7cc.net', 23, 'Canadian DX cluster'],
            [4, 'W3LPL', 'w3lpl.net', 7300, 'US East Coast DX cluster'],
            [5, 'K3LR', 'k3lr.com', 7300, 'US East Coast DX cluster'],
            [6, 'OM0RX Cluster', 'cluster.om0rx.com', 7300, 'OM0RX Personal DX Cluster']
        ];
        
        $stmt = $pdo->prepare("INSERT IGNORE INTO dx_clusters (id, name, host, port, description) VALUES (?, ?, ?, ?, ?)");
        $insertedCount = 0;
        
        foreach ($clusters as $cluster) {
            if ($stmt->execute($cluster)) {
                $insertedCount++;
            }
        }
        
        echo "✅ Step 6: {$insertedCount} default clusters added\n\n";
        
        // Step 7: Verify setup
        echo "🔧 Step 7: Verifying installation...\n";
        
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        echo "📋 Tables created: " . implode(', ', $tables) . "\n";
        
        $clusterCount = $pdo->query("SELECT COUNT(*) FROM dx_clusters WHERE is_active = 1")->fetchColumn();
        echo "📡 Active clusters: {$clusterCount}\n";
        
        echo "✅ Step 7: Installation verified\n\n";
        
        echo "</div>";
        echo '<div class="result success">';
        echo "🎉 ✅ Setup completed successfully!\n\n";
        echo "🌐 Your DX Cluster Web application is ready at:\n";
        echo "   https://cluster.wavelog.online\n\n";
        echo "📋 What's been configured:\n";
        echo "   • Database '{$dbName}' created with {$clusterCount} default clusters\n";
        echo "   • .env configuration file created\n";
        echo "   • All required tables created with proper indexes\n";
        echo "   • MariaDB 10.6.22 optimizations applied\n\n";
        echo "🚀 Next steps:\n";
        echo "   1. Delete this setup.php file for security\n";
        echo "   2. Configure your Wavelog settings in the app\n";
        echo "   3. Start connecting to DX clusters!\n\n";
        echo "📞 Need help? Check the documentation or contact support.\n";
        
    } catch (PDOException $e) {
        echo "</div>";
        echo '<div class="result error">';
        echo "❌ Database Error: " . $e->getMessage() . "\n\n";
        echo "💡 Common solutions:\n";
        echo "   • Check database credentials\n";
        echo "   • Ensure MariaDB is running\n";
        echo "   • Verify database user has proper permissions\n";
        echo "   • Check if database name already exists\n";
    } catch (Exception $e) {
        echo "</div>";
        echo '<div class="result error">';
        echo "❌ Setup Error: " . $e->getMessage() . "\n\n";
        echo "💡 Please check:\n";
        echo "   • File permissions in the web directory\n";
        echo "   • PHP configuration and extensions\n";
        echo "   • Server connectivity\n";
    }
    
    echo "</div>";
    exit;
}
?>