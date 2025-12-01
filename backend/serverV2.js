require('dotenv').config();

const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const app = express();
const port = process.env.PORT || 3000;

// --- Validation Constants ---
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 50;
const EMAIL_MAX_LENGTH = 100;
const PASSWORD_MIN_LENGTH = 8;
const BCRYPT_SALT_ROUNDS = 12; // Industry standard for security

// Load encryption key from environment variables
const RAW_KEY = process.env.ENCRYPTION_KEY;
if (!RAW_KEY) {
    throw new Error('ENCRYPTION_KEY is not set in environment variables');
}
// De sleutel MOET 32 bytes (256 bit) lang zijn voor AES-256-CBC
// Parse as hex string (64 hex characters = 32 bytes)
const ENCRYPTION_KEY = Buffer.from(RAW_KEY, 'hex');
if (ENCRYPTION_KEY.length !== 32) {
    throw new Error(`ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters), got ${ENCRYPTION_KEY.length} bytes. Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`);
}
const IV_LENGTH = 16; // Voor AES-256-CBC

// --- Input Validation Functions ---

/**
 * Validates that a value is a valid integer
 * @param {*} value - The value to validate
 * @param {string} fieldName - The name of the field being validated (for error messages)
 * @returns {number} The parsed integer value
 * @throws {Error} If the value is not a valid integer
 */
function validateInteger(value, fieldName) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        throw new Error(`${fieldName} must be a valid integer`);
    }
    return parsed;
}

/**
 * Validates that a string does not exceed a maximum length
 * @param {*} value - The value to validate
 * @param {string} fieldName - The name of the field being validated (for error messages)
 * @param {number} maxLength - The maximum allowed length
 * @returns {string} The trimmed string value
 * @throws {Error} If the value is not a string or exceeds the maximum length
 */
function validateStringLength(value, fieldName, maxLength) {
    if (typeof value !== 'string') {
        throw new Error(`${fieldName} must be a string`);
    }
    if (value.length > maxLength) {
        throw new Error(`${fieldName} exceeds maximum length of ${maxLength}`);
    }
    return value.trim();
}

// --- Encryptie/Decryptie Functies ---

/**
 * Encrypts a text string using AES-256-CBC encryption
 * @param {string} text - The plaintext string to encrypt
 * @returns {string} The encrypted text in format "iv:encryptedData" (both as hex strings)
 */
function encrypt(text) {
    // Genereer een nieuwe IV van 16 bytes bij elke versleuteling
    const iv = crypto.randomBytes(IV_LENGTH);

    // Gebruik de reeds gedefinieerde ENCRYPTION_KEY (die al een buffer is)
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Combineer de IV met de versleutelde tekst, gescheiden door een dubbele punt
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts a text string using AES-256-CBC decryption
 * @param {string} text - The encrypted text in format "iv:encryptedData" (both as hex strings)
 * @returns {string} The decrypted plaintext string, or empty string if decryption fails
 */
function decrypt(text) {
    if (!text || text.trim() === '') return '';

    try {
        const parts = text.split(':');

        // Controleer of de string minstens 2 delen (IV en data) heeft
        if (parts.length < 2) {
            // Dit gebeurt als je probeert data te decrypten die niet versleuteld is (of corrupt is)
            console.warn("Decryptie waarschuwing: Ongeldig versleuteld formaat ontvangen");
            return ''; // Return empty string instead of unencrypted text
        }

        // De eerste helft is de IV, de rest is de versleutelde data
        const iv = Buffer.from(parts.shift(), 'hex');
        const encryptedText = Buffer.from(parts.join(':'), 'hex');

        // 🔑 FIX: Gebruik ENCRYPTION_KEY direct, want het is al een Buffer
        const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);

        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (e) {
        console.error("Decryptie fout (waarschijnlijk verkeerde sleutel of corrupt data):", e.message);
        return '';
    }
}


// --- 1. Database Configuratie ---
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER, // Let op: dit is een PRIVE IP. Zorg dat je netwerk dit toelaat.
    database: process.env.DB_DATABASE_SUBMISSION,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
};

