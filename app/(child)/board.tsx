import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BoardCanvas } from '@/components/BoardCanvas';
import { useAuthStore } from '@/stores/authStore';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

export default function BoardScreen() {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  if (!profile) return null;
  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title={t('board.title')} />
      <BoardCanvas childId={profile.id} />
    </View>
  );
}
