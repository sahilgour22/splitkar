import { Text, View } from 'react-native';

import type { GroupMemberWithUser } from '../types';

const SIZE = 32;
const OVERLAP = 10;
const MAX_VISIBLE = 5;

interface Props {
  members: GroupMemberWithUser[];
}

const COLORS = ['#6C47FF', '#FF6B35', '#10B981', '#F59E0B', '#3B82F6'];

function Avatar({ user, index }: { user: GroupMemberWithUser['user']; index: number }) {
  const color = COLORS[index % COLORS.length] ?? COLORS[0]!;
  const initials =
    (user.name ?? '?')
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?';

  return (
    <View
      style={{
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        marginLeft: index === 0 ? 0 : -OVERLAP,
        zIndex: MAX_VISIBLE - index,
      }}
      accessibilityLabel={user.name ?? 'Member'}
    >
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}

export function MemberAvatarRow({ members }: Props) {
  const visible = members.slice(0, MAX_VISIBLE);
  const overflow = members.length - MAX_VISIBLE;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {visible.map((m, i) => (
        <Avatar key={m.id} user={m.user} index={i} />
      ))}
      {overflow > 0 && (
        <View
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            backgroundColor: '#E2E8F0',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: '#fff',
            marginLeft: -OVERLAP,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}
