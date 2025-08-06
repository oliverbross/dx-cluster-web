/**
 * UI Helper Functions and Components
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

/**
 * Extend the main app with UI-specific functionality
 */
Object.assign(DXClusterApp.prototype, {
    
    /**
     * Show settings section
     */
    showSettings() {
        this.showSection('settings');
    },

    /**
     * Initialize sortable table headers
     */
    initializeSortableTable() {
        const table = document.getElementById('spots-table');
        const headers = table.querySelectorAll('th');
        
        headers.forEach((header, index) => {
            if (index < 7) { // Skip the last column (actions)
                header.style.cursor = 'pointer';
                header.innerHTML += ' <i class="fas fa-sort sort-icon"></i>';
                
                header.addEventListener('click', () => {
                    this.sortTable(index, header);
                });
            }
        });
    },

    /**
     * Sort table by column
     */
    sortTable(columnIndex, header) {
        const table = document.getElementById('spots-table');
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        // Skip if no data rows
        if (rows.length === 0 || (rows.length === 1 && rows[0].children.length === 1)) {
            return;
        }

        // Determine sort direction
        const currentSort = header.dataset.sort || 'none';
        const newSort = currentSort === 'asc' ? 'desc' : 'asc';
        
        // Update header icons
        table.querySelectorAll('.sort-icon').forEach(icon => {
            icon.className = 'fas fa-sort sort-icon';
        });
        
        const icon = header.querySelector('.sort-icon');
        icon.className = `fas fa-sort-${newSort === 'asc' ? 'up' : 'down'} sort-icon`;
        header.dataset.sort = newSort;

        // Sort rows
        rows.sort((a, b) => {
            const aValue = this.getCellValue(a, columnIndex);
            const bValue = this.getCellValue(b, columnIndex);
            
            let comparison = 0;
            
            // Handle different data types
            if (columnIndex === 0) { // Time
                comparison = this.compareTime(aValue, bValue);
            } else if (columnIndex === 2) { // Frequency
                comparison = parseFloat(aValue) - parseFloat(bValue);
            } else {
                comparison = aValue.localeCompare(bValue);
            }
            
            return newSort === 'asc' ? comparison : -comparison;
        });

        // Reorder table rows
        rows.forEach(row => tbody.appendChild(row));
    },

    /**
     * Get cell value for sorting
     */
    getCellValue(row, columnIndex) {
        const cell = row.children[columnIndex];
        return cell ? cell.textContent.trim() : '';
    },

    /**
     * Compare time values for sorting
     */
    compareTime(a, b) {
        // Convert "HH:MM" to minutes for comparison
        const timeToMinutes = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        };
        
        return timeToMinutes(a) - timeToMinutes(b);
    },

    /**
     * Initialize resizable columns
     */
    initializeResizableColumns() {
        const table = document.getElementById('spots-table');
        const headers = table.querySelectorAll('th');
        
        headers.forEach((header, index) => {
            if (index < headers.length - 1) { // Skip last column
                const resizer = document.createElement('div');
                resizer.className = 'column-resizer';
                resizer.style.cssText = `
                    position: absolute;
                    right: 0;
                    top: 0;
                    width: 5px;
                    height: 100%;
                    cursor: col-resize;
                    background: transparent;
                `;
                
                header.style.position = 'relative';
                header.appendChild(resizer);
                
                this.makeColumnResizable(header, resizer);
            }
        });
    },

    /**
     * Make column resizable
     */
    makeColumnResizable(header, resizer) {
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = header.offsetWidth;
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            e.preventDefault();
        });

        const handleMouseMove = (e) => {
            if (!isResizing) return;
            
            const width = startWidth + (e.clientX - startX);
            if (width > 50) { // Minimum width
                header.style.width = width + 'px';
            }
        };

        const handleMouseUp = () => {
            isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    },

    /**
     * Initialize keyboard shortcuts
     */
    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when not typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key) {
                case '1':
                    this.showSection('dashboard');
                    break;
                case '2':
                    this.showSection('spots');
                    break;
                case '3':
                    this.showSection('terminal');
                    break;
                case '4':
                    this.showSection('settings');
                    break;
                case 'c':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.connectToCluster();
                    }
                    break;
                case 'd':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.disconnectFromCluster();
                    }
                    break;
                case 'Escape':
                    // Close any open modals or menus
                    document.querySelectorAll('.spot-context-menu').forEach(menu => {
                        menu.remove();
                    });
                    break;
            }
        });
    },

    /**
     * Initialize tooltips
     */
    initializeTooltips() {
        // Simple tooltip implementation
        const addTooltip = (element, text) => {
            element.addEventListener('mouseenter', (e) => {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = text;
                tooltip.style.cssText = `
                    position: absolute;
                    background: var(--gray-900);
                    color: var(--white);
                    padding: var(--space-2) var(--space-3);
                    border-radius: var(--radius);
                    font-size: 0.75rem;
                    z-index: 10000;
                    pointer-events: none;
                    white-space: nowrap;
                `;
                
                document.body.appendChild(tooltip);
                
                const rect = e.target.getBoundingClientRect();
                tooltip.style.left = rect.left + 'px';
                tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
                
                e.target.addEventListener('mouseleave', () => {
                    tooltip.remove();
                }, { once: true });
            });
        };

        // Add tooltips to buttons
        document.querySelectorAll('[data-tooltip]').forEach(element => {
            addTooltip(element, element.dataset.tooltip);
        });
    },

    /**
     * Initialize search functionality
     */
    initializeSearch() {
        // Add search input to spots section
        const spotsHeader = document.querySelector('#spots-section .card-header .flex');
        if (spotsHeader) {
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.className = 'form-input';
            searchInput.placeholder = 'Search callsigns...';
            searchInput.style.width = '200px';
            searchInput.id = 'spot-search';
            
            spotsHeader.insertBefore(searchInput, spotsHeader.lastElementChild);
            
            // Add search functionality
            searchInput.addEventListener('input', (e) => {
                this.searchSpots(e.target.value);
            });
        }
    },

    /**
     * Search spots by callsign
     */
    searchSpots(searchTerm) {
        const rows = document.querySelectorAll('#spots-tbody tr');
        const term = searchTerm.toLowerCase();
        
        rows.forEach(row => {
            if (row.children.length < 5) return; // Skip header rows
            
            const callsign = row.children[1].textContent.toLowerCase();
            const spotter = row.children[5].textContent.toLowerCase();
            const comment = row.children[6].textContent.toLowerCase();
            
            const matches = !term || 
                           callsign.includes(term) || 
                           spotter.includes(term) || 
                           comment.includes(term);
            
            row.style.display = matches ? '' : 'none';
        });
    },

    /**
     * Initialize auto-refresh functionality
     */
    initializeAutoRefresh() {
        // Add auto-refresh toggle to dashboard
        const dashboardCard = document.querySelector('#dashboard-section .card-header');
        if (dashboardCard) {
            const refreshToggle = document.createElement('div');
            refreshToggle.className = 'flex items-center gap-2';
            refreshToggle.innerHTML = `
                <label class="text-sm">Auto-refresh:</label>
                <input type="checkbox" id="auto-refresh-toggle" checked>
                <select id="refresh-interval" class="form-select" style="width: auto;">
                    <option value="30">30s</option>
                    <option value="60" selected>1m</option>
                    <option value="300">5m</option>
                    <option value="600">10m</option>
                </select>
            `;
            
            dashboardCard.appendChild(refreshToggle);
            
            // Handle auto-refresh
            let refreshInterval = null;
            
            const startAutoRefresh = () => {
                const interval = parseInt(document.getElementById('refresh-interval').value) * 1000;
                refreshInterval = setInterval(() => {
                    this.updateStats();
                    if (this.preferences.wavelogApiKey) {
                        this.updateSpotsWithLogbookData();
                    }
                }, interval);
            };
            
            const stopAutoRefresh = () => {
                if (refreshInterval) {
                    clearInterval(refreshInterval);
                    refreshInterval = null;
                }
            };
            
            document.getElementById('auto-refresh-toggle').addEventListener('change', (e) => {
                if (e.target.checked) {
                    startAutoRefresh();
                } else {
                    stopAutoRefresh();
                }
            });
            
            document.getElementById('refresh-interval').addEventListener('change', () => {
                if (document.getElementById('auto-refresh-toggle').checked) {
                    stopAutoRefresh();
                    startAutoRefresh();
                }
            });
            
            // Start auto-refresh by default
            startAutoRefresh();
        }
    },

    /**
     * Initialize responsive behavior
     */
    initializeResponsive() {
        const handleResize = () => {
            const width = window.innerWidth;
            
            // Hide/show columns on mobile
            const table = document.getElementById('spots-table');
            if (table) {
                const headers = table.querySelectorAll('th');
                const rows = table.querySelectorAll('tbody tr');
                
                if (width < 768) {
                    // Hide less important columns on mobile
                    [4, 5, 6].forEach(index => { // Mode, Spotter, Comment
                        if (headers[index]) headers[index].style.display = 'none';
                        rows.forEach(row => {
                            if (row.children[index]) {
                                row.children[index].style.display = 'none';
                            }
                        });
                    });
                } else {
                    // Show all columns on desktop
                    headers.forEach(header => header.style.display = '');
                    rows.forEach(row => {
                        Array.from(row.children).forEach(cell => {
                            cell.style.display = '';
                        });
                    });
                }
            }
        };
        
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial call
    },

    /**
     * Initialize all UI enhancements
     */
    initializeUIEnhancements() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupUIEnhancements();
            });
        } else {
            this.setupUIEnhancements();
        }
    },

    /**
     * Setup all UI enhancements
     */
    setupUIEnhancements() {
        this.initializeSortableTable();
        this.initializeResizableColumns();
        this.initializeKeyboardShortcuts();
        this.initializeTooltips();
        this.initializeSearch();
        this.initializeAutoRefresh();
        this.initializeResponsive();
        
        console.log('✅ UI enhancements initialized');
    }
});

