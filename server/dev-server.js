/**
 * Node.js Development Server for DX Cluster Web Application
 * Simple HTTP server with API mocking for testing
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const WebSocket = require('ws');
const net = require('net');

const ROOT_DIR = path.join(__dirname, '..');

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Configuration and data storage
let config = {};
let mockData = {
    clusters: [],
    preferences: {}
};

// Load configuration from files
function loadConfiguration() {
    try {
        console.log('📁 Loading configuration files...');

        // Load server configuration
        const serverConfigPath = path.join(ROOT_DIR, 'config', 'server.json');
        if (fs.existsSync(serverConfigPath)) {
            config = JSON.parse(fs.readFileSync(serverConfigPath, 'utf8'));
            console.log('✅ Server configuration loaded');
        } else {
            console.log('⚠️ Server configuration file not found, using defaults');
            config = {
                port: 8080,
                host: 'localhost',
                websocket: { enabled: true },
                cors: { enabled: true, origin: '*' },
                cluster: { defaultLoginCallsign: 'OM0RX' }
            };
        }

        // Load clusters data
        const clustersPath = path.join(ROOT_DIR, 'config', 'clusters.json');
        if (fs.existsSync(clustersPath)) {
            mockData.clusters = JSON.parse(fs.readFileSync(clustersPath, 'utf8'));
            console.log(`✅ Loaded ${mockData.clusters.length} clusters`);
        } else {
            console.log('⚠️ Clusters configuration file not found');
            mockData.clusters = [];
        }

        // Load preferences data
        const preferencesPath = path.join(ROOT_DIR, 'config', 'preferences.json');
        if (fs.existsSync(preferencesPath)) {
            mockData.preferences = JSON.parse(fs.readFileSync(preferencesPath, 'utf8'));
            console.log('✅ Preferences configuration loaded');
        } else {
            console.log('⚠️ Preferences configuration file not found, using defaults');
            mockData.preferences = {
                theme: 'dark',
                callsign: 'DX-WEB',
                autoConnect: false,
                colors: {
                    newDxcc: '#ef4444',
                    newBand: '#22c55e',
                    newMode: '#3b82f6',
                    worked: '#f59e0b',
                    confirmed: '#6b7280'
                }
            };
        }

    } catch (error) {
        console.error('❌ Error loading configuration:', error);
        // Use minimal defaults if loading fails
        config = { port: 8080, host: 'localhost' };
        mockData = { clusters: [], preferences: {} };
    }
}

// Get port from config or default
const PORT = config.port || 8080;

// Create server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;
    
    // Remove leading slash
    if (pathname.startsWith('/')) {
        pathname = pathname.substring(1);
    }
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Handle API requests
    if (pathname.startsWith('api/')) {
        handleApiRequest(req, res, pathname, parsedUrl);
        return;
    }
    
    // Handle static files
    if (pathname === '' || pathname === '/') {
        pathname = 'index.html';
    }
    
    const filePath = path.join(ROOT_DIR, pathname);
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 - File not found');
            return;
        }
        
        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || 'text/plain';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

// Handle API requests
function handleApiRequest(req, res, pathname, parsedUrl) {
    console.log(`API Request: ${req.method} ${pathname}`);
    res.setHeader('Content-Type', 'application/json');

    if (pathname === 'api/wavelog-proxy.php') {
        console.log('Routing to wavelog-proxy handler');
        handleWavelogProxy(req, res);
        return;
    }

    if (pathname === 'api/preferences.php') {
        handlePreferences(req, res);
        return;
    }

    if (pathname === 'api/auth.php') {
        handleAuth(req, res);
        return;
    }

    if (pathname === 'api/clusters.php') {
        handleClusters(req, res);
        return;
    }

    if (pathname === 'api/clusters') {
        if (req.method === 'GET') {
            res.writeHead(200);
            res.end(JSON.stringify(mockData.clusters));
        } else {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        return;
    }
    
    if (pathname === 'api/preferences') {
        if (req.method === 'GET') {
            res.writeHead(200);
            res.end(JSON.stringify(mockData.preferences));
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const preferences = JSON.parse(body);
                    // In a real app, we'd save to database
                    mockData.preferences = { ...mockData.preferences, ...preferences };
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, message: 'Preferences saved' }));
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
        } else {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        return;
    }
    
    // Default 404 for unknown API endpoints
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'API endpoint not found' }));
}

// Handle Wavelog proxy requests
function handleWavelogProxy(req, res) {
    if (req.method !== 'POST') {
        res.writeHead(405);
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        try {
            const requestData = JSON.parse(body);
            const endpoint = requestData.endpoint;
            const data = requestData.data;

            console.log('Wavelog proxy request:', { endpoint, data });

            // Extract Wavelog configuration from request data
            const apiKey = data.key;
            const logbookSlug = data.logbook_public_slug;

            if (!apiKey) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'API key required' }));
                return;
            }

            // Build Wavelog API URL - try different formats
            let baseUrl = data.wavelogUrl || 'https://om0rx.wavelog.online/index.php';

            // Try the direct endpoint format first: /index.php/endpoint
            const apiUrl = baseUrl + '/' + endpoint.replace(/^\//, '');

            // Prepare request data matching the working example format
            let postData;
            if (endpoint === '/station_info') {
                // For station_info, just send the API key
                postData = JSON.stringify({ key: apiKey });
            } else if (endpoint === '/logbook_check_callsign') {
                // For callsign lookup with slug
                postData = JSON.stringify({
                    key: apiKey,
                    logbook_public_slug: logbookSlug,
                    callsign: data.callsign,
                    ...(data.band && { band: data.band })
                });
            } else if (endpoint === '/private_lookup') {
                // For private lookup (recommended approach from working example)
                postData = JSON.stringify({
                    key: apiKey,
                    callsign: data.callsign,
                    ...(data.band && { band: data.band }),
                    ...(data.mode && { mode: data.mode })
                });
            } else if (endpoint === '/logbook_check_callsign') {
                // For callsign lookup with slug
                postData = JSON.stringify({
                    key: apiKey,
                    logbook_public_slug: logbookSlug,
                    callsign: data.callsign,
                    ...(data.band && { band: data.band })
                });
            } else {
                // Default format for other endpoints
                postData = JSON.stringify({
                    key: apiKey,
                    ...(logbookSlug && { logbook_public_slug: logbookSlug }),
                    ...data
                });
            }

            // Make real HTTP request to Wavelog
            const url = new URL(apiUrl);
            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'User-Agent': 'DX Cluster Web Application/1.0'
                }
            };

            const client = url.protocol === 'https:' ? https : http;
            const wavelogReq = client.request(options, (wavelogRes) => {
                let responseData = '';

                wavelogRes.on('data', (chunk) => {
                    responseData += chunk;
                });

                wavelogRes.on('end', () => {
                    console.log(`Wavelog API response (${wavelogRes.statusCode}):`, responseData);

                    // Forward the response
                    res.writeHead(wavelogRes.statusCode, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(responseData);
                });
            });

            wavelogReq.on('error', (error) => {
                console.error('Wavelog API request error:', error);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Failed to connect to Wavelog API' }));
            });

            wavelogReq.write(postData);
            wavelogReq.end();

        } catch (error) {
            console.error('Wavelog proxy error:', error);
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid request data' }));
        }
    });
}

// Handle preferences API
function handlePreferences(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify(mockData.preferences));
    } else if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const preferences = JSON.parse(body);
                // In a real app, we'd save to database
                mockData.preferences = { ...mockData.preferences, ...preferences };
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, message: 'Preferences saved' }));
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    } else {
        res.writeHead(405);
        res.end(JSON.stringify({ error: 'Method not allowed' }));
    }
}

// Handle auth API
function handleAuth(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET') {
        // Mock session check - always return not authenticated for now
        res.writeHead(200);
        res.end(JSON.stringify({
            authenticated: false,
            user: null
        }));
    } else {
        res.writeHead(405);
        res.end(JSON.stringify({ error: 'Method not allowed' }));
    }
}

// Handle clusters API
function handleClusters(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify(mockData.clusters));
    } else {
        res.writeHead(405);
        res.end(JSON.stringify({ error: 'Method not allowed' }));
    }
}

// Create WebSocket server for DX cluster connections
const wss = new WebSocket.Server({ server });

// Store active cluster connections
const clusterConnections = new Map();

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
    try {
        const clientIp = req.socket.remoteAddress;
        const url = new URL(req.url, `http://${req.headers.host}`);
        const clusterId = url.searchParams.get('cluster');
        const loginCallsign = url.searchParams.get('login') || 'om0rx'; // Default to om0rx if not provided

        console.log(`🔌 New WebSocket connection from ${clientIp} for cluster ${clusterId} with login ${loginCallsign}`);

    // Store login callsign on WebSocket for use in data handlers
    ws.loginCallsign = loginCallsign;

    let currentClusterConnection = null;

    // If cluster ID is provided, automatically connect to it
    if (clusterId) {
        const cluster = mockData.clusters.find(c => c.id == clusterId);
        if (cluster) {
            console.log(`🚀 Auto-connecting to cluster: ${cluster.name}`);
            // Send initial connection acknowledgment
            ws.send(JSON.stringify({
                type: 'status',
                data: 'WebSocket connection established'
            }));

            // Auto-connect to the cluster
            setTimeout(() => {
                handleClusterConnect(ws, { clusterId: clusterId });
            }, 100);
        } else {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Cluster not found'
            }));
        }
    } else {
        // Send initial connection acknowledgment
        ws.send(JSON.stringify({
            type: 'connected',
            message: 'WebSocket connection established'
        }));
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            console.log('📨 WebSocket message:', data);

            switch (data.type) {
                case 'connect':
                    // Use cluster ID from query parameter or message data
                    const clusterData = {
                        ...data,
                        clusterId: clusterId || data.clusterId || data.id
                    };
                    handleClusterConnect(ws, clusterData).catch(error => {
                        console.error('Cluster connect error:', error);
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Failed to connect to cluster: ' + error.message
                        }));
                    });
                    break;
                case 'disconnect':
                    handleClusterDisconnect(ws);
                    break;
                case 'command':
                    handleClusterCommand(ws, data.data);
                    break;
                default:
                    console.log('Unknown WebSocket type:', data.type);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Unknown type: ' + data.type
                    }));
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
            }));
        }
    });

    ws.on('close', () => {
        console.log(`🔌 WebSocket connection closed from ${clientIp}`);
        handleClusterDisconnect(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        handleClusterDisconnect(ws);
    });

    } catch (error) {
        console.error('WebSocket connection setup error:', error);
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to initialize WebSocket connection'
        }));
        ws.close();
    }
});

// Handle cluster connection
async function handleClusterConnect(ws, data) {
    try {
        const clusterId = data.clusterId || data.id;

        if (!clusterId) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Cluster ID required'
            }));
            return;
        }

        // Find cluster by ID
        const cluster = mockData.clusters.find(c => c.id == clusterId);
        if (!cluster) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Cluster not found'
            }));
            return;
        }

        const { host, port, name } = cluster;
        console.log(`🌐 Connecting to DX cluster: ${name} (${host}:${port})`);

        // Close existing connection if any
        if (ws.clusterConnection) {
            try {
                ws.clusterConnection.end();
            } catch (error) {
                console.warn('Error closing existing connection:', error);
            }
        }

        // Create TCP connection to DX cluster
        const clusterSocket = new net.Socket();

        // Add connection timeout
        const connectionTimeout = setTimeout(() => {
            console.error(`⏰ Connection timeout for ${host}:${port}`);
            clusterSocket.destroy();
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Connection timeout'
            }));
        }, 10000);

        clusterSocket.connect(port, host, () => {
            console.log(`✅ Connected to DX cluster: ${host}:${port}`);
            clearTimeout(connectionTimeout);

            ws.send(JSON.stringify({
                type: 'status',
                data: `Connected to ${name} (${host}:${port})`
            }));

            // Send initial commands (removed problematic commands)
            // Commands will be sent after successful login
        });

        clusterSocket.on('data', (data) => {
            try {
                const spotData = data.toString();
                console.log(`📡 DX spot received: ${spotData.trim()}`);

                // Check if login is required and send login command
                if (spotData.includes('Please enter your call:') || spotData.includes('login:')) {
                    console.log(`🔐 Sending login command: ${ws.loginCallsign}`);
                    clusterSocket.write(ws.loginCallsign + '\n');
                    return;
                }

                // Send terminal output for user feedback
                ws.send(JSON.stringify({
                    type: 'terminal',
                    data: spotData.trim()
                }));

                // Parse and forward DX spots
                const spots = parseDxSpots(spotData);
                if (spots.length > 0) {
                    console.log(`📡 Parsed ${spots.length} DX spots:`, spots);
                    spots.forEach(spot => {
                        try {
                            console.log(`📤 Sending spot to client: ${spot.dxCall} on ${spot.frequency} ${spot.band}`);
                            ws.send(JSON.stringify({
                                type: 'spot',
                                data: spot
                            }));
                        } catch (sendError) {
                            console.error('Error sending spot to client:', sendError);
                        }
                    });
                }
            } catch (dataError) {
                console.error('Error processing cluster data:', dataError);
                // Don't crash the server, just log the error
            }
        });

        clusterSocket.on('close', () => {
            console.log(`❌ DX cluster connection closed: ${host}:${port}`);
            try {
                ws.send(JSON.stringify({
                    type: 'status',
                    data: `Disconnected from ${name} (${host}:${port})`
                }));
            } catch (sendError) {
                console.error('Error sending disconnect message:', sendError);
            }
            ws.clusterConnection = null;

            // Attempt to reconnect after 30 seconds
            console.log(`🔄 Scheduling reconnection to ${host}:${port} in 30 seconds...`);
            setTimeout(() => {
                if (!ws.clusterConnection && ws.readyState === WebSocket.OPEN) {
                    console.log(`🔄 Attempting to reconnect to ${host}:${port}...`);
                    handleClusterConnect(ws, { clusterId: clusterId }).catch(error => {
                        console.error('Reconnection failed:', error);
                    });
                }
            }, 30000);
        });

        clusterSocket.on('error', (error) => {
            console.error(`❌ DX cluster connection error: ${error.message}`);
            clearTimeout(connectionTimeout);
            try {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: `Connection failed: ${error.message}`
                }));
            } catch (sendError) {
                console.error('Error sending error message:', sendError);
            }
            ws.clusterConnection = null;
        });

        clusterSocket.on('timeout', () => {
            console.log(`⏰ DX cluster timeout: ${host}:${port}`);
            try {
                clusterSocket.end();
            } catch (endError) {
                console.error('Error ending timed out connection:', endError);
            }
        });

        // Set longer timeout (5 minutes)
        clusterSocket.setTimeout(300000);

        // Store connection reference
        ws.clusterConnection = clusterSocket;

    } catch (error) {
        console.error('Critical error in handleClusterConnect:', error);
        try {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Internal server error during cluster connection'
            }));
        } catch (sendError) {
            console.error('Error sending error message:', sendError);
        }
        throw error; // Re-throw to be caught by the caller
    }
}

// Handle cluster disconnection
function handleClusterDisconnect(ws) {
    if (ws.clusterConnection) {
        console.log('🔌 Disconnecting from DX cluster');
        ws.clusterConnection.end();
        ws.clusterConnection = null;
    }
}

// Handle cluster commands
function handleClusterCommand(ws, command) {
    try {
        if (ws.clusterConnection && ws.clusterConnection.writable) {
            console.log(`📤 Sending command to cluster: ${command}`);
            ws.clusterConnection.write(command + '\n');
        } else {
            console.log('⚠️ Cannot send command - not connected to cluster');
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Not connected to cluster'
            }));
        }
    } catch (error) {
        console.error('Error sending command to cluster:', error);
        try {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to send command: ' + error.message
            }));
        } catch (sendError) {
            console.error('Error sending error message:', sendError);
        }
    }
}

// Parse DX spots from cluster data
function parseDxSpots(data) {
    const spots = [];
    const lines = data.toString().split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('login:') || trimmed.startsWith('Hello') ||
            trimmed.startsWith('running') || trimmed.startsWith('Capabilities:') ||
            trimmed.startsWith('Nodes:') || trimmed.startsWith('OM0RX de OM0RX-1')) {
            continue;
        }

        // Try different DX spot formats

        // Format 1: DX de CALLSIGN: FREQUENCY CALLSIGN TIME COMMENT
        let dxMatch = trimmed.match(/^DX de ([A-Z0-9/]+):\s+([0-9.]+)\s+([A-Z0-9/]+)\s+([0-9]{4}Z)\s*(.*)$/);
        if (dxMatch) {
            const [, spotter, frequency, dxCall, time, comment] = dxMatch;
            spots.push({
                deCall: spotter, // Use the actual spotter from the DX spot
                frequency: parseFloat(frequency),
                dxCall: dxCall,
                time: formatTime(time),
                comment: comment.trim(),
                band: getBandFromFrequency(frequency),
                mode: detectMode(frequency, comment),
                timestamp: Date.now()
            });
            continue;
        }

        // Format 2: FREQUENCY CALLSIGN TIME MODE COMMENT <SPOTTER>
        dxMatch = trimmed.match(/^([0-9.]+)\s+([A-Z0-9/]+)\s+([0-9]{1,2}-[A-Z]{3}-[0-9]{4}\s+[0-9]{4}Z|[0-9]{4}Z)\s+([A-Z0-9]+)?\s*(.*)$/);
        if (dxMatch) {
            const [, frequency, dxCall, time, mode, comment] = dxMatch;
            console.log(`Format 2 match - trimmed: "${trimmed}", comment: "${comment}"`);
            // Extract spotter from comment if present (format: DX de SPOTTER: ...)
            const spotterMatch = comment.match(/DX de ([A-Z0-9/]+):/);
            const spotter = spotterMatch ? spotterMatch[1] : 'OM0RX'; // Default to cluster if not found
            console.log(`Format 2 spotter extraction - spotterMatch: ${spotterMatch}, spotter: ${spotter}`);
            spots.push({
                deCall: spotter,
                frequency: parseFloat(frequency),
                dxCall: dxCall,
                time: formatTime(time),
                comment: comment.trim(),
                band: getBandFromFrequency(frequency),
                mode: mode || detectMode(frequency, comment),
                timestamp: Date.now()
            });
            continue;
        }

        // Format 3: FREQUENCY CALLSIGN TIME COMMENT
        dxMatch = trimmed.match(/^([0-9.]+)\s+([A-Z0-9/]+)\s+([0-9]{4}Z)\s*(.*)$/);
        if (dxMatch) {
            const [, frequency, dxCall, time, comment] = dxMatch;
            console.log(`Format 3 match - trimmed: "${trimmed}", comment: "${comment}"`);
            // Extract spotter from comment if present (format: DX de SPOTTER: ...)
            const spotterMatch = comment.match(/DX de ([A-Z0-9/]+):/);
            const spotter = spotterMatch ? spotterMatch[1] : 'OM0RX'; // Default to cluster if not found
            console.log(`Format 3 spotter extraction - spotterMatch: ${spotterMatch}, spotter: ${spotter}`);
            spots.push({
                deCall: spotter,
                frequency: parseFloat(frequency),
                dxCall: dxCall,
                time: formatTime(time),
                comment: comment.trim(),
                band: getBandFromFrequency(frequency),
                mode: detectMode(frequency, comment),
                timestamp: Date.now()
            });
            continue;
        }

        // If line contains frequency and callsign, try to extract
        const freqMatch = trimmed.match(/([0-9]{2,7}\.[0-9])\s+([A-Z0-9/]{3,})/);
        if (freqMatch && !trimmed.includes('login:') && !trimmed.includes('Hello') &&
            !trimmed.includes('running') && !trimmed.includes('Capabilities:') &&
            !trimmed.includes('Nodes:') && !trimmed.includes('OM0RX de OM0RX-1')) {
            const [, frequency, dxCall] = freqMatch;
            const extractedComment = trimmed.replace(freqMatch[0], '').trim();
            console.log(`Fallback match - trimmed: "${trimmed}", extractedComment: "${extractedComment}"`);
            // Extract spotter from comment - try multiple formats
            let spotter = 'OM0RX'; // Default to cluster
            let cleanComment = extractedComment;

            // Format 1: DX de SPOTTER: at the beginning
            const spotterMatch1 = extractedComment.match(/DX de ([A-Z0-9/]+):\s*(.*)/i);
            if (spotterMatch1) {
                spotter = spotterMatch1[1];
                cleanComment = spotterMatch1[2].trim(); // Get everything after "DX de SPOTTER:"
                console.log(`Format 1 match - spotter: ${spotter}, spotterMatch1[2]: "${spotterMatch1[2]}", cleanComment: "${cleanComment}"`);
            } else {
                console.log(`Format 1 no match for extractedComment: "${extractedComment}"`);
                // Try a more flexible pattern
                const spotterMatch2 = extractedComment.match(/DX de ([A-Z0-9/]+):(.+)/i);
                if (spotterMatch2) {
                    spotter = spotterMatch2[1];
                    cleanComment = spotterMatch2[2].trim();
                    console.log(`Format 1 flexible match - spotter: ${spotter}, cleanComment: "${cleanComment}"`);
                } else {
                    console.log(`Format 1 flexible no match either`);
                    // Last resort: simple string replacement
                    if (extractedComment.includes('DX de ')) {
                        const spotterMatch3 = extractedComment.match(/DX de ([A-Z0-9/]+):/);
                        if (spotterMatch3) {
                            spotter = spotterMatch3[1];
                            cleanComment = extractedComment.replace(/DX de [A-Z0-9/]+:\s*/, '').trim();
                            console.log(`Format 1 string replacement - spotter: ${spotter}, cleanComment: "${cleanComment}"`);
                        }
                    }
                }
            }

            // Format 2: <SPOTTER> at the end
            const spotterMatch2 = extractedComment.match(/<([A-Z0-9/]+)>$/);
            if (spotterMatch2) {
                spotter = spotterMatch2[1];
                cleanComment = extractedComment.replace(/\s*<[A-Z0-9/]+>$/, ''); // Remove "<SPOTTER>" from comment
            }

            console.log(`Fallback spotter extraction - extractedComment: "${extractedComment}", spotter: ${spotter}, cleanComment: "${cleanComment}"`);
            console.log(`Final comment will be: "${cleanComment.trim()}"`);
            const finalComment = cleanComment.trim() || extractedComment;
            console.log(`Using final comment: "${finalComment}"`);

            // If cleanComment is empty or same as extractedComment, try simple string replacement
            let finalCommentToUse = finalComment;
            if (finalComment === extractedComment && extractedComment.includes('DX de ')) {
                const spotterMatch = extractedComment.match(/DX de ([A-Z0-9/]+):/);
                if (spotterMatch) {
                    finalCommentToUse = extractedComment.replace(/DX de [A-Z0-9/]+:\s*/, '').trim();
                    console.log(`Applied string replacement, final comment: "${finalCommentToUse}"`);
                }
            }

            // Final fallback: if comment still contains "DX de", remove it
            if (finalCommentToUse.includes('DX de ') && finalCommentToUse.includes(':')) {
                const colonIndex = finalCommentToUse.indexOf(':');
                if (colonIndex !== -1) {
                    const afterColon = finalCommentToUse.substring(colonIndex + 1).trim();
                    finalCommentToUse = afterColon;
                    console.log(`Final fallback applied, comment: "${finalCommentToUse}"`);
                }
            }

            // One more check: if comment still starts with "DX de", force remove it
            if (finalCommentToUse.startsWith('DX de ')) {
                const parts = finalCommentToUse.split(':');
                if (parts.length > 1) {
                    finalCommentToUse = parts[1].trim();
                    console.log(`Force removal applied, comment: "${finalCommentToUse}"`);
                }
            }

            // Ultimate fallback: simple string replacement
            if (finalCommentToUse.includes('DX de ') && finalCommentToUse.includes(':')) {
                finalCommentToUse = finalCommentToUse.replace(/^DX de [A-Z0-9/]+:\s*/, '');
                console.log(`Ultimate fallback applied, comment: "${finalCommentToUse}"`);
            }

            // Final check: if comment is still empty after all processing, use original
            if (!finalCommentToUse.trim()) {
                finalCommentToUse = extractedComment;
                console.log(`Using original comment as final fallback: "${finalCommentToUse}"`);
            }

            // Extract time from the comment if present
            let extractedTime = new Date().toISOString().slice(11, 15) + 'Z';
            console.log(`Initial extractedTime: ${extractedTime}`);
            console.log(`Looking for time in finalCommentToUse: "${finalCommentToUse}"`);
            const timeMatch = finalCommentToUse.match(/(\d{4})Z/);
            if (timeMatch) {
                const rawTime = timeMatch[1] + 'Z';
                console.log(`Time match found: ${timeMatch[1]}, rawTime: ${rawTime}`);
                console.log(`About to call formatTime with: "${rawTime}"`);
                extractedTime = formatTime(rawTime);
                console.log(`Formatted time result: ${extractedTime}`);
                // Remove time from comment
                finalCommentToUse = finalCommentToUse.replace(/\d{4}Z/, '').trim();
                console.log(`Comment after time removal: "${finalCommentToUse}"`);
            } else {
                console.log(`No time match found in finalCommentToUse: "${finalCommentToUse}"`);
                // Try to extract time from the original extractedComment
                console.log(`Looking for time in original extractedComment: "${extractedComment}"`);
                const originalTimeMatch = extractedComment.match(/(\d{4})Z/);
                if (originalTimeMatch) {
                    console.log(`Found time in original comment: ${originalTimeMatch[1]}`);
                    const rawTime = originalTimeMatch[1] + 'Z';
                    console.log(`About to call formatTime with rawTime from original: "${rawTime}"`);
                    extractedTime = formatTime(rawTime);
                    console.log(`Formatted time from original: ${extractedTime}`);
                } else {
                    console.log(`No time found in original comment either`);
                }
            }

            spots.push({
                deCall: spotter,
                frequency: parseFloat(frequency),
                dxCall: dxCall,
                time: extractedTime,
                comment: finalCommentToUse,
                band: getBandFromFrequency(frequency),
                mode: detectMode(frequency, finalCommentToUse),
                timestamp: Date.now()
            });
        }
    }

    return spots;
}

