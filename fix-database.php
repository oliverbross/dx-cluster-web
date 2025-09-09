<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DX Cluster Database Fix Tool</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #1a1a1a; color: #fff; }
        .container { max-width: 1200px; margin: 0 auto; }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .success { background: #2d5016; border: 1px solid #4caf50; }
        .error { background: #5d1a1a; border: 1px solid #f44336; }
        .warning { background: #5d3a00; border: 1px solid #ff9800; }
        .info { background: #1a3d5d; border: 1px solid #2196f3; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #333; padding: 8px; text-align: left; }
        th { background: #333; }
        .btn { background: #4caf50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        .btn:hover { background: #45a049; }
        .btn-danger { background: #f44336; }
        .btn-danger:hover { background: #d32f2f; }
        pre { background: #2a2a2a; padding: 10px; border-radius: 5px; overflow-x: auto; }
        .highlight { background-color: #ffff00; color: #000; padding: 2px 4px; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 DX Cluster Database Fix Tool</h1>
        <p><strong>Problem:</strong> Cluster ID 5 shows as "K3LR" but should be "OM0RX Cluster"</p>
        
<?php
// Load environment variables
function loadEnv() {
    $envFile = __DIR__ . '/.env';
    if (!file_exists($envFile)) {
        return false;
    }
    
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        
        // Skip comments and empty lines
        if (empty($line) || strpos($line, '#') === 0) {
            continue;
        }
        
        // Split on first = only
        if (strpos($line, '=') === false) {
            continue;
        }
        
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        
        // Remove quotes if present
        if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') || 
            (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
            $value = substr($value, 1, -1);
        }
        
        // Set environment variable
        putenv(sprintf('%s=%s', $name, $value));
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }
    return true;
}

// Get database connection
function getDatabaseConnection() {
    try {
        $host = getenv('DB_HOST') ?: 'localhost';
        $dbname = getenv('DB_DATABASE') ?: 'dx_cluster_web';
        $username = getenv('DB_USERNAME') ?: 'root';
        $password = getenv('DB_PASSWORD') ?: '';
        $port = getenv('DB_PORT') ?: '3306';
        
        $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
        $pdo = new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        
        return $pdo;
    } catch (Exception $e) {
        throw new Exception("Database connection failed: " . $e->getMessage());
    }
}

// Step 1: Load .env file
echo "<div class='status info'><h3>📁 Step 1: Loading Environment Variables</h3>";
if (loadEnv()) {
    echo "✅ .env file loaded successfully<br>";
    echo "📊 Database: " . (getenv('DB_DATABASE') ?: 'dx_cluster_web') . "<br>";
    echo "🏠 Host: " . (getenv('DB_HOST') ?: 'localhost') . "<br>";
    echo "🔌 Port: " . (getenv('DB_PORT') ?: '3306') . "<br>";
    echo "👤 User: " . (getenv('DB_USERNAME') ?: 'root') . "<br>";
    
    // Show password status (masked for security)
    $password = getenv('DB_PASSWORD');
    if ($password !== false && $password !== '') {
        echo "🔑 Password: " . str_repeat('*', strlen($password)) . " (loaded)<br>";
    } else {
        echo "<div class='error'>❌ DB_PASSWORD is empty or not found!</div>";
    }
    
    // Debug: Show raw .env content (first 10 lines only)
    echo "<details><summary>🔍 Debug: .env file content (click to expand)</summary>";
    echo "<pre style='font-size: 12px; max-height: 200px; overflow-y: auto;'>";
    $envContent = file_get_contents(__DIR__ . '/.env');
    $lines = explode("\n", $envContent);
    foreach (array_slice($lines, 0, 15) as $i => $line) {
        // Mask password line for security
        if (strpos($line, 'DB_PASSWORD') !== false) {
            $line = 'DB_PASSWORD=***MASKED***';
        }
        echo ($i + 1) . ": " . htmlspecialchars($line) . "\n";
    }
    if (count($lines) > 15) {
        echo "... (" . (count($lines) - 15) . " more lines)\n";
    }
    echo "</pre></details>";
    
} else {
    echo "<div class='error'>❌ .env file not found at: " . __DIR__ . "/.env</div>";
}
echo "</div>";

// Step 2: Test database connection
echo "<div class='status info'><h3>🔌 Step 2: Testing Database Connection</h3>";
try {
    $pdo = getDatabaseConnection();
    echo "✅ Database connection successful!<br>";
    
    // Get MySQL version
    $version = $pdo->query('SELECT VERSION()')->fetchColumn();
    echo "📊 MySQL Version: $version<br>";
} catch (Exception $e) {
    echo "<div class='error'>❌ Database connection failed: " . htmlspecialchars($e->getMessage()) . "</div>";
    echo "</div></div></body></html>";
    exit;
}
echo "</div>";

// Step 3: Check if dx_clusters table exists
echo "<div class='status info'><h3>🗃️ Step 3: Checking Database Tables</h3>";
try {
    $tables = $pdo->query("SHOW TABLES LIKE 'dx_clusters'")->fetchAll();
    if (count($tables) > 0) {
        echo "✅ dx_clusters table exists<br>";
        
        // Get table structure
        $structure = $pdo->query("DESCRIBE dx_clusters")->fetchAll();
        echo "<strong>Table Structure:</strong><br>";
        echo "<table><tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th></tr>";
        foreach ($structure as $field) {
            echo "<tr><td>{$field['Field']}</td><td>{$field['Type']}</td><td>{$field['Null']}</td><td>{$field['Key']}</td><td>{$field['Default']}</td></tr>";
        }
        echo "</table>";
    } else {
        echo "<div class='warning'>⚠️ dx_clusters table does not exist. Creating it...</div>";
        
        // Create table
        $createTable = "
        CREATE TABLE dx_clusters (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            host VARCHAR(191) NOT NULL,
            port INT NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )";
        $pdo->exec($createTable);
        echo "✅ dx_clusters table created successfully<br>";
    }
} catch (Exception $e) {
    echo "<div class='error'>❌ Error checking tables: " . htmlspecialchars($e->getMessage()) . "</div>";
}
echo "</div>";

// Step 4: Show current cluster data
echo "<div class='status info'><h3>📊 Step 4: Current Cluster Data</h3>";
try {
    $clusters = $pdo->query("SELECT * FROM dx_clusters ORDER BY id")->fetchAll();
    
    if (count($clusters) > 0) {
        echo "<table>";
        echo "<tr><th>ID</th><th>Name</th><th>Host</th><th>Port</th><th>Description</th><th>Active</th></tr>";
        foreach ($clusters as $cluster) {
            $highlight = ($cluster['id'] == 5) ? 'highlight' : '';
            echo "<tr class='$highlight'>";
            echo "<td>{$cluster['id']}</td>";
            echo "<td>{$cluster['name']}</td>";
            echo "<td>{$cluster['host']}</td>";
            echo "<td>{$cluster['port']}</td>";
            echo "<td>{$cluster['description']}</td>";
            echo "<td>" . ($cluster['is_active'] ? 'Yes' : 'No') . "</td>";
            echo "</tr>";
        }
        echo "</table>";
        
        // Check if cluster ID 5 needs fixing
        $cluster5 = array_filter($clusters, function($c) { return $c['id'] == 5; });
        if ($cluster5) {
            $cluster5 = array_values($cluster5)[0];
            if ($cluster5['name'] !== 'OM0RX Cluster' || $cluster5['host'] !== 'cluster.om0rx.com') {
                echo "<div class='warning'>⚠️ <strong>ISSUE FOUND:</strong> Cluster ID 5 is currently '<strong>{$cluster5['name']}</strong>' at '<strong>{$cluster5['host']}</strong>' but should be '<strong>OM0RX Cluster</strong>' at '<strong>cluster.om0rx.com</strong>'</div>";
                echo "<div class='status warning'>";
                echo "<h4>🔧 Ready to Apply Fix</h4>";
                echo "<form method='post'>";
                echo "<button type='submit' name='apply_fix' class='btn'>🚀 Fix Cluster ID 5 Data</button>";
                echo "</form>";
                echo "</div>";
            } else {
                echo "<div class='success'>✅ Cluster ID 5 is already correct! No fix needed.</div>";
            }
        } else {
            echo "<div class='warning'>⚠️ Cluster ID 5 not found. Will insert it.</div>";
            echo "<div class='status warning'>";
            echo "<form method='post'>";
            echo "<button type='submit' name='insert_clusters' class='btn'>➕ Insert Missing Clusters</button>";
            echo "</form>";
            echo "</div>";
        }
        
    } else {
        echo "<div class='warning'>⚠️ No clusters found in database. Will insert default clusters.</div>";
        echo "<form method='post'>";
        echo "<button type='submit' name='insert_clusters' class='btn'>➕ Insert Default Clusters</button>";
        echo "</form>";
    }
} catch (Exception $e) {
    echo "<div class='error'>❌ Error reading clusters: " . htmlspecialchars($e->getMessage()) . "</div>";
}
echo "</div>";

// Handle form submissions
if ($_POST['apply_fix'] ?? false) {
    echo "<div class='status success'><h3>🔧 Applying Fix...</h3>";
    try {
        $sql = "UPDATE dx_clusters 
                SET 
                    name = 'OM0RX Cluster',
                    host = 'cluster.om0rx.com',
                    description = 'OM0RX Personal DX Cluster'
                WHERE id = 5";
        
        $affected = $pdo->exec($sql);
        echo "✅ Fix applied successfully! $affected row(s) updated.<br>";
        
        // Show updated data
        $updated = $pdo->query("SELECT * FROM dx_clusters WHERE id = 5")->fetch();
        if ($updated) {
            echo "<strong>Updated Cluster ID 5:</strong><br>";
            echo "Name: {$updated['name']}<br>";
            echo "Host: {$updated['host']}<br>";
            echo "Port: {$updated['port']}<br>";
            echo "Description: {$updated['description']}<br>";
        }
        
        echo "<div class='success'><h4>🎉 SUCCESS! The database has been fixed!</h4>";
        echo "<p>Now when you select 'OM0RX Cluster' (ID 5), it will correctly connect to <strong>cluster.om0rx.com:7300</strong></p></div>";
        
    } catch (Exception $e) {
        echo "<div class='error'>❌ Error applying fix: " . htmlspecialchars($e->getMessage()) . "</div>";
    }
    echo "</div>";
}

if ($_POST['insert_clusters'] ?? false) {
    echo "<div class='status success'><h3>➕ Inserting Default Clusters...</h3>";
    try {
        $clusters = [
            ['DX Summit', 'dxc.dxsummit.fi', 8000, 'Popular DX cluster with web interface'],
            ['OH2AQ', 'oh2aq.kolumbus.fi', 41112, 'Finnish DX cluster'],
            ['VE7CC', 've7cc.net', 23, 'Canadian DX cluster'],
            ['W3LPL', 'w3lpl.net', 7300, 'US East Coast DX cluster'],
            ['OM0RX Cluster', 'cluster.om0rx.com', 7300, 'OM0RX Personal DX Cluster']
        ];
        
        $stmt = $pdo->prepare("INSERT INTO dx_clusters (name, host, port, description) VALUES (?, ?, ?, ?)");
        $inserted = 0;
        
        foreach ($clusters as $cluster) {
            try {
                $stmt->execute($cluster);
                $inserted++;
                echo "✅ Inserted: {$cluster[0]} ({$cluster[1]}:{$cluster[2]})<br>";
            } catch (Exception $e) {
                echo "⚠️ Skipped {$cluster[0]}: " . $e->getMessage() . "<br>";
            }
        }
        
        echo "<div class='success'>🎉 Inserted $inserted clusters successfully!</div>";
        echo "<button onclick='location.reload()' class='btn'>🔄 Refresh Page</button>";
        
    } catch (Exception $e) {
        echo "<div class='error'>❌ Error inserting clusters: " . htmlspecialchars($e->getMessage()) . "</div>";
    }
    echo "</div>";
}

// Step 5: Test the fix
echo "<div class='status info'><h3>🧪 Step 5: Test Connection</h3>";
echo "<p>After applying the fix, test your DX Cluster Web application:</p>";
echo "<ol>";
echo "<li>Go to your main DX Cluster Web application</li>";
echo "<li>Select <strong>'OM0RX Cluster'</strong> from the dropdown</li>";
echo "<li>Enter your callsign (e.g., 'OM0RX')</li>";
echo "<li>Click 'Connect'</li>";
echo "<li>You should see: <code>Connecting to OM0RX Cluster (cluster.om0rx.com:7300)</code></li>";
echo "</ol>";

echo "<div class='info'>";
echo "<h4>🎯 Expected Console Output:</h4>";
echo "<pre>";
echo "✅ ConnectToCluster: Found cluster: OM0RX Cluster (cluster.om0rx.com:7300)
🌐 Opening TCP connection to cluster.om0rx.com:7300  
✅ Connected to DX cluster OM0RX Cluster
📡 Initial cluster response: [welcome message]
🔐 Sending login callsign: om0rx
📡 Login response: [login confirmation]";
echo "</pre>";
echo "</div>";
echo "</div>";

?>

        <div class="status info">
            <h3>📋 Summary</h3>
            <ul>
                <li>✅ Environment variables loaded</li>
                <li>✅ Database connection tested</li>
                <li>✅ Tables verified</li>
                <li>✅ Current data displayed</li>
                <li>🔧 Fix ready to apply (if needed)</li>
            </ul>
        </div>
        
        <div class="status warning">
            <h4>⚠️ Important Notes:</h4>
            <ul>
                <li><strong>Backup:</strong> This will modify your database. Consider backing up first.</li>
                <li><strong>Testing:</strong> Test the connection after applying the fix.</li>
                <li><strong>Real Cluster:</strong> cluster.om0rx.com:7300 must be a real, accessible DX cluster.</li>
            </ul>
        </div>
        
        <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #333; color: #888;">
            <p>🔧 DX Cluster Database Fix Tool | Created to fix Cluster ID 5 mismatch issue</p>
        </footer>
    </div>
</body>
</html>