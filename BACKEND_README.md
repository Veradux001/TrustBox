# TrustBox Backend

This is the backend API for the TrustBox password manager application.

## The Fix

The registration error `"Cannot destructure property 'username' of 'req.body' as it is undefined"` was caused by missing body-parser middleware configuration. This has been fixed in `server.js` by properly configuring the middleware **before** the routes are loaded.

## Setup

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Start the development server:
```bash
npm run dev
```

The server will run on `http://localhost:3000`

### Docker Deployment

1. Build the Docker image:
```bash
docker build -t trustbox-backend .
```

2. Run the container:
```bash
docker run -p 3000:3000 -e NODE_ENV=production trustbox-backend
```

## API Endpoints

### POST /api/register

Register a new user.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "authorizedPerson": "Jane Doe (optional)",
  "authorizedEmail": "jane@example.com (optional)"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "1234567890",
    "username": "johndoe",
    "email": "john@example.com",
    "createdAt": "2025-12-01T14:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Validation failed
- `409` - User already exists
- `500` - Server error

### GET /api/users

(Development only) Lists all registered users.

## Important Notes

### Current Implementation

⚠️ **This is a basic implementation for development/testing purposes:**

- User data is stored in-memory (resets on server restart)
- No database integration yet
- No session management or JWT authentication
- No email verification

### Production Recommendations

Before deploying to production, you should:

1. **Add a database:** Replace the in-memory `Map` with a proper database (PostgreSQL, MySQL, MongoDB)
2. **Add authentication:** Implement session management or JWT tokens
3. **Add email verification:** Send verification emails to new users
4. **Add rate limiting:** Prevent abuse of the registration endpoint
5. **Add logging:** Implement proper logging (Winston, Morgan)
6. **Add tests:** Write unit and integration tests
7. **Add HTTPS:** Always use HTTPS in production
8. **Add CSRF protection:** Implement CSRF tokens for forms
9. **Environment variables:** Properly configure all environment variables
10. **Security headers:** Add helmet.js for security headers

## Security Features Implemented

✅ Password hashing with bcrypt (12 salt rounds)
✅ Input validation and sanitization
✅ Email validation using validator library
✅ Error handling middleware
✅ CORS configuration
✅ Request size limits (10mb)

## File Structure

- `server.js` - Express server setup with middleware configuration
- `InsertRegistration.js` - Registration route handler
- `package.json` - Dependencies and scripts
- `Dockerfile` - Docker container configuration
- `.env.example` - Environment variable template
