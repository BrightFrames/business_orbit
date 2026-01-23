-- Migration: Add gender column to users table
-- This is a non-destructive migration that adds a nullable gender column.
-- It does NOT modify or delete any existing data.

-- Add gender column (nullable, with allowed values)
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

-- Add a comment to document the allowed values
COMMENT ON COLUMN users.gender IS 'User gender: male, female, other, or null';

-- Create index for faster queries by gender
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);
