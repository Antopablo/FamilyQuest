import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useMissionsStore } from '@/stores/missionsStore';
import { useFamilyStore } from '@/stores/familyStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Touchable } from '@/components/ui/Touchable';
import { ConfettiOverlay } from '@/components/ui/ConfettiOverlay';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '@/lib/constants';
import { MissionSubmission } from '@/types';

export default function ParentMissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { missions, submissions, fetchSubmissions, validateSubmission, archiveMission, claimMission, parentDirectValidate } = useMissionsStore();
  const { members, fetchMembers } = useFamilyStore();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [assignLoading, setAssignLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const mission = missions.find((m) => m.id === id);
  const missionSubmissions = submissions.filter((s) => s.mission_id === id);
  const pendingSubmissions = missionSubmissions.filter((s) => s.status === 'pending');

  const children = members.filter((m) => m.role === 'child');
  const assignedChildIds = missionSubmissions
    .filter((s) => s.status === 'claimed' || s.status === 'pending')
    .map((s) => s.child_id);
  const unassignedChildren = children.filter((c) => !assignedChildIds.includes(c.id));

  const getChildName = (childId: string) =>
    members.find((m) => m.id === childId)?.display_name ?? '?';

  const handleValidate = async (submissionId: string, status: 'approved' | 'rejected') => {
    if (!profile) return;
    try {
      await validateSubmission(submissionId, status, profile.id);
      if (status === 'approved') setShowConfetti(true);
      if (profile.family_id) {
        await fetchSubmissions(profile.family_id);
        await fetchMembers(profile.family_id);
      }
    } catch (error) {
      Alert.alert(t('common.error'), String(error));
    }
  };

  const handleAssign = async (childId: string) => {
    if (!profile?.family_id || !mission) return;
    setAssignLoading(true);
    try {
      await claimMission(mission.id, childId, profile.family_id, true);
    } catch (error) {
      Alert.alert(t('common.error'), String(error));
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDirectValidate = async (childId: string) => {
    if (!profile?.family_id || !profile?.id || !mission) return;
    try {
      await parentDirectValidate(mission.id, childId, profile.family_id, profile.id);
      setShowConfetti(true);
      await fetchMembers(profile.family_id);
    } catch (error) {
      Alert.alert(t('common.error'), String(error));
    }
  };

  const handleArchive = () => {
    Alert.alert(t('common.confirm'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        onPress: async () => {
          if (mission) {
            await archiveMission(mission.id);
            router.back();
          }
        },
      },
    ]);
  };

  if (!mission) return null;

  const renderSubmission = (item: MissionSubmission) => (
    <Card key={item.id} style={styles.submissionCard}>
      <View style={styles.submissionHeader}>
        <Text style={styles.childName}>{getChildName(item.child_id)}</Text>
        <Text style={styles.submissionDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      {item.note && <Text style={styles.note}>{item.note}</Text>}
      {item.status === 'claimed' ? (
        <View style={styles.actions}>
          <Text style={[styles.statusText, { color: COLORS.primary, flex: 1 }]}>
            {t('missions.claimed')}
          </Text>
          <Button
            title={t('missions.validateDirectly')}
            onPress={() => handleValidate(item.id, 'approved')}
            size="sm"
            celebrate
          />
        </View>
      ) : item.status === 'pending' ? (
        <View style={styles.actions}>
          <Button
            title={t('missions.approved')}
            onPress={() => handleValidate(item.id, 'approved')}
            size="sm"
            celebrate
            style={styles.approveBtn}
          />
          <Button
            title={t('missions.rejected')}
            onPress={() => handleValidate(item.id, 'rejected')}
            variant="danger"
            size="sm"
          />
        </View>
      ) : (
        <Text
          style={[
            styles.statusText,
            { color: item.status === 'approved' ? COLORS.success : COLORS.error },
          ]}
        >
          {item.status === 'approved' ? t('missions.approved') : t('missions.rejected')}
        </Text>
      )}
    </Card>
  );

  const content = (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.missionTitle}>{mission.title}</Text>
            {mission.description && <Text style={styles.description}>{mission.description}</Text>}
            <Text style={styles.points}>+{mission.points_reward} pts</Text>
          </View>
          <View style={styles.headerActions}>
            <Touchable onPress={() => router.push(`/(parent)/missions/edit?id=${mission.id}`)}>
              <Ionicons name="create-outline" size={22} color={COLORS.primary} />
            </Touchable>
            <Touchable
              testID="delete-btn"
              onPress={handleArchive}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            </Touchable>
          </View>
        </View>
      </Card>

      {missionSubmissions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>
            {t('missions.pendingSubmissions')} ({pendingSubmissions.length})
          </Text>
          {missionSubmissions.map(renderSubmission)}
        </>
      )}

      {unassignedChildren.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('missions.quickActions')}</Text>
          {unassignedChildren.map((child) => (
            <View key={child.id} style={styles.childActionRow}>
              <View style={styles.childActionName}>
                <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.childActionText}>{child.display_name}</Text>
              </View>
              <View style={styles.childActionButtons}>
                <Touchable
                  style={styles.actionIconBtn}
                  onPress={() => handleAssign(child.id)}
                  disabled={assignLoading}
                >
                  <Ionicons name="person-add-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.actionIconLabel}>{t('missions.assign')}</Text>
                </Touchable>
                <View style={styles.actionSeparator} />
                <Touchable
                  style={styles.actionIconBtn}
                  onPress={() => handleDirectValidate(child.id)}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} />
                  <Text style={[styles.actionIconLabel, { color: COLORS.success }]}>{t('missions.validate')}</Text>
                </Touchable>
              </View>
            </View>
          ))}
        </>
      )}

    </ScrollView>
  );

  return (
    <View style={{ flex: 1 }}>
      {content}
      <ConfettiOverlay visible={showConfetti} onDone={() => setShowConfetti(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  headerCard: {
    marginBottom: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  missionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  description: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  points: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.warning,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  submissionCard: {
    marginBottom: SPACING.sm,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  childName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  submissionDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  note: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  approveBtn: {
    flex: 1,
  },
  statusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  childActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
  },
  childActionName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  childActionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  childActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  actionIconLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionSeparator: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
  },
});
