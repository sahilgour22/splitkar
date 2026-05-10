-- Per-group notification preferences stored on the membership row.
-- Default TRUE so existing members keep receiving notifications.

ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;
