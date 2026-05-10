-- ============================================================
-- Splitkar! — Migration: Tighten splits validation + Expense RPCs
-- 2026-05-08
--
-- Changes:
--   1. Replace validate_splits() with a strict CONSTRAINT TRIGGER
--      (DEFERRABLE INITIALLY DEFERRED) — fires at commit, not per-row.
--      New check: ABS(SUM(splits) - expense.amount) <= 1 paise.
--   2. RPC: create_expense_with_splits
--   3. RPC: update_expense_with_splits
--   4. RPC: delete_expense
--
-- Apply via: Supabase Dashboard → SQL Editor → Run
-- ============================================================


-- ============================================================
-- 1. REPLACE validate_splits() WITH STRICT CONSTRAINT TRIGGER
--
-- Bug in old trigger: only raised if splits_total > expense_total,
-- allowing under-allocation (splits sum < expense leaves money
-- unaccounted for).
--
-- Fix: strict equality with 1 paise rounding tolerance (to absorb
-- remainder in percentage/shares splits before the API layer
-- applies the largest-remainder correction to the payer's row).
--
-- DEFERRABLE INITIALLY DEFERRED means the trigger fires once per
-- modified row at COMMIT, not immediately after each INSERT/UPDATE/
-- DELETE statement. This lets the RPC insert all splits inside one
-- transaction before the check runs.
-- ============================================================

-- Drop old immediate per-row trigger
DROP TRIGGER IF EXISTS trg_validate_splits ON public.expense_splits;

-- Replace function with strict version
CREATE OR REPLACE FUNCTION validate_splits()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_expense_id  UUID;
  v_expense_amt BIGINT;
  v_splits_sum  BIGINT;
BEGIN
  v_expense_id := CASE TG_OP
                    WHEN 'DELETE' THEN OLD.expense_id
                    ELSE NEW.expense_id
                  END;

  SELECT amount INTO v_expense_amt
  FROM   public.expenses
  WHERE  id = v_expense_id
    AND  NOT is_deleted;

  -- Soft-deleted expenses are frozen; skip validation so that the
  -- historical split rows remain intact without re-triggering.
  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_splits_sum
  FROM   public.expense_splits
  WHERE  expense_id = v_expense_id;

  IF ABS(v_splits_sum - v_expense_amt) > 1 THEN
    RAISE EXCEPTION
      'splits_mismatch: splits sum (% paise) != expense total (% paise); '
      'difference of % paise exceeds 1 paise rounding tolerance. '
      'Use largest-remainder method to assign the remainder to the payer''s split row.',
      v_splits_sum, v_expense_amt, ABS(v_splits_sum - v_expense_amt);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create replacement as a CONSTRAINT TRIGGER so it can be deferred.
-- Fires once per row at COMMIT, covering INSERT, UPDATE, and DELETE.
-- A direct single-split deletion that would break the sum is also caught.
CREATE CONSTRAINT TRIGGER trg_validate_splits
  AFTER INSERT OR UPDATE OR DELETE ON public.expense_splits
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION validate_splits();

-- ============================================================
-- SELF-TEST (run manually in SQL Editor to verify the trigger)
-- ============================================================
--
-- PASS — sum matches exactly:
--
--   BEGIN;
--     INSERT INTO public.expenses
--       (group_id, description, amount, currency, paid_by, split_type, created_by)
--     VALUES
--       ('<group_uuid>', 'Test', 300, 'INR', '<user_uuid>', 'equal', '<user_uuid>')
--     RETURNING id;   -- copy as <expense_uuid>
--
--     INSERT INTO public.expense_splits (expense_id, user_id, amount)
--     VALUES ('<expense_uuid>', '<user_a_uuid>', 100),
--            ('<expense_uuid>', '<user_b_uuid>', 100),
--            ('<expense_uuid>', '<user_c_uuid>', 100);
--   COMMIT;   -- should succeed
--
-- FAIL — under-allocation (splits sum to 200, expense is 300):
--
--   BEGIN;
--     INSERT INTO public.expenses
--       (group_id, description, amount, currency, paid_by, split_type, created_by)
--     VALUES
--       ('<group_uuid>', 'Test bad', 300, 'INR', '<user_uuid>', 'equal', '<user_uuid>')
--     RETURNING id;
--
--     INSERT INTO public.expense_splits (expense_id, user_id, amount)
--     VALUES ('<expense_uuid>', '<user_a_uuid>', 100),
--            ('<expense_uuid>', '<user_b_uuid>', 100);
--   COMMIT;   -- must raise: splits_mismatch: splits sum (200 paise) != expense total (300 paise)
--
-- ============================================================


-- ============================================================
-- 2. create_expense_with_splits
--
-- Atomically inserts an expense row, all split rows, and an
-- activity log entry in one transaction.
-- The deferred constraint trigger validates the sum at COMMIT.
--
-- p_splits JSON schema (array):
--   [{
--     "user_id":     "<uuid>",
--     "amount":      <bigint paise>,   -- required; API layer computes this
--     "share_units": <numeric|null>,   -- non-null for split_type='shares'
--     "percentage":  <numeric|null>    -- non-null for split_type='percentage'
--   }]
--
-- The API layer MUST apply the largest-remainder method so that
-- SUM(amounts) == p_amount exactly before calling this RPC.
-- The 1-paise tolerance exists only to absorb floating-point
-- edge cases during conversion; the trigger will still reject
-- differences of 2+ paise.
--
-- Returns: new expense UUID
-- ============================================================
CREATE OR REPLACE FUNCTION create_expense_with_splits(
  p_group_id     UUID,
  p_description  TEXT,
  p_amount       BIGINT,
  p_currency     TEXT,
  p_paid_by      UUID,
  p_split_type   TEXT,
  p_expense_date TIMESTAMPTZ,
  p_note         TEXT,
  p_splits       JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_expense_id UUID;
  v_split      JSONB;
BEGIN
  -- ── Auth ──────────────────────────────────────────────────
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- ── Input validation ──────────────────────────────────────
  IF p_split_type NOT IN ('equal', 'exact', 'percentage', 'shares') THEN
    RAISE EXCEPTION 'invalid_split_type: %', p_split_type;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount: must be > 0 paise';
  END IF;

  IF jsonb_array_length(p_splits) = 0 THEN
    RAISE EXCEPTION 'no_splits: at least one split row is required';
  END IF;

  -- ── Membership checks ─────────────────────────────────────
  -- Caller must be a group member
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;

  -- Payer must be a group member
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_paid_by
  ) THEN
    RAISE EXCEPTION 'payer_not_a_member';
  END IF;

  -- Every split participant must be a group member
  FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = p_group_id
        AND user_id  = (v_split->>'user_id')::UUID
    ) THEN
      RAISE EXCEPTION 'split_user_not_a_member: %', v_split->>'user_id';
    END IF;
  END LOOP;

  -- ── Insert expense ────────────────────────────────────────
  INSERT INTO public.expenses (
    group_id, description, amount, currency,
    paid_by, split_type, note, expense_date, created_by
  )
  VALUES (
    p_group_id, p_description, p_amount, p_currency,
    p_paid_by, p_split_type, p_note,
    COALESCE(p_expense_date, now()), v_user_id
  )
  RETURNING id INTO v_expense_id;

  -- ── Insert splits ─────────────────────────────────────────
  -- trg_validate_splits fires at COMMIT and rolls back the
  -- entire transaction if ABS(SUM(splits) - expense.amount) > 1.
  FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits) LOOP
    INSERT INTO public.expense_splits (
      expense_id, user_id, amount, share_units, percentage
    )
    VALUES (
      v_expense_id,
      (v_split->>'user_id')::UUID,
      (v_split->>'amount')::BIGINT,
      (v_split->>'share_units')::NUMERIC,
      (v_split->>'percentage')::NUMERIC
    );
  END LOOP;

  -- ── Activity log ──────────────────────────────────────────
  INSERT INTO public.activities (group_id, actor_id, type, payload)
  VALUES (
    p_group_id,
    v_user_id,
    'expense_added',
    jsonb_build_object(
      'expense_id',      v_expense_id,
      'description',     p_description,
      'amount',          p_amount,
      'currency',        p_currency,
      'paid_by',         p_paid_by,
      'participant_ids', (
        SELECT jsonb_agg(user_id::text ORDER BY user_id)
        FROM   public.expense_splits
        WHERE  expense_id = v_expense_id
      )
    )
  );

  RETURN v_expense_id;
