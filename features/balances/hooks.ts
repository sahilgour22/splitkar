import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { simplifyDebts } from './simplify';
import { fetchGroupBalances } from './api';

export const balanceKeys = {
  byGroup: (groupId: string) => ['balances', 'group', groupId] as const,
};

export function useGroupBalances(groupId: string) {
  return useQuery({
    queryKey: balanceKeys.byGroup(groupId),
    queryFn: async () => {
      const result = await fetchGroupBalances(groupId);
      if (result.error) throw new Error(result.error);
      return simplifyDebts(result.data ?? []);
    },
    enabled: !!groupId,
  });
}

// Invalidates balances when expenses or settlements change in this group
export function useBalancesRealtime(groupId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!groupId) return;

    const invalidate = () =>
      void queryClient.invalidateQueries({ queryKey: balanceKeys.byGroup(groupId) });

    const channel = supabase
      .channel(`balances:group:${groupId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `group_id=eq.${groupId}` },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements', filter: `group_id=eq.${groupId}` },
        invalidate,
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [groupId, queryClient]);
}
