import { Pressable, Text, View } from 'react-native';
import Animated, { Layout } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';

import { GroupAvatar } from '@/features/groups/components/GroupAvatar';
import { formatMoney } from '@/utils/money';
import { splitEqually } from '@/utils/splits';
import type { ParticipantSplit } from '../types';

interface Props {
  participants: ParticipantSplit[];
  totalPaise: number;
  currency: string;
  onChange: (updated: ParticipantSplit[]) => void;
}

export function SplitEqualTab({ participants, totalPaise, currency, onChange }: Props) {
  const included = participants.filter((p) => p.included);
  const amounts =
    included.length > 0 ? splitEqually(BigInt(totalPaise), included.length).map(Number) : [];

  // Map computed amounts back to included participants
  const displayParticipants = participants.map((p) => {
    if (!p.included) return { ...p, amount: 0 };
    const idx = included.findIndex((ip) => ip.user_id === p.user_id);
    return { ...p, amount: amounts[idx] ?? 0 };
  });

  function toggle(userId: string) {
    const updated = displayParticipants.map((p) =>
      p.user_id === userId ? { ...p, included: !p.included } : p,
    );
    // Recompute amounts after toggle
    const newIncluded = updated.filter((p) => p.included);
    const newAmounts =
      newIncluded.length > 0
        ? splitEqually(BigInt(totalPaise), newIncluded.length).map(Number)
        : [];
    const final = updated.map((p) => {
      if (!p.included) return { ...p, amount: 0 };
      const idx = newIncluded.findIndex((ip) => ip.user_id === p.user_id);
      return { ...p, amount: newAmounts[idx] ?? 0 };
    });
    onChange(final);
  }

  if (participants.length === 0) {
    return (
      <View style={{ paddingVertical: 32, alignItems: 'center' }}>
        <Text style={{ color: '#94A3B8', fontSize: 14 }}>No members in this group</Text>
      </View>
    );
  }

  return (
    <Animated.View layout={Layout.springify()}>
      <Text
        style={{
          fontSize: 12,
          color: '#64748B',
          marginBottom: 10,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        Select participants
      </Text>

      {displayParticipants.map((p) => (
        <Animated.View key={p.user_id} layout={Layout.springify()}>
          <Pressable
            onPress={() => toggle(p.user_id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#F1F5F9',
              gap: 12,
            }}
            accessibilityLabel={`${p.included ? 'Exclude' : 'Include'} ${p.name}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: p.included }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: p.included ? '#6C47FF' : '#CBD5E1',
                backgroundColor: p.included ? '#6C47FF' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {p.included && <Check size={13} color="#fff" strokeWidth={3} />}
            </View>

            <GroupAvatar name={p.name} avatarUrl={p.avatar_url} size="sm" />

            <Text style={{ flex: 1, fontSize: 15, color: '#0F172A' }} numberOfLines={1}>
              {p.name}
            </Text>

            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: p.included ? '#6C47FF' : '#CBD5E1',
              }}
            >
              {p.included && p.amount > 0 ? formatMoney(p.amount, currency) : '—'}
            </Text>
          </Pressable>
        </Animated.View>
      ))}

      {included.length > 0 && (
        <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, color: '#64748B' }}>
            {included.length} participant{included.length !== 1 ? 's' : ''}
          </Text>
          <Text style={{ fontSize: 13, color: '#6C47FF', fontWeight: '600' }}>
            {formatMoney(amounts[0] ?? 0, currency)} each
            {amounts[0] !== amounts[amounts.length - 1] ? '*' : ''}
          </Text>
        </View>
      )}
      {amounts[0] !== amounts[amounts.length - 1] && included.length > 0 && (
        <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
          * First participant gets 1 paise extra due to rounding
        </Text>
      )}
    </Animated.View>
  );
}
