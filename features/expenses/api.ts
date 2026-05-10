import { supabase } from '@/lib/supabase';
import type { Result, ExpenseWithDetails, CreateExpenseInput, UpdateExpenseInput } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase.rpc.bind(supabase) as (fn: string, args?: Record<string, unknown>) => any;

function rpcError(msg: string | undefined): string {
  // Surface human-readable message from the DB exception prefix (e.g. "splits_mismatch: ...")
  const raw = msg ?? 'Unknown error';
  const colonIdx = raw.indexOf(':');
  if (colonIdx > 0 && colonIdx < 40) {
    const code = raw.slice(0, colonIdx).trim();
    const detail = raw.slice(colonIdx + 1).trim();
    switch (code) {
      case 'splits_mismatch':
        return `Split amounts don't add up to the expense total. ${detail}`;
      case 'not_a_member':
        return 'You are not a member of this group.';
      case 'payer_not_a_member':
        return 'The selected payer is not in this group.';
      case 'split_user_not_a_member':
        return `A split participant is not in this group: ${detail}`;
      case 'expense_not_found':
        return 'This expense no longer exists.';
      case 'not_authorized':
        return 'Only the creator or a group admin can do this.';
      default:
        return raw;
    }
  }
  return raw;
}

// ─── list ─────────────────────────────────────────────────────────────────────

export async function fetchGroupExpenses(groupId: string): Promise<Result<ExpenseWithDetails[]>> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, payer:paid_by(id,name,avatar_url), splits:expense_splits(*)')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('expense_date', { ascending: false })
    .returns<ExpenseWithDetails[]>();

  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}

// ─── detail ───────────────────────────────────────────────────────────────────

export async function fetchExpense(expenseId: string): Promise<Result<ExpenseWithDetails>> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, payer:paid_by(id,name,avatar_url), splits:expense_splits(*)')
    .eq('id', expenseId)
    .eq('is_deleted', false)
    .single()
    .returns<ExpenseWithDetails>();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Expense not found' };
  return { data, error: null };
}

// ─── create ───────────────────────────────────────────────────────────────────

export async function apiCreateExpense(input: CreateExpenseInput): Promise<Result<string>> {
  const { data, error } = (await rpc('create_expense_with_splits', {
    p_group_id: input.group_id,
    p_description: input.description.trim(),
    p_amount: input.amount,
    p_currency: input.currency,
    p_paid_by: input.paid_by,
    p_split_type: input.split_type,
    p_expense_date: input.expense_date ?? null,
    p_note: input.note?.trim() || null,
    p_splits: input.splits,
  })) as { data: string | null; error: { message: string } | null };

  if (error) return { data: null, error: rpcError(error.message) };
  return { data: data as string, error: null };
}

// ─── update ───────────────────────────────────────────────────────────────────

export async function apiUpdateExpense(input: UpdateExpenseInput): Promise<Result<void>> {
  const { error } = (await rpc('update_expense_with_splits', {
    p_expense_id: input.expense_id,
    p_description: input.description.trim(),
    p_amount: input.amount,
    p_currency: input.currency,
    p_paid_by: input.paid_by,
    p_split_type: input.split_type,
    p_expense_date: input.expense_date ?? null,
    p_note: input.note?.trim() || null,
    p_splits: input.splits,
  })) as { error: { message: string } | null };

  if (error) return { data: null, error: rpcError(error.message) };
  return { data: undefined, error: null };
}

// ─── delete ───────────────────────────────────────────────────────────────────

export async function apiDeleteExpense(expenseId: string): Promise<Result<void>> {
  const { error } = (await rpc('delete_expense', {
    p_expense_id: expenseId,
  })) as { error: { message: string } | null };

  if (error) return { data: null, error: rpcError(error.message) };
  return { data: undefined, error: null };
}
