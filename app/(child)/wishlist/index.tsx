import React, { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, RefreshControl, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useGiftsStore } from '@/stores/giftsStore';
import { useFamilyStore } from '@/stores/familyStore';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Touchable } from '@/components/ui/Touchable';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '@/lib/constants';
import { Gift } from '@/types';

export default function ChildWishlistScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { gifts, loading, fetchGifts } = useGiftsStore();
  const { members, fetchMembers } = useFamilyStore();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<string[]>(profile?.id ? [profile.id] : []);

  const familyId = profile?.family_id;
  const children = members.filter((m) => m.role === 'child');
  const multiChild = children.length > 1;
  const myGifts = gifts.filter((g) => g.child_id === profile?.id);

  useEffect(() => {
    if (familyId) {
      fetchGifts(familyId);
      fetchMembers(familyId);
    }
  }, [familyId]);

  // Keep the current child's section open by default once the profile is loaded.
  useEffect(() => {
    if (profile?.id) {
      setExpandedIds((prev) => (prev.includes(profile.id) ? prev : [...prev, profile.id]));
    }
  }, [profile?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (familyId) {
      await fetchGifts(familyId);
      await fetchMembers(familyId);
    }
    setRefreshing(false);
  };

  const toggle = (id: string) =>
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const getStatusColor = (status: Gift['status']) => {
    switch (status) {
      case 'pending_approval': return COLORS.warning;
      case 'approved': return COLORS.success;
      case 'rejected': return COLORS.error;
      case 'redeemed': return COLORS.primary;
    }
  };

  const getStatusText = (status: Gift['status']) => {
    switch (status) {
      case 'pending_approval': return t('gifts.pendingApproval');
      case 'approved': return t('gifts.approved');
      case 'rejected': return t('gifts.rejected');
      case 'redeemed': return t('gifts.redeemed');
    }
  };

  const GiftRow = (item: Gift) => (
    <Card style={styles.giftCard}>
      <View style={styles.giftHeader}>
        <Ionicons name="gift" size={24} color={COLORS.secondary} />
        <View style={styles.giftInfo}>
          <Text style={styles.giftTitle}>{item.title}</Text>
          {item.points_cost !== null && (
            <Text style={styles.giftCost}>{item.points_cost} pts</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>
    </Card>
  );

  const renderGift = ({ item }: { item: Gift }) => (
    <Touchable onPress={() => router.push(`/(child)/wishlist/${item.id}`)}>
      {GiftRow(item)}
    </Touchable>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('gifts.title')} />

      {multiChild ? (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {children.map((child) => {
            const isMe = child.id === profile?.id;
            const expanded = expandedIds.includes(child.id);
            const wishes = gifts.filter((g) => g.child_id === child.id);
            return (
              <View key={child.id} style={styles.section}>
                <Touchable style={styles.accordionHeader} onPress={() => toggle(child.id)}>
                  <Ionicons
                    name={isMe ? 'happy' : 'person-circle'}
                    size={22}
                    color={isMe ? COLORS.secondary : COLORS.primary}
                  />
                  <Text style={styles.accordionName} numberOfLines={1}>{child.display_name}</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{wishes.length}</Text>
                  </View>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </Touchable>

                {expanded && (
                  wishes.length > 0 ? (
                    wishes.map((item) =>
                      isMe ? (
                        <Touchable key={item.id} onPress={() => router.push(`/(child)/wishlist/${item.id}`)}>
                          {GiftRow(item)}
                        </Touchable>
                      ) : (
                        <View key={item.id}>{GiftRow(item)}</View>
                      )
                    )
                  ) : (
                    <Text style={styles.emptyText}>{t('gifts.noGifts')}</Text>
                  )
                )}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          data={myGifts}
          keyExtractor={(item) => item.id}
          renderItem={renderGift}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={!loading ? <EmptyState icon="gift-outline" title={t('gifts.noGifts')} /> : null}
        />
      )}

      <View style={styles.fabContainer}>
        <Touchable
          style={styles.fab}
          accessibilityLabel={t('gifts.addGift')}
          onPress={() => router.push('/(child)/wishlist/add')}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Touchable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    padding: SPACING.lg,
    paddingBottom: 80,
  },
  section: {
    marginBottom: SPACING.md,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  accordionName: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: SPACING.xs,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    paddingVertical: SPACING.md,
    paddingLeft: SPACING.sm,
  },
  giftCard: {
    marginBottom: SPACING.md,
  },
  giftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  giftInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  giftTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  giftCost: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
});
