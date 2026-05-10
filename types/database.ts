/**
 * Supabase database types.
 *
 * Regenerate after schema changes:
 *   npx supabase gen types typescript --project-id <project-id> > types/database.ts
 *
 * Until the CLI is wired up, types are hand-authored to match docs/schema.sql
 * and supabase/migrations/*.sql.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string | null;
          phone: string | null;
          email: string | null;
          avatar_url: string | null;
          default_currency: string;
          upi_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          default_currency?: string;
          upi_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          default_currency?: string;
          upi_id?: string | null;
          updated_at?: string;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          avatar_url: string | null;
          currency: string;
          created_by: string;
          invite_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          avatar_url?: string | null;
          currency?: string;
          created_by: string;
          invite_code?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          avatar_url?: string | null;
          currency?: string;
          invite_code?: string;
          updated_at?: string;
        };
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: 'admin' | 'member';
          joined_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          role?: 'admin' | 'member';
          joined_at?: string;
        };
        Update: {
          role?: 'admin' | 'member';
        };
      };
      expenses: {
        Row: {
          id: string;
          group_id: string;
          description: string;
          amount: number;
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
        };
        Insert: {
          id?: string;
          group_id: string;
          description: string;
          amount: number;
          currency?: string;
          paid_by: string;
          split_type: 'equal' | 'exact' | 'percentage' | 'shares';
          note?: string | null;
          expense_date?: string;
          created_by: string;
          is_deleted?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          description?: string;
          amount?: number;
          paid_by?: string;
          split_type?: 'equal' | 'exact' | 'percentage' | 'shares';
          note?: string | null;
          expense_date?: string;
          is_deleted?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
          updated_at?: string;
        };
      };
      expense_splits: {
        Row: {
          id: string;
          expense_id: string;
          user_id: string;
          amount: number;
          share_units: number | null;
          percentage: number | null;
        };
        Insert: {
          id?: string;
          expense_id: string;
          user_id: string;
          amount: number;
          share_units?: number | null;
          percentage?: number | null;
        };
        Update: {
          amount?: number;
          share_units?: number | null;
          percentage?: number | null;
        };
      };
      settlements: {
        Row: {
          id: string;
          group_id: string;
          payer_id: string;
          payee_id: string;
          amount: number;
          currency: string;
          note: string | null;
          upi_ref: string | null;
          settled_at: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          payer_id: string;
          payee_id: string;
          amount: number;
          currency?: string;
          note?: string | null;
          upi_ref?: string | null;
          settled_at?: string;
          created_by: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      activities: {
        Row: {
          id: string;
          group_id: string;
          actor_id: string;
          type:
            | 'expense_added'
            | 'expense_edited'
            | 'expense_deleted'
            | 'settlement_recorded'
            | 'member_joined'
            | 'member_left'
            | 'group_created';
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          actor_id: string;
          type:
            | 'expense_added'
            | 'expense_edited'
            | 'expense_deleted'
            | 'settlement_recorded'
            | 'member_joined'
            | 'member_left'
            | 'group_created';
          payload?: Json;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
    };
    Functions: {
      compute_balances: {
        Args: { p_group_id: string };
        Returns: { debtor_id: string; creditor_id: string; amount: number }[];
      };
      is_group_member: {
        Args: { p_group_id: string };
        Returns: boolean;
      };
      is_group_admin: {
        Args: { p_group_id: string };
        Returns: boolean;
      };
      create_group_with_creator: {
        Args: {
          p_name: string;
          p_description?: string | null;
          p_currency?: string;
          p_avatar_url?: string | null;
        };
        Returns: string;
      };
      get_group_preview_by_code: {
        Args: { p_code: string };
        Returns: {
          id: string;
          name: string;
          avatar_url: string | null;
          currency: string;
          member_count: number;
          already_member: boolean;
        };
      };
      join_group_by_code: {
        Args: { p_code: string };
        Returns: string;
      };
      leave_group: {
        Args: { p_group_id: string };
        Returns: undefined;
      };
      delete_group: {
        Args: { p_group_id: string };
        Returns: undefined;
      };
      regenerate_invite_code: {
        Args: { p_group_id: string };
        Returns: string;
      };
      /**
       * p_splits: [{user_id, amount, share_units?, percentage?}]
       * Returns the new expense UUID.
       */
      create_expense_with_splits: {
        Args: {
          p_group_id: string;
          p_description: string;
          p_amount: number;
          p_currency: string;
          p_paid_by: string;
          p_split_type: 'equal' | 'exact' | 'percentage' | 'shares';
          p_expense_date?: string | null;
          p_note?: string | null;
          p_splits: Json;
        };
        Returns: string;
      };
      /** Same p_splits shape as create_expense_with_splits. */
      update_expense_with_splits: {
        Args: {
          p_expense_id: string;
          p_description: string;
          p_amount: number;
          p_currency: string;
          p_paid_by: string;
          p_split_type: 'equal' | 'exact' | 'percentage' | 'shares';
          p_expense_date?: string | null;
          p_note?: string | null;
          p_splits: Json;
        };
        Returns: undefined;
      };
      delete_expense: {
        Args: { p_expense_id: string };
        Returns: undefined;
      };
      record_settlement: {
        Args: {
          p_group_id: string;
          p_payer_id: string;
          p_payee_id: string;
          p_amount: number;
          p_note?: string | null;
          p_method?: string;
          p_upi_ref?: string | null;
        };
        Returns: string;
      };
    };
  };
}

// Convenience row types
export type UserRow = Database['public']['Tables']['users']['Row'];
export type GroupRow = Database['public']['Tables']['groups']['Row'];
export type GroupMemberRow = Database['public']['Tables']['group_members']['Row'];
export type ExpenseRow = Database['public']['Tables']['expenses']['Row'];
export type ExpenseSplitRow = Database['public']['Tables']['expense_splits']['Row'];
export type SettlementRow = Database['public']['Tables']['settlements']['Row'];
export type ActivityRow = Database['public']['Tables']['activities']['Row'];