// Registration database configuration
const registerConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE_REGISTER,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
};

// --- 2. Middleware Instellen ---
app.use(express.json({ limit: '1mb' })); // Nodig voor JSON data van fetch()
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
// SECURITY: Restrict CORS to specific origins only
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Statische bestanden dienen
app.use(express.static(path.join(__dirname, '')));

// Route voor root doorsturen
app.get('/', (_req, res) => {
    // Dit zorgt ervoor dat de client de HTML van de server ophaalt op http://[server-ip]:3000/
    res.sendFile(path.join(__dirname, 'mvpV3.html'));
});


// Globale databaseverbinding pool
let pool;
let registerPool;

// Functie om de databaseverbinding te initialiseren
async function initializeDatabase() {
    try {
        pool = await sql.connect(config);
        console.log("Databaseverbinding is succesvol opgestart.");
    } catch (err) {
        console.error("FATALE FOUT: Databaseverbinding is mislukt:", err.message);
        // De server sluit niet af, maar we loggen de fout.
    }

    // Initialize registration database pool
    try {
        registerPool = await new sql.ConnectionPool(registerConfig).connect();
        console.log("Registration databaseverbinding is succesvol opgestart.");
    } catch (err) {
        console.error("WAARSCHUWING: Registration databaseverbinding is mislukt:", err.message);
        // Continue without registration functionality if this fails
    }
}

// ** --- 3. GET ENDPOINT VOOR DATA OPHALEN (READ) --- **
// Haalt de data op en ontsleutelt het wachtwoord voor de client
app.get('/api/getData', async (req, res) => {
    const selectQuery = `
        SELECT GroupId, Username, Password, Domain 
        FROM FormSubmission 
        ORDER BY GroupId ASC;
    `;

    if (!pool) return res.status(503).json({ message: 'Database niet beschikbaar.' });

    try {
        const result = await pool.request().query(selectQuery);

        // Ontsleutel de wachtwoorden voordat ze naar de client gaan
        const decryptedData = result.recordset.map(record => ({
            ...record,
            Password: decrypt(record.Password) // 🔑 Decryptie hier!
        }));

        res.status(200).json(decryptedData);
    } catch (err) {
        console.error("SQL Fout bij ophalen data: ", err.message);
        res.status(500).json({ message: 'Fout bij het ophalen van data van de server.' });
    }
});


// ** --- 4. POST ENDPOINT VOOR OPSLAG (CREATE) --- **
// Versleutelt het wachtwoord voordat het wordt opgeslagen
app.post('/api/saveData', async (req, res) => {
    const { GroupId, Username, Password, Domain } = req.body;

    if (!pool) return res.status(503).json({ message: 'Database niet beschikbaar.' });

    if (!GroupId || !Username || !Password || !Domain) {
        return res.status(400).json({ message: 'Alle velden zijn verplicht.' });
    }

    try {
        // Validate input
        const validatedGroupId = validateInteger(GroupId, 'GroupId');
        const validatedUsername = validateStringLength(Username, 'Username', 255);
        const validatedDomain = validateStringLength(Domain, 'Domain', 255);

        // 🔒 ENCRYPT het wachtwoord voordat het wordt opgeslagen
        const encryptedPassword = encrypt(Password);

        const insertQuery = `
            INSERT INTO FormSubmission (GroupId, Username, Password, Domain)
            VALUES (@GroupId, @Username, @EncryptedPassword, @Domain);
        `;

        const request = pool.request();
        request.input('GroupId', sql.Int, validatedGroupId);
        request.input('Username', sql.NVarChar, validatedUsername);
        request.input('EncryptedPassword', sql.NVarChar, encryptedPassword); // Gebruik versleuteld wachtwoord
        request.input('Domain', sql.NVarChar, validatedDomain);
        await request.query(insertQuery);

        res.status(201).json({ message: `Data voor Groep ${validatedGroupId} succesvol opgeslagen (INSERT) en Wachtwoord versleuteld.` });
    } catch (err) {
        console.error("SQL Fout bij opslag: ", err.message);
        res.status(500).json({ message: 'Fout bij het opslaan van data op de server.' });
    }
});

