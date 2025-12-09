const { runCommand } = require('./execService');
const config = require('../config');
const fs = require('fs').promises;
const path = require('path');

/**
 * Parse OpenVPN status log to extract connected clients
 * @param {string} content - Raw content from openvpn-status.log
 * @returns {Array} - Array of connected client objects
 */
function parseStatusLog(content) {
  const clients = [];
  const lines = content.split('\n');
  
  let inClientSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) continue;
    
    // Detect CLIENT_LIST section start
    if (trimmed.startsWith('CLIENT_LIST')) {
      inClientSection = true;
      
      // Parse CLIENT_LIST line format:
      // CLIENT_LIST,CommonName,RealAddress,VirtualAddress,BytesReceived,BytesSent,ConnectedSince
      const parts = trimmed.split(',');
      
      if (parts.length >= 7) {
        const username = parts[1];
        const realAddress = parts[2];
        const virtualAddress = parts[3];
        const bytesReceived = parts[4];
        const bytesSent = parts[5];
        const connectedSince = parts[6];
        
        // Validate username - skip if empty or contains invalid chars
        if (!username || username.length < 2 || username === 'UNDEF') {
          continue;
        }
        
        // Skip if username contains weird characters
        if (!/^[a-zA-Z0-9-_]+$/.test(username)) {
          continue;
        }
        
        // Parse IP addresses
        const realIp = realAddress.split(':')[0] || realAddress;
        const virtualIp = virtualAddress || 'N/A';
        
        // Parse bytes
        const bytesIn = parseInt(bytesReceived) || 0;
        const bytesOut = parseInt(bytesSent) || 0;
        
        // Format bytes to human-readable
        const formatBytes = (bytes) => {
          if (bytes === 0) return '0 B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        
        // Parse date (Unix timestamp or formatted date)
        let connectedDate = connectedSince;
        try {
          const timestamp = parseInt(connectedSince);
          if (!isNaN(timestamp)) {
            connectedDate = new Date(timestamp * 1000).toISOString();
          }
        } catch (e) {
          // Keep original if parsing fails
        }
        
        clients.push({
          username,
          realIp,
          virtualIp,
          bytesIn: formatBytes(bytesIn),
          bytesOut: formatBytes(bytesOut),
          connectedSince: connectedDate,
          raw: trimmed
        });
      }
      continue;
    }
    
    // Exit CLIENT_LIST section when we hit ROUTING_TABLE or end
    if (trimmed.startsWith('ROUTING_TABLE') || trimmed.startsWith('GLOBAL_STATS')) {
      break;
    }
  }
  
  return clients;
}

/**
 * Get connected VPN clients from status log
 * @returns {Promise<Object>}
 */
async function getConnectedClients() {
  try {
    // Try multiple possible status log locations
    const possiblePaths = [
      '/var/log/openvpn-status.log',
      '/var/log/openvpn/openvpn-status.log',
      '/etc/openvpn/openvpn-status.log',
      '/run/openvpn-server/status-server.log',
      '/var/log/openvpn/status.log'
    ];
    
    let content = null;
    let usedPath = null;
    
    // Try reading from each possible path
    for (const logPath of possiblePaths) {
      try {
        content = await fs.readFile(logPath, 'utf-8');
        usedPath = logPath;
        break;
      } catch (err) {
        // Try next path
        continue;
      }
    }
    
    // If no status log found, try pivpn -c command as fallback
    if (!content) {
      try {
        const output = await runCommand('sudo -n pivpn -c');
        return parseFromPivpnCommand(output);
      } catch (err) {
        return {
          success: true,
          data: [],
          message: 'No connected clients or status log not found'
        };
      }
    }
    
    const clients = parseStatusLog(content);
    
    return {
      success: true,
      data: clients,
      statusLogPath: usedPath
    };
    
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to get connected clients'
    };
  }
}

/**
 * Strip ANSI color codes from string
 */
function stripAnsiCodes(str) {
  if (!str) return '';
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1B\[/g, '');
}

/**
 * Parse pivpn -c command output as fallback
 * @param {string} output - Raw output from pivpn -c
 * @returns {Object}
 */
function parseFromPivpnCommand(output) {
  const clients = [];
  
  // Strip ANSI codes
  const cleanOutput = stripAnsiCodes(output);
  const lines = cleanOutput.split('\n');
  
  let inDataSection = false;
  
  for (const line of lines) {
    let trimmed = line.trim();
    
    if (!trimmed) continue;
    
    // Skip separator lines
    if (trimmed.match(/^[=:+\-|]{3,}$/)) continue;
    
    // Detect header
    const lowerLine = trimmed.toLowerCase();
    if (lowerLine.includes('name') || lowerLine.includes('common')) {
      inDataSection = true;
      continue;
    }
    
    // Skip footer lines
    if (trimmed.includes('pivpn') || lowerLine.includes('total') || trimmed.startsWith('::')) {
      continue;
    }
    
    if (inDataSection) {
      const parts = trimmed.split(/\s+/).filter(p => p.length > 0);
      
      if (parts.length === 0) continue;
      
      let username = parts[0];
      
      // Clean username
      username = username.replace(/[^a-zA-Z0-9-_]/g, '');
      
      // Validate username
      if (!username || username.length < 2 || !/^[a-zA-Z0-9-_]+$/.test(username)) {
        continue;
      }
      
      clients.push({
        username,
        realIp: parts[1] || 'N/A',
        virtualIp: parts[2] || 'N/A',
        bytesIn: parts[3] || 'N/A',
        bytesOut: parts[4] || 'N/A',
        connectedSince: parts[5] || 'N/A',
        raw: trimmed
      });
    }
  }
  
  return {
    success: true,
    data: clients
  };
}

/**
 * Get total count of connected clients
 * @returns {Promise<number>}
 */
async function getConnectedCount() {
  try {
    const result = await getConnectedClients();
    return result.success ? result.data.length : 0;
  } catch (error) {
    return 0;
  }
}

module.exports = {
  getConnectedClients,
  getConnectedCount,
  parseStatusLog
};
