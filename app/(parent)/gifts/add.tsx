import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useGiftsStore } from '@/stores/giftsStore';
import { useFamilyStore } from '@/stores/familyStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { Touchable } from '@/components/ui/Touchable';
import { COLORS, SPACING, FONT_SIZES } from '@/lib/constants';
import { giftInputSchema, validationErrorKey } from '@/lib/validation';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

export default function ParentAddGiftScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const addGift = useGiftsStore((s) => s.addGift);
  const members = useFamilyStore((s) => s.members);

  const children = members.filter((m) => m.role === 'child');

  const [allFamily, setAllFamily] = useState(false);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [pointsCost, setPointsCost] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleChild = (childId: string) => {
    setAllFamily(false);
    setSelectedChildIds((prev) =>
      prev.includes(childId)
        ? prev.filter((id) => id !== childId)
        : [...prev, childId]
    );
  };

  const toggleAllFamily = () => {
    setAllFamily((prev) => !prev);
    setSelectedChildIds([]);
  };

  const targetChildIds = allFamily ? children.map((c) => c.id) : selectedChildIds;
  const hasSelection = targetChildIds.length > 0;

  const handleAdd = async () => {
    if (!hasSelection || !profile?.family_id) return;
    const validation = giftInputSchema.safeParse({ title, points_cost: pointsCost, image_url: imageUrl, link_url: linkUrl });
    if (!validation.success) {
      Alert.alert(t('common.error'), t(validationErrorKey(validation.error)));
      return;
    }
    setLoading(true);
    try {
      for (const childId of targetChildIds) {
        await addGift({
          family_id: profile.family_id,
          child_id: childId,
          title: validation.data.title,
          description: description || undefined,
          image_url: imageUrl || undefined,
          link_url: linkUrl || undefined,
          points_cost: validation.data.points_cost,
          status: 'approved',
          approved_by: profile.id,
        });
      }
      router.dismiss();
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message ?? String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('gifts.title')} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionLabel}>{t('gifts.selectChild')}</Text>
      <View style={styles.childrenRow}>
        <Touchable onPress={toggleAllFamily}>
          <Card style={[styles.childCard, allFamily && styles.childCardSelected]}>
            <Ionicons
              name="people"
              size={20}
              color={allFamily ? COLORS.surface : COLORS.primary}
            />
            <Text style={[styles.childName, allFamily && styles.childNameSelected]}>
              {t('gifts.wholeFamily')}
            </Text>
          </Card>
        </Touchable>
        {children.map((child) => {
          const selected = !allFamily && selectedChildIds.includes(child.id);
          return (
            <Touchable
              key={child.id}
              onPress={() => toggleChild(child.id)}
            >
              <Card style={[styles.childCard, selected && styles.childCardSelected]}>
                <Ionicons
                  name="person"
                  size={20}
                  color={selected ? COLORS.surface : COLORS.primary}
                />
                <Text style={[styles.childName, selected && styles.childNameSelected]}>
                  {child.display_name}
                </Text>
              </Card>
            </Touchable>
          );
        })}
      </View>

      <Input
        label={t('gifts.giftTitle')}
        value={title}
        onChangeText={setTitle}
        placeholder="Ex: Nintendo Switch"
      />

      <Input
        label={t('gifts.description')}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      <Input
        label={t('gifts.pointsCost')}
        value={pointsCost}
        onChangeText={setPointsCost}
        keyboardType="numeric"
      />

      <Input
        label={t('gifts.imageUrl')}
        value={imageUrl}
        onChangeText={setImageUrl}
        keyboardType="url"
        autoCapitalize="none"
      />

      <Input
        label={t('gifts.linkUrl')}
        value={linkUrl}
        onChangeText={setLinkUrl}
        keyboardType="url"
        autoCapitalize="none"
      />

      <Button
        title={t('common.save')}
        onPress={handleAdd}
        loading={loading}
        disabled={!title || !hasSelection || !pointsCost}
        style={styles.button}
      />
      </ScrollView>
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
  content: {
    padding: SPACING.lg,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  childrenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  childCardSelected: {
    backgroundColor: COLORS.primary,
  },
  childName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  childNameSelected: {
    color: COLORS.surface,
  },
  button: {
    marginTop: SPACING.md,
  },
});
