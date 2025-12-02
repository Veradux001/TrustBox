# TrustBox Deployment Guide

## Production Server Setup

### Important: Use serverV2.js, NOT InsertRegistration.js

The production server **must** run `serverV2.js` which contains all API endpoints including:
- `/login` - User authentication
- `/register` - User registration  
- `/getData` - Retrieve passwords
- `/saveData` - Save passwords
- `/data/:groupId` - Update/delete passwords

**DO NOT use `InsertRegistration.js`** - this is a legacy file that only has the `/register` endpoint.

### Correct Startup Commands

#### Using npm (recommended):
```bash
cd backend
npm start
```

#### Using nodemon for development:
```bash
cd backend
npm run dev
```

#### Direct node command:
```bash
cd backend
node serverV2.js
```

#### With nodemon and legacy watch:
```bash
cd backend
npx nodemon --legacy-watch --ignore 'node_modules/*' --watch /usr/src/app --ext js,ts,json --exec 'node serverV2.js'
```

### Docker/Container Setup

If running in a Docker container, ensure your startup command uses `serverV2.js`:

```bash
sh -c "cd /usr/src/app && npm install && npm install --save-dev nodemon && npx nodemon --legacy-watch --ignore 'node_modules/*' --watch /usr/src/app --ext js,ts,json --exec 'node serverV2.js'"
```

**NOT:**
```bash
# ❌ WRONG - This only has /register endpoint
--exec 'node InsertRegistration.js'
```

### Verifying the Server is Running Correctly

Test that all endpoints are accessible:

```bash
# Test login endpoint
curl -X POST https://trustbox.diemitchell.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# Should return authentication error, NOT "Cannot POST /login"

# Test register endpoint  
curl -X POST https://trustbox.diemitchell.com/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"Test123!"}'
```

### Common Issues

**Problem:** Getting "Cannot POST /login" error
**Cause:** Server is running `InsertRegistration.js` instead of `serverV2.js`
**Solution:** Change startup command to use `serverV2.js`

**Problem:** Endpoints work locally but not in production
**Cause:** Production server hasn't been restarted after code update
**Solution:** Restart the Node.js process (pm2 restart, systemctl restart, etc.)
