const { run, runSudo } = require('../services/execService');
const config = require('../config');
const path = require('path');
const fs = require('fs').promises;

/**
 * Get list of VPN users
 */
async function listUsers(req, res) {
  try {
    const output = await run('pivpn -l');
    
    // Parse the output to extract user information
    const lines = output.split('\n').filter(line => line.trim());
    const users = [];
    
    // Skip header lines and parse user data
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for lines with user data (typically contains username and dates)
      if (line && !line.includes('Name') && !line.includes('===') && !line.includes('pivpn')) {
        const parts = line.split(/\s+/);
        if (parts.length >= 1) {
          users.push({
            name: parts[0],
            status: line.toLowerCase().includes('revoked') ? 'revoked' : 'active',
            raw: line
          });
        }
      }
    }
    
    res.json({
      success: true,
      users: users,
      rawOutput: output
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list users'
    });
  }
}

/**
 * Add a new VPN user
 */
async function addUser(req, res) {
  try {
    const { username } = req.body;
    
    if (!username || !username.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Username is required'
      });
    }
    
    // Validate username (alphanumeric and hyphens only)
    if (!/^[a-zA-Z0-9-_]+$/.test(username)) {
      return res.status(400).json({
        success: false,
        error: 'Username must contain only letters, numbers, hyphens, and underscores'
      });
    }
    
    // Use -p flag for passwordless (non-interactive) client creation
    const output = await run(`pivpn -a -n ${username} -p`);
    
    // Check if user already exists by examining output
    if (output && output.toLowerCase().includes('already exists')) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }
    
    res.json({
      success: true,
      message: `User ${username} created successfully`,
      username: username,
      output: output
    });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add user'
    });
  }
}

/**
 * Revoke a VPN user
 */
async function revokeUser(req, res) {
  try {
    const { username } = req.body;
    
    if (!username || !username.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Username is required'
      });
    }
    
    const output = await run(`pivpn -r ${username} -y`);
    
    res.json({
      success: true,
      message: `User ${username} revoked successfully`,
      output: output
    });
  } catch (error) {
    console.error('Error revoking user:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to revoke user'
    });
  }
}

/**
 * Download VPN configuration file
 */
async function downloadConfig(req, res) {
  try {
    const { name } = req.params;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Username is required'
      });
    }
    
    // Validate filename to prevent path traversal
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid username'
      });
    }
    
    const configPath = path.join(config.OVPN_CONFIG_DIR, `${name}.ovpn`);
    
    // Check if file exists
    try {
      await fs.access(configPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Configuration file not found'
      });
    }
    
    res.download(configPath, `${name}.ovpn`, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Failed to download configuration file'
          });
        }
      }
    });
  } catch (error) {
    console.error('Error downloading config:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to download configuration'
    });
  }
}

/**
 * Get OpenVPN service logs
 */
async function getLogs(req, res) {
  try {
    const lines = req.query.lines || 200;
    const output = await runSudo(`journalctl -u ${config.OPENVPN_SERVICE} --no-pager -n ${lines}`);
    
    res.json({
      success: true,
      logs: output,
      lines: lines
    });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve logs'
    });
  }
}

/**
 * Restart OpenVPN service
 */
async function restartService(req, res) {
  try {
    const output = await runSudo(`systemctl restart ${config.OPENVPN_SERVICE}`);
    
    res.json({
      success: true,
      message: 'OpenVPN service restarted successfully',
      output: output
    });
  } catch (error) {
    console.error('Error restarting service:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to restart service'
    });
  }
}

/**
 * Get OpenVPN service status
 */
async function getStatus(req, res) {
  try {
    const output = await run(`systemctl is-active ${config.OPENVPN_SERVICE}`);
    const isActive = output.trim() === 'active';
    
    res.json({
      success: true,
      status: isActive ? 'active' : 'inactive',
      active: isActive
    });
  } catch (error) {
    // Service might be inactive
    res.json({
      success: true,
      status: 'inactive',
      active: false
    });
  }
}

/**
 * Get connected clients
 */
async function getConnectedClients(req, res) {
  try {
    const output = await run('pivpn -c');
    
    // Parse connected clients
    const lines = output.split('\n').filter(line => line.trim());
    const clients = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip header and empty lines
      if (line && !line.includes('Name') && !line.includes('===') && !line.includes('pivpn')) {
        const parts = line.split(/\s+/);
        if (parts.length >= 1) {
          clients.push({
            name: parts[0],
            raw: line
          });
        }
      }
    }
    
    res.json({
      success: true,
      clients: clients,
      count: clients.length,
      rawOutput: output
    });
  } catch (error) {
    console.error('Error getting connected clients:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get connected clients'
    });
  }
}

/**
 * Get server information
 */
async function getServerInfo(req, res) {
  try {
    // Get public IP
    let publicIp = 'Unknown';
    try {
      publicIp = await run('curl -s ifconfig.me');
    } catch (e) {
      console.log('Could not retrieve public IP');
    }
    
    // Get hostname
    const hostname = await run('hostname');
    
    // Get uptime
    const uptime = await run('uptime -p');
    
    res.json({
      success: true,
      info: {
        publicIp: publicIp.trim(),
        hostname: hostname.trim(),
        uptime: uptime.trim()
      }
    });
  } catch (error) {
    console.error('Error getting server info:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get server information'
    });
  }
}

module.exports = {
  listUsers,
  addUser,
  revokeUser,
  downloadConfig,
  getLogs,
  restartService,
  getStatus,
  getConnectedClients,
  getServerInfo
};
