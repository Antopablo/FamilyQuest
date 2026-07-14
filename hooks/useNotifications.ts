import { useEffect, useRef } from 'react';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

// Detect if running in Expo Go (notifications don't work there since SDK 53)
const isExpoGo = Constants.appOwnership === 'expo';

export function useNotifications() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (!profile?.id || isExpoGo) return;

    let Notifications: typeof import('expo-notifications') | null = null;
    try {
      Notifications = require('expo-notifications');
    } catch {
      return;
    }
    if (!Notifications) return;

    // Register for push notifications
    const register = async () => {
      try {
        const { registerForPushNotifications } = require('@/lib/notifications');
        await registerForPushNotifications(profile.id);
      } catch (e) {
        console.warn('[Notifications] Failed to register:', e);
      }
    };
    register();

    // Listen for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (_notification) => {
        // Notification received in foreground
      }
    );

    // Listen for user interaction with notification (tap)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.screen) {
          router.push(data.screen as string);
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [profile?.id]);
}
