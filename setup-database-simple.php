<?php
/**
 * Simple Database Setup Script - Compatible with older MySQL
 */

require_once 'config/config.php';

try {
    // Create database connection without specifying database name
    $dsn = "mysql:host=" . DB_HOST . ";charset=utf8";
    $pdo = new PDO($dsn, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "🔌 Connected to MySQL server successfully!\n";
    
    // Create database if it doesn't exist
    $pdo->exec("CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET utf8 COLLATE utf8_unicode_ci");
    echo "📦 Database '" . DB_NAME . "' created or already exists!\n";
    
    // Switch to the database
    $pdo->exec("USE " . DB_NAME);
    echo "✅ Switched to database '" . DB_NAME . "'\n";
    
    // Read and execute simple schema
    $schemaFile = __DIR__ . '/database/schema-simple.sql';
    if (!file_exists($schemaFile)) {
        throw new Exception("Schema file not found: $schemaFile");
    }
    
    $schema = file_get_contents($schemaFile);
    $statements = array_filter(array_map('trim', explode(';', $schema)));
    
    foreach ($statements as $statement) {
        if (!empty($statement)) {
            try {
                $pdo->exec($statement);
            } catch (PDOException $e) {
                // Skip errors for indexes that already exist or duplicate inserts
                if (strpos($e->getMessage(), 'already exists') !== false || 
                    strpos($e->getMessage(), 'Duplicate entry') !== false ||
                    strpos($e->getMessage(), 'Multiple primary key') !== false) {
                    continue;
                }
                throw $e;
            }
        }
    }
    
    echo "🏗️  Database schema created successfully!\n";
    
    // Verify tables were created
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    echo "📋 Created tables: " . implode(', ', $tables) . "\n";
    
    // Check sample data
    $clustersCount = $pdo->query("SELECT COUNT(*) FROM dx_clusters")->fetchColumn();
    echo "📊 Default clusters inserted: $clustersCount\n";
    
    if ($clustersCount > 0) {
        $clusters = $pdo->query("SELECT name, host FROM dx_clusters LIMIT 3")->fetchAll();
        echo "📡 Sample clusters:\n";
        foreach ($clusters as $cluster) {
            echo "   • {$cluster['name']} ({$cluster['host']})\n";
        }
    }
    
    echo "\n✅ Database setup completed successfully!\n";
    echo "🌐 You can now run the DX Cluster Web application.\n";
    echo "🚀 Start server: php -S localhost:8000\n";
    echo "🔗 Open browser: http://localhost:8000\n";
    
} catch (PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
    echo "💡 Please check your database configuration in config/config.php\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ Setup error: " . $e->getMessage() . "\n";
    exit(1);
}
?>