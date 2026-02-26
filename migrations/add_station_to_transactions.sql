-- Add stationid column to transactions table
ALTER TABLE transactions
ADD COLUMN stationid INT NULL;

-- Add foreign key relationship (optional, but good for integrity)
-- Note: Assuming 'stations' table exists and 'id' is its primary key
ALTER TABLE transactions
ADD CONSTRAINT fk_transactions_station
FOREIGN KEY (stationid) REFERENCES stations(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Create an index for performance
CREATE INDEX idx_transactions_stationid ON transactions(stationid);
