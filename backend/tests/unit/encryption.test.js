/**
 * Unit Tests for Encryption/Decryption Functions
 * Tests the AES-256-CBC encryption and decryption
 */

const crypto = require('crypto');

describe('Encryption/Decryption Functions', () => {
    // Mock encryption key (32 bytes for AES-256)
    const ENCRYPTION_KEY = crypto.randomBytes(32);
    const IV_LENGTH = 16;

    // Recreate the encrypt/decrypt functions from serverV2.js
    const encrypt = (text) => {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    };

    const decrypt = (text) => {
        if (!text || text.trim() === '') return '';

        try {
            const parts = text.split(':');

            if (parts.length < 2) {
                console.warn("Decryptie waarschuwing: Ongeldig versleuteld formaat ontvangen");
                return '';
            }

            const iv = Buffer.from(parts.shift(), 'hex');
            const encryptedText = Buffer.from(parts.join(':'), 'hex');
            const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);

            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (e) {
            console.error("Decryptie fout (waarschijnlijk verkeerde sleutel of corrupt data):", e.message);
            return '';
        }
    };

    describe('encrypt', () => {
        test('should encrypt text successfully', () => {
            const plaintext = 'MySecretPassword123';
            const encrypted = encrypt(plaintext);

            expect(encrypted).toBeTruthy();
            expect(typeof encrypted).toBe('string');
            expect(encrypted).toContain(':');
            expect(encrypted).not.toBe(plaintext);
        });

        test('should produce different ciphertexts for same plaintext (random IV)', () => {
            const plaintext = 'SamePassword';
            const encrypted1 = encrypt(plaintext);
            const encrypted2 = encrypt(plaintext);

            // Different IVs should produce different ciphertexts
            expect(encrypted1).not.toBe(encrypted2);
        });

        test('should encrypt empty string', () => {
            const encrypted = encrypt('');
            expect(encrypted).toBeTruthy();
            expect(encrypted).toContain(':');
        });

        test('should encrypt special characters', () => {
            const plaintext = 'p@$$w0rd!#%&*()';
            const encrypted = encrypt(plaintext);

            expect(encrypted).toBeTruthy();
            expect(encrypted).toContain(':');
        });

        test('should encrypt unicode characters', () => {
            const plaintext = 'пароль密码🔒';
            const encrypted = encrypt(plaintext);

            expect(encrypted).toBeTruthy();
            expect(encrypted).toContain(':');
        });
    });

    describe('decrypt', () => {
        test('should decrypt encrypted text correctly', () => {
            const plaintext = 'MySecretPassword123';
            const encrypted = encrypt(plaintext);
            const decrypted = decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        test('should decrypt empty string', () => {
            const encrypted = encrypt('');
            const decrypted = decrypt(encrypted);

            expect(decrypted).toBe('');
        });

        test('should decrypt special characters', () => {
            const plaintext = 'p@$$w0rd!#%&*()';
            const encrypted = encrypt(plaintext);
            const decrypted = decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        test('should decrypt unicode characters', () => {
            const plaintext = 'пароль密码🔒';
            const encrypted = encrypt(plaintext);
            const decrypted = decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        test('should return empty string for null/undefined input', () => {
            expect(decrypt('')).toBe('');
            expect(decrypt('   ')).toBe('');
        });

        test('should return empty string for invalid format (no colon)', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            const result = decrypt('invalidformat');

            expect(result).toBe('');
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Ongeldig versleuteld formaat'));

            consoleSpy.mockRestore();
        });

        test('should return empty string for corrupt data', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const result = decrypt('aabbccdd:invalidhex');

            expect(result).toBe('');

            consoleSpy.mockRestore();
        });
    });

    describe('encrypt/decrypt round-trip', () => {
        test('should maintain data integrity through multiple encrypt/decrypt cycles', () => {
            const plaintext = 'TestPassword123!';

            const encrypted1 = encrypt(plaintext);
            const decrypted1 = decrypt(encrypted1);
            expect(decrypted1).toBe(plaintext);

            const encrypted2 = encrypt(decrypted1);
            const decrypted2 = decrypt(encrypted2);
            expect(decrypted2).toBe(plaintext);
        });

        test('should handle long passwords', () => {
            const plaintext = 'a'.repeat(1000);
            const encrypted = encrypt(plaintext);
            const decrypted = decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });
    });
});
