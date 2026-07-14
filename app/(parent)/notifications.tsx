import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { COLORS, SPACING, FONT_SIZES } from '@/lib/constants';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Notification } from '@/types';

export default function ParentNotificationsScreen() {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setNotifications((data as Notification[]) ?? []);
  };

  useEffect(() => {
    fetchNotifications();
  }, [profile?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const markAllRead = async () => {
    if (!profile) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', profile.id)
      .eq('read', false);
    await fetchNotifications();
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <Card style={!item.read ? { ...styles.notifCard, ...styles.unread } : styles.notifCard}>
      <View style={styles.notifRow}>
        <Ionicons
          name="notifications"
          size={20}
          color={item.read ? COLORS.textLight : COLORS.primary}
        />
        <View style={styles.notifInfo}>
          <Text style={styles.notifTitle}>{item.title}</Text>
          <Text style={styles.notifBody}>{item.body}</Text>
          <Text style={styles.notifDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </Card>
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('notifications.title')} />
      {unreadCount > 0 && (
        <Button
          title={t('notifications.markAllRead')}
          onPress={markAllRead}
          variant="outline"
          size="sm"
          style={styles.markReadBtn}
        />
      )}
      <FlatList
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState icon="notifications-off-outline" title={t('notifications.noNotifications')} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  markReadBtn: {
    margin: SPACING.lg,
    marginBottom: 0,
  },
  list: {
    padding: SPACING.lg,
  },
  notifCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  unread: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notifInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  notifTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  notifBody: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  notifDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
});
