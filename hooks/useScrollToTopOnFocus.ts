import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

type Scrollable = {
  scrollTo?: (options: { y?: number; animated?: boolean }) => void;
  scrollToOffset?: (options: { offset: number; animated?: boolean }) => void;
};

/**
 * Returns a ref for a ScrollView/FlatList that instantly jumps back to the top
 * whenever the screen regains focus (e.g. when switching back to a tab). The
 * screen stays mounted, so no data is refetched — only the scroll offset is
 * reset, with no animation.
 */
export function useScrollToTopOnFocus<T>() {
  const ref = useRef<T>(null);

  useFocusEffect(
    useCallback(() => {
      const scrollToTop = () => {
        const node = ref.current as Scrollable | null;
        if (!node) return;
        if (typeof node.scrollToOffset === 'function') {
          node.scrollToOffset({ offset: 0, animated: false });
        } else if (typeof node.scrollTo === 'function') {
          node.scrollTo({ y: 0, animated: false });
        }
      };
      // On focus: guarantee we're at the top. On blur (cleanup): pre-position
      // the (still-mounted) list at the top so the next focus shows no jump.
      scrollToTop();
      return scrollToTop;
    }, [])
  );

  return ref;
}
