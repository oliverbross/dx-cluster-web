/**
 * Mock API for Development - Client-side API simulation
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

class MockAPI {
    constructor() {
        this.mockData = {
            clusters: [
                {
                    id: 1,
                    name: 'DX Summit',
                    host: 'dxc.dxsummit.fi',
                    port: 8000,
                    description: 'Popular DX cluster with web interface',
                    is_active: 1
                },
                {
                    id: 2,
                    name: 'OH2AQ',
                    host: 'oh2aq.kolumbus.fi',
                    port: 41112,
                    description: 'Finnish DX cluster',
                    is_active: 1
                },
                {
                    id: 3,
                    name: 'VE7CC',
                    host: 've7cc.net',
                    port: 23,
                    description: 'Canadian DX cluster',
                    is_active: 1
                },
                {
                    id: 4,
                    name: 'W3LPL',
                    host: 'w3lpl.net',
                    port: 7300,
                    description: 'US East Coast DX cluster',
                    is_active: 1
                },
                {
                    id: 5,
                    name: 'K3LR',
                    host: 'k3lr.com',
                    port: 7300,
                    description: 'US East Coast DX cluster',
                    is_active: 1
                }
            ],
            preferences: {
                theme: 'dark',
                callsign: 'DX-WEB',
                autoConnect: false,
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
            },
            spots: [
                {
                    callsign: 'JA1ABC',
                    frequency: 14205.0,
                    spotter: 'W1AW',
                    comment: 'CQ DX',
                    time: '1234Z',
                    band: '20m',
                    mode: 'CW',
                    status: 'new-dxcc'
                },
                {
                    callsign: 'VK2DEF',
                    frequency: 21025.0,
                    spotter: 'VE3XYZ',
                    comment: 'QRT 5 min',
                    time: '1235Z',
                    band: '15m',
                    mode: 'SSB',
                    status: 'new-band'
                },
                {
                    callsign: 'ZL3GHI',
                    frequency: 28074.0,
                    spotter: 'K1ABC',
                    comment: 'FT8 strong',
                    time: '1236Z',
                    band: '10m',
                    mode: 'FT8',
                    status: 'new-mode'
                }
            ]
        };
        
        // Load saved preferences from localStorage
        const savedPrefs = localStorage.getItem('dx-cluster-preferences');
        if (savedPrefs) {
            try {
                this.mockData.preferences = { ...this.mockData.preferences, ...JSON.parse(savedPrefs) };
            } catch (e) {
                console.warn('Failed to load saved preferences:', e);
            }
        }
    }
    
    /**
     * Simulate fetch API calls
     */
    async fetch(url, options = {}) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        
        const method = options.method || 'GET';
        const urlPath = url.replace(/^.*\/?api\//, '').replace(/\.php$/, '');
        
        console.log(`🔧 Mock API: ${method} /api/${urlPath}`);
        
        switch (urlPath) {
            case 'clusters':
                return this.handleClusters(method, options);
            case 'preferences':
                return this.handlePreferences(method, options);
            default:
                throw new Error(`Mock API endpoint not found: ${urlPath}`);
        }
    }
    
    /**
     * Handle clusters API
     */
    async handleClusters(method, options) {
        if (method === 'GET') {
            return {
                ok: true,
                json: async () => this.mockData.clusters
            };
        }
        
        throw new Error('Method not allowed');
    }
    
    /**
     * Handle preferences API
     */
    async handlePreferences(method, options) {
        if (method === 'GET') {
            return {
                ok: true,
                json: async () => this.mockData.preferences
            };
        }
        
        if (method === 'POST') {
            try {
                const body = JSON.parse(options.body);
                this.mockData.preferences = { ...this.mockData.preferences, ...body };
                
                // Save to localStorage
                localStorage.setItem('dx-cluster-preferences', JSON.stringify(this.mockData.preferences));
                
                return {
                    ok: true,
                    json: async () => ({ success: true, message: 'Preferences saved' })
                };
            } catch (e) {
                return {
                    ok: false,
                    status: 400,
                    json: async () => ({ error: 'Invalid JSON data' })
                };
            }
        }
        
        throw new Error('Method not allowed');
    }
    
    /**
     * Simulate WebSocket connection for testing
     */
    createMockWebSocket(url) {
        return new MockWebSocket(url, this);
    }
    
    /**
     * Generate mock DX spots for testing
     */
    generateMockSpot() {
        const callsigns = ['JA1ABC', 'VK2DEF', 'ZL3GHI', 'G0XYZ', 'DL1ABC', 'F1DEF', 'I2GHI', 'EA3JKL'];
        const spotters = ['W1AW', 'VE3XYZ', 'K1ABC', 'N2DEF', 'W3GHI', 'K4JKL'];
        const comments = ['CQ DX', 'QRT 5 min', 'FT8 strong', 'CW QRS', 'Contest', 'POTA K-1234'];
        const bands = ['20m', '15m', '10m', '40m', '17m', '12m'];
        const modes = ['CW', 'SSB', 'FT8', 'FT4', 'RTTY'];
        const statuses = ['new-dxcc', 'new-band', 'new-mode', 'worked', 'confirmed'];
        
        const now = new Date();
        const timeStr = String(now.getUTCHours()).padStart(2, '0') + 
                       String(now.getUTCMinutes()).padStart(2, '0') + 'Z';
        
        return {
            callsign: callsigns[Math.floor(Math.random() * callsigns.length)],
            frequency: 14000 + Math.random() * 350,
            spotter: spotters[Math.floor(Math.random() * spotters.length)],
            comment: comments[Math.floor(Math.random() * comments.length)],
            time: timeStr,
            band: bands[Math.floor(Math.random() * bands.length)],
            mode: modes[Math.floor(Math.random() * modes.length)],
            status: statuses[Math.floor(Math.random() * statuses.length)]
        };
    }
}

