# Troubleshooting Guide

## Error: "Fout bij opslaan: Fout bij het opslaan van data op de server"

This error occurs when trying to save a new login. Check server logs to diagnose:

```bash
# If using PM2
pm2 logs trustbox

# If using systemd
sudo journalctl -u trustbox.service -f
```

## Common Issues

### Issue 1: CORS Error

**Error in logs:**
```
CORS geblokkeerd voor origin: https://trustbox.diemitchell.com
```

**Fix:**
1. Edit `backend/.env`:
   ```
   ALLOWED_ORIGINS=http://localhost:3000,https://trustbox.diemitchell.com
   ```

2. Restart the server:
   ```bash
   pm2 restart trustbox
   # or
   sudo systemctl restart trustbox.service
   ```

### Issue 2: Missing or Invalid Encryption Key

**Error in logs:**
```
ENCRYPTION_KEY is niet ingesteld in omgevingsvariabelen
```

**Fix:**
1. Generate a new key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Add to `backend/.env`:
   ```
   ENCRYPTION_KEY=your_64_character_hex_key_here
   ```

3. Restart the server

### Issue 3: Database Connection Error

**Error in logs:**
```
Database pool is niet beschikbaar
```
or
```
FATALE FOUT: Databaseverbinding is mislukt
```

**Fix:**
1. Check database credentials in `backend/.env`:
   ```
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   DB_SERVER=your_database_server_ip
   DB_DATABASE_SUBMISSION=FormSubmissionDB
   DB_DATABASE_REGISTER=UserRegistrationDB
   DB_ENCRYPT=false
   DB_TRUST_SERVER_CERTIFICATE=true
   ```

2. Test database connectivity:
   ```bash
   # Ping database server
   ping your_database_server_ip

   # Try to connect
   sqlcmd -S your_database_server_ip -U your_database_user -P your_database_password
   ```

3. Check firewall rules (port 1433 must be open)

4. Restart the server

### Issue 4: Duplicate GroupId

**Error in logs:**
```
Er bestaat al een record met dit GroupId
```

**Fix:**
Use the "Bijwerken" (Update) button instead of "Opslaan" (Save) to update an existing record, or delete the old record first.

### Issue 5: Database Schema Mismatch

**Error in logs:**
```
Invalid column name ...
```
or
```
Cannot insert the value NULL into column ...
```

**Fix:**
Ensure your `FormSubmission` table has the correct structure:
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

If upgrading from an older version without `UserId`:
```sql
-- Add UserId column
ALTER TABLE FormSubmission ADD UserId INT NULL;

-- Update existing records with a valid UserId
UPDATE FormSubmission SET UserId = 1 WHERE UserId IS NULL;

-- Make column NOT NULL
ALTER TABLE FormSubmission ALTER COLUMN UserId INT NOT NULL;

-- Add index
CREATE INDEX IDX_FormSubmission_UserId ON FormSubmission(UserId);
```

## Quick Diagnostic Checklist

- [ ] Check server logs for specific error messages
- [ ] Verify `ALLOWED_ORIGINS` includes your production domain
- [ ] Verify `ENCRYPTION_KEY` exists and is 64 hex characters
- [ ] Verify database connection credentials are correct
- [ ] Verify the server can reach the database server
- [ ] Restart the Node.js server after making changes
- [ ] Clear browser cache and try again

## Testing After Fix

Test with curl:

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

**Expected responses:**
- **Success:** `{"message":"Data voor Groep 999 succesvol opgeslagen..."}`
- **CORS Error:** No response or CORS-related error
- **Database Error:** `{"message":"Database niet beschikbaar..."}`
- **Duplicate:** `{"message":"Er bestaat al een record met dit GroupId..."}`

## Still Having Issues?

1. **Enable debug mode:**
   ```bash
   DEBUG=* node backend/serverV2.js
   ```

2. **Check Nginx error logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Verify correct server file:**
   ```bash
   ps aux | grep node
   # Should show "serverV2.js", NOT "InsertRegistration.js"
   ```

4. **Check browser console:**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Try saving again and note any errors
