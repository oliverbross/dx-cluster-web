#!/usr/bin/env python3
"""
Python Development Server for DX Cluster Web Application
Simple HTTP server with API mocking for testing

@author Kilo Code
@version 1.0.0
"""

import http.server
import socketserver
import json
import os
import mimetypes
from urllib.parse import urlparse, parse_qs
from pathlib import Path

PORT = 8000
ROOT_DIR = Path(__file__).parent.parent

# Mock API data
MOCK_DATA = {
    'clusters': [
        {
            'id': 1,
            'name': 'DX Summit',
            'host': 'dxc.dxsummit.fi',
            'port': 8000,
            'description': 'Popular DX cluster with web interface',
            'is_active': 1
        },
        {
            'id': 2,
            'name': 'OH2AQ',
            'host': 'oh2aq.kolumbus.fi',
            'port': 41112,
            'description': 'Finnish DX cluster',
            'is_active': 1
        },
        {
            'id': 3,
            'name': 'VE7CC',
            'host': 've7cc.net',
            'port': 23,
            'description': 'Canadian DX cluster',
            'is_active': 1
        },
        {
            'id': 4,
            'name': 'W3LPL',
            'host': 'w3lpl.net',
            'port': 7300,
            'description': 'US East Coast DX cluster',
            'is_active': 1
        }
    ],
    'preferences': {
        'theme': 'dark',
        'callsign': 'DX-WEB',
        'autoConnect': False,
        'wavelogUrl': '',
        'wavelogApiKey': '',
        'wavelogLogbookSlug': '',
        'colors': {
            'newDxcc': '#ef4444',
            'newBand': '#22c55e',
            'newMode': '#3b82f6',
            'worked': '#f59e0b',
            'confirmed': '#6b7280'
        }
    }
}

class DXClusterHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)
    
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path.lstrip('/')
        
        # Handle API requests
        if path.startswith('api/'):
            self.handle_api_request('GET', path, None)
            return
        
        # Handle static files
        super().do_GET()
    
    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path.lstrip('/')
        
        # Handle API requests
        if path.startswith('api/'):
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else None
            self.handle_api_request('POST', path, post_data)
            return
        
        # Default POST handling
        self.send_error(405, "Method Not Allowed")
    
    def handle_api_request(self, method, path, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        try:
            if path == 'api/clusters':
                if method == 'GET':
                    response = json.dumps(MOCK_DATA['clusters'])
                else:
                    response = json.dumps({'error': 'Method not allowed'})
                    
            elif path == 'api/preferences':
                if method == 'GET':
                    response = json.dumps(MOCK_DATA['preferences'])
                elif method == 'POST' and data:
                    try:
                        preferences = json.loads(data)
                        MOCK_DATA['preferences'].update(preferences)
                        response = json.dumps({'success': True, 'message': 'Preferences saved'})
                    except json.JSONDecodeError:
                        response = json.dumps({'error': 'Invalid JSON'})
                else:
                    response = json.dumps({'error': 'Method not allowed'})
                    
            else:
                response = json.dumps({'error': 'API endpoint not found'})
                
        except Exception as e:
            response = json.dumps({'error': str(e)})
        
        self.wfile.write(response.encode('utf-8'))
    
    def log_message(self, format, *args):
        # Custom logging
        print(f"📡 {self.address_string()} - {format % args}")

def main():
    print("🚀 DX Cluster Web Development Server starting...")
    print(f"📡 Server will run at http://localhost:{PORT}")
    print("✅ Mock APIs enabled for testing")
    print("")
    print("Available endpoints:")
    print("  - GET  /api/clusters     - Get DX cluster list")
    print("  - GET  /api/preferences  - Get user preferences")
    print("  - POST /api/preferences  - Save user preferences")
    print("")
    print("Press Ctrl+C to stop the server")
    print("")
    
    try:
        with socketserver.TCPServer(("", PORT), DXClusterHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Shutting down development server...")
        print("✅ Server stopped")

if __name__ == "__main__":
    main()