import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, FONT_SIZES } from '@/lib/constants';

interface ScreenHeaderProps {
  title?: string;
  /** Custom back handler; defaults to router.back() with a home fallback. */
  onBack?: () => void;
  /** Optional element rendered on the right (e.g. an action button). */
  right?: React.ReactNode;
}

/**
 * A lightweight top bar with a back arrow, used on pushed/modal sub-pages
 * (the app hides the native navigator headers). Handles the top safe-area inset.
 */
export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const handleBack = onBack ?? (() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  });

  return (
    <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
      <Pressable
        onPress={handleBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>{title ?? ''}</Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
    gap: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -SPACING.sm,
  },
  title: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  right: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
});
