import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, TextInput, Pressable } from 'react-native';
import ChildDetailScreen from '@/app/child-detail/[id]';

const mockRemoveChild = jest.fn();
const mockUpdateChildPassword = jest.fn();
const mockFetchGifts = jest.fn();
const mockBack = jest.fn();
const mockPush = jest.fn();
let mockMembers: any[];
let mockGifts: any[];

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'child-1' }),
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack }),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: any) => {
    const state = { profile: { id: 'parent-1', family_id: 'fam-1' } };
    return selector ? selector(state) : state;
  },
}));

jest.mock('@/stores/familyStore', () => ({
  useFamilyStore: (selector: any) => {
    const state = {
      members: mockMembers,
      removeChild: mockRemoveChild,
      updateChildPassword: mockUpdateChildPassword,
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock('@/stores/giftsStore', () => ({
  useGiftsStore: (selector: any) => {
    const state = {
      gifts: mockGifts,
      fetchGifts: mockFetchGifts,
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock('@/lib/supabase', () => {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    supabase: {
      from: jest.fn(() => mockChain),
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
      auth: {
        getSession: jest.fn(),
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        setSession: jest.fn(),
        onAuthStateChange: jest.fn(),
      },
      channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
      removeChannel: jest.fn(),
    },
    skipAuthStateChange: false,
    setSkipAuthStateChange: jest.fn(),
    __mockChain: mockChain,
  };
});

const { __mockChain } = require('@/lib/supabase');

beforeEach(() => {
  jest.clearAllMocks();
  __mockChain.limit.mockResolvedValue({ data: [], error: null });
  mockMembers = [
    { id: 'child-1', display_name: 'Alice', role: 'child', points_balance: 75 },
  ];
  mockGifts = [
    { id: 'g-1', title: 'Toy', child_id: 'child-1', status: 'pending_approval', points_cost: null },
  ];
});

describe('ChildDetailScreen', () => {
  // --- Basic rendering ---

  it('renders child name and points', async () => {
    render(<ChildDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeTruthy();
      expect(screen.getByText('75 pts')).toBeTruthy();
    });
  });

  it('renders recent activity and requested wishes sections', async () => {
    render(<ChildDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('dashboard.recentActivity')).toBeTruthy();
      expect(screen.getByText('dashboard.requestedWishes')).toBeTruthy();
    });
  });

  it('renders management toggle button', async () => {
    render(<ChildDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('family.management')).toBeTruthy();
    });
  });

  // --- Not found ---

  it('returns null when child not found', async () => {
    mockMembers.length = 0;
    const { toJSON } = render(<ChildDetailScreen />);
    await waitFor(() => {
      expect(toJSON()).toBeNull();
    });
  });

  // --- Transactions rendering with positive and negative amounts ---

  it('renders positive transactions with + prefix', async () => {
    __mockChain.limit.mockResolvedValueOnce({
      data: [{ id: 't-1', description: 'Mission reward', amount: 15, created_at: '2025-01-15T10:00:00Z' }],
      error: null,
    });
    render(<ChildDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Mission reward')).toBeTruthy();
      expect(screen.getByText('+15')).toBeTruthy();
    });
  });

  it('renders negative transactions without + prefix', async () => {
    __mockChain.limit.mockResolvedValueOnce({
      data: [{ id: 't-2', description: 'Gift redeemed', amount: -20, created_at: '2025-01-15T10:00:00Z' }],
      error: null,
    });
    render(<ChildDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Gift redeemed')).toBeTruthy();
      expect(screen.getByText('-20')).toBeTruthy();
    });
  });

  // --- Gifts section: all status branches ---

  it('shows pending_approval gift with correct status text', async () => {
    render(<ChildDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Toy')).toBeTruthy();
      expect(screen.getByText('gifts.pendingApproval')).toBeTruthy();
    });
  });

  it('shows approved gift with correct status text', async () => {
    mockGifts = [{ id: 'g-1', title: 'Game', child_id: 'child-1', status: 'approved', points_cost: 50 }];
    render(<ChildDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Game')).toBeTruthy();
      expect(screen.getByText('gifts.approved')).toBeTruthy();
      expect(screen.getByText('50 pts')).toBeTruthy();
    });
  });

  it('shows rejected gift with correct status text', async () => {
    mockGifts = [{ id: 'g-1', title: 'Expensive item', child_id: 'child-1', status: 'rejected', points_cost: null }];
    render(<ChildDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Expensive item')).toBeTruthy();
      expect(screen.getByText('gifts.rejected')).toBeTruthy();
    });
  });

  it('shows redeemed gift with correct status text', async () => {
    mockGifts = [{ id: 'g-1', title: 'Book', child_id: 'child-1', status: 'redeemed', points_cost: 30 }];
    render(<ChildDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Book')).toBeTruthy();
      expect(screen.getByText('gifts.redeemed')).toBeTruthy();
    });
  });

  it('does not render points_cost when null', async () => {
    mockGifts = [{ id: 'g-1', title: 'Unknown cost', child_id: 'child-1', status: 'pending_approval', points_cost: null }];
    render(<ChildDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Unknown cost')).toBeTruthy();
    });
    // No "pts" text for null points_cost (only the child header 75 pts)
    expect(screen.queryByText('null pts')).toBeNull();
  });

  it('shows empty wishes text when no gifts', async () => {
    mockGifts = [];
    render(<ChildDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('dashboard.noWishes')).toBeTruthy();
    });
  });

  // --- Management modal ---

  it('opens management modal and shows controls', async () => {
    render(<ChildDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('family.management')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('family.management'));
    expect(screen.getAllByText('family.changePassword').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('family.removeChild')).toBeTruthy();
    expect(screen.getByText('family.newPassword')).toBeTruthy();
  });

  // --- Change password success ---

  it('handles change password success flow', async () => {
    mockUpdateChildPassword.mockResolvedValueOnce(undefined);
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<ChildDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('family.management')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('family.management'));

    const inputs = screen.UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(inputs[0], 'newpass123');

    const changeButtons = screen.getAllByText('family.changePassword');
    fireEvent.press(changeButtons[changeButtons.length - 1]);

    await waitFor(() => {
      expect(mockUpdateChildPassword).toHaveBeenCalledWith('child-1', 'newpass123');
      expect(alertSpy).toHaveBeenCalledWith('family.passwordChanged');
    });
  });

  // --- Change password error ---

  it('handles change password error', async () => {
    mockUpdateChildPassword.mockRejectedValueOnce(new Error('Password too weak'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<ChildDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('family.management')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('family.management'));

    const inputs = screen.UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(inputs[0], '123456');

    const changeButtons = screen.getAllByText('family.changePassword');
    fireEvent.press(changeButtons[changeButtons.length - 1]);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('common.error', 'Password too weak');
    });
  });

  // --- Remove child ---

  it('shows remove child confirmation dialog', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<ChildDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('family.management')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('family.management'));
    fireEvent.press(screen.getByText('family.removeChild'));

    expect(alertSpy).toHaveBeenCalledWith(
      'common.confirm',
      expect.stringContaining('Alice'),
      expect.any(Array)
    );
  });

  it('calls removeChild and navigates back on confirm', async () => {
    mockRemoveChild.mockResolvedValueOnce(undefined);
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<ChildDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('family.management')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('family.management'));
    fireEvent.press(screen.getByText('family.removeChild'));

    // Extract the destructive button callback
    const buttons = alertSpy.mock.calls[0][2] as any[];
    const deleteButton = buttons.find((b: any) => b.style === 'destructive');

    await waitFor(async () => {
      await deleteButton.onPress();
    });

    expect(mockRemoveChild).toHaveBeenCalledWith('child-1', 'fam-1');
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows alert when removeChild throws', async () => {
    mockRemoveChild.mockRejectedValueOnce(new Error('Remove failed'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<ChildDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('family.management')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('family.management'));
    fireEvent.press(screen.getByText('family.removeChild'));

    // Extract and call the destructive button
    const firstCallButtons = alertSpy.mock.calls[0][2] as any[];
    const deleteButton = firstCallButtons.find((b: any) => b.style === 'destructive');

    await waitFor(async () => {
      await deleteButton.onPress();
    });

    // Second Alert call is for the error
    expect(alertSpy).toHaveBeenCalledWith('common.error', 'Remove failed');
  });
});
