import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { GroupAvatar } from '@/features/groups/components/GroupAvatar';
import { formatMoney } from '@/utils/money';
import { formatRelativeTime } from '../utils';
import type { ActivityWithActor } from '../types';

interface Props {
  activity: ActivityWithActor;
  currentUserId: string | null;
  currency?: string; // group currency; falls back to payload currency
  showGroupBadge?: boolean;
}

const BOLD = { fontWeight: '700' as const };
const AMOUNT_COLOR = '#10B981';
const DELETED_COLOR = '#94A3B8';

export function ActivityRow({ activity, currentUserId, currency, showGroupBadge }: Props) {
  const { actor, type, payload, created_at } = activity;
  const actorName = activity.actor_id === currentUserId ? 'You' : (actor.name ?? 'Someone');
  const cur = currency ?? payload.currency ?? 'INR';

  // Determine if the row is tappable
  const isExpenseRow = ['expense_added', 'expense_edited'].includes(type) && !!payload.expense_id;
  const isSettlementRow = type === 'settlement_recorded';
  const tappable = isExpenseRow || isSettlementRow;

  function handlePress() {
    if (isExpenseRow && payload.expense_id) {
      router.push({
        pathname: '/expenses/[id]',
        params: { id: payload.expense_id },
      } as Parameters<typeof router.push>[0]);
    } else if (isSettlementRow) {
      router.push({
        pathname: '/(app)/groups/[id]',
        params: { id: activity.group_id },
      } as Parameters<typeof router.push>[0]);
    }
  }

  const isDeleted = type === 'expense_deleted';

  return (
    <Pressable
      onPress={tappable ? handlePress : undefined}
      style={({ pressed }) => [styles.row, pressed && tappable && styles.rowPressed]}
      accessibilityRole={tappable ? 'button' : 'text'}
    >
      {/* Actor avatar */}
      <GroupAvatar name={actor.name ?? '?'} avatarUrl={actor.avatar_url} size="sm" />

      {/* Content */}
      <View style={styles.content}>
        <ActivityText
          type={type}
          actorName={actorName}
          payload={payload}
          cur={cur}
          currentUserId={currentUserId}
          isDeleted={isDeleted}
        />

        {/* Method badge + group badge */}
        <View style={styles.badgeRow}>
          {type === 'settlement_recorded' && payload.method && (
            <View
              style={[styles.badge, payload.method === 'upi' ? styles.badgeUpi : styles.badgeCash]}
            >
              <Text style={styles.badgeText}>{payload.method.toUpperCase()}</Text>
            </View>
          )}
          {showGroupBadge && activity.group_name && (
            <View style={[styles.badge, styles.badgeGroup]}>
              <Text style={styles.badgeGroupText} numberOfLines={1}>
                {activity.group_name}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Relative time */}
      <Text style={styles.time}>{formatRelativeTime(created_at)}</Text>
    </Pressable>
  );
}

// ── Per-type text renderer ────────────────────────────────────────────────────

function ActivityText({
  type,
  actorName,
  payload,
  cur,
  currentUserId,
  isDeleted,
}: {
  type: string;
  actorName: string;
  payload: ActivityWithActor['payload'];
  cur: string;
  currentUserId: string | null;
  isDeleted: boolean;
}) {
  const dim = isDeleted ? { color: DELETED_COLOR } : {};

  switch (type) {
    case 'expense_added':
    case 'expense_edited': {
      const verb = type === 'expense_added' ? 'added' : 'edited';
      return (
        <Text style={[styles.text, dim]}>
          <Text style={BOLD}>{actorName}</Text>
          {` ${verb} `}
          <Text style={BOLD}>{payload.description ?? 'an expense'}</Text>
          {payload.amount != null && (
            <>
              {' — '}
              <Text style={{ fontWeight: '700', color: AMOUNT_COLOR }}>
                {formatMoney(payload.amount, cur)}
              </Text>
            </>
          )}
        </Text>
      );
    }

    case 'expense_deleted':
      return (
        <Text style={[styles.text, dim]}>
          <Text style={BOLD}>{actorName}</Text>
          {' deleted '}
          <Text style={[BOLD, { textDecorationLine: 'line-through' }]}>
            {payload.description ?? 'an expense'}
          </Text>
        </Text>
      );

    case 'settlement_recorded': {
      const payerName =
        payload.payer_id === currentUserId ? 'you' : (payload.payer_name ?? 'someone');
      const payeeName =
        payload.payee_id === currentUserId ? 'you' : (payload.payee_name ?? 'someone');
      const amount = payload.amount != null ? formatMoney(payload.amount, cur) : '';
      return (
        <Text style={styles.text}>
          <Text style={BOLD}>{actorName}</Text>
          {' recorded '}
          <Text style={BOLD}>{payerName}</Text>
          {' paid '}
          <Text style={BOLD}>{payeeName}</Text>
          {amount ? (
            <>
              {' '}
              <Text style={{ fontWeight: '700', color: AMOUNT_COLOR }}>{amount}</Text>
            </>
          ) : null}
        </Text>
      );
    }

    case 'member_joined':
      return (
        <Text style={styles.text}>
          <Text style={BOLD}>{actorName}</Text>
          {' joined the group'}
        </Text>
      );

    case 'member_left':
      return (
        <Text style={styles.text}>
          <Text style={BOLD}>{actorName}</Text>
          {' left the group'}
        </Text>
      );

    case 'group_created':
      return (
        <Text style={styles.text}>
          <Text style={BOLD}>{actorName}</Text>
          {' created the group'}
        </Text>
      );

    default:
      return <Text style={styles.text}>{actorName}</Text>;
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
    backgroundColor: '#fff',
  },
  rowPressed: {
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    gap: 5,
  },
  text: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  badgeUpi: {
    backgroundColor: '#EFF6FF',
  },
  badgeCash: {
    backgroundColor: '#F0FDF4',
  },
  badgeGroup: {
    backgroundColor: '#F1F5F9',
    maxWidth: 160,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 0.5,
  },
  badgeGroupText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  time: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    flexShrink: 0,
  },
});
