import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useMissionsStore } from '@/stores/missionsStore';
import { useFamilyStore } from '@/stores/familyStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Touchable } from '@/components/ui/Touchable';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '@/lib/constants';
import { MissionRecurrence } from '@/types';
import { missionInputSchema, validationErrorKey } from '@/lib/validation';

export default function CreateMissionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { createMission, claimMission } = useMissionsStore();
  const { members } = useFamilyStore();

  const children = members.filter((m) => m.role === 'child');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('');
  const [recurrence, setRecurrence] = useState<MissionRecurrence>('one_time');
  const [assignedChildId, setAssignedChildId] = useState<string>('everyone');
  const [loading, setLoading] = useState(false);

  const recurrenceOptions: { key: MissionRecurrence; label: string }[] = [
    { key: 'one_time', label: t('missions.oneTime') },
    { key: 'daily', label: t('missions.daily') },
    { key: 'weekly', label: t('missions.weekly') },
  ];

  const handleCreate = async () => {
    if (!profile?.family_id) return;
    const validation = missionInputSchema.safeParse({ title, points_reward: points });
    if (!validation.success) {
      Alert.alert(t('common.error'), t(validationErrorKey(validation.error)));
      return;
    }
    setLoading(true);
    try {
      const missionId = await createMission({
        family_id: profile.family_id,
        created_by: profile.id,
        title: validation.data.title,
        description: description || null,
        points_reward: validation.data.points_reward,
        recurrence,
      });

      if (assignedChildId === 'everyone') {
        for (const child of children) {
          await claimMission(missionId, child.id, profile.family_id, true);
        }
      } else if (assignedChildId !== 'none') {
        await claimMission(missionId, assignedChildId, profile.family_id, true);
      }

      router.dismiss();
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || JSON.stringify(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Input
        label={t('missions.missionTitle')}
        value={title}
        onChangeText={setTitle}
        placeholder="Ex: Faire les devoirs"
      />

      <Input
        label={t('missions.description')}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      <Input
        label={t('missions.pointsReward')}
        value={points}
        onChangeText={setPoints}
        keyboardType="number-pad"
        placeholder="10"
      />

      <Text style={styles.label}>{t('missions.recurrence')}</Text>
      <View style={styles.chipRow}>
        {recurrenceOptions.map((option) => (
          <Touchable
            key={option.key}
            style={[
              styles.chip,
              recurrence === option.key && styles.chipActive,
            ]}
            onPress={() => setRecurrence(option.key)}
          >
            <Text
              style={[
                styles.chipText,
                recurrence === option.key && styles.chipTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Touchable>
        ))}
      </View>

      {children.length > 0 && (
        <>
          <Text style={styles.label}>{t('missions.assignTo')}</Text>
          <View style={styles.chipRow}>
            <Touchable
              style={[
                styles.chip,
                assignedChildId === 'everyone' && styles.chipActive,
              ]}
              onPress={() => setAssignedChildId('everyone')}
            >
              <Text
                style={[
                  styles.chipText,
                  assignedChildId === 'everyone' && styles.chipTextActive,
                ]}
              >
                {t('missions.everyone')}
              </Text>
            </Touchable>
            <Touchable
              style={[
                styles.chip,
                assignedChildId === 'none' && styles.chipActive,
              ]}
              onPress={() => setAssignedChildId('none')}
            >
              <Text
                style={[
                  styles.chipText,
                  assignedChildId === 'none' && styles.chipTextActive,
                ]}
              >
                {t('missions.noOne')}
              </Text>
            </Touchable>
            {children.map((child) => (
              <Touchable
                key={child.id}
                style={[
                  styles.chip,
                  assignedChildId === child.id && styles.chipActive,
                ]}
                onPress={() => setAssignedChildId(child.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    assignedChildId === child.id && styles.chipTextActive,
                  ]}
                >
                  {child.display_name}
                </Text>
              </Touchable>
            ))}
          </View>
        </>
      )}

      <Button
        title={t('common.save')}
        onPress={handleCreate}
        loading={loading}
        disabled={!title || !points}
        style={styles.button}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    marginTop: SPACING.md,
  },
});
