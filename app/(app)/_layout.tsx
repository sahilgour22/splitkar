import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

// Placeholder tab icons — swap for a proper icon library in Slice 2
const TAB_ICONS = {
  groups: '👥',
  activity: '🔔',
  profile: '👤',
} as const;

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6C47FF',
        tabBarInactiveTintColor: '#94A3B8',
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
          tabBarIcon: ({ focused }) => (focused ? '👥' : TAB_ICONS.groups),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: () => TAB_ICONS.activity,
          href: null, // hidden until Slice 8
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => TAB_ICONS.profile,
          href: null, // hidden until Slice 2
        }}
      />
    </Tabs>
  );
}
