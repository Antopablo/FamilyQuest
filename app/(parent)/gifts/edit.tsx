import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useGiftsStore } from '@/stores/giftsStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { COLORS, SPACING } from '@/lib/constants';
import { giftEditSchema, validationErrorKey } from '@/lib/validation';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

export default function EditGiftScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { gifts, updateGift } = useGiftsStore();

  const gift = gifts.find((g) => g.id === id);

  const [title, setTitle] = useState(gift?.title ?? '');
  const [description, setDescription] = useState(gift?.description ?? '');
  const [imageUrl, setImageUrl] = useState(gift?.image_url ?? '');
  const [linkUrl, setLinkUrl] = useState(gift?.link_url ?? '');
  const [pointsCost, setPointsCost] = useState(gift?.points_cost ? String(gift.points_cost) : '');
  const [loading, setLoading] = useState(false);

  if (!gift) return null;

  const handleSave = async () => {
    const validation = giftEditSchema.safeParse({ title, points_cost: pointsCost, image_url: imageUrl, link_url: linkUrl });
    if (!validation.success) {
      Alert.alert(t('common.error'), t(validationErrorKey(validation.error)));
      return;
    }
    setLoading(true);
    try {
      await updateGift(gift.id, {
        title: validation.data.title,
        description: description || null,
        image_url: imageUrl || null,
        link_url: linkUrl || null,
        points_cost: validation.data.points_cost === '' ? null : validation.data.points_cost,
      });
      router.dismiss();
    } catch (error) {
      Alert.alert(t('common.error'), String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('gifts.title')} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
        onPress={handleSave}
        loading={loading}
        disabled={!title}
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
  button: {
    marginTop: SPACING.md,
  },
});
