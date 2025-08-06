/**
 * User Authentication Module
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.user = null;
        this.checkSession();
    }
    
    /**
     * Check current session status
     */
    async checkSession() {
        try {
            const response = await fetch('api/auth.php?action=session');
            
            // Check if response is valid JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('Session check returned non-JSON response');
                this.isAuthenticated = false;
                this.user = null;
                this.updateUI();
                return false;
            }
            
            const data = await response.json();
            
            if (data.authenticated) {
                this.isAuthenticated = true;
                this.user = data.user;
                this.updateUI();
                return true;
            } else {
                this.isAuthenticated = false;
                this.user = null;
                this.updateUI();
                return false;
            }
        } catch (error) {
            console.error('Session check failed:', error);
            this.isAuthenticated = false;
            this.user = null;
            this.updateUI();
            return false;
        }
    }
    
    /**
     * User login
     */
    async login(callsign, password) {
        try {
            const response = await fetch('api/auth.php?action=login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    callsign: callsign,
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.isAuthenticated = true;
                this.user = data.user;
                this.updateUI();
                this.showNotification('Login successful', 'success');
                return { success: true, user: data.user };
            } else {
                this.showNotification(data.error || 'Login failed', 'error');
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed: ' + error.message, 'error');
            return { success: false, error: error.message };
        }
    }
    
    /**
     * User registration
     */
    async register(callsign, email, password) {
        try {
            const response = await fetch('api/auth.php?action=register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    callsign: callsign,
                    email: email,
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Registration successful', 'success');
                return { success: true, user: data.user };
            } else {
                this.showNotification(data.error || 'Registration failed', 'error');
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification('Registration failed: ' + error.message, 'error');
            return { success: false, error: error.message };
        }
    }
    
    /**
     * User logout
     */
    async logout() {
        try {
            const response = await fetch('api/auth.php?action=logout', {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.isAuthenticated = false;
                this.user = null;
                this.updateUI();
                this.showNotification('Logout successful', 'info');
                return { success: true };
            } else {
                this.showNotification(data.error || 'Logout failed', 'error');
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.showNotification('Logout failed: ' + error.message, 'error');
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Change password
     */
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await fetch('api/auth.php?action=change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Password changed successfully', 'success');
                return { success: true };
            } else {
                this.showNotification(data.error || 'Password change failed', 'error');
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Password change error:', error);
            this.showNotification('Password change failed: ' + error.message, 'error');
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get user profile
     */
    async getProfile() {
        try {
            const response = await fetch('api/auth.php?action=profile');
            const data = await response.json();
            
            if (data.user) {
                this.user = data.user;
                return { success: true, user: data.user };
            } else {
                this.showNotification(data.error || 'Failed to get profile', 'error');
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Profile error:', error);
            this.showNotification('Failed to get profile: ' + error.message, 'error');
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Update UI based on authentication status
     */
    updateUI() {
        // Update user menu
        const userCallsignElement = document.getElementById('user-callsign');
        if (userCallsignElement) {
            userCallsignElement.textContent = this.user ? this.user.callsign : 'Guest';
        }
        
        // Update login/logout buttons if they exist
        const loginButton = document.getElementById('login-button');
        const logoutButton = document.getElementById('logout-button');
        
        if (loginButton) {
            loginButton.style.display = this.isAuthenticated ? 'none' : 'inline-block';
        }
        
        if (logoutButton) {
            logoutButton.style.display = this.isAuthenticated ? 'inline-block' : 'none';
        }
        
        // Update user-specific sections
        const userSections = document.querySelectorAll('.user-section');
        userSections.forEach(section => {
            section.style.display = this.isAuthenticated ? 'block' : 'none';
        });
    }
    
    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        if (window.dxApp && typeof window.dxApp.showNotification === 'function') {
            window.dxApp.showNotification(message, type);
        } else {
            // Fallback notification
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.isAuthenticated;
    }
    
    /**
     * Get current user
     */
    getUser() {
        return this.user;
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}