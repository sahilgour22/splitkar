import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { GroupAvatar } from '@/features/groups/components/GroupAvatar';
import { useGroupPreview, useJoinGroup } from '@/features/groups/hooks';

export default function JoinGroupScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();

  const inviteCode = (Array.isArray(code) ? code[0] : code) ?? '';

  const { data: preview, isLoading, error } = useGroupPreview(inviteCode);
  const joinGroup = useJoinGroup();

  async function handleJoin() {
    if (!inviteCode) return;

    const result = await joinGroup.mutateAsync(inviteCode);

    if ('error' in result && result.error === 'already_member') {
      // Navigate to the group the user is already in
      const gid = (result as { groupId: string }).groupId;
      if (gid) {
        router.replace(`/(app)/groups/${gid}` as unknown as Href);
      } else {
        Alert.alert("You're already in this group", 'Taking you there…');
        router.replace('/(app)/groups');
      }
      return;
    }

    if (result.error) {
      if (result.error === 'invalid_code') {
        Alert.alert('Invalid link', 'This invite link is no longer valid.');
      } else {
        Alert.alert('Error', result.error);
      }
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(`/(app)/groups/${result.data}` as unknown as Href);
  }

  const isInvalidCode = error?.message === 'invalid_code';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Join Group',
          headerShown: true,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#F8FAFC' },
          headerShadowVisible: false,
        }}
      />

      <View style={{ flex: 1, backgroundColor: '#F8FAFC', paddingHorizontal: 24 }}>
        {isLoading && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#6C47FF" />
            <Text style={{ marginTop: 12, color: '#64748B' }}>Looking up group…</Text>
          </View>
        )}

        {isInvalidCode && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Text style={{ fontSize: 40 }}>🔗</Text>
            <Text
              style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center' }}
            >
              This invite link is no longer valid
            </Text>
            <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 }}>
              The group may have regenerated their invite code. Ask a member for a new link.
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={{ marginTop: 8, paddingVertical: 12, paddingHorizontal: 24 }}
              accessibilityLabel="Go back"
            >
              <Text style={{ color: '#6C47FF', fontWeight: '600' }}>Go back</Text>
            </Pressable>
          </View>
        )}

        {preview && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <GroupAvatar name={preview.name} avatarUrl={preview.avatar_url} size="lg" />

            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A' }}>
                {preview.name}
              </Text>
              <Text style={{ fontSize: 14, color: '#64748B' }}>
                {preview.member_count} {preview.member_count === 1 ? 'member' : 'members'}
              </Text>
            </View>

            {preview.already_member ? (
              <View style={{ alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 14, color: '#64748B' }}>
                  {"You're already in this group."}
                </Text>
                <Pressable
                  onPress={() => router.replace(`/(app)/groups/${preview.id}` as unknown as Href)}
                  style={{
                    backgroundColor: '#6C47FF',
                    borderRadius: 12,
                    paddingVertical: 14,
                    paddingHorizontal: 32,
                  }}
                  accessibilityLabel="Open group"
                  accessibilityRole="button"
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Open group</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ alignItems: 'center', gap: 8, width: '100%' }}>
                <Text style={{ fontSize: 13, color: '#64748B' }}>
                  {"You'll be joining as a member."}
                </Text>
                <Pressable
                  onPress={handleJoin}
                  disabled={joinGroup.isPending}
                  style={{
                    backgroundColor: '#6C47FF',
                    borderRadius: 12,
                    paddingVertical: 14,
                    width: '100%',
                    alignItems: 'center',
                  }}
                  accessibilityLabel="Join group"
                  accessibilityRole="button"
                >
                  {joinGroup.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                      Join group
                    </Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>
    </>
  );
}
