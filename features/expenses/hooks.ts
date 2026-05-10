import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import {
  fetchGroupExpenses,
  fetchExpense,
  apiCreateExpense,
  apiUpdateExpense,
  apiDeleteExpense,
} from './api';
import type { CreateExpenseInput, UpdateExpenseInput, ExpenseWithDetails } from './types';

// ─── query keys ───────────────────────────────────────────────────────────────

export const expenseKeys = {
  all: ['expenses'] as const,
  byGroup: (groupId: string) => [...expenseKeys.all, 'group', groupId] as const,
  detail: (id: string) => [...expenseKeys.all, 'detail', id] as const,
};

// ─── list ─────────────────────────────────────────────────────────────────────

export function useGroupExpenses(groupId: string) {
  return useQuery({
    queryKey: expenseKeys.byGroup(groupId),
    queryFn: async () => {
      const result = await fetchGroupExpenses(groupId);
      if (result.error) throw new Error(result.error);
      return result.data ?? [];
    },
    enabled: !!groupId,
  });
}

// ─── detail ───────────────────────────────────────────────────────────────────

export function useExpense(expenseId: string) {
  return useQuery({
    queryKey: expenseKeys.detail(expenseId),
    queryFn: async () => {
      const result = await fetchExpense(expenseId);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    enabled: !!expenseId,
  });
}

// ─── create ───────────────────────────────────────────────────────────────────

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateExpenseInput) => apiCreateExpense(input),

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: expenseKeys.byGroup(input.group_id) });
      const previous = queryClient.getQueryData<ExpenseWithDetails[]>(
        expenseKeys.byGroup(input.group_id),
      );

      // Optimistic: prepend a placeholder with a temp id
      const optimistic: ExpenseWithDetails = {
        id: `optimistic-${Date.now()}`,
        group_id: input.group_id,
        description: input.description,
        amount: input.amount,
        currency: input.currency,
        paid_by: input.paid_by,
        split_type: input.split_type,
        note: input.note ?? null,
        expense_date: input.expense_date ?? new Date().toISOString(),
        created_by: input.paid_by, // best-effort
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payer: null,
        splits: input.splits.map((s, i) => ({
          id: `opt-split-${i}`,
          expense_id: `optimistic-${Date.now()}`,
          user_id: s.user_id,
          amount: s.amount,
          share_units: s.share_units ?? null,
          percentage: s.percentage ?? null,
        })),
      };

      queryClient.setQueryData<ExpenseWithDetails[]>(expenseKeys.byGroup(input.group_id), (old) => [
        optimistic,
        ...(old ?? []),
      ]);

      return { previous, groupId: input.group_id };
    },

    onError: (_err, input, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(expenseKeys.byGroup(input.group_id), ctx.previous);
      }
    },

    onSettled: (_data, _err, input) => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.byGroup(input.group_id) });
    },
  });
}

// ─── update ───────────────────────────────────────────────────────────────────

export function useUpdateExpense(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateExpenseInput) => apiUpdateExpense(input),

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: expenseKeys.byGroup(groupId) });
      await queryClient.cancelQueries({ queryKey: expenseKeys.detail(input.expense_id) });

      const prevList = queryClient.getQueryData<ExpenseWithDetails[]>(expenseKeys.byGroup(groupId));
      const prevDetail = queryClient.getQueryData<ExpenseWithDetails>(
        expenseKeys.detail(input.expense_id),
      );

      const patch = (old: ExpenseWithDetails): ExpenseWithDetails => ({
        ...old,
        description: input.description,
        amount: input.amount,
        currency: input.currency,
        paid_by: input.paid_by,
        split_type: input.split_type,
        note: input.note ?? null,
        expense_date: input.expense_date ?? old.expense_date,
        splits: input.splits.map((s, i) => ({
          id: `opt-split-${i}`,
          expense_id: input.expense_id,
          user_id: s.user_id,
          amount: s.amount,
          share_units: s.share_units ?? null,
          percentage: s.percentage ?? null,
        })),
      });

      queryClient.setQueryData<ExpenseWithDetails[]>(expenseKeys.byGroup(groupId), (old) =>
        (old ?? []).map((e) => (e.id === input.expense_id ? patch(e) : e)),
      );

      queryClient.setQueryData<ExpenseWithDetails>(expenseKeys.detail(input.expense_id), (old) =>
        old ? patch(old) : old,
      );

      return { prevList, prevDetail };
    },

    onError: (_err, input, ctx) => {
      if (ctx?.prevList !== undefined) {
        queryClient.setQueryData(expenseKeys.byGroup(groupId), ctx.prevList);
      }
      if (ctx?.prevDetail !== undefined) {
        queryClient.setQueryData(expenseKeys.detail(input.expense_id), ctx.prevDetail);
      }
    },

    onSettled: (_data, _err, input) => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.byGroup(groupId) });
      void queryClient.invalidateQueries({ queryKey: expenseKeys.detail(input.expense_id) });
    },
  });
}

// ─── delete ───────────────────────────────────────────────────────────────────

export function useDeleteExpense(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseId: string) => apiDeleteExpense(expenseId),

    onMutate: async (expenseId) => {
      await queryClient.cancelQueries({ queryKey: expenseKeys.byGroup(groupId) });
      const previous = queryClient.getQueryData<ExpenseWithDetails[]>(expenseKeys.byGroup(groupId));

      // Optimistic remove from list
      queryClient.setQueryData<ExpenseWithDetails[]>(expenseKeys.byGroup(groupId), (old) =>
        (old ?? []).filter((e) => e.id !== expenseId),
      );

      return { previous };
    },

    onError: (_err, _id, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(expenseKeys.byGroup(groupId), ctx.previous);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.byGroup(groupId) });
    },
  });
}

// ─── realtime ────────────────────────────────────────────────────────────────

export function useExpensesRealtime(groupId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`expenses:group:${groupId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `group_id=eq.${groupId}` },
        () => void queryClient.invalidateQueries({ queryKey: expenseKeys.byGroup(groupId) }),
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [groupId, queryClient]);
}
