-- Recreate inventory table to ensure correct schema
DROP TABLE IF EXISTS inventory CASCADE;
DROP TYPE IF EXISTS inventory_category_enum;

CREATE TABLE inventory (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
  itemname VARCHAR(100) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Cafe Asset', 'Packed Food', 'Prepared Food', 'Sticks', 'Tables', 'Other')),
  currentquantity INTEGER NOT NULL DEFAULT 0,
  minimumthreshold INTEGER NOT NULL DEFAULT 10,
  unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
  costperunit DECIMAL(10,2),
  supplier VARCHAR(100),
  description TEXT,
  lastrestocked TIMESTAMP WITH TIME ZONE,
  isactive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Associate inventory items with stations for multi-tenancy
CREATE INDEX idx_inventory_station ON inventory(station_id);
