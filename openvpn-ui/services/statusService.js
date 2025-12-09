const { runCommand } = require('./execService');
const config = require('../config');

/**
 * Get OpenVPN service status
 * @returns {Promise<Object>}
 */
async function getServiceStatus() {
  try {
    // Try multiple possible service names
    const serviceNames = [
      'openvpn',
      'openvpn@server',
      'openvpn-server@server',
      config.OPENVPN_SERVICE
    ];
    
    for (const serviceName of serviceNames) {
      try {
        const output = await runCommand(`systemctl is-active ${serviceName}`);
        const isActive = output.trim() === 'active';
        
        if (isActive) {
          return {
            success: true,
            data: {
              status: 'active',
              active: true,
              serviceName
            }
          };
        }
      } catch (err) {
        // Try next service name
        continue;
      }
    }
    
    // None active
    return {
      success: true,
      data: {
        status: 'inactive',
        active: false
      }
    };
    
  } catch (error) {
    return {
      success: true,
      data: {
        status: 'unknown',
        active: false
      }
    };
  }
}

/**
 * Restart OpenVPN service
 * @returns {Promise<Object>}
 */
async function restartService() {
  try {
    const serviceNames = [
      'openvpn@server',
      'openvpn-server@server',
      config.OPENVPN_SERVICE
    ];
    
    let lastError = null;
    
    for (const serviceName of serviceNames) {
      try {
        await runCommand(`sudo -n systemctl restart ${serviceName}`);
        return {
          success: true,
          message: `Service ${serviceName} restarted successfully`
        };
      } catch (err) {
        lastError = err;
        continue;
      }
    }
    
    throw lastError || new Error('Failed to restart any OpenVPN service');
    
  } catch (error) {
    if (error.message && error.message.includes('password is required')) {
      return {
        success: false,
        message: 'Sudo password required. Please configure passwordless sudo for systemctl commands.'
      };
    }
    
    return {
      success: false,
      message: error.message || 'Failed to restart service'
    };
  }
}

/**
 * Get OpenVPN service logs
 * @param {number} lines - Number of lines to retrieve
 * @returns {Promise<Object>}
 */
async function getServiceLogs(lines = 200) {
  try {
    const serviceNames = [
      'openvpn@server',
      'openvpn-server@server',
      config.OPENVPN_SERVICE
    ];
    
    let output = null;
    let lastError = null;
    
    for (const serviceName of serviceNames) {
      try {
        output = await runCommand(`sudo -n journalctl -u ${serviceName} --no-pager -n ${lines}`);
        break;
      } catch (err) {
        lastError = err;
        continue;
      }
    }
    
    if (!output) {
      throw lastError || new Error('Failed to retrieve logs');
    }
    
    return {
      success: true,
      data: output,
      lines
    };
    
  } catch (error) {
    if (error.message && error.message.includes('password is required')) {
      return {
        success: false,
        message: 'Sudo password required. Please configure passwordless sudo for journalctl commands.'
      };
    }
    
    return {
      success: false,
      message: error.message || 'Failed to retrieve logs'
    };
  }
}

/**
 * Get server information
 * @returns {Promise<Object>}
 */
async function getServerInfo() {
  try {
    const info = {};
    
    // Get public IP
    try {
      const publicIp = await runCommand('curl -s -m 5 ifconfig.me');
      info.publicIp = publicIp.trim() || 'Unknown';
    } catch (e) {
      info.publicIp = 'Unknown';
    }
    
    // Get local IP
    try {
      const localIp = await runCommand("hostname -I | awk '{print $1}'");
      info.localIp = localIp.trim() || 'Unknown';
    } catch (e) {
      info.localIp = 'Unknown';
    }
    
    // Get hostname
    try {
      const hostname = await runCommand('hostname');
      info.hostname = hostname.trim();
    } catch (e) {
      info.hostname = 'Unknown';
    }
    
    // Get uptime
    try {
      const uptime = await runCommand('uptime -p');
      info.uptime = uptime.trim();
    } catch (e) {
      info.uptime = 'Unknown';
    }
    
    // Get OS info
    try {
      const os = await runCommand('cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d \\"');
      info.os = os.trim();
    } catch (e) {
      info.os = 'Unknown';
    }
    
    return {
      success: true,
      data: info
    };
    
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to get server information'
    };
  }
}

module.exports = {
  getServiceStatus,
  restartService,
  getServiceLogs,
  getServerInfo
};
