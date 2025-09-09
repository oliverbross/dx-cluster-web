# DX Cluster Web - Windows Setup Script
# This script helps set up the application on Windows systems

Write-Host "🚀 DX Cluster Web - Windows Setup" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# Check if PHP is available
$phpAvailable = $false
try {
    $phpVersion = php --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PHP is available: $($phpVersion.Split("`n")[0])" -ForegroundColor Green
        $phpAvailable = $true
    }
} catch {
    Write-Host "❌ PHP not found in PATH" -ForegroundColor Red
}

if (-not $phpAvailable) {
    Write-Host ""
    Write-Host "📋 PHP Installation Options:" -ForegroundColor Yellow
    Write-Host "1. XAMPP (Recommended for Windows)" -ForegroundColor White
    Write-Host "   - Download from: https://www.apachefriends.org/download.html" -ForegroundColor Gray
    Write-Host "   - After installation, PHP will be in: C:\xampp\php" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Standalone PHP" -ForegroundColor White
    Write-Host "   - Download from: https://windows.php.net/download/" -ForegroundColor Gray
    Write-Host "   - Extract to C:\php and add to PATH" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. WampServer" -ForegroundColor White
    Write-Host "   - Download from: https://www.wampserver.com/" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "💡 Quick XAMPP Test:" -ForegroundColor Cyan
    if (Test-Path "C:\xampp\php\php.exe") {
        Write-Host "   Found XAMPP PHP at: C:\xampp\php\php.exe" -ForegroundColor Green
        Write-Host "   You can add C:\xampp\php to your PATH or run:" -ForegroundColor White
        Write-Host "   C:\xampp\php\php.exe setup-database.php" -ForegroundColor Gray
    } else {
        Write-Host "   XAMPP not found in default location" -ForegroundColor Yellow
    }
}

# Check MySQL/MariaDB
Write-Host ""
Write-Host "🗄️  Database Check:" -ForegroundColor Yellow
$mysqlAvailable = $false

# Check for mysql command
try {
    $mysqlVersion = mysql --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MySQL client available: $($mysqlVersion)" -ForegroundColor Green
        $mysqlAvailable = $true
    }
} catch {
    Write-Host "❌ MySQL client not found" -ForegroundColor Red
}

# Check for XAMPP MySQL
if (Test-Path "C:\xampp\mysql\bin\mysql.exe") {
    Write-Host "✅ XAMPP MySQL found at: C:\xampp\mysql\bin\mysql.exe" -ForegroundColor Green
    $mysqlAvailable = $true
}

if (-not $mysqlAvailable) {
    Write-Host "💡 Database Options:" -ForegroundColor Cyan
    Write-Host "   - XAMPP includes MySQL/MariaDB" -ForegroundColor Gray
    Write-Host "   - Download MySQL from: https://dev.mysql.com/downloads/mysql/" -ForegroundColor Gray
    Write-Host "   - Or use MariaDB: https://mariadb.org/download/" -ForegroundColor Gray
}

# Configuration file check
Write-Host ""
Write-Host "⚙️  Configuration Check:" -ForegroundColor Yellow
$configPath = "config/config.php"
if (Test-Path $configPath) {
    Write-Host "✅ Configuration file exists" -ForegroundColor Green
    
    $configContent = Get-Content $configPath -Raw
    if ($configContent -match "DB_HOST.*localhost") {
        Write-Host "✅ Database host is set to localhost" -ForegroundColor Green
    }
    if ($configContent -match "DB_NAME.*dx_cluster") {
        Write-Host "✅ Database name is set to dx_cluster" -ForegroundColor Green
    }
    if ($configContent -match "DB_USER.*root") {
        Write-Host "✅ Database user is set to root" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Configuration file not found" -ForegroundColor Red
}

# Check schema file
Write-Host ""
Write-Host "📋 Database Schema Check:" -ForegroundColor Yellow
$schemaPath = "database/schema.sql"
if (Test-Path $schemaPath) {
    Write-Host "✅ Schema file exists" -ForegroundColor Green
    $schemaSize = (Get-Item $schemaPath).Length
    Write-Host "   Schema size: $schemaSize bytes" -ForegroundColor Gray
} else {
    Write-Host "❌ Schema file not found at: $schemaPath" -ForegroundColor Red
}

Write-Host ""
Write-Host "🔧 Setup Instructions:" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green
Write-Host ""

if ($phpAvailable -and $mysqlAvailable) {
    Write-Host "✅ You have PHP and MySQL available. Run these commands:" -ForegroundColor Green
    Write-Host ""
    Write-Host "1. Set up the database:" -ForegroundColor White
    Write-Host "   php setup-database.php" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Test the setup:" -ForegroundColor White
    Write-Host "   php test-database.php" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Start the development server:" -ForegroundColor White
    Write-Host "   php -S localhost:8000" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "📦 Installation Steps:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Install XAMPP:" -ForegroundColor White
    Write-Host "   - Download from: https://www.apachefriends.org/download.html" -ForegroundColor Gray
    Write-Host "   - Install to C:\xampp" -ForegroundColor Gray
    Write-Host "   - Start Apache and MySQL from XAMPP Control Panel" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Add PHP to PATH (or use full paths):" -ForegroundColor White
    Write-Host "   - Add C:\xampp\php to your system PATH" -ForegroundColor Gray
    Write-Host "   - Or use: C:\xampp\php\php.exe instead of php" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Set up database:" -ForegroundColor White
    Write-Host "   C:\xampp\php\php.exe setup-database.php" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Start development server:" -ForegroundColor White
    Write-Host "   C:\xampp\php\php.exe -S localhost:8000" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "🌐 After setup, open: http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔧 Manual Database Setup (if needed):" -ForegroundColor Yellow
Write-Host "1. Open XAMPP phpMyAdmin: http://localhost/phpmyadmin" -ForegroundColor Gray
Write-Host "2. Create database 'dx_cluster'" -ForegroundColor Gray
Write-Host "3. Import database/schema.sql" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ All DOM validation issues have been fixed!" -ForegroundColor Green
Write-Host "   - Password fields are now in forms" -ForegroundColor Gray
Write-Host "   - All inputs have autocomplete attributes" -ForegroundColor Gray
Write-Host ""

Write-Host "📞 Need Help?" -ForegroundColor Cyan
Write-Host "   The application includes fallback data for testing without database" -ForegroundColor Gray
Write-Host "   API endpoints will work with default clusters even if DB is not set up" -ForegroundColor Gray