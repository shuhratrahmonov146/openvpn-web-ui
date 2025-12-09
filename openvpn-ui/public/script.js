// ========================================
// OpenVPN Management UI - Client-side JavaScript
// ========================================

// Global state
let loadingOverlay = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('OpenVPN UI initialized');
    checkServerStatus();
});

/**
 * Check server status and update indicator
 */
async function checkServerStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        const statusIndicator = document.getElementById('serverStatus');
        const statusText = statusIndicator.querySelector('.status-text');
        
        if (data.success && data.data && data.data.active) {
            statusIndicator.classList.add('online');
            statusIndicator.classList.remove('offline');
            statusText.textContent = 'Online';
            
            // Update service status on dashboard if element exists
            const serviceStatus = document.getElementById('serviceStatus');
            if (serviceStatus) {
                serviceStatus.innerHTML = '<span style="color: var(--success-color)">✓ Active</span>';
            }
        } else {
            statusIndicator.classList.add('offline');
            statusIndicator.classList.remove('online');
            statusText.textContent = 'Offline';
            
            const serviceStatus = document.getElementById('serviceStatus');
            if (serviceStatus) {
                serviceStatus.innerHTML = '<span style="color: var(--danger-color)">✗ Inactive</span>';
            }
        }
    } catch (error) {
        console.error('Error checking server status:', error);
        
        const statusIndicator = document.getElementById('serverStatus');
        const statusText = statusIndicator.querySelector('.status-text');
        
        statusIndicator.classList.add('offline');
        statusIndicator.classList.remove('online');
        statusText.textContent = 'Error';
    }
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast (success, error, info)
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    
    if (!toast) {
        console.error('Toast element not found');
        return;
    }
    
    // Remove existing classes
    toast.className = 'toast';
    
    // Add type class
    toast.classList.add(type);
    
    // Set message
    toast.textContent = message;
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Hide toast after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

/**
 * Show loading overlay
 * @param {string} message - Loading message
 */
function showLoading(message = 'Loading...') {
    // Remove existing overlay if any
    hideLoading();
    
    // Create overlay
    loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div style="text-align: center; color: white;">
            <div class="loading-spinner"></div>
            <p style="margin-top: 1rem; font-size: 1.125rem;">${message}</p>
        </div>
    `;
    
    document.body.appendChild(loadingOverlay);
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    if (loadingOverlay && loadingOverlay.parentNode) {
        loadingOverlay.parentNode.removeChild(loadingOverlay);
        loadingOverlay = null;
    }
}

/**
 * Format timestamp for display
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {boolean} True if valid
 */
function validateUsername(username) {
    const regex = /^[a-zA-Z0-9-_]+$/;
    return regex.test(username);
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard', 'success');
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        showToast('Failed to copy to clipboard', 'error');
    }
}

/**
 * Download text as file
 * @param {string} filename - Name of file
 * @param {string} content - Content of file
 */
function downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Format bytes to human-readable size
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted size
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format uptime in seconds to human-readable format
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted uptime
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || '0m';
}

/**
 * Parse query parameters from URL
 * @returns {Object} Query parameters
 */
function getQueryParams() {
    const params = {};
    const queryString = window.location.search.substring(1);
    const pairs = queryString.split('&');
    
    for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key) {
            params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
    }
    
    return params;
}

/**
 * Handle API errors consistently
 * @param {Error} error - Error object
 * @param {string} defaultMessage - Default error message
 */
function handleApiError(error, defaultMessage = 'An error occurred') {
    console.error('API Error:', error);
    
    let message = defaultMessage;
    
    if (error.message) {
        message = error.message;
    }
    
    showToast(message, 'error');
}

/**
 * Confirm action with user
 * @param {string} message - Confirmation message
 * @returns {boolean} True if confirmed
 */
function confirmAction(message) {
    return confirm(message);
}

/**
 * Auto-refresh status periodically
 */
function startStatusAutoRefresh(interval = 30000) {
    setInterval(() => {
        checkServerStatus();
    }, interval);
}

// Start auto-refresh for server status
startStatusAutoRefresh();

// Export functions for use in other scripts
window.openVpnUI = {
    showToast,
    showLoading,
    hideLoading,
    checkServerStatus,
    validateUsername,
    copyToClipboard,
    downloadTextFile,
    formatBytes,
    formatUptime,
    formatTimestamp,
    getQueryParams,
    handleApiError,
    confirmAction,
    debounce
};
