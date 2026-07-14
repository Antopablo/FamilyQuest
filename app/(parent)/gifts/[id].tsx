import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useGiftsStore } from '@/stores/giftsStore';
import { useFamilyStore } from '@/stores/familyStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Touchable } from '@/components/ui/Touchable';
import { COLORS, SPACING, FONT_SIZES } from '@/lib/constants';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

export default function ParentGiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { gifts, approveGift, rejectGift, redeemGift, deleteGift } = useGiftsStore();
  const { members, fetchMembers } = useFamilyStore();

  const [pointsCost, setPointsCost] = useState('');
  const [loading, setLoading] = useState(false);

  const gift = gifts.find((g) => g.id === id);
  const childMember = gift ? members.find((m) => m.id === gift.child_id) : undefined;
  const childName = childMember?.display_name ?? '';

  if (!gift) return null;

  const childBalance = childMember?.points_balance ?? 0;
  const canRedeem =
    gift.status === 'approved' &&
    gift.points_cost !== null &&
    childBalance >= gift.points_cost;

  const handleRedeem = async () => {
    if (!gift.points_cost || !childMember) return;
    const remaining = childBalance - gift.points_cost;
    Alert.alert(
      t('gifts.redeemFor', { name: childName }),
      t('gifts.redeemConfirm', {
        name: childName,
        cost: gift.points_cost,
        gift: gift.title,
        remaining,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            setLoading(true);
            try {
              await redeemGift(gift.id);
              await fetchMembers(profile?.family_id ?? '');
              Alert.alert(t('gifts.redeemed'));
              router.back();
            } catch (error) {
              Alert.alert(t('common.error'), String(error));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleApprove = async () => {
    if (!pointsCost || !profile) return;
    setLoading(true);
    try {
      await approveGift(gift.id, parseInt(pointsCost, 10), profile.id);
      router.back();
    } catch (error) {
      Alert.alert(t('common.error'), String(error));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await rejectGift(gift.id);
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
        <View style={styles.headerRow}>
          <Ionicons name="gift" size={48} color={COLORS.secondary} />
          <View style={styles.headerActions}>
            <Touchable onPress={() => router.push(`/(parent)/gifts/edit?id=${gift.id}`)}>
              <Ionicons name="create-outline" size={22} color={COLORS.primary} />
            </Touchable>
            <Touchable
              testID="delete-btn"
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            </Touchable>
          </View>
        </View>
        <Text style={styles.title}>{gift.title}</Text>
        <Text style={styles.child}>{childName}</Text>
        {gift.description && <Text style={styles.description}>{gift.description}</Text>}
        {gift.link_url && (
          <Touchable onPress={() => Linking.openURL(gift.link_url!)}>
            <Text style={styles.link} numberOfLines={1}>{gift.link_url}</Text>
          </Touchable>
        )}
      </Card>

      {gift.status === 'pending_approval' && (
        <View style={styles.actions}>
          <Input
            label={t('gifts.setCost')}
            value={pointsCost}
            onChangeText={setPointsCost}
            keyboardType="number-pad"
            placeholder="Ex: 50"
          />

          <Button
            title={t('gifts.approve')}
            onPress={handleApprove}
            loading={loading}
            disabled={!pointsCost}
            style={styles.button}
          />

          <Button
            title={t('gifts.reject')}
            onPress={handleReject}
            variant="danger"
            style={styles.button}
          />
        </View>
      )}

      {gift.status === 'approved' && (
        <View>
          <Card style={styles.approvedCard}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <Text style={styles.approvedText}>
              {t('gifts.approved')} - {gift.points_cost} pts
            </Text>
          </Card>

          <Card style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>
              {t('gifts.childBalance', { name: childName })}
            </Text>
            <Text style={styles.balanceValue}>{childBalance} pts</Text>
          </Card>

          <Button
            title={
              canRedeem
                ? t('gifts.redeemFor', { name: childName })
                : t('gifts.insufficientPoints')
            }
            onPress={handleRedeem}
            loading={loading}
            disabled={!canRedeem}
            variant="secondary"
            style={styles.button}
          />
        </View>
      )}

      {gift.status === 'redeemed' && (
        <Card style={styles.redeemedCard}>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
          <Text style={styles.redeemedText}>{t('gifts.redeemed')}</Text>
        </Card>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  child: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  description: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  link: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    marginTop: SPACING.sm,
    textDecorationLine: 'underline',
  },
  actions: {
    marginTop: SPACING.md,
  },
  button: {
    marginTop: SPACING.sm,
  },
  approvedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: '#E8F5E9',
  },
  approvedText: {
    color: COLORS.success,
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
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
