# TrustBox Deployment Guide

This guide provides instructions for deploying updates to the TrustBox production server.

## Prerequisites

- SSH access to the production server (trustbox.diemitchell.com)
- Git repository access
- Permissions to restart the Node.js service

## Deployment Steps

### 1. Connect to the Production Server

```bash
ssh user@trustbox.diemitchell.com
```

Replace `user` with your actual username.

### 2. Navigate to the TrustBox Directory

```bash
cd /path/to/TrustBox/backend
```

The exact path depends on your server setup. Common locations:
- `/var/www/TrustBox/backend`
- `/home/user/TrustBox/backend`
- `/opt/TrustBox/backend`

### 3. Pull the Latest Code

```bash
# Fetch the latest changes
git fetch origin

# Pull the latest main branch
git pull origin main
```

### 4. Install Dependencies (if package.json changed)

```bash
npm install
```

### 5. Restart the Node.js Server

The restart method depends on how the server is running:

#### Option A: Using PM2 (Recommended)

```bash
# If using PM2
pm2 restart trustbox

# Or restart all processes
pm2 restart all

# View logs to confirm
pm2 logs trustbox
```

#### Option B: Using systemd Service

```bash
# If running as a systemd service
sudo systemctl restart trustbox.service

# Check status
sudo systemctl status trustbox.service

# View logs
sudo journalctl -u trustbox.service -f
```

#### Option C: Using Forever

```bash
# If using Forever
forever restart serverV2.js

# Or stop and start
forever stop serverV2.js
forever start serverV2.js
```

#### Option D: Manual Process

```bash
# Find the process ID
ps aux | grep serverV2.js

# Kill the process (replace PID with actual process ID)
kill PID

# Start the server again
node serverV2.js &
```

### 6. Verify the Deployment

Check that the server is running correctly:

```bash
# Check if the process is running
ps aux | grep serverV2.js

# Test the API endpoint
curl https://trustbox.diemitchell.com/api/getData

# Test the login endpoint with a POST request
curl -X POST https://trustbox.diemitchell.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'
```

Expected response for `/api/login` (even with wrong credentials):
```json
{"message": "Invalid email or password."}
```

If you get `Cannot POST /login`, the server hasn't picked up the new code.

## Common Issues

### Issue: "Cannot POST /login" Error

**Cause:** The server is still running the old code without the `/api` prefix.

**Solution:** Ensure you've pulled the latest code and properly restarted the Node.js process.

### Issue: Server Won't Start

**Cause:** Database connection issues or missing environment variables.

**Solution:**
1. Check the `.env` file exists and has correct values
2. Verify database connectivity
3. Check server logs for specific errors

### Issue: Changes Not Reflected

**Cause:** Browser caching or server not restarted.

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Verify server restart was successful
3. Check nginx has reloaded: `sudo nginx -t && sudo systemctl reload nginx`

## Rollback Procedure

If the deployment causes issues:

```bash
# Revert to previous version
git log --oneline -5  # Find the previous commit hash
git reset --hard <previous-commit-hash>

# Restart the server
pm2 restart trustbox  # Or your restart method
```

## Post-Deployment Checklist

- [ ] Server process is running
- [ ] Login endpoint responds correctly
- [ ] Registration endpoint responds correctly
- [ ] CRUD operations work (getData, saveData, update, delete)
- [ ] Frontend can authenticate users
- [ ] No errors in server logs

## Server Management Commands

### View Running Processes
```bash
# PM2
pm2 list
pm2 info trustbox

# systemd
systemctl status trustbox.service

# Manual
ps aux | grep node
```

### View Logs
```bash
# PM2
pm2 logs trustbox --lines 100

# systemd
journalctl -u trustbox.service -n 100 -f

# Manual (if logging to file)
tail -f /path/to/logs/server.log
```

### Check Server Health
```bash
# Check if port 3000 is listening
netstat -tuln | grep 3000

# Or using ss
ss -tuln | grep 3000

# Test database connectivity
curl http://localhost:3000/api/getData
```

## Security Notes

- Always pull code from trusted sources only
- Review changes before deploying to production
- Keep `.env` file secure and never commit it
- Ensure SSL certificates are valid and up to date
- Run `npm audit` regularly to check for vulnerabilities

## Emergency Contacts

If you encounter issues during deployment:
- Check GitHub Issues: https://github.com/Veradux001/TrustBox/issues
- Review server logs for error messages
- Contact the development team

## Automated Deployment (Future Enhancement)

Consider setting up automated deployment with:
- GitHub Actions for CI/CD
- Webhook triggers for automatic pulls
- PM2 ecosystem file for consistent deployments
- Automated testing before deployment

---

**Last Updated:** December 2, 2025
**Version:** 1.0