// Format time string
function formatTime(timeStr) {
    try {
        if (!timeStr) return 'Unknown';

        console.log(`formatTime called with: "${timeStr}" (length: ${timeStr.length})`);

        // Handle different time formats
        if (timeStr.match(/^\d{4}Z$/)) {
            // Format: 1309Z -> 13:09Z
            const hours = timeStr.slice(0, 2);
            const minutes = timeStr.slice(2, 4);
            const result = `${hours}:${minutes}Z`;
            console.log(`formatTime: ${timeStr} -> ${result} (matched 4-digit format)`);
            return result;
        }

        // Handle format like "1404Z" (should match above, but let's be explicit)
        if (timeStr.length === 5 && timeStr.endsWith('Z') && /^\d{4}Z$/.test(timeStr)) {
            const hours = timeStr.slice(0, 2);
            const minutes = timeStr.slice(2, 4);
            const result = `${hours}:${minutes}Z`;
            console.log(`formatTime explicit: ${timeStr} -> ${result}`);
            return result;
        }

        // Try to handle any 4-digit + Z format
        if (timeStr.length >= 5 && timeStr.includes('Z')) {
            const digits = timeStr.replace(/[^0-9]/g, '');
            if (digits.length === 4) {
                const hours = digits.slice(0, 2);
                const minutes = digits.slice(2, 4);
                const result = `${hours}:${minutes}Z`;
                console.log(`formatTime fallback: ${timeStr} -> ${result}`);
                return result;
            }
        }

        // Nuclear option - just format it no matter what
        console.log(`formatTime: nuclear option for: ${timeStr}`);
        if (timeStr.includes('Z')) {
            const parts = timeStr.split('Z')[0];
            const digits = parts.replace(/[^0-9]/g, '');
            if (digits.length >= 4) {
                const hours = digits.slice(-4, -2) || '00';
                const minutes = digits.slice(-2) || '00';
                const nuclearResult = `${hours}:${minutes}Z`;
                console.log(`formatTime: nuclear result: ${nuclearResult}`);
                return nuclearResult;
            }
        }

        // If everything fails, just return a default time
        console.log(`formatTime: complete failure, returning default`);
        return '00:00Z';
    } catch (error) {
        console.log(`formatTime: exception: ${error.message}`);
        return '00:00Z';
    }
}

