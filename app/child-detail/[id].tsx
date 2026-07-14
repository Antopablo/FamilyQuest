import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, Pressable, Modal, KeyboardAvoidingView, Platform } from 'react-native';
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

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <Card style={styles.transactionCard}>
      <View style={styles.transactionRow}>
        <Ionicons
          name={item.amount > 0 ? 'arrow-up-circle' : 'arrow-down-circle'}
          size={20}
          color={item.amount > 0 ? COLORS.success : COLORS.error}
        />
        <Text style={styles.transactionDesc}>{item.description}</Text>
        <Text
          style={[
            styles.transactionAmount,
            { color: item.amount > 0 ? COLORS.success : COLORS.error },
          ]}
        >
          {item.amount > 0 ? '+' : ''}{item.amount}
        </Text>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Card style={styles.headerCard}>
        <View style={styles.avatar}>
          <Ionicons name="happy" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.name}>{child.display_name}</Text>
        <Text style={styles.points}>{child.points_balance} pts</Text>
      </Card>

      <View style={styles.columnsRow}>
        <View style={styles.column}>
          <Text style={styles.columnTitle}>{t('dashboard.recentActivity')}</Text>
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={renderTransaction}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </View>
        <View style={styles.column}>
          <Text style={styles.columnTitle}>{t('dashboard.requestedWishes')}</Text>
          {childGifts.length > 0 ? (
            <FlatList
              data={childGifts}
              showsVerticalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Touchable onPress={() => router.push(`/(parent)/gifts/${item.id}`)}>
                  <Card style={styles.giftCard}>
                    <View style={styles.giftHeader}>
                      <Ionicons name="gift-outline" size={16} color={COLORS.primary} />
                      <View style={[styles.giftStatusBadge, {
                        backgroundColor: item.status === 'approved' ? COLORS.success + '20'
                          : item.status === 'rejected' ? COLORS.error + '20'
                            : COLORS.warning + '20',
                      }]}>
                        <Text style={[styles.giftStatusText, {
                          color: item.status === 'approved' ? COLORS.success
                            : item.status === 'rejected' ? COLORS.error
                              : COLORS.warning,
                        }]}>
                          {item.status === 'approved' ? t('gifts.approved')
                            : item.status === 'rejected' ? t('gifts.rejected')
                              : item.status === 'redeemed' ? t('gifts.redeemed')
                                : t('gifts.pendingApproval')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.giftTitle} numberOfLines={2}>{item.title}</Text>
                    {item.points_cost != null && (
                      <Text style={styles.giftPoints}>{item.points_cost} pts</Text>
                    )}
                  </Card>
                </Touchable>
              )}
              contentContainerStyle={styles.list}
            />
          ) : (
            <Text style={styles.emptyText}>{t('dashboard.noWishes')}</Text>
          )}
        </View>
      </View>

      <Touchable
        onPress={() => router.push(`/child-detail/board?childId=${id}`)}
      >
        <LinearGradient
          colors={['#43A047', '#66BB6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.boardCard}
        >
          <View style={styles.boardIconContainer}>
            <Ionicons name="color-palette" size={22} color="#FFF" />
          </View>
          <Text style={styles.boardCardTitle}>{t('board.title')}</Text>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
        </LinearGradient>
      </Touchable>

      <Touchable
        style={styles.managementToggle}
        onPress={() => setShowManagement(true)}
      >
        <Ionicons name="settings-outline" size={20} color={COLORS.textSecondary} />
        <Text style={styles.managementToggleText}>{t('family.management')}</Text>
      </Touchable>

      <Modal
        visible={showManagement}
        animationType="fade"
        transparent
        onRequestClose={() => setShowManagement(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowManagement(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('family.management')}</Text>

            <Text style={styles.sectionTitle}>{t('family.changePassword')}</Text>
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
              style={styles.passwordButton}
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
    padding: SPACING.lg,
  },
  headerCard: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  points: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.warning,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  columnsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.md,
  },
  column: {
    flex: 1,
  },
  columnTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  list: {
    paddingBottom: SPACING.lg,
  },
  transactionCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  transactionDesc: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  transactionAmount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  giftCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.sm,
  },
  giftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  giftTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  giftPoints: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  giftStatusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  giftStatusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  removeButton: {
    marginTop: SPACING.md,
  },
  managementToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  boardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: '#43A047',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  boardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardCardTitle: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: '#FFF',
  },
  managementToggleText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: '600',
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
    backgroundColor: COLORS.surface ?? '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl ?? 32,
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
  passwordButton: {
    marginTop: SPACING.sm,
  },
});
