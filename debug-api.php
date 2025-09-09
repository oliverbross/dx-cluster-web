<?php
/**
 * Debug API - Check what's happening with the APIs
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>DX Cluster Web - API Debug</title>
    <style>
        body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #00ff00; }
        .error { color: #ff4444; }
        .success { color: #44ff44; }
        .warning { color: #ffaa44; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #333; }
        pre { background: #000; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>🔍 DX Cluster Web - API Debug Report</h1>
    
    <div class="section">
        <h2>📁 File System Check</h2>
        <?php
        $requiredFiles = [
            'api/clusters.php',
            'api/cluster-connection.php',
            'config/config.php',
            'api/database.php'
        ];
        
        foreach ($requiredFiles as $file) {
            if (file_exists($file)) {
                echo "<div class='success'>✅ {$file} - EXISTS</div>";
            } else {
                echo "<div class='error'>❌ {$file} - MISSING</div>";
            }
        }
        ?>
    </div>
    
    <div class="section">
        <h2>🔧 PHP Configuration</h2>
        <div>PHP Version: <?php echo PHP_VERSION; ?></div>
        <div>Error Reporting: <?php echo error_reporting() ? 'ON' : 'OFF'; ?></div>
        <div>Display Errors: <?php echo ini_get('display_errors') ? 'ON' : 'OFF'; ?></div>
        
        <h3>Required Extensions:</h3>
        <?php
        $extensions = ['pdo', 'pdo_mysql', 'json', 'curl'];
        foreach ($extensions as $ext) {
            if (extension_loaded($ext)) {
                echo "<div class='success'>✅ {$ext}</div>";
            } else {
                echo "<div class='error'>❌ {$ext} - MISSING</div>";
            }
        }
        ?>
    </div>
    
    <div class="section">
        <h2>🌐 Test Clusters API</h2>
        <?php
        echo "<h3>Testing GET /api/clusters.php</h3>";
        
        $url = 'http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . '/api/clusters.php';
        echo "<div>URL: {$url}</div>";
        
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 5,
                'ignore_errors' => true
            ]
        ]);
        
        $response = @file_get_contents($url, false, $context);
        $httpCode = 200;
        
        if (isset($http_response_header)) {
            $statusLine = $http_response_header[0];
            preg_match('/HTTP\/\d+\.\d+\s+(\d+)/', $statusLine, $matches);
            $httpCode = isset($matches[1]) ? intval($matches[1]) : 200;
        }
        
        if ($response === false) {
            echo "<div class='error'>❌ Failed to make request</div>";
            echo "<div class='error'>Error: " . error_get_last()['message'] . "</div>";
        } else {
            if ($httpCode === 200) {
                echo "<div class='success'>✅ HTTP {$httpCode}</div>";
            } else {
                echo "<div class='error'>❌ HTTP {$httpCode}</div>";
            }
            echo "<h4>Response:</h4>";
            echo "<pre>" . htmlspecialchars($response) . "</pre>";
            
            $json = json_decode($response, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                echo "<div class='success'>✅ Valid JSON</div>";
                echo "<h4>Parsed JSON:</h4>";
                echo "<pre>" . print_r($json, true) . "</pre>";
            } else {
                echo "<div class='error'>❌ Invalid JSON: " . json_last_error_msg() . "</div>";
            }
        }
        ?>
    </div>
    
    <div class="section">
        <h2>🔌 Test Cluster Connection API</h2>
        <?php
        echo "<h3>Testing POST /api/cluster-connection.php</h3>";
        
        $url = 'http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . '/api/cluster-connection.php';
        echo "<div>URL: {$url}</div>";
        
        $postData = http_build_query([
            'action' => 'connect',
            'cluster_id' => '1',
            'login_callsign' => 'TEST'
        ]);
        
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => 'Content-Type: application/x-www-form-urlencoded',
                'content' => $postData,
                'timeout' => 5,
                'ignore_errors' => true
            ]
        ]);
        
        $response = @file_get_contents($url, false, $context);
        $httpCode = 200;
        
        if (isset($http_response_header)) {
            $statusLine = $http_response_header[0];
            preg_match('/HTTP\/\d+\.\d+\s+(\d+)/', $statusLine, $matches);
            $httpCode = isset($matches[1]) ? intval($matches[1]) : 200;
        }
        
        if ($response === false) {
            echo "<div class='error'>❌ Failed to make request</div>";
            echo "<div class='error'>Error: " . error_get_last()['message'] . "</div>";
        } else {
            if ($httpCode === 200) {
                echo "<div class='success'>✅ HTTP {$httpCode}</div>";
            } else {
                echo "<div class='error'>❌ HTTP {$httpCode}</div>";
            }
            echo "<h4>Response:</h4>";
            echo "<pre>" . htmlspecialchars($response) . "</pre>";
            
            if (!empty($response)) {
                $json = json_decode($response, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    echo "<div class='success'>✅ Valid JSON</div>";
                    echo "<h4>Parsed JSON:</h4>";
                    echo "<pre>" . print_r($json, true) . "</pre>";
                } else {
                    echo "<div class='error'>❌ Invalid JSON: " . json_last_error_msg() . "</div>";
                }
            } else {
                echo "<div class='error'>❌ Empty response</div>";
            }
        }
        ?>
    </div>
    
    <div class="section">
        <h2>📋 Environment Check</h2>
        <?php
        if (file_exists('.env')) {
            echo "<div class='success'>✅ .env file exists</div>";
            
            $envContent = file_get_contents('.env');
            $lines = explode("\n", $envContent);
            $envVars = [];
            
            foreach ($lines as $line) {
                $line = trim($line);
                if (!empty($line) && strpos($line, '=') !== false) {
                    list($key, $value) = explode('=', $line, 2);
                    $envVars[trim($key)] = trim($value);
                }
            }
            
            $requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'];
            foreach ($requiredEnvVars as $var) {
                if (isset($envVars[$var]) && !empty($envVars[$var])) {
                    echo "<div class='success'>✅ {$var} - SET</div>";
                } else {
                    echo "<div class='error'>❌ {$var} - NOT SET</div>";
                }
            }
        } else {
            echo "<div class='error'>❌ .env file missing</div>";
        }
        ?>
    </div>
    
    <div class="section">
        <h2>🗄️ Database Connection Test</h2>
        <?php
        try {
            if (file_exists('.env')) {
                $envContent = file_get_contents('.env');
                $lines = explode("\n", $envContent);
                $env = [];
                
                foreach ($lines as $line) {
                    $line = trim($line);
                    if (!empty($line) && strpos($line, '=') !== false) {
                        list($key, $value) = explode('=', $line, 2);
                        $env[trim($key)] = trim($value);
                    }
                }
                
                if (isset($env['DB_HOST']) && isset($env['DB_NAME']) && isset($env['DB_USER']) && isset($env['DB_PASS'])) {
                    $dsn = "mysql:host={$env['DB_HOST']};dbname={$env['DB_NAME']};charset=utf8mb4";
                    $pdo = new PDO($dsn, $env['DB_USER'], $env['DB_PASS'], [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
                    ]);
                    
                    echo "<div class='success'>✅ Database connection successful</div>";
                    
                    // Check if tables exist
                    $tables = ['dx_clusters', 'dx_connections', 'dx_spots'];
                    foreach ($tables as $table) {
                        $stmt = $pdo->prepare("SHOW TABLES LIKE ?");
                        $stmt->execute([$table]);
                        if ($stmt->rowCount() > 0) {
                            echo "<div class='success'>✅ Table '{$table}' exists</div>";
                        } else {
                            echo "<div class='error'>❌ Table '{$table}' missing</div>";
                        }
                    }
                    
                } else {
                    echo "<div class='error'>❌ Missing database environment variables</div>";
                }
            } else {
                echo "<div class='error'>❌ .env file not found</div>";
            }
        } catch (Exception $e) {
            echo "<div class='error'>❌ Database connection failed: " . $e->getMessage() . "</div>";
        }
        ?>
    </div>
    
    <div class="section">
        <h2>🚀 Next Steps</h2>
        <div>
            <?php if (!file_exists('.env')): ?>
            <div class='error'>1. Run setup.php to create .env file and database</div>
            <?php endif; ?>
            
            <?php if (!file_exists('api/cluster-connection.php')): ?>
            <div class='error'>2. Create missing API files</div>
            <?php endif; ?>
            
            <div class='warning'>3. Check browser console for detailed API error messages</div>
            <div class='warning'>4. Enable PHP error logging to see server-side errors</div>
        </div>
    </div>
    
    <p><strong>Generated:</strong> <?php echo date('Y-m-d H:i:s'); ?></p>
</body>
</html>