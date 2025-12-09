# Troubleshooting Handleiding

## Error: "Fout bij opslaan: Fout bij het opslaan van data op de server"

Deze error gebeurt als je een nieuwe login probeert op te slaan. Check de serverlogs om te kijken wat er mis gaat:

```bash
# Als je PM2 gebruikt
pm2 logs trustbox

# Als je systemd gebruikt
sudo journalctl -u trustbox.service -f
```

## Veelvoorkomende Problemen

### Probleem 1: CORS Error

**Error in logs:**
```
CORS geblokkeerd voor origin: https://trustbox.diemitchell.com
```

**Oplossing:**
1. Pas `backend/.env` aan:
   ```
   ALLOWED_ORIGINS=http://localhost:3000,https://trustbox.diemitchell.com
   ```

2. Herstart de server:
   ```bash
   pm2 restart trustbox
   # of
   sudo systemctl restart trustbox.service
   ```

### Probleem 2: Encryptiesleutel ontbreekt of is fout

**Error in logs:**
```
ENCRYPTION_KEY is niet ingesteld in omgevingsvariabelen
```

**Oplossing:**
1. Genereer een nieuwe key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Voeg toe aan `backend/.env`:
   ```
   ENCRYPTION_KEY=jouw_64_character_hex_key_hier
   ```

3. Herstart de server

### Probleem 3: Database-verbindingsfout

**Error in logs:**
```
Database pool is niet beschikbaar
```
of
```
FATALE FOUT: Databaseverbinding is mislukt
```

**Oplossing:**
1. Check database-credentials in `backend/.env`:
   ```
   DB_USER=jouw_database_gebruiker
   DB_PASSWORD=jouw_database_wachtwoord
   DB_SERVER=jouw_database_server_ip
   DB_DATABASE_SUBMISSION=FormSubmissionDB
   DB_DATABASE_REGISTER=UserRegistrationDB
   DB_ENCRYPT=false
   DB_TRUST_SERVER_CERTIFICATE=true
   ```

2. Test database-connectiviteit:
   ```bash
   # Ping database server
   ping jouw_database_server_ip

   # Probeer te verbinden
   sqlcmd -S jouw_database_server_ip -U jouw_database_gebruiker -P jouw_database_wachtwoord
   ```

3. Check firewall-regels (poort 1433 moet open zijn)

4. Herstart de server

### Probleem 4: Dubbele GroupId

**Error in logs:**
```
Er bestaat al een record met dit GroupId
```

**Oplossing:**
Gebruik de "Bijwerken" knop in plaats van "Opslaan" om een bestaand record te updaten, of verwijder eerst het oude record.

### Probleem 5: Database-schema klopt niet

**Error in logs:**
```
Invalid column name ...
```
of
```
Cannot insert the value NULL into column ...
```

**Oplossing:**
Zorg dat jouw `FormSubmission`-tabel de juiste structuur heeft:
```sql
CREATE TABLE FormSubmission (
    UserId INT NOT NULL,
    GroupId INT NOT NULL,
    Username NVARCHAR(255) NOT NULL,
    Password NVARCHAR(MAX) NOT NULL,
    Domain NVARCHAR(255) NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    LastModified DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT PK_FormSubmission_UserId_GroupId PRIMARY KEY (UserId, GroupId)
);
```

Als je upgrade van een oudere versie zonder `UserId`:
```sql
-- Voeg UserId kolom toe
ALTER TABLE FormSubmission ADD UserId INT NULL;

-- Update bestaande records met een geldige UserId
UPDATE FormSubmission SET UserId = 1 WHERE UserId IS NULL;

-- Maak kolom verplicht
ALTER TABLE FormSubmission ALTER COLUMN UserId INT NOT NULL;

-- Voeg index toe
CREATE INDEX IDX_FormSubmission_UserId ON FormSubmission(UserId);
```

## Snelle Diagnostiek Checklist

- [ ] Check serverlogs voor specifieke error-berichten
- [ ] Controleer of `ALLOWED_ORIGINS` jouw productiedomein bevat
- [ ] Controleer of `ENCRYPTION_KEY` bestaat en 64 hex-characters is
- [ ] Controleer of database-credentials kloppen
- [ ] Controleer of de server de databaseserver kan bereiken
- [ ] Herstart de Node.js-server na wijzigingen
- [ ] Clear browsercache en probeer opnieuw

## Testen na fix

Test met curl:

```bash
curl -X POST https://trustbox.diemitchell.com/api/saveData \
  -H "Content-Type: application/json" \
  -H "Origin: https://trustbox.diemitchell.com" \
  -d '{
    "GroupId": 999,
    "Username": "testuser",
    "Password": "testpass",
    "Domain": "testdomain.com"
  }'
```

**Verwachte responses:**
- **Success:** `{"message":"Data voor Groep 999 succesvol opgeslagen..."}`
- **CORS-error:** Geen response of CORS-gerelateerde error
- **Database-error:** `{"message":"Database niet beschikbaar..."}`
- **Duplicate:** `{"message":"Er bestaat al een record met dit GroupId..."}`

## Nog steeds problemen?

1. **Zet debug-mode aan:**
   ```bash
   DEBUG=* node backend/serverV2.js
   ```

2. **Check Nginx error-logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Controleer of het juiste server bestand draait:**
   ```bash
   ps aux | grep node
   # Zou "serverV2.js" moeten tonen, NIET "InsertRegistration.js"
   ```

4. **Check browser-console:**
   - Open Developer Tools (F12)
   - Ga naar Console-tab
   - Probeer opnieuw op te slaan en kijk naar errors
