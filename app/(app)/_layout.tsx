import { useMemo } from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Bell, User, Users } from 'lucide-react-native';

import { useMyGroups } from '@/features/groups/hooks';
import { useActivityBadge, useActivityRealtime } from '@/features/activity/hooks';
import { useCurrentUserId } from '@/hooks/useSession';

const ACTIVE = '#6C47FF';
const INACTIVE = '#A1A1AA';

export default function AppLayout() {
  const currentUserId = useCurrentUserId();
  const { data: groups } = useMyGroups();
  const groupIds = useMemo(() => groups?.map((g) => g.id) ?? [], [groups]);

  const { data: badgeCount = 0 } = useActivityBadge(currentUserId, groupIds);

  // Subscribe to realtime activity inserts to refresh badge + feeds
  useActivityRealtime(groupIds);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          borderTopColor: '#E2E8F0',
          paddingBottom: Platform.OS === 'ios' ? 0 : 8,
        },
      }}
    >
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color }) => <Users size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => <Bell size={22} color={color} />,
          tabBarBadge: badgeCount > 0 ? badgeCount : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />
      {/* join/[code] — deep-link only */}
      <Tabs.Screen name="join" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
