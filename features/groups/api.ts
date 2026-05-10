import { supabase } from '@/lib/supabase';
import type { GroupRow } from '@/types/database';
import type {
  Result,
  GroupWithMeta,
  GroupWithMembers,
  GroupPreview,
  CreateGroupInput,
} from './types';

// ---- internal helpers ---------------------------------------------

function rpcError(msg: string | undefined): string {
  return msg ?? 'Unknown error';
}

// Type-safe wrapper for supabase.rpc() — Supabase's TS inference for custom
// Functions doesn't resolve Args correctly in all client versions, so we
// call rpc via a loosely-typed shim and let the DB type handle doc-only
// type safety in types/database.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase.rpc.bind(supabase) as (fn: string, args?: Record<string, unknown>) => any;

// ---- types for complex selects -----------------------------------

type MembershipRow = {
  role: string;
  group_id: string;
  groups: GroupRow | null;
};

type MemberRow = {
  id: string;
  role: string;
  joined_at: string;
  user_id: string;
  notifications_enabled: boolean;
  users: {
    id: string;
    name: string | null;
    avatar_url: string | null;
    upi_id: string | null;
  } | null;
};

// ---- create -------------------------------------------------------

export async function createGroup(input: CreateGroupInput): Promise<Result<string>> {
  const avatarUrl = input.avatarEmoji ?? null;

  const { data, error } = (await rpc('create_group_with_creator', {
    p_name: input.name.trim(),
    p_description: input.description?.trim() || null,
    p_currency: input.currency,
    p_avatar_url: avatarUrl,
  })) as { data: string | null; error: { message: string } | null };

  if (error) return { data: null, error: rpcError(error.message) };
  return { data: data as string, error: null };
}

// ---- list ---------------------------------------------------------

export async function listMyGroups(): Promise<Result<GroupWithMeta[]>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data: rawMemberships, error } = await supabase
    .from('group_members')
    .select('role, group_id, groups(*)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })
    .returns<MembershipRow[]>();

  if (error) return { data: null, error: error.message };
  if (!rawMemberships || rawMemberships.length === 0) return { data: [], error: null };

  const groupIds = rawMemberships.map((m) => m.group_id);

  const { data: allMembers } = await supabase
    .from('group_members')
    .select('group_id')
    .in('group_id', groupIds)
    .returns<{ group_id: string }[]>();

  const countMap = new Map<string, number>();
  for (const m of allMembers ?? []) {
    countMap.set(m.group_id, (countMap.get(m.group_id) ?? 0) + 1);
  }

  const result: GroupWithMeta[] = rawMemberships
    .filter((m) => m.groups != null)
    .map((m) => ({
      ...(m.groups as GroupRow),
      myRole: m.role as 'admin' | 'member',
      memberCount: countMap.get(m.group_id) ?? 1,
    }));

  return { data: result, error: null };
}

// ---- get detail ---------------------------------------------------

export async function getGroup(groupId: string): Promise<Result<GroupWithMembers>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data: group, error: groupErr } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (groupErr) return { data: null, error: groupErr.message };
  if (!group) return { data: null, error: 'Group not found' };

  const { data: rawMembers, error: membersErr } = await supabase
    .from('group_members')
    .select(
      'id, role, joined_at, user_id, notifications_enabled, users(id, name, avatar_url, upi_id)',
    )
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true })
    .returns<MemberRow[]>();

  if (membersErr) return { data: null, error: membersErr.message };

  const members = rawMembers ?? [];
  const myMember = members.find((m) => m.user_id === user.id);

  return {
    data: {
      ...(group as GroupRow),
      myRole: (myMember?.role ?? 'member') as 'admin' | 'member',
      members: members.map((m) => ({
        id: m.id,
        group_id: groupId,
        user_id: m.user_id,
        role: m.role as 'admin' | 'member',
        joined_at: m.joined_at,
        notifications_enabled: m.notifications_enabled,
        user: m.users ?? { id: m.user_id, name: null, avatar_url: null, upi_id: null },
      })),
    },
    error: null,
  };
}

// ---- preview (pre-join) ------------------------------------------

export async function getGroupPreviewByCode(code: string): Promise<Result<GroupPreview>> {
  const { data, error } = (await rpc('get_group_preview_by_code', {
    p_code: code,
  })) as { data: GroupPreview | null; error: { message: string } | null };

  if (error) {
    if (error.message.includes('invalid_code')) {
      return { data: null, error: 'invalid_code' };
    }
    return { data: null, error: rpcError(error.message) };
  }

  return { data: data as GroupPreview, error: null };
}

// ---- join --------------------------------------------------------

export async function joinGroupByCode(
  code: string,
): Promise<Result<string> | { data: null; error: 'already_member'; groupId: string }> {
  const { data, error } = (await rpc('join_group_by_code', { p_code: code })) as {
    data: string | null;
    error: { message: string; hint?: string } | null;
  };

  if (error) {
    if (error.message.includes('invalid_code')) {
      return { data: null, error: 'invalid_code' };
    }
    if (error.message.includes('already_member')) {
      return { data: null, error: 'already_member', groupId: error.hint ?? '' };
    }
    return { data: null, error: rpcError(error.message) };
  }

  return { data: data as string, error: null };
}

// ---- leave -------------------------------------------------------

export async function leaveGroup(groupId: string): Promise<Result<void>> {
  const { error } = (await rpc('leave_group', { p_group_id: groupId })) as {
    error: { message: string } | null;
  };

  if (error) {
    if (error.message.includes('last_admin')) {
      return {
        data: null,
        error: 'You are the only admin. Promote someone else before leaving.',
      };
    }
    return { data: null, error: rpcError(error.message) };
  }

  return { data: undefined, error: null };
}

// ---- delete ------------------------------------------------------

export async function deleteGroup(groupId: string): Promise<Result<void>> {
  const { error } = (await rpc('delete_group', { p_group_id: groupId })) as {
    error: { message: string } | null;
  };

  if (error) return { data: null, error: rpcError(error.message) };
  return { data: undefined, error: null };
}

// ---- invite code -------------------------------------------------

export async function regenerateInviteCode(groupId: string): Promise<Result<string>> {
  const { data, error } = (await rpc('regenerate_invite_code', { p_group_id: groupId })) as {
    data: string | null;
    error: { message: string } | null;
  };

  if (error) return { data: null, error: rpcError(error.message) };
  return { data: data as string, error: null };
}

export async function updateGroupName(groupId: string, name: string): Promise<Result<void>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupsBuilder = supabase.from('groups') as any;
  const { error } = (await groupsBuilder.update({ name: name.trim() }).eq('id', groupId)) as {
    error: { message: string } | null;
  };

  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}
