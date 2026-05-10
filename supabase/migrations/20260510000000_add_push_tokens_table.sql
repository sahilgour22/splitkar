-- push_tokens: stores Expo push tokens per device
-- One user can have multiple tokens (multiple devices).
-- Upsert on token column; update last_seen_at on re-registration.

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token        TEXT        NOT NULL UNIQUE,
  platform     TEXT        NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own push tokens"
  ON public.push_tokens FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
