# TrustBox Troubleshooting Guide

## Error: "Fout bij opslaan: Fout bij het opslaan van data op de server"

This error occurs when trying to save a new login. Here's how to diagnose and fix it.

### Step 1: Check Server Logs

The improved error logging will show you exactly what's wrong. Check your server logs:

```bash
# If using PM2
pm2 logs trustbox

# If using systemd
sudo journalctl -u trustbox.service -f

# If running directly
# Look at the terminal where node is running
```

Look for one of these error messages:

### Possible Cause 1: CORS Issue

**Error in logs:**
```
CORS geblokkeerd voor origin: https://trustbox.diemitchell.com
Toegestane origins zijn: http://localhost:3000
```

**What it means:** Your production domain is not in the allowed origins list.

**Fix:**
1. Edit your production server's `.env` file:
   ```bash
   sudo nano /path/to/TrustBox/backend/.env
   ```

2. Add or update the `ALLOWED_ORIGINS` line:
   ```
   ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://trustbox.diemitchell.com
   ```

3. Restart the Node.js server:
   ```bash
   # If using PM2
   pm2 restart trustbox

   # If using systemd
   sudo systemctl restart trustbox.service
   ```

### Possible Cause 2: Missing or Invalid ENCRYPTION_KEY

**Error in logs:**
```
Encryptie fout bij opslag: ...
ENCRYPTION_KEY is niet ingesteld in omgevingsvariabelen
```
or
```
ENCRYPTION_KEY moet exact 32 bytes (64 hex karakters) zijn
```

**What it means:** The encryption key is missing or has the wrong format.

**Fix:**
1. Generate a new encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Copy the output (should be 64 hex characters)

3. Add it to your `.env` file:
   ```
   ENCRYPTION_KEY=your_64_character_hex_key_here
   ```

4. Restart the server (see commands above)

### Possible Cause 3: Database Connection Issue

**Error in logs:**
```
Database pool is niet beschikbaar bij saveData request
```
or
```
FATALE FOUT: Databaseverbinding is mislukt
```

**What it means:** The server cannot connect to the SQL Server database.

**Fix:**
1. Check database credentials in `.env`:
   ```
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   DB_SERVER=your_database_server_ip
   DB_DATABASE_SUBMISSION=your_submission_database_name
   DB_ENCRYPT=false
   DB_TRUST_SERVER_CERTIFICATE=true
   ```

2. Test database connectivity:
   ```bash
   # From the server, try to ping the database server
   ping your_database_server_ip

   # Try to connect using sqlcmd (if installed)
   sqlcmd -S your_database_server_ip -U your_database_user -P your_database_password
   ```

3. Check firewall rules:
   - Ensure port 1433 (SQL Server) is open
   - Ensure the database server allows connections from your web server's IP

4. Restart the server after fixing credentials

### Possible Cause 4: Duplicate GroupId

**Error in logs:**
```
Er bestaat al een record met dit GroupId
```

**What it means:** You're trying to save a login with a GroupId that already exists in the database.

**Fix:**
Use the "Bijwerken" (Update) button instead of "Opslaan" (Save) to update an existing record, or delete the old record first.

### Possible Cause 5: Database Schema Issue

**Error in logs:**
```
Invalid column name ...
```
or
```
Cannot insert the value NULL into column ...
```

**What it means:** The database table structure doesn't match what the code expects.

**Fix:**
Ensure your `FormSubmission` table has these columns (including the new `UserId` column for security):
```sql
CREATE TABLE FormSubmission (
    GroupId INT PRIMARY KEY,
    UserId INT NOT NULL,
    Username NVARCHAR(255) NOT NULL,
    Password NVARCHAR(MAX) NOT NULL,
    Domain NVARCHAR(255) NOT NULL,
    FOREIGN KEY (UserId) REFERENCES tbl_Users(UserId)
);
```

If you're upgrading from an older version without `UserId`:
```sql
-- Stap 1: Voeg UserId kolom toe als nullable
ALTER TABLE FormSubmission ADD UserId INT NULL;

-- Stap 2: Update bestaande records met een geldige UserId
-- BELANGRIJK: Pas deze query aan voor jouw situatie
UPDATE FormSubmission SET UserId = 1 WHERE UserId IS NULL;

-- Stap 3: Maak kolom NOT NULL nadat alle records zijn bijgewerkt
ALTER TABLE FormSubmission ALTER COLUMN UserId INT NOT NULL;

-- Stap 4: Voeg foreign key constraint toe
ALTER TABLE FormSubmission
ADD CONSTRAINT FK_FormSubmission_User
FOREIGN KEY (UserId) REFERENCES tbl_Users(UserId);

-- Stap 5: Voeg database index toe voor betere query performance
CREATE INDEX IDX_FormSubmission_UserId ON FormSubmission(UserId);
```

### Quick Checklist

Use this checklist to diagnose the issue:

- [ ] Check server logs for specific error messages
- [ ] Verify `ALLOWED_ORIGINS` includes `https://trustbox.diemitchell.com`
- [ ] Verify `ENCRYPTION_KEY` exists and is 64 hex characters
- [ ] Verify database connection credentials are correct
- [ ] Verify the server can reach the database server
- [ ] Restart the Node.js server after making changes
- [ ] Clear browser cache and try again

### Testing After Fix

After applying a fix, test with curl:

```bash
# Test that the server is running and CORS is working
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

Expected responses:
- **Success:** `{"message":"Data voor Groep 999 succesvol opgeslagen..."}`
- **CORS Error:** No response or CORS-related error
- **Database Error:** `{"message":"Database niet beschikbaar..."}`
- **Duplicate:** `{"message":"Er bestaat al een record met dit GroupId..."}`

### Still Having Issues?

If none of the above fixes work:

1. Enable debug mode in Node.js:
   ```bash
   DEBUG=* node backend/serverV2.js
   ```

2. Check Nginx error logs (if using Nginx):
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. Verify the correct server file is running:
   ```bash
   # Check process list
   ps aux | grep node

   # You should see "serverV2.js", NOT "InsertRegistration.js"
   ```

4. Check browser console for additional error details:
   - Open Developer Tools (F12)
   - Go to Console tab
   - Try saving again and note any CORS or network errors
