# Nginx Configuration Fix

## Problem

The error "Cannot POST /login" occurs because Nginx is stripping the `/api` prefix when forwarding requests to the Node.js backend.

## Root Cause

Nginx configuration with trailing slashes strips the `/api` prefix:

```nginx
# INCORRECT CONFIGURATION
location /api/ {
    proxy_pass http://localhost:3000/;
}
```

When a request comes in as `/api/login`, Nginx removes `/api` and forwards only `/login` to the backend, but the backend expects `/api/login`.

## Solution

### Step 1: Locate Nginx Configuration

```bash
# Common locations:
/etc/nginx/sites-available/trustbox.diemitchell.com
/etc/nginx/conf.d/trustbox.diemitchell.com.conf
/etc/nginx/nginx.conf
```

### Step 2: Edit the Configuration

```bash
sudo nano /etc/nginx/sites-available/trustbox.diemitchell.com
```

### Step 3: Remove Trailing Slashes

Change:
```nginx
location /api/ {
    proxy_pass http://localhost:3000/;
```

To:
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
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 5: Verify the Fix

```bash
curl -X POST https://trustbox.diemitchell.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

You should get a JSON response, NOT "Cannot POST /login".

## How proxy_pass Works

### With Trailing Slashes (WRONG)
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

**Check if Nginx reloaded:**
```bash
sudo systemctl status nginx
sudo nginx -T | grep -A 10 "location /api"
```

**Check Nginx error logs:**
```bash
sudo tail -f /var/log/nginx/error.log
```

**Check Node.js backend is running:**
```bash
# If using PM2
pm2 status
pm2 logs trustbox

# If using systemd
sudo systemctl status trustbox.service
```

**Verify backend routes:**
```bash
curl http://localhost:3000/api/login
# Should NOT return "Cannot POST /login"
```

**Find active configuration:**
```bash
sudo nginx -T
sudo find /etc/nginx -name "*.conf" -o -name "*trustbox*"
```
