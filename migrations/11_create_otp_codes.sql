-- Create table for storing email OTP codes
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    attempts INT DEFAULT 0
);

-- Index for fast lookup by email
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON public.otp_codes(email);

-- Index for cleanup of expired codes
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON public.otp_codes(expires_at);
