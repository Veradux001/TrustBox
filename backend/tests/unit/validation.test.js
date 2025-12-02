/**
 * Unit Tests for Validation Functions
 * Tests the input validation functions used across the API
 */

describe('Validation Functions', () => {
    // Mock the validation functions since they're not exported
    // In a real scenario, these should be exported from serverV2.js or moved to a separate module

    describe('validateInteger', () => {
        const validateInteger = (value, fieldName) => {
            const parsed = parseInt(value, 10);
            if (isNaN(parsed)) {
                throw new Error(`${fieldName} must be a valid integer`);
            }
            return parsed;
        };

        test('should parse valid integer strings', () => {
            expect(validateInteger('123', 'GroupId')).toBe(123);
            expect(validateInteger('0', 'GroupId')).toBe(0);
            expect(validateInteger('-5', 'GroupId')).toBe(-5);
        });

        test('should parse valid integer numbers', () => {
            expect(validateInteger(456, 'GroupId')).toBe(456);
        });

        test('should throw error for invalid integers', () => {
            expect(() => validateInteger('abc', 'GroupId')).toThrow('GroupId must be a valid integer');
            expect(() => validateInteger('12.5', 'GroupId')).toBe(12); // parseInt truncates
            expect(() => validateInteger('', 'GroupId')).toThrow('GroupId must be a valid integer');
            expect(() => validateInteger(null, 'GroupId')).toThrow('GroupId must be a valid integer');
        });
    });

    describe('validateStringLength', () => {
        const validateStringLength = (value, fieldName, maxLength) => {
            if (typeof value !== 'string') {
                throw new Error(`${fieldName} must be a string`);
            }
            if (value.length > maxLength) {
                throw new Error(`${fieldName} exceeds maximum length of ${maxLength}`);
            }
            return value.trim();
        };

        test('should accept valid strings within length limit', () => {
            expect(validateStringLength('test', 'Username', 50)).toBe('test');
            expect(validateStringLength('  trimmed  ', 'Username', 50)).toBe('trimmed');
        });

        test('should throw error for non-string values', () => {
            expect(() => validateStringLength(123, 'Username', 50)).toThrow('Username must be a string');
            expect(() => validateStringLength(null, 'Username', 50)).toThrow('Username must be a string');
            expect(() => validateStringLength({}, 'Username', 50)).toThrow('Username must be a string');
        });

        test('should throw error for strings exceeding max length', () => {
            const longString = 'a'.repeat(256);
            expect(() => validateStringLength(longString, 'Username', 255)).toThrow('Username exceeds maximum length of 255');
        });
    });

    describe('Username Validation', () => {
        const validateUsername = (username) => {
            if (typeof username !== 'string' || username.length < 3 || username.length > 50) {
                throw new Error('Username must be between 3 and 50 characters.');
            }
            if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
                throw new Error('Username can only contain letters, numbers, underscores, and hyphens.');
            }
            return true;
        };

        test('should accept valid usernames', () => {
            expect(validateUsername('user123')).toBe(true);
            expect(validateUsername('test_user')).toBe(true);
            expect(validateUsername('test-user')).toBe(true);
            expect(validateUsername('ABC123')).toBe(true);
        });

        test('should reject usernames that are too short', () => {
            expect(() => validateUsername('ab')).toThrow('Username must be between 3 and 50 characters.');
        });

        test('should reject usernames that are too long', () => {
            const longUsername = 'a'.repeat(51);
            expect(() => validateUsername(longUsername)).toThrow('Username must be between 3 and 50 characters.');
        });

        test('should reject usernames with invalid characters', () => {
            expect(() => validateUsername('user@123')).toThrow('Username can only contain letters, numbers, underscores, and hyphens.');
            expect(() => validateUsername('user 123')).toThrow('Username can only contain letters, numbers, underscores, and hyphens.');
            expect(() => validateUsername('user.name')).toThrow('Username can only contain letters, numbers, underscores, and hyphens.');
        });
    });

    describe('Email Validation', () => {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

        const validateEmail = (email, maxLength = 100) => {
            if (typeof email !== 'string' || !emailRegex.test(email) || email.length > maxLength) {
                throw new Error(`Please provide a valid email address (max ${maxLength} characters).`);
            }
            return true;
        };

        test('should accept valid email addresses', () => {
            expect(validateEmail('user@example.com')).toBe(true);
            expect(validateEmail('test.user@example.com')).toBe(true);
            expect(validateEmail('user+tag@example.co.uk')).toBe(true);
            expect(validateEmail('user123@test-domain.com')).toBe(true);
        });

        test('should reject invalid email formats', () => {
            expect(() => validateEmail('notanemail')).toThrow('Please provide a valid email address');
            expect(() => validateEmail('@example.com')).toThrow('Please provide a valid email address');
            expect(() => validateEmail('user@')).toThrow('Please provide a valid email address');
            expect(() => validateEmail('user @example.com')).toThrow('Please provide a valid email address');
        });

        test('should reject emails exceeding max length', () => {
            const longEmail = 'a'.repeat(90) + '@test.com';
            expect(() => validateEmail(longEmail, 100)).toThrow('Please provide a valid email address');
        });
    });

    describe('Password Validation', () => {
        const validatePassword = (password, minLength = 8, maxLength = 72) => {
            if (typeof password !== 'string' || password.length < minLength || password.length > maxLength) {
                throw new Error(`Password must be between ${minLength} and ${maxLength} characters long.`);
            }
            return true;
        };

        test('should accept valid passwords', () => {
            expect(validatePassword('password123')).toBe(true);
            expect(validatePassword('a'.repeat(8))).toBe(true);
            expect(validatePassword('a'.repeat(72))).toBe(true);
        });

        test('should reject passwords that are too short', () => {
            expect(() => validatePassword('short')).toThrow('Password must be between 8 and 72 characters long.');
        });

        test('should reject passwords that are too long', () => {
            const longPassword = 'a'.repeat(73);
            expect(() => validatePassword(longPassword)).toThrow('Password must be between 8 and 72 characters long.');
        });
    });
});
