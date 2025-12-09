module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || '0.0.0.0',
  
  // Admin Credentials
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: 'hprogramist8060',
  
  // Session Configuration
  SESSION_SECRET: 'openvpn-web-ui-secret-change-in-production',
  SESSION_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
  
  // System Configuration
  SYSTEM_USER: 'shuhrat',
  OPENVPN_CONFIG_DIR: '/etc/openvpn/server',
  EASYRSA_DIR: '/etc/openvpn/easy-rsa',
  PKI_DIR: '/etc/openvpn/server/easy-rsa/pki',
  
  // Commands
  EASYRSA_BUILD_CLIENT: 'sudo easyrsa build-client-full',
  EASYRSA_REVOKE: 'sudo easyrsa revoke',
  EASYRSA_GEN_CRL: 'sudo easyrsa gen-crl',
  OVPN_GETCLIENT: 'sudo ovpn_getclient',
  
  // Logging
  LOG_DIR: './logs',
  LOG_FILE: 'app.log',
  LOG_LEVEL: 'info'
};
