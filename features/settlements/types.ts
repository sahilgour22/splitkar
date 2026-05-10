export interface RecordSettlementInput {
  group_id: string;
  payer_id: string;
  payee_id: string;
  amount: number; // paise
  note?: string | null;
  method: 'cash' | 'upi';
  upi_ref?: string | null;
}

export interface SettlementWithUsers {
  id: string;
  group_id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  currency: string;
  note: string | null;
  method: 'cash' | 'upi';
  upi_ref: string | null;
  settled_at: string;
  created_by: string;
  payer: { id: string; name: string | null; avatar_url: string | null } | null;
  payee: { id: string; name: string | null; avatar_url: string | null } | null;
}
