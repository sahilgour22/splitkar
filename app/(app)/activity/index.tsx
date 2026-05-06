import { Text, View } from 'react-native';

import { SafeView } from '@/components/layout/SafeView';

// TODO(team): implement activity feed in Slice 8
export default function ActivityScreen() {
  return (
    <SafeView>
      <View className="flex-1 items-center justify-center gap-3">
        <Text className="text-4xl">🔔</Text>
        <Text className="text-lg font-semibold text-slate-700">Activity feed — Slice 8</Text>
      </View>
    </SafeView>
  );
}
