-- Track which activity the user last viewed in the global feed.
-- Used to compute the unread-activity badge count.
-- ON DELETE SET NULL: if the activity is somehow deleted, reset the pointer.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_seen_activity_id UUID
    REFERENCES public.activities(id) ON DELETE SET NULL;
