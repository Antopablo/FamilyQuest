import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { COLORS, SPACING, FONT_SIZES } from '@/lib/constants';

export default function FamilySetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, fetchProfile } = useAuthStore();
  const { createFamily, joinFamily } = useFamilyStore();

  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!familyName) return;
    if (!profile) {
      await fetchProfile();
      const updatedProfile = useAuthStore.getState().profile;
      if (!updatedProfile) {
        Alert.alert(t('common.error'));
        return;
      }
    }
    setLoading(true);
    try {
      const currentProfile = useAuthStore.getState().profile!;
      await createFamily(familyName, currentProfile.id);
      await fetchProfile();
    } catch (error: any) {
      const msg = error?.message || error?.details || JSON.stringify(error);
      Alert.alert(t('common.error'), msg);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode || !profile) return;
    setLoading(true);
    try {
      await joinFamily(inviteCode, profile.id);
      await fetchProfile();
      // Auth guard will redirect
    } catch {
      Alert.alert(t('common.error'), t('family.codeInvalid'));
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'choose') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('family.title')}</Text>

        <Button
          title={t('family.create')}
          onPress={() => setMode('create')}
          style={styles.button}
        />

        <Button
          title={t('family.join')}
          onPress={() => setMode('join')}
          variant="outline"
          style={styles.button}
        />
      </View>
    );
  }

  if (mode === 'create') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('family.create')}</Text>

        <Input
          label={t('family.familyName')}
          value={familyName}
          onChangeText={setFamilyName}
          placeholder="Ex: Famille Dupont"
        />

        <Button
          title={t('common.confirm')}
          onPress={handleCreate}
          loading={loading}
          disabled={!familyName}
          style={styles.button}
        />

        <Button
          title={t('common.back')}
          onPress={() => setMode('choose')}
          variant="outline"
          style={styles.button}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('family.join')}</Text>
      <Text style={styles.subtitle}>{t('family.enterCode')}</Text>

      <Input
        label={t('family.inviteCode')}
        value={inviteCode}
        onChangeText={setInviteCode}
        autoCapitalize="characters"
        maxLength={6}
        placeholder="ABC123"
      />

      <Button
        title={t('common.confirm')}
        onPress={handleJoin}
        loading={loading}
        disabled={inviteCode.length < 6}
        style={styles.button}
      />

      <Button
        title={t('common.back')}
        onPress={() => setMode('choose')}
        variant="outline"
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  button: {
    marginTop: SPACING.md,
  },
});
