# Database Migrations

This directory contains SQL migration scripts for the TrustBox database schema.

## Overview

Database migrations are versioned SQL scripts that modify the database schema or data. They should be applied in numerical order.

## Available Migrations

### 001_fix_formsubmission_primary_key.sql
**Date:** 2025-12-04
**Issue:** [#49](https://github.com/Veradux001/TrustBox/issues/49)

**Problem:**
The `FormSubmission` table had `GroupId` as the sole PRIMARY KEY. This prevented different users from using the same `GroupId` values, causing primary key constraint violations when a second user tried to save data with `GroupId=1`.

**Solution:**
Changed the PRIMARY KEY to a composite key `(GroupId, UserId)` to allow user isolation while maintaining unique GroupIds per user.

**Impact:**
- Preserves all existing data
- Allows multiple users to have records with the same `GroupId` values
- Each user maintains their own isolated set of GroupIds

## How to Apply Migrations

### Using sqlcmd (Command Line)

```bash
# Linux/macOS
sqlcmd -S localhost -U sa -P 'YourPassword' -i migrations/001_fix_formsubmission_primary_key.sql -C

# Windows PowerShell
sqlcmd -S localhost -U sa -P "YourPassword" -i migrations\001_fix_formsubmission_primary_key.sql -C
```

### Using SQL Server Management Studio (SSMS)

1. Open SQL Server Management Studio
2. Connect to your SQL Server instance
3. Open the migration file (`File > Open > File...`)
4. Execute the script (`F5` or click `Execute`)

### Using Azure Data Studio

1. Open Azure Data Studio
2. Connect to your SQL Server instance
3. Open the migration file
4. Click `Run` to execute the script

## Migration Status Tracking

Keep track of which migrations have been applied:

```sql
-- Check current primary key configuration
USE FormSubmissionDB;
GO

SELECT
    i.name AS IndexName,
    i.type_desc AS IndexType,
    COL_NAME(ic.object_id, ic.column_id) AS ColumnName,
    ic.key_ordinal AS KeyOrder
FROM sys.indexes i
JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
WHERE i.object_id = OBJECT_ID('FormSubmission')
  AND i.is_primary_key = 1
ORDER BY ic.key_ordinal;
GO
```

**Expected output after migration 001:**
```
IndexName                               IndexType    ColumnName  KeyOrder
PK_FormSubmission_GroupId_UserId        CLUSTERED    GroupId     1
PK_FormSubmission_GroupId_UserId        CLUSTERED    UserId      2
```

## Best Practices

1. **Always backup your database before applying migrations:**
   ```sql
   BACKUP DATABASE FormSubmissionDB
   TO DISK = '/var/opt/mssql/backup/FormSubmissionDB_PreMigration.bak'
   WITH FORMAT, INIT;
   ```

2. **Test migrations on a development database first**

3. **Apply migrations in order** (001, 002, 003, etc.)

4. **Never modify a migration script after it has been applied** - create a new migration instead

5. **Review the migration script before executing** to understand what changes will be made

## Rollback

If you need to rollback migration 001, you can restore the original primary key:

```sql
USE FormSubmissionDB;
GO

-- Drop the composite primary key
ALTER TABLE FormSubmission
DROP CONSTRAINT PK_FormSubmission_GroupId_UserId;
GO

-- Restore the original primary key (WARNING: This may fail if multiple users have the same GroupId)
ALTER TABLE FormSubmission
ADD CONSTRAINT PK_FormSubmission_GroupId PRIMARY KEY (GroupId);
GO
```

**WARNING:** Rollback will fail if the database contains records from multiple users with the same `GroupId` values. In that case, you would need to manually resolve the conflicts before rolling back.

## Support

If you encounter issues with migrations, please:

1. Check the error message in the SQL output
2. Review the [Troubleshooting section](../DATABASE_SETUP.md#troubleshooting) in DATABASE_SETUP.md
3. Open an issue on the [GitHub repository](https://github.com/Veradux001/TrustBox/issues)
