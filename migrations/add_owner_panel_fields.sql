-- Add owner panel password fields to users table
-- Migration: add_owner_panel_fields.sql
-- Run this script on your MySQL database

-- Disable safe update mode temporarily
SET SQL_SAFE_UPDATES = 0;

-- Add owner_panel_password column (ignore error if it already exists)
ALTER TABLE users ADD COLUMN owner_panel_password VARCHAR(128) NULL COMMENT 'Hashed password for accessing owner panel';

-- Add owner_panel_setup column (ignore error if it already exists) 
ALTER TABLE users ADD COLUMN owner_panel_setup BOOLEAN DEFAULT FALSE COMMENT 'Flag to track if user has set up owner panel password';

-- Update all existing users to have owner_panel_setup as false
UPDATE users SET owner_panel_setup = COALESCE(owner_panel_setup, FALSE);

-- Re-enable safe update mode
SET SQL_SAFE_UPDATES = 1;