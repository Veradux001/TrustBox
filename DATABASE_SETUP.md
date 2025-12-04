# MSSQL Server Setup Guide - TrustBox

This guide walks you through setting up Microsoft SQL Server from scratch for the TrustBox application.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installing MSSQL Server](#installing-mssql-server)
3. [Initial Server Configuration](#initial-server-configuration)
4. [Creating Databases](#creating-databases)
5. [Creating Tables](#creating-tables)
6. [Setting Up Database Users](#setting-up-database-users)
7. [Configuring Firewall Rules](#configuring-firewall-rules)
8. [Enabling Remote Connections](#enabling-remote-connections)
9. [Testing the Connection](#testing-the-connection)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Operating System**: Windows Server 2016+, Windows 10/11, or Linux (Ubuntu 20.04+, RHEL 8+)
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Disk Space**: Minimum 6GB for installation
- **Network**: Static IP address recommended for server deployment
- **Administrative Access**: Root/Administrator privileges required

---

## Installing MSSQL Server

### Option 1: Windows Installation

#### Step 1: Download SQL Server

1. Visit the [Microsoft SQL Server Download Page](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
2. Choose one of the following editions:
   - **Express Edition** (Free, recommended for development/small deployments)
   - **Developer Edition** (Free, full-featured for non-production use)
   - **Standard/Enterprise Edition** (Paid, for production environments)

#### Step 2: Run the Installer

1. Run the downloaded installer (`SQLServer2022-*.exe`)
2. Choose installation type:
   - **Basic**: Quickest installation with default settings
   - **Custom**: Full control over installation options
   - **Download Media**: Download ISO for offline installation

3. For **Basic Installation**:
   - Accept the license terms
   - Choose installation location (default: `C:\Program Files\Microsoft SQL Server`)
   - Click **Install**
   - Wait for installation to complete (5-10 minutes)

4. For **Custom Installation**:
   - Accept the license terms
   - Choose **New SQL Server stand-alone installation**
   - Select features to install:
     - ✅ Database Engine Services (required)
     - ✅ SQL Server Replication (optional)
     - ✅ Full-Text and Semantic Extractions for Search (optional)
   - Choose instance configuration:
     - **Default instance**: `MSSQLSERVER` (recommended)
     - **Named instance**: Custom name (e.g., `TRUSTBOX`)
   - Configure authentication mode:
     - **Windows Authentication Mode**: Use Windows credentials (simpler for local dev)
     - **Mixed Mode**: SQL Server + Windows authentication (recommended for production)
   - Set **sa** (system administrator) password if using Mixed Mode
     - Use a strong password (min 8 chars, uppercase, lowercase, numbers, symbols)
   - Click **Install**

#### Step 3: Install SQL Server Management Studio (SSMS)

1. Download SSMS from [Microsoft's website](https://aka.ms/ssmsfullsetup)
2. Run the installer
3. Follow the installation wizard
4. Launch SSMS after installation

### Option 2: Linux Installation (Ubuntu 20.04/22.04)

#### Step 1: Import Microsoft GPG Key

```bash
# Update package list
sudo apt-get update

# Import Microsoft GPG key
curl https://packages.microsoft.com/keys/microsoft.asc | sudo tee /etc/apt/trusted.gpg.d/microsoft.asc

# Add Microsoft SQL Server repository (Ubuntu 22.04)
sudo add-apt-repository "$(wget -qO- https://packages.microsoft.com/config/ubuntu/22.04/mssql-server-2022.list)"
```

For Ubuntu 20.04:
```bash
sudo add-apt-repository "$(wget -qO- https://packages.microsoft.com/config/ubuntu/20.04/mssql-server-2022.list)"
```

#### Step 2: Install SQL Server

```bash
# Update package list
sudo apt-get update

# Install SQL Server
sudo apt-get install -y mssql-server

# Run setup script
sudo /opt/mssql/bin/mssql-conf setup
```

During setup, you'll be prompted to:
1. Choose edition:
   - `1` - Evaluation (free, 180-day trial)
   - `2` - Developer (free, non-production use)
   - `3` - Express (free, limited to 10GB per database)
   - `4` - Web
   - `5` - Standard
   - `6` - Enterprise

2. Accept license terms: Type `Yes`

3. Set SA password:
   - Must be at least 8 characters
   - Include uppercase, lowercase, numbers, and symbols
   - Example: `TrustBox2024!`

#### Step 3: Verify Installation

```bash
# Check SQL Server status
systemctl status mssql-server

# Should show "active (running)"
```

#### Step 4: Install SQL Server Command-Line Tools

```bash
# Add Microsoft repository for tools
curl https://packages.microsoft.com/config/ubuntu/22.04/prod.list | sudo tee /etc/apt/sources.list.d/mssql-release.list

# Update and install tools
sudo apt-get update
sudo ACCEPT_EULA=Y apt-get install -y mssql-tools18 unixodbc-dev

# Add tools to PATH
echo 'export PATH="$PATH:/opt/mssql-tools18/bin"' >> ~/.bashrc
source ~/.bashrc
```

### Option 3: Docker Installation (Cross-Platform)

#### Step 1: Install Docker

Follow the [official Docker installation guide](https://docs.docker.com/get-docker/) for your operating system.

#### Step 2: Pull and Run SQL Server Container

```bash
# Pull SQL Server 2022 image
docker pull mcr.microsoft.com/mssql/server:2022-latest

# Run SQL Server container
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=TrustBox2024!" \
   -p 1433:1433 --name trustbox-sql --hostname trustbox-sql \
   -d mcr.microsoft.com/mssql/server:2022-latest

# Verify container is running
docker ps
```

**Important Docker Notes:**
- The SA password must meet complexity requirements
- Port 1433 is mapped to host
- Container name: `trustbox-sql`
- Data is not persistent by default - see [Docker volumes](#docker-data-persistence) for persistence

#### Docker Data Persistence

To persist data between container restarts:

```bash
# Create a volume for data persistence
docker volume create trustbox-sql-data

# Run container with volume
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=TrustBox2024!" \
   -p 1433:1433 --name trustbox-sql --hostname trustbox-sql \
   -v trustbox-sql-data:/var/opt/mssql \
   -d mcr.microsoft.com/mssql/server:2022-latest
```

---

## Initial Server Configuration

### For Windows (Using SSMS)

1. **Launch SQL Server Management Studio (SSMS)**
2. **Connect to Server**:
   - Server type: `Database Engine`
   - Server name: `localhost` or `.\MSSQLSERVER` (for default instance)
   - Authentication: `Windows Authentication` or `SQL Server Authentication`
   - If using SQL Authentication:
     - Login: `sa`
     - Password: [password set during installation]
3. Click **Connect**

### For Linux/Docker (Using sqlcmd)

```bash
# Connect to SQL Server
sqlcmd -S localhost -U sa -P 'TrustBox2024!' -C

# You should see a prompt: 1>
```

**Note**: The `-C` flag trusts the server certificate (for development only).

---

## Creating Databases

TrustBox requires **two separate databases**:
1. **UserRegistrationDB** - For user accounts and authentication
2. **FormSubmissionDB** - For encrypted password storage

### Method 1: Using SSMS (Windows)

1. In Object Explorer, expand the server
2. Right-click **Databases** → **New Database**
3. Enter database name: `UserRegistrationDB`
4. Click **OK**
5. Repeat for `FormSubmissionDB`

### Method 2: Using SQL Commands

```sql
-- Create UserRegistrationDB
CREATE DATABASE UserRegistrationDB;
GO

-- Create FormSubmissionDB
CREATE DATABASE FormSubmissionDB;
GO

-- Verify databases were created
SELECT name, database_id, create_date
FROM sys.databases
WHERE name IN ('UserRegistrationDB', 'FormSubmissionDB');
GO
```

#### For Linux/Docker:

```bash
# Connect to SQL Server
sqlcmd -S localhost -U sa -P 'TrustBox2024!' -C

# Run commands (type each line, press Enter, then type GO and press Enter)
# 1> CREATE DATABASE UserRegistrationDB;
# 2> GO
# 1> CREATE DATABASE FormSubmissionDB;
# 2> GO
# 1> exit
```

---

## Creating Tables

### Step 1: Create User Registration Table

This table stores user account information with bcrypt-hashed passwords.

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

-- Create index on Email for faster login queries
CREATE INDEX IDX_Users_Email ON tbl_Users(Email);
GO

-- Create index on Username for faster lookups
CREATE INDEX IDX_Users_Username ON tbl_Users(Username);
GO

-- Verify table was created
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'tbl_Users';
GO
```

### Step 2: Create Form Submission Table

This table stores encrypted credentials with user isolation.

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

-- Create index on UserId for faster user-specific queries
CREATE INDEX IDX_FormSubmission_UserId ON FormSubmission(UserId);
GO

-- Create composite index for common query pattern
CREATE INDEX IDX_FormSubmission_UserId_GroupId ON FormSubmission(UserId, GroupId);
GO

-- Verify table was created
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'FormSubmission';
GO
```

**Important Notes:**
- The `Password` column stores **encrypted** passwords (not plaintext)
- The `UserId` column provides user isolation (prevents users from seeing each other's data)
- The `GroupId` is user-defined and must be unique per user

### Step 3: (Optional) Add Foreign Key Constraint

To enforce referential integrity between databases:

**Note**: Cross-database foreign keys are not supported in SQL Server. Instead, enforce this at the application level (already implemented in `serverV2.js`).

However, you can add a trigger for validation:

```sql
USE FormSubmissionDB;
GO

-- Create trigger to validate UserId exists in UserRegistrationDB
CREATE TRIGGER TR_FormSubmission_ValidateUserId
ON FormSubmission
AFTER INSERT, UPDATE
AS
BEGIN
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
        RAISERROR('Invalid UserId: User does not exist in UserRegistrationDB', 16, 1);
        ROLLBACK TRANSACTION;
    END
END;
GO
```

---

## Setting Up Database Users

For production deployments, create a dedicated SQL Server user instead of using `sa`.

### Step 1: Create SQL Server Login

```sql
-- Create login with password
CREATE LOGIN trustbox_app WITH PASSWORD = 'YourStrongPassword123!';
GO
```

### Step 2: Create Database Users

```sql
-- Grant access to UserRegistrationDB
USE UserRegistrationDB;
GO
CREATE USER trustbox_app FOR LOGIN trustbox_app;
GO
ALTER ROLE db_datareader ADD MEMBER trustbox_app;
ALTER ROLE db_datawriter ADD MEMBER trustbox_app;
GO

-- Grant access to FormSubmissionDB
USE FormSubmissionDB;
GO
CREATE USER trustbox_app FOR LOGIN trustbox_app;
GO
ALTER ROLE db_datareader ADD MEMBER trustbox_app;
ALTER ROLE db_datawriter ADD MEMBER trustbox_app;
GO
```

### Step 3: Update `.env` File

Update your backend `.env` file with the new credentials:

```env
DB_USER=trustbox_app
DB_PASSWORD=YourStrongPassword123!
```

---

## Configuring Firewall Rules

### Windows Firewall

#### Option 1: Using Windows Firewall GUI

1. Open **Windows Firewall with Advanced Security**
2. Click **Inbound Rules** → **New Rule**
3. Select **Port** → **Next**
4. Choose **TCP**, enter port: `1433` → **Next**
5. Select **Allow the connection** → **Next**
6. Select when rule applies (Domain, Private, Public) → **Next**
7. Name: `SQL Server` → **Finish**

#### Option 2: Using PowerShell (Run as Administrator)

```powershell
# Allow SQL Server port 1433
New-NetFirewallRule -DisplayName "SQL Server" -Direction Inbound -Protocol TCP -LocalPort 1433 -Action Allow
```

### Linux Firewall (UFW)

```bash
# Allow SQL Server port
sudo ufw allow 1433/tcp

# Verify rule
sudo ufw status
```

### Linux Firewall (firewalld - RHEL/CentOS)

```bash
# Allow SQL Server port
sudo firewall-cmd --permanent --add-port=1433/tcp
sudo firewall-cmd --reload

# Verify rule
sudo firewall-cmd --list-ports
```

---

## Enabling Remote Connections

By default, SQL Server may only accept local connections.

### Windows Configuration

#### Using SQL Server Configuration Manager

1. Open **SQL Server Configuration Manager**
2. Expand **SQL Server Network Configuration**
3. Click **Protocols for [Instance Name]**
4. Right-click **TCP/IP** → **Enable**
5. Right-click **TCP/IP** → **Properties**
6. Go to **IP Addresses** tab
7. Scroll to **IPAll** section
8. Set **TCP Port** to `1433`
9. Click **OK**
10. Restart SQL Server service:
    - Expand **SQL Server Services**
    - Right-click **SQL Server (MSSQLSERVER)** → **Restart**

#### Using SQL Commands

```sql
-- Enable TCP/IP protocol (requires restart)
EXEC sp_configure 'remote access', 1;
GO
RECONFIGURE;
GO
```

### Linux Configuration

```bash
# Edit mssql.conf
sudo /opt/mssql/bin/mssql-conf set network.tcpport 1433

# Enable remote connections
sudo /opt/mssql/bin/mssql-conf set network.ipaddress 0.0.0.0

# Restart SQL Server
sudo systemctl restart mssql-server
```

### Docker Configuration

Remote connections are enabled by default when using `-p 1433:1433`.

---

## Testing the Connection

### From the Same Machine

#### Windows (SSMS)
1. Open SSMS
2. Server name: `localhost` or `127.0.0.1`
3. Authentication: SQL Server Authentication
4. Login: `sa` or `trustbox_app`
5. Password: [your password]
6. Click **Connect**

#### Linux/Docker (sqlcmd)
```bash
sqlcmd -S localhost -U sa -P 'TrustBox2024!' -C
```

### From a Remote Machine

```bash
# Replace [SERVER_IP] with actual server IP address
sqlcmd -S [SERVER_IP] -U sa -P 'TrustBox2024!' -C

# Example:
sqlcmd -S 192.168.1.100 -U sa -P 'TrustBox2024!' -C
```

### Using Node.js (Test Script)

Create a test file `test-db-connection.js`:

```javascript
require('dotenv').config();
const sql = require('mssql');

const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'TrustBox2024!',
    server: process.env.DB_SERVER || 'localhost',
    database: 'UserRegistrationDB',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function testConnection() {
    try {
        console.log('Attempting to connect to SQL Server...');
        console.log(`Server: ${config.server}`);
        console.log(`User: ${config.user}`);
        console.log(`Database: ${config.database}`);

        const pool = await sql.connect(config);
        console.log('✅ Connection successful!');

        const result = await pool.request().query('SELECT @@VERSION as version');
        console.log('SQL Server Version:', result.recordset[0].version);

        await pool.close();
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
        console.error('Full error:', err);
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

## Troubleshooting

### Issue 1: "Cannot connect to server"

**Possible Causes:**
1. SQL Server service is not running
2. Firewall blocking port 1433
3. TCP/IP protocol is disabled
4. Wrong server address

**Solutions:**

**Windows:**
```powershell
# Check if SQL Server is running
Get-Service MSSQLSERVER

# Start SQL Server if stopped
Start-Service MSSQLSERVER
```

**Linux:**
```bash
# Check status
systemctl status mssql-server

# Start if stopped
sudo systemctl start mssql-server

# Enable auto-start on boot
sudo systemctl enable mssql-server
```

**Docker:**
```bash
# Check if container is running
docker ps

# Start if stopped
docker start trustbox-sql

# View logs
docker logs trustbox-sql
```

### Issue 2: "Login failed for user"

**Possible Causes:**
1. Wrong username or password
2. SQL Server authentication is disabled (Windows auth only)
3. User doesn't have access to database

**Solutions:**

1. **Enable Mixed Mode Authentication** (Windows):
   - Open SSMS
   - Right-click server → **Properties**
   - Go to **Security** page
   - Select **SQL Server and Windows Authentication mode**
   - Click **OK**
   - Restart SQL Server service

2. **Reset SA Password** (Linux/Docker):
   ```bash
   sudo /opt/mssql/bin/mssql-conf set-sa-password
   ```

3. **Verify User Access**:
   ```sql
   -- Check if user exists
   SELECT name, type_desc FROM sys.server_principals WHERE name = 'trustbox_app';
   GO

   -- Check database access
   USE UserRegistrationDB;
   GO
   SELECT name FROM sys.database_principals WHERE name = 'trustbox_app';
   GO
   ```

### Issue 3: "Database does not exist"

**Solution:**
```sql
-- List all databases
SELECT name FROM sys.databases;
GO

-- Create missing database
CREATE DATABASE UserRegistrationDB;
GO
CREATE DATABASE FormSubmissionDB;
GO
```

### Issue 4: "Network-related or instance-specific error"

**Possible Causes:**
1. SQL Server Browser service is not running (named instances)
2. Port 1433 is blocked
3. Server is not listening on network

**Solutions:**

1. **Test port connectivity**:
   ```bash
   # From remote machine
   telnet [SERVER_IP] 1433

   # Or using nc (netcat)
   nc -zv [SERVER_IP] 1433
   ```

2. **Start SQL Server Browser** (Windows, for named instances):
   ```powershell
   Start-Service SQLBROWSER
   Set-Service SQLBROWSER -StartupType Automatic
   ```

3. **Check listening ports** (Linux):
   ```bash
   sudo netstat -tuln | grep 1433
   # Should show: tcp 0 0 0.0.0.0:1433
   ```

### Issue 5: "Self-signed certificate" or SSL errors

**Solution:**

Update your `.env` file:
```env
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
```

Or for production with valid certificate:
```env
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false
```

---

## Next Steps

After completing this setup:

1. **Configure Application**: Update `backend/.env` with your database credentials
2. **Generate Encryption Key**: Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and add to `.env`
3. **Test Connection**: Run the Node.js test script above
4. **Start Backend**: Run `cd backend && npm start`
5. **Verify Tables**: Check that all tables and indexes were created successfully

---

## Security Best Practices

### For Production Deployments:

1. ✅ **Change default SA password** to a strong, unique password
2. ✅ **Create dedicated application user** (don't use `sa` in production)
3. ✅ **Enable SSL/TLS encryption** for database connections
4. ✅ **Restrict firewall rules** to only allow specific IP addresses
5. ✅ **Regular backups** of both databases
6. ✅ **Keep SQL Server updated** with latest security patches
7. ✅ **Enable SQL Server Audit** for compliance and security monitoring
8. ✅ **Disable `sa` account** after creating admin users (optional)
9. ✅ **Use strong authentication** (consider Windows Authentication for Windows servers)
10. ✅ **Regular security audits** using SQL Server security tools

### Backup Strategy:

```sql
-- Create full backup of UserRegistrationDB
BACKUP DATABASE UserRegistrationDB
TO DISK = 'C:\Backups\UserRegistrationDB_Full.bak'
WITH FORMAT, INIT, NAME = 'Full Backup of UserRegistrationDB';
GO

-- Create full backup of FormSubmissionDB
BACKUP DATABASE FormSubmissionDB
TO DISK = 'C:\Backups\FormSubmissionDB_Full.bak'
WITH FORMAT, INIT, NAME = 'Full Backup of FormSubmissionDB';
GO
```

### Automated Backups (Linux):

```bash
# Create backup script
cat > /opt/mssql-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/opt/mssql/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'TrustBox2024!' -C -Q \
"BACKUP DATABASE UserRegistrationDB TO DISK = '$BACKUP_DIR/UserRegistrationDB_$TIMESTAMP.bak' WITH FORMAT, INIT;"

/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'TrustBox2024!' -C -Q \
"BACKUP DATABASE FormSubmissionDB TO DISK = '$BACKUP_DIR/FormSubmissionDB_$TIMESTAMP.bak' WITH FORMAT, INIT;"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.bak" -mtime +7 -delete
EOF

chmod +x /opt/mssql-backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/mssql-backup.sh") | crontab -
```

---

## Additional Resources

- [Microsoft SQL Server Documentation](https://docs.microsoft.com/en-us/sql/sql-server/)
- [SQL Server on Linux Documentation](https://docs.microsoft.com/en-us/sql/linux/)
- [SQL Server Docker Documentation](https://docs.microsoft.com/en-us/sql/linux/sql-server-linux-docker-container-deployment)
- [TrustBox README](README.md)
- [TrustBox Troubleshooting Guide](TROUBLESHOOTING.md)

---

**Need help?** Open an issue on the [GitHub repository](https://github.com/Veradux001/TrustBox/issues).
