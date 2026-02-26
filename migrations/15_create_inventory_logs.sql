-- Create inventory_logs table
CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    menu_item_id INTEGER REFERENCES menuitems(id),
    item_name TEXT NOT NULL,
    category TEXT,
    station_id INTEGER, -- Assuming station association exists, usually handled via RLS or application logic
    action TEXT NOT NULL CHECK (action IN ('ADD', 'DEDUCT', 'SET', 'EDIT')),
    quantity_change DECIMAL(10, 2) NOT NULL DEFAULT 0,
    previous_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
    new_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
    reason TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_inventory_logs_station_id ON inventory_logs(station_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_menu_item_id ON inventory_logs(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs(created_at);
