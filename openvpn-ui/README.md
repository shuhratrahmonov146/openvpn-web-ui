# 🔒 OpenVPN Management UI best

A clean, modern web-based management panel for OpenVPN servers running PiVPN on Linux. Built with Node.js and Express, featuring a responsive interface with **session-based authentication** for managing VPN users, viewing logs, and monitoring server status.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)

## ✨ Features

- 🔐 **Session-Based Authentication** - Secure login with username/password
- 📊 **Dashboard** - Real-time server status, connected clients, and system information
- 👥 **User Management** - Add, revoke, and download VPN configurations
- 📋 **Log Viewer** - Real-time OpenVPN service logs with auto-refresh
- 🔄 **Service Control** - Restart OpenVPN service with one click
- 🌐 **Server Info** - Public IP, hostname, and uptime monitoring
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices
- 🎨 **Clean UI** - Modern, light-themed interface
- 🐳 **Docker Support** - Easy containerized deployment
- 🚀 **PM2 Ready** - Production-ready process management

## 📋 Requirements

- **Node.js** >= 14.0.0
- **PiVPN** installed and configured
- **OpenVPN** service running
- **Linux** system (tested on Raspberry Pi OS / Debian / Ubuntu)
- **Sudo privileges** for certain operations (logs, service restart)

## 🚀 Installation

### 1. Clone or Download

```bash
cd /opt
git clone <your-repo-url> openvpn-ui
cd openvpn-ui
```

Or manually create the project structure and copy files.

### 2. Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web framework
- `express-session` - Session management
- `body-parser` - Request parsing
- `cors` - Cross-origin resource sharing
- `morgan` - HTTP request logger

### 3. Configure

Edit `config.js` or set environment variables:

```bash
# Required: Set admin credentials
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=your_strong_password_here

# Optional: Other settings
export PORT=8080
export SESSION_SECRET=your-random-secret-string
export OVPN_CONFIG_DIR=/home/pi/ovpns
```

**⚠️ IMPORTANT:** Change the default password before deploying to production!

### 4. Grant Sudo Permissions

For log viewing and service restart, the application needs sudo access. Create a sudoers file:

```bash
sudo visudo -f /etc/sudoers.d/openvpn-ui
```

Add the following (replace `pi` with your username):

```
pi ALL=(ALL) NOPASSWD: /bin/systemctl restart openvpn
pi ALL=(ALL) NOPASSWD: /bin/journalctl -u openvpn*
```

Save and exit.

## 🏃 Running the Application

### Quick Start (Development)

```bash
npm start
```

The server will start at `http://localhost:8080`

**Login with:**
- Username: `admin` (default)
- Password: `change-me-strong-password` (default - **CHANGE THIS!**)

### With Nodemon (Auto-restart on file changes)

```bash
npm run dev
```

## 🐳 Docker Deployment

### Build the Image

```bash
docker build -t openvpn-ui .
```

### Run the Container

```bash
docker run -d \
  --name openvpn-ui \
  -p 8080:8080 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=superStrongPass123 \
  -e SESSION_SECRET=random-secret-string-here \
  -v /home/pi/ovpns:/usr/src/app/ovpns:ro \
  --restart unless-stopped \
  openvpn-ui
```

### Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml  
version: '3.8'

services:
  openvpn-ui:
    build: .
    container_name: openvpn-ui
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=change-me-strong-password
      - SESSION_SECRET=super-secret-change-me
      - OVPN_CONFIG_DIR=/usr/src/app/ovpns
    volumes:
      - /home/pi/ovpns:/usr/src/app/ovpns:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
```

Start with:

```bash
docker-compose up -d
```

**Note:** For full PiVPN integration in Docker, you may need to run on the host or configure SSH access to the host system.

## 🔧 Production Deployment with PM2

PM2 is a production process manager for Node.js applications with built-in load balancer.

### 1. Install PM2 Globally

```bash
sudo npm install -g pm2
```

### 2. Start with PM2

Using the ecosystem config file:

```bash
# Edit ecosystem.config.js and set your credentials
nano ecosystem.config.js

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command that PM2 outputs
```

### 3. PM2 Management Commands

```bash
# View logs
pm2 logs openvpn-ui

