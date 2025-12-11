const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Execute shell command as promise
 */
function execCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    logger.info(`Executing command: ${command}`);
    
    const execOptions = { 
      maxBuffer: 1024 * 500,
      cwd: options.cwd || config.EASYRSA_DIR,
      ...options
    };
    
    exec(command, execOptions, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Command error: ${stderr || error.message}`);
        return reject(new Error(stderr || error.message));
      }
      
      logger.info(`Command executed successfully`);
      resolve(stdout.trim());
    });
  });
}

/**
 * GET /api/clients
 * List all VPN clients
 */
router.get('/', async (req, res) => {
  try {
    const issuedDir = path.join(config.PKI_DIR, 'issued');
    
    logger.info('Fetching client list');
    
    // Check if directory exists
    if (!fs.existsSync(issuedDir)) {
      logger.warn(`Issued directory not found: ${issuedDir}`);
      return res.json({ success: true, clients: [] });
    }
    
    // Read certificate files
    const files = fs.readdirSync(issuedDir);
    const clients = [];
    
    for (const file of files) {
      if (file.endsWith('.crt') && file !== 'server.crt') {
        const clientName = file.replace('.crt', '');
        const filePath = path.join(issuedDir, file);
        const stats = fs.statSync(filePath);
        
        // Check if client is revoked by checking CRL index
        let isRevoked = false;
        
        try {
          const indexPath = path.join(config.PKI_DIR, 'index.txt');
          if (fs.existsSync(indexPath)) {
            const indexContent = fs.readFileSync(indexPath, 'utf8');
            const lines = indexContent.split('\n');
            for (const line of lines) {
              if (line.includes(`/CN=${clientName}`) && line.startsWith('R')) {
                isRevoked = true;
                break;
              }
            }
          }
        } catch (err) {
          logger.warn(`Failed to check revoked status for ${clientName}: ${err.message}`);
        }
        
        clients.push({
          name: clientName,
          createdDate: stats.mtime,
          status: isRevoked ? 'revoked' : 'active'
        });
      }
    }
    
    logger.info(`Found ${clients.length} clients`);
    res.json({ success: true, clients });
    
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
    
    // Validate client name (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9-_]+$/.test(clientName)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Client name can only contain letters, numbers, hyphens, and underscores' 
      });
    }
    
    logger.info(`Creating client: ${clientName}`);
    
    // Check if client already exists
    const certPath = path.join(config.PKI_DIR, 'issued', `${clientName}.crt`);
    if (fs.existsSync(certPath)) {
      return res.status(400).json({ 
        success: false, 
        error: `Client ${clientName} already exists` 
      });
    }
    
    // Step 1: Build client certificate
    const buildCommand = `cd ${config.EASYRSA_DIR} && ${config.EASYRSA_BUILD_CLIENT} ${clientName} nopass`;
    await execCommand(buildCommand, { cwd: config.EASYRSA_DIR });
    
    logger.info(`Client certificate created: ${clientName}`);
    
    // Step 2: Export .ovpn file
    const exportCommand = `${config.OVPN_GETCLIENT} ${clientName}`;
    const ovpnContent = await execCommand(exportCommand);
    
    logger.info(`Client .ovpn file generated: ${clientName}`);
    
    // Step 3: Return file content
    res.json({ 
      success: true, 
      message: `Client ${clientName} created successfully`,
      clientName: clientName,
      ovpnContent: ovpnContent,
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
    
    logger.info(`Revoking client: ${clientName}`);
    
    // Check if client exists
    const certPath = path.join(config.PKI_DIR, 'issued', `${clientName}.crt`);
    if (!fs.existsSync(certPath)) {
      return res.status(404).json({ 
        success: false, 
        error: `Client ${clientName} not found` 
      });
    }
    
    // Step 1: Revoke certificate
    const revokeCommand = `cd ${config.EASYRSA_DIR} && ${config.EASYRSA_REVOKE} ${clientName}`;
    try {
      await execCommand(revokeCommand, { cwd: config.EASYRSA_DIR });
    } catch (error) {
      // May fail if already revoked, continue
      logger.warn(`Revoke command warning: ${error.message}`);
    }
    
    // Step 2: Generate new CRL
    const crlCommand = `cd ${config.EASYRSA_DIR} && ${config.EASYRSA_GEN_CRL}`;
    await execCommand(crlCommand, { cwd: config.EASYRSA_DIR });
    
    logger.info(`Client revoked and CRL regenerated: ${clientName}`);
    
    // Step 3: Delete certificate files (optional)
    try {
      const certPath = path.join(config.PKI_DIR, 'issued', `${clientName}.crt`);
      const keyPath = path.join(config.PKI_DIR, 'private', `${clientName}.key`);
      const reqPath = path.join(config.PKI_DIR, 'reqs', `${clientName}.req`);
      
      if (fs.existsSync(certPath)) fs.unlinkSync(certPath);
      if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
      if (fs.existsSync(reqPath)) fs.unlinkSync(reqPath);
      
      logger.info(`Client files deleted: ${clientName}`);
    } catch (err) {
      logger.warn(`Failed to delete some client files: ${err.message}`);
    }
    
    // Step 4: Restart OpenVPN (optional)
    try {
      await execCommand('sudo systemctl reload openvpn-server@server');
      logger.info('OpenVPN service reloaded');
    } catch (err) {
      logger.warn(`Failed to reload OpenVPN: ${err.message}`);
    }
    
    res.json({ 
      success: true, 
      message: `Client ${clientName} revoked successfully` 
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
    
    // Validate client name to prevent path traversal
    if (!/^[a-zA-Z0-9-_]+$/.test(clientName)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid client name' 
      });
    }
    
    logger.info(`Downloading .ovpn file for client: ${clientName}`);
    
    // Get .ovpn content
    const exportCommand = `${config.OVPN_GETCLIENT} ${clientName}`;
    const ovpnContent = await execCommand(exportCommand);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/x-openvpn-profile');
    res.setHeader('Content-Disposition', `attachment; filename="${clientName}.ovpn"`);
    
    logger.info(`Client .ovpn file downloaded: ${clientName}`);
    
    res.send(ovpnContent);
    
  } catch (error) {
    logger.error(`Failed to download client config: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to download client config: ' + error.message 
    });
  }
});

/**
 * GET /api/server-status
 * Get OpenVPN server status
 */
router.get('/server-status', async (req, res) => {
  try {
    // Check OpenVPN service status
    const statusCommand = 'systemctl is-active openvpn-server@server';
    let isActive = false;
    
    try {
      const status = await execCommand(statusCommand);
      isActive = status === 'active';
    } catch (err) {
      isActive = false;
    }
    
    // Get server IP addresses
    let publicIp = 'N/A';
    let localIp = 'N/A';
    
    try {
      publicIp = await execCommand('curl -s ifconfig.me');
    } catch (err) {
      logger.warn('Failed to get public IP');
    }
    
    try {
      const ipOutput = await execCommand("ip addr show | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | cut -d/ -f1");
      localIp = ipOutput || 'N/A';
    } catch (err) {
      logger.warn('Failed to get local IP');
    }
    
    res.json({
      success: true,
      status: {
        isActive,
        publicIp,
        localIp
      }
    });
    
  } catch (error) {
    logger.error(`Failed to get server status: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get server status' 
    });
  }
});

module.exports = router;
