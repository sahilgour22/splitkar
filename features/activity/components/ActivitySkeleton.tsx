import { View } from 'react-native';

function SkeletonLine({ width, height = 12 }: { width: `${number}%` | number; height?: number }) {
  return (
    <View
      style={{
        height,
        width,
        borderRadius: 6,
        backgroundColor: '#E2E8F0',
      }}
    />
  );
}

export function ActivitySkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#F1F5F9',
            gap: 12,
          }}
        >
          {/* Avatar */}
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E2E8F0' }} />

          {/* Content */}
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonLine width="75%" height={13} />
            <SkeletonLine width="45%" height={11} />
          </View>

          {/* Time */}
          <SkeletonLine width={36} height={11} />
        </View>
      ))}
    </>
  );
}
