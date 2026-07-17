import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { COLORS, SPACING, FONT_SIZES } from '@/lib/constants';

export default function ParentSettingsScreen() {
  const { t } = useTranslation();
  const { profile, signOut, updateProfile } = useAuthStore();
  const { family } = useFamilyStore();

  const toggleLanguage = async () => {
    const newLang = i18next.language === 'fr' ? 'en' : 'fr';
    i18next.changeLanguage(newLang);
    await updateProfile({ locale: newLang });
  };

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), onPress: signOut, style: 'destructive' },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('settings.title')} />
      <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.label}>{t('settings.profile')}</Text>
        <Text style={styles.value}>{profile?.display_name}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
      </Card>

      {family && (
        <Card style={styles.card}>
          <Text style={styles.label}>{t('settings.familyCode')}</Text>
          <Text style={styles.code}>{family.invite_code}</Text>
          <Text style={styles.hint}>{t('family.shareCode')}</Text>
        </Card>
      )}

      <Card style={styles.card}>
        <Text style={styles.label}>{t('settings.language')}</Text>
        <Button
          title={i18next.language === 'fr' ? t('settings.english') : t('settings.french')}
          onPress={toggleLanguage}
          variant="outline"
          size="sm"
        />
      </Card>

      <Button
        title={t('auth.logout')}
        onPress={handleLogout}
        variant="danger"
        style={styles.logoutButton}
      />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  card: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  value: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  email: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 2,
  },
  code: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 4,
  },
  hint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  logoutButton: {
    marginTop: SPACING.xl,
  },
});
