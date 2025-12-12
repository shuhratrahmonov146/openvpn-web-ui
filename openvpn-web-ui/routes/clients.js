const express = require('express');
const router = express.Router();
const path = require('path');
const config = require('../config');
const userService = require('../services/userService');
const statusService = require('../services/statusService');

/**
 * GET /api/clients
 * List all VPN users
 */
router.get('/', async (req, res) => {
  try {
    logger.info('Fetching user list');
    
    const result = await userService.listUsers();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to retrieve user list'
      });
    }
    
    logger.info(`Returning ${result.data.length} users`);
    
    res.json({
      success: true,
      clients: result.data
    });
    
  } catch (error) {
    logger.error(`Failed to list clients: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to list clients: ' + error.message 
    });
  }
});

/**
 * POST /api/clients/create
 * Create new VPN client
 */
router.post('/create', async (req, res) => {
  try {
    const { clientName } = req.body;
    
    if (!clientName || !clientName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Client name is required'
      });
    }
    
    logger.info(`Creating user: ${clientName}`);
    
    const result = await userService.createUser(clientName.trim());
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: result.message,
      clientName: clientName,
      downloadUrl: `/api/clients/download/${clientName}`
    });
    
  } catch (error) {
    logger.error(`Failed to create client: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create client: ' + error.message 
    });
  }
});

/**
 * POST /api/clients/revoke
 * Revoke VPN client
 */
router.post('/revoke', async (req, res) => {
  try {
    const { clientName } = req.body;
    
    if (!clientName || !clientName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Client name is required'
      });
    }
    
    logger.info(`Revoking user: ${clientName}`);
    
    const result = await userService.revokeUser(clientName.trim());
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    logger.error(`Failed to revoke client: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to revoke client: ' + error.message 
    });
  }
});

/**
 * GET /api/clients/download/:clientName
 * Download .ovpn file for client
 */
router.get('/download/:clientName', async (req, res) => {
  try {
    const { clientName } = req.params;
    
    if (!clientName || !clientName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Client name is required'
      });
    }
    
    // Validate username format to prevent path traversal
    if (!userService.isValidUsername(clientName)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid client name'
      });
    }
    
    logger.info(`Downloading config for: ${clientName}`);
    
    const result = await userService.getUserConfig(clientName);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error
      });
    }
    
    const configPath = result.data.configPath;
    
    // Check if file exists and send it
    res.download(configPath, `${clientName}.ovpn`, (err) => {
      if (err) {
        logger.error(`Download error for ${clientName}: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Failed to download configuration file'
          });
        }
      } else {
        logger.info(`Config downloaded successfully: ${clientName}`);
      }
    });
    
  } catch (error) {
    logger.error(`Failed to download client config: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to download client config: ' + error.message 
    });
  }
});

/**
 * GET /api/clients/connected
 * Get list of connected VPN clients
 */
router.get('/connected', async (req, res) => {
  try {
    logger.info('Fetching connected clients');
    
    const result = await statusService.getConnectedClients();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to retrieve connected clients'
      });
    }
    
    logger.info(`Returning ${result.data.length} connected clients`);
    
    res.json({
      success: true,
      clients: result.data,
      count: result.data.length
    });
    
  } catch (error) {
    logger.error(`Failed to get connected clients: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/clients/server-status
 * Get OpenVPN server status and info
 */
router.get('/server-status', async (req, res) => {
  try {
    logger.info('Fetching server status');
    
    // Get server status
    const statusResult = await statusService.getServerStatus();
    
    if (!statusResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to check server status'
      });
    }
    
    // Get server info
    const infoResult = await statusService.getServerInfo();
    
    if (!infoResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve server information'
      });
    }
    
    // Get connected clients count
    const connectedResult = await statusService.getConnectedClients();
    const connectedCount = connectedResult.success ? connectedResult.data.length : 0;
    
    res.json({
      success: true,
      status: {
        ...statusResult.data,
        ...infoResult.data,
        connectedCount
      }
    });
    
  } catch (error) {
    logger.error(`Failed to get server status: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/clients/restart-service
 * Restart OpenVPN service
 */
router.post('/restart-service', async (req, res) => {
  try {
    logger.info('Restarting OpenVPN service');
    
    const result = await statusService.restartService();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    logger.error(`Failed to restart service: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
