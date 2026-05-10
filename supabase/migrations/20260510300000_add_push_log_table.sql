-- push_log: audit trail for every push notification attempt.
-- Written by the send_push_on_activity edge function (service role).
-- Idempotency: edge function checks (activity_id, user_id) before sending.

CREATE TABLE IF NOT EXISTS public.push_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID        NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.users(id)      ON DELETE CASCADE,
  token       TEXT        NOT NULL,
  status      TEXT        NOT NULL,   -- 'ok' | 'error' | 'unknown'
  error       TEXT,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_log_activity_id ON public.push_log(activity_id);
CREATE INDEX IF NOT EXISTS idx_push_log_user_id     ON public.push_log(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_log_activity_user
  ON public.push_log(activity_id, user_id);

-- Service role bypasses RLS; no user-facing read policy for v1.
ALTER TABLE public.push_log ENABLE ROW LEVEL SECURITY;
