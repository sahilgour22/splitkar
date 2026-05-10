import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GroupAvatar } from '@/features/groups/components/GroupAvatar';
import { formatMoney } from '@/utils/money';
import type { ExpenseWithDetails } from '../types';

export interface MemberInfo {
  name: string;
  avatar_url: string | null;
}

interface Props {
  expense: ExpenseWithDetails;
  currentUserId: string;
  memberLookup?: Record<string, MemberInfo>;
  index: number;
  onPress: () => void;
}

function formatListDate(isoDate: string): string {
  const d = new Date(isoDate);
  const now = new Date();
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  });
}

type Stake =
  | { kind: 'lent'; amount: number }
  | { kind: 'owe'; amount: number }
  | { kind: 'paid'; amount: number }
  | { kind: 'neutral' };

function computeStake(expense: ExpenseWithDetails, uid: string): Stake {
  const mySplit = expense.splits.find((s) => s.user_id === uid);
  const iPaid = expense.paid_by === uid;
  if (iPaid) {
    const lent = expense.amount - (mySplit?.amount ?? 0);
    return lent > 0 ? { kind: 'lent', amount: lent } : { kind: 'paid', amount: expense.amount };
  }
  if (mySplit) return { kind: 'owe', amount: mySplit.amount };
  return { kind: 'neutral' };
}

const STAKE_COLOR: Record<Stake['kind'], string> = {
  lent: '#10B981',
  owe: '#EF4444',
  paid: '#10B981',
  neutral: '#94A3B8',
};

const STAKE_LABEL: Record<Stake['kind'], string> = {
  lent: 'you lent',
  owe: 'you owe',
  paid: 'you paid',
  neutral: 'not involved',
};

export function ExpenseListItem({
  expense,
  currentUserId,
  memberLookup,
  index: _index,
  onPress,
}: Props) {
  const payerFromJoin = expense.payer;
  const payerFromMembers = memberLookup?.[expense.paid_by];
  const payerDisplayName = payerFromJoin?.name ?? payerFromMembers?.name ?? 'Someone';
  const payerLabel = expense.paid_by === currentUserId ? 'You' : payerDisplayName;
  const payerAvatarUrl = payerFromJoin?.avatar_url ?? payerFromMembers?.avatar_url ?? null;

  const stake = computeStake(expense, currentUserId);
  const stakeColor = STAKE_COLOR[stake.kind];
  const date = formatListDate(expense.expense_date);

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={onPress}
        android_ripple={{ color: '#EDE9FE', borderless: false }}
        style={({ pressed }) => [
          styles.pressable,
          { backgroundColor: pressed ? '#F5F3FF' : '#FFFFFF' },
        ]}
        accessibilityLabel={`${expense.description}, ${formatMoney(expense.amount, expense.currency)}`}
        accessibilityRole="button"
      >
        {/* ── Using an inner View for row layout prevents Android Pressable flex bugs ── */}
        <View style={styles.row}>
          <GroupAvatar name={payerDisplayName} avatarUrl={payerAvatarUrl} size="sm" />

          <View style={styles.middle}>
            <Text style={styles.description} numberOfLines={1}>
              {expense.description}
            </Text>
            <Text style={styles.meta}>
              {payerLabel} paid · {date}
            </Text>
          </View>

          <View style={styles.right}>
            <Text style={styles.amount}>{formatMoney(expense.amount, expense.currency)}</Text>
            {'amount' in stake && stake.amount > 0 ? (
              <Text style={[styles.stake, { color: stakeColor }]}>
                {stake.kind === 'owe' ? '−' : '+'}
                {formatMoney(stake.amount, expense.currency)}
              </Text>
            ) : (
              <Text style={[styles.stake, { color: stakeColor }]}>{STAKE_LABEL[stake.kind]}</Text>
            )}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pressable: {
    // Background is set dynamically; no flex here — let the inner row own it
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  middle: {
    flex: 1,
    marginLeft: 13,
    marginRight: 12,
  },
  description: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  meta: {
    fontSize: 12,
    color: '#94A3B8',
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  stake: {
    fontSize: 12,
    fontWeight: '600',
  },
});
