# OpenVPN Web UI - Professional Management Interface

A modern, professional web-based management interface for OpenVPN servers using EasyRSA. Built with Node.js, Express, and vanilla JavaScript.

## 🎯 Features

- **🔐 Secure Authentication** - Session-based login with username/password
- **👥 Client Management** - Create, revoke, and download VPN client configurations
- **📊 Dashboard** - Real-time server status, IP addresses, and client statistics
- **📋 Logs Viewer** - View application logs with auto-refresh capability
- **🎨 Modern UI** - Clean, responsive design that works on all devices
- **🔄 Auto-Refresh** - Real-time updates for dashboard and logs
- **📝 Comprehensive Logging** - Winston-based logging with rotation

## 📋 Requirements

- **Ubuntu Server** (18.04 or higher)
- **Node.js** (14.x or higher)
- **OpenVPN** installed and configured
- **EasyRSA** installed
- **sudo privileges** for the system user

## 🚀 Installation

### Step 1: Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Clone/Copy Project

```bash
# Create directory
sudo mkdir -p /opt/openvpn-web-ui
sudo chown shuhrat:shuhrat /opt/openvpn-web-ui

# Copy project files to /opt/openvpn-web-ui
# Or clone from repository
cd /opt/openvpn-web-ui
```

### Step 3: Install Dependencies

```bash
cd /opt/openvpn-web-ui
npm install
```

### Step 4: Configure Sudoers (CRITICAL)

The application needs sudo access to run OpenVPN management commands. Configure sudoers:

```bash
sudo visudo -f /etc/sudoers.d/openvpn-web-ui
```

Add the following lines (replace `shuhrat` with your username):

```
shuhrat ALL=(ALL) NOPASSWD: /usr/share/easy-rsa/easyrsa
shuhrat ALL=(ALL) NOPASSWD: /usr/local/bin/easyrsa
shuhrat ALL=(ALL) NOPASSWD: /usr/bin/ovpn_getclient
shuhrat ALL=(ALL) NOPASSWD: /usr/sbin/openvpn*
shuhrat ALL=(ALL) NOPASSWD: /bin/systemctl reload openvpn-server@server
```

Save and exit (Ctrl+X, Y, Enter).

**Verify sudoers configuration:**

```bash
sudo -l
```

You should see the commands listed without requiring a password.

### Step 5: Configure Application

Edit `config.js` if needed to adjust paths:

```javascript
// Default configuration
SYSTEM_USER: 'shuhrat',
OPENVPN_CONFIG_DIR: '/etc/openvpn/server',
EASYRSA_DIR: '/etc/openvpn/easy-rsa',
```

### Step 6: Set Up Systemd Service

```bash
# Copy service file
sudo cp openvpn-web-ui.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable openvpn-web-ui

# Start the service
sudo systemctl start openvpn-web-ui

# Check status
sudo systemctl status openvpn-web-ui
```

### Step 7: Access the Web UI

Open your browser and navigate to:

```
http://your-server-ip:3000
```

**Default Credentials:**
- Username: `admin`
- Password: `hprogramist8060`

## 🔧 Configuration

### Changing Admin Credentials

Edit `config.js`:

```javascript
ADMIN_USERNAME: 'your_username',
ADMIN_PASSWORD: 'your_secure_password',
```

Then restart the service:

```bash
sudo systemctl restart openvpn-web-ui
```

### Changing Port

Edit `config.js`:

```javascript
PORT: process.env.PORT || 3000,
```

Or set environment variable in systemd service:

```bash
sudo nano /etc/systemd/system/openvpn-web-ui.service
```

Add under `[Service]`:

```
Environment=PORT=8080
```

Restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart openvpn-web-ui
```

### Configuring OpenVPN Paths

If your OpenVPN installation uses different paths, edit `config.js`:

```javascript
OPENVPN_CONFIG_DIR: '/your/path/to/openvpn',
EASYRSA_DIR: '/your/path/to/easy-rsa',
PKI_DIR: '/your/path/to/pki',
```

## 🛠️ Management Commands

### Systemd Service Management

```bash
# Start service
sudo systemctl start openvpn-web-ui

# Stop service
sudo systemctl stop openvpn-web-ui

# Restart service
sudo systemctl restart openvpn-web-ui

# Check status
sudo systemctl status openvpn-web-ui

