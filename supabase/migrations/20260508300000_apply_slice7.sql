-- ============================================================
-- Slice 7 migrations — run this in Supabase SQL Editor
-- Combines: upi_id on users + method on settlements + updated RPC
-- ============================================================

-- 1. Add upi_id to users (if not already present)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS upi_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_upi_id
  ON public.users(upi_id) WHERE upi_id IS NOT NULL;

-- 2. Add method column to settlements (if not already present)
ALTER TABLE public.settlements
  ADD COLUMN IF NOT EXISTS method TEXT NOT NULL DEFAULT 'cash'
    CHECK (method IN ('cash', 'upi'));

-- 3. Update record_settlement RPC to persist method
DROP FUNCTION IF EXISTS record_settlement(UUID, UUID, UUID, BIGINT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION record_settlement(
  p_group_id  UUID,
  p_payer_id  UUID,
  p_payee_id  UUID,
  p_amount    BIGINT,
  p_note      TEXT    DEFAULT NULL,
  p_method    TEXT    DEFAULT 'cash',
  p_upi_ref   TEXT    DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_settlement_id UUID;
  v_currency      TEXT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount_must_be_positive' USING ERRCODE = 'P0001';
  END IF;

  IF p_payer_id = p_payee_id THEN
    RAISE EXCEPTION 'self_settlement_not_allowed' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_a_member' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = p_payer_id
  ) THEN
    RAISE EXCEPTION 'payer_not_a_member' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = p_payee_id
  ) THEN
    RAISE EXCEPTION 'payee_not_a_member' USING ERRCODE = 'P0001';
  END IF;

  SELECT currency INTO v_currency FROM groups WHERE id = p_group_id;

  INSERT INTO settlements (
    group_id, payer_id, payee_id, amount, currency, note, method, upi_ref, created_by
  ) VALUES (
    p_group_id, p_payer_id, p_payee_id, p_amount, v_currency,
    p_note, p_method, p_upi_ref, auth.uid()
  )
  RETURNING id INTO v_settlement_id;

  INSERT INTO activities (group_id, actor_id, type, payload)
  VALUES (
    p_group_id,
    auth.uid(),
    'settlement_recorded',
    jsonb_build_object(
      'settlement_id', v_settlement_id,
      'payer_id',      p_payer_id,
      'payee_id',      p_payee_id,
      'amount',        p_amount,
      'method',        p_method
    )
  );

  RETURN v_settlement_id;
END;
$$;
