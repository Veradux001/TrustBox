-- Migration: Fix FormSubmission Primary Key Constraint
-- Date: 2025-12-04
-- Issue: #49 - Users other than the first user cannot save data due to PK violation
--
-- Problem: GroupId is currently the sole PRIMARY KEY, which prevents different users
--          from using the same GroupId values (e.g., both User 1 and User 2 want GroupId=1)
--
-- Solution: Change the PRIMARY KEY to a composite key (GroupId, UserId) to allow
--           user isolation while maintaining unique GroupIds per user
--
-- IMPORTANT: This migration will preserve all existing data
--
-- Usage:
--   sqlcmd -S localhost -U sa -P 'YourPassword' -i 001_fix_formsubmission_primary_key.sql -C
--   OR execute in SQL Server Management Studio (SSMS)

USE FormSubmissionDB;
GO

PRINT 'Starting migration: Fix FormSubmission Primary Key...';
GO

-- Step 1: Check if the table exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'FormSubmission')
BEGIN
    PRINT 'ERROR: FormSubmission table does not exist. Please run DATABASE_SETUP.md first.';
    THROW 50000, 'FormSubmission table does not exist', 1;
END
GO

-- Step 2: Drop the existing primary key constraint
DECLARE @constraintName NVARCHAR(200);
SELECT @constraintName = name
FROM sys.key_constraints
WHERE type = 'PK'
  AND parent_object_id = OBJECT_ID('FormSubmission');

IF @constraintName IS NOT NULL
BEGIN
    DECLARE @sql NVARCHAR(MAX);
    SET @sql = 'ALTER TABLE FormSubmission DROP CONSTRAINT ' + @constraintName;
    PRINT 'Dropping existing primary key constraint: ' + @constraintName;
    EXEC sp_executesql @sql;
    PRINT 'Primary key constraint dropped successfully.';
END
ELSE
BEGIN
    PRINT 'No existing primary key constraint found.';
END
GO

-- Step 3: Create the new composite primary key
ALTER TABLE FormSubmission
ADD CONSTRAINT PK_FormSubmission_GroupId_UserId
PRIMARY KEY (GroupId, UserId);
GO

PRINT 'New composite primary key (GroupId, UserId) created successfully.';
GO

-- Step 4: Verify the new primary key
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

PRINT 'Migration completed successfully!';
PRINT '';
PRINT 'Summary:';
PRINT '  - Old PRIMARY KEY: GroupId';
PRINT '  - New PRIMARY KEY: (GroupId, UserId)';
PRINT '';
PRINT 'Users can now use the same GroupId values without conflicts.';
PRINT 'Each user has their own isolated set of GroupIds.';
GO
