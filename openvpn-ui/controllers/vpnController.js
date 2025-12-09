const userService = require('../services/userService');
const clientService = require('../services/clientService');
const statusService = require('../services/statusService');
const config = require('../config');
const path = require('path');
const fs = require('fs').promises;

/**
 * Get list of VPN users
 */
async function listUsers(req, res) {
  try {
    const result = await userService.listUsers();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('[listUsers] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list users'
    });
  }
}

/**
 * Add a new VPN user
 */
async function addUser(req, res) {
  try {
    const { username } = req.body;
    
    const result = await userService.createUser(username);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('[addUser] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add user'
    });
  }
}

/**
 * Revoke a VPN user
 */
async function revokeUser(req, res) {
  try {
    const { username } = req.body;
    
    const result = await userService.revokeUser(username);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('[revokeUser] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke user'
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
        message: 'Username is required'
      });
    }
    
    // Validate filename to prevent path traversal
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid username'
      });
    }
    
    // Validate username format
    if (!userService.isValidUsername(name)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid username format'
      });
    }
    
    const configPath = path.join(config.OVPN_CONFIG_DIR, `${name}.ovpn`);
    
    // Check if file exists
    try {
      await fs.access(configPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Configuration file not found'
      });
    }
    
    res.download(configPath, `${name}.ovpn`, (err) => {
      if (err) {
        console.error('[downloadConfig] Error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Failed to download configuration file'
          });
        }
      }
    });
  } catch (error) {
    console.error('[downloadConfig] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download configuration'
    });
  }
}

/**
 * Get OpenVPN service logs
 */
async function getLogs(req, res) {
  try {
    const lines = parseInt(req.query.lines) || 200;
    const result = await statusService.getServiceLogs(lines);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      lines: result.lines
    });
  } catch (error) {
    console.error('[getLogs] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve logs'
    });
  }
}

/**
 * Restart OpenVPN service
 */
async function restartService(req, res) {
  try {
    const result = await statusService.restartService();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('[restartService] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restart service'
    });
  }
}

/**
 * Get OpenVPN service status
 */
async function getStatus(req, res) {
  try {
    const result = await statusService.getServiceStatus();
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('[getStatus] Error:', error);
    res.json({
      success: true,
      data: {
        status: 'unknown',
        active: false
      }
    });
  }
}

/**
 * Get connected clients
 */
async function getConnectedClients(req, res) {
  try {
    const result = await clientService.getConnectedClients();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      count: result.data.length
    });
  } catch (error) {
    console.error('[getConnectedClients] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get connected clients'
    });
  }
}

/**
 * Get server information
 */
async function getServerInfo(req, res) {
  try {
    const result = await statusService.getServerInfo();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('[getServerInfo] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get server information'
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
