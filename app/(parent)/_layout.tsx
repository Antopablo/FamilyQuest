import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Touchable } from '@/components/ui/Touchable';
import { COLORS, SPACING } from '@/lib/constants';

export default function ParentLayout() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.textPrimary,
        tabBarStyle: { backgroundColor: COLORS.surface },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: t('dashboard.parentTitle'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: t('missions.title'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="rocket" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: t('family.title'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
          headerRight: () => (
            <Touchable
              onPress={() => router.push('/(parent)/settings')}
              accessibilityLabel={t('settings.title')}
              style={{ marginRight: SPACING.md }}
            >
              <Ionicons name="settings-outline" size={24} color={COLORS.textPrimary} />
            </Touchable>
          ),
        }}
      />
      <Tabs.Screen
        name="gifts"
        options={{
          title: t('gifts.title'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="gift" size={size} color={color} />
          ),
        }}
      />
      {/* Hide sub-routes from tabs */}
      <Tabs.Screen name="settings" options={{ href: null, headerShown: false, title: t('settings.title') }} />
      <Tabs.Screen name="add-child" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
