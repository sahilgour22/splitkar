import { Pressable, Text, TextInput, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { GroupAvatar } from '@/features/groups/components/GroupAvatar';
import { formatMoney, toPaise } from '@/utils/money';
import type { ParticipantSplit } from '../types';

interface Props {
  participants: ParticipantSplit[];
  totalPaise: number;
  currency: string;
  onChange: (updated: ParticipantSplit[]) => void;
}

export function SplitExactTab({ participants, totalPaise, currency, onChange }: Props) {
  const allocatedPaise = participants
    .filter((p) => p.included)
    .reduce((sum, p) => sum + toPaise(parseFloat(p.exactStr) || 0), 0);

  const remainingPaise = totalPaise - allocatedPaise;
  const isBalanced = Math.abs(remainingPaise) <= 1; // 1 paise tolerance

  function updateAmount(userId: string, text: string) {
    // Allow digits and a single decimal point, max 2 dp
    const sanitized = text.replace(/[^0-9.]/g, '').replace(/(\.\d{2})\d+/, '$1');
    const updated = participants.map((p) => {
      if (p.user_id !== userId) return p;
      const paise = toPaise(parseFloat(sanitized) || 0);
      return { ...p, exactStr: sanitized, amount: paise };
    });
    onChange(updated);
  }

  function toggleIncluded(userId: string) {
    const updated = participants.map((p) =>
      p.user_id === userId ? { ...p, included: !p.included, exactStr: '', amount: 0 } : p,
    );
    onChange(updated);
  }

  return (
    <View>
      {/* Remaining indicator */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          paddingHorizontal: 2,
        }}
      >
        <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>Remaining</Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: isBalanced ? '#10B981' : remainingPaise < 0 ? '#EF4444' : '#F59E0B',
          }}
        >
          {remainingPaise === 0
            ? '✓ Balanced'
            : formatMoney(Math.abs(remainingPaise), currency) +
              (remainingPaise > 0 ? ' left' : ' over')}
        </Text>
      </View>

      {participants.map((p) => (
        <View
          key={p.user_id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: '#F1F5F9',
            gap: 10,
          }}
        >
          <Pressable
            onPress={() => toggleIncluded(p.user_id)}
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
            accessibilityLabel={`${p.included ? 'Exclude' : 'Include'} ${p.name}`}
            accessibilityRole="checkbox"
          >
            {p.included && <Check size={13} color="#fff" strokeWidth={3} />}
          </Pressable>

          <GroupAvatar name={p.name} avatarUrl={p.avatar_url} size="sm" />

          <Text
            style={{ flex: 1, fontSize: 15, color: p.included ? '#0F172A' : '#94A3B8' }}
            numberOfLines={1}
          >
            {p.name}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: p.included ? '#E2E8F0' : '#F1F5F9',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
              minWidth: 90,
              backgroundColor: p.included ? '#FFFFFF' : '#F8FAFC',
            }}
          >
            <Text style={{ fontSize: 14, color: '#64748B', marginRight: 2 }}>₹</Text>
            <TextInput
              value={p.exactStr}
              onChangeText={(t) => updateAmount(p.user_id, t)}
              editable={p.included}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#CBD5E1"
              style={{ fontSize: 14, color: '#0F172A', minWidth: 60, padding: 0 }}
              accessibilityLabel={`Amount for ${p.name}`}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
