import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { GroupAvatar } from '@/features/groups/components/GroupAvatar';
import { formatMoney } from '@/utils/money';
import { formatRelativeTime } from '../utils';
import type { ActivityWithActor } from '../types';

interface Props {
  activity: ActivityWithActor;
  currentUserId: string | null;
  currency?: string;
  showGroupBadge?: boolean;
}

const AMOUNT_COLOR = '#10B981';

export function ActivityRow({ activity, currentUserId, currency, showGroupBadge }: Props) {
  const { actor, type, payload, created_at } = activity;
  const actorName = activity.actor_id === currentUserId ? 'You' : (actor.name ?? 'Someone');
  const cur = currency ?? payload.currency ?? 'INR';

  const isExpenseRow = ['expense_added', 'expense_edited'].includes(type) && !!payload.expense_id;
  const isSettlementRow = type === 'settlement_recorded';
  const tappable = isExpenseRow || isSettlementRow;
  const isDeleted = type === 'expense_deleted';

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

  const showMethodBadge = type === 'settlement_recorded' && !!payload.method;
  const showGroup = showGroupBadge && !!activity.group_name;

  return (
    <Pressable
      onPress={tappable ? handlePress : undefined}
      style={({ pressed }) => [styles.row, pressed && tappable && styles.rowPressed]}
      accessibilityRole={tappable ? 'button' : 'text'}
    >
      <GroupAvatar name={actor.name ?? '?'} avatarUrl={actor.avatar_url} size="sm" />

      <View style={styles.middle}>
        {/* Line 1 — main activity text */}
        <Text style={styles.mainText} numberOfLines={2}>
          <ActivityText
            type={type}
            actorName={actorName}
            payload={payload}
            cur={cur}
            currentUserId={currentUserId}
            isDeleted={isDeleted}
          />
        </Text>

        {/* Line 2 — time + badges (always present, mirrors expense meta line) */}
        <View style={styles.metaRow}>
          <Text style={styles.time}>{formatRelativeTime(created_at)}</Text>
          {showMethodBadge && (
            <View
              style={[styles.badge, payload.method === 'upi' ? styles.badgeUpi : styles.badgeCash]}
            >
              <Text style={styles.badgeUpiText}>{payload.method!.toUpperCase()}</Text>
            </View>
          )}
          {showGroup && (
            <View style={[styles.badge, styles.badgeGroup]}>
              <Text style={styles.badgeGroupText} numberOfLines={1}>
                {activity.group_name}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ── Per-type text ─────────────────────────────────────────────────────────────

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
  const dimColor = isDeleted ? '#94A3B8' : undefined;

  switch (type) {
    case 'expense_added':
    case 'expense_edited': {
      const verb = type === 'expense_added' ? 'added' : 'edited';
      return (
        <>
          <Text style={[styles.actor, dimColor ? { color: dimColor } : undefined]}>
            {actorName}
          </Text>
          <Text
            style={[styles.body, dimColor ? { color: dimColor } : undefined]}
          >{` ${verb} `}</Text>
          <Text style={[styles.actor, dimColor ? { color: dimColor } : undefined]}>
            {payload.description ?? 'an expense'}
          </Text>
          {payload.amount != null && (
            <Text style={styles.amount}>{` · ${formatMoney(payload.amount, cur)}`}</Text>
          )}
        </>
      );
    }

    case 'expense_deleted':
      return (
        <>
          <Text style={[styles.actor, { color: '#94A3B8' }]}>{actorName}</Text>
          <Text style={[styles.body, { color: '#94A3B8' }]}>{' deleted '}</Text>
          <Text style={[styles.actor, { color: '#94A3B8', textDecorationLine: 'line-through' }]}>
            {payload.description ?? 'an expense'}
          </Text>
        </>
      );

    case 'settlement_recorded': {
      const payerName =
        payload.payer_id === currentUserId ? 'You' : (payload.payer_name ?? 'Someone');
      const payeeName =
        payload.payee_id === currentUserId ? 'you' : (payload.payee_name ?? 'someone');
      return (
        <>
          <Text style={styles.actor}>{payerName}</Text>
          <Text style={styles.body}>{' paid '}</Text>
          <Text style={styles.actor}>{payeeName}</Text>
          {payload.amount != null && (
            <Text style={styles.amount}>{` · ${formatMoney(payload.amount, cur)}`}</Text>
          )}
        </>
      );
    }

    case 'member_joined':
      return (
        <>
          <Text style={styles.actor}>{actorName}</Text>
          <Text style={styles.body}>{' joined the group'}</Text>
        </>
      );

    case 'member_left':
      return (
        <>
          <Text style={styles.actor}>{actorName}</Text>
          <Text style={styles.body}>{' left the group'}</Text>
        </>
      );

    case 'group_created':
      return (
        <>
          <Text style={styles.actor}>{actorName}</Text>
          <Text style={styles.body}>{' created the group'}</Text>
        </>
      );

    default:
      return <Text style={styles.body}>{actorName}</Text>;
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#fff',
  },
  rowPressed: {
    backgroundColor: '#F5F3FF',
  },
  middle: {
    flex: 1,
    marginLeft: 13,
  },
  mainText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#0F172A',
    marginBottom: 3,
  },
  actor: {
    fontWeight: '600',
    color: '#0F172A',
    fontSize: 15,
  },
  body: {
    fontWeight: '400',
    color: '#475569',
    fontSize: 15,
  },
  amount: {
    fontWeight: '600',
    color: AMOUNT_COLOR,
    fontSize: 15,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  time: {
    fontSize: 12,
    color: '#94A3B8',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeUpi: { backgroundColor: '#EFF6FF' },
  badgeCash: { backgroundColor: '#F0FDF4' },
  badgeUpiText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 0.4,
  },
  badgeGroup: {
    backgroundColor: '#F1F5F9',
    maxWidth: 140,
  },
  badgeGroupText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
});
