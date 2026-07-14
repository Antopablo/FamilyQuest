import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { useNotifications } from '@/hooks/useNotifications';
import { useRealtime } from '@/hooks/useRealtime';
import { COLORS } from '@/lib/constants';
import '@/i18n';

export default function RootLayout() {
  const { session, profile, loading, initialized, initialize, signOut } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const profileCheckDone = useRef(false);

  // Initialize push notifications and realtime subscriptions
  useNotifications();
  useRealtime();

  useEffect(() => {
    initialize();
  }, []);

  // If session exists but profile is still null after init, sign out (stale session)
  useEffect(() => {
    if (!initialized || !session || profile || profileCheckDone.current) return;

    const timeout = setTimeout(() => {
      if (!useAuthStore.getState().profile) {
        profileCheckDone.current = true;
        signOut();
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [initialized, session, profile]);

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (!profile) {
      // Session but no profile yet - wait (or stale session timeout above will handle it)
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (!profile.family_id) {
      if (!inAuthGroup) {
        router.replace('/(auth)/family-setup');
      }
    } else {
      // Fully set up
      if (inAuthGroup) {
        if (profile.role === 'parent') {
          router.replace('/(parent)');
        } else {
          router.replace('/(child)');
        }
      }
    }
  }, [session, profile, initialized, segments]);

  if (!initialized || loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
