import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase, skipAuthStateChange } from '@/lib/supabase';
import { Profile, UserRole } from '@/types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, role?: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session });

      if (session) {
        await get().fetchProfile();
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (skipAuthStateChange) return;
        set({ session });
        if (session) {
          await get().fetchProfile();
        } else {
          set({ profile: null });
        }
      });
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUp: async (email: string, password: string, displayName: string, role: UserRole = 'child') => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      throw error;
    }

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      throw new Error('Cette adresse email est déjà utilisée.');
    }

    if (data.user) {
      const insertData = {
        id: data.user.id,
        email,
        display_name: displayName,
        role,
      };
      const { data: profileData, error: profileError } = await (supabase.from('profiles') as any)
        .insert(insertData)
        .select();
      if (profileError) {
        throw profileError;
      }
      // Set profile in store immediately to prevent stale session timeout
      if (profileData && profileData.length > 0) {
        set({ profile: profileData[0] as Profile });
      }
    }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ session: null, profile: null });
  },

  setRole: async (role: UserRole) => {
    const { session } = get();
    if (!session) throw new Error('Not authenticated');

    const { error } = await (supabase
      .from('profiles') as any)
      .update({ role })
      .eq('id', session.user.id);
    if (error) throw error;

    await get().fetchProfile();
  },

  fetchProfile: async () => {
    const { session } = get();
    if (!session) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) throw error;
    // Profile may not exist yet (just signed up, insert pending)
    if (data) {
      set({ profile: data as Profile });
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { session } = get();
    if (!session) throw new Error('Not authenticated');

    const { error } = await (supabase
      .from('profiles') as any)
      .update(updates)
      .eq('id', session.user.id);
    if (error) throw error;

    await get().fetchProfile();
  },
}));
