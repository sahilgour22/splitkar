import { Text, View } from 'react-native';

export function EmptyGroups() {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <Text className="text-5xl">🤝</Text>
      <Text className="text-xl font-bold text-slate-800 text-center">No groups yet</Text>
      <Text className="text-base text-slate-500 text-center leading-6">
        Create a group to start splitting expenses with friends, roommates, or travel buddies.
      </Text>
    </View>
  );
}
