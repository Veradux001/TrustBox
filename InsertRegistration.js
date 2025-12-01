const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const validator = require('validator');

// In-memory user storage (replace with database in production)
// TODO: Replace with actual database (PostgreSQL, MySQL, MongoDB, etc.)
const users = new Map();

// Helper function to validate input
function validateRegistrationData(data) {
  const errors = [];

  // Validate username
  if (!data.username || typeof data.username !== 'string') {
    errors.push('Username is required');
  } else if (data.username.length < 3 || data.username.length > 30) {
    errors.push('Username must be between 3 and 30 characters');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(data.username)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens');
  }

  // Validate email
  if (!data.email || typeof data.email !== 'string') {
    errors.push('Email is required');
  } else if (!validator.isEmail(data.email)) {
    errors.push('Invalid email address');
  }

  // Validate password
  if (!data.password || typeof data.password !== 'string') {
    errors.push('Password is required');
  } else if (data.password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Validate authorized email if provided
  if (data.authorizedEmail && !validator.isEmail(data.authorizedEmail)) {
    errors.push('Invalid authorized email address');
  }

  return errors;
}

// POST /api/register - Register a new user
router.post('/register', async (req, res) => {
  try {
    // FIXED: Now req.body is properly parsed because body-parser middleware is configured in server.js
    const { username, email, password, authorizedPerson, authorizedEmail } = req.body;

    // Validate input
    const validationErrors = validateRegistrationData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: validationErrors.join(', ')
      });
    }

    // Check if user already exists
    const existingUser = Array.from(users.values()).find(
      user => user.username === username || user.email === email
    );

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: existingUser.username === username
          ? 'Username is already taken'
          : 'Email is already registered'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user object
    const user = {
      id: Date.now().toString(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      authorizedPerson: authorizedPerson ? authorizedPerson.trim() : null,
      authorizedEmail: authorizedEmail ? authorizedEmail.trim().toLowerCase() : null,
      createdAt: new Date().toISOString()
    };

    // Store user (in production, save to database)
    users.set(user.id, user);

    console.log(`New user registered: ${username} (${email})`);

    // Return success response (don't send password back)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration. Please try again.'
    });
  }
});

// GET /api/users (for debugging - remove in production)
router.get('/users', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const userList = Array.from(users.values()).map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt
  }));

  res.json({ users: userList, count: userList.length });
});

module.exports = router;
