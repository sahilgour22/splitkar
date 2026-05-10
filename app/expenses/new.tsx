import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { GroupAvatar } from '@/features/groups/components/GroupAvatar';
import { useGroup } from '@/features/groups/hooks';
import { useCreateExpense, useUpdateExpense, useExpense } from '@/features/expenses/hooks';
import { SplitEqualTab } from '@/features/expenses/components/SplitEqualTab';
import { SplitExactTab } from '@/features/expenses/components/SplitExactTab';
import { SplitPercentageTab } from '@/features/expenses/components/SplitPercentageTab';
import { SplitSharesTab } from '@/features/expenses/components/SplitSharesTab';
import { formatMoney, toPaise } from '@/utils/money';
import { splitEqually } from '@/utils/splits';
import { useCurrentUserId } from '@/hooks/useSession';
import type { ParticipantSplit, SplitType, SplitInput } from '@/features/expenses/types';

// ─── constants ────────────────────────────────────────────────────────────────

const MAX_RUPEES = 1_000_000; // ₹10,00,000
const SPLIT_TABS: { key: SplitType; label: string }[] = [
  { key: 'equal', label: 'Equal' },
  { key: 'exact', label: 'Exact' },
  { key: 'percentage', label: '%' },
  { key: 'shares', label: 'Shares' },
];

