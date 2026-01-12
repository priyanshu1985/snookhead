-- =============================================
-- MULTI-TENANCY MIGRATION SCRIPT
-- =============================================
-- Run this script in MySQL to add station_id to all tables
-- This enables data isolation per owner/station
--
-- IMPORTANT: Run this script AFTER backing up your database!
-- =============================================

-- Step 1: Add station_id to users table (links users to their station)
-- Owners will have their own station_id, staff will be linked to owner's station
-- Handle MySQL 64 index limit by splitting operations

-- First, add the column only
ALTER TABLE users ADD COLUMN station_id INT NULL AFTER role;

-- Skip adding index due to MySQL 64 index limit on users table
-- Also skip foreign key constraint due to same limit
-- Data integrity will need to be maintained at application level for users table
-- The station_id column is still added and can be used for queries

-- Foreign key constraint skipped due to MySQL key limit on users table
-- ALTER TABLE users ADD CONSTRAINT fk_users_station
--     FOREIGN KEY (station_id) REFERENCES stations(id)
--     ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 2: Add station_id to menuitems table
ALTER TABLE menuitems
ADD COLUMN station_id INT NULL AFTER id,
ADD INDEX idx_menuitems_station_id (station_id),
ADD CONSTRAINT fk_menuitems_station
    FOREIGN KEY (station_id) REFERENCES stations(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 3: Add station_id to tables (TableAsset)
ALTER TABLE tables
ADD COLUMN station_id INT NULL AFTER id,
ADD INDEX idx_tables_station_id (station_id),
ADD CONSTRAINT fk_tables_station
    FOREIGN KEY (station_id) REFERENCES stations(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 4: Add station_id to orders table
ALTER TABLE orders
ADD COLUMN station_id INT NULL AFTER id,
ADD INDEX idx_orders_station_id (station_id),
ADD CONSTRAINT fk_orders_station
    FOREIGN KEY (station_id) REFERENCES stations(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 5: Add station_id to inventory table
-- First drop the unique constraint on item_name since same item can exist in multiple stations
ALTER TABLE inventory DROP INDEX item_name;
ALTER TABLE inventory
ADD COLUMN station_id INT NULL AFTER id,
ADD INDEX idx_inventory_station_id (station_id),
ADD UNIQUE INDEX idx_inventory_item_station (item_name, station_id),
ADD CONSTRAINT fk_inventory_station
    FOREIGN KEY (station_id) REFERENCES stations(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Add station_id to reservations table
ALTER TABLE reservations
ADD COLUMN station_id INT NULL AFTER id,
ADD INDEX idx_reservations_station_id (station_id),
ADD CONSTRAINT fk_reservations_station
    FOREIGN KEY (station_id) REFERENCES stations(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Add station_id to bills table
ALTER TABLE bills
ADD COLUMN station_id INT NULL AFTER id,
ADD INDEX idx_bills_station_id (station_id),
ADD CONSTRAINT fk_bills_station
    FOREIGN KEY (station_id) REFERENCES stations(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 8: Add station_id to queue table
ALTER TABLE queue
ADD COLUMN station_id INT NULL AFTER id,
ADD INDEX idx_queue_station_id (station_id),
ADD CONSTRAINT fk_queue_station
    FOREIGN KEY (station_id) REFERENCES stations(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 9: Add station_id to active_tables table
ALTER TABLE active_tables
ADD COLUMN station_id INT NULL AFTER active_id,
ADD INDEX idx_active_tables_station_id (station_id),
ADD CONSTRAINT fk_active_tables_station
    FOREIGN KEY (station_id) REFERENCES stations(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 10: Add station_id to games table (each station can have its own games/pricing)
ALTER TABLE games
ADD COLUMN station_id INT NULL AFTER game_id,
ADD INDEX idx_games_station_id (station_id),
ADD CONSTRAINT fk_games_station
    FOREIGN KEY (station_id) REFERENCES stations(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 11: Add station_id to owner_settings (per-station settings)
ALTER TABLE owner_settings
ADD COLUMN station_id INT NULL AFTER id,
DROP INDEX setting_key,
ADD UNIQUE INDEX idx_owner_settings_key_station (setting_key, station_id),
ADD INDEX idx_owner_settings_station_id (station_id),
ADD CONSTRAINT fk_owner_settings_station
    FOREIGN KEY (station_id) REFERENCES stations(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 12: Add owner_user_id to stations table (link station to owner user)
ALTER TABLE stations
ADD COLUMN owner_user_id INT NULL AFTER id,
ADD INDEX idx_stations_owner_user_id (owner_user_id),
ADD CONSTRAINT fk_stations_owner_user
    FOREIGN KEY (owner_user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================
-- Run these after migration to verify columns were added

-- SELECT 'users' as tbl, COUNT(*) as rows_affected FROM users WHERE station_id IS NULL;
-- SELECT 'menuitems' as tbl, COUNT(*) as rows_affected FROM menuitems WHERE station_id IS NULL;
-- SELECT 'tables' as tbl, COUNT(*) as rows_affected FROM tables WHERE station_id IS NULL;
-- SELECT 'orders' as tbl, COUNT(*) as rows_affected FROM orders WHERE station_id IS NULL;
-- SELECT 'inventory' as tbl, COUNT(*) as rows_affected FROM inventory WHERE station_id IS NULL;

-- =============================================
-- DATA MIGRATION (OPTIONAL)
-- =============================================
-- If you have existing data, you'll need to assign it to a default station
-- First create a default station, then update all records

-- Example: Create a default station for existing data
-- INSERT INTO stations (station_name, location_city, location_state, owner_name, owner_phone, subscription_type, subscription_status)
-- VALUES ('Default Station', 'Your City', 'Your State', 'Admin', '0000000000', 'basic', 'active');

-- Then update all existing records to belong to this station
-- SET @default_station_id = LAST_INSERT_ID();
-- UPDATE users SET station_id = @default_station_id WHERE station_id IS NULL AND role IN ('owner', 'staff');
-- UPDATE menuitems SET station_id = @default_station_id WHERE station_id IS NULL;
-- UPDATE tables SET station_id = @default_station_id WHERE station_id IS NULL;
-- UPDATE orders SET station_id = @default_station_id WHERE station_id IS NULL;
-- UPDATE inventory SET station_id = @default_station_id WHERE station_id IS NULL;
-- UPDATE reservations SET station_id = @default_station_id WHERE station_id IS NULL;
-- UPDATE bills SET station_id = @default_station_id WHERE station_id IS NULL;
-- UPDATE queue SET station_id = @default_station_id WHERE station_id IS NULL;
-- UPDATE active_tables SET station_id = @default_station_id WHERE station_id IS NULL;
-- UPDATE games SET station_id = @default_station_id WHERE station_id IS NULL;
-- UPDATE owner_settings SET station_id = @default_station_id WHERE station_id IS NULL;
