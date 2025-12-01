const express = require('express');
const sql = require('mssql');
const bcrypt = require('bcrypt'); // Voor veilige wachtwoord-hashing
const path = require('path');
const app = express();
const port = 3000;

// Middleware om URL-gecodeerde formuliergegevens te verwerken (nodig voor HTML forms)
app.use(express.urlencoded({ extended: true }));
// Middleware om statische bestanden (zoals je HTML/CSS) te serveren
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

//app.get('/', (req, res) => {
// Ga ervan uit dat de bestanden in een map 'public' staan
// res.sendFile(path.join(__dirname, 'public', 'registerV3.html'));
//});

// 🌐 POST-route voor de registratie van een nieuwe gebruiker
// Let op: De action van je formulier is '/Register2.html'. Pas de route aan op de server.
app.post('/register', async (req, res) => {
    // Haal de gegevens van het formulier (via de 'name' attributen) op
    const { username, email, password, authorizedPerson, authorizedEmail } = req.body;

    const finalAuthPerson = (authorizedPerson && authorizedPerson.trim() !== '') ? authorizedPerson.trim() : null;
    const finalAuthEmail = (authorizedEmail && authorizedEmail.trim() !== '') ? authorizedEmail.trim() : null;

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

// Zorg ervoor dat de root-URL de registratiepagina serveert

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'E-mail en wachtwoord zijn verplicht.' });
    }

    let pool;
    try {
        pool = await sql.connect(config);

        // 1. Zoek de gebruiker op basis van e-mail
        const userResult = await pool.request()
            .input('emailParam', sql.VarChar(100), email)
            .query(`
                SELECT Username, PasswordHash FROM tbl_Users WHERE Email = @emailParam
            `);

        if (userResult.recordset.length === 0) {
            // Gebruiker niet gevonden
            return res.status(401).json({ success: false, message: 'Onjuist e-mailadres of wachtwoord.' });
        }

        const user = userResult.recordset[0];
        // .trim() is belangrijk omdat Char(60) vaste lengte heeft en opgevuld wordt met spaties.
        const storedHash = user.PasswordHash.trim();
        const username = user.Username;

        // 2. Vergelijk het ingevoerde wachtwoord met de opgeslagen hash
        const passwordMatch = await bcrypt.compare(password, storedHash);

        if (passwordMatch) {
            // 3. Succesvol ingelogd!
            console.log(`Gebruiker ${username} is succesvol ingelogd.`);
            res.status(200).json({
                success: true,
                message: 'Inloggen succesvol',
                username: username,
                redirectUrl: 'mvpV3.html'
            });
        } else {
            // Wachtwoord komt niet overeen
            res.status(401).json({ success: false, message: 'Onjuist e-mailadres of wachtwoord.' });
        }

    } catch (err) {
        console.error("Databasefout bij inloggen:", err.message);
        res.status(500).json({ success: false, message: 'Interne serverfout tijdens inloggen.' });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});



app.listen(port, () => {
    console.log(`Server draait op http://localhost:${port}`);
});