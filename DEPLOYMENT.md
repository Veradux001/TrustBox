# Deployment Handleiding

## Belangrijk: Gebruik serverV2.js

De productieserver **moet** `serverV2.js` draaien, want die heeft alle API endpoints:
- `/login` - Gebruiker authenticatie
- `/register` - Gebruiker registratie
- `/getData` - Wachtwoorden ophalen
- `/saveData` - Wachtwoorden opslaan
- `/data/:groupId` - Wachtwoorden bijwerken/verwijderen

**GEBRUIK GEEN `InsertRegistration.js`** - dit is een oud bestand met alleen het `/register` endpoint.

## Startup-commando's

### Met npm (aanbevolen)
```bash
cd backend
npm start
```

### Met nodemon voor development
```bash
cd backend
npm run dev
```

### Direct node commando
```bash
cd backend
node serverV2.js
```

## Docker/Container Setup

Zorg dat jouw startup-commando `serverV2.js` gebruikt:

```bash
cd /usr/src/app && npm install && node serverV2.js
```

Voor development met nodemon:
```bash
cd /usr/src/app && npm install && npx nodemon --legacy-watch serverV2.js
```

## Server Controleren

Test of alle endpoints werken:

```bash
# Test login endpoint
curl -X POST https://trustbox.diemitchell.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# Zou een authentication error moeten geven, NIET "Cannot POST /login"
```

## Troubleshooting

**Probleem:** Je krijgt "Cannot POST /login"-error
**Oorzaak:** Server draait `InsertRegistration.js` in plaats van `serverV2.js`
**Oplossing:** Verander het startup-commando naar `serverV2.js` en herstart

**Probleem:** Endpoints werken lokaal maar niet in productie
**Oorzaak:** Productieserver is niet herstart na code-update
**Oplossing:** Herstart het Node.js-proces (pm2 restart, systemctl restart, etc.)
