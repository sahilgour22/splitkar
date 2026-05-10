import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { supabase } from '@/lib/supabase';

export async function registerPushToken(): Promise<void> {
  // Push tokens only work on physical devices
  if (!Constants.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Splitkar',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C47FF',
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (process.env.EXPO_PUBLIC_PROJECT_ID as string | undefined);

  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : {})).data;
  } catch {
    // Silently skip — common on simulators / restricted environments
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('push_tokens').upsert(
    {
      user_id: user.id,
      token,
      platform: Platform.OS as 'ios' | 'android' | 'web',
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'token' },
  );
}
