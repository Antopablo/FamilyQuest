import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFamilyStore } from '@/stores/familyStore';
import { useAuthStore } from '@/stores/authStore';
import { useGiftsStore } from '@/stores/giftsStore';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Touchable } from '@/components/ui/Touchable';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '@/lib/constants';
import { Transaction, Gift } from '@/types';

export default function ChildDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { members, removeChild, updateChildPassword } = useFamilyStore();
  const { gifts, fetchGifts } = useGiftsStore();
  const profile = useAuthStore((s) => s.profile);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [removing, setRemoving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showManagement, setShowManagement] = useState(false);

  const child = members.find((m) => m.id === id);
  const childGifts = gifts.filter((g) => g.child_id === id);

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('child_id', id)
        .order('created_at', { ascending: false })
        .limit(20);
      setTransactions((data as Transaction[]) ?? []);
    };
    fetchTransactions();
    if (profile?.family_id) {
      fetchGifts(profile.family_id);
    }
  }, [id, profile?.family_id, fetchGifts]);

  if (!child) return null;

  const handleRemoveChild = () => {
    Alert.alert(
      t('common.confirm'),
      `${t('family.removeChildConfirm')} ${child.display_name} ?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setRemoving(true);
            try {
              await removeChild(child.id, profile?.family_id ?? '');
              router.back();
            } catch (error: any) {
              Alert.alert(t('common.error'), error?.message);
            } finally {
              setRemoving(false);
            }
          },
        },
      ]
    );
  };

  const handleChangePassword = async () => {
    setChangingPassword(true);
    try {
      await updateChildPassword(child.id, newPassword);
      setNewPassword('');
      Alert.alert(t('family.passwordChanged'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message ?? String(error));
    } finally {
      setChangingPassword(false);
    }
  };

  const giftStatusColor = (status: Gift['status']) =>
    status === 'approved' ? COLORS.success
      : status === 'rejected' ? COLORS.error
        : status === 'redeemed' ? COLORS.primary
          : COLORS.warning;

  const giftStatusText = (status: Gift['status']) =>
    status === 'approved' ? t('gifts.approved')
      : status === 'rejected' ? t('gifts.rejected')
        : status === 'redeemed' ? t('gifts.redeemed')
          : t('gifts.pendingApproval');

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <View style={styles.headerBar}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            style={styles.iconBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Touchable
            style={styles.manageBtn}
            onPress={() => setShowManagement(true)}
            accessibilityLabel={t('family.management')}
          >
            <Ionicons name="settings-outline" size={16} color="#fff" />
            <Text style={styles.manageText}>{t('family.management')}</Text>
          </Touchable>
        </View>

        <View style={styles.avatar}>
          <Ionicons name="happy" size={40} color="#fff" />
        </View>
        <Text style={styles.name}>{child.display_name}</Text>
        <Text style={styles.points}>{child.points_balance} pts</Text>

        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Ionicons name="gift" size={16} color="#fff" />
            <Text style={styles.statValue}>{childGifts.length}</Text>
          </View>
          <View style={styles.statChip}>
            <Ionicons name="time" size={16} color="#fff" />
            <Text style={styles.statValue}>{transactions.length}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>{t('dashboard.requestedWishes')}</Text>
        {childGifts.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
          >
            {childGifts.map((item) => (
              <Touchable key={item.id} onPress={() => router.push(`/(parent)/gifts/${item.id}`)}>
                <Card style={styles.wishCard}>
                  <View style={[styles.wishBadge, { backgroundColor: giftStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.wishBadgeText, { color: giftStatusColor(item.status) }]}>
                      {giftStatusText(item.status)}
                    </Text>
                  </View>
                  <Text style={styles.wishTitle} numberOfLines={2}>{item.title}</Text>
                  {item.points_cost != null && (
                    <Text style={styles.wishCost}>{item.points_cost} pts</Text>
                  )}
                </Card>
              </Touchable>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.emptyText}>{t('dashboard.noWishes')}</Text>
        )}

        <Text style={styles.sectionTitle}>{t('dashboard.recentActivity')}</Text>
        <View style={styles.activityContainer}>
          {transactions.length > 0 ? (
            <ScrollView
              style={styles.activityScroll}
              showsVerticalScrollIndicator
              persistentScrollbar
            >
              {transactions.map((item) => (
                <View key={item.id} style={styles.txRow}>
                  <Ionicons
                    name={item.amount > 0 ? 'arrow-up-circle' : 'arrow-down-circle'}
                    size={20}
                    color={item.amount > 0 ? COLORS.success : COLORS.error}
                  />
                  <Text style={styles.txDesc} numberOfLines={1}>{item.description}</Text>
                  <Text style={[styles.txAmount, { color: item.amount > 0 ? COLORS.success : COLORS.error }]}>
                    {item.amount > 0 ? '+' : ''}{item.amount}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>{t('history.noHistory')}</Text>
          )}
        </View>

        <Touchable onPress={() => router.push(`/child-detail/board?childId=${id}`)}>
          <LinearGradient
            colors={['#43A047', '#66BB6A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.boardCard}
          >
            <View style={styles.boardIcon}>
              <Ionicons name="color-palette" size={22} color="#FFF" />
            </View>
            <Text style={styles.boardTitle}>{t('board.title')}</Text>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </Touchable>
      </View>

      <Modal
        visible={showManagement}
        animationType="fade"
        transparent
        onRequestClose={() => setShowManagement(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowManagement(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('family.management')}</Text>

            <Text style={styles.modalSection}>{t('family.changePassword')}</Text>
            <Input
              label={t('family.newPassword')}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <Button
              title={t('family.changePassword')}
              onPress={handleChangePassword}
              loading={changingPassword}
              disabled={newPassword.length < 6}
            />

            <Button
              title={t('family.removeChild')}
              onPress={handleRemoveChild}
              loading={removing}
              variant="danger"
              style={styles.removeButton}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: BORDER_RADIUS.xl,
    borderBottomRightRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginBottom: SPACING.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -SPACING.sm,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  manageText: {
    color: '#fff',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: '#fff',
    marginTop: SPACING.sm,
  },
  points: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: '#FFD700',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statValue: {
    color: '#fff',
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  hScroll: {
    gap: SPACING.sm,
    paddingBottom: SPACING.xs,
    paddingRight: SPACING.lg,
  },
  wishCard: {
    width: 140,
    padding: SPACING.md,
  },
  wishBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.xs,
  },
  wishBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  wishTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  wishCost: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  activityContainer: {
    flex: 1,
  },
  activityScroll: {
    flex: 1,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  txDesc: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  txAmount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    paddingVertical: SPACING.sm,
  },
  boardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  boardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardTitle: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CCC',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  modalSection: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  removeButton: {
    marginTop: SPACING.md,
  },
});
