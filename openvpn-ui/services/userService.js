const { runCommand } = require('./execService');
const config = require('../config');
const fs = require('fs').promises;
const path = require('path');

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {boolean}
 */
function isValidUsername(username) {
  return /^[a-zA-Z0-9-_]+$/.test(username);
}

/**
 * Parse pivpn -l output to extract user list
 * @param {string} output - Raw output from pivpn -l
 * @returns {Array} - Array of user objects
 */
function parseUserList(output) {
  const users = [];
  const lines = output.split('\n');
  
  let inDataSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) continue;
    
    // Skip separator lines
    if (trimmed.match(/^[=:+\-|]+$/)) continue;
    
    // Skip header lines
    if (trimmed.toLowerCase().includes('name') && trimmed.toLowerCase().includes('remote')) {
      inDataSection = true;
      continue;
    }
    
    // Skip footer/info lines
    if (trimmed.includes('pivpn') || trimmed.includes('client') || trimmed.includes('Total')) {
      continue;
    }
    
    if (inDataSection || trimmed.split(/\s+/).length >= 2) {
      // Split by whitespace
      const parts = trimmed.split(/\s+/).filter(p => p.length > 0);
      
      if (parts.length === 0) continue;
      
      const username = parts[0];
      
      // Validate username - skip if it contains special chars or is too short
      if (!username || username.length < 2 || !isValidUsername(username)) {
        continue;
      }
      
      // Check if user is revoked
      const status = trimmed.toLowerCase().includes('revoked') ? 'revoked' : 'active';
      
      // Parse dates if available
      let created = null;
      let expiry = null;
      
      if (parts.length >= 3) {
        // Try to find date-like strings
        for (let i = 1; i < parts.length; i++) {
          if (parts[i].match(/^\d{4}-\d{2}-\d{2}/) || parts[i].match(/^\d{2}\/\d{2}\/\d{4}/)) {
            if (!created) {
              created = parts[i];
            } else if (!expiry) {
              expiry = parts[i];
              break;
            }
          }
        }
      }
      
      users.push({
        username,
        status,
        created: created || 'N/A',
        expiry: expiry || 'N/A',
        raw: trimmed
      });
    }
  }
  
  return users;
}

/**
 * Get list of all VPN users
 * @returns {Promise<Object>}
 */
async function listUsers() {
  try {
    const output = await runCommand('sudo -n pivpn -l');
    const users = parseUserList(output);
    
    return {
      success: true,
      data: users
    };
  } catch (error) {
    if (error.message && error.message.includes('password is required')) {
      return {
        success: false,
        message: 'Sudo password required. Please configure passwordless sudo for pivpn commands.'
      };
    }
    
    return {
      success: false,
      message: error.message || 'Failed to list users'
    };
  }
}

/**
 * Create a new VPN user
 * @param {string} username - Username to create
 * @returns {Promise<Object>}
 */
async function createUser(username) {
  // Validate username
  if (!username || !username.trim()) {
    return {
      success: false,
      message: 'Username is required'
    };
  }
  
  username = username.trim();
  
  if (!isValidUsername(username)) {
    return {
      success: false,
      message: 'Username must contain only letters, numbers, hyphens, and underscores'
    };
  }
  
  if (username.length < 2 || username.length > 32) {
    return {
      success: false,
      message: 'Username must be between 2 and 32 characters'
    };
  }
  
  try {
    // Use -p flag for passwordless (non-interactive) client creation
    const output = await runCommand(`sudo -n pivpn -a -n ${username} -p`);
    
    // Check if user already exists
    if (output.toLowerCase().includes('already exists') || 
        output.toLowerCase().includes('name is already in use')) {
      return {
        success: false,
        message: 'User already exists'
      };
    }
    
    // Check for success indicators
    if (output.toLowerCase().includes('successfully') || 
        output.toLowerCase().includes('done') ||
        output.toLowerCase().includes('complete')) {
      return {
        success: true,
        message: `User ${username} created successfully`,
        data: { username }
      };
    }
    
    // If no clear success/failure, assume success if no error was thrown
    return {
      success: true,
      message: `User ${username} created`,
      data: { username }
    };
    
  } catch (error) {
    if (error.message && error.message.includes('password is required')) {
      return {
        success: false,
        message: 'Sudo password required. Please configure passwordless sudo for pivpn commands.'
      };
    }
    
    return {
      success: false,
      message: error.message || 'Failed to create user'
    };
  }
}

/**
 * Revoke/remove a VPN user
 * @param {string} username - Username to revoke
 * @returns {Promise<Object>}
 */
async function revokeUser(username) {
  // Validate username
  if (!username || !username.trim()) {
    return {
      success: false,
      message: 'Username is required'
    };
  }
  
  username = username.trim();
  
  if (!isValidUsername(username)) {
    return {
      success: false,
      message: 'Invalid username format'
    };
  }
  
  try {
    // Use yes to auto-confirm and -y flag for non-interactive revoke
    const output = await runCommand(`yes | sudo -n pivpn -r ${username}`);
    
    // Try to delete config file from ovpns directory
    try {
      const configPath = path.join(config.OVPN_CONFIG_DIR, `${username}.ovpn`);
      await fs.unlink(configPath);
    } catch (err) {
      // Ignore if file doesn't exist or can't be deleted
    }
    
    return {
      success: true,
      message: `User ${username} revoked successfully`,
      data: { username }
    };
    
  } catch (error) {
    if (error.message && error.message.includes('password is required')) {
      return {
        success: false,
        message: 'Sudo password required. Please configure passwordless sudo for pivpn commands.'
      };
    }
    
    return {
      success: false,
      message: error.message || 'Failed to revoke user'
    };
  }
}

/**
 * Check if user config file exists
 * @param {string} username - Username to check
 * @returns {Promise<boolean>}
 */
async function userConfigExists(username) {
  try {
    const configPath = path.join(config.OVPN_CONFIG_DIR, `${username}.ovpn`);
    await fs.access(configPath);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  listUsers,
  createUser,
  revokeUser,
  userConfigExists,
  isValidUsername
};
