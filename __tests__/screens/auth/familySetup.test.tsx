import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, TextInput } from 'react-native';
import FamilySetupScreen from '@/app/(auth)/family-setup';

const mockCreateFamily = jest.fn();
const mockJoinFamily = jest.fn();
const mockFetchProfile = jest.fn();
const mockProfile = { id: 'user-1', display_name: 'Test', family_id: null };

jest.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign(
    (selector: any) => {
      const state = { profile: mockProfile, fetchProfile: mockFetchProfile };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ profile: mockProfile }) }
  ),
}));

jest.mock('@/stores/familyStore', () => ({
  useFamilyStore: (selector: any) => {
    const state = { createFamily: mockCreateFamily, joinFamily: mockJoinFamily };
    return selector ? selector(state) : state;
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('FamilySetupScreen', () => {
  it('renders choose mode initially with create and join buttons', () => {
    render(<FamilySetupScreen />);
    expect(screen.getByText('family.title')).toBeTruthy();
    expect(screen.getByText('family.create')).toBeTruthy();
    expect(screen.getByText('family.join')).toBeTruthy();
  });

  it('shows create family form', () => {
    render(<FamilySetupScreen />);
    fireEvent.press(screen.getByText('family.create'));
    expect(screen.getByText('family.familyName')).toBeTruthy();
    expect(screen.getByText('common.confirm')).toBeTruthy();
  });

  it('shows join family form', () => {
    render(<FamilySetupScreen />);
    fireEvent.press(screen.getByText('family.join'));
    expect(screen.getByText('family.inviteCode')).toBeTruthy();
    expect(screen.getByText('family.enterCode')).toBeTruthy();
  });

  it('has back buttons to return to choose mode', () => {
    render(<FamilySetupScreen />);
    fireEvent.press(screen.getByText('family.create'));
    fireEvent.press(screen.getByText('common.back'));
    expect(screen.getByText('family.title')).toBeTruthy();
  });

  it('calls createFamily with family name', async () => {
    mockCreateFamily.mockResolvedValueOnce({ id: 'fam-1', name: 'Dupont' });
    mockFetchProfile.mockResolvedValueOnce(undefined);
    render(<FamilySetupScreen />);

    fireEvent.press(screen.getByText('family.create'));

    const inputs = screen.UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(inputs[0], 'Famille Dupont');
    fireEvent.press(screen.getByText('common.confirm'));

    await waitFor(() => {
      expect(mockCreateFamily).toHaveBeenCalledWith('Famille Dupont', 'user-1');
    });
  });

  it('handles join family flow', async () => {
    mockJoinFamily.mockResolvedValueOnce(undefined);
    mockFetchProfile.mockResolvedValueOnce(undefined);
    render(<FamilySetupScreen />);

    fireEvent.press(screen.getByText('family.join'));

    const inputs = screen.UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(inputs[0], 'ABC123');
    fireEvent.press(screen.getByText('common.confirm'));

    await waitFor(() => {
      expect(mockJoinFamily).toHaveBeenCalledWith('ABC123', 'user-1');
    });
  });

  it('shows error on create failure', async () => {
    mockCreateFamily.mockRejectedValueOnce(new Error('Create error'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<FamilySetupScreen />);

    fireEvent.press(screen.getByText('family.create'));
    const inputs = screen.UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(inputs[0], 'Bad Family');
    fireEvent.press(screen.getByText('common.confirm'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('common.error', 'Create error');
    });
  });
});
