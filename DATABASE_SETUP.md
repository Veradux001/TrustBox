# Database Setup Guide

Deze handleiding laat zien hoe je de TrustBox database opzet op Microsoft SQL Server.

**Vereisten:** Microsoft SQL Server moet geïnstalleerd zijn en draaien.

## Inhoudsopgave

1. [Verbinden met SQL Server](#verbinden-met-sql-server)
2. [Databases Aanmaken](#databases-aanmaken)
3. [Tabellen Aanmaken](#tabellen-aanmaken)
4. [Database Gebruikers Instellen](#database-gebruikers-instellen)
5. [Setup Controleren](#setup-controleren)
6. [Database Migrations](#database-migrations)
7. [Onderhoud](#onderhoud)
8. [Troubleshooting](#troubleshooting)

## Verbinden met SQL Server

### Met SQL Server Management Studio (Windows)
- **Server naam:** `localhost` of `.`
- **Authenticatie:** Windows Authentication of SQL Server Authentication
- **Login:** `sa` (als je SQL Server Authentication gebruikt)

### Met sqlcmd (Command Line)
```bash
sqlcmd -S localhost -U sa -P 'JouwWachtwoord' -C
```

**Let op:** De `-C` flag vertrouwt het server certificaat (voor development).

## Databases Aanmaken

TrustBox heeft **twee aparte databases** nodig voor beveiliging:

1. **UserRegistrationDB** - Slaat gebruikersaccounts op met bcrypt-gehashte wachtwoorden
2. **FormSubmissionDB** - Slaat AES-256 versleutelde credentials op

```sql
-- Databases aanmaken
CREATE DATABASE UserRegistrationDB;
GO

CREATE DATABASE FormSubmissionDB;
GO

-- Databases controleren
SELECT name, state_desc FROM sys.databases
WHERE name IN ('UserRegistrationDB', 'FormSubmissionDB');
GO
```

## Tabellen Aanmaken

### User Registration Tabel

```sql
USE UserRegistrationDB;
GO

CREATE TABLE tbl_Users (
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) UNIQUE NOT NULL,
    Email NVARCHAR(100) UNIQUE NOT NULL,
    PasswordHash CHAR(60) NOT NULL,
    AuthorizedPerson NVARCHAR(100),
    AuthorizedEmail NVARCHAR(100),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    LastModified DATETIME2 DEFAULT GETDATE()
);
GO

-- Indexes aanmaken
CREATE INDEX IDX_Users_Email ON tbl_Users(Email);
CREATE INDEX IDX_Users_Username ON tbl_Users(Username);
GO
```

### Form Submission Tabel

```sql
USE FormSubmissionDB;
GO

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
GO

CREATE INDEX IDX_FormSubmission_Domain ON FormSubmission(Domain);
GO
```

**Beveiligingsnotities:**
- De `Password` kolom slaat **AES-256-versleutelde** wachtwoorden op (geen plaintext!)
- Wachtwoorden worden automatisch versleuteld voordat ze in de database komen
- De composite primary key `(UserId, GroupId)` zorgt ervoor dat gebruikers gescheiden blijven
- Elke gebruiker heeft zijn eigen set GroupId-waarden (1, 2, 3...) zonder conflicten

### Optioneel: UserId Validatie Trigger

```sql
USE FormSubmissionDB;
GO

CREATE TRIGGER TR_FormSubmission_ValidateUserId
ON FormSubmission
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @UserId INT, @Username NVARCHAR(50);
    SELECT @UserId = UserId FROM inserted;

    EXEC UserRegistrationDB.dbo.sp_executesql
        N'SELECT @Username = Username FROM tbl_Users WHERE UserId = @UserId',
        N'@UserId INT, @Username NVARCHAR(50) OUTPUT',
        @UserId = @UserId, @Username = @Username OUTPUT;

    IF @Username IS NULL
    BEGIN
        THROW 50001, 'Invalid UserId: User does not exist', 1;
        ROLLBACK TRANSACTION;
    END
END;
GO
```

## Database Gebruikers Instellen

**Gebruik nooit het `sa` account in productie.** Maak een aparte database gebruiker aan:

```sql
-- Login aanmaken
CREATE LOGIN trustbox_app WITH PASSWORD = 'JouwSterkWachtwoord123!';
GO

-- Toegang geven tot UserRegistrationDB
USE UserRegistrationDB;
GO

CREATE USER trustbox_app FOR LOGIN trustbox_app;
ALTER ROLE db_datareader ADD MEMBER trustbox_app;
ALTER ROLE db_datawriter ADD MEMBER trustbox_app;
GO

-- Toegang geven tot FormSubmissionDB
USE FormSubmissionDB;
GO

CREATE USER trustbox_app FOR LOGIN trustbox_app;
ALTER ROLE db_datareader ADD MEMBER trustbox_app;
ALTER ROLE db_datawriter ADD MEMBER trustbox_app;
GO
```

### Applicatie Configuratie Aanpassen

Pas `backend/.env` aan:
```env
DB_USER=trustbox_app
DB_PASSWORD=JouwSterkWachtwoord123!
DB_SERVER=localhost
DB_DATABASE_SUBMISSION=FormSubmissionDB
DB_DATABASE_REGISTER=UserRegistrationDB
```

## Setup Controleren

### Tabellen en Data Checken

```sql
-- Controleer UserRegistrationDB
USE UserRegistrationDB;
GO
SELECT name FROM sys.tables;
SELECT COUNT(*) AS UserCount FROM tbl_Users;
GO

-- Controleer FormSubmissionDB
USE FormSubmissionDB;
GO
SELECT name FROM sys.tables;
SELECT COUNT(*) AS RecordCount FROM FormSubmission;
GO
```

### Test verbinding vanuit de applicatie

Maak een bestand `backend/test-db-connection.js` aan:
```javascript
require('dotenv').config();
const sql = require('mssql');

async function testDatabaseConnection(dbName) {
    const config = {
        user: process.env.DB_USER || 'sa',
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER || 'localhost',
        database: dbName,
        options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
        }
    };

    try {
        console.log(`Testing ${dbName} connection...`);
        const pool = await sql.connect(config);
        console.log(`✅ ${dbName} connection successful!`);

        const result = await pool.request().query('SELECT @@VERSION');
        console.log('SQL Server Version:', result.recordset[0]);

        await pool.close();
        return true;
    } catch (err) {
        console.error(`❌ ${dbName} connection failed:`, err.message);
        return false;
    }
}

async function testAllConnections() {
    console.log('Testing database connections...\n');

    const userDbSuccess = await testDatabaseConnection('UserRegistrationDB');
    console.log('');
    const formDbSuccess = await testDatabaseConnection('FormSubmissionDB');

    if (userDbSuccess && formDbSuccess) {
        console.log('\n✅ All database connections successful!');
        process.exit(0);
    } else {
        console.log('\n❌ Some database connections failed.');
        process.exit(1);
    }
}

testAllConnections();
```

Voer de test uit:
```bash
cd backend
node test-db-connection.js
```

## Database Migrations

Als je een bestaande TrustBox installatie upgrade naar een nieuwere versie, kan het zijn dat je database aanpassingen moet maken.

### Toevoegen van UserId-kolom (voor oude installaties)

Als jouw database nog geen `UserId`-kolom heeft in de `FormSubmission`-tabel:

```sql
USE FormSubmissionDB;
GO

-- Voeg UserId kolom toe
ALTER TABLE FormSubmission ADD UserId INT NULL;
GO

-- Update bestaande records met een geldige UserId
-- Let op: pas de UserId-waarde aan naar jouw eigen gebruiker-ID
UPDATE FormSubmission SET UserId = 1 WHERE UserId IS NULL;
GO

-- Maak kolom verplicht
ALTER TABLE FormSubmission ALTER COLUMN UserId INT NOT NULL;
GO

-- Verwijder oude primary key
ALTER TABLE FormSubmission DROP CONSTRAINT PK_FormSubmission;
GO

-- Voeg nieuwe composite primary key toe
ALTER TABLE FormSubmission ADD CONSTRAINT PK_FormSubmission_UserId_GroupId PRIMARY KEY (UserId, GroupId);
GO

-- Voeg index toe voor betere performance
CREATE INDEX IDX_FormSubmission_UserId ON FormSubmission(UserId);
GO
```

### Controleren van database schema-versie

```sql
-- Check of UserId-kolom bestaat
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'FormSubmission' AND COLUMN_NAME = 'UserId';
GO

-- Check primary key-structuur
SELECT CONSTRAINT_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'FormSubmission';
GO
```

## Onderhoud

### Database Backup

```sql
-- Backup UserRegistrationDB (pas het pad aan voor jouw OS)
BACKUP DATABASE UserRegistrationDB
TO DISK = 'C:\Backups\UserRegistrationDB.bak'
WITH FORMAT, INIT, NAME = 'Full Backup';
GO

-- Backup FormSubmissionDB
BACKUP DATABASE FormSubmissionDB
TO DISK = 'C:\Backups\FormSubmissionDB.bak'
WITH FORMAT, INIT, NAME = 'Full Backup';
GO
```

### Index Onderhoud

```sql
-- Indexes rebuilden
USE UserRegistrationDB;
ALTER INDEX ALL ON tbl_Users REBUILD;
GO

USE FormSubmissionDB;
ALTER INDEX ALL ON FormSubmission REBUILD;
GO

-- Fragmentatie checken
SELECT
    OBJECT_NAME(i.object_id) AS TableName,
    i.name AS IndexName,
    s.avg_fragmentation_in_percent
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') s
JOIN sys.indexes i ON s.object_id = i.object_id AND s.index_id = i.index_id
WHERE s.avg_fragmentation_in_percent > 10;
GO
```

### Statistics Updaten

```sql
USE UserRegistrationDB;
UPDATE STATISTICS tbl_Users;
GO

USE FormSubmissionDB;
UPDATE STATISTICS FormSubmission;
GO
```

## Troubleshooting

### Database Bestaat Niet
```sql
-- Controleer of databases bestaan
SELECT name, state_desc FROM sys.databases
WHERE name IN ('UserRegistrationDB', 'FormSubmissionDB');
GO

-- Aanmaken als ze ontbreken
CREATE DATABASE UserRegistrationDB;
CREATE DATABASE FormSubmissionDB;
GO
```

### Login Mislukt
```sql
-- Controleer of login bestaat en actief is
SELECT name, type_desc, is_disabled FROM sys.server_principals
WHERE name = 'trustbox_app';
GO

-- Activeer als hij uitgeschakeld is
ALTER LOGIN trustbox_app ENABLE;
GO

-- Reset wachtwoord
ALTER LOGIN trustbox_app WITH PASSWORD = 'NieuwWachtwoord123!';
GO
```

### Geen Rechten
```sql
-- Rechten checken
USE UserRegistrationDB;
GO

SELECT dp.name AS UserName, r.name AS RoleName
FROM sys.database_principals dp
LEFT JOIN sys.database_role_members drm ON dp.principal_id = drm.member_principal_id
LEFT JOIN sys.database_principals r ON drm.role_principal_id = r.principal_id
WHERE dp.name = 'trustbox_app';
GO

-- Rechten geven
ALTER ROLE db_datareader ADD MEMBER trustbox_app;
ALTER ROLE db_datawriter ADD MEMBER trustbox_app;
GO
```

### Kan Niet Verbinden
```bash
# Check of SQL Server draait (Linux)
systemctl status mssql-server

# Check of SQL Server draait (Windows)
Get-Service MSSQLSERVER

# Test connectiviteit
sqlcmd -S localhost -U sa -P 'JouwWachtwoord' -Q "SELECT @@VERSION"
```

## Snelle Referentie

```sql
-- Alle databases tonen
SELECT name FROM sys.databases ORDER BY name;

-- Alle tabellen tonen
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';

-- Rijen tellen
SELECT COUNT(*) FROM tbl_Users;
SELECT COUNT(*) FROM FormSubmission;

-- Server versie checken
SELECT @@VERSION;

-- Huidige database checken
SELECT DB_NAME();
```

## Volgende Stappen

1. ✅ Configureer applicatie - Pas `backend/.env` aan
2. ✅ Genereer encryptiesleutel - Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. ✅ Test verbinding - Run `node backend/test-db-connection.js`
4. ✅ Start backend - Run `cd backend && npm start`
5. ✅ Test registratie en login
6. ✅ Test wachtwoord opslag

**Hulp nodig?** Open een issue op de [GitHub repository](https://github.com/Veradux001/TrustBox/issues).
