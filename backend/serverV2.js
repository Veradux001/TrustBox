require('dotenv').config();

const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const app = express();
const router = express.Router();
const port = process.env.PORT || 3000;

// --- Validatie Constanten ---
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 50;
const EMAIL_MAX_LENGTH = 100;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72; // Maximale invoerlengte voor bcrypt
const BCRYPT_SALT_ROUNDS = 12; // Industriestandaard voor beveiliging

// Laad versleutelingssleutel uit omgevingsvariabelen
const RAW_KEY = process.env.ENCRYPTION_KEY;
if (!RAW_KEY) {
    throw new Error('ENCRYPTION_KEY is niet ingesteld in omgevingsvariabelen');
}
// De sleutel MOET 32 bytes (256 bit) lang zijn voor AES-256-CBC
// Parseer als hex string (64 hex karakters = 32 bytes)
const ENCRYPTION_KEY = Buffer.from(RAW_KEY, 'hex');
if (ENCRYPTION_KEY.length !== 32) {
    throw new Error(`ENCRYPTION_KEY moet exact 32 bytes (64 hex karakters) zijn, kreeg ${ENCRYPTION_KEY.length} bytes. Genereer een nieuwe met: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`);
}
const IV_LENGTH = 16; // Voor AES-256-CBC

// --- Invoer Validatie Functies ---

/**
 * Valideert dat een waarde een geldig geheel getal is
 * @param {*} value - De te valideren waarde
 * @param {string} fieldName - De naam van het veld dat wordt gevalideerd (voor foutmeldingen)
 * @returns {number} De geparseerde integer waarde
 * @throws {Error} Als de waarde geen geldig geheel getal is
 */
function validateInteger(value, fieldName) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        throw new Error(`${fieldName} moet een geldig geheel getal zijn`);
    }
    return parsed;
}

/**
 * Valideert dat een string een maximale lengte niet overschrijdt
 * @param {*} value - De te valideren waarde
 * @param {string} fieldName - De naam van het veld dat wordt gevalideerd (voor foutmeldingen)
 * @param {number} maxLength - De maximaal toegestane lengte
 * @returns {string} De getrimde string waarde
 * @throws {Error} Als de waarde geen string is of de maximale lengte overschrijdt
 */
function validateStringLength(value, fieldName, maxLength) {
    if (typeof value !== 'string') {
        throw new Error(`${fieldName} moet een string zijn`);
    }
    if (value.length > maxLength) {
        throw new Error(`${fieldName} overschrijdt de maximale lengte van ${maxLength}`);
    }
    return value.trim();
}

/**
 * Valideert een wachtwoord voor encryptie
 * @param {*} password - Het te valideren wachtwoord
 * @param {string} fieldName - De naam van het veld (voor foutmeldingen)
 * @param {boolean} allowEmpty - Of lege strings toegestaan zijn
 * @returns {string} Het gevalideerde wachtwoord
 * @throws {Error} Als het wachtwoord ongeldig is
 */
function validatePassword(password, fieldName = 'Wachtwoord', allowEmpty = false) {
    if (typeof password !== 'string') {
        throw new Error(`${fieldName} moet een string zijn`);
    }
    if (!allowEmpty && password.trim() === '') {
        throw new Error(`${fieldName} mag niet leeg zijn`);
    }
    if (password.length > 1000) { // Redelijke maximale lengte
        throw new Error(`${fieldName} overschrijdt de maximale lengte van 1000 karakters`);
    }
    return password;
}

// --- Encryptie/Decryptie Functies ---

/**
 * Versleutelt een tekststring met AES-256-CBC encryptie
 * @param {string} text - De platte tekst om te versleutelen
 * @returns {string} De versleutelde tekst in formaat "iv:encryptedData" (beide als hex strings)
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
 * Ontsleutelt een tekststring met AES-256-CBC decryptie
 * @param {string} text - De versleutelde tekst in formaat "iv:encryptedData" (beide als hex strings)
 * @returns {string} De ontsleutelde platte tekst, of lege string als decryptie mislukt
 */
function decrypt(text) {
    if (!text || text.trim() === '') return '';

    try {
        const parts = text.split(':');

        // Controleer of de string minstens 2 delen (IV en data) heeft
        if (parts.length < 2) {
            throw new Error('Ongeldig versleuteld formaat - data is mogelijk corrupt');
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
        console.error("Decryptie fout:", e.message);
        throw new Error('Wachtwoord kon niet worden ontsleuteld. Neem contact op met support.');
    }
}


// --- 1. Database Configuratie ---
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER, // Let op: dit is een PRIVÉ IP. Zorg dat je netwerk dit toelaat.
    database: process.env.DB_DATABASE_SUBMISSION,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
};

