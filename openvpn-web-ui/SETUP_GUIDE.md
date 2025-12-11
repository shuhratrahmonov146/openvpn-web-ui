# 🚀 OpenVPN Web UI - Complete Setup Guide

This guide will walk you through setting up OpenVPN Web UI from scratch on a fresh Ubuntu/Debian server.

## 📋 Table of Contents

1. [Install OpenVPN and EasyRSA](#step-1-install-openvpn-and-easyrsa)
2. [Initialize PKI](#step-2-initialize-pki)
3. [Install Node.js](#step-3-install-nodejs)
4. [Install Web UI](#step-4-install-web-ui)
5. [Configure Sudo](#step-5-configure-sudo)
6. [Start Application](#step-6-start-application)
7. [Verify Installation](#step-7-verify-installation)

---

## Step 1: Install OpenVPN and EasyRSA

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install OpenVPN
sudo apt install -y openvpn

# Install EasyRSA
sudo apt install -y easy-rsa

# Verify installation
openvpn --version
```

## Step 2: Initialize PKI

```bash
# Create EasyRSA directory
sudo mkdir -p /etc/openvpn/easy-rsa
cd /etc/openvpn/easy-rsa

# Copy EasyRSA files
sudo cp -r /usr/share/easy-rsa/* .

# Initialize PKI
sudo ./easyrsa init-pki

# Build CA (Certificate Authority)
sudo ./easyrsa build-ca nopass
# Press Enter to use default name "Easy-RSA CA"

# Generate Diffie-Hellman parameters (takes a few minutes)
sudo ./easyrsa gen-dh

# Build server certificate
sudo ./easyrsa build-server-full server nopass

# Generate CRL (Certificate Revocation List)
sudo ./easyrsa gen-crl

# Set permissions
sudo chown -R root:root /etc/openvpn/easy-rsa
sudo chmod -R 755 /etc/openvpn/easy-rsa
```

## Step 3: Install Node.js

```bash
# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

## Step 4: Install Web UI

```bash
# Create application directory
sudo mkdir -p /opt/openvpn-web-ui
sudo chown $USER:$USER /opt/openvpn-web-ui

# Copy application files
cd /opt/openvpn-web-ui
# (Copy all files here or git clone)

# Install dependencies
npm install

# Verify all files are present
ls -la
# Should see: server.js, config.js, package.json, routes/, public/
```

## Step 5: Configure Sudo

**Critical Step:** The application needs sudo access to manage OpenVPN.

```bash
# Create sudoers file
sudo visudo -f /etc/sudoers.d/openvpn-web-ui
```

Add these lines (replace `shuhrat` with your username):

```
shuhrat ALL=(ALL) NOPASSWD: /usr/share/easy-rsa/easyrsa *
shuhrat ALL=(ALL) NOPASSWD: /etc/openvpn/easy-rsa/easyrsa *
shuhrat ALL=(ALL) NOPASSWD: /usr/bin/ovpn_getclient *
shuhrat ALL=(ALL) NOPASSWD: /bin/systemctl reload openvpn-server@server
```

Save and exit (Ctrl+X, Y, Enter).

**Verify sudo configuration:**

```bash
sudo -l
# You should see the commands listed without "PASSWD" requirement
```

## Step 6: Configure Application

Edit `config.js` to match your system:

```bash
nano config.js
```

**Important settings to verify:**

```javascript
module.exports = {
  PORT: 3000,                                          // Web UI port
  HOST: '0.0.0.0',                                     // Listen on all interfaces
  
  ADMIN_USERNAME: 'admin',                             // Change this!
  ADMIN_PASSWORD: 'hprogramist8060',                   // Change this!
  
  SYSTEM_USER: 'shuhrat',                              // Your username
  EASYRSA_DIR: '/etc/openvpn/easy-rsa',               // EasyRSA location
  PKI_DIR: '/etc/openvpn/easy-rsa/pki',               // PKI location
  
  // Commands - adjust paths if needed
  EASYRSA_BUILD_CLIENT: 'sudo easyrsa build-client-full',
  EASYRSA_REVOKE: 'sudo easyrsa revoke',
  EASYRSA_GEN_CRL: 'sudo easyrsa gen-crl',
  OVPN_GETCLIENT: 'sudo ovpn_getclient',
};
```

Save and exit (Ctrl+X, Y, Enter).

## Step 7: Start Application

### Option A: Run Manually (Testing)

```bash
cd /opt/openvpn-web-ui
npm start
```

The application will start on http://localhost:3000

### Option B: Run as Systemd Service (Production)

```bash
# Copy service file
sudo cp openvpn-web-ui.service /etc/systemd/system/

# Edit service file to match your username
sudo nano /etc/systemd/system/openvpn-web-ui.service

# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable openvpn-web-ui

# Start service
sudo systemctl start openvpn-web-ui

# Check status
sudo systemctl status openvpn-web-ui
```

## Step 8: Verify Installation

Run the verification script:

```bash
cd /opt/openvpn-web-ui
chmod +x verify-setup.sh
./verify-setup.sh
```

This will check:
- ✅ Node.js and npm installed
- ✅ OpenVPN installed
- ✅ EasyRSA available
- ✅ PKI initialized
- ✅ Sudo permissions configured
- ✅ Application files present

## 🌐 Access Web UI

1. Open browser: `http://your-server-ip:3000`
2. Login with:
   - Username: `admin`
   - Password: `hprogramist8060` (or what you set in config.js)

## 🔧 Common Post-Installation Tasks

### Change Admin Password

Edit `config.js`:

```javascript
ADMIN_USERNAME: 'admin',
ADMIN_PASSWORD: 'your-secure-password-here',
```

Restart service:

```bash
sudo systemctl restart openvpn-web-ui
```

### Allow External Access

If running on a cloud server, open port 3000:

```bash
# UFW firewall
sudo ufw allow 3000/tcp

# Or iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

### Setup HTTPS (Recommended)

Use nginx as reverse proxy:

```bash
sudo apt install -y nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/openvpn-web-ui
```

Add:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/openvpn-web-ui /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Install Let's Encrypt SSL:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 📊 Usage

### Create VPN Client

1. Go to **Client Manager**
2. Enter client name (e.g., `john-laptop`)
3. Click **Create Client**
4. Download the `.ovpn` file
5. Import into OpenVPN client

### Revoke Client Access

1. Go to **Client Manager**
2. Find client in list
3. Click **Revoke**
4. Client can no longer connect

### View Logs

1. Go to **Logs**
2. View application logs
3. Enable auto-refresh for real-time monitoring

## 🆘 Troubleshooting

### Service won't start

```bash
# Check logs
sudo journalctl -u openvpn-web-ui -f

# Check if port is in use
sudo lsof -i :3000

# Check application logs
tail -f /opt/openvpn-web-ui/logs/app.log
```

### Can't create clients

```bash
# Test easyrsa manually
cd /etc/openvpn/easy-rsa
sudo ./easyrsa build-client-full test-client nopass

# Check sudo permissions
sudo -l

# Verify PKI exists
ls -la /etc/openvpn/easy-rsa/pki
```

### Clients list empty

```bash
# Check issued certificates
ls -la /etc/openvpn/easy-rsa/pki/issued/

# If empty, PKI not initialized properly
cd /etc/openvpn/easy-rsa
sudo ./easyrsa init-pki
sudo ./easyrsa build-ca nopass
```

## 🎯 Next Steps

- [ ] Change default admin password
- [ ] Create your first VPN client
- [ ] Test client connection
- [ ] Set up automatic backups of PKI
- [ ] Configure firewall rules
- [ ] Set up HTTPS with Let's Encrypt
- [ ] Monitor logs regularly

## 📚 Additional Resources

- [OpenVPN Documentation](https://openvpn.net/community-resources/)
- [EasyRSA Documentation](https://easy-rsa.readthedocs.io/)
- [Node.js Documentation](https://nodejs.org/docs/)

---

**Need help?** Open an issue on GitHub or check the main README.md for more information.