# View real-time monitoring
pm2 monit

# Restart application
pm2 restart openvpn-ui

# Stop application
pm2 stop openvpn-ui

# Remove from PM2
pm2 delete openvpn-ui

# View status
pm2 status

# View detailed info
pm2 info openvpn-ui
```

### 4. PM2 Auto-Deploy (Optional)

Configure the deploy section in `ecosystem.config.js` and use:

```bash
pm2 deploy production setup
pm2 deploy production
```

## 🔧 Systemd Service (Alternative to PM2)

If you prefer systemd over PM2:

### 1. Copy Service File

```bash
sudo cp openvpn-ui.service /etc/systemd/system/
```

### 2. Edit the Service File

```bash
sudo nano /etc/systemd/system/openvpn-ui.service
```

Replace `USERNAME` with your actual Linux username (e.g., `pi`).

Update the environment variables, especially:
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

### 3. Enable and Start

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable openvpn-ui

# Start the service
sudo systemctl start openvpn-ui

# Check status
sudo systemctl status openvpn-ui
```

### 4. Systemd Management Commands

```bash
# View logs
sudo journalctl -u openvpn-ui -f

# Restart service
sudo systemctl restart openvpn-ui

# Stop service
sudo systemctl stop openvpn-ui

# Disable from starting on boot
sudo systemctl disable openvpn-ui
```

## 📡 API Endpoints

### Server & Status

- `GET /api/status` - OpenVPN service status
- `GET /api/server-info` - Server information (IP, hostname, uptime)
- `GET /health` - Health check endpoint

### User Management

- `GET /api/users` - List all VPN users
- `POST /api/users/add` - Add new user
  ```json
  { "username": "john" }
  ```
- `POST /api/users/revoke` - Revoke user access
  ```json
  { "username": "john" }
  ```
- `GET /api/users/download/:name` - Download .ovpn configuration file

### Logs & Service

- `GET /api/logs?lines=200` - Get OpenVPN logs (default: 200 lines)
- `GET /api/service/restart` - Restart OpenVPN service
- `GET /api/clients` - Get connected clients

## 🔐 Authentication

**Session-based authentication is ENABLED by default** and required for all routes.

### Default Credentials

- **Username:** `admin`
- **Password:** `change-me-strong-password`

**⚠️ CRITICAL:** Change these defaults before deploying to production!

### Changing Credentials

#### Method 1: Environment Variables (Recommended)

```bash
export ADMIN_USERNAME=yourusername
export ADMIN_PASSWORD=your_very_strong_password
export SESSION_SECRET=random_32_char_string_here
```

#### Method 2: Edit config.js

```javascript
module.exports = {
  ADMIN_USERNAME: 'yourusername',
  ADMIN_PASSWORD: 'your_very_strong_password',
  SESSION_SECRET: 'random_32_char_string_here',
  // ... other config
};
```

#### Method 3: PM2 Ecosystem File

Edit `ecosystem.config.js`:

```javascript
env: {
  ADMIN_USERNAME: "yourusername",
  ADMIN_PASSWORD: "your_very_strong_password",
  SESSION_SECRET: "random_32_char_string_here"
}
```

### Session Configuration

- **Session Duration:** 24 hours
- **Session Storage:** Memory (for production, consider Redis)
- **Cookie Security:** HttpOnly enabled, Secure flag for HTTPS

### Login Flow

1. Navigate to `http://your-server:8080`
2. Automatically redirected to `/login`
3. Enter credentials
4. On success, redirected to dashboard
5. Session persists for 24 hours
6. Logout available at `/logout`

## 🖥️ Usage Examples

### Adding a User via API

```bash
curl -X POST http://localhost:8080/api/users/add \
  -H "Content-Type: application/json" \
  -d '{"username": "alice"}'
```

### Revoking a User

```bash
curl -X POST http://localhost:8080/api/users/revoke \
  -H "Content-Type: application/json" \
  -d '{"username": "alice"}'
```

### Getting Logs

```bash
curl http://localhost:8080/api/logs?lines=100
```

