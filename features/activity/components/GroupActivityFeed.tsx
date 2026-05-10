import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useGroupActivities } from '../hooks';
import { ActivityRow } from './ActivityRow';
import { ActivitySkeleton } from './ActivitySkeleton';

interface Props {
  groupId: string;
  currency: string;
  currentUserId: string;
}

export function GroupActivityFeed({ groupId, currency, currentUserId }: Props) {
  const query = useGroupActivities(groupId);
  const allItems = query.data?.pages.flatMap((p) => p.items) ?? [];

  if (query.isLoading) {
    return (
      <View style={{ backgroundColor: '#fff', marginTop: 12 }}>
        <ActivitySkeleton count={6} />
      </View>
    );
  }

  if (allItems.length === 0) {
    return (
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
          <Text style={{ fontSize: 28 }}>📋</Text>
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
          No activity yet
        </Text>
        <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 21 }}>
          Expenses, settlements, and member changes will appear here.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: '#fff', marginTop: 12 }}>
      {allItems.map((activity) => (
        <ActivityRow
          key={activity.id}
          activity={activity}
          currentUserId={currentUserId}
          currency={currency}
        />
      ))}

      {/* Load more */}
      {query.hasNextPage && (
        <Pressable
          onPress={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          style={{
            paddingVertical: 14,
            alignItems: 'center',
            borderTopWidth: 1,
            borderTopColor: '#F1F5F9',
          }}
          accessibilityRole="button"
          accessibilityLabel="Load more activity"
        >
          {query.isFetchingNextPage ? (
            <ActivityIndicator size="small" color="#6C47FF" />
          ) : (
            <Text style={{ fontSize: 14, color: '#6C47FF', fontWeight: '600' }}>Load more</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}
