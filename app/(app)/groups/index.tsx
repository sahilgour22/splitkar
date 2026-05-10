import { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Link2, Plus, X } from 'lucide-react-native';

import { SafeView } from '@/components/layout/SafeView';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { EmptyGroups } from '@/features/groups/components/EmptyGroups';
import { GroupListItem } from '@/features/groups/components/GroupListItem';
import { useMyGroups, useJoinGroup } from '@/features/groups/hooks';
import type { GroupWithMeta } from '@/features/groups/types';

export default function GroupsScreen() {
  const router = useRouter();
  const { data: groups, isLoading, error } = useMyGroups();
  const joinGroup = useJoinGroup();

  const [showJoin, setShowJoin] = useState(false);
  const [codeInput, setCodeInput] = useState('');

  async function handleJoinByCode() {
    const code = codeInput.trim().toUpperCase();
    if (code.length < 6) {
      Alert.alert('Invalid code', 'Enter the invite code from your group admin.');
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await joinGroup.mutateAsync(code);

    if ('error' in result && result.error === 'already_member') {
      const gid = (result as { groupId?: string }).groupId;
      setShowJoin(false);
      setCodeInput('');
      router.push((gid ? `/(app)/groups/${gid}` : '/(app)/groups') as unknown as Href);
      return;
    }

    if (result.error) {
      Alert.alert(
        result.error === 'invalid_code' ? 'Invalid code' : 'Error',
        result.error === 'invalid_code'
          ? 'This code is not valid or has expired. Ask the group admin for a new one.'
          : result.error,
      );
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowJoin(false);
    setCodeInput('');
    router.push(`/(app)/groups/${result.data}` as unknown as Href);
  }

  return (
    <SafeView>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-slate-900">Splitkar!</Text>
        <Pressable
          onPress={() => setShowJoin(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 20,
            borderWidth: 1.5,
            borderColor: '#6C47FF',
          }}
          accessibilityLabel="Join a group with invite code"
          accessibilityRole="button"
        >
          <Link2 size={15} color="#6C47FF" />
          <Text style={{ color: '#6C47FF', fontWeight: '600', fontSize: 14 }}>Join</Text>
        </Pressable>
      </View>

      {isLoading && <LoadingScreen />}

      {!isLoading && error && (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base text-red-500 text-center">{String(error)}</Text>
        </View>
      )}

      {!isLoading && !error && (
        <FlatList<GroupWithMeta>
          data={groups ?? []}
          keyExtractor={(g) => g.id}
          renderItem={({ item, index }) => (
            <GroupListItem
              group={item}
              index={index}
              onPress={() => router.push(`/(app)/groups/${item.id}` as unknown as Href)}
            />
          )}
          ListEmptyComponent={<EmptyGroups />}
          contentContainerStyle={groups?.length === 0 ? { flex: 1 } : undefined}
        />
      )}

      {/* Create group FAB */}
      <Pressable
        onPress={() => router.push('/(app)/groups/new' as unknown as Href)}
        style={{
          position: 'absolute',
          bottom: 28,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#6C47FF',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#6C47FF',
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
          zIndex: 10,
        }}
        accessibilityLabel="Create new group"
        accessibilityRole="button"
      >
        <Plus size={26} color="#fff" strokeWidth={2.5} />
      </Pressable>

      {/* Join by code modal */}
      <Modal
        visible={showJoin}
        transparent
        animationType="fade"
        onRequestClose={() => setShowJoin(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'center',
            padding: 24,
          }}
          onPress={() => setShowJoin(false)}
        >
          <Pressable
            style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24 }}
            onPress={() => {}}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                Join a group
              </Text>
              <Pressable onPress={() => setShowJoin(false)} hitSlop={8} accessibilityLabel="Close">
                <X size={22} color="#94A3B8" />
              </Pressable>
            </View>
            <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 20, lineHeight: 20 }}>
              Enter the invite code shared by your group admin.
            </Text>

            {/* Code input */}
            <TextInput
              value={codeInput}
              onChangeText={(t) => setCodeInput(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="e.g. ABCD1234"
              placeholderTextColor="#CBD5E1"
              maxLength={10}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              style={{
                borderWidth: 1.5,
                borderColor: '#E2E8F0',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 22,
                fontWeight: '700',
                letterSpacing: 4,
                color: '#0F172A',
                textAlign: 'center',
                marginBottom: 16,
              }}
              accessibilityLabel="Invite code input"
            />

            {/* Join button */}
            <Pressable
              onPress={handleJoinByCode}
              disabled={joinGroup.isPending || codeInput.trim().length < 6}
              style={{
                backgroundColor: codeInput.trim().length >= 6 ? '#6C47FF' : '#E2E8F0',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
              accessibilityLabel="Join group"
              accessibilityRole="button"
            >
              <Text
                style={{
                  color: codeInput.trim().length >= 6 ? '#fff' : '#94A3B8',
                  fontWeight: '700',
                  fontSize: 16,
                }}
              >
                {joinGroup.isPending ? 'Joining…' : 'Join group'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeView>
  );
}
