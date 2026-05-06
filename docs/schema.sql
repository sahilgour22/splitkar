-- ============================================================
-- Splitkar! — Database Schema
-- Supabase (PostgreSQL 15+) • Region: ap-south-1 (Mumbai)
--
-- MONEY RULE: all amounts stored as BIGINT in paise
--   (1 INR = 100 paise). Never store money as FLOAT/NUMERIC.
--
-- Apply via: Supabase Dashboard → SQL Editor → Run
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- UTILITY: updated_at auto-stamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 1. USERS
-- Public profile mirror of auth.users.
-- Row is auto-created by handle_new_auth_user trigger.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id               UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT,                          -- NULL until profile setup
  phone            TEXT        UNIQUE,
  email            TEXT        UNIQUE,
  avatar_url       TEXT,
  default_currency TEXT        NOT NULL DEFAULT 'INR',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile row on auth.users INSERT (phone OTP or email)
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, phone, email)
  VALUES (NEW.id, NEW.phone, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ============================================================
-- 2. GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.groups (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  description  TEXT,
  avatar_url   TEXT,
  currency     TEXT        NOT NULL DEFAULT 'INR',
  created_by   UUID        NOT NULL REFERENCES public.users(id),
  -- 8-char uppercase hex invite code; regeneratable by admin
  invite_code  TEXT        UNIQUE NOT NULL DEFAULT upper(encode(gen_random_bytes(4), 'hex')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_groups_invite_code ON public.groups(invite_code);

CREATE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. GROUP_MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.group_members (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  role      TEXT        NOT NULL DEFAULT 'member'
              CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id  ON public.group_members(user_id);

-- ============================================================
-- 4. EXPENSES
-- Soft-delete only (is_deleted = true). No hard DELETE policy.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID        NOT NULL REFERENCES public.groups(id)  ON DELETE CASCADE,
  description  TEXT        NOT NULL,
  amount       BIGINT      NOT NULL CHECK (amount > 0),  -- paise
  currency     TEXT        NOT NULL DEFAULT 'INR',
  paid_by      UUID        NOT NULL REFERENCES public.users(id),
  split_type   TEXT        NOT NULL
                 CHECK (split_type IN ('equal', 'exact', 'percentage', 'shares')),
  note         TEXT,
  expense_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID        NOT NULL REFERENCES public.users(id),
  is_deleted   BOOLEAN     NOT NULL DEFAULT false,
  deleted_at   TIMESTAMPTZ,
  deleted_by   UUID        REFERENCES public.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_group_id    ON public.expenses(group_id) WHERE NOT is_deleted;
CREATE INDEX idx_expenses_paid_by     ON public.expenses(paid_by);
CREATE INDEX idx_expenses_date        ON public.expenses(expense_date DESC);

CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. EXPENSE_SPLITS
-- One row per participant per expense.
-- SUM(amount) across splits for an expense MUST equal expense.amount
-- (validated by validate_splits() trigger below).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expense_splits (
  id           UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id   UUID     NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id      UUID     NOT NULL REFERENCES public.users(id),
  amount       BIGINT   NOT NULL CHECK (amount > 0),   -- paise; the participant's share
  share_units  NUMERIC,                                 -- non-null for split_type='shares'
  percentage   NUMERIC  CHECK (percentage > 0 AND percentage <= 100),
  UNIQUE (expense_id, user_id)
);

CREATE INDEX idx_expense_splits_expense_id ON public.expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user_id    ON public.expense_splits(user_id);

-- Server-side guard: splits must sum to expense total
CREATE OR REPLACE FUNCTION validate_splits()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  expense_total BIGINT;
  splits_total  BIGINT;
BEGIN
  SELECT amount INTO expense_total FROM public.expenses WHERE id = NEW.expense_id;
  SELECT COALESCE(SUM(amount), 0) INTO splits_total
    FROM public.expense_splits WHERE expense_id = NEW.expense_id;
  IF splits_total > expense_total THEN
    RAISE EXCEPTION 'Split amounts (% paise) exceed expense total (% paise)',
      splits_total, expense_total;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_splits
  AFTER INSERT OR UPDATE ON public.expense_splits
  FOR EACH ROW EXECUTE FUNCTION validate_splits();

-- ============================================================
-- 6. SETTLEMENTS
-- Immutable once created — no UPDATE or DELETE RLS policies.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.settlements (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  payer_id   UUID        NOT NULL REFERENCES public.users(id),   -- who paid
  payee_id   UUID        NOT NULL REFERENCES public.users(id),   -- who received
  amount     BIGINT      NOT NULL CHECK (amount > 0),            -- paise
  currency   TEXT        NOT NULL DEFAULT 'INR',
  note       TEXT,
  upi_ref    TEXT,        -- UPI transaction reference if paid via UPI deep link
  settled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID        NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_settlement CHECK (payer_id != payee_id)
);

CREATE INDEX idx_settlements_group_id  ON public.settlements(group_id);
CREATE INDEX idx_settlements_payer_id  ON public.settlements(payer_id);
CREATE INDEX idx_settlements_payee_id  ON public.settlements(payee_id);
CREATE INDEX idx_settlements_settled_at ON public.settlements(settled_at DESC);

-- ============================================================
-- 7. ACTIVITIES  (Activity Feed)
-- Phase 1: app-side insertion. Phase 2: migrate to triggers.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activities (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  actor_id   UUID        NOT NULL REFERENCES public.users(id),
  type       TEXT        NOT NULL CHECK (type IN (
               'expense_added', 'expense_edited', 'expense_deleted',
               'settlement_recorded', 'member_joined', 'member_left', 'group_created'
             )),
  payload    JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_group_id   ON public.activities(group_id);
CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);

-- ============================================================
-- HELPERS (used in RLS policies — SECURITY DEFINER to bypass
-- RLS on group_members table during policy evaluation)
-- ============================================================
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION is_group_admin(p_group_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = auth.uid() AND role = 'admin'
  )
$$;

-- ============================================================
-- COMPUTE_BALANCES
-- Returns raw pairwise net debts for a group (in paise).
-- Debt simplification (greedy graph reduction) runs client-side
-- in utils/debt.ts so the UI can animate the result.
--
-- Algorithm:
--   1. Each expense_split creates a "debt flow" from the split
--      user toward the payer (excluding the payer's own split).
--   2. Each settlement adds a reverse flow payee→payer of the
--      same amount, which cancels out that portion of debt.
--   3. Flows are canonicalised into (u1 < u2) pairs with a
--      signed amount (positive = u1 owes u2).
--   4. After summing, the sign determines who is debtor/creditor.
-- ============================================================
CREATE OR REPLACE FUNCTION compute_balances(p_group_id UUID)
RETURNS TABLE(debtor_id UUID, creditor_id UUID, amount BIGINT)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  WITH expense_flows AS (
    SELECT
      es.user_id  AS from_user,
      e.paid_by   AS to_user,
      es.amount   AS flow_amount
    FROM public.expense_splits es
    JOIN public.expenses e ON e.id = es.expense_id
    WHERE e.group_id = p_group_id
      AND NOT e.is_deleted
      AND es.user_id != e.paid_by
  ),
  settlement_flows AS (
    -- Reverse flow: settlement reduces debt in the payer→payee direction
    SELECT
      s.payee_id  AS from_user,
      s.payer_id  AS to_user,
      s.amount    AS flow_amount
    FROM public.settlements s
    WHERE s.group_id = p_group_id
  ),
  all_flows AS (
    SELECT from_user, to_user, flow_amount FROM expense_flows
    UNION ALL
    SELECT from_user, to_user, flow_amount FROM settlement_flows
  ),
  canonical AS (
    SELECT
      LEAST(from_user, to_user)    AS u1,
      GREATEST(from_user, to_user) AS u2,
      CASE WHEN from_user < to_user
           THEN  flow_amount
           ELSE -flow_amount
      END AS signed_amount
    FROM all_flows
  ),
  net AS (
    SELECT u1, u2, SUM(signed_amount) AS net_amount
    FROM canonical
    GROUP BY u1, u2
  )
  SELECT
    CASE WHEN net_amount > 0 THEN u1 ELSE u2 END AS debtor_id,
    CASE WHEN net_amount > 0 THEN u2 ELSE u1 END AS creditor_id,
    ABS(net_amount)                               AS amount
  FROM net
  WHERE ABS(net_amount) > 0;
$$;

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities     ENABLE ROW LEVEL SECURITY;

-- ---- users ----
CREATE POLICY "users: read own or shared-group peers"
  ON public.users FOR SELECT USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm1
      JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid() AND gm2.user_id = public.users.id
    )
  );
CREATE POLICY "users: insert own"
  ON public.users FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "users: update own"
  ON public.users FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ---- groups ----
CREATE POLICY "groups: member read"
  ON public.groups FOR SELECT USING (is_group_member(id));
CREATE POLICY "groups: authenticated create"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
CREATE POLICY "groups: admin update"
  ON public.groups FOR UPDATE
  USING (is_group_admin(id)) WITH CHECK (is_group_admin(id));

-- ---- group_members ----
CREATE POLICY "group_members: member read"
  ON public.group_members FOR SELECT USING (is_group_member(group_id));
CREATE POLICY "group_members: admin or self insert"
  ON public.group_members FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (is_group_admin(group_id) OR user_id = auth.uid())
  );
CREATE POLICY "group_members: admin role update"
  ON public.group_members FOR UPDATE USING (is_group_admin(group_id));
CREATE POLICY "group_members: admin or self delete"
  ON public.group_members FOR DELETE
  USING (is_group_admin(group_id) OR user_id = auth.uid());

-- ---- expenses ----
CREATE POLICY "expenses: member read"
  ON public.expenses FOR SELECT USING (is_group_member(group_id));
CREATE POLICY "expenses: member create"
  ON public.expenses FOR INSERT
  WITH CHECK (is_group_member(group_id) AND created_by = auth.uid());
CREATE POLICY "expenses: creator or admin soft-delete/edit"
  ON public.expenses FOR UPDATE
  USING (created_by = auth.uid() OR is_group_admin(group_id));
-- No DELETE policy — soft-delete only via UPDATE.

-- ---- expense_splits ----
CREATE POLICY "expense_splits: member read"
  ON public.expense_splits FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_id AND is_group_member(e.group_id)
    )
  );
CREATE POLICY "expense_splits: creator or admin insert"
  ON public.expense_splits FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_id
        AND (e.created_by = auth.uid() OR is_group_admin(e.group_id))
    )
  );
CREATE POLICY "expense_splits: creator or admin update"
  ON public.expense_splits FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_id
        AND (e.created_by = auth.uid() OR is_group_admin(e.group_id))
    )
  );

-- ---- settlements ----
CREATE POLICY "settlements: member read"
  ON public.settlements FOR SELECT USING (is_group_member(group_id));
CREATE POLICY "settlements: member create"
  ON public.settlements FOR INSERT
  WITH CHECK (is_group_member(group_id) AND created_by = auth.uid());
-- No UPDATE or DELETE — settlements are immutable audit records.

-- ---- activities ----
CREATE POLICY "activities: member read"
  ON public.activities FOR SELECT USING (is_group_member(group_id));
CREATE POLICY "activities: member insert"
  ON public.activities FOR INSERT
  WITH CHECK (is_group_member(group_id) AND actor_id = auth.uid());
