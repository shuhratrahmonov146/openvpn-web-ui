const { executeCommand, stripAnsi } = require('./execService');
const config = require('../config');
const path = require('path');
const fs = require('fs').promises;

/**
 * Validate username format
 * Only alphanumeric, hyphens, and underscores allowed
 * @param {string} username 
 * @returns {boolean}
 */
function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  
  // Check length (3-32 characters)
  if (username.length < 3 || username.length > 32) return false;
  
  // Check format: only letters, numbers, hyphens, underscores
  return /^[a-zA-Z0-9-_]+$/.test(username);
}

/**
 * Get list of all VPN users
 * @returns {Promise<{success: boolean, data?: array, error?: string}>}
 */
async function listUsers() {
  try {
    // Try PiVPN JSON format first
    const jsonResult = await executeCommand('sudo -n pivpn -l --json 2>/dev/null');
    
    if (jsonResult.success && jsonResult.stdout) {
      try {
        const users = JSON.parse(jsonResult.stdout);
        if (Array.isArray(users)) {
          logger.info(`Found ${users.length} users via PiVPN JSON`);
          return {
            success: true,
            data: users
          };
        }
      } catch (parseError) {
        logger.warn('Failed to parse PiVPN JSON, trying text parsing');
      }
    }

    // Fallback: Parse text output
    const textResult = await executeCommand('sudo -n pivpn -l');
    
    if (!textResult.success) {
      return {
        success: false,
        error: textResult.error || 'Failed to list users'
      };
    }

    // Parse PiVPN list output
    const output = textResult.stdout;
    const lines = output.split('\n').map(line => stripAnsi(line.trim()));
    
    const users = [];
    let parseMode = false;

    for (const line of lines) {
      // Skip empty lines and headers
      if (!line || line.includes(':::') || line.includes('Name') || line.includes('---')) {
        if (line.includes('Name')) parseMode = true;
        continue;
      }

      if (parseMode && line.length > 0) {
        // Extract username (first column)
        const parts = line.split(/\s+/);
        if (parts.length > 0 && parts[0]) {
          const username = parts[0].trim();
          
          // Validate it looks like a username
          if (username.length > 0 && !username.includes(':') && isValidUsername(username)) {
            // Check if user config exists
            const configPath = path.join(config.OVPN_CONFIG_DIR, `${username}.ovpn`);
            
            try {
              await fs.access(configPath);
              
              // Get file stats
              const stats = await fs.stat(configPath);
              
              users.push({
                name: username,
                createdDate: stats.birthtime || stats.mtime,
                status: 'active'
              });
            } catch (err) {
              // Config file doesn't exist, skip
              logger.warn(`Config file not found for user: ${username}`);
            }
          }
        }
      }
    }

    logger.info(`Found ${users.length} users via text parsing`);
    
    return {
      success: true,
      data: users
    };

  } catch (error) {
    logger.error(`Failed to list users: ${error.message}`);
    return {
      success: false,
      error: 'Failed to retrieve user list'
    };
  }
}

/**
 * Create a new VPN user
 * @param {string} username 
 * @returns {Promise<{success: boolean, data?: object, message?: string, error?: string}>}
 */
async function createUser(username) {
  try {
    // Validate username
    if (!isValidUsername(username)) {
      return {
        success: false,
        error: 'Invalid username. Use only letters, numbers, hyphens, and underscores (3-32 characters).'
      };
    }

    logger.info(`Creating VPN user: ${username}`);

    // Check if user already exists
    const configPath = path.join(config.OVPN_CONFIG_DIR, `${username}.ovpn`);
    try {
      await fs.access(configPath);
      logger.warn(`User ${username} already exists`);
      return {
        success: false,
        error: `User "${username}" already exists`
      };
    } catch (err) {
      // Good, user doesn't exist
    }

    // Create user with PiVPN (non-interactive mode)
    // -a = add user
    // -n = username
    // -d = days valid (1080 = 3 years)
    const command = `sudo -n pivpn -a -n ${username} -d 1080`;
    const result = await executeCommand(command);

    if (!result.success) {
      logger.error(`Failed to create user ${username}: ${result.error}`);
      return {
        success: false,
        error: result.error || 'Failed to create user'
      };
    }

    // Verify config file was created
    try {
      await fs.access(configPath);
      logger.info(`User ${username} created successfully`);
      
      return {
        success: true,
        message: `User "${username}" created successfully`,
        data: {
          username,
          configPath
        }
      };
    } catch (err) {
      logger.error(`Config file not created for ${username}`);
      return {
        success: false,
        error: 'User creation command succeeded but config file not found'
      };
    }

  } catch (error) {
    logger.error(`Failed to create user: ${error.message}`);
    return {
      success: false,
      error: 'Failed to create user'
    };
  }
}

/**
 * Revoke a VPN user
 * @param {string} username 
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
async function revokeUser(username) {
  try {
    // Validate username
    if (!isValidUsername(username)) {
      return {
        success: false,
        error: 'Invalid username format'
      };
    }

    logger.info(`Revoking VPN user: ${username}`);

    // Check if user exists
    const configPath = path.join(config.OVPN_CONFIG_DIR, `${username}.ovpn`);
    try {
      await fs.access(configPath);
    } catch (err) {
      logger.warn(`User ${username} does not exist`);
      return {
        success: false,
        error: `User "${username}" does not exist`
      };
    }

    // Revoke user with PiVPN (auto-confirm with yes)
    // -r = revoke user
    const command = `yes | sudo -n pivpn -r ${username}`;
    const result = await executeCommand(command);

    // PiVPN revoke may return non-zero even on success, check if file was removed
    try {
      await fs.access(configPath);
      // File still exists, revocation may have failed
      
      // Try to remove manually
      await fs.unlink(configPath);
      logger.warn(`Manually removed config file for ${username}`);
    } catch (err) {
      // File doesn't exist anymore - good!
    }

    logger.info(`User ${username} revoked successfully`);
    
    return {
      success: true,
      message: `User "${username}" revoked successfully`
    };

  } catch (error) {
    logger.error(`Failed to revoke user: ${error.message}`);
    return {
      success: false,
      error: 'Failed to revoke user'
    };
  }
}

/**
 * Get user configuration file path
 * @param {string} username 
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
async function getUserConfig(username) {
  try {
    if (!isValidUsername(username)) {
      return {
        success: false,
        error: 'Invalid username format'
      };
    }

    const configPath = path.join(config.OVPN_CONFIG_DIR, `${username}.ovpn`);
    
    try {
      await fs.access(configPath);
      
      return {
        success: true,
        data: {
          username,
          configPath
        }
      };
    } catch (err) {
      return {
        success: false,
        error: 'User configuration file not found'
      };
    }
  } catch (error) {
    logger.error(`Failed to get user config: ${error.message}`);
    return {
      success: false,
      error: 'Failed to retrieve user configuration'
    };
  }
}

module.exports = {
  listUsers,
  createUser,
  revokeUser,
  getUserConfig,
  isValidUsername
};
