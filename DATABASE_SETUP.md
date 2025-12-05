# Database Setup Guide

This guide provides SQL commands to set up the TrustBox database schema on Microsoft SQL Server.

**Prerequisites:** Microsoft SQL Server must be installed and running.

## Table of Contents

1. [Connecting to SQL Server](#connecting-to-sql-server)
2. [Creating Databases](#creating-databases)
3. [Creating Tables](#creating-tables)
4. [Setting Up Database Users](#setting-up-database-users)
5. [Verifying the Setup](#verifying-the-setup)
6. [Maintenance](#maintenance)
7. [Troubleshooting](#troubleshooting)

## Connecting to SQL Server

### Using SQL Server Management Studio (Windows)
- **Server name:** `localhost` or `.`
- **Authentication:** Windows Authentication or SQL Server Authentication
- **Login:** `sa` (if using SQL Server Authentication)

### Using sqlcmd (Command Line)
```bash
sqlcmd -S localhost -U sa -P 'YourPassword' -C
```

**Note:** The `-C` flag trusts the server certificate (for development).

## Creating Databases

TrustBox requires **two separate databases** for security isolation:

1. **UserRegistrationDB** - Stores user accounts with bcrypt-hashed passwords
2. **FormSubmissionDB** - Stores AES-256 encrypted credentials

```sql
-- Create databases
CREATE DATABASE UserRegistrationDB;
GO

CREATE DATABASE FormSubmissionDB;
GO

-- Verify databases
SELECT name, state_desc FROM sys.databases
WHERE name IN ('UserRegistrationDB', 'FormSubmissionDB');
GO
```

## Creating Tables

### User Registration Table

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

-- Create indexes
CREATE INDEX IDX_Users_Email ON tbl_Users(Email);
CREATE INDEX IDX_Users_Username ON tbl_Users(Username);
GO
```

### Form Submission Table

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

**Security Notes:**
- The `Password` column stores **AES-256 encrypted** passwords
- The composite primary key `(UserId, GroupId)` provides user isolation
- Each user has their own set of GroupId values (1, 2, 3...) without conflicts

### Optional: UserId Validation Trigger

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

## Setting Up Database Users

**Never use the `sa` account in production.** Create a dedicated database user:

```sql
-- Create login
CREATE LOGIN trustbox_app WITH PASSWORD = 'YourStrongPassword123!';
GO

-- Grant access to UserRegistrationDB
USE UserRegistrationDB;
GO

CREATE USER trustbox_app FOR LOGIN trustbox_app;
ALTER ROLE db_datareader ADD MEMBER trustbox_app;
ALTER ROLE db_datawriter ADD MEMBER trustbox_app;
GO

-- Grant access to FormSubmissionDB
USE FormSubmissionDB;
GO

CREATE USER trustbox_app FOR LOGIN trustbox_app;
ALTER ROLE db_datareader ADD MEMBER trustbox_app;
ALTER ROLE db_datawriter ADD MEMBER trustbox_app;
GO
```

### Update Application Configuration

Update `backend/.env`:
```env
DB_USER=trustbox_app
DB_PASSWORD=YourStrongPassword123!
DB_SERVER=localhost
DB_DATABASE_SUBMISSION=FormSubmissionDB
DB_DATABASE_REGISTER=UserRegistrationDB
```

## Verifying the Setup

### Check Tables and Data

```sql
-- Check UserRegistrationDB
USE UserRegistrationDB;
GO
SELECT name FROM sys.tables;
SELECT COUNT(*) AS UserCount FROM tbl_Users;
GO

-- Check FormSubmissionDB
USE FormSubmissionDB;
GO
SELECT name FROM sys.tables;
SELECT COUNT(*) AS RecordCount FROM FormSubmission;
GO
```

### Test Connection from Application

Create `backend/test-db-connection.js`:
```javascript
require('dotenv').config();
const sql = require('mssql');

const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost',
    database: 'UserRegistrationDB',
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
};

async function testConnection() {
    try {
        console.log('Testing connection...');
        const pool = await sql.connect(config);
        console.log('✅ Connection successful!');

        const result = await pool.request().query('SELECT @@VERSION');
        console.log('SQL Server Version:', result.recordset[0]);

        await pool.close();
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
        process.exit(1);
    }
}

testConnection();
```

Run the test:
```bash
cd backend
node test-db-connection.js
```

## Maintenance

### Database Backup

```sql
-- Backup UserRegistrationDB (adjust path for your OS)
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

### Index Maintenance

```sql
-- Rebuild indexes
USE UserRegistrationDB;
ALTER INDEX ALL ON tbl_Users REBUILD;
GO

USE FormSubmissionDB;
ALTER INDEX ALL ON FormSubmission REBUILD;
GO

-- Check fragmentation
SELECT
    OBJECT_NAME(i.object_id) AS TableName,
    i.name AS IndexName,
    s.avg_fragmentation_in_percent
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') s
JOIN sys.indexes i ON s.object_id = i.object_id AND s.index_id = i.index_id
WHERE s.avg_fragmentation_in_percent > 10;
GO
```

### Update Statistics

```sql
USE UserRegistrationDB;
UPDATE STATISTICS tbl_Users;
GO

USE FormSubmissionDB;
UPDATE STATISTICS FormSubmission;
GO
```

## Troubleshooting

### Database Does Not Exist
```sql
-- Check if databases exist
SELECT name, state_desc FROM sys.databases
WHERE name IN ('UserRegistrationDB', 'FormSubmissionDB');
GO

-- Create if missing
CREATE DATABASE UserRegistrationDB;
CREATE DATABASE FormSubmissionDB;
GO
```

### Login Failed
```sql
-- Check if login exists and is enabled
SELECT name, type_desc, is_disabled FROM sys.server_principals
WHERE name = 'trustbox_app';
GO

-- Enable if disabled
ALTER LOGIN trustbox_app ENABLE;
GO

-- Reset password
ALTER LOGIN trustbox_app WITH PASSWORD = 'NewPassword123!';
GO
```

### Permission Denied
```sql
-- Check permissions
USE UserRegistrationDB;
GO

SELECT dp.name AS UserName, r.name AS RoleName
FROM sys.database_principals dp
LEFT JOIN sys.database_role_members drm ON dp.principal_id = drm.member_principal_id
LEFT JOIN sys.database_principals r ON drm.role_principal_id = r.principal_id
WHERE dp.name = 'trustbox_app';
GO

-- Grant permissions
ALTER ROLE db_datareader ADD MEMBER trustbox_app;
ALTER ROLE db_datawriter ADD MEMBER trustbox_app;
GO
```

### Cannot Connect
```bash
# Check if SQL Server is running (Linux)
systemctl status mssql-server

# Check if SQL Server is running (Windows)
Get-Service MSSQLSERVER

# Test connectivity
sqlcmd -S localhost -U sa -P 'YourPassword' -Q "SELECT @@VERSION"
```

## Quick Reference

```sql
-- List all databases
SELECT name FROM sys.databases ORDER BY name;

-- List all tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';

-- Count rows
SELECT COUNT(*) FROM tbl_Users;
SELECT COUNT(*) FROM FormSubmission;

-- Check server version
SELECT @@VERSION;

-- Check current database
SELECT DB_NAME();
```

## Next Steps

1. ✅ Configure application - Update `backend/.env`
2. ✅ Generate encryption key - Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. ✅ Test connection - Run `node backend/test-db-connection.js`
4. ✅ Start backend - Run `cd backend && npm start`
5. ✅ Test registration and login
6. ✅ Test password storage

**Need help?** Open an issue on the [GitHub repository](https://github.com/Veradux001/TrustBox/issues).
