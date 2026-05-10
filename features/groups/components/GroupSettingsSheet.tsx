import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LogOut, Settings2, Trash2, UserPlus } from 'lucide-react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { InviteSheet } from './InviteSheet';
import { useDeleteGroup, useLeaveGroup, useRenameGroup } from '../hooks';
import type { GroupWithMembers } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  group: GroupWithMembers;
}

type View_ = 'menu' | 'rename' | 'delete_confirm';

export function GroupSettingsSheet({ visible, onClose, group }: Props) {
  const router = useRouter();
  const [view, setView] = useState<View_>('menu');
  const [showInvite, setShowInvite] = useState(false);
  const [renameValue, setRenameValue] = useState(group.name);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  const leaveGroup = useLeaveGroup();
  const deleteGroup = useDeleteGroup();
  const renameGroup = useRenameGroup(group.id);

  const isAdmin = group.myRole === 'admin';

  function handleClose() {
    setView('menu');
    setRenameValue(group.name);
    setDeleteConfirmName('');
    onClose();
  }

  async function handleLeave() {
    Alert.alert(
      'Leave group?',
      "You'll lose access to expenses and balances. Your past expense splits remain in the group's history.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const result = await leaveGroup.mutateAsync(group.id);
            if (result.error) {
              Alert.alert('Cannot leave', result.error);
            } else {
              handleClose();
              router.replace('/(app)/groups');
            }
          },
        },
      ],
    );
  }

  async function handleRename() {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === group.name) {
      setView('menu');
      return;
    }
    const result = await renameGroup.mutateAsync(trimmed);
    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      handleClose();
    }
  }

  async function handleDelete() {
    if (deleteConfirmName.trim() !== group.name) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const result = await deleteGroup.mutateAsync(group.id);
    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      handleClose();
      router.replace('/(app)/groups');
    }
  }

  return (
    <>
      <BottomSheet visible={visible && !showInvite} onClose={handleClose}>
        {view === 'menu' && (
          <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 16 }}>
              Group settings
            </Text>

            <SettingRow
              icon={<UserPlus size={20} color="#6C47FF" />}
              label="Invite members"
              onPress={() => {
                handleClose();
                setShowInvite(true);
              }}
            />

            {isAdmin && (
              <SettingRow
                icon={<Settings2 size={20} color="#0F172A" />}
                label="Rename group"
                onPress={() => setView('rename')}
              />
            )}

            <SettingRow
              icon={<LogOut size={20} color="#F59E0B" />}
              label="Leave group"
              labelColor="#F59E0B"
              onPress={handleLeave}
              loading={leaveGroup.isPending}
            />

            {isAdmin && (
              <SettingRow
                icon={<Trash2 size={20} color="#EF4444" />}
                label="Delete group"
                labelColor="#EF4444"
                onPress={() => setView('delete_confirm')}
              />
            )}
          </View>
        )}

        {view === 'rename' && (
          <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>
              Rename group
            </Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              maxLength={50}
              autoFocus
              style={{
                borderWidth: 1,
                borderColor: '#E2E8F0',
                borderRadius: 10,
                padding: 12,
                fontSize: 16,
                color: '#0F172A',
                marginBottom: 12,
              }}
              accessibilityLabel="Group name"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setView('menu')}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  alignItems: 'center',
                }}
                accessibilityLabel="Cancel rename"
              >
                <Text style={{ color: '#64748B', fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleRename}
                disabled={renameGroup.isPending}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: '#6C47FF',
                  alignItems: 'center',
                }}
                accessibilityLabel="Save new group name"
              >
                {renameGroup.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {view === 'delete_confirm' && (
          <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#EF4444', marginBottom: 8 }}>
              Delete group
            </Text>
            <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 16, lineHeight: 20 }}>
              This permanently deletes the group, all expenses, and all settlements for everyone.
              Type the group name to confirm.
            </Text>
            <TextInput
              value={deleteConfirmName}
              onChangeText={setDeleteConfirmName}
              placeholder={group.name}
              autoFocus
              style={{
                borderWidth: 1,
                borderColor: '#EF4444',
                borderRadius: 10,
                padding: 12,
                fontSize: 16,
                color: '#0F172A',
                marginBottom: 12,
              }}
              accessibilityLabel="Type group name to confirm deletion"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setView('menu')}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  alignItems: 'center',
                }}
                accessibilityLabel="Cancel deletion"
              >
                <Text style={{ color: '#64748B', fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleDelete}
                disabled={deleteConfirmName.trim() !== group.name || deleteGroup.isPending}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: deleteConfirmName.trim() === group.name ? '#EF4444' : '#F1F5F9',
                  alignItems: 'center',
                }}
                accessibilityLabel="Confirm group deletion"
              >
                {deleteGroup.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={{
                      fontWeight: '600',
                      color: deleteConfirmName.trim() === group.name ? '#fff' : '#94A3B8',
                    }}
                  >
                    Delete
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </BottomSheet>

      {showInvite && (
        <InviteSheet visible={showInvite} onClose={() => setShowInvite(false)} group={group} />
      )}
    </>
  );
}

function SettingRow({
  icon,
  label,
  labelColor = '#0F172A',
  onPress,
  loading = false,
}: {
  icon: React.ReactNode;
  label: string;
  labelColor?: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        gap: 14,
      }}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      {icon}
      <Text style={{ flex: 1, fontSize: 15, color: labelColor }}>{label}</Text>
      {loading && <ActivityIndicator size="small" color="#94A3B8" />}
    </Pressable>
  );
}
