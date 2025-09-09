<?php
/**
 * Database Connection Test Script
 * Run this to test your database connection
 */

require_once 'config/config.php';

echo "<h2>🧪 Database Connection Test</h2>\n";

// Test basic connection
try {
    $dsn = "mysql:host=" . DB_HOST . ";charset=" . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ <strong>Basic Connection:</strong> Success!<br>\n";
} catch (PDOException $e) {
    echo "❌ <strong>Basic Connection:</strong> Failed - " . $e->getMessage() . "<br>\n";
    echo "💡 <strong>Tip:</strong> Check your MySQL server is running and credentials are correct<br>\n";
    exit;
}

// Test database exists
try {
    $pdo->exec("USE " . DB_NAME);
    echo "✅ <strong>Database '" . DB_NAME . "':</strong> Exists and accessible<br>\n";
} catch (PDOException $e) {
    echo "⚠️ <strong>Database '" . DB_NAME . "':</strong> Not found<br>\n";
    echo "🔧 <strong>Solution:</strong> Run <code>php setup-database.php</code> to create it<br>\n";
    exit;
}

// Test tables exist
$requiredTables = ['users', 'user_preferences', 'dx_clusters', 'dx_spots'];
echo "<h3>📋 Table Status</h3>\n";

foreach ($requiredTables as $table) {
    try {
        $result = $pdo->query("SELECT 1 FROM $table LIMIT 1");
        echo "✅ <strong>$table:</strong> Exists<br>\n";
    } catch (PDOException $e) {
        echo "❌ <strong>$table:</strong> Missing<br>\n";
        $needsSetup = true;
    }
}

if (isset($needsSetup)) {
    echo "<br>🔧 <strong>Solution:</strong> Run <code>php setup-database.php</code> to create missing tables<br>\n";
}

// Test sample data in dx_clusters
try {
    $result = $pdo->query("SELECT COUNT(*) as count FROM dx_clusters");
    $count = $result->fetch()['count'];
    echo "<br>📊 <strong>DX Clusters:</strong> $count entries<br>\n";
    
    if ($count > 0) {
        $clusters = $pdo->query("SELECT name, host FROM dx_clusters WHERE is_active = 1 LIMIT 3")->fetchAll();
        echo "<strong>Sample clusters:</strong><br>\n";
        foreach ($clusters as $cluster) {
            echo "&nbsp;&nbsp;• {$cluster['name']} ({$cluster['host']})<br>\n";
        }
    }
} catch (PDOException $e) {
    echo "⚠️ <strong>DX Clusters:</strong> Could not query - " . $e->getMessage() . "<br>\n";
}

// Test API endpoints
echo "<h3>🌐 API Endpoint Test</h3>\n";
$apiEndpoints = [
    'auth.php?action=session' => 'Session Check',
    'preferences.php' => 'Preferences',
    'clusters.php' => 'Clusters'
];

foreach ($apiEndpoints as $endpoint => $name) {
    $url = $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . '/api/' . $endpoint;
    
    try {
        $context = stream_context_create(['http' => ['timeout' => 5]]);
        $response = @file_get_contents($url, false, $context);
        
        if ($response !== false) {
            $data = @json_decode($response, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                echo "✅ <strong>$name:</strong> Returns valid JSON<br>\n";
            } else {
                echo "⚠️ <strong>$name:</strong> Returns data but not JSON<br>\n";
            }
        } else {
            echo "❌ <strong>$name:</strong> No response<br>\n";
        }
    } catch (Exception $e) {
        echo "❌ <strong>$name:</strong> Error - " . $e->getMessage() . "<br>\n";
    }
}

echo "<br><h3>🚀 Next Steps</h3>\n";
echo "1. If you see any errors above, run <code>php setup-database.php</code><br>\n";
echo "2. Check your web server configuration for PHP and MySQL<br>\n";
echo "3. Ensure all files have proper permissions<br>\n";
echo "4. Open your DX Cluster Web application in the browser<br>\n";
?>