-- Add durationminutes to activetables if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activetables' AND column_name = 'durationminutes') THEN
        ALTER TABLE activetables ADD COLUMN durationminutes INTEGER;
    END IF;
END $$;

-- Add bookingendtime to activetables if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activetables' AND column_name = 'bookingendtime') THEN
        ALTER TABLE activetables ADD COLUMN bookingendtime TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Ensure session_id exists in orders
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'session_id') THEN
        ALTER TABLE orders ADD COLUMN session_id INTEGER;
    END IF;
END $$;

-- Ensure order_source exists in orders
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_source') THEN
        ALTER TABLE orders ADD COLUMN order_source VARCHAR(50) DEFAULT 'table_booking';
    END IF;
END $$;
