-- Migration to add 'ready' status to orders table
-- Run this in your database management tool or via your migration system

-- First, add the new enum value to the status column
ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'ready', 'completed', 'cancelled') DEFAULT 'pending';