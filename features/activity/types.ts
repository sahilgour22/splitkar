export type ActivityType =
  | 'expense_added'
  | 'expense_edited'
  | 'expense_deleted'
  | 'settlement_recorded'
  | 'member_joined'
  | 'member_left'
  | 'group_created';

export interface ActivityPayload {
  expense_id?: string;
  description?: string;
  amount?: number;
  currency?: string;
  paid_by?: string;
  settlement_id?: string;
  payer_id?: string;
  payee_id?: string;
  method?: 'cash' | 'upi';
  group_name?: string;
  // Resolved at fetch time by the API layer
  payer_name?: string | null;
  payee_name?: string | null;
}

export interface ActivityWithActor {
  id: string;
  group_id: string;
  group_name?: string; // only populated in global feed
  actor_id: string;
  type: ActivityType;
  payload: ActivityPayload;
  created_at: string;
  actor: { id: string; name: string | null; avatar_url: string | null };
}

export interface ActivityPage {
  items: ActivityWithActor[];
  nextCursor: string | null; // created_at of last item; null = no more pages
}
