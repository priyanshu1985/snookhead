-- Add email verification column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Create index for fast lookup of verified users
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON public.users(email_verified);

-- Update existing users to verified status (for backward compatibility)
-- Comment out the line below if you want existing users to re-verify
UPDATE public.users SET email_verified = true WHERE email_verified IS NULL;