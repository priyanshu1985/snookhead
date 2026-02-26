-- Backend migration script to create the menu_item_variations table in Supabase PostgreSQL

CREATE TABLE IF NOT EXISTS menu_item_variations (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER NOT NULL REFERENCES menuitems(id) ON DELETE CASCADE,
    variation_name VARCHAR(100) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2) NOT NULL,
    inventory_multiplier DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add an index on menu_item_id for quick retrieval when loading menu items
CREATE INDEX IF NOT EXISTS idx_menu_item_variations_item_id ON menu_item_variations(menu_item_id);

-- Optional: If you want to ensure the same variation name isn't added twice for the same item
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_variation_per_item ON menu_item_variations(menu_item_id, LOWER(variation_name));
