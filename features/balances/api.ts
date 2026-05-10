import { supabase } from '@/lib/supabase';
import type { Debt } from './simplify';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase.rpc.bind(supabase) as (fn: string, args?: Record<string, unknown>) => any;

interface ComputeBalancesRow {
  debtor_id: string;
  creditor_id: string;
  amount: string | number; // Postgres BIGINT comes back as string in some drivers
}

export async function fetchGroupBalances(groupId: string): Promise<{
  data: Debt[] | null;
  error: string | null;
}> {
  const { data, error } = await rpc('compute_balances', { p_group_id: groupId });

  if (error) return { data: null, error: error.message };

  const rows = (data ?? []) as ComputeBalancesRow[];
  const debts: Debt[] = rows.map((row) => ({
    debtor_id: row.debtor_id,
    creditor_id: row.creditor_id,
    amount: BigInt(row.amount),
  }));

  return { data: debts, error: null };
}