// ** --- 5. PUT ENDPOINT VOOR UPDATE (UPDATE) --- **
app.put('/api/data/:groupId', async (req, res) => {
    const groupId = req.params.groupId;
    const { Username, Password, Domain } = req.body;

    if (!pool) return res.status(503).json({ message: 'Database niet beschikbaar.' });

    if (!Username || !Domain) {
        return res.status(400).json({ message: 'Username en Domain velden zijn verplicht voor update.' });
    }

    let updateQuery;
    let encryptedPassword = null;

    try {
        // Validate input
        const validatedGroupId = validateInteger(groupId, 'groupId');
        const validatedUsername = validateStringLength(Username, 'Username', 255);
        const validatedDomain = validateStringLength(Domain, 'Domain', 255);
        if (Password && Password.trim() !== "") {
            // Als er een NIEUW wachtwoord is ingevoerd, ENCRYPT het
            encryptedPassword = encrypt(Password);
            updateQuery = `
                UPDATE FormSubmission 
                SET Username = @Username, 
                    Password = @EncryptedPassword, 
                    Domain = @Domain
                WHERE GroupId = @GroupId;
            `;
        } else {
            // Als het wachtwoordveld leeg is, BEHOUDEN we het OUDE versleutelde wachtwoord.
            updateQuery = `
                UPDATE FormSubmission 
                SET Username = @Username, 
                    Domain = @Domain
                WHERE GroupId = @GroupId;
            `;
        }

        const request = pool.request();
        request.input('GroupId', sql.Int, validatedGroupId);
        request.input('Username', sql.NVarChar, validatedUsername);
        request.input('Domain', sql.NVarChar, validatedDomain);

        if (encryptedPassword) {
            request.input('EncryptedPassword', sql.NVarChar, encryptedPassword);
        }

        const result = await request.query(updateQuery);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Geen record gevonden om bij te werken.' });
        }

        res.status(200).json({ message: `Data voor Groep ${validatedGroupId} succesvol bijgewerkt (UPDATE).` });
    } catch (err) {
        console.error("SQL Fout bij update: ", err.message);
        res.status(500).json({ message: 'Fout bij het bijwerken van data op de server.' });
    }
});


// ** --- 6. HET DELETE ENDPOINT VOOR VERWIJDERING (DELETE) --- **
app.delete('/api/data/:groupId', async (req, res) => {
    const groupId = req.params.groupId;

    if (!pool) return res.status(503).json({ message: 'Database niet beschikbaar.' });

    const deleteQuery = `
        DELETE FROM FormSubmission
        WHERE GroupId = @GroupId;
    `;

    try {
        // Validate input
        const validatedGroupId = validateInteger(groupId, 'groupId');

        const request = pool.request();
        request.input('GroupId', sql.Int, validatedGroupId);
        const result = await request.query(deleteQuery);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Geen record gevonden met die GroupId om te verwijderen.' });
        }

        res.status(200).json({ message: `Data voor Groep ${validatedGroupId} succesvol verwijderd.` });
    } catch (err) {
        console.error("SQL Fout bij verwijdering: ", err.message);
        res.status(500).json({ message: 'Fout bij het verwijderen van data op de server.' });
    }
});

