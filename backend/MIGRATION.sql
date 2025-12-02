-- Migration: Add UserId to FormSubmission table
-- This links saved passwords to specific users

USE FormSubmissionDB;
GO

-- Add UserId column (allows NULL initially for existing data)
ALTER TABLE FormSubmission
ADD UserId INT NULL;
GO

-- For existing data, you can either:
-- Option 1: Delete all existing data (if test data only)
-- DELETE FROM FormSubmission;

-- Option 2: Assign existing data to a specific user
-- UPDATE FormSubmission SET UserId = 1 WHERE UserId IS NULL;

-- After migration, make UserId required for new entries
-- (enforced in application code, not database constraint yet)
