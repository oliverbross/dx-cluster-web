#!/bin/bash

echo "🔄 Converting Current System to Use WebSocket"
echo "============================================"
echo

# Backup original files
echo "📋 Creating backups..."
cp index.html index.html.backup
cp assets/js/app-no-websocket.js assets/js/app-no-websocket.js.backup

# Create WebSocket version of the main app
cat > /tmp/app-websocket.js << 'EOF'
/**
 * DX Cluster Web Application - WebSocket Version
 * Real-time WebSocket connection using the bridge
 */

class DXClusterApp {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.connectionId = null;
        this.preferences = this.loadPreferences();
        this.clusters = [
            {
                id: 1,
                name: 'OM0RX Cluster',
                host: 'cluster.om0rx.com',
                port: 7300
            }
        ];
        this.init();
    }
    
    init() {
        console.log('🌐 DX Cluster Web App - WebSocket Version');
        this.setupEventListeners();
        this.populateClusterSelect();
        this.updateConnectionStatus('disconnected');
    }
    
    setupEventListeners() {
        // Connect button
        const connectBtn = document.getElementById('connect-btn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                const clusterSelect = document.getElementById('cluster-select');
                const loginCallsign = document.getElementById('login-callsign')?.value?.trim();
                
                if (!clusterSelect.value || !loginCallsign) {
                    this.showNotification('Please select cluster and enter callsign', 'error');
                    return;
                }
                
                const clusterId = parseInt(clusterSelect.value);
                const cluster = this.clusters.find(c => c.id === clusterId);
                this.connectToCluster(cluster, loginCallsign);
            });
        }
        
        // Disconnect button
        const disconnectBtn = document.getElementById('disconnect-btn');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => {
                this.disconnectFromCluster();
            });
        }
        
        // Terminal input
        const terminalInput = document.getElementById('terminal-input');
        if (terminalInput) {
            terminalInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const command = e.target.value.trim();
                    if (command) {
                        this.sendCommand(command);
                        e.target.value = '';
                    }
                }
            });
        }
    }
    
    populateClusterSelect() {
        const select = document.getElementById('cluster-select');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select a DX Cluster...</option>';
        
        this.clusters.forEach(cluster => {
            const option = document.createElement('option');
            option.value = cluster.id;
            option.textContent = `${cluster.name} (${cluster.host}:${cluster.port})`;
            select.appendChild(option);
        });
    }
    
    connectToCluster(cluster, loginCallsign) {
        if (this.isConnected) {
            this.showNotification('Already connected', 'warning');
            return;
        }
        
        this.updateConnectionStatus('connecting');
        this.addTerminalLine(`🔗 Connecting to ${cluster.name}...`, 'sys');
        
        // Use WebSocket bridge
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsPort = protocol === 'wss:' ? '8443' : '8080';
        const wsHost = window.location.hostname;
        
        const url = `${protocol}//${wsHost}:${wsPort}/?host=${encodeURIComponent(cluster.host)}&port=${encodeURIComponent(cluster.port)}&login=${encodeURIComponent(loginCallsign)}`;
        
        console.log('📡 Connecting to WebSocket:', url);
        
        try {
            this.ws = new WebSocket(url);
            
            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');
                this.isConnected = true;
                this.connectionId = `ws_${Date.now()}`;
                this.updateConnectionStatus('connected');
                this.addTerminalLine(`✅ Connected to ${cluster.name}`, 'success');
                this.addTerminalLine('📡 Monitoring DX spots...', 'sys');
                
                // Update UI
                document.getElementById('connect-btn').disabled = true;
                document.getElementById('disconnect-btn').disabled = false;
                document.getElementById('terminal-input').disabled = false;
                
                this.showNotification(`Connected to ${cluster.name}`, 'success');
            };
            
            this.ws.onmessage = (event) => {
                const message = event.data;
                console.log('📥 Received:', message);
                
                // Add to terminal
                this.addTerminalLine(message, 'rx');
                
                // Parse DX spots
                if (message.includes('DX de ')) {
                    this.parseDXSpot(message);
                }
            };
            
            this.ws.onclose = (event) => {
                console.log('🔌 WebSocket closed:', event.code, event.reason);
                this.isConnected = false;
                this.updateConnectionStatus('disconnected');
                this.addTerminalLine('🔌 Connection closed', 'error');
                
                // Update UI
                document.getElementById('connect-btn').disabled = false;
                document.getElementById('disconnect-btn').disabled = true;
                document.getElementById('terminal-input').disabled = true;
                
                this.showNotification('Connection closed', 'info');
            };
            
            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                this.updateConnectionStatus('error');
                this.addTerminalLine('❌ Connection error', 'error');
                this.showNotification('Connection failed', 'error');
            };
            
        } catch (error) {
            console.error('❌ WebSocket creation failed:', error);
            this.updateConnectionStatus('error');
            this.addTerminalLine(`❌ Connection failed: ${error.message}`, 'error');
            this.showNotification('Connection failed', 'error');
        }
    }
    
    disconnectFromCluster() {
        if (this.ws) {
            this.ws.close();
        }
    }
    
    sendCommand(command) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.showNotification('Not connected to cluster', 'error');
            return;
        }
        
        console.log('📤 Sending:', command);
        this.ws.send(command);
        this.addTerminalLine(`> ${command}`, 'tx');
    }
    
    parseDXSpot(message) {
        // Parse DX spot format: "DX de SPOTTER: FREQ CALLSIGN COMMENT"
        const dxMatch = message.match(/DX de ([A-Z0-9\/]+):\s+([0-9.]+)\s+([A-Z0-9\/]+)\s*(.*)/);
        if (!dxMatch) return;
        
        const [, spotter, frequency, callsign, comment] = dxMatch;
        
        // Add to spots table/container
        this.displayDXSpot({
            time: new Date().toLocaleTimeString(),
            spotter: spotter,
            frequency: frequency,
            callsign: callsign,
            comment: comment.trim(),
            band: this.frequencyToBand(parseFloat(frequency)),
            mode: this.guessMode(comment)
        });
        
        // Update stats
        this.updateStats();
    }
    
    displayDXSpot(spot) {
        // Add to live spots container
        const spotsContainer = document.getElementById('spots-container');
        if (spotsContainer) {
            const spotElement = document.createElement('div');
            spotElement.className = 'dx-spot bg-gray-800 p-3 rounded border-l-4 border-blue-500';
            spotElement.innerHTML = `
                <div class="flex items-center justify-between mb-1">
                    <span class="font-mono text-lg font-bold text-yellow-400">${spot.callsign}</span>
                    <span class="text-sm text-gray-400">${spot.time}</span>
                </div>
                <div class="flex items-center gap-4 text-sm">
                    <span class="text-green-400 font-mono">${parseFloat(spot.frequency).toFixed(1)} kHz</span>
                    <span class="px-2 py-1 bg-blue-600 text-white rounded text-xs">${spot.band}</span>
                    <span class="text-gray-300">by ${spot.spotter}</span>
                </div>
                ${spot.comment ? `<div class="text-gray-400 text-sm mt-1">${spot.comment}</div>` : ''}
            `;
            
            // Insert at top
            spotsContainer.insertBefore(spotElement, spotsContainer.firstChild);
            
            // Remove old spots (keep last 50)
            while (spotsContainer.children.length > 50) {
                spotsContainer.removeChild(spotsContainer.lastChild);
            }
        }
    }
    
    frequencyToBand(freq) {
        if (freq >= 1800 && freq <= 2000) return '160m';
        if (freq >= 3500 && freq <= 4000) return '80m';
        if (freq >= 7000 && freq <= 7300) return '40m';
        if (freq >= 14000 && freq <= 14350) return '20m';
        if (freq >= 18068 && freq <= 18168) return '17m';
        if (freq >= 21000 && freq <= 21450) return '15m';
        if (freq >= 24890 && freq <= 24990) return '12m';
        if (freq >= 28000 && freq <= 29700) return '10m';
        if (freq >= 50000 && freq <= 54000) return '6m';
        return 'Unknown';
    }
    
    guessMode(comment) {
        const c = comment.toLowerCase();
        if (c.includes('cw') || c.includes('morse')) return 'CW';
        if (c.includes('ft8')) return 'FT8';
        if (c.includes('ft4')) return 'FT4';
        if (c.includes('rtty')) return 'RTTY';
        if (c.includes('psk')) return 'PSK31';
        return 'SSB';
    }
    
    updateStats() {
        // Update spot counter
        const totalSpots = document.getElementById('total-spots');
        if (totalSpots) {
            const current = parseInt(totalSpots.textContent) || 0;
            totalSpots.textContent = current + 1;
        }
    }
    
    updateConnectionStatus(status) {
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            statusEl.className = `status-indicator status-${status}`;
            const statusText = {
                'disconnected': 'Disconnected',
                'connecting': 'Connecting...',
                'connected': 'Connected',
                'error': 'Error'
            };
            statusEl.querySelector('span').textContent = statusText[status] || status;
        }
    }
    
    addTerminalLine(text, type = 'rx') {
        const terminal = document.getElementById('terminal-output');
        if (!terminal) return;
        
        const line = document.createElement('div');
        line.className = `terminal-line ${type}`;
        line.textContent = text;
        
        terminal.appendChild(line);
        terminal.scrollTop = terminal.scrollHeight;
        
        // Keep last 1000 lines
        while (terminal.children.length > 1000) {
            terminal.removeChild(terminal.firstChild);
        }
    }
    
    showNotification(message, type) {
        console.log(`${type.toUpperCase()}: ${message}`);
        // Could add toast notifications here
    }
    
    loadPreferences() {
        return {
            autoConnect: false,
            defaultCluster: null
        };
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dxApp = new DXClusterApp();
});
EOF

echo "✅ Created WebSocket version of app"

# Replace the script reference in index.html
echo "🔄 Updating index.html to use WebSocket..."

# Replace the no-websocket script with websocket version
sed -i 's/app-no-websocket\.js/app-websocket.js/g' index.html
sed -i 's/no-websocket-additions\.css/websocket-additions.css/g' index.html

# Copy the new script
cp /tmp/app-websocket.js assets/js/app-websocket.js
chmod 644 assets/js/app-websocket.js

echo "✅ Updated index.html to use WebSocket"
echo "✅ Created assets/js/app-websocket.js"

echo
echo "🎉 Conversion complete!"
echo
echo "📋 Changes made:"
echo "  ✅ Backed up original files"
echo "  ✅ Created WebSocket version of the app"
echo "  ✅ Updated index.html to use WebSocket"
echo
echo "🧪 Test now:"
echo "  https://cluster.wavelog.online/"
echo "  (Will now use WebSocket bridge on port 8443)"
echo
echo "🔧 To revert:"
echo "  cp index.html.backup index.html"
echo "  cp assets/js/app-no-websocket.js.backup assets/js/app-no-websocket.js"