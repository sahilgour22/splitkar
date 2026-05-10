import { Pressable, Text, TextInput, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { GroupAvatar } from '@/features/groups/components/GroupAvatar';
import { formatMoney } from '@/utils/money';
import { splitByPercentage } from '@/utils/splits';
import type { ParticipantSplit } from '../types';

interface Props {
  participants: ParticipantSplit[];
  totalPaise: number;
  currency: string;
  onChange: (updated: ParticipantSplit[]) => void;
}

export function SplitPercentageTab({ participants, totalPaise, currency, onChange }: Props) {
  const included = participants.filter((p) => p.included);
  const totalPct = included.reduce((sum, p) => sum + p.percentage, 0);
  const isBalanced = Math.abs(totalPct - 100) < 0.01;

  // Recompute paise amounts any time percentages change
  const withAmounts = (() => {
    if (included.length === 0) return participants;
    const pcts = included.map((p) => p.percentage);
    const amounts = splitByPercentage(BigInt(totalPaise), pcts).map(Number);
    let incIdx = 0;
    return participants.map((p) => {
      if (!p.included) return { ...p, amount: 0 };
      const a = amounts[incIdx++] ?? 0;
      return { ...p, amount: a };
    });
  })();

  function updatePct(userId: string, text: string) {
    const sanitized = text.replace(/[^0-9.]/g, '').replace(/(\.\d{2})\d+/, '$1');
    const pct = Math.min(100, parseFloat(sanitized) || 0);
    const updated = withAmounts.map((p) => (p.user_id === userId ? { ...p, percentage: pct } : p));
    // Recompute amounts
    const newIncluded = updated.filter((p) => p.included);
    const newPcts = newIncluded.map((p) => p.percentage);
    const newAmounts =
      newIncluded.length > 0 ? splitByPercentage(BigInt(totalPaise), newPcts).map(Number) : [];
    let idx = 0;
    const final = updated.map((p) => {
      if (!p.included) return { ...p, amount: 0 };
      return { ...p, amount: newAmounts[idx++] ?? 0 };
    });
    onChange(final);
  }

  function toggleIncluded(userId: string) {
    const updated = withAmounts.map((p) =>
      p.user_id === userId ? { ...p, included: !p.included, percentage: 0, amount: 0 } : p,
    );
    onChange(updated);
  }

  return (
    <View>
      {/* Total indicator */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          paddingHorizontal: 2,
        }}
      >
        <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>Total</Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: isBalanced ? '#10B981' : totalPct > 100 ? '#EF4444' : '#F59E0B',
          }}
        >
          {totalPct.toFixed(2).replace(/\.00$/, '')}%{isBalanced ? ' ✓' : ''}
        </Text>
      </View>

      {withAmounts.map((p) => (
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

          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 15, color: p.included ? '#0F172A' : '#94A3B8' }}
              numberOfLines={1}
            >
              {p.name}
            </Text>
            {p.included && p.amount > 0 && (
              <Text style={{ fontSize: 12, color: '#6C47FF', marginTop: 1 }}>
                = {formatMoney(p.amount, currency)}
              </Text>
            )}
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: p.included ? '#E2E8F0' : '#F1F5F9',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
              minWidth: 80,
              backgroundColor: p.included ? '#FFFFFF' : '#F8FAFC',
            }}
          >
            <TextInput
              value={p.percentage > 0 ? String(p.percentage) : ''}
              onChangeText={(t) => updatePct(p.user_id, t)}
              editable={p.included}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#CBD5E1"
              style={{ fontSize: 14, color: '#0F172A', minWidth: 36, padding: 0 }}
              accessibilityLabel={`Percentage for ${p.name}`}
            />
            <Text style={{ fontSize: 14, color: '#64748B' }}>%</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
