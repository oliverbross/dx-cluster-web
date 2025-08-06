@echo off
echo Starting DX Cluster Web Application Development Server...
echo.
echo Open your browser to: http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
cd /d "%~dp0"
php -S localhost:8000 server/dev-server.php
pause