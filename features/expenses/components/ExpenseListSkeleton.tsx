import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { View } from 'react-native';

function SkeletonBlock({
  width,
  height,
  borderRadius = 6,
  opacity,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  opacity: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: '#E2E8F0',
        },
        style,
      ]}
    />
  );
}

function SkeletonRow({ opacity }: { opacity: SharedValue<number> }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        gap: 12,
      }}
    >
      {/* Avatar placeholder */}
      <SkeletonBlock width={36} height={36} borderRadius={18} opacity={opacity} />

      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBlock width="70%" height={14} opacity={opacity} />
        <SkeletonBlock width="45%" height={11} opacity={opacity} />
      </View>

      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <SkeletonBlock width={64} height={14} opacity={opacity} />
        <SkeletonBlock width={40} height={11} opacity={opacity} />
      </View>
    </View>
  );
}

export function ExpenseListSkeleton({ count = 5 }: { count?: number }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} opacity={opacity} />
      ))}
    </>
  );
}
