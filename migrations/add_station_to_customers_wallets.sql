-- =============================================
-- ADD station_id to customers, wallets, and food_items tables
-- =============================================
-- Run this script to enable multi-tenancy for customers, wallets, and food_items

-- Step 1: Add station_id to customers table
ALTER TABLE customers
ADD COLUMN station_id INT NULL,
ADD INDEX idx_customers_station_id (station_id),
ADD CONSTRAINT fk_customers_station
    FOREIGN KEY (station_id) REFERENCES stations(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 2: Add station_id to wallets table
ALTER TABLE wallets
ADD COLUMN station_id INT NULL,
ADD INDEX idx_wallets_station_id (station_id),
ADD CONSTRAINT fk_wallets_station
    FOREIGN KEY (station_id) REFERENCES stations(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 3: Add station_id to food_items table
ALTER TABLE food_items
ADD COLUMN station_id INT NULL,
ADD INDEX idx_food_items_station_id (station_id),
ADD CONSTRAINT fk_food_items_station
    FOREIGN KEY (station_id) REFERENCES stations(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 4: Add station_id to bugs table
ALTER TABLE bugs
ADD COLUMN station_id INT NULL,
ADD INDEX idx_bugs_station_id (station_id),
ADD CONSTRAINT fk_bugs_station
    FOREIGN KEY (station_id) REFERENCES stations(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Verification
SELECT 'customers' as tbl, COUNT(*) as total, SUM(station_id IS NULL) as without_station FROM customers
UNION ALL
SELECT 'wallets' as tbl, COUNT(*) as total, SUM(station_id IS NULL) as without_station FROM wallets
UNION ALL
SELECT 'food_items' as tbl, COUNT(*) as total, SUM(station_id IS NULL) as without_station FROM food_items
UNION ALL
SELECT 'bugs' as tbl, COUNT(*) as total, SUM(station_id IS NULL) as without_station FROM bugs;