// Get band from frequency
function getBandFromFrequency(freq) {
    const frequency = parseFloat(freq);
    if (isNaN(frequency)) return 'Unknown';

    // Convert kHz to MHz if necessary (frequencies above 100 are likely in kHz)
    const freqMHz = frequency > 100 ? frequency / 1000 : frequency;

    console.log(`Band detection: ${frequency} kHz -> ${freqMHz} MHz`);

    // HF Bands - check exact ranges first
    if (freqMHz >= 1.8 && freqMHz <= 2.0) return '160m';
    if (freqMHz >= 3.5 && freqMHz <= 4.0) return '80m';
    if (freqMHz >= 7.0 && freqMHz <= 7.3) return '40m';
    if (freqMHz >= 10.1 && freqMHz <= 10.15) return '30m';
    if (freqMHz >= 14.0 && freqMHz <= 14.35) return '20m';
    if (freqMHz >= 18.068 && freqMHz <= 18.168) return '17m';
    if (freqMHz >= 21.0 && freqMHz <= 21.45) return '15m';
    if (freqMHz >= 24.89 && freqMHz <= 24.99) return '12m';
    if (freqMHz >= 28.0 && freqMHz <= 29.7) return '10m';

    // VHF/UHF Bands
    if (freqMHz >= 50.0 && freqMHz <= 54.0) return '6m';
    if (freqMHz >= 144.0 && freqMHz <= 148.0) return '2m';
    if (freqMHz >= 430.0 && freqMHz <= 440.0) return '70cm';
    if (freqMHz >= 1240.0 && freqMHz <= 1300.0) return '23cm';

    // Fallback wider ranges
    if (freqMHz >= 1.8 && freqMHz < 2.0) return '160m';
    if (freqMHz >= 3.5 && freqMHz < 4.0) return '80m';
    if (freqMHz >= 7.0 && freqMHz < 7.3) return '40m';
    if (freqMHz >= 10.0 && freqMHz < 10.2) return '30m';
    if (freqMHz >= 14.0 && freqMHz < 14.4) return '20m';
    if (freqMHz >= 18.0 && freqMHz < 18.2) return '17m';
    if (freqMHz >= 21.0 && freqMHz < 21.5) return '15m';
    if (freqMHz >= 24.8 && freqMHz < 25.0) return '12m';
    if (freqMHz >= 28.0 && freqMHz < 30.0) return '10m';
    if (freqMHz >= 50.0 && freqMHz < 54.0) return '6m';
    if (freqMHz >= 144.0 && freqMHz < 148.0) return '2m';
    if (freqMHz >= 430.0 && freqMHz < 440.0) return '70cm';
    if (freqMHz >= 1240.0 && freqMHz < 1300.0) return '23cm';

    console.log(`Band detection failed for ${freqMHz} MHz`);
    return 'Unknown';
}

