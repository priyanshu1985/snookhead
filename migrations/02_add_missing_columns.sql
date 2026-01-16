-- Add missing columns to the orders table

-- 1. Add session_id linked to active_tables (optional foreign key, generally Int)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS session_id INTEGER;

-- 2. Add table_id linked to tables (optional foreign key, generally Int)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_id INTEGER;

-- 3. Add order_source column. Using TEXT/VARCHAR is safer if the ENUM type is not created.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'table_booking';

-- Optional: If you want to create a foreign key constraint for session_id (uncomment if needed)
-- ALTER TABLE orders ADD CONSTRAINT fk_orders_session FOREIGN KEY (session_id) REFERENCES active_tables(active_id);
