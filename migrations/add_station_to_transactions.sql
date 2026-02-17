-- Add station_id to transactions table
ALTER TABLE transactions
ADD COLUMN station_id INT NULL,
ADD INDEX idx_transactions_station_id (station_id),
ADD CONSTRAINT fk_transactions_station
    FOREIGN KEY (station_id) REFERENCES stations(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
