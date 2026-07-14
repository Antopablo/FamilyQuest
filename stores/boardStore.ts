import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Json } from '@/types/database';

export interface BoardItemData {
  id: string;
  type: 'emoji' | 'sticker' | 'shape';
  value: string;
  color?: string;
  shapeKind?: 'circle' | 'square';
  startX: number;
  startY: number;
}

interface BoardState {
  items: BoardItemData[];
  loading: boolean;
  childId: string | null;

  loadBoard: (childId: string) => Promise<void>;
  saveBoard: (childId: string, items: BoardItemData[]) => Promise<void>;
  clearBoard: () => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  items: [],
  loading: false,
  childId: null,

  loadBoard: async (childId: string) => {
    set({ loading: true, childId });
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('items')
        .eq('child_id', childId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      set({ items: (data?.items as unknown as BoardItemData[]) ?? [] });
    } catch (e) {
      console.warn('[BoardStore] loadBoard error:', e);
      set({ items: [] });
    } finally {
      set({ loading: false });
    }
  },

  saveBoard: async (childId: string, items: BoardItemData[]) => {
    set({ items });
    const { error } = await supabase.from('boards').upsert(
      { child_id: childId, items: items as unknown as Json, updated_at: new Date().toISOString() },
      { onConflict: 'child_id' }
    );
    if (error) console.warn('[BoardStore] saveBoard error:', error);
  },

  clearBoard: () => {
    set({ items: [] });
  },
}));