// ─── date helpers ─────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateDisplay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (iso === todayIso()) return 'Today';
  if (iso === yesterday.toISOString().slice(0, 10)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function recentDates(count = 30): string[] {
  const dates: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() - 1);
  }
  return dates;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function NewExpenseScreen() {
  const router = useRouter();
  const { groupId, expenseId } = useLocalSearchParams<{ groupId: string; expenseId?: string }>();
  const isEditing = !!expenseId;

  const currentUserId = useCurrentUserId();
  const { data: group } = useGroup(groupId ?? '');
  const { data: existingExpense } = useExpense(expenseId ?? '');
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense(groupId ?? '');

  // ── Step 1 state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paidBy, setPaidBy] = useState(currentUserId ?? '');
  const [expenseDate, setExpenseDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [showPayerSheet, setShowPayerSheet] = useState(false);
  const [showDateSheet, setShowDateSheet] = useState(false);

  // ── Step 2 state ────────────────────────────────────────────────────────────
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [participants, setParticipants] = useState<ParticipantSplit[]>([]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const totalPaise = useMemo(() => {
    const rupees = parseFloat(amountStr);
    return isNaN(rupees) ? 0 : toPaise(rupees);
  }, [amountStr]);

  const currency = group?.currency ?? 'INR';

  // ── Initialise participants from group members ───────────────────────────────
  useEffect(() => {
    if (!group || participants.length > 0) return;
    const initial: ParticipantSplit[] = group.members.map((m) => ({
      user_id: m.user_id,
      name: m.user.name ?? 'Unknown',
      avatar_url: m.user.avatar_url,
      included: true,
      amount: 0,
      exactStr: '',
      percentage: 0,
      shares: 1,
    }));
    setParticipants(initial);
  }, [group, participants.length]);

  // ── Set paidBy default once user is known ────────────────────────────────────
  useEffect(() => {
    if (currentUserId && !paidBy) setPaidBy(currentUserId);
  }, [currentUserId, paidBy]);

  // ── Pre-fill form for editing ────────────────────────────────────────────────
  useEffect(() => {
    if (!isEditing || !existingExpense || !group) return;
    setDescription(existingExpense.description);
    setAmountStr(String(existingExpense.amount / 100));
    setPaidBy(existingExpense.paid_by);
    setExpenseDate(existingExpense.expense_date.slice(0, 10));
    setNote(existingExpense.note ?? '');
    setSplitType(existingExpense.split_type);

    const filled: ParticipantSplit[] = group.members.map((m) => {
      const split = existingExpense.splits.find((s) => s.user_id === m.user_id);
      return {
        user_id: m.user_id,
        name: m.user.name ?? 'Unknown',
        avatar_url: m.user.avatar_url,
        included: !!split,
        amount: split?.amount ?? 0,
        exactStr: split ? String(split.amount / 100) : '',
        percentage: split?.percentage ?? 0,
        shares: split?.share_units ?? 1,
      };
    });
    setParticipants(filled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, existingExpense?.id, group?.id]);

  // ── Recompute equal split when total or participants change ──────────────────
  const recomputeEqual = useCallback(
    (ps: ParticipantSplit[]) => {
      if (splitType !== 'equal') return ps;
      const inc = ps.filter((p) => p.included);
      if (inc.length === 0) return ps;
      const amounts = splitEqually(BigInt(totalPaise), inc.length).map(Number);
      let idx = 0;
      return ps.map((p) => {
        if (!p.included) return { ...p, amount: 0 };
        return { ...p, amount: amounts[idx++] ?? 0 };
      });
    },
    [splitType, totalPaise],
  );

  useEffect(() => {
    if (splitType === 'equal') {
      setParticipants((ps) => recomputeEqual(ps));
    }
  }, [totalPaise, splitType, recomputeEqual]);

  // ── Step 1 validation ────────────────────────────────────────────────────────
  const step1Valid = useMemo(() => {
    const d = description.trim();
    const rupees = parseFloat(amountStr);
    return (
      d.length >= 2 &&
      d.length <= 100 &&
      !isNaN(rupees) &&
      rupees > 0 &&
      rupees <= MAX_RUPEES &&
      !!paidBy
    );
  }, [description, amountStr, paidBy]);

  // ── Step 2 split validity ────────────────────────────────────────────────────
  const splitValid = useMemo(() => {
    const inc = participants.filter((p) => p.included && p.amount > 0);
    if (inc.length === 0) return false;
    const sum = inc.reduce((s, p) => s + p.amount, 0);

    if (splitType === 'equal') return Math.abs(sum - totalPaise) <= 1;
    if (splitType === 'exact') return Math.abs(sum - totalPaise) <= 1;
    if (splitType === 'percentage') {
      const totalPct = participants.filter((p) => p.included).reduce((s, p) => s + p.percentage, 0);
      return Math.abs(totalPct - 100) < 0.01 && Math.abs(sum - totalPaise) <= 1;
    }
    if (splitType === 'shares') {
      const totalSharesVal = participants
        .filter((p) => p.included)
        .reduce((s, p) => s + p.shares, 0);
      return totalSharesVal > 0 && Math.abs(sum - totalPaise) <= 1;
    }
    return false;
  }, [participants, splitType, totalPaise]);

  // ── Build split inputs for RPC ────────────────────────────────────────────────
  function buildSplits(): SplitInput[] {
    return participants
      .filter((p) => p.included && p.amount > 0)
      .map((p) => ({
        user_id: p.user_id,
        amount: p.amount,
        share_units: splitType === 'shares' ? p.shares : null,
        percentage: splitType === 'percentage' ? p.percentage : null,
      }));
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!splitValid || !groupId) return;
    const splits = buildSplits();

    if (isEditing && expenseId) {
      const result = await updateExpense.mutateAsync({
        expense_id: expenseId,
        description: description.trim(),
        amount: totalPaise,
        currency,
        paid_by: paidBy,
        split_type: splitType,
        expense_date: expenseDate,
        note: note.trim() || null,
        splits,
      });
      if (result.error) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', result.error);
        return;
      }
    } else {
      const result = await createExpense.mutateAsync({
        group_id: groupId,
        description: description.trim(),
        amount: totalPaise,
        currency,
        paid_by: paidBy,
        split_type: splitType,
        expense_date: expenseDate,
        note: note.trim() || null,
        splits,
      });
      if (result.error) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', result.error);
        return;
      }
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(`/(app)/groups/${groupId}` as unknown as Href);
  }

  const isPending = createExpense.isPending || updateExpense.isPending;

  const payerMember = group?.members.find((m) => m.user_id === paidBy);
  const payerName = payerMember?.user.name ?? 'Unknown';

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: isEditing ? 'Edit Expense' : 'Add Expense',
          headerStyle: { backgroundColor: '#F8FAFC' },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => {
                if (step === 2) setStep(1);
                else router.back();
              }}
              style={{ padding: 6 }}
              accessibilityLabel="Back"
            >
              <ChevronLeft size={24} color="#64748B" />
            </Pressable>
          ),
        }}
      />

      {/* Step indicator */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 20,
          paddingVertical: 12,
          gap: 6,
          backgroundColor: '#F8FAFC',
        }}
      >
        {[1, 2].map((s) => (
          <View
            key={s}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: step >= s ? '#6C47FF' : '#E2E8F0',
            }}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── STEP 1 ─────────────────────────────────────────────────────── */}
          {step === 1 && (
            <View>
              {/* Description */}
              <Text style={styles.label}>Description *</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Dinner, Taxi, Groceries"
                maxLength={100}
                style={[
                  styles.input,
                  description.trim().length > 0 && description.trim().length < 2
                    ? styles.inputError
                    : {},
                ]}
                returnKeyType="next"
                accessibilityLabel="Expense description"
              />
              {description.trim().length > 0 && description.trim().length < 2 && (
                <Text style={styles.errorText}>At least 2 characters</Text>
              )}

              {/* Amount */}
              <Text style={[styles.label, { marginTop: 16 }]}>Amount *</Text>
              <View style={[styles.input, { flexDirection: 'row', alignItems: 'center' }]}>
                <Text style={{ fontSize: 16, color: '#64748B', marginRight: 4 }}>₹</Text>
                <TextInput
                  value={amountStr}
                  onChangeText={(t) => {
                    const sanitized = t.replace(/[^0-9.]/g, '').replace(/(\.\d{2})\d+/, '$1');
                    setAmountStr(sanitized);
                    void Haptics.selectionAsync();
                  }}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#0F172A', padding: 0 }}
                  accessibilityLabel="Expense amount in rupees"
                />
                <Text style={{ fontSize: 13, color: '#94A3B8' }}>{currency}</Text>
              </View>
              {totalPaise > MAX_RUPEES * 100 && (
                <Text style={styles.errorText}>Maximum is ₹10,00,000</Text>
              )}
              {amountStr !== '' && parseFloat(amountStr) <= 0 && (
                <Text style={styles.errorText}>Amount must be greater than 0</Text>
              )}

              {/* Paid by */}
              <Text style={[styles.label, { marginTop: 16 }]}>Paid by</Text>
              <Pressable
                onPress={() => setShowPayerSheet(true)}
                style={[styles.input, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}
                accessibilityLabel="Select who paid"
                accessibilityRole="button"
              >
                {payerMember && (
                  <GroupAvatar name={payerName} avatarUrl={payerMember.user.avatar_url} size="sm" />
                )}
                <Text style={{ flex: 1, fontSize: 15, color: '#0F172A' }}>{payerName}</Text>
                <ChevronRight size={16} color="#94A3B8" />
              </Pressable>

              {/* Date */}
              <Text style={[styles.label, { marginTop: 16 }]}>Date</Text>
              <Pressable
                onPress={() => setShowDateSheet(true)}
                style={[styles.input, { flexDirection: 'row', alignItems: 'center' }]}
                accessibilityLabel="Select expense date"
                accessibilityRole="button"
              >
                <Text style={{ flex: 1, fontSize: 15, color: '#0F172A' }}>
                  {formatDateDisplay(expenseDate)}
                </Text>
                <ChevronRight size={16} color="#94A3B8" />
              </Pressable>

              {/* Note */}
              <Text style={[styles.label, { marginTop: 16 }]}>Note (optional)</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Add a note…"
                multiline
                numberOfLines={3}
                maxLength={500}
                style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
                accessibilityLabel="Optional note"
              />

              {/* Next button */}
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setStep(2);
                }}
                disabled={!step1Valid}
                style={[styles.primaryButton, { marginTop: 28, opacity: step1Valid ? 1 : 0.45 }]}
                accessibilityLabel="Continue to split settings"
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
                <ChevronRight size={18} color="#fff" />
              </Pressable>
            </View>
          )}

          {/* ── STEP 2 ─────────────────────────────────────────────────────── */}
          {step === 2 && (
            <View>
              {/* Summary pill */}
              <View
                style={{
                  backgroundColor: '#EDE9FE',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 20,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{ fontSize: 14, color: '#6C47FF', fontWeight: '600' }}
                  numberOfLines={1}
                >
                  {description}
                </Text>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#6C47FF' }}>
                  {formatMoney(totalPaise, currency)}
                </Text>
              </View>

              {/* Split type tabs */}
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: '#F1F5F9',
                  borderRadius: 10,
                  padding: 3,
                  marginBottom: 20,
                }}
              >
                {SPLIT_TABS.map((tab) => (
                  <Pressable
                    key={tab.key}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setSplitType(tab.key);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignItems: 'center',
                      backgroundColor: splitType === tab.key ? '#FFFFFF' : 'transparent',
                    }}
                    accessibilityLabel={`Split by ${tab.label}`}
                    accessibilityRole="tab"
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: splitType === tab.key ? '700' : '500',
                        color: splitType === tab.key ? '#6C47FF' : '#64748B',
                      }}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Active split tab */}
              {splitType === 'equal' && (
                <SplitEqualTab
                  participants={participants}
                  totalPaise={totalPaise}
                  currency={currency}
                  onChange={setParticipants}
                />
              )}
              {splitType === 'exact' && (
                <SplitExactTab
                  participants={participants}
                  totalPaise={totalPaise}
                  currency={currency}
                  onChange={setParticipants}
                />
              )}
              {splitType === 'percentage' && (
                <SplitPercentageTab
                  participants={participants}
                  totalPaise={totalPaise}
                  currency={currency}
                  onChange={setParticipants}
                />
              )}
              {splitType === 'shares' && (
                <SplitSharesTab
                  participants={participants}
                  totalPaise={totalPaise}
                  currency={currency}
                  onChange={setParticipants}
                />
              )}

              {/* Submit */}
              <Pressable
                onPress={handleSubmit}
                disabled={!splitValid || isPending}
                style={[
                  styles.primaryButton,
                  { marginTop: 28, opacity: splitValid && !isPending ? 1 : 0.45 },
                ]}
                accessibilityLabel={isEditing ? 'Save changes' : 'Create expense'}
              >
                {isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isEditing ? 'Save changes' : 'Add expense'}
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Payer picker sheet */}
      <BottomSheet visible={showPayerSheet} onClose={() => setShowPayerSheet(false)}>
        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>
            Who paid?
          </Text>
          {group?.members.map((m) => (
            <Pressable
              key={m.user_id}
              onPress={() => {
                setPaidBy(m.user_id);
                setShowPayerSheet(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
                gap: 12,
              }}
              accessibilityLabel={`${m.user.name ?? 'Unknown'} paid`}
            >
              <GroupAvatar name={m.user.name ?? '?'} avatarUrl={m.user.avatar_url} size="sm" />
              <Text style={{ flex: 1, fontSize: 15, color: '#0F172A' }}>
                {m.user.name ?? 'Unknown'}
              </Text>
              {paidBy === m.user_id && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#6C47FF',
                  }}
                />
              )}
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      {/* Date picker sheet */}
      <BottomSheet visible={showDateSheet} onClose={() => setShowDateSheet(false)}>
        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>
            When?
          </Text>
          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
            {recentDates(30).map((iso) => (
              <Pressable
                key={iso}
                onPress={() => {
                  setExpenseDate(iso);
                  setShowDateSheet(false);
                }}
                style={{
                  paddingVertical: 13,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F1F5F9',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                accessibilityLabel={formatDateDisplay(iso)}
              >
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: '#0F172A',
                    fontWeight: iso === expenseDate ? '700' : '400',
                  }}
                >
                  {formatDateDisplay(iso)}
                </Text>
                {iso === expenseDate && (
                  <View
                    style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#6C47FF' }}
                  />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </BottomSheet>
    </>
  );
}

const styles = {
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#0F172A',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: '#6C47FF',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    gap: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700' as const,
    fontSize: 16,
  },
};
