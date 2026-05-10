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
const DELETED_COLOR = '#94A3B8';

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
      {/* Actor avatar */}
      <View style={styles.avatarWrap}>
        <Avatar name={actor.name ?? '?'} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.textWrap}>
            <ActivityText
              type={type}
              actorName={actorName}
              payload={payload}
              cur={cur}
              currentUserId={currentUserId}
              isDeleted={isDeleted}
            />
          </View>
          <Text style={styles.time}>{formatRelativeTime(created_at)}</Text>
        </View>

        {(showMethodBadge || showGroup) && (
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

// Simple initials avatar for the actor
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
  const dimColor = isDeleted ? DELETED_COLOR : '#334155';

  switch (type) {
    case 'expense_added':
    case 'expense_edited': {
      const verb = type === 'expense_added' ? 'added' : 'edited';
      return (
        <Text style={[styles.text, { color: dimColor }]}>
          <Text style={styles.bold}>{actorName}</Text>
          {` ${verb} `}
          <Text style={styles.bold}>{payload.description ?? 'an expense'}</Text>
          {payload.amount != null && (
            <Text style={{ color: AMOUNT_COLOR, fontWeight: '600' }}>
              {' · '}
              {formatMoney(payload.amount, cur)}
            </Text>
          )}
        </Text>
      );
    }

    case 'expense_deleted':
      return (
        <Text style={[styles.text, { color: dimColor }]}>
          <Text style={styles.bold}>{actorName}</Text>
          {' deleted '}
          <Text style={[styles.bold, { textDecorationLine: 'line-through' }]}>
            {payload.description ?? 'an expense'}
          </Text>
        </Text>
      );

    case 'settlement_recorded': {
      const payerName =
        payload.payer_id === currentUserId ? 'you' : (payload.payer_name ?? 'someone');
      const payeeName =
        payload.payee_id === currentUserId ? 'you' : (payload.payee_name ?? 'someone');
      return (
        <Text style={styles.text}>
          <Text style={styles.bold}>{payerName === 'you' ? 'You' : payerName}</Text>
          {' paid '}
          <Text style={styles.bold}>{payeeName}</Text>
          {payload.amount != null && (
            <Text style={{ color: AMOUNT_COLOR, fontWeight: '600' }}>
              {' · '}
              {formatMoney(payload.amount, cur)}
            </Text>
          )}
        </Text>
      );
    }

    case 'member_joined':
      return (
        <Text style={styles.text}>
          <Text style={styles.bold}>{actorName}</Text>
          <Text style={{ color: '#64748B' }}>{' joined the group'}</Text>
        </Text>
      );

    case 'member_left':
      return (
        <Text style={styles.text}>
          <Text style={styles.bold}>{actorName}</Text>
          <Text style={{ color: '#64748B' }}>{' left the group'}</Text>
        </Text>
      );

    case 'group_created':
      return (
        <Text style={styles.text}>
          <Text style={styles.bold}>{actorName}</Text>
          <Text style={{ color: '#64748B' }}>{' created the group'}</Text>
        </Text>
      );

    default:
      return <Text style={[styles.text, { color: '#64748B' }]}>{actorName}</Text>;
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#fff',
    gap: 12,
  },
  rowPressed: {
    backgroundColor: '#F8FAFC',
  },
  avatarWrap: {
    paddingTop: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  textWrap: {
    flex: 1,
  },
  text: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  time: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    flexShrink: 0,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeUpi: {
    backgroundColor: '#EFF6FF',
  },
  badgeCash: {
    backgroundColor: '#F0FDF4',
  },
  badgeUpiText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 0.5,
  },
  badgeGroup: {
    backgroundColor: '#F1F5F9',
    maxWidth: 160,
  },
  badgeGroupText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
});
