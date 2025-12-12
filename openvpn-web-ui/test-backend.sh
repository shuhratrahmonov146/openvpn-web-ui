#!/bin/bash

echo "======================================"
echo "OpenVPN Web UI - Backend Test Script"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test command
test_command() {
    local description="$1"
    local command="$2"
    
    echo -n "Testing: $description... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}FAILED${NC}"
        ((FAILED++))
        return 1
    fi
}

# Test 1: Check if PiVPN is installed
echo "=== System Commands ==="
test_command "PiVPN installed" "which pivpn"
test_command "OpenVPN service exists" "systemctl list-units --full -all | grep -q openvpn@server"
test_command "Sudo access configured" "sudo -n -l | grep -q pivpn"

echo ""
echo "=== PiVPN Commands ==="

# Test 2: PiVPN list users
test_command "PiVPN list users" "sudo -n pivpn -l"

# Test 3: PiVPN connected clients
test_command "PiVPN connected clients" "sudo -n pivpn -c"

# Test 4: Check OpenVPN status log
test_command "OpenVPN status log exists" "sudo -n test -f /var/log/openvpn-status.log"

echo ""
echo "=== Configuration ==="

# Test 5: Check config directory
test_command "OVPN config directory exists" "test -d /home/shuhrat/ovpns"

# Test 6: Check permissions
test_command "Config directory readable" "test -r /home/shuhrat/ovpns"

echo ""
echo "=== Node.js Backend ==="

# Test 7: Check if Node.js is installed
test_command "Node.js installed" "which node"

# Test 8: Check package.json exists
test_command "package.json exists" "test -f package.json"

# Test 9: Check services directory
test_command "Services directory exists" "test -d services"

# Test 10: Check all service files
test_command "execService.js exists" "test -f services/execService.js"
test_command "statusService.js exists" "test -f services/statusService.js"
test_command "userService.js exists" "test -f services/userService.js"

echo ""
echo "======================================"
echo -e "Results: ${GREEN}${PASSED} PASSED${NC}, ${RED}${FAILED} FAILED${NC}"
echo "======================================"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! Backend is ready.${NC}"
    exit 0
else
    echo -e "${YELLOW}Some tests failed. Please fix the issues above.${NC}"
    exit 1
fi
