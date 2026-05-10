import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { balanceKeys } from '@/features/balances/hooks';
import { apiRecordSettlement, fetchGroupSettlements } from './api';
import type { RecordSettlementInput } from './types';

export const settlementKeys = {
  byGroup: (groupId: string) => ['settlements', 'group', groupId] as const,
};

export function useGroupSettlements(groupId: string) {
  return useQuery({
    queryKey: settlementKeys.byGroup(groupId),
    queryFn: async () => {
      const result = await fetchGroupSettlements(groupId);
      if (result.error) throw new Error(result.error);
      return result.data ?? [];
    },
    enabled: !!groupId,
  });
}

export function useRecordSettlement(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RecordSettlementInput) => apiRecordSettlement(input),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settlementKeys.byGroup(groupId) });
      void queryClient.invalidateQueries({ queryKey: balanceKeys.byGroup(groupId) });
    },
  });
}

export function useSettlementsRealtime(groupId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!groupId) return;

    const invalidate = () =>
      void queryClient.invalidateQueries({ queryKey: settlementKeys.byGroup(groupId) });

    const channel = supabase
      .channel(`settlements:group:${groupId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'settlements',
          filter: `group_id=eq.${groupId}`,
        },
        invalidate,
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [groupId, queryClient]);
}
