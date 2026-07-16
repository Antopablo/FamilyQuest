import React, { useEffect, useState } from 'react';
import { FlatList, ScrollView, View, Text, StyleSheet, RefreshControl, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useGiftsStore } from '@/stores/giftsStore';
import { useFamilyStore } from '@/stores/familyStore';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Touchable } from '@/components/ui/Touchable';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '@/lib/constants';
import { Gift } from '@/types';

export default function ParentGiftsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { gifts, loading, fetchGifts } = useGiftsStore();
  const members = useFamilyStore((s) => s.members);
  const fetchMembers = useFamilyStore((s) => s.fetchMembers);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const familyId = profile?.family_id;
  const childMembers = members.filter((m) => m.role === 'child');
  const multiChild = childMembers.length > 1;

  const pendingGifts = gifts.filter((g) => g.status === 'pending_approval');
  const approvedGifts = gifts.filter((g) => g.status === 'approved');
  const allGifts = [...pendingGifts, ...approvedGifts];

  useEffect(() => {
    if (familyId) {
      fetchGifts(familyId);
      fetchMembers?.(familyId);
    }
  }, [familyId]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (familyId) {
      await fetchGifts(familyId);
      await fetchMembers?.(familyId);
    }
    setRefreshing(false);
  };

  const toggle = (id: string) =>
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const getChildName = (childId: string) =>
    members.find((m) => m.id === childId)?.display_name ?? '?';

  const normalize = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filteredGifts = allGifts.filter((g) =>
    normalize(g.title).includes(normalize(search))
  );

  const GiftCardBody = (item: Gift) => (
    <Card style={styles.giftCard}>
      <View style={styles.giftRow}>
        <Ionicons name="gift" size={24} color={COLORS.secondary} />
        <View style={styles.giftInfo}>
          <Text style={styles.giftTitle}>{item.title}</Text>
          {!multiChild && (
            <Text style={styles.giftChild}>{getChildName(item.child_id)}</Text>
          )}
        </View>
        {item.status === 'pending_approval' && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>{t('gifts.pendingApproval')}</Text>
          </View>
        )}
        {item.points_cost !== null && (
          <Text style={styles.costText}>{item.points_cost} pts</Text>
        )}
      </View>
    </Card>
  );

  const renderGift = ({ item }: { item: Gift }) => (
    <Touchable onPress={() => router.push(`/(parent)/gifts/${item.id}`)}>
      {GiftCardBody(item)}
    </Touchable>
  );

  const SearchBar = (
    <View style={styles.searchContainer}>
      <Ionicons name="search" size={18} color={COLORS.textLight} style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder={t('gifts.search')}
        placeholderTextColor={COLORS.textLight}
        value={search}
        onChangeText={setSearch}
      />
    </View>
  );

  return (
    <View style={styles.wrapper}>
      {multiChild ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {allGifts.length > 0 && SearchBar}

          {childMembers.map((child) => {
            const expanded = expandedIds.includes(child.id);
            const childGifts = filteredGifts.filter((g) => g.child_id === child.id);
            return (
              <View key={child.id} style={styles.section}>
                <Touchable style={styles.accordionHeader} onPress={() => toggle(child.id)}>
                  <Ionicons name="person-circle" size={22} color={COLORS.primary} />
                  <Text style={styles.accordionName} numberOfLines={1}>{child.display_name}</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{childGifts.length}</Text>
                  </View>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </Touchable>

                {expanded && (
                  childGifts.length > 0 ? (
                    childGifts.map((item) => (
                      <Touchable key={item.id} onPress={() => router.push(`/(parent)/gifts/${item.id}`)}>
                        {GiftCardBody(item)}
                      </Touchable>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>{t('gifts.noGifts')}</Text>
                  )
                )}
              </View>
            );
          })}

          {allGifts.length === 0 && !loading && (
            <EmptyState icon="gift-outline" title={t('gifts.noGifts')} />
          )}
        </ScrollView>
      ) : (
        <FlatList
          style={styles.container}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          data={filteredGifts}
          keyExtractor={(item) => item.id}
          renderItem={renderGift}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={allGifts.length > 0 ? SearchBar : null}
          ListEmptyComponent={
            !loading ? <EmptyState icon="gift-outline" title={t('gifts.noGifts')} /> : null
          }
        />
      )}

      <Touchable
        style={styles.fab}
        onPress={() => router.push('/(parent)/gifts/add')}
      >
        <Ionicons name="add" size={28} color={COLORS.surface} />
      </Touchable>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  searchIcon: {
    paddingLeft: SPACING.md,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  giftCard: {
    marginBottom: SPACING.md,
  },
  giftRow: {
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
  giftChild: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  pendingText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.warning,
    fontWeight: '600',
  },
  costText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
