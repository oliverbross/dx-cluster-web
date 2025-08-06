/**
 * Enhanced DX Spot Parser for Real-time Processing
 *
 * @author Kilo Code
 * @version 1.0.0
 */

class DXSpotParser {
    /**
     * Parse raw spot data into structured format
     */
    static parseSpotData(rawData) {
        try {
            // Handle different spot formats
            // Common format: "DX de SPOTTER: FREQ CALLSIGN COMMENT TIME"
            // Example: "DX de W1AW: 14205.0 JA1ABC CQ DX 1234Z"
            
            // Try multiple regex patterns for different cluster formats
            const patterns = [
                // Standard DX spot format
                /DX de\s+(\w+):\s+(\d+\.?\d*)\s+(\w+)\s+(.*?)\s+(\d{4}Z)/i,
                
                // Alternative format with date
                /DX de\s+(\w+):\s+(\d+\.?\d*)\s+(\w+)\s+(.*?)\s+(\d{4}Z)\s+(\d{2}-\w{3})/i,
                
                // Format without time
                /DX de\s+(\w+):\s+(\d+\.?\d*)\s+(\w+)\s+(.*)/i,
                
                // Very basic format
                /DX de\s+(\w+):\s+(\d+\.?\d*)\s+(\w+)/i
            ];
            
            let match = null;
            let patternIndex = 0;
            
            for (let i = 0; i < patterns.length; i++) {
                match = rawData.match(patterns[i]);
                if (match) {
                    patternIndex = i;
                    break;
                }
            }
            
            if (!match) {
                console.warn('Could not parse spot:', rawData);
                return null;
            }
            
            let spotter, frequency, callsign, comment, time, date;
            
            switch (patternIndex) {
                case 0: // Standard format
                    [, spotter, frequency, callsign, comment, time] = match;
                    break;
                case 1: // Format with date
                    [, spotter, frequency, callsign, comment, time, date] = match;
                    break;
                case 2: // Format without time
                    [, spotter, frequency, callsign, comment] = match;
                    time = this.getCurrentTime();
                    break;
                case 3: // Very basic format
                    [, spotter, frequency, callsign] = match;
                    comment = '';
                    time = this.getCurrentTime();
                    break;
            }
            
            // Determine band from frequency
            const band = this.frequencyToBand(parseFloat(frequency));
            
            // Determine mode from comment or frequency
            const mode = this.determineMode(comment, frequency);
            
            // Extract additional information from comment
            const additionalInfo = this.extractAdditionalInfo(comment);
            
            return {
                callsign: callsign.toUpperCase(),
                frequency: parseFloat(frequency),
                spotter: spotter.toUpperCase(),
                comment: comment.trim(),
                time: time || this.getCurrentTime(),
                date: date,
                band: band,
                mode: mode,
                ...additionalInfo,
                rawData: rawData,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error parsing spot data:', error);
            return null;
        }
    }
    
    /**
     * Get current time in HHMMZ format
     */
    static getCurrentTime() {
        const now = new Date();
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        return `${hours}${minutes}Z`;
    }
    
    /**
     * Convert frequency to band
     */
    static frequencyToBand(frequency) {
        const bands = [
            { min: 1800, max: 2000, band: '160m' },
            { min: 3500, max: 4000, band: '80m' },
            { min: 7000, max: 7300, band: '40m' },
            { min: 10100, max: 10150, band: '30m' },
            { min: 14000, max: 14350, band: '20m' },
            { min: 18068, max: 18168, band: '17m' },
            { min: 21000, max: 21450, band: '15m' },
            { min: 24890, max: 24990, band: '12m' },
            { min: 28000, max: 29700, band: '10m' },
            { min: 50000, max: 54000, band: '6m' },
            { min: 144000, max: 148000, band: '2m' },
            { min: 420000, max: 450000, band: '70cm' }
        ];
        
        for (const bandInfo of bands) {
            if (frequency >= bandInfo.min && frequency <= bandInfo.max) {
                return bandInfo.band;
            }
        }
        
        return 'Unknown';
    }
    
    /**
     * Determine mode from comment and frequency
     */
    static determineMode(comment, frequency) {
        const commentUpper = comment.toUpperCase();
        
        // Check for explicit mode indicators
        if (commentUpper.includes('CW') || commentUpper.includes('QRS')) return 'CW';
        if (commentUpper.includes('SSB') || commentUpper.includes('PHONE')) return 'SSB';
        if (commentUpper.includes('FT8')) return 'FT8';
        if (commentUpper.includes('FT4')) return 'FT4';
        if (commentUpper.includes('RTTY')) return 'RTTY';
        if (commentUpper.includes('PSK31') || commentUpper.includes('PSK')) return 'PSK31';
        if (commentUpper.includes('JT65')) return 'JT65';
        if (commentUpper.includes('JT9')) return 'JT9';
        if (commentUpper.includes('MFSK')) return 'MFSK';
        if (commentUpper.includes('OLIVIA')) return 'OLIVIA';
        if (commentUpper.includes('CONTESTIA')) return 'CONTESTIA';
        if (commentUpper.includes('JS8')) return 'JS8';
        if (commentUpper.includes('WSPR')) return 'WSPR';
        
        // Guess based on frequency (rough approximation)
        const freq = parseFloat(frequency);
        
        // CW portions of bands (simplified)
        if ((freq >= 1800 && freq <= 1840) ||
            (freq >= 3500 && freq <= 3600) ||
            (freq >= 7000 && freq <= 7040) ||
            (freq >= 10100 && freq <= 10140) ||
            (freq >= 14000 && freq <= 14070) ||
            (freq >= 18068 && freq <= 18100) ||
            (freq >= 21000 && freq <= 21070) ||
            (freq >= 24890 && freq <= 24920) ||
            (freq >= 28000 && freq <= 28070)) {
            return 'CW';
        }
        
        // Digital portions
        if ((freq >= 14070 && freq <= 14095) ||
            (freq >= 21070 && freq <= 21110) ||
            (freq >= 28070 && freq <= 28120)) {
            return 'DIGITAL';
        }
        
        // Default to SSB for voice portions
        return 'SSB';
    }
    
    /**
     * Extract additional information from comment
     */
    static extractAdditionalInfo(comment) {
        const info = {
            isContest: false,
            isQrp: false,
            isRbn: false,
            gridSquare: null,
            dxccEntity: null,
            cqZone: null,
            ituZone: null
        };
        
        const commentUpper = comment.toUpperCase();
        
        // Check for contest indicators
        if (commentUpper.includes('CQ') || 
            commentUpper.includes('CONTEST') || 
            commentUpper.includes('TEST')) {
            info.isContest = true;
        }
        
        // Check for QRP indicators
        if (commentUpper.includes('QRP') || 
            commentUpper.includes('LOW POWER')) {
            info.isQrp = true;
        }
        
        // Check for RBN indicators
        if (commentUpper.includes('RBN')) {
            info.isRbn = true;
        }
        
        // Extract grid square (4 or 6 character grid)
        const gridMatch = comment.match(/[A-R]{2}\d{2}([A-X]{2})?/i);
        if (gridMatch) {
            info.gridSquare = gridMatch[0].toUpperCase();
        }
        
        return info;
    }
    
    /**
     * Validate spot data
     */
    static validateSpot(spot) {
        if (!spot) return false;
        
        // Validate callsign
        if (!spot.callsign || spot.callsign.length < 3 || spot.callsign.length > 10) {
            return false;
        }
        
        // Validate frequency
        if (!spot.frequency || spot.frequency < 1000 || spot.frequency > 1000000) {
            return false;
        }
        
        // Validate spotter
        if (!spot.spotter || spot.spotter.length < 3 || spot.spotter.length > 10) {
            return false;
        }
        
        // Validate band
        if (!spot.band || spot.band === 'Unknown') {
            return false;
        }
        
        return true;
    }
    
    /**
     * Format spot for display
     */
    static formatSpotForDisplay(spot) {
        return {
            time: this.formatSpotTime(spot.time),
            callsign: spot.callsign,
            frequency: spot.frequency.toFixed(1),
            band: spot.band,
            mode: spot.mode,
            spotter: spot.spotter,
            comment: spot.comment,
            gridSquare: spot.gridSquare || '',
            isContest: spot.isContest ? '✓' : '',
            isQrp: spot.isQrp ? 'QRP' : '',
            isRbn: spot.isRbn ? 'RBN' : ''
        };
    }
    
    /**
     * Format spot time for display
     */
    static formatSpotTime(timeStr) {
        // Convert "1234Z" to "12:34"
        if (timeStr && timeStr.length === 5 && timeStr.endsWith('Z')) {
            const hours = timeStr.substring(0, 2);
            const minutes = timeStr.substring(2, 4);
            return `${hours}:${minutes}`;
        }
        return timeStr || '';
    }
    
    /**
     * Compare spots for deduplication
     */
    static areSpotsSimilar(spot1, spot2, timeWindow = 300000) { // 5 minutes default
        if (!spot1 || !spot2) return false;
        
        // Check if same callsign, band, and mode
        if (spot1.callsign !== spot2.callsign ||
            spot1.band !== spot2.band ||
            spot1.mode !== spot2.mode) {
            return false;
        }
        
        // Check if within time window
        if (Math.abs(spot1.timestamp - spot2.timestamp) > timeWindow) {
            return false;
        }
        
        return true;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DXSpotParser;
}