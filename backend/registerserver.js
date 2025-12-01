const express = require('express');
const sql = require('mssql');
const bcrypt = require('bcrypt'); // Voor veilige wachtwoord-hashing
const path = require('path');
const app = express();
const port = 3000;

// Middleware om URL-gecodeerde formuliergegevens te verwerken (nodig voor HTML forms)
app.use(express.urlencoded({ extended: true }));

// Middleware om statische bestanden (zoals je HTML/CSS) te serveren
// Zorgt ervoor dat je een 'public' map kunt gebruiken voor frontend-bestanden.
app.use(express.static('public'));


// 🔑 CONFIGURATIE: PAS DIT AAN! 🔑
const config = {
    user: 'sa',
    password: 'h302=nrP5^4!',
    server: '172.18.241.241',
    database: 'Register',
    options: {
        encrypt: false, // Zet dit op true als je Azure of een SSL-server gebruikt
        trustServerCertificate: true,
    }

};

// De SALT ROUNDS bepalen de sterkte van de hash. 10 is de standaard.
const saltRounds = 10;


// 🌐 POST-route voor de registratie van een nieuwe gebruiker
app.post('/register', async (req, res) => {
    // Haal de gegevens van het formulier (via de 'name' attributen) op
    const { username, email, password, AuthorizedPerson, AuthorizedEmail } = req.body;

    const finalAuthPerson = (AuthorizedPerson && AuthorizedPerson.trim() !== '') ? AuthorizedPerson.trim() : null;
    const finalAuthEmail = (AuthorizedEmail && AuthorizedEmail.trim() !== '') ? AuthorizedEmail.trim() : null;

    if (!username || !email || !password) {
        return res.status(400).send('Fout: Gebruikersnaam, E-mail en Wachtwoord zijn verplicht.');
    }

    let pool;
    try {
        // 1. Wachtwoord HASHEN (ASYNCHROON)
        const hash = await bcrypt.hash(password, saltRounds);
        console.log(`Wachtwoord gehasht voor ${username}. Hash: ${hash.substring(0, 15)}...`);

        // 2. Database Verbinding en INSERT
        pool = await sql.connect(config);


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
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});


// 🔒 NIEUWE POST-route voor het inloggen van een gebruiker
app.post('/login', async (req, res) => {
    // Haal de inloggegevens op
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Fout: Gebruikersnaam en Wachtwoord zijn verplicht.');
    }

    let pool;
    try {
        // 1. Database Verbinding
        pool = await sql.connect(config);

        // 2. Zoek de gebruiker op en haal de gehashte wachtwoord op (PasswordHash)
        const result = await pool.request()
            .input('usernameParam', sql.VarChar(50), username)
            .query('SELECT PasswordHash FROM tbl_Users WHERE Username = @usernameParam');

        if (result.recordset.length === 0) {
            // Gebruiker niet gevonden (Belangrijk: geef een generieke foutmelding voor veiligheid)
            return res.status(401).send('Fout: Onjuiste gebruikersnaam of wachtwoord.');
        }

        const storedHash = result.recordset[0].PasswordHash;

        // 3. Vergelijk het ingevoerde wachtwoord met de opgeslagen hash (ASYNCHROON)
        const match = await bcrypt.compare(password, storedHash);

        if (match) {
            // Wachtwoorden komen overeen
            console.log(`Gebruiker ${username} succesvol ingelogd.`);
            res.status(200).send('Inloggen succesvol! Welkom.');
        } else {
            // Wachtwoorden komen niet overeen (Geef dezelfde foutmelding voor veiligheid)
            console.log(`Mislukte inlogpoging voor ${username}.`);
            res.status(401).send('Fout: Onjuiste gebruikersnaam of wachtwoord.');
        }

    } catch (err) {
        console.error("Databasefout bij inloggen:", err.message);
        res.status(500).send('Interne serverfout tijdens het inloggen.');
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});

// Zorg ervoor dat de root-URL de registratiepagina serveert
// Optioneel: Stuur index.html als de root-URL wordt opgevraagd
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.listen(port, () => {
    console.log(`Server draait op http://localhost:${port}`);
});