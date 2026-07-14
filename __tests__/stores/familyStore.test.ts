import { useFamilyStore } from '@/stores/familyStore';
import { supabase, setSkipAuthStateChange } from '@/lib/supabase';

beforeEach(() => {
  useFamilyStore.setState({
    family: null,
    members: [],
    loading: false,
  });
  jest.clearAllMocks();
});

describe('familyStore', () => {
  describe('initial state', () => {
    it('has correct defaults', () => {
      const state = useFamilyStore.getState();
      expect(state.family).toBeNull();
      expect(state.members).toEqual([]);
      expect(state.loading).toBe(false);
    });
  });

  describe('fetchFamily', () => {
    it('sets loading state during fetch', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'fam-1', name: 'Test Family', invite_code: 'ABC123' },
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await useFamilyStore.getState().fetchFamily('fam-1');
      const state = useFamilyStore.getState();
      expect(state.loading).toBe(false);
      expect(state.family).toEqual({
        id: 'fam-1',
        name: 'Test Family',
        invite_code: 'ABC123',
      });
    });

    it('throws on error', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Not found'),
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await expect(useFamilyStore.getState().fetchFamily('bad-id')).rejects.toThrow('Not found');
    });
  });

  describe('createFamily', () => {
    it('creates family and updates profile', async () => {
      const familyData = { id: 'fam-new', name: 'Dupont', invite_code: 'XYZ123' };
      const insertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: familyData, error: null }),
      };
      const updateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(insertChain) // families insert
        .mockReturnValueOnce(updateChain); // profiles update

      const result = await useFamilyStore.getState().createFamily('Dupont', 'user-1');
      expect(result).toEqual(familyData);
      expect(useFamilyStore.getState().family).toEqual(familyData);
      expect(updateChain.update).toHaveBeenCalledWith({ family_id: 'fam-new' });
    });

    it('throws on insert error', async () => {
      const insertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') }),
      };
      (supabase.from as jest.Mock).mockReturnValue(insertChain);

      await expect(useFamilyStore.getState().createFamily('Dupont', 'user-1')).rejects.toThrow('Insert failed');
    });
  });

  describe('joinFamily', () => {
    it('joins family by invite code', async () => {
      const familyData = { id: 'fam-1', name: 'Dupont', invite_code: 'ABC123' };
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: familyData, error: null });
      const updateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValueOnce(updateChain); // profiles update

      await useFamilyStore.getState().joinFamily('abc123', 'user-1');
      expect(supabase.rpc).toHaveBeenCalledWith('get_family_by_invite_code', { code: 'abc123' });
      expect(useFamilyStore.getState().family).toEqual(familyData);
    });

    it('throws on invalid invite code', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: null, error: new Error('Not found') });

      await expect(useFamilyStore.getState().joinFamily('BADCOD', 'user-1')).rejects.toThrow('Invalid invite code');
    });
  });

  describe('fetchMembers', () => {
    it('fetches and sets members', async () => {
      const membersData = [
        { id: 'user-1', display_name: 'Papa', role: 'parent' },
        { id: 'child-1', display_name: 'Alice', role: 'child' },
      ];
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ data: membersData, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await useFamilyStore.getState().fetchMembers('fam-1');
      expect(useFamilyStore.getState().members).toEqual(membersData);
    });
  });

  describe('addChild', () => {
    it('creates child account and refreshes members', async () => {
      const parentSession = {
        access_token: 'parent-token',
        refresh_token: 'parent-refresh',
      };
      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: parentSession },
      });
      (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: { user: { id: 'child-new' } },
        error: null,
      });

      // insert child profile
      const insertChain = {
        insert: jest.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ error: null }),
      };
      // fetch members after
      const membersChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: (resolve: any) => resolve({
          data: [{ id: 'child-new', display_name: 'Charlie', role: 'child', family_id: 'fam-1' }],
          error: null,
        }),
      };
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(insertChain)  // profiles insert
        .mockReturnValueOnce(membersChain); // profiles select for members

      (supabase.auth.setSession as jest.Mock).mockResolvedValueOnce({});

      await useFamilyStore.getState().addChild('Charlie', 'pass123', 'fam-1');

      expect(supabase.auth.signUp).toHaveBeenCalled();
      expect(supabase.auth.setSession).toHaveBeenCalledWith({
        access_token: 'parent-token',
        refresh_token: 'parent-refresh',
      });
      expect(setSkipAuthStateChange).toHaveBeenCalledWith(true);
      expect(setSkipAuthStateChange).toHaveBeenCalledWith(false);
    });

    it('throws when not authenticated', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: null },
      });
      await expect(
        useFamilyStore.getState().addChild('Charlie', 'pass', 'fam-1')
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('removeChild', () => {
    it('removes child from members list', async () => {
      useFamilyStore.setState({
        members: [
          { id: 'child-1', display_name: 'Child 1', role: 'child' } as any,
          { id: 'child-2', display_name: 'Child 2', role: 'child' } as any,
        ],
      });
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({ error: null });

      await useFamilyStore.getState().removeChild('child-1', 'fam-1');
      const state = useFamilyStore.getState();
      expect(state.members).toHaveLength(1);
      expect(state.members[0].id).toBe('child-2');
    });

    it('throws on rpc error', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        error: new Error('RPC failed'),
      });
      await expect(
        useFamilyStore.getState().removeChild('child-1', 'fam-1')
      ).rejects.toThrow('RPC failed');
    });
  });

  describe('updateChildPassword', () => {
    it('calls rpc with correct params', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({ error: null });
      await useFamilyStore.getState().updateChildPassword('child-1', 'newpass123');
      expect(supabase.rpc).toHaveBeenCalledWith('update_child_password', {
        child_id: 'child-1',
        new_password: 'newpass123',
      });
    });
  });
});
