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

TrustBox is een moderne, veilige wachtwoordbeheerder die uw gevoelige inloggegevens beschermt met AES-256 versleuteling. Ontwikkeld met Node.js en Express, biedt TrustBox een gebruiksvriendelijke interface voor het veilig opslaan en beheren van wachtwoorden.

**Live Applicatie:** [https://trustbox.diemitchell.com](https://trustbox.diemitchell.com)

---

## ✨ Belangrijkste Functies

- 🔒 **AES-256-CBC Versleuteling** - Militaire-graad encryptie voor alle wachtwoorden
- 🔐 **Bcrypt Authenticatie** - Veilige wachtwoordhashing met 12 salt rounds
- 👤 **Gebruikersbeheer** - Registratie, login en sessie management
- 📁 **Georganiseerde Opslag** - Beheer wachtwoorden in categorieën
- 🛡️ **Beveiligde API** - SQL injection en XSS bescherming
- 🌐 **HTTPS Enforcement** - Versleutelde verbindingen vereist

---

## 🛠 Technologie Stack

- **Backend:** Node.js + Express.js
- **Database:** Microsoft SQL Server
- **Authenticatie:** Bcrypt
- **Versleuteling:** AES-256-CBC (Node.js Crypto)
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

Bewerk `.env` met je database gegevens:
```env
DB_USER=your_username
DB_PASSWORD=your_password
DB_SERVER=localhost
DB_DATABASE_SUBMISSION=FormSubmissionDB
DB_DATABASE_REGISTER=UserRegistrationDB
PORT=3000
ENCRYPTION_KEY=your_32_byte_hex_key
```

4. **Genereer encryptiesleutel**
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

TrustBox implementeert meerdere beveiligingslagen:

- **AES-256-CBC** versleuteling voor wachtwoordopslag
- **Bcrypt hashing** voor gebruikerswachtwoorden (12 salt rounds)
- **Geparametriseerde SQL queries** tegen SQL injection
- **Input validatie** op alle invoervelden
- **CORS whitelist** voor toegangscontrole
- **HTTPS enforcement** voor veilige verbindingen

### Wachtwoordvereisten
- Minimum 8 tekens
- Hoofdletters, kleine letters, cijfers en speciale tekens vereist

---

## 📡 API Endpoints

Base URL: `https://trustbox.diemitchell.com/api`

### Wachtwoordbeheer
- `GET /getData` - Haal alle wachtwoorden op (gedecrypteerd)
- `POST /saveData` - Sla nieuw wachtwoord op
- `PUT /data/:groupId` - Update wachtwoord
- `DELETE /data/:groupId` - Verwijder wachtwoord

### Gebruikersbeheer
- `POST /register` - Registreer nieuwe gebruiker
- `POST /login` - Log in gebruiker

Voor gedetailleerde API documentatie, zie [DATABASE_SETUP.md](DATABASE_SETUP.md).

---

## 📁 Projectstructuur

```
TrustBox/
├── backend/              # Node.js Backend
│   ├── serverV2.js      # Hoofd API server
│   ├── package.json     # Dependencies
│   └── .env.example     # Configuratie template
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
npm start       # Productie server
npm run dev     # Development server
```

### Code Guidelines
- Gebruik ES6+ JavaScript
- Async/await voor asynchrone code
- Altijd try-catch error handling
- Geparametriseerde SQL queries verplicht
- Input validatie server-side

---

## 🤝 Bijdragen

Bijdragen zijn welkom! Volg deze stappen:

1. Fork de repository
2. Maak een feature branch (`git checkout -b feature/nieuwe-functie`)
3. Commit je wijzigingen (`git commit -m 'Voeg nieuwe functie toe'`)
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

TrustBox is een educatief project. Voor productiegebruik:
- ✅ Gebruik sterke, unieke encryptiesleutels
- ✅ Implementeer HTTPS/SSL certificaten
- ✅ Configureer firewall regels
- ✅ Voer regelmatige security audits uit
- ✅ Maak back-ups van je database
- ✅ Houd dependencies up-to-date

---

<div align="center">
  <p>Gemaakt met ❤️ door het TrustBox Team</p>
  <p><strong>Beveilig je digitale leven met TrustBox</strong></p>
</div>
