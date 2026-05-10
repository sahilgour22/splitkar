import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

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
  const hasBadges = showMethodBadge || showGroup;

  return (
    <Pressable
      onPress={tappable ? handlePress : undefined}
      style={({ pressed }) => [styles.row, pressed && tappable && styles.rowPressed]}
      accessibilityRole={tappable ? 'button' : 'text'}
    >
      <Avatar name={actor.name ?? '?'} />

      <View style={styles.content}>
        {/* Main text line */}
        <View style={styles.textRow}>
          <Text style={styles.text} numberOfLines={2}>
            <ActivityText
              type={type}
              actorName={actorName}
              payload={payload}
              cur={cur}
              currentUserId={currentUserId}
              isDeleted={isDeleted}
            />
          </Text>
          <Text style={styles.time} numberOfLines={1}>
            {formatRelativeTime(created_at)}
          </Text>
        </View>

        {/* Badges — only when present */}
        {hasBadges && (
          <View style={styles.badgeRow}>
            {showMethodBadge && (
              <View
                style={[
                  styles.badge,
                  payload.method === 'upi' ? styles.badgeUpi : styles.badgeCash,
                ]}
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
        )}
      </View>
    </Pressable>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const colors = ['#6C47FF', '#FF6B35', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const bg = colors[Math.abs(hash) % colors.length] ?? colors[0]!;

  return (
    <View style={[styles.avatar, { backgroundColor: bg }]}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
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
  switch (type) {
    case 'expense_added':
    case 'expense_edited': {
      const verb = type === 'expense_added' ? 'added' : 'edited';
      const dimStyle = isDeleted ? { color: '#94A3B8' } : {};
      return (
        <>
          <Text style={[styles.actor, dimStyle]}>{actorName} </Text>
          <Text style={[styles.body, dimStyle]}>{verb} </Text>
          <Text style={[styles.actor, dimStyle]}>{payload.description ?? 'an expense'}</Text>
          {payload.amount != null && (
            <Text style={styles.amount}>{` · ${formatMoney(payload.amount, cur)}`}</Text>
          )}
        </>
      );
    }

    case 'expense_deleted':
      return (
        <>
          <Text style={[styles.actor, { color: '#94A3B8' }]}>{actorName} </Text>
          <Text style={[styles.body, { color: '#94A3B8' }]}>{'deleted '}</Text>
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
          <Text style={styles.actor}>{payerName} </Text>
          <Text style={styles.body}>{'paid '}</Text>
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
          <Text style={styles.actor}>{actorName} </Text>
          <Text style={styles.body}>joined the group</Text>
        </>
      );

    case 'member_left':
      return (
        <>
          <Text style={styles.actor}>{actorName} </Text>
          <Text style={styles.body}>left the group</Text>
        </>
      );

    case 'group_created':
      return (
        <>
          <Text style={styles.actor}>{actorName} </Text>
          <Text style={styles.body}>created the group</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#fff',
    gap: 10,
  },
  rowPressed: {
    backgroundColor: '#F8FAFC',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  avatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
  },
  actor: {
    fontWeight: '700',
    color: '#0F172A',
    fontSize: 14,
  },
  body: {
    fontWeight: '400',
    color: '#475569',
    fontSize: 14,
  },
  amount: {
    fontWeight: '600',
    color: AMOUNT_COLOR,
    fontSize: 14,
  },
  time: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
    minWidth: 36,
    textAlign: 'right',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
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
    maxWidth: 150,
  },
  badgeGroupText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
});
