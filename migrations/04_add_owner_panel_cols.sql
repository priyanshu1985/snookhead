-- Add owner panel columns to users table if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'ownerpanelpassword') THEN
        ALTER TABLE users ADD COLUMN ownerpanelpassword VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'ownerpanelsetup') THEN
        ALTER TABLE users ADD COLUMN ownerpanelsetup BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
