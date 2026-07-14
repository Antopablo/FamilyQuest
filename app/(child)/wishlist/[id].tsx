import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useGiftsStore } from '@/stores/giftsStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { COLORS, SPACING, FONT_SIZES } from '@/lib/constants';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

export default function GiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { gifts, redeemGift, deleteGift } = useGiftsStore();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [loading, setLoading] = useState(false);

  const gift = gifts.find((g) => g.id === id);

  if (!gift) {
    return (
      <View style={styles.container}>
        <Text>{t('common.error')}</Text>
      </View>
    );
  }

  const canRedeem =
    gift.status === 'approved' &&
    gift.points_cost !== null &&
    (profile?.points_balance ?? 0) >= gift.points_cost;

  const handleRedeem = async () => {
    if (!canRedeem) {
      Alert.alert(t('common.error'), t('gifts.insufficientPoints'));
      return;
    }
    setLoading(true);
    try {
      await redeemGift(gift.id);
      await fetchProfile();
      Alert.alert(t('gifts.redeemed'));
      router.back();
    } catch (error) {
      Alert.alert(t('common.error'), String(error));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(t('gifts.deleteGift'), t('gifts.deleteGiftConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGift(gift.id);
            router.back();
          } catch (error) {
            Alert.alert(t('common.error'), String(error));
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('gifts.title')} />
      <View style={styles.container}>
      <Card style={styles.card}>
        <Ionicons name="gift" size={48} color={COLORS.secondary} />
        <Text style={styles.title}>{gift.title}</Text>
        {gift.description && <Text style={styles.description}>{gift.description}</Text>}

        {gift.points_cost !== null && (
          <View style={styles.costRow}>
            <Ionicons name="star" size={20} color={COLORS.warning} />
            <Text style={styles.costText}>{gift.points_cost} pts</Text>
          </View>
        )}

        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>{t('dashboard.pointsBalance')}:</Text>
          <Text style={styles.balanceValue}>{profile?.points_balance ?? 0} pts</Text>
        </View>
      </Card>

      {gift.status === 'approved' && (
        <Button
          title={t('gifts.redeem')}
          onPress={handleRedeem}
          loading={loading}
          disabled={!canRedeem}
          style={styles.button}
        />
      )}

      {gift.status === 'pending_approval' && (
        <Card style={styles.pendingCard}>
          <Ionicons name="hourglass" size={24} color={COLORS.warning} />
          <Text style={styles.pendingText}>{t('gifts.pendingApproval')}</Text>
        </Card>
      )}

      {gift.status === 'redeemed' && (
        <Card style={styles.redeemedCard}>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
          <Text style={styles.redeemedText}>{t('gifts.redeemed')}</Text>
        </Card>
      )}

      {gift.status !== 'redeemed' && (
        <Button
          title={t('gifts.deleteGift')}
          onPress={handleDelete}
          variant="danger"
          style={styles.button}
        />
      )}
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
  card: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  description: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.lg,
  },
  costText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.warning,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  balanceLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  balanceValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  button: {
    marginTop: SPACING.md,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: '#FFF9E6',
  },
  pendingText: {
    color: COLORS.warning,
    fontWeight: '500',
  },
  redeemedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: '#E8F5E9',
  },
  redeemedText: {
    color: COLORS.success,
    fontWeight: '500',
  },
});
