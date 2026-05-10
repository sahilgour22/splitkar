import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import { Copy, RefreshCw, Share2 } from 'lucide-react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { useRegenerateInviteCode } from '../hooks';
import type { GroupWithMembers } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  group: GroupWithMembers;
}

export function InviteSheet({ visible, onClose, group }: Props) {
  const [currentCode, setCurrentCode] = useState(group.invite_code);
  const regenerate = useRegenerateInviteCode(group.id);

  const deepLink = `splitkar://join/${currentCode}`;

  async function handleCopy() {
    await Clipboard.setStringAsync(currentCode);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Copied!', 'Invite code copied to clipboard.');
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Join ${group.name} on Splitkar: ${deepLink}`,
        url: deepLink,
      });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to share');
    }
  }

  async function handleRegenerate() {
    Alert.alert('Regenerate code?', 'The old invite link will stop working immediately.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Regenerate',
        style: 'destructive',
        onPress: async () => {
          const result = await regenerate.mutateAsync();
          if (result.data) {
            setCurrentCode(result.data);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            Alert.alert('Error', result.error ?? 'Failed to regenerate code.');
          }
        },
      },
    ]);
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: '#0F172A',
            marginBottom: 4,
            textAlign: 'center',
          }}
        >
          Invite to {group.name}
        </Text>
        <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24 }}>
          Share the code or link so others can join.
        </Text>

        {/* QR Code */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <QRCode value={deepLink} size={180} color="#0F172A" backgroundColor="#FFFFFF" />
        </View>

        {/* Invite code display */}
        <Pressable
          onPress={handleCopy}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F1F5F9',
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 20,
            marginBottom: 16,
            gap: 10,
          }}
          accessibilityLabel="Copy invite code"
          accessibilityRole="button"
        >
          <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: 6, color: '#0F172A' }}>
            {currentCode}
          </Text>
          <Copy size={20} color="#64748B" />
        </Pressable>

        {/* Share button */}
        <Pressable
          onPress={handleShare}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#6C47FF',
            borderRadius: 12,
            paddingVertical: 14,
            gap: 8,
            marginBottom: 12,
          }}
          accessibilityLabel="Share invite link"
          accessibilityRole="button"
        >
          <Share2 size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Share invite link</Text>
        </Pressable>

        {/* Regenerate (admin only) */}
        {group.myRole === 'admin' && (
          <Pressable
            onPress={handleRegenerate}
            disabled={regenerate.isPending}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              paddingVertical: 12,
              gap: 6,
            }}
            accessibilityLabel="Regenerate invite code"
            accessibilityRole="button"
          >
            {regenerate.isPending ? (
              <ActivityIndicator size="small" color="#64748B" />
            ) : (
              <>
                <RefreshCw size={16} color="#64748B" />
                <Text style={{ color: '#64748B', fontSize: 14 }}>Regenerate code</Text>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>
    </BottomSheet>
  );
}
