import { Pressable, Text, View } from 'react-native';
import { Check, Minus, Plus } from 'lucide-react-native';

import { GroupAvatar } from '@/features/groups/components/GroupAvatar';
import { formatMoney } from '@/utils/money';
import { splitByShares } from '@/utils/splits';
import type { ParticipantSplit } from '../types';

interface Props {
  participants: ParticipantSplit[];
  totalPaise: number;
  currency: string;
  onChange: (updated: ParticipantSplit[]) => void;
}

export function SplitSharesTab({ participants, totalPaise, currency, onChange }: Props) {
  const included = participants.filter((p) => p.included);
  const totalShares = included.reduce((sum, p) => sum + p.shares, 0);
  const shareAmounts =
    included.length > 0
      ? splitByShares(
          BigInt(totalPaise),
          included.map((p) => p.shares),
        ).map(Number)
      : [];

  const paisePerShare = totalShares > 0 ? totalPaise / totalShares : 0;

  const withAmounts = (() => {
    let incIdx = 0;
    return participants.map((p) => {
      if (!p.included) return { ...p, amount: 0 };
      return { ...p, amount: shareAmounts[incIdx++] ?? 0 };
    });
  })();

  function setShares(userId: string, delta: number) {
    const updated = withAmounts.map((p) => {
      if (p.user_id !== userId) return p;
      const newShares = Math.max(1, p.shares + delta);
      return { ...p, shares: newShares };
    });
    // Recompute amounts
    const newIncluded = updated.filter((p) => p.included);
    const newAmounts =
      newIncluded.length > 0
        ? splitByShares(
            BigInt(totalPaise),
            newIncluded.map((p) => p.shares),
          ).map(Number)
        : [];
    let idx = 0;
    const final = updated.map((p) => {
      if (!p.included) return { ...p, amount: 0 };
      return { ...p, amount: newAmounts[idx++] ?? 0 };
    });
    onChange(final);
  }

  function toggleIncluded(userId: string) {
    const updated = withAmounts.map((p) =>
      p.user_id === userId ? { ...p, included: !p.included, shares: 1, amount: 0 } : p,
    );
    onChange(updated);
  }

  return (
    <View>
      {/* Per-share amount */}
      {totalShares > 0 && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 14,
            paddingHorizontal: 2,
          }}
        >
          <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>
            {totalShares} total share{totalShares !== 1 ? 's' : ''}
          </Text>
          <Text style={{ fontSize: 13, color: '#6C47FF', fontWeight: '600' }}>
            ≈ {formatMoney(Math.round(paisePerShare), currency)} / share
          </Text>
        </View>
      )}

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

          {/* Shares stepper */}
          {p.included ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pressable
                onPress={() => setShares(p.user_id, -1)}
                disabled={p.shares <= 1}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: p.shares <= 1 ? '#E2E8F0' : '#6C47FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessibilityLabel={`Decrease shares for ${p.name}`}
              >
                <Minus size={14} color={p.shares <= 1 ? '#CBD5E1' : '#6C47FF'} />
              </Pressable>

              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#0F172A',
                  minWidth: 20,
                  textAlign: 'center',
                }}
              >
                {p.shares}
              </Text>

              <Pressable
                onPress={() => setShares(p.user_id, 1)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#6C47FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessibilityLabel={`Increase shares for ${p.name}`}
              >
                <Plus size={14} color="#6C47FF" />
              </Pressable>
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: '#CBD5E1' }}>—</Text>
          )}
        </View>
      ))}
    </View>
  );
}
