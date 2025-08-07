/**
 * DX Cluster Web Application - Main Application
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

class DXClusterApp {
    constructor() {
        this.isConnected = false;
        this.currentCluster = null;
        this.spots = new Map(); // Use Map for efficient lookups
        this.preferences = {};
        this.websocket = null;
        
        // Initialize the application
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('🚀 Initializing DX Cluster Web Application...');
        
        // Load user preferences
        await this.loadPreferences();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load DX clusters
        await this.loadClusters();
        
        // Apply theme
        this.applyTheme();
        
        // Initialize UI components
        this.initializeUI();
        
        console.log('✅ Application initialized successfully');
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.target.getAttribute('href').substring(1);
                this.showSection(target);
            });
        });

        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Cluster connection
        document.getElementById('connect-btn').addEventListener('click', () => {
            this.connectToCluster();
        });

        document.getElementById('disconnect-btn').addEventListener('click', () => {
            this.disconnectFromCluster();
        });

        // Terminal input
        const terminalInput = document.getElementById('terminal-input');
        terminalInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendCommand(e.target.value);
                e.target.value = '';
            }
        });

        // Macro buttons
        document.querySelectorAll('.macro-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const command = e.target.closest('.macro-btn').dataset.command;
                this.sendCommand(command);
            });
        });

        // Settings
        document.getElementById('save-preferences').addEventListener('click', () => {
            this.savePreferences();
        });

        document.getElementById('test-wavelog').addEventListener('click', () => {
            this.testWavelogConnection();
        });

        // Filters
        document.getElementById('band-filter').addEventListener('change', () => {
            this.filterSpots();
        });

        document.getElementById('mode-filter').addEventListener('change', () => {
            this.filterSpots();
        });

        document.getElementById('clear-spots').addEventListener('click', () => {
            this.clearSpots();
        });

        // Spot table interactions
        document.getElementById('spots-table').addEventListener('dblclick', (e) => {
            if (e.target.tagName === 'TD') {
                const row = e.target.closest('tr');
                this.handleSpotDoubleClick(row);
            }
        });
    }

    /**
     * Show a specific section
     */
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });

        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.style.display = 'block';
        }

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[href="#${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    /**
     * Load user preferences from localStorage and server
     */
    async loadPreferences() {
        try {
            // Load from localStorage first (for offline functionality)
            const localPrefs = localStorage.getItem('dx-cluster-preferences');
            if (localPrefs) {
                this.preferences = JSON.parse(localPrefs);
            }

            // Load from server if available
            const response = await fetch('api/preferences.php');
            if (response.ok) {
                const serverPrefs = await response.json();
                this.preferences = { ...this.preferences, ...serverPrefs };
            }
        } catch (error) {
            console.warn('Could not load preferences from server:', error);
        }

        // Apply default preferences if none exist
        if (Object.keys(this.preferences).length === 0) {
            this.preferences = {
                theme: 'dark',
                callsign: '',
                autoConnect: false,
                defaultCluster: null,
                wavelogUrl: '',
                wavelogApiKey: '',
                wavelogLogbookSlug: '',
                colors: {
                    newDxcc: '#ef4444',
                    newBand: '#22c55e',
                    newMode: '#3b82f6',
                    worked: '#f59e0b',
                    confirmed: '#6b7280'
                }
            };
        }

        this.updateUIFromPreferences();
    }

    /**
     * Update UI elements from preferences
     */
    updateUIFromPreferences() {
        // Update form fields
        document.getElementById('user-callsign-input').value = this.preferences.callsign || '';
        document.getElementById('theme-select').value = this.preferences.theme || 'dark';
        document.getElementById('auto-connect').checked = this.preferences.autoConnect || false;
        document.getElementById('wavelog-url').value = this.preferences.wavelogUrl || '';
        document.getElementById('wavelog-api-key').value = this.preferences.wavelogApiKey || '';
        document.getElementById('wavelog-logbook-slug').value = this.preferences.wavelogLogbookSlug || '';

        // Update color inputs
        if (this.preferences.colors) {
            document.getElementById('color-new-dxcc').value = this.preferences.colors.newDxcc;
            document.getElementById('color-new-band').value = this.preferences.colors.newBand;
            document.getElementById('color-new-mode').value = this.preferences.colors.newMode;
            document.getElementById('color-worked').value = this.preferences.colors.worked;
            document.getElementById('color-confirmed').value = this.preferences.colors.confirmed;
        }

        // Update user callsign display
        const userCallsignDisplay = document.getElementById('user-callsign');
        if (userCallsignDisplay) {
            // Use authenticated user callsign if available, otherwise from preferences
            if (window.authManager && window.authManager.isAuthenticated && window.authManager.user) {
                userCallsignDisplay.textContent = window.authManager.user.callsign;
            } else {
                userCallsignDisplay.textContent = this.preferences.callsign || 'Guest';
            }
        }
    }

    /**
     * Save preferences to localStorage and server
     */
    async savePreferences() {
        // Collect preferences from UI
        this.preferences.callsign = document.getElementById('user-callsign-input').value;
        this.preferences.theme = document.getElementById('theme-select').value;
        this.preferences.autoConnect = document.getElementById('auto-connect').checked;
        this.preferences.wavelogUrl = document.getElementById('wavelog-url').value;
        this.preferences.wavelogApiKey = document.getElementById('wavelog-api-key').value;
        this.preferences.wavelogLogbookSlug = document.getElementById('wavelog-logbook-slug').value;

        // Collect colors
        this.preferences.colors = {
            newDxcc: document.getElementById('color-new-dxcc').value,
            newBand: document.getElementById('color-new-band').value,
            newMode: document.getElementById('color-new-mode').value,
            worked: document.getElementById('color-worked').value,
            confirmed: document.getElementById('color-confirmed').value
        };

        // Save to localStorage
        localStorage.setItem('dx-cluster-preferences', JSON.stringify(this.preferences));

        // Save to server
        try {
            const response = await fetch('api/preferences.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.preferences)
            });

            if (response.ok) {
                this.showNotification('Preferences saved successfully', 'success');
            } else {
                throw new Error('Server save failed');
            }
        } catch (error) {
            console.warn('Could not save to server:', error);
            this.showNotification('Preferences saved locally only', 'warning');
        }

        // Apply changes
        this.applyTheme();
        this.updateUIFromPreferences();
    }

    /**
     * Apply the current theme
     */
    applyTheme() {
        const theme = this.preferences.theme || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        
        const themeIcon = document.querySelector('#theme-toggle i');
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    /**
     * Toggle between light and dark theme
     */
    toggleTheme() {
        this.preferences.theme = this.preferences.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme();
        this.savePreferences();
    }

    /**
     * Load available DX clusters
     */
    async loadClusters() {
        try {
            const response = await fetch('api/clusters.php');
            const clusters = await response.json();
            
            const select = document.getElementById('cluster-select');
            select.innerHTML = '<option value="">Select a cluster...</option>';
            
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
        } catch (error) {
            console.error('Failed to load clusters:', error);
            this.showNotification('Failed to load cluster list', 'error');
        }
    }

    /**
     * Connect to selected DX cluster
     */
    async connectToCluster() {
        const clusterSelect = document.getElementById('cluster-select');
        const clusterId = clusterSelect.value;
        
        if (!clusterId) {
            this.showNotification('Please select a cluster first', 'warning');
            return;
        }

        try {
            this.updateConnectionStatus('connecting');
            
            // Initialize WebSocket connection
            // Use server IP from config or default to current host
            // For production, we'll use 'ws' instead of 'wss' since the server isn't configured for SSL
            const protocol = 'ws'; // Always use ws for now since server doesn't support SSL
            const wsHost = window.location.hostname;
            const wsPort = 8080;
            const wsUrl = `${protocol}://${wsHost}:${wsPort}/?cluster=${clusterId}`;
            console.log('Connecting to WebSocket:', wsUrl);
            
            // Add debugging for connection issues
            console.log('Current page protocol:', window.location.protocol);
            console.log('Current page hostname:', window.location.hostname);
            console.log('WebSocket host will be:', wsHost);
            console.log('WebSocket port will be:', wsPort);
            
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = () => {
                this.isConnected = true;
                this.currentCluster = clusterId;
                this.updateConnectionStatus('connected');
                this.addTerminalLine('Connected to cluster successfully');
                
                // Enable terminal input
                document.getElementById('terminal-input').disabled = false;
                
                // Update buttons
                document.getElementById('connect-btn').disabled = true;
                document.getElementById('disconnect-btn').disabled = false;
            };
            
            this.websocket.onmessage = (event) => {
                this.handleClusterMessage(event.data);
            };
            
            this.websocket.onclose = () => {
                this.handleDisconnection();
            };
            
            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                console.error('WebSocket error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
                this.showNotification('Connection failed: ' + (error.message || 'Unknown error'), 'error');
                this.handleDisconnection();
            };
            
            // Add timeout for connection
            setTimeout(() => {
                if (this.websocket && this.websocket.readyState === WebSocket.CONNECTING) {
                    console.error('WebSocket connection timeout');
                    console.error('WebSocket readyState:', this.websocket.readyState);
                    console.error('WebSocket URL:', wsUrl);
                    this.showNotification('Connection timeout', 'error');
                    this.handleDisconnection();
                }
            }, 10000); // 10 second timeout
            
        } catch (error) {
            console.error('Connection error:', error);
            this.showNotification('Failed to connect to cluster', 'error');
            this.handleDisconnection();
        }
    }

    /**
     * Disconnect from current cluster
     */
    disconnectFromCluster() {
        if (this.websocket) {
            this.websocket.close();
        }
        this.handleDisconnection();
    }

    /**
     * Handle disconnection cleanup
     */
    handleDisconnection() {
        this.isConnected = false;
        this.currentCluster = null;
        this.websocket = null;
        
        this.updateConnectionStatus('disconnected');
        this.addTerminalLine('Disconnected from cluster');
        
        // Disable terminal input
        document.getElementById('terminal-input').disabled = true;
        
        // Update buttons
        document.getElementById('connect-btn').disabled = false;
        document.getElementById('disconnect-btn').disabled = true;
    }

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(status) {
        const indicator = document.getElementById('connection-status');
        const icon = indicator.querySelector('i');
        const text = indicator.querySelector('span');
        
        indicator.className = 'status-indicator';
        
        switch (status) {
            case 'connected':
                indicator.classList.add('status-connected');
                icon.className = 'fas fa-circle';
                text.textContent = 'Connected';
                break;
            case 'connecting':
                indicator.classList.add('status-connecting');
                icon.className = 'fas fa-spinner fa-spin';
                text.textContent = 'Connecting...';
                break;
            case 'disconnected':
            default:
                indicator.classList.add('status-disconnected');
                icon.className = 'fas fa-circle';
                text.textContent = 'Disconnected';
                break;
        }
    }

    /**
     * Initialize UI components
     */
    initializeUI() {
        // Show dashboard by default
        this.showSection('dashboard');
        
        // Initialize stats
        this.updateStats();
        
        // Setup periodic updates
        setInterval(() => {
            this.updateStats();
            this.cleanOldSpots();
        }, 30000); // Update every 30 seconds
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} fade-in`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Position notification
        const notifications = document.querySelectorAll('.notification');
        notification.style.position = 'fixed';
        notification.style.top = `${20 + (notifications.length - 1) * 60}px`;
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
        
        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    /**
     * Get notification icon based on type
     */
    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * Update dashboard statistics
     */
    updateStats() {
        const totalSpots = this.spots.size;
        const newDxccCount = Array.from(this.spots.values()).filter(spot => spot.status === 'new-dxcc').length;
        const newBandCount = Array.from(this.spots.values()).filter(spot => spot.status === 'new-band').length;
        const newModeCount = Array.from(this.spots.values()).filter(spot => spot.status === 'new-mode').length;
        
        document.getElementById('total-spots').textContent = totalSpots;
        document.getElementById('new-dxcc-count').textContent = newDxccCount;
        document.getElementById('new-band-count').textContent = newBandCount;
        document.getElementById('new-mode-count').textContent = newModeCount;
    }

    /**
     * Clean old spots (older than 2 hours)
     */
    cleanOldSpots() {
        const cutoffTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
        
        for (const [key, spot] of this.spots.entries()) {
            if (spot.timestamp < cutoffTime) {
                this.spots.delete(key);
            }
        }
        
        this.refreshSpotsTable();
        this.updateStats();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dxApp = new DXClusterApp();
});

// Add notification styles
const notificationStyles = `
<style>
.notification {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    padding: var(--space-4);
    box-shadow: var(--shadow-lg);
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 300px;
    max-width: 400px;
}

.notification-success {
    border-left: 4px solid var(--success);
}

.notification-error {
    border-left: 4px solid var(--error);
}

.notification-warning {
    border-left: 4px solid var(--warning);
}

.notification-info {
    border-left: 4px solid var(--info);
}

.notification-close {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    margin-left: auto;
    padding: var(--space-1);
}

.notification-close:hover {
    color: var(--text-primary);
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', notificationStyles);