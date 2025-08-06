/**
 * Authentication UI Module
 * Handles login/register modals and user interactions
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize authentication UI
    initAuthUI();
});

function initAuthUI() {
    // Get DOM elements
    const userMenu = document.getElementById('user-menu');
    const userDropdown = document.getElementById('user-dropdown');
    const logoutLink = document.getElementById('logout-link');
    const profileLink = document.getElementById('profile-link');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const changePasswordForm = document.getElementById('change-password-form');
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    const changePasswordModal = document.getElementById('change-password-modal');
    
    // User menu toggle
    if (userMenu) {
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
        });
    }
    
    // Close dropdown when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (userDropdown && !userMenu.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.style.display = 'none';
        }
    });
    
    // Logout
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await window.authManager.logout();
            userDropdown.style.display = 'none';
        });
    }
    
    // Profile
    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            showChangePasswordModal();
            userDropdown.style.display = 'none';
        });
    }
    
    // Show register modal
    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            hideLoginModal();
            showRegisterModal();
        });
    }
    
    // Show login modal
    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            hideRegisterModal();
            showLoginModal();
        });
    }
    
    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const callsign = document.getElementById('login-callsign').value;
            const password = document.getElementById('login-password').value;
            
            const result = await window.authManager.login(callsign, password);
            if (result.success) {
                hideLoginModal();
                // Reset form
                loginForm.reset();
            }
        });
    }
    
    // Register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const callsign = document.getElementById('register-callsign').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            
            if (password !== confirmPassword) {
                showNotification('Passwords do not match', 'error');
                return;
            }
            
            const result = await window.authManager.register(callsign, email, password);
            if (result.success) {
                hideRegisterModal();
                showNotification('Registration successful! Please login.', 'success');
                // Reset form
                registerForm.reset();
            }
        });
    }
    
    // Change password form submission
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmNewPassword = document.getElementById('confirm-new-password').value;
            
            if (newPassword !== confirmNewPassword) {
                showNotification('New passwords do not match', 'error');
                return;
            }
            
            const result = await window.authManager.changePassword(currentPassword, newPassword);
            if (result.success) {
                hideChangePasswordModal();
                // Reset form
                changePasswordForm.reset();
            }
        });
    }
    
    // Close modals when clicking overlay
    const modals = [loginModal, registerModal, changePasswordModal];
    modals.forEach(modal => {
        if (modal) {
            const overlay = modal.querySelector('.modal-overlay');
            if (overlay) {
                overlay.addEventListener('click', () => {
                    modal.style.display = 'none';
                });
            }
        }
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideLoginModal();
            hideRegisterModal();
            hideChangePasswordModal();
        }
    });
}

// Modal functions
function showLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showRegisterModal() {
    const modal = document.getElementById('register-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideRegisterModal() {
    const modal = document.getElementById('register-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    if (window.dxApp && typeof window.dxApp.showNotification === 'function') {
        window.dxApp.showNotification(message, type);
    } else {
        // Fallback notification
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// Export functions for use in other modules
window.showLoginModal = showLoginModal;
window.showRegisterModal = showRegisterModal;
window.showChangePasswordModal = showChangePasswordModal;