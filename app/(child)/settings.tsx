import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { COLORS, SPACING, FONT_SIZES } from '@/lib/constants';

export default function ChildSettingsScreen() {
  const { t } = useTranslation();
  const { profile, signOut, updateProfile } = useAuthStore();

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
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.label}>{t('settings.profile')}</Text>
        <Text style={styles.value}>{profile?.display_name}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
      </Card>

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
  );
}

const styles = StyleSheet.create({
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
  logoutButton: {
    marginTop: SPACING.xl,
  },
});
