import { useEffect, useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMyGroups } from '@/features/groups/hooks';
import { useGlobalActivities, useMarkActivitiesSeen } from '@/features/activity/hooks';
import { ActivityRow } from '@/features/activity/components/ActivityRow';
import { ActivitySkeleton } from '@/features/activity/components/ActivitySkeleton';
import { useCurrentUserId } from '@/hooks/useSession';
import type { ActivityWithActor } from '@/features/activity/types';

export default function GlobalActivityScreen() {
  const insets = useSafeAreaInsets();
  const currentUserId = useCurrentUserId();

  const { data: groups } = useMyGroups();
  const groupIds = useMemo(() => groups?.map((g) => g.id) ?? [], [groups]);

  const query = useGlobalActivities(groupIds);
  const markSeen = useMarkActivitiesSeen(currentUserId);

  const allItems: ActivityWithActor[] = query.data?.pages.flatMap((p) => p.items) ?? [];
  const newestId = allItems[0]?.id;

  // Mark newest activity as seen whenever the feed renders with data
  useEffect(() => {
    if (newestId) void markSeen(newestId);
  }, [newestId, markSeen]);

  function renderFooter() {
    if (!query.hasNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#6C47FF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>

      {query.isLoading && groupIds.length > 0 ? (
        <View style={{ backgroundColor: '#fff' }}>
          <ActivitySkeleton count={8} />
        </View>
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ActivityRow activity={item} currentUserId={currentUserId} showGroupBadge />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptySubtitle}>
                Add an expense or settle up — it will appear here.
              </Text>
            </View>
          }
          ListFooterComponent={renderFooter}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              void query.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching && !query.isFetchingNextPage}
              onRefresh={() => void query.refetch()}
              tintColor="#6C47FF"
            />
          }
          contentContainerStyle={allItems.length === 0 ? { flex: 1 } : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 21 },
  footer: { paddingVertical: 20, alignItems: 'center' },
});
