import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Gift, GiftStatus } from '@/types';

interface GiftsState {
  gifts: Gift[];
  loading: boolean;

  fetchGifts: (familyId: string) => Promise<void>;
  addGift: (gift: { family_id: string; child_id: string; title: string; description?: string; image_url?: string; link_url?: string; points_cost?: number; status?: GiftStatus; approved_by?: string }) => Promise<void>;
  approveGift: (giftId: string, pointsCost: number, approvedBy: string) => Promise<void>;
  rejectGift: (giftId: string) => Promise<void>;
  redeemGift: (giftId: string) => Promise<void>;
  updateGift: (giftId: string, updates: Partial<Pick<Gift, 'title' | 'description' | 'image_url' | 'link_url' | 'points_cost'>>) => Promise<void>;
  deleteGift: (giftId: string) => Promise<void>;
}

export const useGiftsStore = create<GiftsState>((set, get) => ({
  gifts: [],
  loading: false,

  fetchGifts: async (familyId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('gifts')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ gifts: (data as Gift[]) ?? [] });
    } finally {
      set({ loading: false });
    }
  },

  addGift: async (gift) => {
    const { error } = await supabase.from('gifts').insert(gift);
    if (error) throw error;
    await get().fetchGifts(gift.family_id);
  },

  approveGift: async (giftId, pointsCost, approvedBy) => {
    const { error } = await supabase
      .from('gifts')
      .update({ status: 'approved', points_cost: pointsCost, approved_by: approvedBy })
      .eq('id', giftId);
    if (error) throw error;

    set((state) => ({
      gifts: state.gifts.map((g) =>
        g.id === giftId ? { ...g, status: 'approved' as const, points_cost: pointsCost } : g
      ),
    }));
  },

  rejectGift: async (giftId) => {
    const { error } = await supabase
      .from('gifts')
      .update({ status: 'rejected' })
      .eq('id', giftId);
    if (error) throw error;

    set((state) => ({
      gifts: state.gifts.map((g) =>
        g.id === giftId ? { ...g, status: 'rejected' as const } : g
      ),
    }));
  },

  redeemGift: async (giftId) => {
    const { error } = await supabase
      .from('gifts')
      .update({ status: 'redeemed' })
      .eq('id', giftId);
    if (error) throw error;

    set((state) => ({
      gifts: state.gifts.map((g) =>
        g.id === giftId ? { ...g, status: 'redeemed' as const } : g
      ),
    }));
  },

  updateGift: async (giftId, updates) => {
    const { error } = await supabase.from('gifts')
      .update(updates)
      .eq('id', giftId);
    if (error) throw error;

    set((state) => ({
      gifts: state.gifts.map((g) =>
        g.id === giftId ? { ...g, ...updates } : g
      ),
    }));
  },

  deleteGift: async (giftId) => {
    const { error } = await supabase
      .from('gifts')
      .delete()
      .eq('id', giftId);
    if (error) throw error;

    set((state) => ({
      gifts: state.gifts.filter((g) => g.id !== giftId),
    }));
  },
}));
