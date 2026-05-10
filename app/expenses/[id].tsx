import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Edit2, Trash2 } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { GroupAvatar } from '@/features/groups/components/GroupAvatar';
import { useGroup } from '@/features/groups/hooks';
import { DeleteExpenseSheet } from '@/features/expenses/components/DeleteExpenseSheet';
import { useExpense, useDeleteExpense } from '@/features/expenses/hooks';
import { formatMoney } from '@/utils/money';
import { useCurrentUserId } from '@/hooks/useSession';

const SPLIT_TYPE_LABELS: Record<string, string> = {
  equal: 'Split equally',
  exact: 'Split by exact amounts',
  percentage: 'Split by percentages',
  shares: 'Split by shares',
};

function formatExpenseDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const expenseId = id ?? '';

  const currentUserId = useCurrentUserId();
  const { data: expense, isLoading, error, refetch, isFetching } = useExpense(expenseId);
  const { data: group } = useGroup(expense?.group_id ?? '');

  const [showDelete, setShowDelete] = useState(false);
  const deleteExpense = useDeleteExpense(expense?.group_id ?? '');

  if (isLoading) return <LoadingScreen />;

  if (error || !expense) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#EF4444', fontSize: 15, textAlign: 'center' }}>
          {String(error ?? 'Expense not found')}
        </Text>
      </View>
    );
  }

  const isCreator = currentUserId === expense.created_by;
  const isAdmin = group?.myRole === 'admin';
  const canModify = isCreator || isAdmin;

  // Payer: DB join → group members → current user check → fallback
  const payerMember = group?.members.find((m) => m.user.id === expense.paid_by);
  const payerDisplayName = expense.payer?.name ?? payerMember?.user.name ?? 'Someone';
  const payerLabel = expense.paid_by === currentUserId ? 'You' : payerDisplayName;
  const payerAvatarUrl = expense.payer?.avatar_url ?? payerMember?.user.avatar_url ?? null;

  async function handleDelete() {
    try {
      await deleteExpense.mutateAsync(expenseId);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowDelete(false);
      router.back();
    } catch (err) {
      setShowDelete(false);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete expense');
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: expense.description,
          headerShown: true,
          headerStyle: { backgroundColor: '#F8FAFC' },
          headerShadowVisible: false,
          // Explicit back button — needed because expenses Stack has no prior history
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={styles.headerBtn}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={8}
            >
              <ChevronLeft size={26} color="#6C47FF" />
            </Pressable>
          ),
          headerRight: canModify
            ? () => (
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/expenses/new',
                        params: { expenseId },
                      } as Parameters<typeof router.push>[0])
                    }
                    style={styles.headerBtn}
                    accessibilityLabel="Edit expense"
                    accessibilityRole="button"
                    hitSlop={8}
                  >
                    <Edit2 size={20} color="#6C47FF" />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowDelete(true);
                    }}
                    style={styles.headerBtn}
                    accessibilityLabel="Delete expense"
                    accessibilityRole="button"
                    hitSlop={8}
                  >
                    <Trash2 size={20} color="#EF4444" />
                  </Pressable>
                </View>
              )
            : undefined,
        }}
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: '#F8FAFC' }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => void refetch()}
            tintColor="#6C47FF"
          />
        }
      >
        {/* Hero card */}
        <Animated.View entering={FadeInDown.springify()}>
          <View style={styles.card}>
            <Text style={styles.heroTitle} numberOfLines={3}>
              {expense.description}
            </Text>
            <Text style={styles.heroAmount}>{formatMoney(expense.amount, expense.currency)}</Text>

            <View style={{ gap: 12 }}>
              <MetaRow label="Paid by">
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <GroupAvatar name={payerDisplayName} avatarUrl={payerAvatarUrl} size="sm" />
                  <Text style={[styles.metaValue, { marginLeft: 10 }]}>{payerLabel}</Text>
                </View>
              </MetaRow>

              <MetaRow label="Date">
                <Text style={[styles.metaValue, { paddingTop: 2 }]}>
                  {formatExpenseDate(expense.expense_date)}
                </Text>
              </MetaRow>

              <MetaRow label="Split">
                <Text style={[styles.metaValue, { paddingTop: 2 }]}>
                  {SPLIT_TYPE_LABELS[expense.split_type] ?? expense.split_type}
                </Text>
              </MetaRow>

              {expense.note ? (
                <MetaRow label="Note">
                  <Text style={[styles.metaNote, { paddingTop: 2 }]}>{expense.note}</Text>
                </MetaRow>
              ) : null}
            </View>
          </View>
        </Animated.View>

        {/* Splits breakdown */}
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <View style={styles.splitsCard}>
            <View style={styles.splitsHeader}>
              <Text style={styles.splitsTitle}>How it&apos;s split</Text>
              <Text style={styles.splitsCount}>
                {expense.splits.length} participant{expense.splits.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {expense.splits.map((split, idx) => {
              const isSelf = split.user_id === currentUserId;
              const isPayer = split.user_id === expense.paid_by;
              const member = group?.members.find((m) => m.user.id === split.user_id);
              // Name resolution: group member → payer name if same person → "Member"
              const name =
                split.user_id === currentUserId
                  ? (member?.user.name ?? payerDisplayName)
                  : (member?.user.name ?? (isPayer ? payerDisplayName : 'Member'));
              const avatarUrl = member?.user.avatar_url ?? (isPayer ? payerAvatarUrl : null);

              return (
                <View
                  key={split.id}
                  style={[
                    styles.splitRow,
                    isSelf && styles.splitRowSelf,
                    idx < expense.splits.length - 1 && styles.splitRowBorder,
                  ]}
                >
                  <GroupAvatar name={name} avatarUrl={avatarUrl} size="sm" />

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={[styles.splitName, isSelf && { fontWeight: '700' }]}
                      numberOfLines={1}
                    >
                      {name}
                      {isSelf ? ' (you)' : ''}
                    </Text>
                    {(split.share_units != null || split.percentage != null) && (
                      <Text style={styles.splitMeta}>
                        {split.share_units != null
                          ? `${split.share_units} share${split.share_units !== 1 ? 's' : ''}`
                          : `${(split.percentage ?? 0).toFixed(2).replace(/\.00$/, '')}%`}
                      </Text>
                    )}
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.splitAmount, isPayer && { color: '#10B981' }]}>
                      {formatMoney(split.amount, expense.currency)}
                    </Text>
                    {isPayer && <Text style={styles.splitPaidLabel}>paid</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      <DeleteExpenseSheet
        visible={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        isPending={deleteExpense.isPending}
        description={expense.description}
        amountPaise={expense.amount}
        currency={expense.currency}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    padding: 8,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#6C47FF',
    marginBottom: 20,
    letterSpacing: -1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 24,
  },
  metaLabel: {
    fontSize: 13,
    color: '#64748B',
    width: 76,
    paddingTop: 2,
  },
  metaValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  metaNote: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  splitsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  splitsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splitsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  splitsCount: {
    fontSize: 13,
    color: '#64748B',
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    backgroundColor: '#fff',
  },
  splitRowSelf: {
    backgroundColor: '#F5F3FF',
  },
  splitRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  splitName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
  },
  splitMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  splitAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  splitPaidLabel: {
    fontSize: 11,
    color: '#10B981',
    marginTop: 2,
  },
});
