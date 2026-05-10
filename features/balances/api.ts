import { supabase } from '@/lib/supabase';
import type { Debt } from './simplify';

interface ComputeBalancesRow {
  debtor_id: string;
  creditor_id: string;
  amount: string | number; // Postgres BIGINT comes back as string in some drivers
}

export async function fetchGroupBalances(groupId: string): Promise<{
  data: Debt[] | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('compute_balances', { p_group_id: groupId } as Record<
    string,
    unknown
  >);

  if (error) return { data: null, error: error.message };

  const rows = (data ?? []) as ComputeBalancesRow[];
  const debts: Debt[] = rows.map((row) => ({
    debtor_id: row.debtor_id,
    creditor_id: row.creditor_id,
    amount: BigInt(row.amount),
  }));

  return { data: debts, error: null };
}
