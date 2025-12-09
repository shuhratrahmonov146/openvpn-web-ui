module.exports = {
  apps: [
    {
      name: "openvpn-ui",
      script: "server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
        PORT: 8080,
        HOST: "0.0.0.0",
        ADMIN_USERNAME: "admin",
        ADMIN_PASSWORD: "hprogramist8060",
        SESSION_SECRET: "super-secret-change-me-in-production",
        OVPN_CONFIG_DIR: "/home/pi/ovpns",
        SYSTEM_USER: "pi",
        OPENVPN_SERVICE: "openvpn"
      },
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      // Restart configuration
      min_uptime: "10s",
      max_restarts: 10,
      // Clustering configuration
      exec_mode: "fork",
      // Wait before restart
      kill_timeout: 5000
    }
  ],

  deploy: {
    production: {
      user: "pi",
      host: "your-server-ip",
      ref: "origin/main",
      repo: "git@github.com:yourusername/openvpn-ui.git",
      path: "/home/pi/openvpn-ui",
      "post-deploy": "npm install && pm2 reload ecosystem.config.js --env production"
    }
  }
};
