import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Touchable } from '@/components/ui/Touchable';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '@/lib/constants';
import { useScrollToTopOnFocus } from '@/hooks/useScrollToTopOnFocus';

const CHILD_COLORS = ['#6C63FF', '#FF6584', '#4CAF50', '#FF9800', '#00BCD4', '#9C27B0'];

export default function FamilyScreen() {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const { family, members, fetchFamily, fetchMembers } = useFamilyStore();
  const router = useRouter();
  const scrollRef = useScrollToTopOnFocus<ScrollView>();
  const [refreshing, setRefreshing] = useState(false);

  const familyId = profile?.family_id;

  useEffect(() => {
    if (familyId) {
      fetchFamily(familyId);
      fetchMembers(familyId);
    }
  }, [familyId]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (familyId) {
      await Promise.all([fetchFamily(familyId), fetchMembers(familyId)]);
    }
    setRefreshing(false);
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Family Name */}
        {family && (
          <Card style={styles.familyCard}>
            <Ionicons name="home" size={32} color={COLORS.primary} />
            <Text style={styles.familyName}>{family.name}</Text>
          </Card>
        )}

        {/* Invite Code */}
        <Card style={styles.codeCard}>
          <Text style={styles.codeLabel}>{t('family.inviteCode')}</Text>
          <Text style={styles.codeValue}>{family?.invite_code ?? '...'}</Text>
          <Text style={styles.codeHint}>{t('family.shareCode')}</Text>
        </Card>

        {/* Members */}
        <Text style={styles.sectionTitle}>{t('family.members')}</Text>
        {members.length > 0 ? (
          (() => {
            let childIndex = 0;
            return [...members]
              .sort((a, b) => {
                if (a.role === 'parent' && b.role !== 'parent') return -1;
                if (a.role !== 'parent' && b.role === 'parent') return 1;
                return 0;
              })
              .map((member) => {
                const isChild = member.role === 'child';
                const color = isChild ? CHILD_COLORS[childIndex % CHILD_COLORS.length] : COLORS.primary;
                if (isChild) childIndex++;
                const initial = (member.display_name ?? '?').charAt(0).toUpperCase();

                const card = (
                  <Card key={member.id} style={styles.memberCard}>
                    <View style={styles.memberRow}>
                      {isChild ? (
                        <View style={[styles.avatar, { backgroundColor: color + '18' }]}>
                          <Text style={[styles.avatarText, { color }]}>{initial}</Text>
                        </View>
                      ) : (
                        <View style={[styles.avatar, { backgroundColor: COLORS.background }]}>
                          <Ionicons name="people" size={24} color={COLORS.primary} />
                        </View>
                      )}
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{member.display_name}</Text>
                        <Text style={styles.memberRole}>
                          {member.role === 'parent' ? t('family.parent') : t('family.child')}
                          {isChild ? ` - ${member.points_balance} pts` : ''}
                        </Text>
                      </View>
                      {member.id === profile?.id && (
                        <View style={styles.youBadge}>
                          <Text style={styles.youBadgeText}>Vous</Text>
                        </View>
                      )}
                    </View>
                  </Card>
                );

                if (isChild) {
                  return (
                    <Touchable
                      key={member.id}
                      onPress={() => router.push(`/child-detail/${member.id}`)}
                    >
                      {card}
                    </Touchable>
                  );
                }

                return card;
              });
          })()
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('family.noMembers')}</Text>
          </Card>
        )}
      </ScrollView>

      {/* FAB - Add Child */}
      <View style={styles.fabContainer}>
        <Touchable
          style={styles.fab}
          onPress={() => router.navigate('/(parent)/add-child')}
        >
          <Ionicons name="person-add" size={24} color="#fff" />
        </Touchable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: 80,
  },
  familyCard: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  familyName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  codeCard: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    backgroundColor: '#F0EEFF',
  },
  codeLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  codeValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 6,
  },
  codeHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  memberCard: {
    marginBottom: SPACING.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  memberName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  memberRole: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  youBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  youBadgeText: {
    color: '#FFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
});
