/**
 * Node.js Development Server for DX Cluster Web Application
 * Simple HTTP server with API mocking for testing
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;
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

// Mock API data
const mockData = {
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
    }
};

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
        handleApiRequest(req, res, pathname);
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
function handleApiRequest(req, res, pathname) {
    res.setHeader('Content-Type', 'application/json');
    
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

// Start server
server.listen(PORT, () => {
    console.log('🚀 DX Cluster Web Development Server started');
    console.log(`📡 Server running at http://localhost:${PORT}`);
    console.log('✅ Mock APIs enabled for testing');
    console.log('');
    console.log('Available endpoints:');
    console.log('  - GET  /api/clusters     - Get DX cluster list');
    console.log('  - GET  /api/preferences  - Get user preferences');
    console.log('  - POST /api/preferences  - Save user preferences');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down development server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});