-- Add advance_payment field to active_tables
ALTER TABLE active_tables 
ADD COLUMN IF NOT EXISTS advance_payment DECIMAL(10, 2) DEFAULT 0;

-- Add reservation_id to track which reservation this session came from
ALTER TABLE active_tables 
ADD COLUMN IF NOT EXISTS reservation_id INTEGER;
