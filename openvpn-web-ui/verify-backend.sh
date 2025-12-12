#!/bin/bash

# Quick verification script for OpenVPN Web UI

echo "🔍 Verifying OpenVPN Web UI Backend..."
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js installed: $(node --version)"
else
    echo "❌ Node.js not found"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    echo "✅ npm installed: $(npm --version)"
else
    echo "❌ npm not found"
    exit 1
fi

# Check if in correct directory
if [ -f "server.js" ]; then
    echo "✅ server.js found"
else
    echo "❌ server.js not found - are you in the correct directory?"
    exit 1
fi

# Check services directory
if [ -d "services" ]; then
    echo "✅ services/ directory exists"
    
    if [ -f "services/execService.js" ]; then
        echo "  ✅ execService.js"
    else
        echo "  ❌ execService.js missing"
    fi
    
    if [ -f "services/statusService.js" ]; then
        echo "  ✅ statusService.js"
    else
        echo "  ❌ statusService.js missing"
    fi
    
    if [ -f "services/userService.js" ]; then
        echo "  ✅ userService.js"
    else
        echo "  ❌ userService.js missing"
    fi
else
    echo "❌ services/ directory not found"
    exit 1
fi

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "✅ node_modules/ exists"
else
    echo "⚠️  node_modules/ not found - run: npm install"
fi

# Check PiVPN
if command -v pivpn &> /dev/null; then
    echo "✅ PiVPN installed"
else
    echo "❌ PiVPN not found - install from: https://pivpn.io"
    exit 1
fi

# Check sudo access
if sudo -n pivpn -l &> /dev/null; then
    echo "✅ Sudo access configured correctly"
else
    echo "❌ Sudo access not configured - see BACKEND_SETUP.md"
    exit 1
fi

# Check OpenVPN service
if systemctl list-units --full -all | grep -q "openvpn@server"; then
    echo "✅ OpenVPN service exists"
    
    if systemctl is-active --quiet openvpn@server; then
        echo "  ✅ Service is running"
    else
        echo "  ⚠️  Service is not running"
    fi
else
    echo "❌ OpenVPN service not found"
    exit 1
fi

# Check config directory
if [ -d "/home/shuhrat/ovpns" ]; then
    echo "✅ Config directory exists: /home/shuhrat/ovpns"
else
    echo "⚠️  Config directory not found: /home/shuhrat/ovpns"
fi

echo ""
echo "🎉 Verification complete!"
echo ""
echo "Next steps:"
echo "1. Install dependencies: npm install"
echo "2. Start server: npm start"
echo "3. Access UI: http://localhost:3000"
echo "4. Login: admin / hprogramist8060"
echo ""
echo "For detailed setup: see BACKEND_SETUP.md"
