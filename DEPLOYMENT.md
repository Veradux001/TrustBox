# Deployment Guide

## Important: Use serverV2.js

The production server **must** run `serverV2.js` which contains all API endpoints:
- `/login` - User authentication
- `/register` - User registration
- `/getData` - Retrieve passwords
- `/saveData` - Save passwords
- `/data/:groupId` - Update/delete passwords

**DO NOT use `InsertRegistration.js`** - this is a legacy file with only the `/register` endpoint.

## Startup Commands

### Using npm (recommended)
```bash
cd backend
npm start
```

### Using nodemon for development
```bash
cd backend
npm run dev
```

### Direct node command
```bash
cd backend
node serverV2.js
```

## Docker/Container Setup

Ensure your startup command uses `serverV2.js`:

```bash
cd /usr/src/app && npm install && node serverV2.js
```

For development with nodemon:
```bash
cd /usr/src/app && npm install && npx nodemon --legacy-watch serverV2.js
```

## Verifying the Server

Test that all endpoints are accessible:

```bash
# Test login endpoint
curl -X POST https://trustbox.diemitchell.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# Should return authentication error, NOT "Cannot POST /login"
```

## Troubleshooting

**Problem:** Getting "Cannot POST /login" error
**Cause:** Server is running `InsertRegistration.js` instead of `serverV2.js`
**Solution:** Change startup command to use `serverV2.js` and restart

**Problem:** Endpoints work locally but not in production
**Cause:** Production server hasn't been restarted after code update
**Solution:** Restart the Node.js process (pm2 restart, systemctl restart, etc.)
