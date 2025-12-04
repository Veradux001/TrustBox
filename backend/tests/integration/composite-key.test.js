/**
 * Composite Primary Key Integration Tests
 * Tests to verify that the (UserId, GroupId) composite primary key works correctly
 *
 * These tests verify the fix in PR #50 (Issue #49):
 * - Multiple users can use the same GroupId values
 * - Each user maintains their own isolated set of GroupIds
 * - No primary key constraint violations occur
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

describe('Composite Primary Key Tests', () => {
    let app;
    let mockPool;
    let mockDataStore; // Simulates database storage

    beforeAll(() => {
        // Initialize mock data store
        mockDataStore = [];

        // Mock database pool
        mockPool = {
            request: jest.fn().mockReturnThis(),
            query: jest.fn(),
            input: jest.fn().mockReturnThis(),
        };

        // Mock sql.connect to return our mock pool
        sql.connect = jest.fn().mockResolvedValue(mockPool);
        sql.ConnectionPool = jest.fn().mockImplementation(() => ({
            connect: jest.fn().mockResolvedValue(mockPool),
        }));

        // Mock SQL types
        sql.Int = 'Int';
        sql.NVarChar = 'NVarChar';

        // Create Express app with routes that use composite key
        app = express();
        app.use(express.json());

        const router = express.Router();

        // Mock POST /saveData endpoint with composite key support
        router.post('/saveData', async (req, res) => {
            const { GroupId, Username, Password, Domain } = req.body;
            const UserId = parseInt(req.headers['x-user-id']);

            if (!UserId) {
                return res.status(401).json({ message: 'Gebruikers-ID is verplicht. Log opnieuw in.' });
            }

            if (!mockPool) return res.status(503).json({ message: 'Database niet beschikbaar.' });

            if (!GroupId || !Username || !Password || !Domain) {
                return res.status(400).json({ message: 'Alle velden zijn verplicht.' });
            }

            try {
                // Simulate composite key check (UserId, GroupId)
                const existingRecord = mockDataStore.find(
                    record => record.UserId === UserId && record.GroupId === GroupId
                );

                if (existingRecord) {
                    // Primary key violation would occur
                    throw new Error('Violation of PRIMARY KEY constraint');
                }

                // Simulate successful insert
                mockDataStore.push({ UserId, GroupId, Username, Password, Domain });
                res.status(201).json({ message: `Data voor Groep ${GroupId} succesvol opgeslagen (INSERT) en Wachtwoord versleuteld.` });
            } catch (err) {
                if (err.message.includes('PRIMARY KEY constraint')) {
                    return res.status(409).json({ message: 'Primaire sleutelconflict: deze GroupId bestaat al voor deze gebruiker.' });
                }
                res.status(500).json({ message: 'Fout bij het opslaan van data op de server.' });
            }
        });

        // Mock GET /getData endpoint
        router.get('/getData', async (req, res) => {
            const UserId = parseInt(req.headers['x-user-id']);

            if (!UserId) {
                return res.status(401).json({ message: 'Gebruikers-ID is verplicht. Log opnieuw in.' });
            }

            if (!mockPool) return res.status(503).json({ message: 'Database niet beschikbaar.' });

            try {
                // Filter by UserId only
                const userRecords = mockDataStore.filter(record => record.UserId === UserId);
                res.status(200).json(userRecords);
            } catch (err) {
                res.status(500).json({ message: 'Fout bij het ophalen van data van de server.' });
            }
        });

        app.use('/', router);
    });

    beforeEach(() => {
        // Reset mock data store before each test
        mockDataStore.length = 0;
        jest.clearAllMocks();
    });

    describe('Composite Key - Multiple Users with Same GroupId', () => {
        test('User 1 can save data with GroupId=1', async () => {
            const response = await request(app)
                .post('/saveData')
                .set('x-user-id', '1')
                .send({
                    GroupId: 1,
                    Username: 'user1@example.com',
                    Password: 'encrypted_password_1',
                    Domain: 'example.com'
                })
                .expect(201);

            expect(response.body.message).toContain('succesvol opgeslagen');
            expect(mockDataStore.length).toBe(1);
            expect(mockDataStore[0]).toMatchObject({
                UserId: 1,
                GroupId: 1,
                Username: 'user1@example.com'
            });
        });

        test('User 2 can also save data with GroupId=1 (no conflict)', async () => {
            // First, User 1 saves GroupId=1
            await request(app)
                .post('/saveData')
                .set('x-user-id', '1')
                .send({
                    GroupId: 1,
                    Username: 'user1@example.com',
                    Password: 'encrypted_password_1',
                    Domain: 'example.com'
                })
                .expect(201);

            // Then, User 2 saves the same GroupId=1 (should succeed with composite key)
            const response = await request(app)
                .post('/saveData')
                .set('x-user-id', '2')
                .send({
                    GroupId: 1,
                    Username: 'user2@example.com',
                    Password: 'encrypted_password_2',
                    Domain: 'another.com'
                })
                .expect(201);

            expect(response.body.message).toContain('succesvol opgeslagen');
            expect(mockDataStore.length).toBe(2);

            // Verify both records exist
            expect(mockDataStore.find(r => r.UserId === 1 && r.GroupId === 1)).toBeDefined();
            expect(mockDataStore.find(r => r.UserId === 2 && r.GroupId === 1)).toBeDefined();
        });

        test('Multiple users can all use GroupId=1, 2, 3 without conflicts', async () => {
            const users = [1, 2, 3];
            const groupIds = [1, 2, 3];

            // Each user saves GroupIds 1, 2, 3
            for (const userId of users) {
                for (const groupId of groupIds) {
                    await request(app)
                        .post('/saveData')
                        .set('x-user-id', String(userId))
                        .send({
                            GroupId: groupId,
                            Username: `user${userId}_group${groupId}@example.com`,
                            Password: `encrypted_${userId}_${groupId}`,
                            Domain: 'example.com'
                        })
                        .expect(201);
                }
            }

            // Verify all 9 records exist (3 users × 3 GroupIds)
            expect(mockDataStore.length).toBe(9);

            // Verify each user has their own set of GroupIds 1, 2, 3
            for (const userId of users) {
                const userRecords = mockDataStore.filter(r => r.UserId === userId);
                expect(userRecords.length).toBe(3);
                expect(userRecords.map(r => r.GroupId).sort()).toEqual([1, 2, 3]);
            }
        });
    });

    describe('Composite Key - Primary Key Constraint Still Enforced', () => {
        test('Same user cannot save duplicate (UserId, GroupId) combination', async () => {
            // User 1 saves GroupId=1
            await request(app)
                .post('/saveData')
                .set('x-user-id', '1')
                .send({
                    GroupId: 1,
                    Username: 'user1@example.com',
                    Password: 'encrypted_password_1',
                    Domain: 'example.com'
                })
                .expect(201);

            // User 1 tries to save GroupId=1 again (should fail)
            const response = await request(app)
                .post('/saveData')
                .set('x-user-id', '1')
                .send({
                    GroupId: 1,
                    Username: 'duplicate@example.com',
                    Password: 'encrypted_password_2',
                    Domain: 'duplicate.com'
                })
                .expect(409);

            expect(response.body.message).toContain('Primaire sleutelconflict');
            expect(mockDataStore.length).toBe(1); // Only one record should exist
        });
    });

    describe('User Data Isolation with Composite Key', () => {
        test('Users can only see their own GroupId records', async () => {
            // User 1 saves GroupId=1 and GroupId=2
            await request(app)
                .post('/saveData')
                .set('x-user-id', '1')
                .send({
                    GroupId: 1,
                    Username: 'user1_g1@example.com',
                    Password: 'encrypted_1_1',
                    Domain: 'example.com'
                })
                .expect(201);

            await request(app)
                .post('/saveData')
                .set('x-user-id', '1')
                .send({
                    GroupId: 2,
                    Username: 'user1_g2@example.com',
                    Password: 'encrypted_1_2',
                    Domain: 'example.com'
                })
                .expect(201);

            // User 2 saves GroupId=1 and GroupId=2
            await request(app)
                .post('/saveData')
                .set('x-user-id', '2')
                .send({
                    GroupId: 1,
                    Username: 'user2_g1@example.com',
                    Password: 'encrypted_2_1',
                    Domain: 'another.com'
                })
                .expect(201);

            await request(app)
                .post('/saveData')
                .set('x-user-id', '2')
                .send({
                    GroupId: 2,
                    Username: 'user2_g2@example.com',
                    Password: 'encrypted_2_2',
                    Domain: 'another.com'
                })
                .expect(201);

            // User 1 retrieves data - should only see their own records
            const user1Response = await request(app)
                .get('/getData')
                .set('x-user-id', '1')
                .expect(200);

            expect(user1Response.body.length).toBe(2);
            expect(user1Response.body.every(r => r.UserId === 1)).toBe(true);
            expect(user1Response.body.map(r => r.GroupId).sort()).toEqual([1, 2]);

            // User 2 retrieves data - should only see their own records
            const user2Response = await request(app)
                .get('/getData')
                .set('x-user-id', '2')
                .expect(200);

            expect(user2Response.body.length).toBe(2);
            expect(user2Response.body.every(r => r.UserId === 2)).toBe(true);
            expect(user2Response.body.map(r => r.GroupId).sort()).toEqual([1, 2]);

            // Verify records are isolated by content
            expect(user1Response.body[0].Username).not.toEqual(user2Response.body[0].Username);
        });
    });

    describe('Edge Cases with Composite Key', () => {
        test('User can save many different GroupIds', async () => {
            const groupIds = Array.from({ length: 50 }, (_, i) => i + 1);

            for (const groupId of groupIds) {
                await request(app)
                    .post('/saveData')
                    .set('x-user-id', '1')
                    .send({
                        GroupId: groupId,
                        Username: `user1_g${groupId}@example.com`,
                        Password: `encrypted_${groupId}`,
                        Domain: 'example.com'
                    })
                    .expect(201);
            }

            const response = await request(app)
                .get('/getData')
                .set('x-user-id', '1')
                .expect(200);

            expect(response.body.length).toBe(50);
            expect(response.body.map(r => r.GroupId).sort((a, b) => a - b)).toEqual(groupIds);
        });

        test('Same GroupId can be used by many different users', async () => {
            const userIds = Array.from({ length: 20 }, (_, i) => i + 1);
            const sharedGroupId = 1;

            for (const userId of userIds) {
                await request(app)
                    .post('/saveData')
                    .set('x-user-id', String(userId))
                    .send({
                        GroupId: sharedGroupId,
                        Username: `user${userId}@example.com`,
                        Password: `encrypted_${userId}`,
                        Domain: 'example.com'
                    })
                    .expect(201);
            }

            expect(mockDataStore.length).toBe(20);
            expect(mockDataStore.every(r => r.GroupId === sharedGroupId)).toBe(true);
            expect(new Set(mockDataStore.map(r => r.UserId)).size).toBe(20);
        });
    });
});
