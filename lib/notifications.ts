import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { NotificationType } from '@/types';
import { Json } from '@/types/database';

const isExpoGo = Constants.appOwnership === 'expo';

// expo-notifications is not available in Expo Go since SDK 53
let Notifications: typeof import('expo-notifications') | null = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch {
    // Silently skip if not available
  }
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Notifications) {
    console.warn('[Notifications] Not available - skipping registration');
    return null;
  }

  if (!Device.isDevice) {
    console.warn('[Notifications] Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Push notification permission not granted');
    return null;
  }

  // Get the Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: undefined, // Uses the project ID from app.json
  });
  const token = tokenData.data;

  // Store token in user's profile
  await supabase
    .from('profiles')
    .update({ expo_push_token: token })
    .eq('id', userId);

  // Android-specific channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
    });
  }

  return token;
}

// Send push notification via Expo Push API
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data: data ?? {},
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

// Helper: notify all parents in a family
export async function notifyParents(
  familyId: string,
  title: string,
  body: string,
  type: NotificationType = 'mission_submitted',
  data?: Record<string, unknown>
) {
  const { data: parents } = await supabase
    .from('profiles')
    .select('id, expo_push_token')
    .eq('family_id', familyId)
    .eq('role', 'parent') as { data: { id: string; expo_push_token: string | null }[] | null };

  if (!parents) return;

  for (const parent of parents) {
    // Create in-app notification
    await supabase.from('notifications').insert({
      recipient_id: parent.id,
      family_id: familyId,
      type,
      title,
      body,
      data: (data ?? {}) as Json,
    });

    // Send push notification if token exists
    if (parent.expo_push_token) {
      await sendPushNotification(parent.expo_push_token, title, body, data);
    }
  }
}

// Helper: notify a specific child
export async function notifyChild(
  childId: string,
  familyId: string,
  title: string,
  body: string,
  type: NotificationType,
  data?: Record<string, unknown>
) {
  const { data: child } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', childId)
    .single() as { data: { expo_push_token: string | null } | null };

  // Create in-app notification
  await supabase.from('notifications').insert({
    recipient_id: childId,
    family_id: familyId,
    type,
    title,
    body,
    data: (data ?? {}) as Json,
  });

  // Send push if token exists
  if (child?.expo_push_token) {
    await sendPushNotification(child.expo_push_token, title, body, data);
  }
}
