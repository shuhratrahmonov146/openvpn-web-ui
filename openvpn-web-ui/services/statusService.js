const { executeCommand } = require('./execService');
const config = require('../config');

/**
 * Get OpenVPN server status
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
async function getServerStatus() {
  try {
    // Check if OpenVPN service is active
    const result = await executeCommand('systemctl is-active openvpn@server');
    
    const isActive = result.success && result.stdout.trim() === 'active';
    
    return {
      success: true,
      data: {
        isActive,
        status: isActive ? 'Online' : 'Offline'
      }
    };
  } catch (error) {
    logger.error(`Failed to get server status: ${error.message}`);
    return {
      success: false,
      error: 'Failed to check server status'
    };
  }
}

/**
 * Get server information (IPs, hostname, uptime)
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
async function getServerInfo() {
  try {
    // Get public IP
    let publicIp = 'N/A';
    const publicIpResult = await executeCommand('curl -s --max-time 5 ifconfig.me');
    if (publicIpResult.success && publicIpResult.stdout) {
      publicIp = publicIpResult.stdout.trim();
    }

    // Get local IP
    let localIp = 'N/A';
    const localIpResult = await executeCommand("ip -4 addr show | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | cut -d/ -f1");
    if (localIpResult.success && localIpResult.stdout) {
      localIp = localIpResult.stdout.trim();
    }

    // Get hostname
    let hostname = 'N/A';
    const hostnameResult = await executeCommand('hostname');
    if (hostnameResult.success && hostnameResult.stdout) {
      hostname = hostnameResult.stdout.trim();
    }

    // Get uptime
    let uptime = 'N/A';
    const uptimeResult = await executeCommand("uptime -p");
    if (uptimeResult.success && uptimeResult.stdout) {
      uptime = uptimeResult.stdout.trim().replace('up ', '');
    }

    return {
      success: true,
      data: {
        publicIp,
        localIp,
        hostname,
        uptime
      }
    };
  } catch (error) {
    logger.error(`Failed to get server info: ${error.message}`);
    return {
      success: false,
      error: 'Failed to retrieve server information'
    };
  }
}

/**
 * Get connected VPN clients
 * @returns {Promise<{success: boolean, data?: array, error?: string}>}
 */
async function getConnectedClients() {
  try {
    // Try PiVPN JSON format first
    const jsonResult = await executeCommand('sudo -n pivpn -c --json 2>/dev/null');
    
    if (jsonResult.success && jsonResult.stdout) {
      try {
        const clients = JSON.parse(jsonResult.stdout);
        if (Array.isArray(clients)) {
          logger.info(`Found ${clients.length} connected clients via JSON`);
          return {
            success: true,
            data: clients
          };
        }
      } catch (parseError) {
        logger.warn('Failed to parse PiVPN JSON output, trying alternative method');
      }
    }

    // Fallback: Parse status log directly
    const statusResult = await executeCommand('sudo -n cat /var/log/openvpn-status.log 2>/dev/null');
    
    if (!statusResult.success || !statusResult.stdout) {
      return {
        success: true,
        data: [] // No connected clients
      };
    }

    const lines = statusResult.stdout.split('\n');
    const clients = [];

    for (const line of lines) {
      // Parse OpenVPN status log format: CLIENT_LIST,username,realIP,virtualIP,bytesIn,bytesOut,connectedSince
      if (line.startsWith('CLIENT_LIST,')) {
        const parts = line.split(',');
        if (parts.length >= 7) {
          clients.push({
            name: parts[1].trim(),
            remoteIp: parts[2].trim(),
            virtualIp: parts[3].trim(),
            bytesReceived: parseInt(parts[4]) || 0,
            bytesSent: parseInt(parts[5]) || 0,
            connectedSince: parts[6].trim()
          });
        }
      }
    }

    logger.info(`Found ${clients.length} connected clients via status log`);
    
    return {
      success: true,
      data: clients
    };

  } catch (error) {
    logger.error(`Failed to get connected clients: ${error.message}`);
    return {
      success: false,
      error: 'Failed to retrieve connected clients'
    };
  }
}

/**
 * Get OpenVPN service logs
 * @param {number} lines - Number of lines to retrieve
 * @returns {Promise<{success: boolean, data?: string, error?: string}>}
 */
async function getServiceLogs(lines = 100) {
  try {
    const result = await executeCommand(`sudo -n journalctl -u openvpn@server -n ${lines} --no-pager`);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to retrieve service logs'
      };
    }

    return {
      success: true,
      data: result.stdout || 'No logs available'
    };
  } catch (error) {
    logger.error(`Failed to get service logs: ${error.message}`);
    return {
      success: false,
      error: 'Failed to retrieve logs'
    };
  }
}

/**
 * Restart OpenVPN service
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
async function restartService() {
  try {
    const result = await executeCommand('sudo -n systemctl restart openvpn@server');
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to restart service'
      };
    }

    // Wait a moment for service to restart
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify service is running
    const statusResult = await getServerStatus();
    
    if (statusResult.success && statusResult.data.isActive) {
      logger.info('OpenVPN service restarted successfully');
      return {
        success: true,
        message: 'OpenVPN service restarted successfully'
      };
    } else {
      return {
        success: false,
        error: 'Service restarted but may not be running properly'
      };
    }
  } catch (error) {
    logger.error(`Failed to restart service: ${error.message}`);
    return {
      success: false,
      error: 'Failed to restart OpenVPN service'
    };
  }
}

module.exports = {
  getServerStatus,
  getServerInfo,
  getConnectedClients,
  getServiceLogs,
  restartService
};
