/**
 * Wavelog API Integration
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

/**
 * Extend the main app with Wavelog-specific functionality
 */
Object.assign(DXClusterApp.prototype, {
    
    /**
     * Test Wavelog connection
     */
    async testWavelogConnection() {
        const url = document.getElementById('wavelog-url').value;
        const apiKey = document.getElementById('wavelog-api-key').value;
        
        if (!url || !apiKey) {
            this.showNotification('Please enter Wavelog URL and API key', 'warning');
            return;
        }

        try {
            this.updateWavelogStatus('connecting');
            
            // Test connection by fetching station info
            const stationInfo = await this.fetchStationInfo(url, apiKey);
            
            if (stationInfo && stationInfo.length > 0) {
                this.updateWavelogStatus('connected');
                this.showNotification('Wavelog connection successful!', 'success');
                
                // Update UI with station info
                const station = stationInfo[0];
                this.addTerminalLine(`Wavelog connected: ${station.station_callsign} (${station.station_gridsquare})`);
            } else {
                throw new Error('No station data received');
            }
        } catch (error) {
            console.error('Wavelog connection test failed:', error);
            this.updateWavelogStatus('error');
            this.showNotification('Wavelog connection failed: ' + error.message, 'error');
        }
    },

    /**
     * Update Wavelog connection status indicator
     */
    updateWavelogStatus(status) {
        const indicator = document.getElementById('wavelog-status');
        const icon = indicator.querySelector('i');
        const text = indicator.querySelector('span');
        
        indicator.className = 'status-indicator';
        
        switch (status) {
            case 'connected':
                indicator.classList.add('status-connected');
                icon.className = 'fas fa-check';
                text.textContent = 'Connected';
                break;
            case 'connecting':
                indicator.classList.add('status-connecting');
                icon.className = 'fas fa-spinner fa-spin';
                text.textContent = 'Testing...';
                break;
            case 'error':
                indicator.classList.add('status-disconnected');
                icon.className = 'fas fa-exclamation-triangle';
                text.textContent = 'Error';
                break;
            default:
                indicator.classList.add('status-disconnected');
                icon.className = 'fas fa-times';
                text.textContent = 'Not Configured';
                break;
        }
    },

    /**
     * Fetch station information from Wavelog
     */
    async fetchStationInfo(url = null, apiKey = null) {
        const wavelogUrl = url || this.preferences.wavelogUrl;
        const wavelogApiKey = apiKey || this.preferences.wavelogApiKey;
        
        if (!wavelogUrl || !wavelogApiKey) {
            throw new Error('Wavelog URL and API key required');
        }

        const apiUrl = `${wavelogUrl}/api/station_info`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: wavelogApiKey
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    },

    /**
     * Check logbook status for a spot
     */
    async checkLogbookStatus(spot) {
        if (!this.preferences.wavelogUrl || !this.preferences.wavelogApiKey) {
            return null;
        }

        try {
            // Check both callsign and grid if available
            const callsignStatus = await this.checkCallsignInLogbook(spot);
            
            // For now, we'll focus on callsign checking
            // Grid checking can be added later when we have grid data
            
            return {
                worked: callsignStatus.worked,
                confirmed: callsignStatus.confirmed,
                newDxcc: !callsignStatus.worked, // Simplified logic
                newBand: callsignStatus.worked && !callsignStatus.workedOnBand,
                newMode: callsignStatus.worked && !callsignStatus.workedOnMode
            };
        } catch (error) {
            console.warn('Failed to check logbook status:', error);
            return null;
        }
    },

    /**
     * Check if callsign is in logbook
     */
    async checkCallsignInLogbook(spot) {
        const apiUrl = `${this.preferences.wavelogUrl}/api/logbook_check_callsign`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: this.preferences.wavelogApiKey,
                logbook_public_slug: this.preferences.wavelogLogbookSlug,
                band: spot.band,
                callsign: spot.callsign
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Parse Wavelog response
        // The exact format may vary, so we'll handle common cases
        return {
            worked: data.worked || false,
            confirmed: data.confirmed || false,
            workedOnBand: data.worked_on_band || false,
            workedOnMode: data.worked_on_mode || false
        };
    },

    /**
     * Check if grid square is in logbook
     */
    async checkGridInLogbook(spot) {
        if (!spot.grid) return null;
        
        const apiUrl = `${this.preferences.wavelogUrl}/api/logbook_check_grid`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: this.preferences.wavelogApiKey,
                logbook_public_slug: this.preferences.wavelogLogbookSlug,
                band: spot.band,
                grid: spot.grid
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    },

    /**
     * Get QSO statistics from Wavelog
     */
    async getWavelogStats() {
        if (!this.preferences.wavelogUrl || !this.preferences.wavelogApiKey) {
            return null;
        }

        try {
            // First get station info to get station_id
            const stationInfo = await this.fetchStationInfo();
            if (!stationInfo || stationInfo.length === 0) {
                throw new Error('No station information available');
            }

            const stationId = stationInfo[0].station_id;
            
            const apiUrl = `${this.preferences.wavelogUrl}/api/get_wp_stats`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    key: this.preferences.wavelogApiKey,
                    station_id: stationId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const stats = await response.json();
            return stats;
        } catch (error) {
            console.warn('Failed to get Wavelog stats:', error);
            return null;
        }
    },

    /**
     * Batch check multiple spots against logbook
     */
    async batchCheckLogbook(spots) {
        if (!this.preferences.wavelogUrl || !this.preferences.wavelogApiKey) {
            return {};
        }

        const results = {};
        const batchSize = 5; // Limit concurrent requests
        
        for (let i = 0; i < spots.length; i += batchSize) {
            const batch = spots.slice(i, i + batchSize);
            
            const promises = batch.map(async (spot) => {
                try {
                    const status = await this.checkLogbookStatus(spot);
                    return { spot, status };
                } catch (error) {
                    console.warn(`Failed to check ${spot.callsign}:`, error);
                    return { spot, status: null };
                }
            });

            const batchResults = await Promise.all(promises);
            
            batchResults.forEach(({ spot, status }) => {
                const key = `${spot.callsign}-${spot.band}-${spot.mode}`;
                results[key] = status;
            });

            // Small delay between batches to avoid overwhelming the API
            if (i + batchSize < spots.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return results;
    },

    /**
     * Update spot statuses with logbook data
     */
    async updateSpotsWithLogbookData() {
        if (!this.preferences.wavelogUrl || !this.preferences.wavelogApiKey) {
            return;
        }

        const spots = Array.from(this.spots.values());
        if (spots.length === 0) return;

        this.showNotification('Checking spots against logbook...', 'info');

        try {
            const results = await this.batchCheckLogbook(spots);
            
            let updatedCount = 0;
            
            for (const [key, spot] of this.spots.entries()) {
                const logbookStatus = results[key];
                if (logbookStatus) {
                    spot.logbookStatus = logbookStatus;
                    spot.status = this.determineSpotStatus(spot);
                    updatedCount++;
                }
            }

            // Refresh the display
            this.refreshSpotsDisplay();
            this.updateStats();
            
            this.showNotification(`Updated ${updatedCount} spots with logbook data`, 'success');
        } catch (error) {
            console.error('Failed to update spots with logbook data:', error);
            this.showNotification('Failed to check logbook data', 'error');
        }
    },

    /**
     * Refresh the spots display with updated data
     */
    refreshSpotsDisplay() {
        const tbody = document.getElementById('spots-tbody');
        tbody.innerHTML = '';

        // Sort spots by timestamp (newest first)
        const sortedSpots = Array.from(this.spots.values())
            .sort((a, b) => b.timestamp - a.timestamp);

        if (sortedSpots.length === 0) {
            this.refreshSpotsTable();
            return;
        }

        // Add each spot to the table
        sortedSpots.forEach(spot => {
            this.addSpotToTable(spot);
        });
    },

    /**
     * Get DXCC entity information for a callsign
     */
    async getDxccInfo(callsign) {
        // This would typically use a DXCC database or API
        // For now, we'll return a placeholder
        // In a full implementation, you might use:
        // - A local DXCC database
        // - An online DXCC API
        // - Integration with contest logging software databases
        
        return {
            entity: 'Unknown',
            continent: 'Unknown',
            cqZone: 0,
            ituZone: 0
        };
    },

    /**
     * Format logbook status for display
     */
    formatLogbookStatus(status) {
        if (!status) return 'Unknown';
        
        if (status.confirmed) return 'Confirmed';
        if (status.worked) return 'Worked';
        return 'New';
    },

    /**
     * Check if spot needs attention based on logbook status
     */
    isSpotNeeded(spot) {
        if (!spot.logbookStatus) return true; // Assume needed if unknown
        
        return spot.logbookStatus.newDxcc || 
               spot.logbookStatus.newBand || 
               spot.logbookStatus.newMode ||
               !spot.logbookStatus.worked;
    }
});

/**
 * Wavelog API Error Handler
 */
class WavelogApiError extends Error {
    constructor(message, status = null, response = null) {
        super(message);
        this.name = 'WavelogApiError';
        this.status = status;
        this.response = response;
    }
}

/**
 * Wavelog API Response Parser
 */
class WavelogResponseParser {
    static parseLogbookCheck(response) {
        // Handle different response formats from Wavelog API
        if (typeof response === 'boolean') {
            return { worked: response, confirmed: false };
        }
        
        if (typeof response === 'object') {
            return {
                worked: response.worked || response.qso_count > 0 || false,
                confirmed: response.confirmed || response.confirmed_count > 0 || false,
                workedOnBand: response.worked_on_band || false,
                workedOnMode: response.worked_on_mode || false
            };
        }
        
        return { worked: false, confirmed: false };
    }
    
    static parseStationInfo(response) {
        if (!Array.isArray(response) || response.length === 0) {
            throw new WavelogApiError('Invalid station info response');
        }
        
        return response.map(station => ({
            id: station.station_id,
            name: station.station_profile_name,
            callsign: station.station_callsign,
            gridsquare: station.station_gridsquare,
            active: station.station_active === '1'
        }));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WavelogApiError, WavelogResponseParser };
}