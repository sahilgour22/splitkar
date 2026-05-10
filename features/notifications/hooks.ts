import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { registerPushToken } from './api';

// Configure foreground notification display behaviour (call once at app root)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface NotifData {
  group_id?: string;
  activity_id?: string;
  expense_id?: string;
  settlement_id?: string;
}

export function usePushNotifications(isAuthenticated: boolean) {
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Register token after auth (fire-and-forget; errors are swallowed inside)
    void registerPushToken();

    // Deep-link on notification tap
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as NotifData | undefined;
        if (!data) return;

        if (data.expense_id) {
          router.push({
            pathname: '/expenses/[id]',
            params: { id: data.expense_id },
          } as Parameters<typeof router.push>[0]);
        } else if (data.group_id) {
          router.push({
            pathname: '/(app)/groups/[id]',
            params: { id: data.group_id },
          } as Parameters<typeof router.push>[0]);
        }
      },
    );

    return () => {
      responseListenerRef.current?.remove();
    };
  }, [isAuthenticated]);
}
