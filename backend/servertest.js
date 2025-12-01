require('dotenv').config();

const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto'); // Nodig voor encryptie
const app = express();
const port = process.env.PORT || 3000;

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

// --- Encryptie/Decryptie Functies ---

/**
 * Versleutelt een tekststring met AES-256-CBC.
 */
function encrypt(text) {
    // Genereer hier een nieuwe IV van 16 bytes
    const iv = crypto.randomBytes(16);

    // Gebruik de reeds gedefinieerde, correcte ENCRYPTION_KEY (die al een buffer is)
    // We roepen Buffer.from NIET opnieuw aan op de sleutel
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Combineer de IV met de versleutelde tekst, gescheiden door een dubbele punt
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Ontsleutelt een tekststring met AES-256-CBC.
 */
function decrypt(text) {
    if (!text || text.trim() === '') return '';

    try {
        const parts = text.split(':');
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
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE_SUBMISSION,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
};

// --- 2. Middleware Instellen ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// SECURITY: Restrict CORS to specific origins only
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Statische bestanden dienen
app.use(express.static(path.join(__dirname, '')));

// Route voor root doorsturen
app.get('/', (req, res) => {
    res.redirect('/mvpV3.html');
});


// Globale databaseverbinding pool
let pool;

// Functie om de databaseverbinding te initialiseren
async function initializeDatabase() {
    try {
        pool = await sql.connect(config);
        console.log("Databaseverbinding is succesvol opgestart.");
    } catch (err) {
        console.error("FATALE FOUT: Databaseverbinding is mislukt:", err.message);
        process.exit(1);
    }
}

// ** --- 3. GET ENDPOINT VOOR DATA OPHALEN (AANGEPAST) --- **
// Haalt de data op en ontsleutelt het wachtwoord voor de client
app.get('/api/getData', async (req, res) => {
    const selectQuery = `
        SELECT GroupId, Username, Password, Domain 
        FROM FormSubmission 
        ORDER BY GroupId ASC;
    `;

    try {
        const request = pool.request();
        const result = await request.query(selectQuery);

        // Ontsleutel de wachtwoorden voordat ze naar de client gaan
        const decryptedData = result.recordset.map(record => ({
            ...record,
            Password: decrypt(record.Password) // 🔑 Decryptie hier!
        }));

        res.status(200).json(decryptedData);
    } catch (err) {
        console.error("SQL Fout bij ophalen data: ", err);
        res.status(500).json({ message: 'Fout bij het ophalen van data van de server.' });
    }
});


// ** --- 4. POST ENDPOINT VOOR OPSLAG (INSERT) (AANGEPAST) --- **
// Versleutelt het wachtwoord voordat het wordt opgeslagen
app.post('/api/saveData', async (req, res) => {
    const { GroupId, Username, Password, Domain } = req.body;

    if (!GroupId || !Username || !Password || !Domain) {
        return res.status(400).json({ message: 'Alle GroupId, Username, Password en Domain velden zijn verplicht.' });
    }

    try {
        // 🔒 ENCRYPT het wachtwoord voordat het wordt opgeslagen
        const encryptedPassword = encrypt(Password);

        const insertQuery = `
            INSERT INTO FormSubmission (GroupId, Username, Password, Domain)
            VALUES (@GroupId, @Username, @EncryptedPassword, @Domain);
        `;

        const request = pool.request();
        request.input('GroupId', sql.Int, GroupId);
        request.input('Username', sql.NVarChar, Username);
        request.input('EncryptedPassword', sql.NVarChar, encryptedPassword); // Gebruik versleuteld wachtwoord
        request.input('Domain', sql.NVarChar, Domain);
        await request.query(insertQuery);

        res.status(201).json({ message: `Data voor Groep ${GroupId} succesvol opgeslagen (INSERT) en Wachtwoord versleuteld.` });
    } catch (err) {
        console.error("SQL Fout bij opslag: ", err);
        res.status(500).json({ message: 'Fout bij het opslaan van data op de server.' });
    }
});

// ** --- 5. PUT ENDPOINT VOOR UPDATE (AANGEPAST) --- **
// Versleutelt een nieuw wachtwoord, of negeert het als het leeg is
app.put('/api/data/:groupId', async (req, res) => {
    const groupId = req.params.groupId;
    const { Username, Password, Domain } = req.body;

    if (!Username || !Domain) {
        return res.status(400).json({ message: 'Username en Domain velden zijn verplicht voor update.' });
    }

    let updateQuery;
    let encryptedPassword = null;

    try {
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
        request.input('GroupId', sql.Int, groupId);
        request.input('Username', sql.NVarChar, Username);
        request.input('Domain', sql.NVarChar, Domain);

        if (encryptedPassword) {
            request.input('EncryptedPassword', sql.NVarChar, encryptedPassword);
        }

        const result = await request.query(updateQuery);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Geen record gevonden om bij te werken.' });
        }

        res.status(200).json({ message: `Data voor Groep ${groupId} succesvol bijgewerkt (UPDATE) en Wachtwoord ${encryptedPassword ? 'versleuteld' : 'ongewijzigd'}.` });
    } catch (err) {
        console.error("SQL Fout bij update: ", err);
        res.status(500).json({ message: 'Fout bij het bijwerken van data op de server.' });
    }
});


// ** --- 6. HET DELETE ENDPOINT VOOR VERWIJDERING --- **
app.delete('/api/data/:groupId', async (req, res) => {
    const groupId = req.params.groupId;

    const deleteQuery = `
        DELETE FROM FormSubmission 
        WHERE GroupId = @GroupId;
    `;

    try {
        const request = pool.request();
        request.input('GroupId', sql.Int, groupId);
        const result = await request.query(deleteQuery);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Geen record gevonden met die GroupId om te verwijderen.' });
        }

        res.status(200).json({ message: `Data voor Groep ${groupId} succesvol verwijderd.` });
    } catch (err) {
        console.error("SQL Fout bij verwijdering: ", err);
        res.status(500).json({ message: 'Fout bij het verwijderen van data op de server.' });
    }
});

// --- 7. Server Luisteren (Start de app nadat de DB is geïnitialiseerd) ---
const PORT = process.env.PORT || 3000;

initializeDatabase().then(() => {
    app.listen(port, () => {
        console.log(`Server draait op http://localhost:${port}`);
    });
});

