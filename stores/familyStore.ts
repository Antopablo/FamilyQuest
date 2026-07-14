import { create } from 'zustand';
import { supabase, setSkipAuthStateChange } from '@/lib/supabase';
import { Family, Profile } from '@/types';

interface FamilyState {
  family: Family | null;
  members: Profile[];
  loading: boolean;

  fetchFamily: (familyId: string) => Promise<void>;
  createFamily: (name: string, userId: string) => Promise<Family>;
  joinFamily: (inviteCode: string, userId: string) => Promise<void>;
  fetchMembers: (familyId: string) => Promise<void>;
  addChild: (displayName: string, password: string, familyId: string) => Promise<void>;
  updateChildPassword: (childEmail: string, newPassword: string) => Promise<void>;
  removeChild: (childId: string, familyId: string) => Promise<void>;
}

export const useFamilyStore = create<FamilyState>((set) => ({
  family: null,
  members: [],
  loading: false,

  fetchFamily: async (familyId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('families')
        .select('*')
        .eq('id', familyId)
        .single();

      if (error) throw error;
      set({ family: data as Family });
    } finally {
      set({ loading: false });
    }
  },

  createFamily: async (name: string, userId: string) => {
    // Generate a 6-char invite code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await (supabase
      .from('families') as any)
      .insert({ name, invite_code: code, created_by: userId })
      .select()
      .single();

    if (error) throw error;

    const family = data as Family;

    // Update user's family_id
    await (supabase
      .from('profiles') as any)
      .update({ family_id: family.id })
      .eq('id', userId);

    set({ family });
    return family;
  },

  joinFamily: async (inviteCode: string, userId: string) => {
    // Look up the family via a SECURITY DEFINER RPC: families are no longer
    // world-readable, so we resolve the exact code server-side.
    const { data, error } = await (supabase.rpc as any)('get_family_by_invite_code', {
      code: inviteCode.trim(),
    });

    if (error || !data) throw new Error('Invalid invite code');

    const family = data as Family;

    // Update user's family_id
    const { error: updateError } = await (supabase
      .from('profiles') as any)
      .update({ family_id: family.id })
      .eq('id', userId);

    if (updateError) throw updateError;
    set({ family });
  },

  fetchMembers: async (familyId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('family_id', familyId);

    if (error) throw error;
    set({ members: (data as Profile[]) ?? [] });
  },

  addChild: async (displayName: string, password: string, familyId: string) => {
    const trimmedName = displayName.trim();
    // 1. Save parent session
    const { data: { session: parentSession } } = await supabase.auth.getSession();
    if (!parentSession) throw new Error('Not authenticated');

    // Strip accents and special chars for email
    const safeName = trimmedName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const email = `${safeName}${Date.now()}@familyquest.local`;

    // Prevent onAuthStateChange from reacting to temporary session swap
    setSkipAuthStateChange(true);

    try {
      // 2. Create child auth user (this changes the active session)
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error('Failed to create child account');

      // 3. Insert child profile with family_id already set
      const { error: profileError } = await (supabase.from('profiles') as any)
        .insert({
          id: data.user.id,
          email,
          display_name: trimmedName,
          role: 'child',
          family_id: familyId,
        });
      if (profileError) throw profileError;
    } finally {
      // 4. Always restore parent session
      await supabase.auth.setSession({
        access_token: parentSession.access_token,
        refresh_token: parentSession.refresh_token,
      });
      setSkipAuthStateChange(false);
    }

    // 5. Refresh members list
    const { data: membersData, error: membersError } = await supabase
      .from('profiles')
      .select('*')
      .eq('family_id', familyId);
    if (!membersError) {
      set({ members: (membersData as Profile[]) ?? [] });
    }
  },

  updateChildPassword: async (childId: string, newPassword: string) => {
    const { error } = await supabase.rpc('update_child_password', {
      child_id: childId,
      new_password: newPassword,
    });
    if (error) throw error;
  },

  removeChild: async (childId: string, familyId: string) => {
    // Use RPC function to bypass RLS (parent can't update another user's profile directly)
    const { error } = await supabase.rpc('remove_child_from_family', {
      child_id: childId,
    });
    if (error) throw error;

    // Remove from local state
    set((state) => ({
      members: state.members.filter((m) => m.id !== childId),
    }));
  },
}));
