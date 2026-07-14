import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useGiftsStore } from '@/stores/giftsStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { COLORS, SPACING } from '@/lib/constants';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

export default function AddGiftScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const addGift = useGiftsStore((s) => s.addGift);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!title || !profile?.family_id) return;
    setLoading(true);
    try {
      await addGift({
        family_id: profile.family_id,
        child_id: profile.id,
        title,
        description: description || undefined,
        image_url: imageUrl || undefined,
        link_url: linkUrl || undefined,
      });
      router.dismiss();
    } catch (error) {
      Alert.alert(t('common.error'), String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('gifts.title')} />
      <View style={styles.container}>
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
        disabled={!title}
        style={styles.button}
      />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  button: {
    marginTop: SPACING.md,
  },
});
