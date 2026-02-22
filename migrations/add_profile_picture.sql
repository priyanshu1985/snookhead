-- Add profile_picture column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_picture character varying(255) NULL;
