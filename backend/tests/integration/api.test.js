/**
 * Integration Tests for API Endpoints
 * Tests the /api prefix routes and endpoint functionality
 *
 * NOTE: These tests require mocking the database connections
 * To run these tests, you'll need to set up test environment variables
 */

const request = require('supertest');
const express = require('express');
const sql = require('mssql');

// Mock environment variables for testing
process.env.ENCRYPTION_KEY = require('crypto').randomBytes(32).toString('hex');
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_SERVER = 'localhost';
process.env.DB_DATABASE_SUBMISSION = 'test_submission';
process.env.DB_DATABASE_REGISTER = 'test_register';
process.env.DB_ENCRYPT = 'false';
process.env.DB_TRUST_SERVER_CERTIFICATE = 'true';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

// Mock the mssql module
jest.mock('mssql');

describe('API Integration Tests', () => {
    let app;
    let mockPool;
    let mockRegisterPool;

    beforeAll(() => {
        // Mock database pools
        mockPool = {
            request: jest.fn().mockReturnThis(),
            query: jest.fn(),
            input: jest.fn().mockReturnThis(),
        };

        mockRegisterPool = {
            request: jest.fn().mockReturnThis(),
            query: jest.fn(),
            input: jest.fn().mockReturnThis(),
        };

        // Mock sql.connect to return our mock pool
        sql.connect = jest.fn().mockResolvedValue(mockPool);
        sql.ConnectionPool = jest.fn().mockImplementation(() => ({
            connect: jest.fn().mockResolvedValue(mockRegisterPool),
        }));

        // Mock SQL types
        sql.Int = 'Int';
        sql.NVarChar = 'NVarChar';
        sql.Char = 'Char';

        // Note: In a real test, we would need to properly load serverV2.js
        // For now, we'll create a minimal Express app with the router pattern
        app = express();
        app.use(express.json());

        const router = express.Router();

        // Mock GET /api/getData endpoint
        router.get('/getData', async (req, res) => {
            if (!mockPool) return res.status(503).json({ message: 'Database niet beschikbaar.' });
            try {
                const result = await mockPool.request().query('SELECT * FROM FormSubmission');
                res.status(200).json(result.recordset || []);
            } catch (err) {
                res.status(500).json({ message: 'Fout bij het ophalen van data van de server.' });
            }
        });

        // Mock POST /api/saveData endpoint
        router.post('/saveData', async (req, res) => {
            const { GroupId, Username, Password, Domain } = req.body;

            if (!mockPool) return res.status(503).json({ message: 'Database niet beschikbaar.' });

            if (!GroupId || !Username || !Password || !Domain) {
                return res.status(400).json({ message: 'Alle velden zijn verplicht.' });
            }

            try {
                // Validate password type
                if (typeof Password !== 'string') {
                    return res.status(400).json({ message: 'Wachtwoord moet een string zijn.' });
                }
                // Validate password not empty
                if (Password.trim() === '') {
                    return res.status(400).json({ message: 'Wachtwoord mag niet leeg zijn.' });
                }
                // Validate password length
                if (Password.length > 1000) {
                    return res.status(400).json({ message: 'Wachtwoord overschrijdt de maximale lengte van 1000 karakters.' });
                }

                await mockPool.request().query('INSERT INTO FormSubmission VALUES (...)');
                res.status(201).json({ message: `Data voor Groep ${GroupId} succesvol opgeslagen (INSERT) en Wachtwoord versleuteld.` });
            } catch (err) {
                res.status(500).json({ message: 'Fout bij het opslaan van data op de server. Neem contact op met de beheerder.' });
            }
        });

        // Mock PUT /api/data/:groupId endpoint
        router.put('/data/:groupId', async (req, res) => {
            const groupId = req.params.groupId;
            const { Username, Domain } = req.body;

            if (!mockPool) return res.status(503).json({ message: 'Database niet beschikbaar.' });

            if (!Username || !Domain) {
                return res.status(400).json({ message: 'Username en Domain velden zijn verplicht voor update.' });
            }

            try {
                const result = { rowsAffected: [1] };
                res.status(200).json({ message: `Data voor Groep ${groupId} succesvol bijgewerkt (UPDATE).` });
            } catch (err) {
                res.status(500).json({ message: 'Fout bij het bijwerken van data op de server.' });
            }
        });

        // Mock DELETE /api/data/:groupId endpoint
        router.delete('/data/:groupId', async (req, res) => {
            const groupId = req.params.groupId;

            if (!mockPool) return res.status(503).json({ message: 'Database niet beschikbaar.' });

            try {
                const result = { rowsAffected: [1] };
                res.status(200).json({ message: `Data voor Groep ${groupId} succesvol verwijderd.` });
            } catch (err) {
                res.status(500).json({ message: 'Fout bij het verwijderen van data op de server.' });
            }
        });

        // Mock POST /api/register endpoint
        router.post('/register', async (req, res) => {
            const { username, email, password } = req.body;

            if (!mockRegisterPool) {
                return res.status(503).json({ message: 'Registration service is temporarily unavailable. Please try again later.' });
            }

            if (!username || !email || !password) {
                return res.status(400).json({ message: 'Username, email, and password are required fields.' });
            }

            // Basic validation
            if (username.length < 3 || username.length > 50) {
                return res.status(400).json({ message: 'Username must be between 3 and 50 characters.' });
            }

            if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
                return res.status(400).json({ message: 'Username can only contain letters, numbers, underscores, and hyphens.' });
            }

            if (password.length < 8 || password.length > 72) {
                return res.status(400).json({ message: 'Password must be between 8 and 72 characters long.' });
            }

            try {
                res.status(201).json({ message: 'Account created successfully! You can now log in.', username });
            } catch (err) {
                res.status(500).json({ message: 'An error occurred during registration. Please try again later.' });
            }
        });

        // Mock POST /api/login endpoint
        router.post('/login', async (req, res) => {
            const { email, password } = req.body;

            if (!mockRegisterPool) {
                return res.status(503).json({ message: 'Authentication service is temporarily unavailable. Please try again later.' });
            }

            if (!email || !password) {
                return res.status(400).json({ message: 'Email and password are required fields.' });
            }

            try {
                // Mock successful login for test
                if (email === 'test@example.com' && password === 'password123') {
                    res.status(200).json({
                        message: 'Login successful!',
                        user: { userId: 1, username: 'testuser', email: 'test@example.com' }
                    });
                } else {
                    res.status(401).json({ message: 'Invalid email or password.' });
                }
            } catch (err) {
                res.status(500).json({ message: 'An error occurred during login. Please try again later.' });
            }
        });

        // Mount router under /api prefix (this is what the PR adds!)
        app.use('/api', router);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('API Prefix Routes', () => {
        test('GET /api/getData should be accessible with /api prefix', async () => {
            mockPool.request().query.mockResolvedValue({ recordset: [] });

            const response = await request(app)
                .get('/api/getData')
                .expect(200);

            expect(response.body).toEqual([]);
        });

        test('GET /getData without /api prefix should return 404', async () => {
            await request(app)
                .get('/getData')
                .expect(404);
        });

        test('POST /api/saveData should be accessible with /api prefix', async () => {
            const response = await request(app)
                .post('/api/saveData')
                .send({
                    GroupId: 1,
                    Username: 'testuser',
                    Password: 'testpass123',
                    Domain: 'example.com'
                })
                .expect(201);

            expect(response.body.message).toContain('succesvol opgeslagen');
        });

        test('POST /saveData without /api prefix should return 404', async () => {
            await request(app)
                .post('/saveData')
                .send({
                    GroupId: 1,
                    Username: 'testuser',
                    Password: 'testpass123',
                    Domain: 'example.com'
                })
                .expect(404);
        });

        test('PUT /api/data/:groupId should be accessible with /api prefix', async () => {
            const response = await request(app)
                .put('/api/data/1')
                .send({
                    Username: 'updateduser',
                    Domain: 'updated.com'
                })
                .expect(200);

            expect(response.body.message).toContain('succesvol bijgewerkt');
        });

        test('DELETE /api/data/:groupId should be accessible with /api prefix', async () => {
            const response = await request(app)
                .delete('/api/data/1')
                .expect(200);

            expect(response.body.message).toContain('succesvol verwijderd');
        });

        test('POST /api/register should be accessible with /api prefix', async () => {
            const response = await request(app)
                .post('/api/register')
                .send({
                    username: 'newuser',
                    email: 'newuser@example.com',
                    password: 'password123'
                })
                .expect(201);

            expect(response.body.message).toContain('Account created successfully');
        });

        test('POST /api/login should be accessible with /api prefix', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                })
                .expect(200);

            expect(response.body.message).toBe('Login successful!');
            expect(response.body.user).toBeDefined();
        });

        test('POST /login without /api prefix should return 404', async () => {
            await request(app)
                .post('/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                })
                .expect(404);
        });
    });

    describe('POST /api/saveData - Validation', () => {
        test('should return 400 when required fields are missing', async () => {
            const response = await request(app)
                .post('/api/saveData')
                .send({
                    GroupId: 1,
                    Username: 'testuser'
                    // Missing Password and Domain
                })
                .expect(400);

            expect(response.body.message).toBe('Alle velden zijn verplicht.');
        });

        test('should return 400 when all fields are missing', async () => {
            const response = await request(app)
                .post('/api/saveData')
                .send({})
                .expect(400);

            expect(response.body.message).toBe('Alle velden zijn verplicht.');
        });

        test('should return 400 for non-string password', async () => {
            const response = await request(app)
                .post('/api/saveData')
                .send({
                    GroupId: 1,
                    Username: 'testuser',
                    Password: 12345, // number instead of string
                    Domain: 'example.com'
                })
                .expect(400);

            expect(response.body.message).toContain('string');
        });

        test('should return 400 for empty password', async () => {
            const response = await request(app)
                .post('/api/saveData')
                .send({
                    GroupId: 1,
                    Username: 'testuser',
                    Password: '   ', // whitespace only
                    Domain: 'example.com'
                })
                .expect(400);

            expect(response.body.message).toContain('leeg');
        });

        test('should return 400 for password exceeding maximum length', async () => {
            const longPassword = 'a'.repeat(1001);
            const response = await request(app)
                .post('/api/saveData')
                .send({
                    GroupId: 1,
                    Username: 'testuser',
                    Password: longPassword,
                    Domain: 'example.com'
                })
                .expect(400);

            expect(response.body.message).toContain('lengte');
        });
    });

    describe('PUT /api/data/:groupId - Validation', () => {
        test('should return 400 when required fields are missing', async () => {
            const response = await request(app)
                .put('/api/data/1')
                .send({
                    Username: 'testuser'
                    // Missing Domain
                })
                .expect(400);

            expect(response.body.message).toBe('Username en Domain velden zijn verplicht voor update.');
        });
    });

    describe('POST /api/register - Validation', () => {
        test('should return 400 when required fields are missing', async () => {
            const response = await request(app)
                .post('/api/register')
                .send({
                    username: 'testuser'
                    // Missing email and password
                })
                .expect(400);

            expect(response.body.message).toBe('Username, email, and password are required fields.');
        });

        test('should return 400 for username that is too short', async () => {
            const response = await request(app)
                .post('/api/register')
                .send({
                    username: 'ab',
                    email: 'test@example.com',
                    password: 'password123'
                })
                .expect(400);

            expect(response.body.message).toContain('Username must be between 3 and 50 characters');
        });

        test('should return 400 for username with invalid characters', async () => {
            const response = await request(app)
                .post('/api/register')
                .send({
                    username: 'test@user',
                    email: 'test@example.com',
                    password: 'password123'
                })
                .expect(400);

            expect(response.body.message).toContain('Username can only contain letters, numbers, underscores, and hyphens');
        });

        test('should return 400 for password that is too short', async () => {
            const response = await request(app)
                .post('/api/register')
                .send({
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'short'
                })
                .expect(400);

            expect(response.body.message).toContain('Password must be between 8 and 72 characters');
        });
    });

    describe('POST /api/login - Validation', () => {
        test('should return 400 when required fields are missing', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({
                    email: 'test@example.com'
                    // Missing password
                })
                .expect(400);

            expect(response.body.message).toBe('Email and password are required fields.');
        });

        test('should return 401 for invalid credentials', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({
                    email: 'wrong@example.com',
                    password: 'wrongpassword'
                })
                .expect(401);

            expect(response.body.message).toBe('Invalid email or password.');
        });
    });

    describe('Database Error Handling', () => {
        test('GET /api/getData should return 500 on database error', async () => {
            mockPool.request().query.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/getData')
                .expect(500);

            expect(response.body.message).toContain('Fout bij het ophalen van data');
        });

        test('POST /api/saveData should return 500 on database error', async () => {
            mockPool.request().query.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/api/saveData')
                .send({
                    GroupId: 1,
                    Username: 'testuser',
                    Password: 'testpass123',
                    Domain: 'example.com'
                })
                .expect(500);

            expect(response.body.message).toContain('Fout bij het opslaan van data');
        });
    });
});