/**
 * Mock WebSocket for testing
 */
class MockWebSocket {
    constructor(url, mockAPI) {
        this.url = url;
        this.mockAPI = mockAPI;
        this.readyState = WebSocket.CONNECTING;
        this.onopen = null;
        this.onmessage = null;
        this.onclose = null;
        this.onerror = null;
        
        // Simulate connection
        setTimeout(() => {
            this.readyState = WebSocket.OPEN;
            if (this.onopen) {
                this.onopen({ type: 'open' });
            }
            
            // Start sending mock spots
            this.startMockSpots();
        }, 500);
    }
    
    send(data) {
        try {
            const message = JSON.parse(data);
            console.log('🔧 Mock WebSocket send:', message);
            
            // Echo back terminal commands
            if (message.type === 'command') {
                setTimeout(() => {
                    if (this.onmessage) {
                        this.onmessage({
                            data: JSON.stringify({
                                type: 'terminal',
                                data: `> ${message.data}`
                            })
                        });
                        
                        // Send mock response
                        setTimeout(() => {
                            if (this.onmessage) {
                                this.onmessage({
                                    data: JSON.stringify({
                                        type: 'terminal',
                                        data: `Command executed: ${message.data}`
                                    })
                                });
                            }
                        }, 200);
                    }
                }, 100);
            }
        } catch (e) {
            console.warn('Mock WebSocket: Invalid message format');
        }
    }
    
    close() {
        this.readyState = WebSocket.CLOSED;
        if (this.onclose) {
            this.onclose({ type: 'close' });
        }
        
        if (this.spotInterval) {
            clearInterval(this.spotInterval);
        }
    }
    
    startMockSpots() {
        // Send initial spots
        this.mockAPI.mockData.spots.forEach((spot, index) => {
            setTimeout(() => {
                if (this.onmessage && this.readyState === WebSocket.OPEN) {
                    const spotLine = `DX de ${spot.spotter}: ${spot.frequency.toFixed(1)} ${spot.callsign} ${spot.comment} ${spot.time}`;
                    this.onmessage({
                        data: JSON.stringify({
                            type: 'spot',
                            data: spotLine
                        })
                    });
                }
            }, index * 1000);
        });
        
        // Send periodic new spots
        this.spotInterval = setInterval(() => {
            if (this.onmessage && this.readyState === WebSocket.OPEN) {
                const spot = this.mockAPI.generateMockSpot();
                const spotLine = `DX de ${spot.spotter}: ${spot.frequency.toFixed(1)} ${spot.callsign} ${spot.comment} ${spot.time}`;
                this.onmessage({
                    data: JSON.stringify({
                        type: 'spot',
                        data: spotLine
                    })
                });
            }
        }, 10000 + Math.random() * 20000); // Random interval between 10-30 seconds
    }
}

// Create global mock API instance
window.mockAPI = new MockAPI();

// Override fetch for development mode
const originalFetch = window.fetch;
window.fetch = function(url, options) {
    // Check if this is an API call and we're in development mode
    if ((url.includes('/api/') || url.includes('api/')) && (location.protocol === 'file:' || location.hostname === 'localhost')) {
        console.log('🔧 Using Mock API for:', url);
        return window.mockAPI.fetch(url, options);
    }
    
    // Use original fetch for other requests
    return originalFetch.apply(this, arguments);
};

// Override WebSocket for development mode
const OriginalWebSocket = window.WebSocket;
window.WebSocket = function(url, protocols) {
    // Check if we're in development mode
    if (location.protocol === 'file:' || location.hostname === 'localhost') {
        console.log('🔧 Using Mock WebSocket for:', url);
        return window.mockAPI.createMockWebSocket(url);
    }
    
    // Use original WebSocket for production
    return new OriginalWebSocket(url, protocols);
};

console.log('🔧 Mock API initialized for development mode');