### Restarting Service

```bash
curl http://localhost:8080/api/service/restart
```

## 📁 Project Structure

```
openvpn-ui/
├── package.json           # Dependencies and scripts
├── server.js              # Express server and routes
├── config.js              # Configuration settings
├── controllers/
│   └── vpnController.js   # VPN management logic
├── services/
│   └── execService.js     # Command execution wrapper
├── public/
│   ├── index.html         # Dashboard page
│   ├── style.css          # Styles
│   └── script.js          # Client-side JavaScript
├── views/
│   ├── users.html         # User management page
│   └── logs.html          # Log viewer page
└── README.md              # Documentation
```

## 🛠️ Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `ADMIN_USERNAME` | `admin` | Admin login username |
| `ADMIN_PASSWORD` | `change-me-strong-password` | Admin login password ⚠️ |
| `SESSION_SECRET` | `super-secret-change-me` | Session encryption secret ⚠️ |
| `OVPN_CONFIG_DIR` | `/home/pi/ovpns` | Path to .ovpn files |
| `SYSTEM_USER` | `pi` | System user running OpenVPN |
| `OPENVPN_SERVICE` | `openvpn` | OpenVPN service name |
| `NODE_ENV` | `production` | Environment mode |

⚠️ **Security Critical:** Always change these values in production!

## 🔍 Troubleshooting

### Port 8080 Already in Use

Change the port in `config.js` or set environment variable:
```bash
export PORT=3000
npm start
```

### Permission Denied Errors

Ensure sudo permissions are configured correctly (see Installation step 4).

### PiVPN Commands Not Found

Make sure PiVPN is installed and the `pivpn` command is available:
```bash
which pivpn
pivpn -l
```

### .ovpn Files Not Found

Check that the `OVPN_CONFIG_DIR` path is correct in `config.js`.

## 🌐 Accessing Remotely

### Option 1: Port Forwarding

Forward port 8080 on your router to your server's internal IP.

### Option 2: Nginx Reverse Proxy

**With SSL/TLS (Recommended):**

```nginx
server {
    listen 80;
    server_name vpn.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name vpn.yourdomain.com;

    # SSL Configuration (use Let's Encrypt with certbot)
    ssl_certificate /etc/letsencrypt/live/vpn.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vpn.yourdomain.com/privkey.pem;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Setup Let's Encrypt:**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d vpn.yourdomain.com
```

### Option 3: SSH Tunnel

```bash
ssh -L 8080:localhost:8080 user@your-server-ip
```

Then access at `http://localhost:8080`

## 🔒 Security Recommendations

1. **Change Default Credentials** - Never use default username/password in production
2. **Use Strong Passwords** - Minimum 16 characters with mixed case, numbers, and symbols
3. **Set Secure Session Secret** - Use a random 32+ character string
4. **Use HTTPS** - Deploy behind a reverse proxy with SSL/TLS (Nginx, Caddy, Traefik)
5. **Restrict Access** - Use firewall rules to limit access by IP
6. **Keep Updated** - Regularly update dependencies: `npm audit fix`
7. **Run as Non-Root** - Never run the application as root user
8. **Enable Firewall** - Only expose necessary ports (8080 and VPN ports)
9. **Monitor Logs** - Regularly check application and system logs
10. **Use Redis for Sessions** - In production, consider Redis for session storage
11. **Rate Limiting** - Consider adding rate limiting for login attempts
12. **Regular Backups** - Backup configuration and user data regularly

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 💡 Tips

- **Keyboard Shortcuts**: Use browser's built-in shortcuts for better navigation
- **Mobile Access**: The UI is fully responsive and works great on mobile devices
- **Auto-Refresh**: Dashboard and logs support auto-refresh for real-time monitoring
- **Bulk Operations**: You can manage multiple users efficiently through the clean UI

## 🐛 Known Issues

- Log parsing may vary depending on OpenVPN configuration
- Some PiVPN output formats may need adjustment for proper parsing
- Sudo permissions required for certain operations

## 📧 Support

For issues, questions, or contributions, please open an issue on the GitHub repository.

---

**Made with ❤️ for the OpenVPN community**
