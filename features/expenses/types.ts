import type { Result } from '@/features/groups/types';

export type { Result };

// ─── DB-shape types ───────────────────────────────────────────────────────────

export type SplitRow = {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number; // paise
  share_units: number | null;
  percentage: number | null;
};

export type PayerUser = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

/** Expense with denormalised payer + splits, as returned by the list/detail queries. */
export type ExpenseWithDetails = {
  id: string;
  group_id: string;
  description: string;
  amount: number; // total paise
  currency: string;
  paid_by: string;
  split_type: 'equal' | 'exact' | 'percentage' | 'shares';
  note: string | null;
  expense_date: string;
  created_by: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
  payer: PayerUser | null;
  splits: SplitRow[];
};

// ─── RPC input types ─────────────────────────────────────────────────────────

export type SplitInput = {
  user_id: string;
  amount: number; // paise
  share_units?: number | null;
  percentage?: number | null;
};

export type CreateExpenseInput = {
  group_id: string;
  description: string;
  amount: number; // total paise
  currency: string;
  paid_by: string;
  split_type: 'equal' | 'exact' | 'percentage' | 'shares';
  expense_date?: string | null;
  note?: string | null;
  splits: SplitInput[];
};

export type UpdateExpenseInput = Omit<CreateExpenseInput, 'group_id'> & {
  expense_id: string;
};

// ─── UI-layer types ───────────────────────────────────────────────────────────

export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

/**
 * Per-participant state used while the user is configuring splits in the form.
 * `amount` is always kept in sync (computed by the split utilities) so the
 * form can submit without extra computation.
 */
export type ParticipantSplit = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  included: boolean;
  amount: number; // paise (computed)
  exactStr: string; // rupees string for the Exact input
  percentage: number; // 0–100 for the Percentage input
  shares: number; // integer ≥ 1 for the Shares stepper
};
