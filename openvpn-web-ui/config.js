module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || '0.0.0.0',
  
  // Admin Credentials
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'hprogramist8060',
  
  // Session Configuration
  SESSION_SECRET: process.env.SESSION_SECRET || 'openvpn-web-ui-secret-change-in-production',
  SESSION_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
  
  // System Configuration
  SYSTEM_USER: process.env.SYSTEM_USER || 'shuhrat',
  OVPN_CONFIG_DIR: process.env.OVPN_CONFIG_DIR || '/home/shuhrat/ovpns',
  
  // OpenVPN Service
  OPENVPN_SERVICE: 'openvpn@server',
  
  // Logging
  LOG_DIR: './logs',
  LOG_FILE: 'app.log',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Auto-refresh intervals (milliseconds)
  DASHBOARD_REFRESH_INTERVAL: 10000, // 10 seconds
  LOGS_REFRESH_INTERVAL: 5000 // 5 seconds
};
