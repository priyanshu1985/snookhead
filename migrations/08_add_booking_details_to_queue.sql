-- Add booking details columns to queue table
ALTER TABLE "queue" ADD COLUMN IF NOT EXISTS "booking_type" VARCHAR(50);
ALTER TABLE "queue" ADD COLUMN IF NOT EXISTS "duration_minutes" INTEGER;
ALTER TABLE "queue" ADD COLUMN IF NOT EXISTS "frame_count" INTEGER;
ALTER TABLE "queue" ADD COLUMN IF NOT EXISTS "set_time" VARCHAR(50);
