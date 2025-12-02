require('dotenv').config();

const express = require('express');
const sql = require('mssql');
const bcrypt = require('bcrypt'); // Voor veilige wachtwoord-hashing
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// =========================================================
// ⭐⭐ WIJZIGING 1: VOEG JSON MIDDLEWARE TOE ⭐⭐
// Dit is CRUCIAAL voor het correct verwerken van de JSON body die via 'fetch' binnenkomt.
app.use(express.json());
// =========================================================

// Middleware om URL-gecodeerde formuliergegevens te verwerken (voor legacy forms)
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
// Middleware om statische bestanden (zoals je HTML/CSS) te serveren
// Zorg ervoor dat de map 'public' bestaat en je HTML-bestanden daar staan.
app.use(express.static('public'));


// 🔑 CONFIGURATIE: Geladen uit .env bestand
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE_REGISTER,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    }

};

// De SALT ROUNDS bepalen de sterkte van de hash. 10 is de standaard.
const saltRounds = 10;

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Globale databaseverbinding pool
let pool;

// Functie om de databaseverbinding te initialiseren
async function initializeDatabase() {
    try {
        pool = await sql.connect(config);
        console.log("Database verbinding succesvol opgestart voor InsertRegistrationV2.");
    } catch (err) {
        console.error("FATALE FOUT: Databaseverbinding is mislukt:", err.message);
        process.exit(1);
    }
}

// ⭐⭐ WIJZIGING 2: PAD AANGEPAST naar '/api/register' om overeen te komen met frontend fetch
app.post('/api/register', async (req, res) => {
    // req.body werkt nu correct dankzij app.use(express.json())
    const { username, email, password, AuthorizedPerson, AuthorizedEmail } = req.body;

    if (!username || !email || !password) {
        // Stuur JSON terug, omdat de client-side (fetch) hier JSON verwacht.
        return res.status(400).json({ message: 'Fout: Gebruikersnaam, E-mail en Wachtwoord zijn verplicht.' });
    }

    // Validate and sanitize input lengths
    if (username.length > 50) {
        return res.status(400).json({ message: 'Fout: Gebruikersnaam mag maximaal 50 karakters lang zijn.' });
    }
    if (email.length > 100) {
        return res.status(400).json({ message: 'Fout: E-mail mag maximaal 100 karakters lang zijn.' });
    }

    const finalAuthPerson = (AuthorizedPerson && AuthorizedPerson.trim() !== '') ? AuthorizedPerson.trim() : null;
    const finalAuthEmail = (AuthorizedEmail && AuthorizedEmail.trim() !== '') ? AuthorizedEmail.trim() : null;

    if (finalAuthPerson && finalAuthPerson.length > 100) {
        return res.status(400).json({ message: 'Fout: AuthorizedPerson mag maximaal 100 karakters lang zijn.' });
    }
    if (finalAuthEmail && finalAuthEmail.length > 100) {
        return res.status(400).json({ message: 'Fout: AuthorizedEmail mag maximaal 100 karakters lang zijn.' });
    }

    // Validate email format
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Fout: Ongeldig e-mailadres formaat.' });
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
        return res.status(400).json({ message: 'Fout: Wachtwoord moet minimaal 8 karakters lang zijn.' });
    }

    if (!pool) return res.status(503).json({ message: 'Database niet beschikbaar.' });

    try {
        // 1. Wachtwoord HASHEN (ASYNCHROON)
        const hash = await bcrypt.hash(password, saltRounds);

        // 2. Database INSERT using existing pool
        const result = await pool.request()

            // Veilige geparametriseerde query: voorkomt SQL Injection
            .input('usernameParam', sql.VarChar(50), username)
            .input('emailParam', sql.VarChar(100), email)
            .input('hashParam', sql.Char(60), hash) // De gehashte waarde
            .input('authPersonParam', sql.VarChar(100), finalAuthPerson)
            .input('authEmailParam', sql.VarChar(100), finalAuthEmail)
            .query(`
                INSERT INTO tbl_Users (Username, Email, PasswordHash, AuthorizedPerson, AuthorizedEmail)
                VALUES (@usernameParam, @emailParam, @hashParam, @authPersonParam, @authEmailParam)
            `);

        if (result.rowsAffected[0] === 1) {
            console.log(`Gebruiker ${username} succesvol geregistreerd.`);

            // Stuur een SUCCES JSON-respons terug (status 200). 
            // De frontend JavaScript zal de redirect afhandelen.
            return res.status(200).json({ message: 'Registratie succesvol.' });

        } else {
            res.status(500).json({ message: 'Registratie mislukt. Geen rijen beïnvloed.' });
        }

    } catch (err) {
        if (err.message.includes('UNIQUE KEY')) {
            res.status(409).json({ message: 'Fout: Gebruikersnaam of E-mail is al in gebruik.' });
        } else {
            console.error("Databasefout bij registratie:", err.message);
            res.status(500).json({ message: 'Interne serverfout tijdens registratie.' });
        }
    }
});


// ⭐⭐ WIJZIGING 3: PAD AANGEPAST naar '/api/check' om overeen te komen met frontend fetch
app.post('/api/check', async (req, res) => {
    // 1. INPUT OPHALEN (req.body werkt nu correct)
    const { email, password } = req.body;

    // Basale validatie
    if (!email || !password) {
        // Stuur kale tekst terug, want de loginV3.js verwacht kale tekst bij fout
        return res.status(400).send('E-mail en Wachtwoord zijn vereist.');
    }

    if (!pool) return res.status(503).send('Database niet beschikbaar.');

    let userRecord;

    try {
        // 2. GEBRUIKER ZOEKEN OP E-MAIL
        const request = pool.request();

        const result = await request
            .input('emailParam', sql.VarChar(100), email)
            .query(`SELECT PasswordHash, Username FROM tbl_Users WHERE Email = @emailParam`);

        userRecord = result.recordset[0];

        // 3. CONTROLEER OF DE GEBRUIKER BESTAAT
        if (!userRecord) {
            return res.status(401).send('Onjuiste e-mail of wachtwoord.');
        }

        // 4. WACHTWOORD VERGELIJKEN (De beveiligde stap!)
        const storedHash = userRecord.PasswordHash.trim();

        const match = await bcrypt.compare(password, storedHash);

        if (match) {
            // 5. SUCCES: Ingelogd!
            console.log(`Gebruiker ${userRecord.Username} is succesvol ingelogd.`);

            // Stuur een kale tekst respons terug. De frontend JavaScript zal de redirect afhandelen.
            return res.status(200).send('Login succesvol.');

        } else {
            // 6. MISLUKT: Wachtwoord komt niet overeen
            return res.status(401).send('Onjuiste e-mail of wachtwoord.');
        }

    } catch (err) {
        console.error("Fout bij inloggen:", err.message);
        return res.status(500).send('Interne serverfout tijdens inloggen.');
    }
});

// ⭐⭐ OPTIONEEL: Route voor het laden van de hoofdpagina (anders krijg je Cannot GET /)
app.get('/', (req, res) => {
    // Stuurt de gebruiker direct door naar de loginpagina bij het bezoeken van de root URL
    res.redirect('/loginV3.html');
});


// Start de server nadat de DB is geïnitialiseerd
initializeDatabase().then(() => {
    app.listen(port, () => {
        console.log(`Server draait op http://localhost:${port}`);
    });
});