/**
 * UI Utility Functions
 */
const UIUtils = {
    /**
     * Create a modal dialog
     */
    createModal(title, content, actions = []) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="card">
                    <div class="card-header">
                        <h3 class="font-bold">${title}</h3>
                        <button class="modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="card-body">
                        ${content}
                    </div>
                    ${actions.length > 0 ? `
                        <div class="card-footer">
                            <div class="flex gap-2 justify-end">
                                ${actions.map(action => `
                                    <button class="btn ${action.class || 'btn-outline'}" 
                                            onclick="${action.onclick || ''}">${action.text}</button>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Add modal styles
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const dialog = modal.querySelector('.modal-dialog');
        dialog.style.cssText = `
            max-width: 500px;
            width: 90%;
            max-height: 90%;
            overflow-y: auto;
        `;
        
        // Close functionality
        const closeModal = () => modal.remove();
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        document.body.appendChild(modal);
        return modal;
    },

    /**
     * Show confirmation dialog
     */
    confirm(message, onConfirm, onCancel = null) {
        const modal = this.createModal('Confirm', `<p>${message}</p>`, [
            {
                text: 'Cancel',
                class: 'btn-outline',
                onclick: `this.closest('.modal-overlay').remove(); ${onCancel ? onCancel : ''}`
            },
            {
                text: 'Confirm',
                class: 'btn-primary',
                onclick: `this.closest('.modal-overlay').remove(); ${onConfirm}`
            }
        ]);
        
        return modal;
    },

    /**
     * Format frequency for display
     */
    formatFrequency(freq) {
        if (freq >= 1000) {
            return (freq / 1000).toFixed(3) + ' MHz';
        }
        return freq.toFixed(1) + ' kHz';
    },

    /**
     * Format time ago
     */
    timeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }
};

// Make UIUtils available globally
window.UIUtils = UIUtils;