// ** --- 7. POST ENDPOINT FOR USER REGISTRATION --- **
app.post('/api/register', async (req, res) => {
    // Check if registration database is available
    if (!registerPool) {
        return res.status(503).json({
            message: 'Registration service is temporarily unavailable. Please try again later.'
        });
    }

    // Extract and validate request body
    const { username, email, password, authorizedPerson, authorizedEmail } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
        return res.status(400).json({
            message: 'Username, email, and password are required fields.'
        });
    }

    try {
        // --- Input Validation ---

        // Validate username (alphanumeric + underscore/hyphen only)
        if (typeof username !== 'string' || username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
            return res.status(400).json({
                message: `Username must be between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters.`
            });
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            return res.status(400).json({
                message: 'Username can only contain letters, numbers, underscores, and hyphens.'
            });
        }

        // Validate email (practical validation pattern, max 100 chars)
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (typeof email !== 'string' || !emailRegex.test(email) || email.length > EMAIL_MAX_LENGTH) {
            return res.status(400).json({
                message: `Please provide a valid email address (max ${EMAIL_MAX_LENGTH} characters).`
            });
        }

        // Validate password (minimum 8 chars)
        if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
            return res.status(400).json({
                message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`
            });
        }

        // Validate optional authorizedPerson field
        if (authorizedPerson && (typeof authorizedPerson !== 'string' || authorizedPerson.length > 100)) {
            return res.status(400).json({
                message: 'Authorized person name must not exceed 100 characters.'
            });
        }

        // Validate optional authorizedEmail field
        if (authorizedEmail) {
            if (typeof authorizedEmail !== 'string' || !emailRegex.test(authorizedEmail) || authorizedEmail.length > 100) {
                return res.status(400).json({
                    message: 'Authorized email must be a valid email address (max 100 characters).'
                });
            }
        }

        // --- Check for Duplicate Username or Email ---
        const checkDuplicateQuery = `
            SELECT Username, Email
            FROM tbl_Users
            WHERE Username = @Username OR Email = @Email;
        `;

        const checkRequest = registerPool.request();
        checkRequest.input('Username', sql.NVarChar(50), username);
        checkRequest.input('Email', sql.NVarChar(100), email);
        const duplicateResult = await checkRequest.query(checkDuplicateQuery);

        if (duplicateResult.recordset.length > 0) {
            const existing = duplicateResult.recordset[0];
            if (existing.Username === username) {
                return res.status(409).json({
                    message: 'Username is already taken. Please choose a different username.'
                });
            }
            if (existing.Email === email) {
                return res.status(409).json({
                    message: 'Email address is already registered. Please use a different email or try logging in.'
                });
            }
        }

        // --- Hash Password with bcrypt ---
        const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

        // --- Insert New User into Database ---
        const insertQuery = `
            INSERT INTO tbl_Users (Username, Email, PasswordHash, AuthorizedPerson, AuthorizedEmail)
            VALUES (@Username, @Email, @PasswordHash, @AuthorizedPerson, @AuthorizedEmail);
        `;

        const insertRequest = registerPool.request();
        insertRequest.input('Username', sql.NVarChar(50), username);
        insertRequest.input('Email', sql.NVarChar(100), email);
        insertRequest.input('PasswordHash', sql.VarChar(60), passwordHash); // bcrypt hashes are 60 chars
        insertRequest.input('AuthorizedPerson', sql.NVarChar(100), authorizedPerson || null);
        insertRequest.input('AuthorizedEmail', sql.NVarChar(100), authorizedEmail || null);

        await insertRequest.query(insertQuery);

        // Success response
        res.status(201).json({
            message: 'Account created successfully! You can now log in.',
            username: username
        });

    } catch (err) {
        console.error("Registration error:", err.message);

        // Handle specific SQL errors
        if (err.number === 2627 || err.number === 2601) {
            // Duplicate key error (backup check)
            return res.status(409).json({
                message: 'Username or email already exists.'
            });
        }

        res.status(500).json({
            message: 'An error occurred during registration. Please try again later.'
        });
    }
});

// --- 8. Server Luisteren (Start de app nadat de DB is geïnitialiseerd) ---
initializeDatabase().then(() => {
    app.listen(port, () => {
        console.log(`CRUD Server draait op http://localhost:${port}.`);
    });
});