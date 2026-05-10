import { useCallback, useEffect } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import {
  fetchActivityBadgeCount,
  fetchGlobalActivities,
  fetchGroupActivities,
  markLastSeenActivity,
} from './api';

export const activityKeys = {
  group: (id: string) => ['activities', 'group', id] as const,
  global: (ids: string[]) => ['activities', 'global', [...ids].sort().join(',')] as const,
  badge: (uid: string) => ['activities', 'badge', uid] as const,
};

// ── Group-scoped infinite feed ────────────────────────────────────────────────

export function useGroupActivities(groupId: string) {
  return useInfiniteQuery({
    queryKey: activityKeys.group(groupId),
    queryFn: ({ pageParam }) => fetchGroupActivities(groupId, pageParam as string | undefined),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!groupId,
  });
}

// ── Global infinite feed ──────────────────────────────────────────────────────

export function useGlobalActivities(groupIds: string[]) {
  const key = activityKeys.global(groupIds);
  return useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => fetchGlobalActivities(groupIds, pageParam as string | undefined),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: groupIds.length > 0,
  });
}

// ── Badge count ───────────────────────────────────────────────────────────────

export function useActivityBadge(userId: string | null, groupIds: string[]) {
  return useQuery({
    queryKey: activityKeys.badge(userId ?? ''),
    queryFn: () => fetchActivityBadgeCount(userId!, groupIds),
    enabled: !!userId && groupIds.length > 0,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

// ── Realtime invalidation (call once at app level) ────────────────────────────

export function useActivityRealtime(groupIds: string[]) {
  const queryClient = useQueryClient();
  const groupKey = [...groupIds].sort().join(',');

  useEffect(() => {
    if (!groupKey) return;

    const channel = supabase
      .channel(`activities-realtime-${groupKey}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activities' },
        (payload) => {
          const newGroupId = (payload.new as { group_id?: string } | undefined)?.group_id;
          if (!newGroupId || !groupIds.includes(newGroupId)) return;
          // Invalidate feeds + badge
          void queryClient.invalidateQueries({ queryKey: ['activities'] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupKey, queryClient]);
}

// ── Mark activities seen (call when global feed is opened) ────────────────────

export function useMarkActivitiesSeen(userId: string | null) {
  const queryClient = useQueryClient();

  return useCallback(
    async (newestActivityId: string | undefined) => {
      if (!userId || !newestActivityId) return;
      await markLastSeenActivity(userId, newestActivityId);
      void queryClient.invalidateQueries({ queryKey: activityKeys.badge(userId) });
    },
    [userId, queryClient],
  );
}
