@echo off
echo 🚀 Starting DX Cluster WebSocket Bridge...
echo.
echo Installing dependencies...
call npm install
echo.
echo Starting bridge server...
echo Bridge will be available at ws://localhost:8080
echo.
node websocket-bridge.js
pause