END;
$$;


-- ============================================================
-- 3. update_expense_with_splits
--
-- Atomically replaces an expense's header fields and all its
-- split rows, then logs an 'expense_edited' activity.
--
-- Strategy: DELETE all old splits + INSERT new splits inside
-- one transaction. The deferred constraint trigger fires at
-- COMMIT and sees only the new splits against the new
-- expense.amount, so it validates the final state correctly.
--
-- Authorization: caller must be the original creator OR a
-- group admin. Uses the is_group_admin() helper (which reads
-- auth.uid() internally).
--
-- Returns: void
-- ============================================================
CREATE OR REPLACE FUNCTION update_expense_with_splits(
  p_expense_id   UUID,
  p_description  TEXT,
  p_amount       BIGINT,
  p_currency     TEXT,
  p_paid_by      UUID,
  p_split_type   TEXT,
  p_expense_date TIMESTAMPTZ,
  p_note         TEXT,
  p_splits       JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_expense public.expenses;
  v_split   JSONB;
BEGIN
  -- ── Auth ──────────────────────────────────────────────────
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- ── Input validation ──────────────────────────────────────
  IF p_split_type NOT IN ('equal', 'exact', 'percentage', 'shares') THEN
    RAISE EXCEPTION 'invalid_split_type: %', p_split_type;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount: must be > 0 paise';
  END IF;

  IF jsonb_array_length(p_splits) = 0 THEN
    RAISE EXCEPTION 'no_splits: at least one split row is required';
  END IF;

  -- ── Fetch and authorise ───────────────────────────────────
  SELECT * INTO v_expense
  FROM   public.expenses
  WHERE  id = p_expense_id AND NOT is_deleted;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'expense_not_found';
  END IF;

  IF v_expense.created_by <> v_user_id AND NOT is_group_admin(v_expense.group_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- ── Membership checks ─────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = v_expense.group_id AND user_id = p_paid_by
  ) THEN
    RAISE EXCEPTION 'payer_not_a_member';
  END IF;

  FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = v_expense.group_id
        AND user_id  = (v_split->>'user_id')::UUID
    ) THEN
      RAISE EXCEPTION 'split_user_not_a_member: %', v_split->>'user_id';
    END IF;
  END LOOP;

  -- ── Update expense header ─────────────────────────────────
  UPDATE public.expenses SET
    description  = p_description,
    amount       = p_amount,
    currency     = p_currency,
    paid_by      = p_paid_by,
    split_type   = p_split_type,
    note         = p_note,
    expense_date = COALESCE(p_expense_date, expense_date)
  WHERE id = p_expense_id;

  -- ── Replace splits atomically ─────────────────────────────
  -- DELETE queues deferred trigger rows; INSERT queues more.
  -- At COMMIT, all queued trigger rows see the final DB state
  -- (new expense.amount, new splits only) and validate it.
  DELETE FROM public.expense_splits WHERE expense_id = p_expense_id;

  FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits) LOOP
    INSERT INTO public.expense_splits (
      expense_id, user_id, amount, share_units, percentage
    )
    VALUES (
      p_expense_id,
      (v_split->>'user_id')::UUID,
      (v_split->>'amount')::BIGINT,
      (v_split->>'share_units')::NUMERIC,
      (v_split->>'percentage')::NUMERIC
    );
  END LOOP;

  -- ── Activity log ──────────────────────────────────────────
  INSERT INTO public.activities (group_id, actor_id, type, payload)
  VALUES (
    v_expense.group_id,
    v_user_id,
    'expense_edited',
    jsonb_build_object(
      'expense_id',      p_expense_id,
      'description',     p_description,
      'amount',          p_amount,
      'currency',        p_currency,
      'paid_by',         p_paid_by,
      'participant_ids', (
        SELECT jsonb_agg(user_id::text ORDER BY user_id)
        FROM   public.expense_splits
        WHERE  expense_id = p_expense_id
      )
    )
  );
