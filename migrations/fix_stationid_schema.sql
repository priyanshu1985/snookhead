-- Safe script to ensure stationid infrastructure exists and refresh cache
DO $$
BEGIN
    -- 1. Ensure column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'stationid') THEN
        ALTER TABLE transactions ADD COLUMN stationid INT NULL;
    END IF;

    -- 2. Ensure Foreign Key constraint exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_transactions_station') THEN
        ALTER TABLE transactions ADD CONSTRAINT fk_transactions_station 
        FOREIGN KEY (stationid) REFERENCES stations(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- 3. Ensure Index exists (CREATE INDEX IF NOT EXISTS is supported in modern Postgres)
CREATE INDEX IF NOT EXISTS idx_transactions_stationid ON transactions(stationid);

-- 4. CRITICAL: Refresh Supabase schema cache
NOTIFY pgrst, 'reload schema';
