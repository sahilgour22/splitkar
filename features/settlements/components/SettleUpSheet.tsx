import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { GroupAvatar } from '@/features/groups/components/GroupAvatar';
import { formatMoney, fromPaise, toPaise } from '@/utils/money';
import type { RecordSettlementInput } from '../types';

const UPI_AMOUNT_CAP_PAISE = 10_000_000n; // ₹1,00,000 NPCI cap

function buildUpiLink(params: {
  vpa: string;
  name: string;
  amountPaise: bigint;
  note: string;
}): string {
  const rupees = fromPaise(Number(params.amountPaise));
  const safeNote = params.note.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 50) || 'Splitkar settlement';
  return (
    `upi://pay?pa=${encodeURIComponent(params.vpa)}` +
    `&pn=${encodeURIComponent(params.name)}` +
    `&am=${rupees.toFixed(2)}` +
    `&cu=INR` +
    `&tn=${encodeURIComponent(safeNote)}`
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  currency: string;
  debtPaise: bigint;
  payeeId: string;
  payeeName: string;
  payeeAvatarUrl: string | null;
  payeeUpiId: string | null;
  onRecord: (input: RecordSettlementInput) => Promise<void>;
  isPending: boolean;
}

export function SettleUpSheet({
  visible,
  onClose,
  groupId,
  currency,
  debtPaise,
  payeeId,
  payeeName,
  payeeAvatarUrl,
  payeeUpiId,
  onRecord,
  isPending,
}: Props) {
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [awaitingUpiConfirm, setAwaitingUpiConfirm] = useState(false);
  const pendingUpiRef = useRef<string | null>(null);

  // Pre-fill with full debt on open
  useEffect(() => {
    if (visible) {
      setAmountStr(fromPaise(Number(debtPaise)).toFixed(2).replace(/\.00$/, ''));
      setNote('');
      setAwaitingUpiConfirm(false);
      pendingUpiRef.current = null;
    }
  }, [visible, debtPaise]);

  const amountPaise = BigInt(Math.round(toPaise(parseFloat(amountStr) || 0)));
  const amountValid =
    amountPaise > 0n && amountPaise <= debtPaise && amountPaise <= UPI_AMOUNT_CAP_PAISE;
  const canUpi =
    !!payeeUpiId && currency === 'INR' && amountPaise <= UPI_AMOUNT_CAP_PAISE && amountValid;

  async function handleCash() {
    if (!amountValid) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await onRecord({
      group_id: groupId,
      payer_id: '', // filled by caller via currentUserId
      payee_id: payeeId,
      amount: Number(amountPaise),
      note: note.trim() || null,
      method: 'cash',
    });
  }

  async function handleUpi() {
    if (!canUpi || !payeeUpiId) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const link = buildUpiLink({
      vpa: payeeUpiId,
      name: payeeName,
      amountPaise,
      note: note.trim() || `Splitkar: pay ${payeeName}`,
    });

    const supported = await Linking.canOpenURL(link);
    if (!supported) {
      Alert.alert(
        'No UPI app found',
        'Install a UPI-enabled app (GPay, PhonePe, Paytm, etc.) to pay via UPI.',
      );
      return;
    }

    pendingUpiRef.current = link;
    await Linking.openURL(link);

    // After returning to app, ask confirmation
    setAwaitingUpiConfirm(true);
  }

  async function handleUpiConfirm(didPay: boolean) {
    setAwaitingUpiConfirm(false);
    if (!didPay) return;

    await onRecord({
      group_id: groupId,
      payer_id: '',
      payee_id: payeeId,
      amount: Number(amountPaise),
      note: note.trim() || null,
      method: 'upi',
      upi_ref: pendingUpiRef.current ?? undefined,
    });
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <GroupAvatar name={payeeName} avatarUrl={payeeAvatarUrl} size="sm" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.title}>Settle up with {payeeName}</Text>
            <Text style={styles.subtitle}>Debt: {formatMoney(Number(debtPaise), currency)}</Text>
          </View>
        </View>

        {/* Amount */}
        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountRow}>
          <Text style={styles.currencySymbol}>{currency === 'INR' ? '₹' : currency}</Text>
          <TextInput
            value={amountStr}
            onChangeText={(t) =>
              setAmountStr(t.replace(/[^0-9.]/g, '').replace(/(\.\d{2})\d+/, '$1'))
            }
            keyboardType="decimal-pad"
            style={styles.amountInput}
            selectTextOnFocus
            accessibilityLabel="Settlement amount"
          />
        </View>

        {/* Note */}
        <Text style={[styles.label, { marginTop: 12 }]}>Note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Dinner bill"
          maxLength={100}
          style={styles.noteInput}
          accessibilityLabel="Settlement note"
        />

        {/* UPI confirmation dialog */}
        {awaitingUpiConfirm ? (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>Did the payment go through?</Text>
            <View style={styles.confirmButtons}>
              <Pressable
                onPress={() => void handleUpiConfirm(false)}
                style={[styles.confirmBtn, styles.confirmBtnNo]}
              >
                <Text style={styles.confirmBtnNoText}>No</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleUpiConfirm(true)}
                style={[styles.confirmBtn, styles.confirmBtnYes]}
                disabled={isPending}
              >
                <Text style={styles.confirmBtnYesText}>{isPending ? 'Saving…' : 'Yes, paid!'}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.actions}>
            {/* UPI button */}
            {payeeUpiId && currency === 'INR' ? (
              <Pressable
                onPress={() => void handleUpi()}
                disabled={!canUpi || isPending}
                style={[styles.btn, styles.btnUpi, (!canUpi || isPending) && styles.btnDisabled]}
                accessibilityLabel="Pay with UPI"
                accessibilityRole="button"
              >
                <Text style={styles.btnUpiText}>Pay with UPI</Text>
              </Pressable>
            ) : (
              !payeeUpiId && (
                <Text style={styles.noUpiNote}>
                  {payeeName} hasn&apos;t added their UPI ID — only cash settlement available.
                </Text>
              )
            )}

            {/* Cash button */}
            <Pressable
              onPress={() => void handleCash()}
              disabled={!amountValid || isPending}
              style={[
                styles.btn,
                styles.btnCash,
                (!amountValid || isPending) && styles.btnDisabled,
              ]}
              accessibilityLabel="Mark as paid"
              accessibilityRole="button"
            >
              <Text style={styles.btnCashText}>
                {isPending ? 'Saving…' : 'Mark as paid (cash / other)'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#6C47FF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 20,
    color: '#64748B',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    padding: 0,
  },
  noteInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#0F172A',
  },
  actions: {
    marginTop: 20,
    gap: 10,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnUpi: {
    backgroundColor: '#10B981',
  },
  btnUpiText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  btnCash: {
    backgroundColor: '#6C47FF',
  },
  btnCashText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  noUpiNote: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 4,
  },
  confirmBox: {
    marginTop: 20,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065F46',
    textAlign: 'center',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmBtnNo: {
    backgroundColor: '#F1F5F9',
  },
  confirmBtnNoText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmBtnYes: {
    backgroundColor: '#10B981',
  },
  confirmBtnYesText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
