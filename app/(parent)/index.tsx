import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useMissionsStore } from '@/stores/missionsStore';
import { useGiftsStore } from '@/stores/giftsStore';
import { Card } from '@/components/ui/Card';
import { Touchable } from '@/components/ui/Touchable';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '@/lib/constants';
import { Profile } from '@/types';
import { useScrollToTopOnFocus } from '@/hooks/useScrollToTopOnFocus';

const CHILD_COLORS = ['#6C63FF', '#FF6584', '#4CAF50', '#FF9800', '#00BCD4', '#9C27B0'];

export default function ParentDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useScrollToTopOnFocus<ScrollView>();
  const profile = useAuthStore((s) => s.profile);
  const { family, members, fetchFamily, fetchMembers } = useFamilyStore();
  const { missions, submissions, fetchMissions, fetchSubmissions } = useMissionsStore();
  const { gifts, fetchGifts } = useGiftsStore();
  const [refreshing, setRefreshing] = useState(false);

  const familyId = profile?.family_id;
  const children = members.filter((m) => m.role === 'child');
  const pendingSubmissions = submissions.filter((s) => s.status === 'pending');
  const claimedSubmissions = submissions.filter((s) => s.status === 'claimed');
  const activeMissions = missions.filter((m) => m.status === 'active');
  const pendingGifts = gifts.filter((g) => g.status === 'pending_approval');

  useEffect(() => {
    if (familyId) {
      fetchFamily(familyId);
      fetchMembers(familyId);
      fetchMissions(familyId);
      fetchSubmissions(familyId);
      fetchGifts(familyId);
    }
  }, [familyId]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (familyId) {
      await Promise.all([
        fetchFamily(familyId),
        fetchMembers(familyId),
        fetchMissions(familyId),
        fetchSubmissions(familyId),
        fetchGifts(familyId),
      ]);
    }
    setRefreshing(false);
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Welcome Header */}
      <LinearGradient
        colors={['#6C63FF', '#8B85FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + SPACING.lg }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.welcomeText}>
              {t('dashboard.welcome', { name: profile?.display_name ?? '' })}
            </Text>
            {family?.name && (
              <Text style={styles.familyName}>
                {(() => {
                  const prefix = t('dashboard.familyOverview', { name: '' }).trim();
                  const name = family.name;
                  if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
                    return name;
                  }
                  return t('dashboard.familyOverview', { name });
                })()}
              </Text>
            )}
          </View>
          <View style={styles.headerStats}>
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatValue}>{children.length}</Text>
              <Text style={styles.headerStatLabel}>{t('dashboard.children')}</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatValue}>{activeMissions.length}</Text>
              <Text style={styles.headerStatLabel}>{t('missions.title')}</Text>
            </View>
            {pendingSubmissions.length > 0 && (
              <>
                <View style={styles.headerStatDivider} />
                <View style={styles.headerStatItem}>
                  <Text style={styles.headerStatValue}>{pendingSubmissions.length}</Text>
                  <Text style={styles.headerStatLabel}>{t('dashboard.pendingValidations')}</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </LinearGradient>


      {/* Missions Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('missions.title')}</Text>
      </View>


      {pendingSubmissions.length > 0 && (
        <Touchable onPress={() => router.push('/(parent)/missions')}>
          <Card style={styles.pendingCard}>
            <View style={styles.claimedHeader}>
              <View style={styles.pendingBadge}>
                <Ionicons name="checkmark-done" size={14} color={COLORS.warning} />
                <Text style={styles.pendingBadgeText}>
                  {pendingSubmissions.length} {t('dashboard.awaitingValidation').toLowerCase()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </View>
            {pendingSubmissions.slice(0, 3).map((ps) => {
              const child = members.find((m) => m.id === ps.child_id);
              const mission = missions.find((m) => m.id === ps.mission_id);
              if (!child || !mission) return null;
              return (
                <View key={ps.id} style={styles.claimedItem}>
                  <View style={[styles.claimedDot, { backgroundColor: COLORS.warning }]} />
                  <Text style={styles.claimedDetail} numberOfLines={1}>
                    <Text style={styles.claimedChildName}>{child.display_name}</Text>
                    {' — '}
                    {mission.title}
                  </Text>
                </View>
              );
            })}
            {pendingSubmissions.length > 3 && (
              <Text style={styles.claimedMore}>
                +{pendingSubmissions.length - 3} ...
              </Text>
            )}
          </Card>
        </Touchable>
      )}

      <View style={styles.missionCardsRow}>
        <Touchable
          style={{ flex: 1 }}
          onPress={() => router.push('/(parent)/missions')}
        >
          <Card style={styles.missionStatCard}>
            <View style={styles.missionStatIconContainer}>
              <Ionicons name="rocket" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.missionStatValue}>{activeMissions.length}</Text>
            <Text style={styles.missionStatLabel}>{t('dashboard.activeMissions')}</Text>
          </Card>
        </Touchable>

        <Touchable
          style={{ flex: 1 }}
          onPress={() => router.push('/(parent)/missions/create')}
        >
          <Card style={styles.createMissionCard}>
            <View style={styles.createMissionIconContainer}>
              <Ionicons name="add" size={24} color="#FFF" />
            </View>
            <Text style={styles.createMissionText}>{t('missions.create')}</Text>
          </Card>
        </Touchable>
      </View>


      {claimedSubmissions.length > 0 && (
        <Touchable onPress={() => router.push('/(parent)/missions')}>
          <Card style={styles.claimedCard}>
            <View style={styles.claimedHeader}>
              <View style={styles.claimedBadge}>
                <Ionicons name="hand-left" size={14} color={COLORS.primary} />
                <Text style={styles.claimedBadgeText}>
                  {claimedSubmissions.length} {t('dashboard.claimedMissions').toLowerCase()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </View>
            {claimedSubmissions.slice(0, 3).map((cs) => {
              const child = members.find((m) => m.id === cs.child_id);
              const mission = missions.find((m) => m.id === cs.mission_id);
              if (!child || !mission) return null;
              return (
                <View key={cs.id} style={styles.claimedItem}>
                  <View style={styles.claimedDot} />
                  <Text style={styles.claimedDetail} numberOfLines={1}>
                    <Text style={styles.claimedChildName}>{child.display_name}</Text>
                    {' — '}
                    {mission.title}
                  </Text>
                </View>
              );
            })}
            {claimedSubmissions.length > 3 && (
              <Text style={styles.claimedMore}>
                +{claimedSubmissions.length - 3} ...
              </Text>
            )}
          </Card>
        </Touchable>
      )}

      {/* Children Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('dashboard.children')}</Text>
      </View>

      {children.length > 0 ? (
        children.map((child, index) => {
          const color = CHILD_COLORS[index % CHILD_COLORS.length];
          const initial = (child.display_name ?? '?').charAt(0).toUpperCase();
          return (
            <Touchable
              key={child.id}
              onPress={() => router.push(`/child-detail/${child.id}`)}
            >
              <Card style={styles.childCard}>
                <View style={styles.childRow}>
                  <View style={[styles.avatar, { backgroundColor: color + '18' }]}>
                    <Text style={[styles.avatarText, { color }]}>{initial}</Text>
                  </View>
                  <View style={styles.childInfo}>
                    <Text style={styles.childName}>{child.display_name}</Text>
                    <View style={styles.childPointsBadge}>
                      <Ionicons name="star" size={12} color={COLORS.warning} />
                      <Text style={styles.childPoints}>
                        {t('dashboard.childPoints', { points: child.points_balance ?? 0 })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.childChevron}>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
                  </View>
                </View>
              </Card>
            </Touchable>
          );
        })
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="people-outline" size={40} color={COLORS.textLight} />
          <Text style={styles.emptyText}>{t('family.shareCode')}</Text>
          {family?.invite_code && (
            <View style={styles.inviteCodeContainer}>
              <Text style={styles.inviteCode}>{family.invite_code}</Text>
            </View>
          )}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: SPACING.xl,
  },

  // Header
  headerGradient: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  headerContent: {},
  headerTextBlock: {
    marginBottom: SPACING.lg,
  },
  welcomeText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  familyName: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING.xs,
  },
  headerStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  headerStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerStatLabel: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: SPACING.xs,
  },

  // Alert
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: '#FFF9E6',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  alertIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  alertSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.warning,
    marginTop: 2,
  },

  // Sections
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Mission stat cards
  missionCardsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  missionStatCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    flex: 1,
  },
  missionStatIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  missionStatValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  missionStatLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Create mission card
  createMissionCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    flex: 1,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: COLORS.primary + '40',
    backgroundColor: COLORS.primary + '06',
    shadowOpacity: 0,
    elevation: 0,
  },
  createMissionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  createMissionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
  },

  // Claimed missions
  claimedCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: '#F8F7FF',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  // Pending validation
  pendingCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: '#FFF9E6',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  pendingBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.warning,
  },
  claimedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary + '14',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  claimedBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },
  claimedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  claimedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.sm,
  },
  claimedDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  claimedChildName: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  claimedMore: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 6,
    marginLeft: 14,
  },

  // Children
  childCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  childInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  childName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  childPointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  childPoints: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  childChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  inviteCodeContainer: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  inviteCode: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    letterSpacing: 4,
  },
});