// Detect mode from comment and frequency
function detectMode(frequency, comment) {
    const freqMHz = frequency > 100 ? frequency / 1000 : frequency;
    const commentUpper = comment.toUpperCase();

    // Check comment for explicit mode mentions
    if (commentUpper.includes('FT8') || commentUpper.includes('FT-8')) return 'FT8';
    if (commentUpper.includes('FT4') || commentUpper.includes('FT-4')) return 'FT4';
    if (commentUpper.includes('RTTY')) return 'RTTY';
    if (commentUpper.includes('PSK') || commentUpper.includes('PSK31')) return 'PSK31';
    if (commentUpper.includes('JT65') || commentUpper.includes('JT-65')) return 'JT65';
    if (commentUpper.includes('JT9') || commentUpper.includes('JT-9')) return 'JT9';
    if (commentUpper.includes('WSPR')) return 'WSPR';
    if (commentUpper.includes('HELL') || commentUpper.includes('FELDHELL')) return 'HELL';
    if (commentUpper.includes('SSTV')) return 'SSTV';
    if (commentUpper.includes('AMTOR')) return 'AMTOR';
    if (commentUpper.includes('PACTOR')) return 'PACTOR';
    if (commentUpper.includes('OLIVIA')) return 'OLIVIA';
    if (commentUpper.includes('CONTESTIA')) return 'CONTESTIA';
    if (commentUpper.includes('MT63')) return 'MT63';

    // Check for SSB variants
    if (commentUpper.includes('USB')) return 'USB';
    if (commentUpper.includes('LSB')) return 'LSB';
    if (commentUpper.includes('SSB')) return 'SSB';

    // Check for CW variants
    if (commentUpper.includes('CW') || commentUpper.includes('A1A')) return 'CW';

    // Frequency-based mode detection for common bands
    if (freqMHz >= 1.8 && freqMHz <= 2.0) {
        // 160m - typically CW/SSB
        if (freqMHz >= 1.8 && freqMHz <= 1.85) return 'CW';
        return 'SSB';
    }

    if (freqMHz >= 3.5 && freqMHz <= 4.0) {
        // 80m - CW below 3.6, SSB above
        if (freqMHz < 3.6) return 'CW';
        return 'SSB';
    }

    if (freqMHz >= 7.0 && freqMHz <= 7.3) {
        // 40m - CW below 7.1, SSB/Digital above
        if (freqMHz < 7.1) return 'CW';
        if (freqMHz >= 7.035 && freqMHz <= 7.045) return 'FT8';
        if (freqMHz >= 7.07 && freqMHz <= 7.075) return 'FT8';
        return 'SSB';
    }

    if (freqMHz >= 10.1 && freqMHz <= 10.15) {
        // 30m - Digital modes
        if (freqMHz >= 10.13 && freqMHz <= 10.14) return 'FT8';
        return 'CW';
    }

    if (freqMHz >= 14.0 && freqMHz <= 14.35) {
        // 20m - Mixed modes
        if (freqMHz >= 14.0 && freqMHz <= 14.07) return 'CW';
        if (freqMHz >= 14.07 && freqMHz <= 14.095) return 'FT8';
        if (freqMHz >= 14.095 && freqMHz <= 14.0995) return 'FT4';
        if (freqMHz >= 14.1 && freqMHz <= 14.112) return 'CW';
        return 'SSB';
    }

    if (freqMHz >= 18.068 && freqMHz <= 18.168) {
        // 17m - Mixed modes
        if (freqMHz >= 18.068 && freqMHz <= 18.095) return 'CW';
        if (freqMHz >= 18.1 && freqMHz <= 18.105) return 'FT8';
        return 'SSB';
    }

    if (freqMHz >= 21.0 && freqMHz <= 21.45) {
        // 15m - Mixed modes
        if (freqMHz >= 21.0 && freqMHz <= 21.07) return 'CW';
        if (freqMHz >= 21.07 && freqMHz <= 21.075) return 'FT8';
        if (freqMHz >= 21.09 && freqMHz <= 21.095) return 'FT8';
        return 'SSB';
    }

    if (freqMHz >= 24.89 && freqMHz <= 24.99) {
        // 12m - Mixed modes
        if (freqMHz >= 24.89 && freqMHz <= 24.905) return 'CW';
        if (freqMHz >= 24.915 && freqMHz <= 24.925) return 'FT8';
        return 'SSB';
    }

    if (freqMHz >= 28.0 && freqMHz <= 29.7) {
        // 10m - Mixed modes
        if (freqMHz >= 28.0 && freqMHz <= 28.07) return 'CW';
        if (freqMHz >= 28.07 && freqMHz <= 28.075) return 'FT8';
        if (freqMHz >= 28.076 && freqMHz <= 28.08) return 'FT4';
        return 'SSB';
    }

    // VHF/UHF - typically SSB/FM/Digital
    if (freqMHz >= 50.0 && freqMHz <= 54.0) {
        if (freqMHz >= 50.31 && freqMHz <= 50.32) return 'FT8';
        return 'SSB';
    }

    if (freqMHz >= 144.0 && freqMHz <= 148.0) {
        return 'SSB'; // or FM depending on frequency
    }

    // Default to CW for unknown frequencies
    return 'CW';
}

