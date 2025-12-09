# OpenVPN Web UI - Sudo Configuration Guide

## 🔒 Security: Passwordless Sudo Setup

The OpenVPN Web UI requires passwordless sudo access to execute PiVPN and system commands. This guide explains how to configure this securely.

---

## ⚠️ Important Security Notes

1. **Only grant access to specific commands** - Never use `NOPASSWD: ALL`
2. **Use a dedicated user** - Don't run as root
3. **Restrict to necessary commands only**
4. **Audit regularly** - Review sudo logs periodically

---

## 📝 Step-by-Step Configuration

### 1. Identify Your User

Replace `shuhrat` with your actual system username:

```bash
whoami
```

### 2. Create Sudoers File

**NEVER edit /etc/sudoers directly!** Always use visudo:

```bash
sudo visudo -f /etc/sudoers.d/openvpn-web-ui
```

### 3. Add Sudo Rules

Add the following lines (replace `shuhrat` with your username):

```
# OpenVPN Web UI - Passwordless sudo for PiVPN commands
shuhrat ALL=(ALL) NOPASSWD: /usr/local/bin/pivpn
shuhrat ALL=(ALL) NOPASSWD: /usr/bin/pivpn
shuhrat ALL=(ALL) NOPASSWD: /usr/sbin/openvpn
shuhrat ALL=(ALL) NOPASSWD: /bin/systemctl status openvpn*
shuhrat ALL=(ALL) NOPASSWD: /bin/systemctl is-active openvpn*
shuhrat ALL=(ALL) NOPASSWD: /bin/systemctl restart openvpn*
shuhrat ALL=(ALL) NOPASSWD: /bin/systemctl reload openvpn*
shuhrat ALL=(ALL) NOPASSWD: /usr/bin/journalctl -u openvpn*
```

**Save and exit:**
- Press `Ctrl+X`
- Press `Y` to confirm
- Press `Enter` to save

### 4. Verify Syntax

Check for syntax errors:

```bash
sudo visudo -c
```

You should see: `parsed OK`

### 5. Test Sudo Access

Test if passwordless sudo works:

```bash
sudo -n pivpn -l
sudo -n systemctl is-active openvpn
sudo -n journalctl -u openvpn --no-pager -n 10
```

If these commands run **without asking for a password**, configuration is correct.

---

## 🔍 Alternative: Find PiVPN Location

If pivpn is installed in a different location:

```bash
which pivpn
```

Update the sudoers file with the correct path.

---

## 🐛 Troubleshooting

### Error: "sudo: a password is required"

**Solution:**

1. Check sudoers file exists:
   ```bash
   ls -l /etc/sudoers.d/openvpn-web-ui
   ```

2. Check file permissions (should be 0440):
   ```bash
   sudo chmod 0440 /etc/sudoers.d/openvpn-web-ui
   ```

3. Verify syntax:
   ```bash
   sudo visudo -c -f /etc/sudoers.d/openvpn-web-ui
   ```

4. Check username matches:
   ```bash
   whoami
   ```

5. Test individual commands:
   ```bash
   sudo -n -l
   ```

### Error: "pivpn: command not found"

**Solution:**

1. Find pivpn location:
   ```bash
   which pivpn
   ```

2. Update sudoers file with correct path

3. If pivpn not installed:
   ```bash
   curl -L https://install.pivpn.io | bash
   ```

### Error: "systemctl: command not found"

**Solution:**

Check systemctl location:
```bash
which systemctl
```

Update sudoers paths accordingly.

---

## 🧪 Testing After Configuration

### Test User Creation

```bash
# Try creating a test user (should NOT ask for password)
sudo -n pivpn -a -n testuser123 -p

# List users
sudo -n pivpn -l

# Revoke test user
yes | sudo -n pivpn -r testuser123
```

### Test Service Commands

```bash
# Check service status
sudo -n systemctl is-active openvpn

# View logs
sudo -n journalctl -u openvpn --no-pager -n 20
```

If all commands run without password prompts, you're ready!

---

## 🔐 Additional Security Hardening

### 1. Limit Network Access

Restrict web UI access by IP:

```bash
sudo ufw allow from 192.168.1.0/24 to any port 8080
```

### 2. Use HTTPS

Deploy behind nginx with SSL:

```bash
sudo apt install nginx certbot python3-certbot-nginx
```

### 3. Enable Audit Logging

Log all sudo commands:

```bash
echo "Defaults logfile=/var/log/sudo.log" | sudo tee -a /etc/sudoers.d/logging
```

### 4. Regular Security Updates

```bash
sudo apt update && sudo apt upgrade -y
```

---

## 📊 Monitoring Sudo Usage

### View Sudo Logs

```bash
# Recent sudo commands
sudo tail -f /var/log/auth.log | grep sudo

# Sudo audit log (if configured)
sudo tail -f /var/log/sudo.log
```

### Check Suspicious Activity

```bash
# Failed sudo attempts
sudo grep "FAILED su" /var/log/auth.log

# Unauthorized sudo usage
sudo grep "NOT in sudoers" /var/log/auth.log
```

---

## 🚨 Emergency: Revoke Access

If you need to immediately revoke sudo access:

```bash
# Remove sudoers file
sudo rm /etc/sudoers.d/openvpn-web-ui

# Or comment out all lines
sudo visudo -f /etc/sudoers.d/openvpn-web-ui
# Add # before each line
```

---

## ✅ Final Checklist

- [ ] Sudoers file created in `/etc/sudoers.d/`
- [ ] File permissions set to 0440
- [ ] Syntax validated with `sudo visudo -c`
- [ ] Username matches system user
- [ ] PiVPN path is correct
- [ ] Systemctl path is correct
- [ ] Passwordless sudo tested successfully
- [ ] Web UI can create/revoke users
- [ ] Logs accessible from web UI
- [ ] Service restart works from web UI

---

## 📚 Additional Resources

- [PiVPN Documentation](https://docs.pivpn.io/)
- [Sudoers Manual](https://www.sudo.ws/man/sudoers.man.html)
- [OpenVPN Documentation](https://openvpn.net/community-resources/)

---

## 🆘 Still Having Issues?

Common final checks:

1. **Restart shell session** after editing sudoers:
   ```bash
   exit
   # SSH back in or open new terminal
   ```

2. **Check user groups**:
   ```bash
   groups
   ```

3. **Verify sudo version**:
   ```bash
   sudo --version
   ```

4. **Check system logs**:
   ```bash
   sudo journalctl -xe | grep sudo
   ```

---

**Once configured, restart the OpenVPN Web UI service:**

```bash
sudo systemctl restart openvpn-ui
# Or if using PM2
pm2 restart openvpn-ui
```

Your OpenVPN Web UI should now work without sudo password prompts! 🎉
