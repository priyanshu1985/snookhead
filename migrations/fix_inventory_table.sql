-- Fix inventory table structure
-- Run this in your MySQL database (phpMyAdmin, MySQL Workbench, or command line)

USE snookhead;

-- First, check current table structure
DESCRIBE inventory;
SHOW CREATE TABLE inventory;

-- Drop the existing category column if it exists with wrong type
ALTER TABLE inventory DROP COLUMN category;

-- Add the category column back with correct ENUM values
ALTER TABLE inventory ADD COLUMN category ENUM(
    'food_drinks', 
    'snooker_equipment', 
    'cleaning_supplies', 
    'office_supplies', 
    'maintenance', 
    'electronics', 
    'other'
) NOT NULL DEFAULT 'other' AFTER item_name;

-- Alternative approach if the above doesn't work:
-- First change it to VARCHAR temporarily, then to ENUM
-- ALTER TABLE inventory MODIFY COLUMN category VARCHAR(50);
-- ALTER TABLE inventory MODIFY COLUMN category ENUM('food_drinks', 'snooker_equipment', 'cleaning_supplies', 'office_supplies', 'maintenance', 'electronics', 'other') NOT NULL DEFAULT 'other';

-- Make sure other columns have proper types
ALTER TABLE inventory 
MODIFY COLUMN item_name VARCHAR(100) NOT NULL,
MODIFY COLUMN current_quantity INT NOT NULL DEFAULT 0,
MODIFY COLUMN minimum_threshold INT NOT NULL DEFAULT 10,
MODIFY COLUMN unit VARCHAR(20) NOT NULL DEFAULT 'pieces',
MODIFY COLUMN cost_per_unit DECIMAL(10,2) NULL,
MODIFY COLUMN supplier VARCHAR(100) NULL,
MODIFY COLUMN description TEXT NULL,
MODIFY COLUMN last_restocked DATETIME NULL,
MODIFY COLUMN is_active BOOLEAN DEFAULT true,
MODIFY COLUMN createdAt DATETIME NOT NULL,
MODIFY COLUMN updatedAt DATETIME NOT NULL;

-- Verify the changes
DESCRIBE inventory;

-- Optional: Insert a test record to verify it works
INSERT INTO inventory (
    item_name, 
    category, 
    current_quantity, 
    minimum_threshold, 
    unit, 
    cost_per_unit, 
    supplier, 
    description, 
    is_active, 
    createdAt, 
    updatedAt
) VALUES (
    'Test Item', 
    'food_drinks', 
    10, 
    5, 
    'pieces', 
    15.50, 
    'Test Supplier', 
    'Test description', 
    true, 
    NOW(), 
    NOW()
);

-- Check if the test record was inserted successfully
SELECT * FROM inventory WHERE item_name = 'Test Item';

-- If successful, you can delete the test record
-- DELETE FROM inventory WHERE item_name = 'Test Item';

COMMIT;