// Load configuration before starting server
loadConfiguration();

// Start server
server.listen(config.port || PORT, () => {
    console.log('🚀 DX Cluster Web Server started');
    console.log(`📡 Server running at http://${config.host || 'localhost'}:${config.port || PORT}`);
    if (config.websocket?.enabled) {
        console.log(`🔌 WebSocket server running on ws://${config.host || 'localhost'}:${config.port || PORT}`);
    }
    console.log('✅ Real Wavelog API integration enabled');
    console.log('✅ Real DX cluster connections enabled');
    console.log(`📊 Loaded ${mockData.clusters.length} clusters from configuration`);
    console.log('');
    console.log('Available endpoints:');
    console.log('  - GET  /api/clusters.php         - Get DX cluster list');
    console.log('  - GET  /api/preferences.php      - Get user preferences');
    console.log('  - POST /api/preferences.php      - Save user preferences');
    console.log('  - GET  /api/auth.php             - Authentication check');
    console.log('  - POST /api/wavelog-proxy.php    - Wavelog API proxy');
    console.log('');
    console.log('WebSocket actions:');
    console.log('  - connect: {action: "connect", host: "dxc.dxsummit.fi", port: 8000}');
    console.log('  - disconnect: {action: "disconnect"}');
    console.log('  - send_command: {action: "send_command", command: "show/dx"}');
    console.log('');
    console.log('Configuration files:');
    console.log('  - config/server.json      - Server configuration');
    console.log('  - config/clusters.json    - DX cluster definitions');
    console.log('  - config/preferences.json - User preferences');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('Stack trace:', error.stack);
    // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, just log the error
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down development server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});