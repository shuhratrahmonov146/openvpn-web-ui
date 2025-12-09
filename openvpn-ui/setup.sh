#!/bin/bash

# OpenVPN UI - Quick Setup Script
# This script helps you set up the OpenVPN Management UI

set -e

echo "=========================================="
echo "  OpenVPN Management UI - Quick Setup"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 14+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please edit .env and update the following:"
    echo "   - ADMIN_USERNAME"
    echo "   - ADMIN_PASSWORD"
    echo "   - SESSION_SECRET"
    echo ""
fi

# Generate a random session secret
SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "🔑 Generated session secret:"
echo "   $SESSION_SECRET"
echo ""
echo "💡 Add this to your .env file as SESSION_SECRET"
echo ""

# Check if PiVPN is installed
if command -v pivpn &> /dev/null; then
    echo "✅ PiVPN is installed"
else
    echo "⚠️  PiVPN not found. Make sure PiVPN is installed on your system."
fi
echo ""

# Check sudo permissions
echo "🔐 Checking sudo permissions..."
echo "   You may need to configure sudo permissions for:"
echo "   - systemctl restart openvpn"
echo "   - journalctl -u openvpn"
echo ""
echo "   Run: sudo visudo -f /etc/sudoers.d/openvpn-ui"
echo "   Add: $USER ALL=(ALL) NOPASSWD: /bin/systemctl restart openvpn, /bin/journalctl -u openvpn*"
echo ""

# Ask what to do next
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "What would you like to do?"
echo ""
echo "1) Start in development mode (npm start)"
echo "2) Install and start with PM2"
echo "3) Show systemd setup instructions"
echo "4) Exit (I'll configure manually)"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo ""
        echo "Starting in development mode..."
        echo "Visit: http://localhost:8080/login"
        echo ""
        npm start
        ;;
    2)
        echo ""
        echo "Installing PM2..."
        sudo npm install -g pm2
        echo ""
        echo "Starting with PM2..."
        pm2 start ecosystem.config.js
        pm2 save
        echo ""
        echo "✅ OpenVPN UI is running!"
        echo "   View logs: pm2 logs openvpn-ui"
        echo "   Status: pm2 status"
        echo "   Visit: http://localhost:8080/login"
        echo ""
        read -p "Configure PM2 to start on boot? [y/N]: " setup_startup
        if [[ $setup_startup =~ ^[Yy]$ ]]; then
            pm2 startup
            echo ""
            echo "⚠️  Copy and run the command above to complete startup configuration"
        fi
        ;;
    3)
        echo ""
        echo "=========================================="
        echo "  Systemd Setup Instructions"
        echo "=========================================="
        echo ""
        echo "1. Edit the service file:"
        echo "   nano openvpn-ui.service"
        echo ""
        echo "2. Replace 'USERNAME' with your username: $USER"
        echo ""
        echo "3. Copy service file:"
        echo "   sudo cp openvpn-ui.service /etc/systemd/system/"
        echo ""
        echo "4. Reload systemd:"
        echo "   sudo systemctl daemon-reload"
        echo ""
        echo "5. Enable and start:"
        echo "   sudo systemctl enable openvpn-ui"
        echo "   sudo systemctl start openvpn-ui"
        echo ""
        echo "6. Check status:"
        echo "   sudo systemctl status openvpn-ui"
        echo ""
        ;;
    4)
        echo ""
        echo "Manual configuration chosen."
        echo ""
        echo "Quick commands:"
        echo "  Development: npm start"
        echo "  PM2: pm2 start ecosystem.config.js"
        echo "  Docker: docker-compose up -d"
        echo ""
        echo "See README.md for full documentation."
        ;;
    *)
        echo "Invalid choice. Exiting."
        ;;
esac

echo ""
echo "=========================================="
echo "  Don't forget to:"
echo "=========================================="
echo "✓ Update .env with secure credentials"
echo "✓ Configure sudo permissions"
echo "✓ Setup firewall rules"
echo "✓ Configure reverse proxy with SSL"
echo ""
echo "📚 Full documentation: README.md"
echo "🚀 Deployment guide: DEPLOYMENT.md"
echo ""