// Registratie database configuratie
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

// BEVEILIGING: Beperk CORS tot specifieke origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000'];

console.log('CORS toegestane origins:', allowedOrigins);

app.use(cors({
    origin: function (origin, callback) {
        // Sta requests zonder origin toe (bijv. mobiele apps, Postman)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.error(`CORS geblokkeerd voor origin: ${origin}`);
            console.error(`Toegestane origins zijn: ${allowedOrigins.join(', ')}`);
            callback(new Error(`Origin ${origin} is niet toegestaan door CORS. Voeg het toe aan ALLOWED_ORIGINS in .env`));
        }
    },
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

    // Initialiseer registratie database pool
    try {
        registerPool = await new sql.ConnectionPool(registerConfig).connect();
        console.log("Registratie databaseverbinding is succesvol opgestart.");
    } catch (err) {
        console.error("WAARSCHUWING: Registratie databaseverbinding is mislukt:", err.message);
        // Ga door zonder registratiefunctionaliteit als dit mislukt
    }
}

// ** --- 3. GET ENDPOINT VOOR DATA OPHALEN (READ) --- **
// Haalt de data op en ontsleutelt het wachtwoord voor de client
router.get('/getData', async (req, res) => {
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
router.post('/saveData', async (req, res) => {
    const { GroupId, Username, Password, Domain } = req.body;

    if (!pool) {
        console.error("Database pool is niet beschikbaar bij saveData request");
        return res.status(503).json({ message: 'Database niet beschikbaar. Neem contact op met de beheerder.' });
    }

    if (!GroupId || !Username || !Password || !Domain) {
        return res.status(400).json({ message: 'Alle velden zijn verplicht.' });
    }

    try {
        // Valideer invoer
        const validatedGroupId = validateInteger(GroupId, 'GroupId');
        const validatedUsername = validateStringLength(Username, 'Username', 255);
        const validatedDomain = validateStringLength(Domain, 'Domain', 255);

        // Valideer wachtwoord met gedeelde validatie functie
        const validatedPassword = validatePassword(Password, 'Wachtwoord', false);

        // 🔒 VERSLEUTEL het wachtwoord voordat het wordt opgeslagen
        let encryptedPassword;
        try {
            encryptedPassword = encrypt(validatedPassword);
        } catch (encryptError) {
            console.error("Encryptie fout bij opslag:", encryptError.message);
            console.error("Volledige encryptie fout:", encryptError);
            return res.status(500).json({ message: 'Fout bij het versleutelen van het wachtwoord. Controleer de ENCRYPTION_KEY configuratie.' });
        }

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
        console.error("SQL Fout bij opslag:", err.message);
        console.error("Fout type:", err.name);
        console.error("Fout code:", err.code);
        console.error("Volledige fout:", err);

        // Geef meer specifieke foutmeldingen
        if (err.name === 'ValidationError' || err.message.includes('moet') || err.message.includes('overschrijdt')) {
            return res.status(400).json({ message: err.message });
        }

        if (err.number === 2627 || err.number === 2601) {
            return res.status(409).json({ message: 'Er bestaat al een record met dit GroupId. Gebruik de Bijwerken knop of kies een ander GroupId.' });
        }

        if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEOUT') {
            return res.status(503).json({ message: 'Kan geen verbinding maken met de database. Neem contact op met de beheerder.' });
        }

        res.status(500).json({ message: 'Fout bij het opslaan van data op de server. Neem contact op met de beheerder.' });
    }
});

// ** --- 5. PUT ENDPOINT VOOR UPDATE (UPDATE) --- **
router.put('/data/:groupId', async (req, res) => {
    const groupId = req.params.groupId;
    const { Username, Password, Domain } = req.body;

    if (!pool) return res.status(503).json({ message: 'Database niet beschikbaar.' });

    if (!Username || !Domain) {
        return res.status(400).json({ message: 'Username en Domain velden zijn verplicht voor update.' });
    }

    let updateQuery;
    let encryptedPassword = null;

    try {
        // Valideer invoer
        const validatedGroupId = validateInteger(groupId, 'groupId');
        const validatedUsername = validateStringLength(Username, 'Username', 255);
        const validatedDomain = validateStringLength(Domain, 'Domain', 255);

        // Valideer en versleutel wachtwoord als het is opgegeven
        if (Password !== undefined && Password !== null && Password !== '') {
            // Valideer wachtwoord met gedeelde validatie functie EERST
            const validatedPassword = validatePassword(Password, 'Wachtwoord', false);

            // Als er een NIEUW wachtwoord is ingevoerd, VERSLEUTEL het
            try {
                encryptedPassword = encrypt(validatedPassword);
            } catch (encryptError) {
                console.error("Encryptie fout bij update:", encryptError.message);
                console.error("Volledige encryptie fout:", encryptError);
                return res.status(500).json({ message: 'Fout bij het versleutelen van het wachtwoord.' });
            }

            updateQuery = `
                UPDATE FormSubmission
                SET Username = @Username,
                    Password = @EncryptedPassword,
                    Domain = @Domain
                WHERE GroupId = @GroupId;
            `;
        } else {
            // Als Password niet is opgegeven of leeg is, behoud het oude wachtwoord
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
        console.error("SQL Fout bij update:", err.message);
        console.error("Volledige fout:", err);
        res.status(500).json({ message: 'Fout bij het bijwerken van data op de server. Neem contact op met de beheerder.' });
    }
});


// ** --- 6. DELETE ENDPOINT VOOR VERWIJDERING (DELETE) --- **
router.delete('/data/:groupId', async (req, res) => {
    const groupId = req.params.groupId;

    if (!pool) return res.status(503).json({ message: 'Database niet beschikbaar.' });

    const deleteQuery = `
        DELETE FROM FormSubmission
        WHERE GroupId = @GroupId;
    `;

    try {
        // Valideer invoer
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

// ** --- 7. POST ENDPOINT VOOR GEBRUIKERSREGISTRATIE --- **
router.post('/register', async (req, res) => {
    // Controleer of registratie database beschikbaar is
    if (!registerPool) {
        return res.status(503).json({
            message: 'Registratieservice is tijdelijk niet beschikbaar. Probeer het later opnieuw.'
        });
    }

    // Haal en valideer request body op
    const { username, email, password, authorizedPerson, authorizedEmail } = req.body;

    // Valideer verplichte velden
    if (!username || !email || !password) {
        return res.status(400).json({
            message: 'Gebruikersnaam, e-mail en wachtwoord zijn verplichte velden.'
        });
    }

    try {
        // --- Invoer Validatie ---

        // Valideer gebruikersnaam (alleen alfanumeriek + underscore/koppelteken)
        if (typeof username !== 'string' || username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
            return res.status(400).json({
                message: `Gebruikersnaam moet tussen ${USERNAME_MIN_LENGTH} en ${USERNAME_MAX_LENGTH} karakters zijn.`
            });
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            return res.status(400).json({
                message: 'Gebruikersnaam mag alleen letters, cijfers, underscores en koppeltekens bevatten.'
            });
        }

        // Valideer e-mail (praktische validatie patroon, max 100 karakters)
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (typeof email !== 'string' || !emailRegex.test(email) || email.length > EMAIL_MAX_LENGTH) {
            return res.status(400).json({
                message: `Geef een geldig e-mailadres op (max ${EMAIL_MAX_LENGTH} karakters).`
            });
        }

        // Valideer wachtwoord (minimaal 8 karakters, maximaal 72 karakters voor bcrypt)
        if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
            return res.status(400).json({
                message: `Wachtwoord moet tussen ${PASSWORD_MIN_LENGTH} en ${PASSWORD_MAX_LENGTH} karakters lang zijn.`
            });
        }

        // Valideer optioneel authorizedPerson veld
        if (authorizedPerson && (typeof authorizedPerson !== 'string' || authorizedPerson.length > 100)) {
            return res.status(400).json({
                message: 'Naam gemachtigde persoon mag niet meer dan 100 karakters zijn.'
            });
        }

        // Valideer optioneel authorizedEmail veld
        if (authorizedEmail) {
            if (typeof authorizedEmail !== 'string' || !emailRegex.test(authorizedEmail) || authorizedEmail.length > 100) {
                return res.status(400).json({
                    message: 'E-mail gemachtigde moet een geldig e-mailadres zijn (max 100 karakters).'
                });
            }
        }

        // --- Controleer op Dubbele Gebruikersnaam of E-mail ---
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
                    message: 'Gebruikersnaam is al in gebruik. Kies een andere gebruikersnaam.'
                });
            }
            if (existing.Email === email) {
                return res.status(409).json({
                    message: 'E-mailadres is al geregistreerd. Gebruik een ander e-mailadres of probeer in te loggen.'
                });
            }
        }

        // --- Hash Wachtwoord met bcrypt ---
        const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

        // --- Voeg Nieuwe Gebruiker toe aan Database ---
        const insertQuery = `
            INSERT INTO tbl_Users (Username, Email, PasswordHash, AuthorizedPerson, AuthorizedEmail)
            VALUES (@Username, @Email, @PasswordHash, @AuthorizedPerson, @AuthorizedEmail);
        `;

        const insertRequest = registerPool.request();
        insertRequest.input('Username', sql.NVarChar(50), username);
        insertRequest.input('Email', sql.NVarChar(100), email);
        insertRequest.input('PasswordHash', sql.Char(60), passwordHash); // bcrypt hashes zijn exact 60 karakters (vaste lengte)
        insertRequest.input('AuthorizedPerson', sql.NVarChar(100), authorizedPerson || null);
        insertRequest.input('AuthorizedEmail', sql.NVarChar(100), authorizedEmail || null);

        await insertRequest.query(insertQuery);

        // Succes response
        res.status(201).json({
            message: 'Account succesvol aangemaakt! Je kunt nu inloggen.',
            username: username
        });

    } catch (err) {
        console.error("Registratie fout:", err.message);

        // Behandel specifieke SQL fouten
        if (err.number === 2627 || err.number === 2601) {
            // Dubbele sleutel fout (backup controle)
            return res.status(409).json({
                message: 'Gebruikersnaam of e-mail bestaat al.'
            });
        }

        res.status(500).json({
            message: 'Er is een fout opgetreden tijdens registratie. Probeer het later opnieuw.'
        });
    }
});

// ** --- 8. POST ENDPOINT VOOR GEBRUIKERSLOGIN --- **
router.post('/login', async (req, res) => {
    // Controleer of registratie database beschikbaar is (we gebruiken dezelfde DB voor login)
    if (!registerPool) {
        return res.status(503).json({
            message: 'Authenticatieservice is tijdelijk niet beschikbaar. Probeer het later opnieuw.'
        });
    }

    // Haal en valideer request body op
    const { email, password } = req.body;

    // Valideer verplichte velden
    if (!email || !password) {
        return res.status(400).json({
            message: 'E-mail en wachtwoord zijn verplichte velden.'
        });
    }

    try {
        // --- Invoer Validatie ---
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

        if (typeof email !== 'string' || !emailRegex.test(email) || email.length > EMAIL_MAX_LENGTH) {
            return res.status(400).json({
                message: 'Geef een geldig e-mailadres op.'
            });
        }

        if (typeof password !== 'string' || password.length < 1) {
            return res.status(400).json({
                message: 'Geef een wachtwoord op.'
            });
        }

        // --- Zoek Gebruiker op E-mail ---
        const findUserQuery = `
            SELECT UserId, Username, Email, PasswordHash
            FROM tbl_Users
            WHERE Email = @Email;
        `;

        const findRequest = registerPool.request();
        findRequest.input('Email', sql.NVarChar(100), email);
        const result = await findRequest.query(findUserQuery);

        // Controleer of gebruiker bestaat
        if (result.recordset.length === 0) {
            return res.status(401).json({
                message: 'Ongeldig e-mailadres of wachtwoord.'
            });
        }

        const user = result.recordset[0];

        // --- Verifieer Wachtwoord met bcrypt ---
        const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);

        if (!isPasswordValid) {
            return res.status(401).json({
                message: 'Ongeldig e-mailadres of wachtwoord.'
            });
        }

        // --- Succesvolle Login ---
        // Geef gebruikersinformatie terug (zonder wachtwoord hash)
        res.status(200).json({
            message: 'Login succesvol!',
            user: {
                userId: user.UserId,
                username: user.Username,
                email: user.Email
            }
        });

    } catch (err) {
        console.error("Login fout:", err.message);

        res.status(500).json({
            message: 'Er is een fout opgetreden tijdens het inloggen. Probeer het later opnieuw.'
        });
    }
});

// Koppel de API router aan root (Nginx verwijdert /api prefix voordat het naar backend proxied)
app.use('/', router);

// --- 9. Server Luisteren (Start de app nadat de DB is geïnitialiseerd) ---
initializeDatabase().then(() => {
    app.listen(port, () => {
        console.log(`CRUD Server draait op http://localhost:${port}.`);
    });
});
