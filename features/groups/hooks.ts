import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import {
  createGroup,
  deleteGroup,
  getGroup,
  getGroupPreviewByCode,
  joinGroupByCode,
  leaveGroup,
  listMyGroups,
  regenerateInviteCode,
  updateGroupName,
} from './api';
import type { CreateGroupInput } from './types';

// ---- query keys ----------------------------------------------------

export const groupKeys = {
  all: ['groups'] as const,
  lists: () => [...groupKeys.all, 'list'] as const,
  detail: (id: string) => [...groupKeys.all, 'detail', id] as const,
  preview: (code: string) => [...groupKeys.all, 'preview', code] as const,
};

// ---- list ----------------------------------------------------------

export function useMyGroups() {
  return useQuery({
    queryKey: groupKeys.lists(),
    queryFn: async () => {
      const result = await listMyGroups();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });
}

// ---- detail --------------------------------------------------------

export function useGroup(id: string) {
  return useQuery({
    queryKey: groupKeys.detail(id),
    queryFn: async () => {
      const result = await getGroup(id);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!id,
  });
}

// ---- preview (join screen) -----------------------------------------

export function useGroupPreview(code: string) {
  return useQuery({
    queryKey: groupKeys.preview(code),
    queryFn: async () => {
      const result = await getGroupPreviewByCode(code);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!code,
    retry: false,
  });
}

// ---- create --------------------------------------------------------

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGroupInput) => createGroup(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
    },
  });
}

// ---- join ----------------------------------------------------------

export function useJoinGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => joinGroupByCode(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
    },
  });
}

// ---- leave ---------------------------------------------------------

export function useLeaveGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => leaveGroup(groupId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
    },
  });
}

// ---- delete --------------------------------------------------------

export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => deleteGroup(groupId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
    },
  });
}

// ---- regenerate invite code ----------------------------------------

export function useRegenerateInviteCode(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => regenerateInviteCode(groupId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
    },
  });
}

// ---- rename group --------------------------------------------------

export function useRenameGroup(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => updateGroupName(groupId, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
      void queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
    },
  });
}

// ---- realtime subscription -----------------------------------------

export function useGroupRealtime(groupId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`group:${groupId}:members-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);
}
