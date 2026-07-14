import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMissionsStore } from '@/stores/missionsStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Touchable } from '@/components/ui/Touchable';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '@/lib/constants';
import { MissionRecurrence } from '@/types';
import { missionInputSchema, validationErrorKey } from '@/lib/validation';

export default function EditMissionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { missions, updateMission } = useMissionsStore();

  const mission = missions.find((m) => m.id === id);

  const [title, setTitle] = useState(mission?.title ?? '');
  const [description, setDescription] = useState(mission?.description ?? '');
  const [points, setPoints] = useState(String(mission?.points_reward ?? ''));
  const [recurrence, setRecurrence] = useState<MissionRecurrence>(mission?.recurrence ?? 'one_time');
  const [loading, setLoading] = useState(false);

  const recurrenceOptions: { key: MissionRecurrence; label: string }[] = [
    { key: 'one_time', label: t('missions.oneTime') },
    { key: 'daily', label: t('missions.daily') },
    { key: 'weekly', label: t('missions.weekly') },
  ];

  if (!mission) return null;

  const handleSave = async () => {
    const validation = missionInputSchema.safeParse({ title, points_reward: points });
    if (!validation.success) {
      Alert.alert(t('common.error'), t(validationErrorKey(validation.error)));
      return;
    }
    setLoading(true);
    try {
      await updateMission(mission.id, {
        title: validation.data.title,
        description: description || null,
        points_reward: validation.data.points_reward,
        recurrence,
      });
      router.dismiss();
    } catch (error) {
      Alert.alert(t('common.error'), String(error));
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
      <View style={styles.recurrenceRow}>
        {recurrenceOptions.map((option) => (
          <Touchable
            key={option.key}
            style={[
              styles.recurrenceChip,
              recurrence === option.key && styles.recurrenceChipActive,
            ]}
            onPress={() => setRecurrence(option.key)}
          >
            <Text
              style={[
                styles.recurrenceText,
                recurrence === option.key && styles.recurrenceTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Touchable>
        ))}
      </View>

      <Button
        title={t('common.save')}
        onPress={handleSave}
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
  recurrenceRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  recurrenceChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  recurrenceChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  recurrenceText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  recurrenceTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    marginTop: SPACING.md,
  },
});
