import { supabase } from '@/lib/supabase';
import type { ActivityWithActor, ActivityPage, ActivityPayload } from './types';

const PAGE_SIZE = 30;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (table: string) => (supabase as any).from(table);

type RawRow = {
  id: string;
  group_id: string;
  actor_id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
  actor: { id: string; name: string | null; avatar_url: string | null } | null;
  group?: { id: string; name: string } | null;
};

async function resolveSettlementNames(
  rows: RawRow[],
): Promise<Map<string, { name: string | null }>> {
  const ids = new Set<string>();
  rows.forEach((r) => {
    if (r.type === 'settlement_recorded') {
      if (r.payload.payer_id) ids.add(String(r.payload.payer_id));
      if (r.payload.payee_id) ids.add(String(r.payload.payee_id));
    }
  });
  if (ids.size === 0) return new Map();

  const { data } = (await supabase
    .from('users')
    .select('id, name')
    .in('id', [...ids])) as { data: { id: string; name: string | null }[] | null };

  return new Map((data ?? []).map((u) => [u.id, { name: u.name }]));
}

function toItem(raw: RawRow, nameMap: Map<string, { name: string | null }>): ActivityWithActor {
  const payload: ActivityPayload = {
    ...(raw.payload as ActivityPayload),
    payer_name: raw.payload.payer_id
      ? (nameMap.get(String(raw.payload.payer_id))?.name ?? null)
      : undefined,
    payee_name: raw.payload.payee_id
      ? (nameMap.get(String(raw.payload.payee_id))?.name ?? null)
      : undefined,
  };

  return {
    id: raw.id,
    group_id: raw.group_id,
    group_name: raw.group?.name,
    actor_id: raw.actor_id,
    type: raw.type as ActivityWithActor['type'],
    payload,
    created_at: raw.created_at,
    actor: raw.actor ?? { id: raw.actor_id, name: null, avatar_url: null },
  };
}

export async function fetchGroupActivities(
  groupId: string,
  cursor?: string,
): Promise<ActivityPage & { error: string | null }> {
  let q = from('activities')
    .select(
      'id, group_id, actor_id, type, payload, created_at, actor:users!actor_id(id, name, avatar_url)',
    )
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) q = q.lt('created_at', cursor);

  const { data, error } = (await q) as { data: RawRow[] | null; error: { message: string } | null };
  if (error) return { items: [], nextCursor: null, error: error.message };

  const rows = data ?? [];
  const nameMap = await resolveSettlementNames(rows);
  return {
    items: rows.map((r) => toItem(r, nameMap)),
    nextCursor: rows.length === PAGE_SIZE ? (rows.at(-1)?.created_at ?? null) : null,
    error: null,
  };
}

export async function fetchGlobalActivities(
  groupIds: string[],
  cursor?: string,
): Promise<ActivityPage & { error: string | null }> {
  if (groupIds.length === 0) return { items: [], nextCursor: null, error: null };

  let q = from('activities')
    .select(
      'id, group_id, actor_id, type, payload, created_at, actor:users!actor_id(id, name, avatar_url), group:groups!group_id(id, name)',
    )
    .in('group_id', groupIds)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) q = q.lt('created_at', cursor);

  const { data, error } = (await q) as { data: RawRow[] | null; error: { message: string } | null };
  if (error) return { items: [], nextCursor: null, error: error.message };

  const rows = data ?? [];
  const nameMap = await resolveSettlementNames(rows);
  return {
    items: rows.map((r) => toItem(r, nameMap)),
    nextCursor: rows.length === PAGE_SIZE ? (rows.at(-1)?.created_at ?? null) : null,
    error: null,
  };
}

export async function fetchActivityBadgeCount(userId: string, groupIds: string[]): Promise<number> {
  if (groupIds.length === 0) return 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: userData } = (await supabase
    .from('users')
    .select('last_seen_activity_id')
    .eq('id', userId)
    .single()) as { data: { last_seen_activity_id: string | null } | null };

  let afterTime = sevenDaysAgo;

  if (userData?.last_seen_activity_id) {
    const { data: lastSeen } = (await from('activities')
      .select('created_at')
      .eq('id', userData.last_seen_activity_id)
      .single()) as { data: { created_at: string } | null };

    if (lastSeen?.created_at && lastSeen.created_at > sevenDaysAgo) {
      afterTime = lastSeen.created_at;
    }
  }

  const { count } = (await supabase
    .from('activities')
    .select('*', { count: 'exact', head: true })
    .in('group_id', groupIds)
    .gt('created_at', afterTime)) as { count: number | null };

  return count ?? 0;
}

export async function markLastSeenActivity(userId: string, activityId: string): Promise<void> {
  await (supabase.from('users') as ReturnType<typeof supabase.from>)
    .update({
      last_seen_activity_id: activityId,
    } as Record<string, unknown>)
    .eq('id', userId);
}

export async function getNotificationsEnabled(groupId: string, userId: string): Promise<boolean> {
  const { data } = (await supabase
    .from('group_members')
    .select('notifications_enabled')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single()) as { data: { notifications_enabled: boolean } | null };

  return data?.notifications_enabled ?? true;
}

export async function setNotificationsEnabled(
  groupId: string,
  userId: string,
  enabled: boolean,
): Promise<{ error: string | null }> {
  const { error } = await (supabase.from('group_members') as ReturnType<typeof supabase.from>)
    .update({ notifications_enabled: enabled } as Record<string, unknown>)
    .eq('group_id', groupId)
    .eq('user_id', userId);

  return { error: error?.message ?? null };
}