END;
$$;


-- ============================================================
-- 4. delete_expense
--
-- Soft-deletes an expense (sets is_deleted=true) and logs the
-- deletion. Splits are NOT removed — they are preserved so
-- compute_balances() can reference them for audit/history.
-- compute_balances() already filters WHERE NOT e.is_deleted,
-- so deleted expenses no longer affect live balances.
--
-- Authorization: original creator OR group admin.
--
-- Returns: void
-- ============================================================
CREATE OR REPLACE FUNCTION delete_expense(p_expense_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_expense public.expenses;
BEGIN
  -- ── Auth ──────────────────────────────────────────────────
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- ── Fetch and authorise ───────────────────────────────────
  SELECT * INTO v_expense
  FROM   public.expenses
  WHERE  id = p_expense_id AND NOT is_deleted;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'expense_not_found';
  END IF;

  IF v_expense.created_by <> v_user_id AND NOT is_group_admin(v_expense.group_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- ── Soft-delete ───────────────────────────────────────────
  UPDATE public.expenses SET
    is_deleted = TRUE,
    deleted_at = now(),
    deleted_by = v_user_id
  WHERE id = p_expense_id;

  -- ── Activity log ──────────────────────────────────────────
  INSERT INTO public.activities (group_id, actor_id, type, payload)
  VALUES (
    v_expense.group_id,
    v_user_id,
    'expense_deleted',
    jsonb_build_object(
      'expense_id',  p_expense_id,
      'description', v_expense.description,
      'amount',      v_expense.amount,
      'currency',    v_expense.currency,
      'paid_by',     v_expense.paid_by
    )
  );
END;
$$;
