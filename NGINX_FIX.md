# Nginx Configuratie Fix

## Probleem

De error "Cannot POST /login" komt doordat Nginx de `/api` prefix weghaalt wanneer requests naar de Node.js backend worden doorgestuurd.

## Oorzaak

Nginx configuratie met trailing slashes haalt de `/api` prefix weg:

```nginx
# INCORRECTE CONFIGURATIE
location /api/ {
    proxy_pass http://localhost:3000/;
}
```

Als een request binnenkomt als `/api/login`, verwijdert Nginx `/api` en stuurt alleen `/login` door naar de backend, maar de backend verwacht `/api/login`.

## Oplossing

### Stap 1: Zoek Nginx Configuratie

```bash
# Veelvoorkomende locaties:
/etc/nginx/sites-available/trustbox.diemitchell.com
/etc/nginx/conf.d/trustbox.diemitchell.com.conf
/etc/nginx/nginx.conf
```

### Stap 2: Bewerk de Configuratie

```bash
sudo nano /etc/nginx/sites-available/trustbox.diemitchell.com
```

### Stap 3: Verwijder Trailing Slashes

Verander dit:
```nginx
location /api/ {
    proxy_pass http://localhost:3000/;
```

Naar dit:
```nginx
location /api {
    proxy_pass http://localhost:3000;
```

### Complete Correcte Configuratie

```nginx
server {
    listen 443 ssl http2;
    server_name trustbox.diemitchell.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Frontend - statische bestanden
    location / {
        root /path/to/TrustBox;
        index loginV3.html mvpV3.html;
        try_files $uri $uri/ =404;
    }

    # Backend API - behoud /api prefix
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

### Stap 4: Test en Herlaad Nginx

```bash
# Test configuratie
sudo nginx -t

# Herlaad Nginx
sudo systemctl reload nginx
```

### Stap 5: Controleer of de Fix Werkt

```bash
curl -X POST https://trustbox.diemitchell.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

Je zou een JSON response moeten krijgen, NIET "Cannot POST /login".

## Hoe proxy_pass Werkt

### Met Trailing Slashes (FOUT)
```nginx
location /api/ {
    proxy_pass http://localhost:3000/;
}
```
- Request: `/api/login` → Backend krijgt: `/login` ❌

### Zonder Trailing Slashes (GOED)
```nginx
location /api {
    proxy_pass http://localhost:3000;
}
```
- Request: `/api/login` → Backend krijgt: `/api/login` ✅

## Troubleshooting

### Krijg Je Nog Steeds "Cannot POST /login"?

**Check of Nginx herladen is:**
```bash
sudo systemctl status nginx
sudo nginx -T | grep -A 10 "location /api"
```

**Check Nginx error logs:**
```bash
sudo tail -f /var/log/nginx/error.log
```

**Check of Node.js backend draait:**
```bash
# Als je PM2 gebruikt
pm2 status
pm2 logs trustbox

# Als je systemd gebruikt
sudo systemctl status trustbox.service
```

**Controleer backend routes:**
```bash
curl http://localhost:3000/api/login
# Zou NIET "Cannot POST /login" moeten returnen
```

**Zoek actieve configuratie:**
```bash
sudo nginx -T
sudo find /etc/nginx -name "*.conf" -o -name "*trustbox*"
```
