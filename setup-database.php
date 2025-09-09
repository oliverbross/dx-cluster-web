<?php
/**
 * Database Setup Script
 * Run this script to create the database and tables
 */

require_once 'config/config.php';

try {
    // Create database connection without specifying database name
    $dsn = "mysql:host=" . DB_HOST . ";charset=" . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "🔌 Connected to MySQL server successfully!\n";
    
    // Create database if it doesn't exist
    $pdo->exec("CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET " . DB_CHARSET . " COLLATE utf8mb4_unicode_ci");
    echo "📦 Database '" . DB_NAME . "' created or already exists!\n";
    
    // Switch to the database
    $pdo->exec("USE " . DB_NAME);
    echo "✅ Switched to database '" . DB_NAME . "'\n";
    
    // Read and execute schema
    $schemaFile = __DIR__ . '/database/schema.sql';
    if (!file_exists($schemaFile)) {
        throw new Exception("Schema file not found: $schemaFile");
    }
    
    $schema = file_get_contents($schemaFile);
    $statements = explode(';', $schema);
    
    foreach ($statements as $statement) {
        $statement = trim($statement);
        if (!empty($statement)) {
            $pdo->exec($statement);
        }
    }
    
    echo "🏗️  Database schema created successfully!\n";
    
    // Verify tables were created
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    echo "📋 Created tables: " . implode(', ', $tables) . "\n";
    
    echo "\n✅ Database setup completed successfully!\n";
    echo "🌐 You can now run the DX Cluster Web application.\n";
    
} catch (PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
    echo "💡 Please check your database configuration in config/config.php\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ Setup error: " . $e->getMessage() . "\n";
    exit(1);
}
?>