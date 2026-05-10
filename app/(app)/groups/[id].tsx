import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Plus, Settings2 } from 'lucide-react-native';

import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { GroupAvatar } from '@/features/groups/components/GroupAvatar';
import { GroupSettingsSheet } from '@/features/groups/components/GroupSettingsSheet';
import { MemberAvatarRow } from '@/features/groups/components/MemberAvatarRow';
import { useGroup, useGroupRealtime } from '@/features/groups/hooks';
import { ExpenseListItem } from '@/features/expenses/components/ExpenseListItem';
import { ExpenseListSkeleton } from '@/features/expenses/components/ExpenseListSkeleton';
import { useGroupExpenses, useExpensesRealtime } from '@/features/expenses/hooks';
import { BalancesTab } from '@/features/balances/components/BalancesTab';
import { useGroupBalances, useBalancesRealtime } from '@/features/balances/hooks';
import { useCurrentUserId } from '@/hooks/useSession';
import { GroupActivityFeed } from '@/features/activity/components/GroupActivityFeed';

type GroupTab = 'expenses' | 'balances' | 'activity';

const TABS: { key: GroupTab; label: string }[] = [
  { key: 'expenses', label: 'Expenses' },
  { key: 'balances', label: 'Balances' },
  { key: 'activity', label: 'Activity' },
];

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = id ?? '';

  const currentUserId = useCurrentUserId();
  const { data: group, isLoading, error } = useGroup(groupId);
  const {
    data: expenses,
    isLoading: expensesLoading,
    refetch: refetchExpenses,
    isFetching: expensesFetching,
  } = useGroupExpenses(groupId);

  const [activeTab, setActiveTab] = useState<GroupTab>('expenses');
  const [showSettings, setShowSettings] = useState(false);

  const {
    data: transfers,
    isLoading: balancesLoading,
    error: balancesError,
  } = useGroupBalances(groupId);

  useGroupRealtime(groupId);
  useExpensesRealtime(groupId);
  useBalancesRealtime(groupId);

  // Build a fast userId → {name, avatar_url} map so ExpenseListItem can
  // resolve payer info even when the PostgREST join doesn't populate it.
  const memberLookup = useMemo<
    Record<string, { name: string; avatar_url: string | null; upi_id: string | null }>
  >(() => {
    if (!group) return {};
    return Object.fromEntries(
      group.members.map((m) => [
        m.user.id,
        { name: m.user.name ?? '', avatar_url: m.user.avatar_url, upi_id: m.user.upi_id ?? null },
      ]),
    );
  }, [group]);

  if (isLoading) return <LoadingScreen />;

  if (error || !group) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#EF4444', fontSize: 15, textAlign: 'center' }}>
          {String(error ?? 'Group not found')}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Stack.Screen
        options={{
          title: group.name,
          headerShown: true,
          headerBackTitle: 'Groups',
          headerStyle: { backgroundColor: '#F8FAFC' },
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              onPress={() => setShowSettings(true)}
              style={{ padding: 6 }}
              accessibilityLabel="Group settings"
              accessibilityRole="button"
            >
              <Settings2 size={22} color="#64748B" />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={
          <RefreshControl
            refreshing={expensesFetching && !expensesLoading}
            onRefresh={() => void refetchExpenses()}
            tintColor="#6C47FF"
          />
        }
      >
        {/* Group header */}
        <View
          style={{
            backgroundColor: '#fff',
            paddingHorizontal: 20,
            paddingVertical: 20,
            borderBottomWidth: 1,
            borderBottomColor: '#F1F5F9',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <GroupAvatar name={group.name} avatarUrl={group.avatar_url} size="lg" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                {group.name}
              </Text>
              {group.description ? (
                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }} numberOfLines={2}>
                  {group.description}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MemberAvatarRow members={group.members} />
            <Text style={{ fontSize: 13, color: '#64748B' }}>
              {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
            </Text>
          </View>
        </View>

        {/* Tab switcher */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#fff',
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
          }}
        >
          {TABS.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                paddingVertical: 14,
                alignItems: 'center',
                borderBottomWidth: 2,
                borderBottomColor: activeTab === tab.key ? '#6C47FF' : 'transparent',
              }}
              accessibilityLabel={tab.label}
              accessibilityRole="tab"
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: activeTab === tab.key ? '700' : '500',
                  color: activeTab === tab.key ? '#6C47FF' : '#64748B',
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Expenses tab ── */}
        {activeTab === 'expenses' && (
          <>
            {expensesLoading ? (
              <View style={{ backgroundColor: '#fff', marginTop: 12, borderRadius: 0 }}>
                <ExpenseListSkeleton count={5} />
              </View>
            ) : expenses && expenses.length > 0 ? (
              <View
                style={{
                  backgroundColor: '#fff',
                  marginTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: '#F1F5F9',
                }}
              >
                {expenses.map((expense, idx) => (
                  <ExpenseListItem
                    key={expense.id}
                    expense={expense}
                    currentUserId={currentUserId ?? ''}
                    memberLookup={memberLookup}
                    index={idx}
                    onPress={() =>
                      router.push({
                        pathname: '/expenses/[id]',
                        params: { id: expense.id },
                      } as Parameters<typeof router.push>[0])
                    }
                  />
                ))}
              </View>
            ) : (
              <View style={{ paddingTop: 64, paddingHorizontal: 32, alignItems: 'center' }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: '#F1F5F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ fontSize: 28 }}>🧾</Text>
                </View>
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: '700',
                    color: '#0F172A',
                    marginBottom: 8,
                    textAlign: 'center',
                  }}
                >
                  No expenses yet
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: '#64748B',
                    textAlign: 'center',
                    lineHeight: 21,
                  }}
                >
                  Tap the + button to add your first expense and start splitting with the group.
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── Balances tab ── */}
        {activeTab === 'balances' && (
          <BalancesTab
            groupId={groupId}
            transfers={transfers ?? []}
            currentUserId={currentUserId ?? ''}
            memberLookup={memberLookup}
            currency={group.currency}
            isLoading={balancesLoading}
            error={balancesError ? String(balancesError) : null}
          />
        )}

        {/* ── Activity tab ── */}
        {activeTab === 'activity' && (
          <View style={{ paddingBottom: 40 }}>
            <GroupActivityFeed
              groupId={groupId}
              currency={group.currency}
              currentUserId={currentUserId ?? ''}
            />
          </View>
        )}
      </ScrollView>

      {/* FAB — Add expense (only on Expenses tab) */}
      {activeTab === 'expenses' && (
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push({
              pathname: '/expenses/new',
              params: { groupId },
            } as Parameters<typeof router.push>[0]);
          }}
          style={styles.fab}
          accessibilityLabel="Add expense"
          accessibilityRole="button"
        >
          <Plus size={28} color="#fff" strokeWidth={2.5} />
        </Pressable>
      )}

      <GroupSettingsSheet
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        group={group}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#6C47FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 12,
    zIndex: 100,
  },
});
