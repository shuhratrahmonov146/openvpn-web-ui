#!/bin/bash

# OpenVPN Web UI - Setup Verification Script
# This script checks if your system is properly configured

echo "=============================================="
echo "OpenVPN Web UI - Setup Verification"
echo "=============================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to check if command exists
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $1 is NOT installed"
        ((FAILED++))
        return 1
    fi
}

# Function to check if directory exists
check_directory() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} Directory exists: $1"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} Directory NOT found: $1"
        ((FAILED++))
        return 1
    fi
}

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} File exists: $1"
        ((PASSED++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} File NOT found: $1"
        ((WARNINGS++))
        return 1
    fi
}

echo "Checking Prerequisites..."
echo "----------------------------"

# Check Node.js
check_command node
if [ $? -eq 0 ]; then
    NODE_VERSION=$(node -v)
    echo "  Version: $NODE_VERSION"
fi

# Check npm
check_command npm
if [ $? -eq 0 ]; then
    NPM_VERSION=$(npm -v)
    echo "  Version: $NPM_VERSION"
fi

# Check OpenVPN
check_command openvpn
if [ $? -eq 0 ]; then
    OPENVPN_VERSION=$(openvpn --version | head -1)
    echo "  $OPENVPN_VERSION"
fi

echo ""
echo "Checking OpenVPN Configuration..."
echo "----------------------------"

# Check common OpenVPN directories
FOUND_OPENVPN_DIR=false
for dir in "/etc/openvpn/server" "/etc/openvpn" "/etc/openvpn/easy-rsa"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} Found OpenVPN directory: $dir"
        FOUND_OPENVPN_DIR=true
        ((PASSED++))
    fi
done

if [ "$FOUND_OPENVPN_DIR" = false ]; then
    echo -e "${RED}✗${NC} OpenVPN directory not found"
    ((FAILED++))
fi

echo ""
echo "Checking EasyRSA..."
echo "----------------------------"

# Check EasyRSA command
EASYRSA_PATH=""
for path in "/usr/share/easy-rsa/easyrsa" "/usr/local/bin/easyrsa" "/etc/openvpn/easy-rsa/easyrsa"; do
    if [ -f "$path" ]; then
        echo -e "${GREEN}✓${NC} Found EasyRSA: $path"
        EASYRSA_PATH="$path"
        ((PASSED++))
        break
    fi
done

if [ -z "$EASYRSA_PATH" ]; then
    echo -e "${RED}✗${NC} EasyRSA not found"
    ((FAILED++))
else
    # Check if easyrsa is executable
    if [ -x "$EASYRSA_PATH" ]; then
        echo -e "${GREEN}✓${NC} EasyRSA is executable"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} EasyRSA is not executable"
        ((FAILED++))
    fi
fi

echo ""
echo "Checking PKI Configuration..."
echo "----------------------------"

# Check PKI directories
for pki_dir in "/etc/openvpn/server/easy-rsa/pki" "/etc/openvpn/easy-rsa/pki" "/etc/openvpn/pki"; do
    if [ -d "$pki_dir" ]; then
        echo -e "${GREEN}✓${NC} Found PKI directory: $pki_dir"
        ((PASSED++))
        
        # Check issued directory
        if [ -d "$pki_dir/issued" ]; then
            CERT_COUNT=$(ls -1 "$pki_dir/issued/"*.crt 2>/dev/null | wc -l)
            echo -e "${GREEN}✓${NC} Found $CERT_COUNT certificate(s) in issued directory"
            ((PASSED++))
        else
            echo -e "${YELLOW}⚠${NC} Issued directory not found in $pki_dir"
            ((WARNINGS++))
        fi
        
        # Check index.txt
        if [ -f "$pki_dir/index.txt" ]; then
            echo -e "${GREEN}✓${NC} Found index.txt file"
            ((PASSED++))
        else
            echo -e "${YELLOW}⚠${NC} index.txt not found"
            ((WARNINGS++))
        fi
        
        break
    fi
done

echo ""
echo "Checking Sudo Permissions..."
echo "----------------------------"

# Check sudo permissions
if sudo -n easyrsa 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Can run easyrsa with sudo (no password)"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Cannot run easyrsa with sudo without password"
    echo "  Run: sudo visudo -f /etc/sudoers.d/openvpn-web-ui"
    ((FAILED++))
fi

echo ""
echo "Checking Application Files..."
echo "----------------------------"

# Check application files
check_file "./package.json"
check_file "./server.js"
check_file "./config.js"
check_file "./routes/auth.js"
check_file "./routes/clients.js"
check_file "./public/login.html"

# Check node_modules
if [ -d "./node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules directory exists"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} node_modules NOT found - run: npm install"
    ((FAILED++))
fi

# Check logs directory
if [ -d "./logs" ]; then
    echo -e "${GREEN}✓${NC} logs directory exists"
    ((PASSED++))
    
    # Check if writable
    if [ -w "./logs" ]; then
        echo -e "${GREEN}✓${NC} logs directory is writable"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} logs directory is NOT writable"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⚠${NC} logs directory not found (will be created on first run)"
    ((WARNINGS++))
fi

echo ""
echo "=============================================="
echo "Summary"
echo "=============================================="
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ System is ready to run OpenVPN Web UI!${NC}"
    echo ""
    echo "To start the application:"
    echo "  npm start"
    echo ""
    echo "Or install as systemd service:"
    echo "  sudo cp openvpn-web-ui.service /etc/systemd/system/"
    echo "  sudo systemctl daemon-reload"
    echo "  sudo systemctl enable openvpn-web-ui"
    echo "  sudo systemctl start openvpn-web-ui"
    exit 0
else
    echo -e "${RED}✗ System has configuration issues. Please fix the errors above.${NC}"
    exit 1
fi
