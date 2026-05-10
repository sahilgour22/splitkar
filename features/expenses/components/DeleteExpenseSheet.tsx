import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { formatMoney } from '@/utils/money';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  description: string;
  amountPaise: number;
  currency: string;
}

export function DeleteExpenseSheet({
  visible,
  onClose,
  onConfirm,
  isPending,
  description,
  amountPaise,
  currency,
}: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#EF4444', marginBottom: 8 }}>
          Delete expense?
        </Text>
        <Text style={{ fontSize: 14, color: '#64748B', lineHeight: 20, marginBottom: 20 }}>
          This will permanently delete{' '}
          <Text style={{ fontWeight: '600', color: '#0F172A' }}>&quot;{description}&quot;</Text> (
          {formatMoney(amountPaise, currency)}) for everyone in the group.
        </Text>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={onClose}
            style={{
              flex: 1,
              paddingVertical: 13,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              alignItems: 'center',
            }}
            accessibilityLabel="Cancel deletion"
          >
            <Text style={{ color: '#64748B', fontWeight: '600', fontSize: 15 }}>Cancel</Text>
          </Pressable>

          <Pressable
            onPress={onConfirm}
            disabled={isPending}
            style={{
              flex: 1,
              paddingVertical: 13,
              borderRadius: 10,
              backgroundColor: '#EF4444',
              alignItems: 'center',
              opacity: isPending ? 0.6 : 1,
            }}
            accessibilityLabel="Confirm delete expense"
          >
            {isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Delete</Text>
            )}
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}
