import { Text, View } from 'react-native';

interface Props {
  name: string;
  avatarUrl: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: { container: 36, text: 16, initials: 13 },
  md: { container: 48, text: 22, initials: 16 },
  lg: { container: 64, text: 30, initials: 20 },
} as const;

const GROUP_COLORS = [
  '#6C47FF',
  '#FF6B35',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length] ?? GROUP_COLORS[0]!;
}

function isEmoji(str: string): boolean {
  // Detect single emoji: doesn't start with http and is short
  return !str.startsWith('http') && str.length <= 4;
}

export function GroupAvatar({ name, avatarUrl, size = 'md' }: Props) {
  const dims = SIZE_MAP[size];

  if (avatarUrl && isEmoji(avatarUrl)) {
    return (
      <View
        style={{
          width: dims.container,
          height: dims.container,
          borderRadius: dims.container / 2,
          backgroundColor: '#F1F5F9',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityLabel={`Group avatar: ${avatarUrl}`}
      >
        <Text style={{ fontSize: dims.text }}>{avatarUrl}</Text>
      </View>
    );
  }

  // Initials fallback
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      style={{
        width: dims.container,
        height: dims.container,
        borderRadius: dims.container / 2,
        backgroundColor: colorFromName(name),
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityLabel={`Group avatar for ${name}`}
    >
      <Text style={{ color: '#fff', fontSize: dims.initials, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}
