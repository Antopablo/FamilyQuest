import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, TextInput } from 'react-native';
import ParentGiftDetailScreen from '@/app/(parent)/gifts/[id]';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'g-1' }),
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useNavigation: () => ({ getParent: () => ({ setOptions: jest.fn() }) }),
}));

const mockApproveGift = jest.fn();
const mockRejectGift = jest.fn();
const mockDeleteGift = jest.fn();
let mockGifts: any[];

beforeEach(() => {
  jest.clearAllMocks();
  mockGifts = [
    { id: 'g-1', title: 'Nintendo Switch', child_id: 'child-1', status: 'pending_approval', description: 'OLED version', link_url: 'https://example.com', points_cost: null },
  ];
});

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: any) => {
    const state = { profile: { id: 'parent-1', family_id: 'fam-1' } };
    return selector ? selector(state) : state;
  },
}));

jest.mock('@/stores/giftsStore', () => ({
  useGiftsStore: (selector: any) => {
    const state = {
      gifts: mockGifts,
      approveGift: mockApproveGift,
      rejectGift: mockRejectGift,
      deleteGift: mockDeleteGift,
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock('@/stores/familyStore', () => ({
  useFamilyStore: (selector: any) => {
    const state = {
      members: [{ id: 'child-1', display_name: 'Alice', role: 'child' }],
    };
    return selector ? selector(state) : state;
  },
}));

describe('ParentGiftDetailScreen', () => {
  it('renders gift details', () => {
    render(<ParentGiftDetailScreen />);
    expect(screen.getByText('Nintendo Switch')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('OLED version')).toBeTruthy();
  });

  it('renders approve/reject actions for pending gifts', () => {
    render(<ParentGiftDetailScreen />);
    expect(screen.getByText('gifts.approve')).toBeTruthy();
    expect(screen.getByText('gifts.reject')).toBeTruthy();
    expect(screen.getByText('gifts.setCost')).toBeTruthy();
  });

  it('shows delete confirmation when delete icon pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<ParentGiftDetailScreen />);
    fireEvent.press(screen.getByTestId('delete-btn'));
    expect(alertSpy).toHaveBeenCalledWith(
      'gifts.deleteGift',
      'gifts.deleteGiftConfirm',
      expect.any(Array)
    );
  });

  it('renders approved card for approved gifts', () => {
    mockGifts[0] = { ...mockGifts[0], status: 'approved', points_cost: 100 };
    render(<ParentGiftDetailScreen />);
    expect(screen.getByText(/gifts.approved/)).toBeTruthy();
    expect(screen.getByText(/100 pts/)).toBeTruthy();
  });

  it('calls approveGift when approve button pressed with points', async () => {
    mockApproveGift.mockResolvedValueOnce(undefined);
    render(<ParentGiftDetailScreen />);

    // Enter points cost
    const inputs = screen.UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(inputs[0], '50');
    fireEvent.press(screen.getByText('gifts.approve'));

    await waitFor(() => {
      expect(mockApproveGift).toHaveBeenCalledWith('g-1', 50, 'parent-1');
    });
  });

  it('calls rejectGift when reject button pressed', async () => {
    mockRejectGift.mockResolvedValueOnce(undefined);
    render(<ParentGiftDetailScreen />);
    fireEvent.press(screen.getByText('gifts.reject'));

    await waitFor(() => {
      expect(mockRejectGift).toHaveBeenCalledWith('g-1');
    });
  });

  it('returns null when gift not found', () => {
    mockGifts.length = 0;
    const { toJSON } = render(<ParentGiftDetailScreen />);
    expect(toJSON()).toBeNull();
  });

  it('renders gift without description', () => {
    mockGifts[0] = { ...mockGifts[0], description: null };
    render(<ParentGiftDetailScreen />);
    expect(screen.getByText('Nintendo Switch')).toBeTruthy();
    expect(screen.queryByText('OLED version')).toBeNull();
  });

  it('renders gift without link_url', () => {
    mockGifts[0] = { ...mockGifts[0], link_url: null };
    render(<ParentGiftDetailScreen />);
    expect(screen.queryByText('https://example.com')).toBeNull();
  });

  it('shows error alert when approve fails', async () => {
    mockApproveGift.mockRejectedValueOnce(new Error('Approve failed'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<ParentGiftDetailScreen />);

    const inputs = screen.UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(inputs[0], '50');
    fireEvent.press(screen.getByText('gifts.approve'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('common.error', expect.stringContaining('Approve failed'));
    });
  });

  it('shows error alert when reject fails', async () => {
    mockRejectGift.mockRejectedValueOnce(new Error('Reject failed'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<ParentGiftDetailScreen />);
    fireEvent.press(screen.getByText('gifts.reject'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('common.error', expect.stringContaining('Reject failed'));
    });
  });

  it('calls deleteGift when confirm pressed in delete dialog', async () => {
    mockDeleteGift.mockResolvedValueOnce(undefined);
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<ParentGiftDetailScreen />);

    fireEvent.press(screen.getByTestId('delete-btn'));

    const buttons = alertSpy.mock.calls[0][2] as any[];
    const deleteButton = buttons.find((b: any) => b.style === 'destructive');
    await deleteButton.onPress();

    expect(mockDeleteGift).toHaveBeenCalledWith('g-1');
  });

  it('shows error alert when delete fails', async () => {
    mockDeleteGift.mockRejectedValueOnce(new Error('Delete failed'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<ParentGiftDetailScreen />);

    fireEvent.press(screen.getByTestId('delete-btn'));

    const buttons = alertSpy.mock.calls[0][2] as any[];
    const deleteButton = buttons.find((b: any) => b.style === 'destructive');
    await deleteButton.onPress();

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('common.error', expect.stringContaining('Delete failed'));
    });
  });
});
