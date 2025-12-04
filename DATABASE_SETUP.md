# MSSQL Server Database Setup Guide - TrustBox

This guide provides SQL commands to set up the TrustBox database schema on an existing Microsoft SQL Server installation.

**Prerequisites:** Microsoft SQL Server must be installed and running on your system.

---

## Table of Contents

1. [Connecting to SQL Server](#connecting-to-sql-server)
2. [Creating Databases](#creating-databases)
3. [Creating Tables](#creating-tables)
4. [Setting Up Database Users](#setting-up-database-users)
5. [Verifying the Setup](#verifying-the-setup)
6. [User Isolation & Security](#user-isolation--security)
7. [Maintenance & Backup](#maintenance--backup)
8. [Troubleshooting](#troubleshooting)

---

## Connecting to SQL Server

### Using SQL Server Management Studio (SSMS) - Windows

1. Launch SQL Server Management Studio (SSMS)
2. Connect to your SQL Server instance:
   - **Server name:** `localhost` or `.` (for local default instance)
   - **Authentication:** Windows Authentication or SQL Server Authentication
   - **Login:** `sa` (if using SQL Server Authentication)

### Using sqlcmd - Linux/Windows Command Line

```bash
# Connect to SQL Server
sqlcmd -S localhost -U sa -P 'YourPassword' -C

# You should see: 1>
```

**Note:** Replace `YourPassword` with your actual SA password. The `-C` flag trusts the server certificate (for development).

---

## Creating Databases

TrustBox requires **two separate databases** for security isolation:

1. **UserRegistrationDB** - Stores user accounts with bcrypt-hashed passwords
2. **FormSubmissionDB** - Stores AES-256 encrypted credentials

### SQL Commands

```sql
-- Create UserRegistrationDB
CREATE DATABASE UserRegistrationDB;
GO

-- Create FormSubmissionDB
CREATE DATABASE FormSubmissionDB;
GO

-- Verify databases were created
SELECT name, database_id, create_date, state_desc
FROM sys.databases
WHERE name IN ('UserRegistrationDB', 'FormSubmissionDB');
GO
```

**Expected Output:**
```
name                  database_id  create_date              state_desc
UserRegistrationDB    5            2025-12-04 10:30:00      ONLINE
FormSubmissionDB      6            2025-12-04 10:30:00      ONLINE
```

---

## Creating Tables

### Table 1: User Registration Table

Stores user account information with bcrypt-hashed passwords.

```sql
-- Switch to UserRegistrationDB
USE UserRegistrationDB;
GO

-- Create tbl_Users table
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

-- Create indexes for faster queries
CREATE INDEX IDX_Users_Email ON tbl_Users(Email);
GO

CREATE INDEX IDX_Users_Username ON tbl_Users(Username);
GO

-- Verify table structure
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'tbl_Users'
ORDER BY ORDINAL_POSITION;
GO
```

**Column Descriptions:**
- `UserId` - Auto-incrementing primary key
- `Username` - Unique username (3-50 characters)
- `Email` - Unique email address for login
- `PasswordHash` - Bcrypt hash (60 characters)
- `AuthorizedPerson` - Optional authorized contact name
- `AuthorizedEmail` - Optional authorized contact email
- `CreatedAt` - Account creation timestamp
- `LastModified` - Last modification timestamp

### Table 2: Form Submission Table

Stores encrypted credentials with user isolation.

```sql
-- Switch to FormSubmissionDB
USE FormSubmissionDB;
GO

-- Create FormSubmission table
CREATE TABLE FormSubmission (
    GroupId INT PRIMARY KEY,
    UserId INT NOT NULL,
    Username NVARCHAR(255) NOT NULL,
    Password NVARCHAR(MAX) NOT NULL,
    Domain NVARCHAR(255) NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    LastModified DATETIME2 DEFAULT GETDATE()
);
GO

-- Create indexes for performance
-- Note: The composite index on (UserId, GroupId) can also serve queries filtering by UserId alone
CREATE INDEX IDX_FormSubmission_UserId_GroupId ON FormSubmission(UserId, GroupId);
GO

CREATE INDEX IDX_FormSubmission_Domain ON FormSubmission(Domain);
GO

-- Verify table structure
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'FormSubmission'
ORDER BY ORDINAL_POSITION;
GO
```

**Column Descriptions:**
- `GroupId` - User-defined unique identifier
- `UserId` - Foreign key linking to UserRegistrationDB (enforced at application level)
- `Username` - Stored username for the service
- `Password` - **AES-256 encrypted** password (not plaintext!)
- `Domain` - Service/website domain (e.g., "gmail.com")
- `CreatedAt` - Record creation timestamp
- `LastModified` - Last update timestamp

**Important Security Notes:**
- The `Password` column stores **encrypted** passwords using AES-256-CBC encryption
- The `UserId` column provides user isolation (users can only see their own data)
- Cross-database foreign keys are not supported in SQL Server, so referential integrity is enforced at the application level

### Optional: Data Validation Trigger

Create a trigger to validate that `UserId` exists in `UserRegistrationDB` before inserting into `FormSubmission`:

```sql
USE FormSubmissionDB;
GO

-- Create trigger to validate UserId
CREATE TRIGGER TR_FormSubmission_ValidateUserId
ON FormSubmission
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserId INT;
    DECLARE @Username NVARCHAR(50);

    SELECT @UserId = UserId FROM inserted;

    -- Check if UserId exists in UserRegistrationDB
    EXEC UserRegistrationDB.dbo.sp_executesql
        N'SELECT @Username = Username FROM tbl_Users WHERE UserId = @UserId',
        N'@UserId INT, @Username NVARCHAR(50) OUTPUT',
        @UserId = @UserId,
        @Username = @Username OUTPUT;

    IF @Username IS NULL
    BEGIN
        THROW 50001, 'Invalid UserId: User does not exist in UserRegistrationDB', 1;
        ROLLBACK TRANSACTION;
    END
END;
GO
```

---

## Setting Up Database Users

For production deployments, **never use the `sa` account** in your application. Create a dedicated database user with limited permissions.

### Step 1: Create SQL Server Login

```sql
-- Create login with strong password
CREATE LOGIN trustbox_app WITH PASSWORD = 'YourStrongPassword123!';
GO

-- Verify login was created
SELECT name, type_desc, create_date, is_disabled
FROM sys.server_principals
WHERE name = 'trustbox_app';
GO
```

### Step 2: Create Database Users and Grant Permissions

```sql
-- Grant access to UserRegistrationDB
USE UserRegistrationDB;
GO

CREATE USER trustbox_app FOR LOGIN trustbox_app;
GO

-- Grant read and write permissions
ALTER ROLE db_datareader ADD MEMBER trustbox_app;
ALTER ROLE db_datawriter ADD MEMBER trustbox_app;
GO

-- Verify permissions
SELECT
    dp.name AS UserName,
    r.name AS RoleName
FROM sys.database_principals dp
JOIN sys.database_role_members drm ON dp.principal_id = drm.member_principal_id
JOIN sys.database_principals r ON drm.role_principal_id = r.principal_id
WHERE dp.name = 'trustbox_app';
GO

-- Grant access to FormSubmissionDB
USE FormSubmissionDB;
GO

CREATE USER trustbox_app FOR LOGIN trustbox_app;
GO

-- Grant read and write permissions
ALTER ROLE db_datareader ADD MEMBER trustbox_app;
ALTER ROLE db_datawriter ADD MEMBER trustbox_app;
GO

-- Verify permissions
SELECT
    dp.name AS UserName,
    r.name AS RoleName
FROM sys.database_principals dp
JOIN sys.database_role_members drm ON dp.principal_id = drm.member_principal_id
JOIN sys.database_principals r ON drm.role_principal_id = r.principal_id
WHERE dp.name = 'trustbox_app';
GO
```

### Step 3: Update Application Configuration

Update your `backend/.env` file with the new credentials:

```env
DB_USER=trustbox_app
DB_PASSWORD=YourStrongPassword123!
DB_SERVER=localhost
DB_DATABASE_SUBMISSION=FormSubmissionDB
DB_DATABASE_REGISTER=UserRegistrationDB
```

---

## Verifying the Setup

### Check Database Existence

```sql
-- List all databases
SELECT name, database_id, create_date, state_desc
FROM sys.databases
ORDER BY name;
GO
```

### Check Table Creation

```sql
-- Verify tables in UserRegistrationDB
USE UserRegistrationDB;
GO

SELECT
    t.name AS TableName,
    SUM(p.rows) AS RowCount,
    SUM(a.total_pages) * 8 AS TotalSpaceKB
FROM sys.tables t
JOIN sys.indexes i ON t.object_id = i.object_id
JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
JOIN sys.allocation_units a ON p.partition_id = a.container_id
WHERE t.name = 'tbl_Users'
GROUP BY t.name;
GO

-- Verify tables in FormSubmissionDB
USE FormSubmissionDB;
GO

SELECT
    t.name AS TableName,
    SUM(p.rows) AS RowCount,
    SUM(a.total_pages) * 8 AS TotalSpaceKB
FROM sys.tables t
JOIN sys.indexes i ON t.object_id = i.object_id
JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
JOIN sys.allocation_units a ON p.partition_id = a.container_id
WHERE t.name = 'FormSubmission'
GROUP BY t.name;
GO
```

### Check Indexes

```sql
-- Check indexes on tbl_Users
USE UserRegistrationDB;
GO

SELECT
    i.name AS IndexName,
    i.type_desc AS IndexType,
    COL_NAME(ic.object_id, ic.column_id) AS ColumnName
FROM sys.indexes i
JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
WHERE i.object_id = OBJECT_ID('tbl_Users')
ORDER BY i.name;
GO

-- Check indexes on FormSubmission
USE FormSubmissionDB;
GO

SELECT
    i.name AS IndexName,
    i.type_desc AS IndexType,
    COL_NAME(ic.object_id, ic.column_id) AS ColumnName
FROM sys.indexes i
JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
WHERE i.object_id = OBJECT_ID('FormSubmission')
ORDER BY i.name;
GO
```

### Test Connection from Application

Create a test script `test-db-connection.js` in the `backend` directory:

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
        console.log('Testing SQL Server connection...');
        console.log(`Server: ${config.server}`);
        console.log(`User: ${config.user}`);
        console.log(`Database: ${config.database}`);

        const pool = await sql.connect(config);
        console.log('✅ Connection successful!');

        // Test query
        const result = await pool.request().query('SELECT @@VERSION as version');
        console.log('SQL Server Version:', result.recordset[0].version);

        // Check tables
        const tables = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
        `);
        console.log('\n✅ Tables in UserRegistrationDB:');
        tables.recordset.forEach(row => console.log(`  - ${row.TABLE_NAME}`));

        await pool.close();

        // Test FormSubmissionDB
        config.database = 'FormSubmissionDB';
        const pool2 = await sql.connect(config);
        const tables2 = await pool2.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
        `);
        console.log('\n✅ Tables in FormSubmissionDB:');
        tables2.recordset.forEach(row => console.log(`  - ${row.TABLE_NAME}`));

        await pool2.close();

        console.log('\n✅ All database tests passed!');
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

---

## User Isolation & Security

### How User Isolation Works

TrustBox implements user isolation to ensure users can only access their own data:

1. **UserRegistrationDB.tbl_Users** assigns each user a unique `UserId`
2. **FormSubmissionDB.FormSubmission** includes `UserId` column
3. Application queries filter by `UserId` automatically

### Query Examples with User Isolation

```sql
-- Example: Get all passwords for user ID 5
USE FormSubmissionDB;
GO

DECLARE @UserId INT = 5;

SELECT
    GroupId,
    Username,
    Password,  -- Encrypted in database, decrypted by application
    Domain,
    CreatedAt
FROM FormSubmission
WHERE UserId = @UserId
ORDER BY Domain;
GO

-- Example: Insert new password for user ID 5
USE FormSubmissionDB;
GO

DECLARE @UserId INT = 5;
DECLARE @GroupId INT = 101;
DECLARE @Username NVARCHAR(255) = 'user@example.com';
DECLARE @Password NVARCHAR(MAX) = 'ENCRYPTED_DATA_HERE';
DECLARE @Domain NVARCHAR(255) = 'example.com';

INSERT INTO FormSubmission (GroupId, UserId, Username, Password, Domain)
VALUES (@GroupId, @UserId, @Username, @Password, @Domain);
GO

-- Example: Update password for user ID 5
USE FormSubmissionDB;
GO

DECLARE @UserId INT = 5;
DECLARE @GroupId INT = 101;
DECLARE @NewPassword NVARCHAR(MAX) = 'NEW_ENCRYPTED_DATA';

UPDATE FormSubmission
SET Password = @NewPassword,
    LastModified = GETDATE()
WHERE GroupId = @GroupId AND UserId = @UserId;
GO

-- Example: Delete password for user ID 5
USE FormSubmissionDB;
GO

DECLARE @UserId INT = 5;
DECLARE @GroupId INT = 101;

DELETE FROM FormSubmission
WHERE GroupId = @GroupId AND UserId = @UserId;
GO
```

### Security Best Practices

```sql
-- 1. Disable SA account after creating admin users (optional, for production)
ALTER LOGIN sa DISABLE;
GO

-- 2. Enforce password policy for SQL logins
ALTER LOGIN trustbox_app WITH CHECK_POLICY = ON;
GO

-- 3. Check for weak passwords (query only, doesn't fix)
SELECT name, is_policy_checked, is_expiration_checked
FROM sys.sql_logins
WHERE is_policy_checked = 0 OR is_expiration_checked = 0;
GO

-- 4. Review database permissions
USE UserRegistrationDB;
GO

SELECT
    dp.name AS UserName,
    dp.type_desc AS PrincipalType,
    o.name AS ObjectName,
    p.permission_name,
    p.state_desc AS PermissionState
FROM sys.database_permissions p
JOIN sys.database_principals dp ON p.grantee_principal_id = dp.principal_id
LEFT JOIN sys.objects o ON p.major_id = o.object_id
WHERE dp.name = 'trustbox_app'
ORDER BY dp.name, o.name, p.permission_name;
GO
```

---

## Maintenance & Backup

### Database Backup

```sql
-- Create full backup of UserRegistrationDB
-- Windows path:
BACKUP DATABASE UserRegistrationDB
TO DISK = 'C:\Backups\UserRegistrationDB_Full.bak'
WITH FORMAT, INIT, NAME = 'Full Backup of UserRegistrationDB';
GO

-- Linux path (alternative):
-- BACKUP DATABASE UserRegistrationDB
-- TO DISK = '/var/opt/mssql/backup/UserRegistrationDB_Full.bak'
-- WITH FORMAT, INIT, NAME = 'Full Backup of UserRegistrationDB';
-- GO

-- Create full backup of FormSubmissionDB
-- Windows path:
BACKUP DATABASE FormSubmissionDB
TO DISK = 'C:\Backups\FormSubmissionDB_Full.bak'
WITH FORMAT, INIT, NAME = 'Full Backup of FormSubmissionDB';
GO

-- Linux path (alternative):
-- BACKUP DATABASE FormSubmissionDB
-- TO DISK = '/var/opt/mssql/backup/FormSubmissionDB_Full.bak'
-- WITH FORMAT, INIT, NAME = 'Full Backup of FormSubmissionDB';
-- GO

-- Verify backup (adjust path for your platform)
-- Windows:
RESTORE VERIFYONLY
FROM DISK = 'C:\Backups\UserRegistrationDB_Full.bak';
GO

RESTORE VERIFYONLY
FROM DISK = 'C:\Backups\FormSubmissionDB_Full.bak';
GO

-- Linux (alternative):
-- RESTORE VERIFYONLY
-- FROM DISK = '/var/opt/mssql/backup/UserRegistrationDB_Full.bak';
-- GO
--
-- RESTORE VERIFYONLY
-- FROM DISK = '/var/opt/mssql/backup/FormSubmissionDB_Full.bak';
-- GO
```

### Database Restore

```sql
-- Restore UserRegistrationDB (WARNING: This will overwrite existing data)
USE master;
GO

ALTER DATABASE UserRegistrationDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
GO

-- Windows path:
RESTORE DATABASE UserRegistrationDB
FROM DISK = 'C:\Backups\UserRegistrationDB_Full.bak'
WITH REPLACE;
GO

-- Linux path (alternative):
-- RESTORE DATABASE UserRegistrationDB
-- FROM DISK = '/var/opt/mssql/backup/UserRegistrationDB_Full.bak'
-- WITH REPLACE;
-- GO

ALTER DATABASE UserRegistrationDB SET MULTI_USER;
GO

-- Restore FormSubmissionDB
USE master;
GO

ALTER DATABASE FormSubmissionDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
GO

-- Windows path:
RESTORE DATABASE FormSubmissionDB
FROM DISK = 'C:\Backups\FormSubmissionDB_Full.bak'
WITH REPLACE;
GO

-- Linux path (alternative):
-- RESTORE DATABASE FormSubmissionDB
-- FROM DISK = '/var/opt/mssql/backup/FormSubmissionDB_Full.bak'
-- WITH REPLACE;
-- GO

ALTER DATABASE FormSubmissionDB SET MULTI_USER;
GO
```

### Database Statistics Update

```sql
-- Update statistics for better query performance
USE UserRegistrationDB;
GO
UPDATE STATISTICS tbl_Users;
GO

USE FormSubmissionDB;
GO
UPDATE STATISTICS FormSubmission;
GO
```

### Index Maintenance

```sql
-- Rebuild indexes for optimal performance
USE UserRegistrationDB;
GO
ALTER INDEX ALL ON tbl_Users REBUILD;
GO

USE FormSubmissionDB;
GO
ALTER INDEX ALL ON FormSubmission REBUILD;
GO

-- Check index fragmentation
SELECT
    OBJECT_NAME(i.object_id) AS TableName,
    i.name AS IndexName,
    s.avg_fragmentation_in_percent
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') s
JOIN sys.indexes i ON s.object_id = i.object_id AND s.index_id = i.index_id
WHERE s.avg_fragmentation_in_percent > 10
ORDER BY s.avg_fragmentation_in_percent DESC;
GO
```

### Database Space Usage

```sql
-- Check database size
EXEC sp_spaceused;
GO

-- Check table sizes in UserRegistrationDB
USE UserRegistrationDB;
GO
EXEC sp_spaceused 'tbl_Users';
GO

-- Check table sizes in FormSubmissionDB
USE FormSubmissionDB;
GO
EXEC sp_spaceused 'FormSubmission';
GO

-- Detailed space analysis
SELECT
    DB_NAME() AS DatabaseName,
    name AS FileName,
    size * 8 / 1024 AS SizeMB,
    CAST(FILEPROPERTY(name, 'SpaceUsed') AS INT) * 8 / 1024 AS UsedMB,
    size * 8 / 1024 - CAST(FILEPROPERTY(name, 'SpaceUsed') AS INT) * 8 / 1024 AS FreeMB
FROM sys.database_files;
GO
```

---

## Troubleshooting

### Issue 1: "Database does not exist"

```sql
-- Check if databases exist
SELECT name, state_desc
FROM sys.databases
WHERE name IN ('UserRegistrationDB', 'FormSubmissionDB');
GO

-- If missing, create them
CREATE DATABASE UserRegistrationDB;
GO
CREATE DATABASE FormSubmissionDB;
GO
```

### Issue 2: "Invalid object name 'tbl_Users'"

```sql
-- Check if table exists
USE UserRegistrationDB;
GO

SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'tbl_Users';
GO

-- If missing, create it (see "Creating Tables" section)
```

### Issue 3: "Login failed for user 'trustbox_app'"

```sql
-- Check if login exists
SELECT name, type_desc, is_disabled
FROM sys.server_principals
WHERE name = 'trustbox_app';
GO

-- If disabled, enable it
ALTER LOGIN trustbox_app ENABLE;
GO

-- Reset password if needed
ALTER LOGIN trustbox_app WITH PASSWORD = 'NewStrongPassword123!';
GO
```

### Issue 4: "User does not have permission"

```sql
-- Check current permissions
USE UserRegistrationDB;
GO

SELECT
    dp.name AS UserName,
    r.name AS RoleName
FROM sys.database_principals dp
LEFT JOIN sys.database_role_members drm ON dp.principal_id = drm.member_principal_id
LEFT JOIN sys.database_principals r ON drm.role_principal_id = r.principal_id
WHERE dp.name = 'trustbox_app';
GO

-- Grant necessary permissions
ALTER ROLE db_datareader ADD MEMBER trustbox_app;
ALTER ROLE db_datawriter ADD MEMBER trustbox_app;
GO
```

### Issue 5: "Cannot connect to database"

```bash
# Test SQL Server is running (Windows)
Get-Service MSSQLSERVER

# Test SQL Server is running (Linux)
systemctl status mssql-server

# Test connectivity
sqlcmd -S localhost -U sa -P 'YourPassword' -Q "SELECT @@VERSION"
```

### Issue 6: Index fragmentation causing slow queries

```sql
-- Check fragmentation levels
USE UserRegistrationDB;
GO

SELECT
    OBJECT_NAME(i.object_id) AS TableName,
    i.name AS IndexName,
    s.avg_fragmentation_in_percent,
    s.page_count
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') s
JOIN sys.indexes i ON s.object_id = i.object_id AND s.index_id = i.index_id
WHERE s.avg_fragmentation_in_percent > 30
ORDER BY s.avg_fragmentation_in_percent DESC;
GO

-- Rebuild fragmented indexes
ALTER INDEX ALL ON tbl_Users REBUILD;
GO
```

### Issue 7: Database locked / in use

```sql
-- Check active connections
USE master;
GO

SELECT
    session_id,
    login_name,
    host_name,
    program_name,
    status
FROM sys.dm_exec_sessions
WHERE database_id = DB_ID('UserRegistrationDB');
GO

-- Kill blocking sessions (use with caution)
-- KILL <session_id>;
```

---

## Quick Reference Commands

```sql
-- List all databases
SELECT name FROM sys.databases ORDER BY name;

-- List all tables in current database
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';

-- List all columns in a table
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'tbl_Users';

-- Count rows in a table
SELECT COUNT(*) FROM tbl_Users;
SELECT COUNT(*) FROM FormSubmission;

-- Check server version
SELECT @@VERSION;

-- Check current database
SELECT DB_NAME();

-- Check current user
SELECT USER_NAME();

-- List all logins
SELECT name, type_desc, create_date FROM sys.server_principals WHERE type IN ('S', 'U');

-- List all database users
SELECT name, type_desc, create_date FROM sys.database_principals WHERE type IN ('S', 'U');
```

---

## Next Steps

After completing this database setup:

1. ✅ **Configure Application** - Update `backend/.env` with database credentials
2. ✅ **Generate Encryption Key** - Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. ✅ **Test Connection** - Run `node backend/test-db-connection.js`
4. ✅ **Start Backend** - Run `cd backend && npm start`
5. ✅ **Test Registration** - Create a test user account
6. ✅ **Test Login** - Verify authentication works
7. ✅ **Test Password Storage** - Save and retrieve encrypted passwords

---

## Additional Resources

- [Microsoft SQL Server T-SQL Reference](https://docs.microsoft.com/en-us/sql/t-sql/)
- [SQL Server Best Practices](https://docs.microsoft.com/en-us/sql/sql-server/best-practices)
- [TrustBox README](README.md)
- [TrustBox API Documentation](README.md#-api-documentatie)

---

**Need help?** Open an issue on the [GitHub repository](https://github.com/Veradux001/TrustBox/issues).
