# Nginx Configuration Fix for Login Error

## Problem

The error "Cannot POST /login" occurs because the Nginx reverse proxy is stripping the `/api` prefix when forwarding requests to the Node.js backend.

## Root Cause

The production Nginx configuration likely has trailing slashes that strip the `/api` prefix:

```nginx
# CURRENT (INCORRECT) CONFIGURATION
location /api/ {
    proxy_pass http://localhost:3000/;
    # ...other config...
}
```

When a request comes in as `/api/login`, Nginx removes `/api` and forwards only `/login` to the backend.
But the backend expects `/api/login` because routes are mounted under `/api` prefix.

## Solution: Fix Nginx Configuration

### Step 1: Locate Nginx Configuration

SSH into your server and find the Nginx config file:

```bash
# Common locations:
/etc/nginx/sites-available/trustbox.diemitchell.com
/etc/nginx/conf.d/trustbox.diemitchell.com.conf
/etc/nginx/nginx.conf
```

### Step 2: Edit the Configuration

Open the config file:
```bash
sudo nano /etc/nginx/sites-available/trustbox.diemitchell.com
```

### Step 3: Update the /api Location Block

Change:
```nginx
location /api/ {
    proxy_pass http://localhost:3000/;
```

To (remove trailing slashes):
```nginx
location /api {
    proxy_pass http://localhost:3000;
```

### Complete Correct Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name trustbox.diemitchell.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Frontend - serve static files
    location / {
        root /path/to/TrustBox;
        index loginV3.html mvpV3.html;
        try_files $uri $uri/ =404;
    }

    # Backend API - preserve /api prefix
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 4: Test and Reload Nginx

```bash
# Test configuration for syntax errors
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx

# Or restart Nginx
sudo systemctl restart nginx
```

### Step 5: Verify the Fix

Test the login endpoint:
```bash
curl -X POST https://trustbox.diemitchell.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

You should get a JSON response (401 Unauthorized is expected with invalid credentials), NOT "Cannot POST /login".

## How Nginx proxy_pass Works

### With Trailing Slashes (WRONG for our setup)
```nginx
location /api/ {
    proxy_pass http://localhost:3000/;
}
```
- Request: `/api/login` → Backend receives: `/login` ❌

### Without Trailing Slashes (CORRECT)
```nginx
location /api {
    proxy_pass http://localhost:3000;
}
```
- Request: `/api/login` → Backend receives: `/api/login` ✅

## Troubleshooting

### Still Getting "Cannot POST /login"?

1. **Check if Nginx actually reloaded:**
   ```bash
   sudo systemctl status nginx
   sudo nginx -T | grep -A 10 "location /api"
   ```

2. **Check Nginx error logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Check Node.js backend is running:**
   ```bash
   # If using PM2
   pm2 status
   pm2 logs trustbox

   # If using systemd
   sudo systemctl status trustbox.service
   sudo journalctl -u trustbox.service -f
   ```

4. **Verify backend routes:**
   ```bash
   curl http://localhost:3000/api/login
   # Should NOT return "Cannot POST /login"
   ```

### Check Which Configuration File is Active

```bash
# Show active Nginx configuration
sudo nginx -T

# Find all configuration files
sudo find /etc/nginx -name "*.conf" -o -name "*trustbox*"
```

## Alternative: Change Backend Instead

If you cannot modify the Nginx configuration, you can modify the backend to work without the `/api` prefix. See the code changes in the pull request for this issue.