# View logs
sudo journalctl -u openvpn-web-ui -f

# View last 100 lines
sudo journalctl -u openvpn-web-ui -n 100
```

### Application Logs

Logs are stored in `logs/app.log`:

```bash
# View real-time logs
tail -f /opt/openvpn-web-ui/logs/app.log

# View last 200 lines
tail -n 200 /opt/openvpn-web-ui/logs/app.log
```

## 📱 Usage

### Dashboard

- View server public and local IP addresses
- Monitor OpenVPN service status
- See total number of active clients
- Quick access to client manager and logs

### Client Manager

1. **Create New Client:**
   - Enter client name (alphanumeric, hyphens, underscores only)
   - Click "Create Client"
   - Download .ovpn file automatically

2. **Download Client Config:**
   - Click "Download" button next to client name
   - .ovpn file will be downloaded

3. **Revoke Client:**
   - Click "Revoke" button next to client name
   - Confirm the action
   - Client certificate will be revoked and CRL regenerated

### Logs Viewer

- View last 200 lines of application logs
- Color-coded log levels (INFO, WARN, ERROR)
- Auto-refresh every 5 seconds (optional)
- Manual refresh button

## 🔒 Security Recommendations

1. **Change Default Password** - Immediately change the default admin password
2. **Use HTTPS** - Deploy behind nginx with SSL/TLS certificate
3. **Firewall Rules** - Restrict access to port 3000 to trusted IPs
4. **Strong Passwords** - Use strong, unique passwords
5. **Regular Updates** - Keep Node.js and dependencies updated
6. **Sudoers Configuration** - Only grant necessary sudo permissions
7. **Log Monitoring** - Regularly review application logs
8. **Backup** - Regular backups of configuration and PKI

## 🌐 Nginx Reverse Proxy (Recommended)

### Install Nginx

```bash
sudo apt-get install nginx
```

### Configure Nginx

Create `/etc/nginx/sites-available/openvpn-web-ui`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL configuration
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
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

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/openvpn-web-ui /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check service status
sudo systemctl status openvpn-web-ui

# Check logs
sudo journalctl -u openvpn-web-ui -n 50

# Check if port is already in use
sudo netstat -tulpn | grep 3000
```

### Permission Denied Errors

Check sudoers configuration:

```bash
sudo visudo -c  # Verify syntax
sudo -u shuhrat sudo -l  # Test permissions
```

### Cannot Create/Revoke Clients

Verify EasyRSA paths in `config.js`:

```bash
# Find EasyRSA location
which easyrsa

# Find PKI directory
sudo find /etc -name "pki" -type d
```

### Port Already in Use

Change port in `config.js` or kill process:

```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

## 📁 Project Structure

```
openvpn-web-ui/
├── server.js                 # Main server file
├── config.js                 # Configuration
├── package.json              # Dependencies
├── openvpn-web-ui.service    # Systemd service
├── routes/
│   ├── auth.js              # Authentication routes
│   └── clients.js           # Client management routes
├── public/
│   ├── login.html           # Login page
│   ├── dashboard.html       # Dashboard page
│   ├── clients.html         # Client manager page
│   ├── logs.html            # Logs viewer page
│   ├── css/
│   │   └── style.css        # Styles
│   └── js/
│       └── common.js        # Common utilities
└── logs/
    └── app.log              # Application logs
```

## 🔄 Updating

```bash
cd /opt/openvpn-web-ui

# Pull latest changes (if using git)
git pull

# Install new dependencies
npm install

# Restart service
sudo systemctl restart openvpn-web-ui
```

## 📝 API Documentation

### Authentication

- `POST /api/login` - Login with username/password
- `POST /api/logout` - Logout and destroy session
- `GET /api/session` - Check authentication status

### Client Management

- `GET /api/clients` - List all VPN clients
- `POST /api/clients/create` - Create new client
- `POST /api/clients/revoke` - Revoke client access
- `GET /api/clients/download/:clientName` - Download .ovpn file
- `GET /api/clients/server-status` - Get OpenVPN server status

### Logs

- `GET /api/logs` - Get last 200 lines of logs

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License

## 🆘 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Contact: your-email@example.com

## 🎉 Credits

Built with ❤️ for the OpenVPN community

---

**Made by:** Your Name  
**Version:** 1.0.0  
**Last Updated:** December 2025
