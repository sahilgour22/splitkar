import { Text, View } from 'react-native';

import { SafeView } from '@/components/layout/SafeView';

// TODO(team): implement user profile in Slice 2
export default function ProfileScreen() {
  return (
    <SafeView>
      <View className="flex-1 items-center justify-center gap-3">
        <Text className="text-4xl">👤</Text>
        <Text className="text-lg font-semibold text-slate-700">Profile — Slice 2</Text>
      </View>
    </SafeView>
  );
}
