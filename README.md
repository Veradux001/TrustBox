# TrustBox

<div align="center">
  <img src="trustbox-logo.png" alt="TrustBox Logo" width="200"/>
  <p><strong>Een veilige, versleutelde wachtwoordbeheerder</strong></p>
  <p>
    <a href="https://trustbox.diemitchell.com">🌐 Live Demo</a> •
    <a href="https://trustbox.diemitchell.com/api">📡 API</a> •
    <a href="LICENSE">📄 Licentie</a>
  </p>
</div>

---

## 🔐 Over TrustBox

TrustBox is een moderne wachtwoordbeheerder die je inloggegevens veilig opslaat met AES-256 encryptie. De applicatie is gemaakt met Node.js en Express, en heeft een gebruiksvriendelijke interface voor het beheren van je wachtwoorden.

**Live Applicatie:** [https://trustbox.diemitchell.com](https://trustbox.diemitchell.com)

---

## ✨ Belangrijkste Functies

- 🔒 **AES-256-CBC Encryptie** - Sterke encryptie voor alle wachtwoorden
- 🔐 **Bcrypt Authenticatie** - Veilige wachtwoordhashing met 12 salt rounds
- 👤 **Gebruikersbeheer** - Registratie, login en sessie management
- 📁 **Georganiseerde Opslag** - Wachtwoorden beheren per categorie
- 🛡️ **Beveiligde API** - Bescherming tegen SQL injection en XSS
- 🌐 **HTTPS Verplicht** - Alleen versleutelde verbindingen toegestaan

---

## 🛠 Technologie Stack

- **Backend:** Node.js + Express.js
- **Database:** Microsoft SQL Server
- **Authenticatie:** Bcrypt
- **Encryptie:** AES-256-CBC (Node.js Crypto)
- **Frontend:** HTML5, CSS3, Vanilla JavaScript

---

## 📦 Snelle Start

### Vereisten
- Node.js v16 of hoger
- Microsoft SQL Server
- npm package manager

### Installatie

1. **Clone de repository**
```bash
git clone https://github.com/Veradux001/TrustBox.git
cd TrustBox
```

2. **Installeer dependencies**
```bash
cd backend
npm install
```

3. **Configureer omgeving**
```bash
cp .env.example .env
```

Pas `.env` aan met jouw database gegevens:
```env
DB_USER=jouw_gebruikersnaam
DB_PASSWORD=jouw_wachtwoord
DB_SERVER=localhost
DB_DATABASE_SUBMISSION=FormSubmissionDB
DB_DATABASE_REGISTER=UserRegistrationDB
PORT=3000
ENCRYPTION_KEY=jouw_32_byte_hex_key
```

4. **Genereer een encryptiesleutel**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

5. **Database setup**

📚 **Zie de [Database Setup Guide](DATABASE_SETUP.md)** voor volledige instructies.

**Snelle setup:** Maak twee databases (`FormSubmissionDB` en `UserRegistrationDB`) en voer de schema's uit zoals beschreven in de guide.

6. **Start de server**
```bash
npm start
```

7. **Open de applicatie**
```
http://localhost:3000
```

---

## 🔒 Beveiliging

TrustBox gebruikt meerdere beveiligingslagen:

- **AES-256-CBC** encryptie voor opgeslagen wachtwoorden
- **Bcrypt hashing** voor gebruikerswachtwoorden (12 salt rounds)
- **Geparametriseerde SQL queries** tegen SQL injection
- **Input validatie** op alle invoer
- **CORS whitelist** voor toegangscontrole
- **HTTPS verplicht** voor veilige verbindingen

### Wachtwoordvereisten
- Minimaal 8 tekens
- Moet hoofdletters, kleine letters, cijfers en speciale tekens bevatten

---

## 📡 API Endpoints

Base URL: `https://trustbox.diemitchell.com/api`

### Wachtwoordbeheer
- `GET /getData` - Alle wachtwoorden ophalen (gedecrypteerd)
- `POST /saveData` - Nieuw wachtwoord opslaan
- `PUT /data/:groupId` - Wachtwoord bijwerken
- `DELETE /data/:groupId` - Wachtwoord verwijderen

### Gebruikersbeheer
- `POST /register` - Nieuwe gebruiker registreren
- `POST /login` - Gebruiker inloggen

Voor gedetailleerde API documentatie, zie [DATABASE_SETUP.md](DATABASE_SETUP.md).

---

## 📁 Projectstructuur

```
TrustBox/
├── backend/              # Node.js backend
│   ├── serverV2.js      # Hoofd API server
│   ├── package.json     # Dependencies
│   └── .env.example     # Configuratie voorbeeld
├── mvpV3.html           # Dashboard
├── loginV3.html         # Inlogpagina
├── registerV3.html      # Registratiepagina
├── *.js                 # Frontend scripts
├── *.css                # Styling
└── DATABASE_SETUP.md    # Database instructies
```

---

## 💻 Ontwikkeling

### Development server
```bash
cd backend
npm run dev  # Start met auto-reload
```

### Beschikbare scripts
```bash
npm start       # Productieserver
npm run dev     # Development server
```

### Code Guidelines
- Gebruik ES6+ JavaScript
- Async/await voor asynchrone code
- Altijd try-catch voor error handling
- Geparametriseerde SQL queries zijn verplicht
- Input validatie op de server

---

## 🤝 Bijdragen

Bijdragen zijn welkom! Doe dit als volgt:

1. Fork de repository
2. Maak een feature branch (`git checkout -b feature/nieuwe-functie`)
3. Commit je aanpassingen (`git commit -m 'Voeg nieuwe functie toe'`)
4. Push naar de branch (`git push origin feature/nieuwe-functie`)
5. Open een Pull Request

---

## 📝 Licentie

Dit project is gelicentieerd onder de MIT Licentie - zie het [LICENSE](LICENSE) bestand voor details.

**Copyright © 2025 Veradux001**

---

## 📚 Aanvullende Documentatie

- [Database Setup Guide](DATABASE_SETUP.md) - Volledige database installatie instructies
- [Deployment Guide](DEPLOYMENT.md) - Productie deployment
- [Nginx Configuration](NGINX_FIX.md) - Reverse proxy setup
- [Troubleshooting](TROUBLESHOOTING.md) - Veelvoorkomende problemen

---

## 🔗 Links

- **Live Applicatie:** [https://trustbox.diemitchell.com](https://trustbox.diemitchell.com)
- **GitHub Repository:** [https://github.com/Veradux001/TrustBox](https://github.com/Veradux001/TrustBox)
- **Issues:** [GitHub Issues](https://github.com/Veradux001/TrustBox/issues)

---

## ⚠️ Disclaimer

TrustBox is een educatief project. Voor gebruik in productie:
- ✅ Gebruik sterke, unieke encryptiesleutels
- ✅ Installeer HTTPS/SSL certificaten
- ✅ Configureer firewall rules
- ✅ Doe regelmatig security audits
- ✅ Maak back-ups van de database
- ✅ Houd dependencies up-to-date

---

<div align="center">
  <p>Gemaakt met ❤️ door het TrustBox Team</p>
  <p><strong>Beveilig je digitale leven met TrustBox</strong></p>
</div>
