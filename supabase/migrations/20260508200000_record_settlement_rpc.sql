-- record_settlement RPC
-- Records a settlement between two group members and logs an activity row.
-- Called from the client; never called with raw SQL outside of tests.

DROP FUNCTION IF EXISTS record_settlement(UUID, UUID, UUID, BIGINT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION record_settlement(
  p_group_id  UUID,
  p_payer_id  UUID,   -- person who paid (debtor clearing their debt)
  p_payee_id  UUID,   -- person who received (creditor)
  p_amount    BIGINT, -- paise; must be > 0
  p_note      TEXT    DEFAULT NULL,
  p_method    TEXT    DEFAULT 'cash',  -- 'cash' | 'upi'
  p_upi_ref   TEXT    DEFAULT NULL     -- UPI transaction reference
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_settlement_id UUID;
  v_currency      TEXT;
BEGIN
  -- Basic validation
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount_must_be_positive' USING ERRCODE = 'P0001';
  END IF;

  IF p_payer_id = p_payee_id THEN
    RAISE EXCEPTION 'self_settlement_not_allowed' USING ERRCODE = 'P0001';
  END IF;

  -- Caller must be a group member
  IF NOT EXISTS (
    SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_a_member' USING ERRCODE = 'P0001';
  END IF;

  -- Payer must be a group member
  IF NOT EXISTS (
    SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = p_payer_id
  ) THEN
    RAISE EXCEPTION 'payer_not_a_member' USING ERRCODE = 'P0001';
  END IF;

  -- Payee must be a group member
  IF NOT EXISTS (
    SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = p_payee_id
  ) THEN
    RAISE EXCEPTION 'payee_not_a_member' USING ERRCODE = 'P0001';
  END IF;

  -- Resolve group currency
  SELECT currency INTO v_currency FROM groups WHERE id = p_group_id;

  -- Insert settlement (immutable — no UPDATE/DELETE RLS on settlements)
  INSERT INTO settlements (
    group_id, payer_id, payee_id, amount, currency, note, upi_ref, created_by
  ) VALUES (
    p_group_id, p_payer_id, p_payee_id, p_amount, v_currency, p_note, p_upi_ref, auth.uid()
  )
  RETURNING id INTO v_settlement_id;

  -- Log activity
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

-- Diagnostic query (run after applying to verify):
-- SELECT routine_name, security_type FROM information_schema.routines
-- WHERE routine_schema='public' AND routine_name='record_settlement';
