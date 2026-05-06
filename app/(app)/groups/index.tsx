import { Pressable, Text, View } from 'react-native';

import { SafeView } from '@/components/layout/SafeView';
import { EmptyGroups } from '@/features/groups/components/EmptyGroups';

export default function GroupsScreen() {
  return (
    <SafeView>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-slate-900">Splitkar!</Text>
      </View>

      {/* Body — empty state (groups list replaces this in Slice 3) */}
      <EmptyGroups />

      {/* FAB — wired to "Create group" in Slice 3 */}
      <Pressable
        onPress={() => {
          // TODO(team): navigate to /(app)/groups/new in Slice 3
        }}
        className="absolute bottom-8 right-6 w-14 h-14 bg-primary rounded-full
                   items-center justify-center shadow-lg active:opacity-80"
        accessibilityLabel="Create new group"
        accessibilityRole="button"
      >
        <Text className="text-white text-2xl font-light leading-none">+</Text>
      </Pressable>
    </SafeView>
  );
}
