module.exports = {
  // Server configuration
  PORT: process.env.PORT || 8080,
  HOST: process.env.HOST || '0.0.0.0',
  
  // Admin authentication (session-based login)
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'hprogramist8060',
  SESSION_SECRET: process.env.SESSION_SECRET || 'super-secret-change-me-in-production',
  
  // OpenVPN configuration paths
  OVPN_CONFIG_DIR: process.env.OVPN_CONFIG_DIR || '/home/pi/ovpns',
  
  // System user running OpenVPN
  SYSTEM_USER: process.env.SYSTEM_USER || 'pi',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'dev',
  
  // Service name
  OPENVPN_SERVICE: process.env.OPENVPN_SERVICE || 'openvpn',
  
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'production'
};
