-- Add UPI ID column to users table
-- Users can optionally store their UPI VPA so group members can pay them directly

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- Partial index: only index rows where upi_id is set (for future lookup)
CREATE INDEX IF NOT EXISTS idx_users_upi_id ON public.users(upi_id) WHERE upi_id IS NOT NULL;
