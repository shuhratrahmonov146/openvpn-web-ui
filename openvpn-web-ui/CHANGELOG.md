# 📝 Changelog

All notable changes and fixes to the OpenVPN Web UI project.

## [1.1.0] - 2024-12-11

### 🎉 Major Improvements

#### Project Cleanup
- **Removed duplicate project** `openvpn-ui` - Cleaned up workspace to have single clean codebase
- Kept `openvpn-web-ui` as the active, modern implementation with EasyRSA support

#### User Management Fixes

##### ✅ Fixed: Client Creation Issues
- **Added working directory context** for EasyRSA commands
  - Commands now execute with `cd` to EasyRSA directory before running
  - Fixes "command not found" and "PKI not found" errors
  
- **Added duplicate client check**
  - Prevents creating clients that already exist
  - Shows clear error message: "Client already exists"

- **Improved error messages**
  - More descriptive error responses
  - Better logging for troubleshooting

##### ✅ Fixed: Client Revocation
- **Added existence check** before revoking
  - Returns 404 if client doesn't exist
  - Prevents errors when trying to revoke non-existent clients

- **Proper working directory** for revoke commands
  - Ensures CRL generation works correctly

##### ✅ Fixed: Client Status Detection
- **Improved revoked status checking**
  - Now reads EasyRSA's `index.txt` file
  - Accurately detects revoked clients by checking status flag
  - Replaced unreliable directory-based check

- **Better status display**
  - Active clients show green badge
  - Revoked clients show red badge with "revoked" status

#### Configuration Improvements

##### 📝 Updated Config Documentation
- Added clear comments for all settings
- Documented required sudo commands
- Added path verification instructions

##### 🔧 Enhanced Command Execution
- `execCommand()` function now supports:
  - Working directory option (`cwd`)
  - Custom execution options
  - Better error handling and logging

#### Security Enhancements

##### 🔒 Input Validation
- Client name validation (alphanumeric, hyphens, underscores only)
- Path traversal prevention in file downloads
- Proper error handling for invalid inputs

##### 🛡️ Session Management
- Secure session-based authentication
- HttpOnly cookies
- Proper session destruction on logout

#### Documentation

##### 📚 New Documentation Files
- **SETUP_GUIDE.md** - Complete step-by-step installation guide
  - OpenVPN installation
  - PKI initialization
  - Node.js setup
  - Sudo configuration
  - Service setup
  - HTTPS setup with nginx

- **verify-setup.sh** - Automated setup verification script
  - Checks all prerequisites
  - Verifies directory structure
  - Tests sudo permissions
  - Validates PKI configuration

##### 📖 Updated README.md
- Added troubleshooting section
- Common error solutions
- Configuration tips
- API documentation
- Project structure overview

#### Code Quality

##### 🧹 Code Improvements
- Consistent error handling across all routes
- Proper async/await usage
- Better logging with Winston
- Clean code structure with proper separation of concerns

##### 🔍 Better Logging
- All operations logged with timestamps
- Error stack traces for debugging
- Log rotation (10MB, 5 files)
- Console and file logging

#### User Interface

##### 🎨 UI Enhancements
- Modal for successful client creation
- Download button in creation modal
- Loading states on buttons
- Success/error alerts with animations
- Auto-refresh for dashboard (30 seconds)
- Auto-refresh for logs (5 seconds, optional)

##### 📊 Dashboard Features
- Real-time server status
- Public and local IP display
- Active client count
- Recent clients list
- Quick action buttons

#### API Improvements

##### 🔌 New/Fixed Endpoints
- `POST /api/clients/create` - Fixed with proper error handling
- `POST /api/clients/revoke` - Enhanced with existence check
- `GET /api/clients` - Improved status detection
- `GET /api/clients/download/:clientName` - Added validation
- `GET /api/clients/server-status` - Server status and IPs
- `GET /api/logs` - Application logs viewer
- `GET /api/session` - Check authentication status

### 🐛 Bug Fixes

1. **EasyRSA command execution**
   - Fixed: Commands failing due to wrong working directory
   - Solution: Added `cd` to EasyRSA directory before commands

2. **Duplicate client creation**
   - Fixed: Could create multiple clients with same name
   - Solution: Check for existing certificate before creation

3. **Revoked status not showing**
   - Fixed: All clients showing as active
   - Solution: Read index.txt file to check revocation status

4. **Client revocation errors**
   - Fixed: Errors when revoking non-existent clients
   - Solution: Check client exists before attempting revocation

5. **Download errors**
   - Fixed: Path traversal vulnerability
   - Solution: Validate client names and sanitize paths

### 🔧 Configuration Changes

#### Updated config.js
```javascript
// Added proper paths
EASYRSA_DIR: '/etc/openvpn/easy-rsa',
PKI_DIR: '/etc/openvpn/easy-rsa/pki',

// Commands now with proper context
EASYRSA_BUILD_CLIENT: 'sudo easyrsa build-client-full',
EASYRSA_REVOKE: 'sudo easyrsa revoke',
EASYRSA_GEN_CRL: 'sudo easyrsa gen-crl',
```

### 📦 Dependencies

No new dependencies added. Using:
- express: ^4.18.2
- express-session: ^1.17.3
- body-parser: ^1.20.2
- winston: ^3.11.0
- cors: ^2.8.5

### 🎯 Migration Notes

If upgrading from previous version:

1. **Update config.js** with new EASYRSA_DIR setting
2. **Update sudoers** file with new command paths
3. **Restart service**: `sudo systemctl restart openvpn-web-ui`
4. **Run verification**: `./verify-setup.sh`

### ⚠️ Breaking Changes

None. All changes are backward compatible.

### 🔮 Future Enhancements

Planned for next release:
- [ ] User management (multiple admin users)
- [ ] Email notifications for new clients
- [ ] QR code generation for mobile clients
- [ ] Client connection statistics
- [ ] Bandwidth usage monitoring
- [ ] Backup/restore PKI functionality
- [ ] Two-factor authentication
- [ ] Docker support improvements

### 🙏 Acknowledgments

- OpenVPN community
- EasyRSA developers
- Node.js and Express.js teams

---

## [1.0.0] - Initial Release

### Features
- Basic client management
- Dashboard with server status
- Logs viewer
- Session-based authentication
- EasyRSA integration

---

**Note:** This changelog follows [Keep a Changelog](https://keepachangelog.com/) format.
