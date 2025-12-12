# Complete Backend Setup Guide for PiVPN

## Overview
This guide will help you set up the OpenVPN Web UI backend to work with PiVPN commands.

## Prerequisites

1. **Ubuntu/Debian Server** with PiVPN installed
2. **Node.js** 14+ installed
3. **Sudo privileges** for the system user

## Step 1: Configure Sudo Access

The backend needs to run PiVPN commands without password prompts.

Edit sudoers file:
```bash
sudo visudo -f /etc/sudoers.d/openvpn-web-ui
```

Add these lines (replace `shuhrat` with your username):
```
shuhrat ALL=(ALL) NOPASSWD: /usr/local/bin/pivpn
shuhrat ALL=(ALL) NOPASSWD: /bin/systemctl restart openvpn@server
shuhrat ALL=(ALL) NOPASSWD: /bin/systemctl reload openvpn@server
shuhrat ALL=(ALL) NOPASSWD: /bin/systemctl is-active openvpn@server
shuhrat ALL=(ALL) NOPASSWD: /bin/cat /var/log/openvpn-status.log
shuhrat ALL=(ALL) NOPASSWD: /bin/journalctl -u openvpn@server *
```

Save and exit. Verify:
```bash
sudo -l
```

## Step 2: Verify PiVPN Installation

Check PiVPN is installed:
```bash
pivpn -l
```

Check OpenVPN service:
```bash
systemctl status openvpn@server
```

Verify config directory exists:
```bash
ls -la /home/shuhrat/ovpns/
```

## Step 3: Test PiVPN Commands

### Test List Users:
```bash
sudo -n pivpn -l
```

### Test Connected Clients:
```bash
sudo -n pivpn -c
```

### Test Add User (non-interactive):
```bash
sudo -n pivpn -a -n testuser -d 1080
```

### Test Revoke User:
```bash
yes | sudo -n pivpn -r testuser
```

## Step 4: Configure Application

Edit `config.js` and verify paths:

```javascript
module.exports = {
  SYSTEM_USER: 'shuhrat',
  OVPN_CONFIG_DIR: '/home/shuhrat/ovpns',
  OPENVPN_SERVICE: 'openvpn@server',
  // ... other settings
};
```

## Step 5: Install Dependencies

```bash
cd /path/to/openvpn-web-ui
npm install
```

## Step 6: Run Tests

```bash
chmod +x test-backend.sh
./test-backend.sh
```

All tests should pass before starting the server.

## Step 7: Start Server

### Development Mode:
```bash
npm run dev
```

### Production Mode with PM2:
```bash
npm install -g pm2
pm2 start server.js --name openvpn-ui
pm2 save
pm2 startup
```

### Or use systemd:
```bash
sudo cp openvpn-web-ui.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable openvpn-web-ui
sudo systemctl start openvpn-web-ui
```

## Troubleshooting

### Issue: "Sudo password required"
**Solution:** Check sudo configuration in `/etc/sudoers.d/openvpn-web-ui`

### Issue: "Command not found: pivpn"
**Solution:** Install PiVPN: `curl -L https://install.pivpn.io | bash`

### Issue: "User already exists" when creating user
**Solution:** This is normal - delete existing config file or choose different name

### Issue: "No connected clients shown"
**Solution:** Check `/var/log/openvpn-status.log` exists and is readable

### Issue: "ANSI color codes in output"
**Solution:** Backend automatically strips these - if you see them, check execService.js

## API Endpoints

### Get Users List
```bash
curl http://localhost:3000/api/clients
```

### Create User
```bash
curl -X POST http://localhost:3000/api/clients/create \
  -H "Content-Type: application/json" \
  -d '{"clientName": "newuser"}'
```

### Revoke User
```bash
curl -X POST http://localhost:3000/api/clients/revoke \
  -H "Content-Type: application/json" \
  -d '{"clientName": "olduser"}'
```

### Get Server Status
```bash
curl http://localhost:3000/api/clients/server-status
```

### Get Connected Clients
```bash
curl http://localhost:3000/api/clients/connected
```

## Security Notes

1. Always use HTTPS in production
2. Change default admin password in config.js
3. Restrict sudo access to only required commands
4. Use firewall to restrict access to port 3000
5. Consider using reverse proxy (nginx) with SSL

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong SESSION_SECRET
3. Enable HTTPS
4. Set up log rotation
5. Configure firewall rules
6. Use PM2 or systemd for process management
7. Set up monitoring and alerts

## Success Criteria

✅ All tests pass
✅ Can create users via UI
✅ Can revoke users via UI
✅ Can download .ovpn files
✅ Server status shows "Online"
✅ Connected clients count is correct
✅ No sudo errors in logs
✅ Auto-refresh works every 10 seconds

## Support

If you encounter issues:

1. Check logs: `tail -f logs/app.log`
2. Check OpenVPN logs: `sudo journalctl -u openvpn@server -f`
3. Run test script: `./test-backend.sh`
4. Verify sudo access: `sudo -l`
5. Check service status: `systemctl status openvpn@server`
