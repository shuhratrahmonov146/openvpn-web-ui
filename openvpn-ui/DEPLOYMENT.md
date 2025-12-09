# Installation and Deployment Guide

This guide provides step-by-step instructions for deploying OpenVPN Management UI.

## Quick Start Commands

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
export ADMIN_USERNAME=yourusername
export ADMIN_PASSWORD=your_strong_password
export SESSION_SECRET=$(openssl rand -base64 32)

# 3. Grant sudo permissions
sudo visudo -f /etc/sudoers.d/openvpn-ui
# Add: yourusername ALL=(ALL) NOPASSWD: /bin/systemctl restart openvpn, /bin/journalctl -u openvpn*

# 4. Run with PM2 (recommended)
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 5. Access the UI
# http://your-server-ip:8080
```

## Deployment Checklist

- [ ] Change default `ADMIN_USERNAME`
- [ ] Change default `ADMIN_PASSWORD`
- [ ] Set secure `SESSION_SECRET`
- [ ] Configure sudo permissions
- [ ] Setup firewall rules
- [ ] Configure reverse proxy with SSL
- [ ] Test login functionality
- [ ] Test user management features
- [ ] Configure PM2 or systemd
- [ ] Setup monitoring and logging
- [ ] Create backup strategy

## Production Recommendations

1. **Behind Reverse Proxy:** Always deploy behind Nginx/Caddy with SSL
2. **Strong Credentials:** Use password manager to generate credentials
3. **Session Storage:** Consider Redis for session storage at scale
4. **Monitoring:** Setup monitoring with PM2 Plus or similar
5. **Backups:** Regular backups of user configurations
6. **Updates:** Keep dependencies updated monthly

## Troubleshooting

**Session not persisting:**
- Check `SESSION_SECRET` is set and consistent
- Verify cookies are enabled in browser

**Login fails:**
- Check credentials in `config.js` or environment variables
- Check server logs: `pm2 logs openvpn-ui`

**PiVPN commands fail:**
- Verify sudo permissions are configured
- Check user has access to pivpn command
- Test manually: `pivpn -l`

**Port already in use:**
- Change `PORT` environment variable
- Kill existing process: `lsof -ti:8080 | xargs kill`
