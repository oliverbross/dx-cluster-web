/**
 * DX Cluster Web Application - No WebSocket Version
 * Simple polling-based approach that works on any hosting
 */

class DXClusterApp {
    constructor() {
        this.connectionId = null;
        this.isConnected = false;
        this.currentCluster = null;
        this.lastUpdate = 0;
        this.pollInterval = null;
        this.pollFrequency = 3000; // Poll every 3 seconds
        
        this.preferences = this.loadPreferences();
        this.init();
    }
    
    init() {
        console.log('🌐 DX Cluster Web App - No WebSocket Version');
        this.setupEventListeners();
        this.loadClusters();
        this.updateConnectionStatus('disconnected');
        
        // Auto-connect if enabled
        if (this.preferences.autoConnect && this.preferences.defaultCluster) {
            setTimeout(() => {
                this.connectToCluster(this.preferences.defaultCluster);
            }, 1000);
        }
    }
    
    setupEventListeners() {
        // Connect button
        const connectBtn = document.getElementById('connect-btn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                const clusterSelect = document.getElementById('cluster-select');
                const loginCallsign = document.getElementById('login-callsign')?.value?.trim();
                
                if (!clusterSelect.value) {
                    this.showNotification('Please select a DX cluster', 'error');
                    return;
                }
                
                if (!loginCallsign) {
                    this.showNotification('Please enter your callsign', 'error');
                    return;
                }
                
                this.connectToCluster(parseInt(clusterSelect.value), loginCallsign);
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
        
        // Settings form
        const settingsForm = document.getElementById('settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings();
            });
        }
    }
    
    async loadClusters() {
        try {
            const response = await fetch('/api/clusters.php');
            const result = await response.json();
            
            if (result.success && result.clusters) {
                this.populateClusterSelect(result.clusters);
            } else {
                console.warn('Failed to load clusters, using fallback');
                this.populateClusterSelect(this.getFallbackClusters());
            }
        } catch (error) {
            console.error('Error loading clusters:', error);
            this.populateClusterSelect(this.getFallbackClusters());
        }
    }
    
    populateClusterSelect(clusters) {
        const select = document.getElementById('cluster-select');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select a DX Cluster...</option>';
        
        clusters.forEach(cluster => {
            const option = document.createElement('option');
            option.value = cluster.id;
            option.textContent = `${cluster.name} (${cluster.host}:${cluster.port})`;
            select.appendChild(option);
        });
        
        // Select default cluster if set
        if (this.preferences.defaultCluster) {
            select.value = this.preferences.defaultCluster;
        }
    }
    
    getFallbackClusters() {
        return [
            {id: 1, name: 'DX Summit', host: 'dxc.dxsummit.fi', port: 8000},
            {id: 2, name: 'OH2AQ', host: 'oh2aq.kolumbus.fi', port: 41112},
            {id: 3, name: 'VE7CC', host: 've7cc.net', port: 23},
            {id: 4, name: 'W3LPL', host: 'w3lpl.net', port: 7300},
            {id: 5, name: 'K3LR', host: 'k3lr.com', port: 7300}
        ];
    }
    
    async connectToCluster(clusterId, loginCallsign) {
        if (this.isConnected) {
            this.showNotification('Already connected to a cluster', 'warning');
            return;
        }
        
        try {
            this.updateConnectionStatus('connecting');
            this.addTerminalLine('🔌 Connecting to cluster...');
            
            const formData = new FormData();
            formData.append('action', 'connect');
            formData.append('cluster_id', clusterId);
            formData.append('login_callsign', loginCallsign || 'GUEST');
            
            const response = await fetch('/api/cluster-connection.php', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.connectionId = result.connection_id;
                this.isConnected = true;
                this.currentCluster = clusterId;
                this.lastUpdate = Math.floor(Date.now() / 1000);
                
                this.updateConnectionStatus('connected');
                this.addTerminalLine(`✅ Connected to ${result.cluster_name}`);
                this.addTerminalLine('📡 Monitoring DX spots...');
                
                // Start polling for updates
                this.startPolling();
                
                // Update UI
                const connectBtn = document.getElementById('connect-btn');
                const disconnectBtn = document.getElementById('disconnect-btn');
                const terminalInput = document.getElementById('terminal-input');
                
                if (connectBtn) connectBtn.disabled = true;
                if (disconnectBtn) disconnectBtn.disabled = false;
                if (terminalInput) terminalInput.disabled = false;
                
                this.showNotification(`Connected to ${result.cluster_name}`, 'success');
                
            } else {
                throw new Error(result.error || 'Connection failed');
            }
            
        } catch (error) {
            console.error('Connection error:', error);
            this.updateConnectionStatus('error');
            this.addTerminalLine(`❌ Connection failed: ${error.message}`);
            this.showNotification('Connection failed: ' + error.message, 'error');
        }
    }
    
    async disconnectFromCluster() {
        if (!this.isConnected) {
            return;
        }
        
        try {
            this.stopPolling();
            
            const formData = new FormData();
            formData.append('action', 'disconnect');
            formData.append('connection_id', this.connectionId || '');
            
            await fetch('/api/cluster-connection.php', {
                method: 'POST',
                body: formData
            });
            
            this.isConnected = false;
            this.connectionId = null;
            this.currentCluster = null;
            
            this.updateConnectionStatus('disconnected');
            this.addTerminalLine('🔌 Disconnected from cluster');
            
            // Update UI
            const connectBtn = document.getElementById('connect-btn');
            const disconnectBtn = document.getElementById('disconnect-btn');
            const terminalInput = document.getElementById('terminal-input');
            
            if (connectBtn) connectBtn.disabled = false;
            if (disconnectBtn) disconnectBtn.disabled = true;
            if (terminalInput) terminalInput.disabled = true;
            
            this.showNotification('Disconnected from cluster', 'info');
            
        } catch (error) {
            console.error('Disconnect error:', error);
        }
    }
    
    startPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        
        this.pollInterval = setInterval(() => {
            this.pollForUpdates();
        }, this.pollFrequency);
        
        // Initial poll
        this.pollForUpdates();
    }
    
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
    
    async pollForUpdates() {
        if (!this.isConnected) return;
        
        try {
            const response = await fetch(
                `/api/cluster-connection.php?action=poll&connection_id=${this.connectionId}&last_update=${this.lastUpdate}`
            );
            
            const result = await response.json();
            
            if (result.success) {
                if (result.has_updates && result.spots) {
                    result.spots.forEach(spot => {
                        this.displayDXSpot(spot);
                    });
                    
                    this.lastUpdate = result.timestamp;
                }
                
                // Update connection status if needed
                if (result.status && result.status.connected) {
                    this.updateConnectionStatus('connected');
                }
            }
            
        } catch (error) {
            console.error('Polling error:', error);
            // Don't show notifications for polling errors to avoid spam
        }
    }
    
    displayDXSpot(spot) {
        const spotsContainer = document.getElementById('spots-container');
        if (!spotsContainer) return;
        
        const spotElement = document.createElement('div');
        spotElement.className = 'dx-spot';
        spotElement.innerHTML = `
            <div class="spot-callsign">${spot.callsign}</div>
            <div class="spot-frequency">${parseFloat(spot.frequency).toFixed(3)}</div>
            <div class="spot-spotter">by ${spot.spotter}</div>
            <div class="spot-time">${new Date(spot.time_spotted).toLocaleTimeString()}</div>
            <div class="spot-comment">${spot.comment || ''}</div>
        `;
        
        // Add to terminal as well
        const freq = parseFloat(spot.frequency).toFixed(3);
        const time = new Date(spot.time_spotted).toLocaleTimeString();
        this.addTerminalLine(`📡 ${spot.callsign} ${freq} ${spot.spotter} ${time} ${spot.comment || ''}`);
        
        spotsContainer.insertBefore(spotElement, spotsContainer.firstChild);
        
        // Keep only last 100 spots
        while (spotsContainer.children.length > 100) {
            spotsContainer.removeChild(spotsContainer.lastChild);
        }
    }
    
    async sendCommand(command) {
        if (!this.isConnected) {
            this.showNotification('Not connected to a cluster', 'error');
            return;
        }
        
        try {
            this.addTerminalLine(`> ${command}`);
            
            const formData = new FormData();
            formData.append('action', 'send');
            formData.append('connection_id', this.connectionId);
            formData.append('command', command);
            
            const response = await fetch('/api/cluster-connection.php', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success && result.response) {
                this.addTerminalLine(result.response);
            } else {
                this.addTerminalLine('Command sent');
            }
            
        } catch (error) {
            console.error('Send command error:', error);
            this.addTerminalLine(`Error: ${error.message}`);
        }
    }
    
    addTerminalLine(text) {
        const terminal = document.getElementById('terminal-output');
        if (!terminal) return;
        
        const line = document.createElement('div');
        line.className = 'terminal-line';
        line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
        
        terminal.appendChild(line);
        terminal.scrollTop = terminal.scrollHeight;
        
        // Keep only last 200 lines
        while (terminal.children.length > 200) {
            terminal.removeChild(terminal.firstChild);
        }
    }
    
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        if (!statusElement) return;
        
        const statusTexts = {
            'disconnected': '⚫ Disconnected',
            'connecting': '🟡 Connecting...',
            'connected': '🟢 Connected',
            'error': '🔴 Error'
        };
        
        statusElement.textContent = statusTexts[status] || status;
        statusElement.className = `status ${status}`;
    }
    
    showNotification(message, type = 'info') {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
    
    loadPreferences() {
        try {
            const saved = localStorage.getItem('dxClusterPreferences');
            return saved ? JSON.parse(saved) : {
                autoConnect: false,
                defaultCluster: null,
                theme: 'dark'
            };
        } catch (error) {
            console.error('Error loading preferences:', error);
            return {
                autoConnect: false,
                defaultCluster: null,
                theme: 'dark'
            };
        }
    }
    
    savePreferences() {
        try {
            localStorage.setItem('dxClusterPreferences', JSON.stringify(this.preferences));
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }
    
    saveSettings() {
        const form = document.getElementById('settings-form');
        if (!form) return;
        
        const formData = new FormData(form);
        
        // Update preferences
        this.preferences.autoConnect = formData.get('auto_connect') === 'on';
        this.preferences.defaultCluster = formData.get('default_cluster') || null;
        this.preferences.theme = formData.get('theme') || 'dark';
        
        this.savePreferences();
        this.showNotification('Settings saved', 'success');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dxClusterApp = new DXClusterApp();
});