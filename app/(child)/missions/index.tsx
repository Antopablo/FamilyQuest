import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useMissionsStore } from '@/stores/missionsStore';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Touchable } from '@/components/ui/Touchable';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '@/lib/constants';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Mission } from '@/types';

export default function ChildMissionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { missions, submissions, loading, fetchMissions, fetchSubmissions } = useMissionsStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const familyId = profile?.family_id;

  useEffect(() => {
    if (familyId) {
      fetchMissions(familyId);
      fetchSubmissions(familyId);
    }
  }, [familyId]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (familyId) {
      await Promise.all([fetchMissions(familyId), fetchSubmissions(familyId)]);
    }
    setRefreshing(false);
  };

  const isClaimed = (missionId: string) =>
    submissions.some(
      (s) => s.mission_id === missionId && s.child_id === profile?.id && s.status === 'claimed'
    );

  const renderMission = ({ item }: { item: Mission }) => (
    <Touchable onPress={() => router.push(`/(child)/missions/${item.id}`)}>
      <Card style={styles.missionCard}>
        <View style={styles.missionHeader}>
          <Ionicons name="rocket" size={24} color={COLORS.primary} />
          <View style={styles.missionInfo}>
            <Text style={styles.missionTitle}>{item.title}</Text>
            {item.description && (
              <Text style={styles.missionDesc} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>+{item.points_reward}</Text>
            <Ionicons name="star" size={12} color={COLORS.warning} />
          </View>
        </View>
        <View style={styles.badgeRow}>
          <View style={styles.recurrenceBadge}>
            <Text style={styles.recurrenceText}>
              {t(`missions.${item.recurrence === 'one_time' ? 'oneTime' : item.recurrence}`)}
            </Text>
          </View>
          {isClaimed(item.id) && (
            <View style={styles.claimedBadge}>
              <Ionicons name="hand-left" size={12} color={COLORS.primary} />
              <Text style={styles.claimedText}>{t('missions.claimed')}</Text>
            </View>
          )}
        </View>
      </Card>
    </Touchable>
  );

  if (!loading && missions.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('missions.title')} />
        <EmptyState icon="rocket-outline" title={t('missions.noMissions')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('missions.title')} />
      <FlatList
        style={styles.scroll}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        data={missions}
        keyExtractor={(item) => item.id}
        renderItem={renderMission}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  list: {
    padding: SPACING.lg,
  },
  missionCard: {
    marginBottom: SPACING.md,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  missionInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  missionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  missionDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
  },
  pointsText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.warning,
  },
  recurrenceBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  recurrenceText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF0FF',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  claimedText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
