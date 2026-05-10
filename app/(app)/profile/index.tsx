import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { supabase } from '@/lib/supabase';

const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

interface ProfileData {
  id: string;
  name: string | null;
  phone: string | null;
  upi_id: string | null;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [upiError, setUpiError] = useState('');

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = (await supabase
      .from('users')
      .select('id, name, phone, upi_id')
      .eq('id', user.id)
      .single()) as unknown as { data: ProfileData | null; error: { message: string } | null };

    if (!error && data) {
      setProfile(data);
      setName(data.name ?? '');
      setUpiId(data.upi_id ?? '');
    }
    setLoading(false);
  }

  function validateUpi(value: string): boolean {
    if (value === '') return true;
    return UPI_REGEX.test(value);
  }

  function handleUpiChange(value: string) {
    setUpiId(value);
    if (value && !validateUpi(value)) {
      setUpiError('Enter a valid UPI ID (e.g. name@upi)');
    } else {
      setUpiError('');
    }
  }

  async function handleSave() {
    if (!profile) return;
    if (upiId && !validateUpi(upiId)) {
      setUpiError('Enter a valid UPI ID (e.g. name@upi)');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({
        name: name.trim() || null,
        upi_id: upiId.trim() || null,
      })
      .eq('id', profile.id);
    setSaving(false);

    if (error) {
      Alert.alert('Save failed', error.message);
    } else {
      Alert.alert('Saved', 'Profile updated successfully.');
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login' as Parameters<typeof router.replace>[0]);
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6C47FF" />
      </View>
    );
  }

  const initials = (name || profile?.phone || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const hasChanges = name !== (profile?.name ?? '') || upiId !== (profile?.upi_id ?? '');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8FAFC' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {profile?.phone && <Text style={styles.phone}>{profile.phone}</Text>}
        </View>

        {/* Fields */}
        <View style={styles.section}>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            style={styles.input}
            maxLength={60}
            returnKeyType="done"
            accessibilityLabel="Display name"
          />

          <Text style={[styles.label, { marginTop: 16 }]}>UPI ID</Text>
          <TextInput
            value={upiId}
            onChangeText={handleUpiChange}
            placeholder="yourname@upi"
            style={[styles.input, upiError ? styles.inputError : null]}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={80}
            returnKeyType="done"
            accessibilityLabel="UPI ID"
          />
          {upiError ? (
            <Text style={styles.errorText}>{upiError}</Text>
          ) : (
            <Text style={styles.hint}>
              Used for UPI payments in group settlements (e.g. name@okicici)
            </Text>
          )}
        </View>

        {/* Save */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => void handleSave()}
            disabled={saving || !hasChanges || !!upiError}
            style={[
              styles.saveBtn,
              (saving || !hasChanges || !!upiError) && styles.saveBtnDisabled,
            ]}
            accessibilityLabel="Save profile"
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save changes</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => void handleSignOut()}
            style={styles.signOutBtn}
            accessibilityLabel="Sign out"
            accessibilityRole="button"
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6C47FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  phone: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  section: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
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
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 17,
  },
  actions: {
    marginHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  saveBtn: {
    backgroundColor: '#6C47FF',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  signOutBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
});
