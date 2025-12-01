require('dotenv').config();

const express = require('express');
const sql = require('mssql');
const bcrypt = require('bcrypt'); // Voor veilige wachtwoord-hashing
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middleware om URL-gecodeerde formuliergegevens te verwerken (nodig voor HTML forms)
app.use(express.urlencoded({ extended: true }));
// Middleware om statische bestanden (zoals je HTML/CSS) te serveren


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

// Globale databaseverbinding pool
let pool;

// Functie om de databaseverbinding te initialiseren
async function initializeDatabase() {
    try {
        pool = await sql.connect(config);
        console.log("Database verbinding succesvol opgestart voor InsertRegistration.");
    } catch (err) {
        console.error("FATALE FOUT: Databaseverbinding is mislukt:", err.message);
        process.exit(1);
    }
}

// 🌐 POST-route voor de registratie van een nieuwe gebruiker
app.post('/register', async (req, res) => {
    // Haal de gegevens van het formulier (via de 'name' attributen) op
    const { username, email, password, AuthorizedPerson, AuthorizedEmail } = req.body;

    const finalAuthPerson = (AuthorizedPerson && AuthorizedPerson.trim() !== '') ? AuthorizedPerson.trim() : null;
    const finalAuthEmail = (AuthorizedEmail && AuthorizedEmail.trim() !== '') ? AuthorizedEmail.trim() : null;

    if (!username || !email || !password) {
        return res.status(400).send('Fout: Gebruikersnaam, E-mail en Wachtwoord zijn verplicht.');
    }

    if (!pool) return res.status(503).json({ message: 'Database niet beschikbaar.' });

    try {
        // 1. Wachtwoord HASHEN (ASYNCHROON)
        const hash = await bcrypt.hash(password, saltRounds);
        console.log(`Wachtwoord gehasht voor ${username}.`);

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
            // Stuur een bevestiging terug
            res.status(201).send('Registratie succesvol! Je wachtwoord is veilig gehasht.');
        } else {
            res.status(500).send('Registratie mislukt. Geen rijen beïnvloed.');
        }

    } catch (err) {
        if (err.message.includes('UNIQUE KEY')) {
            res.status(409).send('Fout: Gebruikersnaam of E-mail is al in gebruik.');
        } else {
            console.error("Databasefout bij registratie:", err.message);
            res.status(500).send('Interne serverfout tijdens registratie.');
        }
    }
});

// Zorg ervoor dat de root-URL de registratiepagina serveert

// Start de server nadat de DB is geïnitialiseerd
initializeDatabase().then(() => {
    app.listen(port, () => {
        console.log(`Server draait op http://localhost:${port}`);
    });
});