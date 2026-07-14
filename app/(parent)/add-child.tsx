import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { COLORS, SPACING } from '@/lib/constants';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

export default function AddChildScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const addChild = useFamilyStore((s) => s.addChild);

  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!displayName || !password || !profile?.family_id) return;
    setLoading(true);
    try {
      await addChild(displayName, password, profile.family_id);
      router.back();
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message ?? String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('family.title')} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Input
        label={t('auth.displayName')}
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
      />

      <Input
        label={t('family.childPassword')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button
        title={t('family.addChild')}
        onPress={handleAdd}
        loading={loading}
        disabled={!displayName || password.length < 6}
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
