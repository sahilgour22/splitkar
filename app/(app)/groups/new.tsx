import { useState } from 'react';
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
import { useRouter, Stack } from 'expo-router';
import type { Href } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Haptics from 'expo-haptics';

import { useCreateGroup } from '@/features/groups/hooks';
import { CURRENCIES } from '@/constants/currencies';

const EMOJIS = [
  '🏠',
  '✈️',
  '🍕',
  '🎉',
  '🏖️',
  '🚗',
  '🎮',
  '🛍️',
  '💼',
  '⚽',
  '🎵',
  '🍔',
  '👨‍👩‍👧‍👦',
  '🌴',
  '🏋️',
  '🎯',
];

const schema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters'),
  description: z.string().max(200, 'Description must be at most 200 characters').optional(),
  currency: z.string(),
  avatarEmoji: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewGroupScreen() {
  const router = useRouter();
  const createGroup = useCreateGroup();
  const [selectedEmoji, setSelectedEmoji] = useState<string | undefined>(undefined);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', currency: 'INR', avatarEmoji: undefined },
  });

  const selectedCurrency = watch('currency');

  async function onSubmit(values: FormValues) {
    const result = await createGroup.mutateAsync({
      name: values.name,
      description: values.description,
      currency: values.currency,
      avatarEmoji: values.avatarEmoji,
    });

    if (result.error) {
      Alert.alert('Error', result.error);
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(`/(app)/groups/${result.data}` as unknown as Href);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New Group',
          headerShown: true,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#F8FAFC' },
          headerShadowVisible: false,
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#F8FAFC' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Emoji picker */}
          <Text style={styles.label}>Group avatar (optional)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => {
                  const next = selectedEmoji === emoji ? undefined : emoji;
                  setSelectedEmoji(next);
                  setValue('avatarEmoji', next);
                }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: selectedEmoji === emoji ? '#EDE9FE' : '#F1F5F9',
                  borderWidth: selectedEmoji === emoji ? 2 : 0,
                  borderColor: '#6C47FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessibilityLabel={`Select emoji ${emoji}`}
                accessibilityRole="button"
              >
                <Text style={{ fontSize: 22 }}>{emoji}</Text>
              </Pressable>
            ))}
          </View>

          {/* Name */}
          <Text style={styles.label}>Group name *</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="e.g. Goa Trip, Flat Expenses"
                maxLength={50}
                style={[styles.input, errors.name ? styles.inputError : undefined]}
                accessibilityLabel="Group name"
              />
            )}
          />
          {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

          {/* Description */}
          <Text style={[styles.label, { marginTop: 16 }]}>Description (optional)</Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="What's this group for?"
                multiline
                numberOfLines={3}
                maxLength={200}
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                accessibilityLabel="Group description"
              />
            )}
          />
          {errors.description && <Text style={styles.error}>{errors.description.message}</Text>}

          {/* Currency */}
          <Text style={[styles.label, { marginTop: 16 }]}>Default currency</Text>
          {!showCurrencyPicker ? (
            <Pressable
              onPress={() => setShowCurrencyPicker(true)}
              style={[
                styles.input,
                { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
              ]}
              accessibilityLabel="Select currency"
              accessibilityRole="button"
            >
              <Text style={{ fontSize: 15, color: '#0F172A' }}>
                {CURRENCIES.find((c) => c.code === selectedCurrency)?.name ?? selectedCurrency}
              </Text>
              <Text style={{ color: '#94A3B8' }}>▼</Text>
            </Pressable>
          ) : (
            <View style={[styles.input, { padding: 0 }]}>
              {CURRENCIES.map((c) => (
                <Pressable
                  key={c.code}
                  onPress={() => {
                    setValue('currency', c.code);
                    setShowCurrencyPicker(false);
                  }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F1F5F9',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                  accessibilityLabel={`Select ${c.name}`}
                  accessibilityRole="button"
                >
                  <Text style={{ fontSize: 15, color: '#0F172A' }}>{c.name}</Text>
                  <Text style={{ color: '#64748B' }}>{c.symbol}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Submit */}
          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={createGroup.isPending}
            style={{
              marginTop: 28,
              backgroundColor: '#6C47FF',
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: 'center',
            }}
            accessibilityLabel="Create group"
            accessibilityRole="button"
          >
            {createGroup.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Create group</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  error: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
};
