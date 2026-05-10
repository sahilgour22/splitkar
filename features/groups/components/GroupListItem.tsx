import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import type { GroupWithMeta } from '../types';
import { GroupAvatar } from './GroupAvatar';

interface Props {
  group: GroupWithMeta;
  index: number;
  onPress: () => void;
}

export function GroupListItem({ group, index, onPress }: Props) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()} exiting={FadeOutUp}>
      <Pressable
        onPress={onPress}
        className="flex-row items-center px-5 py-4 bg-white border-b border-slate-100 active:bg-slate-50"
        accessibilityLabel={`Open group ${group.name}`}
        accessibilityRole="button"
      >
        <GroupAvatar name={group.name} avatarUrl={group.avatar_url} size="md" />

        <View className="flex-1 ml-3">
          <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
            {group.name}
          </Text>
          <Text className="text-sm text-slate-500 mt-0.5">
            {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'} · No expenses yet
          </Text>
        </View>

        <ChevronRight size={18} color="#94A3B8" />
      </Pressable>
    </Animated.View>
  );
}
