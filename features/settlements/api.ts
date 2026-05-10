import { supabase } from '@/lib/supabase';
import type { RecordSettlementInput, SettlementWithUsers } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase.rpc.bind(supabase) as (fn: string, args?: Record<string, unknown>) => any;

export async function apiRecordSettlement(input: RecordSettlementInput): Promise<{
  data: string | null;
  error: string | null;
}> {
  const { data, error } = await rpc('record_settlement', {
    p_group_id: input.group_id,
    p_payer_id: input.payer_id,
    p_payee_id: input.payee_id,
    p_amount: input.amount,
    p_note: input.note ?? null,
    p_method: input.method,
    p_upi_ref: input.upi_ref ?? null,
  });

  if (error) {
    const msg: string = error.message ?? '';
    if (msg.includes('not_a_member')) return { data: null, error: 'not_a_member' };
    if (msg.includes('payer_not_a_member')) return { data: null, error: 'payer_not_a_member' };
    if (msg.includes('payee_not_a_member')) return { data: null, error: 'payee_not_a_member' };
    if (msg.includes('self_settlement_not_allowed'))
      return { data: null, error: 'self_settlement_not_allowed' };
    if (msg.includes('amount_must_be_positive'))
      return { data: null, error: 'amount_must_be_positive' };
    return { data: null, error: msg };
  }

  return { data: data as string, error: null };
}

export async function fetchGroupSettlements(groupId: string): Promise<{
  data: SettlementWithUsers[] | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('settlements')
    .select('*, payer:payer_id(id, name, avatar_url), payee:payee_id(id, name, avatar_url)')
    .eq('group_id', groupId)
    .order('settled_at', { ascending: false })
    .returns<SettlementWithUsers[]>();

  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}
