/**
 * DX Cluster Management - Connection and Spot Processing
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

/**
 * Extend the main app with cluster-specific functionality
 */
Object.assign(DXClusterApp.prototype, {
    
    /**
     * Handle incoming cluster messages
     */
    handleClusterMessage(data) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'spot':
                    this.processSpot(message.data);
                    break;
                case 'terminal':
                    this.addTerminalLine(message.data);
                    break;
                case 'status':
                    this.handleStatusMessage(message.data);
                    break;
                case 'error':
                    this.showNotification(message.data, 'error');
                    break;
                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (error) {
            // Treat as raw terminal output if not JSON
            this.addTerminalLine(data);
        }
    },

    /**
     * Process a DX spot
     */
    async processSpot(spotData) {
        try {
            console.log('Processing spot:', spotData);
            
            // Check if spotData is already parsed (object) or needs parsing (string)
            let spot;
            if (typeof spotData === 'object' && spotData.dxCall && spotData.frequency) {
                // Already parsed object from server - map fields to expected format
                spot = {
                    callsign: spotData.dxCall,
                    spotter: spotData.deCall,
                    frequency: spotData.frequency,
                    time: spotData.time,
                    comment: spotData.comment,
                    band: spotData.band,
                    mode: spotData.mode,
                    timestamp: spotData.timestamp || Date.now()
                };
                console.log('Using pre-parsed spot data:', spot);
            } else {
                // Raw text data that needs parsing
                console.log('Parsing raw spot data:', spotData);
                spot = this.parseSpotData(spotData);
            }
            
            if (!spot) {
                console.warn('Failed to parse spot data');
                return;
            }

            // Generate unique key for spot
            const spotKey = `${spot.callsign}-${spot.band}-${spot.mode}`;
            console.log('Generated spot key:', spotKey);
            
            // Check if we already have this spot (within time window)
            const existingSpot = this.spots.get(spotKey);
            if (existingSpot && (Date.now() - existingSpot.timestamp) < 300000) { // 5 minutes
                console.log('Skipping duplicate spot (within 5 minutes)');
                return; // Skip duplicate
            }

            // Check logbook status if Wavelog is configured
            if (this.preferences.wavelogApiKey) {
                console.log('Checking logbook status for spot');
                try {
                    spot.logbookStatus = await this.checkLogbookStatus(spot);
                } catch (logbookError) {
                    console.error('Error checking logbook status:', logbookError);
                    spot.logbookStatus = null;
                }
            } else {
                console.log('Wavelog not configured, skipping logbook check');
            }

            // Determine spot status and color
            spot.status = this.determineSpotStatus(spot);
            console.log('Determined spot status:', spot.status);
            
            // Add timestamp if not already present
            if (!spot.timestamp) {
                spot.timestamp = Date.now();
            }
            
            // Store spot
            this.spots.set(spotKey, spot);
            console.log('Stored spot in spots Map, total spots:', this.spots.size);
            
            // Add to table
            this.addSpotToTable(spot);
            
            // Update statistics
            this.updateStats();
            
            // Check for alarms (Phase 2 feature)
            // this.checkSpotAlarms(spot);
            
        } catch (error) {
            console.error('Error processing spot:', error);
        }
    },

    /**
     * Parse raw spot data into structured format
     */
    parseSpotData(rawData) {
        try {
            // Use enhanced spot parser
            return DXSpotParser.parseSpotData(rawData);
        } catch (error) {
            console.error('Error parsing spot data:', error);
            return null;
        }
    },



    /**
     * Determine spot status based on logbook data
     */
    determineSpotStatus(spot) {
        if (!spot.logbookStatus) {
            return 'unknown';
        }

        // Priority order: new DXCC > new band > new mode > worked > confirmed
        if (spot.logbookStatus.newDxcc) return 'new-dxcc';
        if (spot.logbookStatus.newBand) return 'new-band';
        if (spot.logbookStatus.newMode) return 'new-mode';
        if (spot.logbookStatus.worked && !spot.logbookStatus.confirmed) return 'worked';
        if (spot.logbookStatus.confirmed) return 'confirmed';
        
        return 'new';
    },

    /**
     * Add spot to the display table
     */
    addSpotToTable(spot) {
        try {
            console.log('Adding spot to table:', spot.callsign, spot.frequency);
            
            const tbody = document.getElementById('spots-tbody');
            if (!tbody) {
                console.error('Spots table body not found');
                return;
            }
            
            // Remove "no spots" message if present
            if (tbody.children.length === 1 && tbody.children[0].children.length === 1) {
                const firstChild = tbody.children[0];
                if (firstChild.textContent.includes('No spots received yet')) {
                    tbody.innerHTML = '';
                }
            }

            // Check if this spot is already in the table
            const spotKey = `${spot.callsign}-${spot.band}-${spot.mode}`;
            const existingRow = tbody.querySelector(`tr[data-spot-key="${spotKey}"]`);
            
            if (existingRow) {
                console.log('Spot already in table, updating:', spotKey);
                // Update existing row instead of creating a new one
                existingRow.className = `spot-${spot.status}`;
                
                // Format time
                const timeFormatted = this.formatSpotTime(spot.time);
                
                // Create status indicator
                const statusText = this.getStatusText(spot.status);
                
                // Update row content
                const cells = existingRow.querySelectorAll('td');
                if (cells.length >= 8) {
                    cells[0].textContent = timeFormatted;
                    cells[1].textContent = spot.callsign;
                    cells[2].textContent = spot.frequency.toFixed(1);
                    cells[3].textContent = spot.band;
                    cells[4].textContent = spot.mode;
                    cells[5].textContent = spot.spotter;
                    cells[6].textContent = spot.comment;
                    cells[7].innerHTML = `
                        <span class="status-indicator status-${spot.status.replace('-', '')}">
                            ${statusText}
                        </span>
                    `;
                }
                
                // Move to top if not already there
                if (tbody.firstChild !== existingRow) {
                    tbody.insertBefore(existingRow, tbody.firstChild);
                }
            } else {
                console.log('Creating new row for spot:', spotKey);
                // Create new row
                const row = document.createElement('tr');
                row.className = `spot-${spot.status}`;
                row.dataset.spotKey = spotKey;
                
                // Format time
                const timeFormatted = this.formatSpotTime(spot.time);
                
                // Create status indicator
                const statusText = this.getStatusText(spot.status);
                
                // Set row content
                row.innerHTML = `
                    <td class="font-mono text-sm">${timeFormatted}</td>
                    <td class="font-mono font-bold">${spot.callsign}</td>
                    <td class="font-mono">${spot.frequency.toFixed(1)}</td>
                    <td class="font-bold">${spot.band}</td>
                    <td>${spot.mode}</td>
                    <td class="font-mono">${spot.spotter}</td>
                    <td class="text-sm">${spot.comment || ''}</td>
                    <td>
                        <span class="status-indicator status-${spot.status.replace('-', '')}">
                            ${statusText}
                        </span>
                    </td>
                `;

                // Insert at top of table
                tbody.insertBefore(row, tbody.firstChild);
            }

            // Limit table size
            const maxRows = 500;
            while (tbody.children.length > maxRows) {
                tbody.removeChild(tbody.lastChild);
            }

            // Apply current filters
            const row = tbody.querySelector(`tr[data-spot-key="${spotKey}"]`);
            if (row) {
                this.applyFiltersToRow(row);
            }
        } catch (error) {
            console.error('Error adding spot to table:', error);
        }
    },

    /**
     * Format spot time for display
     */
    formatSpotTime(timeStr) {
        // Convert "1234Z" to "12:34"
        if (timeStr && timeStr.length === 5 && timeStr.endsWith('Z')) {
            const hours = timeStr.substring(0, 2);
            const minutes = timeStr.substring(2, 4);
            return `${hours}:${minutes}`;
        }
        return timeStr || '';
    },

    /**
     * Get human-readable status text
     */
    getStatusText(status) {
        const statusMap = {
            'new-dxcc': 'New DXCC',
            'new-band': 'New Band',
            'new-mode': 'New Mode',
            'worked': 'Worked',
            'confirmed': 'Confirmed',
            'new': 'New',
            'unknown': 'Unknown'
        };
        return statusMap[status] || status;
    },

    /**
     * Send command to cluster
     */
    sendCommand(command) {
        if (!this.isConnected || !this.websocket) {
            this.showNotification('Not connected to cluster', 'warning');
            return;
        }

        if (!command.trim()) {
            return;
        }

        try {
            // Send command via WebSocket
            this.websocket.send(JSON.stringify({
                type: 'command',
                data: command.trim()
            }));

            // Add to terminal
            this.addTerminalLine(`> ${command}`);
        } catch (error) {
            console.error('Error sending command:', error);
            this.showNotification('Failed to send command', 'error');
        }
    },

    /**
     * Add line to terminal output
     */
    addTerminalLine(text) {
        const terminal = document.getElementById('terminal-output');
        const line = document.createElement('div');
        line.textContent = text;
        terminal.appendChild(line);

        // Scroll to bottom
        terminal.scrollTop = terminal.scrollHeight;

        // Limit terminal history
        const maxLines = 1000;
        while (terminal.children.length > maxLines) {
            terminal.removeChild(terminal.firstChild);
        }
    },

    /**
     * Handle status messages from cluster
     */
    handleStatusMessage(status) {
        console.log('Cluster status:', status);
        this.addTerminalLine(`Status: ${status}`);
    },

    /**
     * Filter spots based on current filter settings
     */
    filterSpots() {
        const bandFilter = document.getElementById('band-filter').value;
        const modeFilter = document.getElementById('mode-filter').value;
        
        const rows = document.querySelectorAll('#spots-tbody tr');
        
        rows.forEach(row => {
            this.applyFiltersToRow(row, bandFilter, modeFilter);
        });
    },

    /**
     * Apply filters to a specific row
     */
    applyFiltersToRow(row, bandFilter = null, modeFilter = null) {
        if (row.children.length < 5) return; // Skip header or empty rows
        
        const band = row.children[3].textContent;
        const mode = row.children[4].textContent;
        
        const currentBandFilter = bandFilter || document.getElementById('band-filter').value;
        const currentModeFilter = modeFilter || document.getElementById('mode-filter').value;
        
        const bandMatch = !currentBandFilter || band === currentBandFilter;
        const modeMatch = !currentModeFilter || mode === currentModeFilter;
        
        row.style.display = (bandMatch && modeMatch) ? '' : 'none';
    },

    /**
     * Clear all spots
     */
    clearSpots() {
        this.spots.clear();
        this.refreshSpotsTable();
        this.updateStats();
        this.showNotification('All spots cleared', 'info');
    },

    /**
     * Refresh the spots table
     */
    refreshSpotsTable() {
        const tbody = document.getElementById('spots-tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-8 text-secondary">
                    <i class="fas fa-satellite-dish text-4xl mb-4 block"></i>
                    No spots received yet. Connect to a DX cluster to start monitoring.
                </td>
            </tr>
        `;
    },

    /**
     * Handle double-click on spot row
     */
    handleSpotDoubleClick(row) {
        if (row.children.length < 5) return;
        
        const callsign = row.children[1].textContent;
        const frequency = row.children[2].textContent;
        
        // Show options menu or perform default action
        this.showSpotActions(callsign, frequency, row);
    },

    /**
     * Show spot action menu
     */
    showSpotActions(callsign, frequency, row) {
        // Create context menu
        const menu = document.createElement('div');
        menu.className = 'spot-context-menu';
        menu.innerHTML = `
            <div class="card" style="position: absolute; z-index: 1000; min-width: 200px;">
                <div class="card-body">
                    <h4 class="font-bold mb-4">${callsign} - ${frequency} kHz</h4>
                    <div class="flex flex-col gap-2">
                        <button class="btn btn-primary btn-sm" onclick="window.dxApp.lookupCallsign('${callsign}')">
                            <i class="fas fa-search"></i>
                            Lookup on QRZ
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="window.dxApp.openWavelogLog('${callsign}', '${frequency}')">
                            <i class="fas fa-plus"></i>
                            Log in Wavelog
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="window.dxApp.copyToClipboard('${callsign}')">
                            <i class="fas fa-copy"></i>
                            Copy Callsign
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Position menu
        const rect = row.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.top}px`;
        menu.style.left = `${rect.right + 10}px`;

        // Add to page
        document.body.appendChild(menu);

        // Remove menu when clicking elsewhere
        const removeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', removeMenu);
        }, 100);
    },

    /**
     * Lookup callsign on QRZ
     */
    lookupCallsign(callsign) {
        window.open(`https://www.qrz.com/db/${callsign}`, '_blank');
    },

    /**
     * Open Wavelog logging page
     */
    openWavelogLog(callsign, frequency) {
        if (!this.preferences.wavelogUrl) {
            this.showNotification('Wavelog URL not configured', 'warning');
            return;
        }

        const url = `${this.preferences.wavelogUrl}/index.php/logbook?callsign=${callsign}&frequency=${frequency}`;
        window.open(url, '_blank');
    },

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification(`Copied "${text}" to clipboard`, 'success');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showNotification('Failed to copy to clipboard', 'error');
        }
    }
});

// Add context menu styles
const contextMenuStyles = `
<style>
.spot-context-menu {
    animation: fadeIn 0.2s ease-out;
}

.spot-context-menu .card {
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border-color);
}

@keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', contextMenuStyles);