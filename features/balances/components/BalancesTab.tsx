import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { GroupAvatar } from '@/features/groups/components/GroupAvatar';
import { formatMoney } from '@/utils/money';
import type { Debt } from '@/features/balances/simplify';
import { useRecordSettlement } from '@/features/settlements/hooks';
import { SettleUpSheet } from '@/features/settlements/components/SettleUpSheet';
import type { RecordSettlementInput } from '@/features/settlements/types';

export interface MemberInfo {
  name: string;
  avatar_url: string | null;
  upi_id: string | null;
}

interface Props {
  groupId: string;
  transfers: Debt[];
  currentUserId: string;
  memberLookup: Record<string, MemberInfo>;
  currency: string;
  isLoading: boolean;
  error?: string | null;
}

function resolveMember(
  id: string,
  currentUserId: string,
  lookup: Record<string, MemberInfo>,
): { label: string; display: string; avatar: string | null; upi_id: string | null } {
  const isMe = id === currentUserId;
  const member = lookup[id];
  const display = member?.name || 'Member';
  return {
    label: isMe ? 'You' : display,
    display,
    avatar: member?.avatar_url ?? null,
    upi_id: member?.upi_id ?? null,
  };
}

export function BalancesTab({
  groupId,
  transfers,
  currentUserId,
  memberLookup,
  currency,
  isLoading,
  error,
}: Props) {
  const [settleTarget, setSettleTarget] = useState<Debt | null>(null);
  const { mutateAsync: recordSettlement, isPending } = useRecordSettlement(groupId);

  async function handleRecord(input: RecordSettlementInput) {
    const result = await recordSettlement({ ...input, payer_id: currentUserId });
    if (result.error) {
      Alert.alert('Error', result.error);
      return;
    }
    setSettleTarget(null);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <View style={styles.skeletonCard}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.skeletonRow, i < 2 && styles.skeletonRowBorder]}>
              <View style={styles.skeletonAvatar} />
              <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
                <View style={[styles.skeletonLine, { width: '60%' }]} />
                <View style={[styles.skeletonLine, { width: '35%', opacity: 0.6 }]} />
              </View>
              <View style={[styles.skeletonLine, { width: 64, height: 16 }]} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (transfers.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Text style={{ fontSize: 30 }}>✅</Text>
        </View>
        <Text style={styles.emptyTitle}>All settled up!</Text>
        <Text style={styles.emptyBody}>
          No outstanding balances in this group. Add an expense to start tracking.
        </Text>
      </View>
    );
  }

  const myTransfers = transfers.filter(
    (t) => t.debtor_id === currentUserId || t.creditor_id === currentUserId,
  );
  const otherTransfers = transfers.filter(
    (t) => t.debtor_id !== currentUserId && t.creditor_id !== currentUserId,
  );

  const myNet = transfers.reduce((acc, t) => {
    if (t.creditor_id === currentUserId) return acc + Number(t.amount);
    if (t.debtor_id === currentUserId) return acc - Number(t.amount);
    return acc;
  }, 0);

  const payee = settleTarget
    ? resolveMember(settleTarget.creditor_id, currentUserId, memberLookup)
    : null;

  return (
    <View style={styles.container}>
      {/* ── Net summary banner ── */}
      <View
        style={[
          styles.summaryBanner,
          myNet > 0 ? styles.summaryOwed : myNet < 0 ? styles.summaryOwes : styles.summaryNeutral,
        ]}
      >
        <Text style={[styles.summaryLabel, { color: myNet >= 0 ? '#065F46' : '#991B1B' }]}>
          {myNet > 0
            ? `You are owed ${formatMoney(myNet, currency)} in total`
            : myNet < 0
              ? `You owe ${formatMoney(-myNet, currency)} in total`
              : "You're all settled up"}
        </Text>
      </View>

      {/* ── Transfers involving me ── */}
      {myTransfers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your balances</Text>
          <View style={styles.card}>
            {myTransfers.map((t, idx) => {
              const from = resolveMember(t.debtor_id, currentUserId, memberLookup);
              const to = resolveMember(t.creditor_id, currentUserId, memberLookup);
              const iOwe = t.debtor_id === currentUserId;
              return (
                <View
                  key={`${t.debtor_id}-${t.creditor_id}`}
                  style={[
                    styles.transferRow,
                    styles.transferRowHighlight,
                    idx < myTransfers.length - 1 && styles.transferRowBorder,
                  ]}
                >
                  <GroupAvatar name={from.display} avatarUrl={from.avatar} size="sm" />
                  <View style={styles.transferMiddle}>
                    <Text style={styles.transferLabel} numberOfLines={1}>
                      {from.label}
                      <Text style={styles.transferArrow}> → </Text>
                      {to.label}
                    </Text>
                    <Text style={[styles.transferSub, { color: iOwe ? '#EF4444' : '#10B981' }]}>
                      {iOwe ? 'you owe' : 'owes you'}
                    </Text>
                  </View>
                  <View style={styles.transferRight}>
                    <Text style={[styles.transferAmount, { color: iOwe ? '#EF4444' : '#10B981' }]}>
                      {formatMoney(Number(t.amount), currency)}
                    </Text>
                    {iOwe && (
                      <Pressable
                        onPress={() => setSettleTarget(t)}
                        style={styles.settleBtn}
                        accessibilityLabel={`Settle up with ${to.display}`}
                        accessibilityRole="button"
                      >
                        <Text style={styles.settleBtnText}>Settle up</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Other transfers ── */}
      {otherTransfers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other balances</Text>
          <View style={styles.card}>
            {otherTransfers.map((t, idx) => {
              const from = resolveMember(t.debtor_id, currentUserId, memberLookup);
              const to = resolveMember(t.creditor_id, currentUserId, memberLookup);
              return (
                <View
                  key={`${t.debtor_id}-${t.creditor_id}`}
                  style={[
                    styles.transferRow,
                    idx < otherTransfers.length - 1 && styles.transferRowBorder,
                  ]}
                >
                  <GroupAvatar name={from.display} avatarUrl={from.avatar} size="sm" />
                  <View style={styles.transferMiddle}>
                    <Text style={styles.transferLabel} numberOfLines={1}>
                      {from.label}
                      <Text style={styles.transferArrow}> → </Text>
                      {to.label}
                    </Text>
                  </View>
                  <Text style={[styles.transferAmount, { color: '#64748B' }]}>
                    {formatMoney(Number(t.amount), currency)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Settle Up Sheet ── */}
      {settleTarget && payee && (
        <SettleUpSheet
          visible={!!settleTarget}
          onClose={() => setSettleTarget(null)}
          groupId={groupId}
          currency={currency}
          debtPaise={settleTarget.amount}
          payeeId={settleTarget.creditor_id}
          payeeName={payee.display}
          payeeAvatarUrl={payee.avatar}
          payeeUpiId={payee.upi_id}
          onRecord={handleRecord}
          isPending={isPending}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  center: {
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  empty: {
    paddingTop: 64,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  summaryBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryOwed: {
    backgroundColor: '#ECFDF5',
  },
  summaryOwes: {
    backgroundColor: '#FEF2F2',
  },
  summaryNeutral: {
    backgroundColor: '#F1F5F9',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  transferRowHighlight: {
    backgroundColor: '#F5F3FF',
  },
  transferRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  transferMiddle: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  transferLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  transferArrow: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  transferSub: {
    fontSize: 12,
    marginTop: 2,
  },
  transferRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  transferAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  settleBtn: {
    backgroundColor: '#6C47FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  settleBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  // Skeleton
  skeletonCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  skeletonRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  skeletonAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
});
