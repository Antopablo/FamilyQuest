import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ParentMissionDetailScreen from '@/app/(parent)/missions/[id]';

const mockValidateSubmission = jest.fn();
const mockArchiveMission = jest.fn();
const mockFetchSubmissions = jest.fn();
const mockClaimMission = jest.fn();
const mockParentDirectValidate = jest.fn();
const mockFetchProfile = jest.fn();
const mockFetchMembers = jest.fn();

let mockMissions: any[];
let mockSubmissions: any[];
let mockMembers: any[];

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'm-1' }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useNavigation: () => ({ getParent: () => ({ setOptions: jest.fn() }) }),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: any) => {
    const state = {
      profile: { id: 'parent-1', family_id: 'fam-1' },
      fetchProfile: mockFetchProfile,
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock('@/stores/missionsStore', () => ({
  useMissionsStore: (selector: any) => {
    const state = {
      missions: mockMissions,
      submissions: mockSubmissions,
      fetchSubmissions: mockFetchSubmissions,
      validateSubmission: mockValidateSubmission,
      archiveMission: mockArchiveMission,
      claimMission: mockClaimMission,
      parentDirectValidate: mockParentDirectValidate,
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock('@/stores/familyStore', () => ({
  useFamilyStore: (selector: any) => {
    const state = {
      members: mockMembers,
      fetchMembers: mockFetchMembers,
    };
    return selector ? selector(state) : state;
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockMissions = [
    { id: 'm-1', title: 'Clean room', description: 'Tidy up', points_reward: 10, recurrence: 'one_time', status: 'active' },
  ];
  mockSubmissions = [
    { id: 's-1', mission_id: 'm-1', child_id: 'child-1', status: 'pending', note: 'Done!', created_at: '2025-01-01', family_id: 'fam-1' },
  ];
  mockMembers = [
    { id: 'child-1', display_name: 'Alice', role: 'child' },
    { id: 'child-2', display_name: 'Bob', role: 'child' },
    { id: 'parent-1', display_name: 'Dad', role: 'parent' },
  ];
});

describe('ParentMissionDetailScreen', () => {
  it('renders mission title and details', () => {
    render(<ParentMissionDetailScreen />);
    expect(screen.getByText('Clean room')).toBeTruthy();
    expect(screen.getByText('Tidy up')).toBeTruthy();
    expect(screen.getByText('+10 pts')).toBeTruthy();
  });

  it('renders pending submissions with child name and note', () => {
    render(<ParentMissionDetailScreen />);
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Done!')).toBeTruthy();
  });

  it('renders approve and reject buttons for pending submissions', () => {
    render(<ParentMissionDetailScreen />);
    expect(screen.getByText('missions.approved')).toBeTruthy();
    expect(screen.getByText('missions.rejected')).toBeTruthy();
  });

  it('shows archive confirmation dialog when delete icon pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<ParentMissionDetailScreen />);
    fireEvent.press(screen.getByTestId('delete-btn'));
    expect(alertSpy).toHaveBeenCalledWith('common.confirm', '', expect.any(Array));
  });

  it('calls archiveMission when confirm pressed in archive dialog', async () => {
    mockArchiveMission.mockResolvedValueOnce(undefined);
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<ParentMissionDetailScreen />);

    fireEvent.press(screen.getByTestId('delete-btn'));

    const buttons = alertSpy.mock.calls[0][2] as any[];
    const confirmButton = buttons.find((b: any) => b.text === 'common.confirm');
    await confirmButton.onPress();

    expect(mockArchiveMission).toHaveBeenCalledWith('m-1');
  });

  it('calls validateSubmission with approved and fetches submissions and members', async () => {
    mockValidateSubmission.mockResolvedValueOnce(undefined);
    mockFetchSubmissions.mockResolvedValueOnce(undefined);
    mockFetchMembers.mockResolvedValueOnce(undefined);
    render(<ParentMissionDetailScreen />);

    fireEvent.press(screen.getByText('missions.approved'));

    await waitFor(() => {
      expect(mockValidateSubmission).toHaveBeenCalledWith('s-1', 'approved', 'parent-1');
      expect(mockFetchSubmissions).toHaveBeenCalledWith('fam-1');
      expect(mockFetchMembers).toHaveBeenCalledWith('fam-1');
    });
  });

  it('calls validateSubmission with rejected', async () => {
    mockValidateSubmission.mockResolvedValueOnce(undefined);
    mockFetchSubmissions.mockResolvedValueOnce(undefined);
    render(<ParentMissionDetailScreen />);

    fireEvent.press(screen.getByText('missions.rejected'));

    await waitFor(() => {
      expect(mockValidateSubmission).toHaveBeenCalledWith('s-1', 'rejected', 'parent-1');
    });
  });

  it('shows alert when validateSubmission throws', async () => {
    mockValidateSubmission.mockRejectedValueOnce(new Error('Validation failed'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<ParentMissionDetailScreen />);

    fireEvent.press(screen.getByText('missions.approved'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('common.error', expect.stringContaining('Validation failed'));
    });
  });

  // --- Edge cases ---

  it('returns null when mission not found', () => {
    mockMissions.length = 0;
    const { toJSON } = render(<ParentMissionDetailScreen />);
    expect(toJSON()).toBeNull();
  });

  it('renders mission without description', () => {
    mockMissions[0] = { ...mockMissions[0], description: null };
    render(<ParentMissionDetailScreen />);
    expect(screen.getByText('Clean room')).toBeTruthy();
    expect(screen.queryByText('Tidy up')).toBeNull();
  });

  it('renders submission without note', () => {
    mockSubmissions[0] = { ...mockSubmissions[0], note: null };
    render(<ParentMissionDetailScreen />);
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.queryByText('Done!')).toBeNull();
  });

  it('shows ? for unknown child', () => {
    mockSubmissions[0] = { ...mockSubmissions[0], child_id: 'unknown-child' };
    render(<ParentMissionDetailScreen />);
    expect(screen.getByText('?')).toBeTruthy();
  });

  // --- Claimed submission ---

  it('renders claimed submission with claimed text and validate directly button', () => {
    mockSubmissions[0] = { ...mockSubmissions[0], status: 'claimed' };
    render(<ParentMissionDetailScreen />);
    expect(screen.getByText('missions.claimed')).toBeTruthy();
    expect(screen.getByText('missions.validateDirectly')).toBeTruthy();
  });

  it('calls validateSubmission (not parentDirectValidate) when validate directly is pressed on claimed submission', async () => {
    mockValidateSubmission.mockResolvedValueOnce(undefined);
    mockFetchSubmissions.mockResolvedValueOnce(undefined);
    mockSubmissions[0] = { ...mockSubmissions[0], status: 'claimed' };
    render(<ParentMissionDetailScreen />);

    fireEvent.press(screen.getByText('missions.validateDirectly'));

    await waitFor(() => {
      expect(mockValidateSubmission).toHaveBeenCalledWith('s-1', 'approved', 'parent-1');
      expect(mockParentDirectValidate).not.toHaveBeenCalled();
    });
  });

  it('shows error when validate directly on claimed submission fails', async () => {
    mockValidateSubmission.mockRejectedValueOnce(new Error('Validate failed'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockSubmissions[0] = { ...mockSubmissions[0], status: 'claimed' };
    render(<ParentMissionDetailScreen />);

    fireEvent.press(screen.getByText('missions.validateDirectly'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('common.error', expect.stringContaining('Validate failed'));
    });
  });

  // --- Approved/rejected submission ---

  it('renders approved submission status text', () => {
    mockSubmissions[0] = { ...mockSubmissions[0], status: 'approved' };
    render(<ParentMissionDetailScreen />);
    fireEvent.press(screen.getByText('missions.history'));
    expect(screen.getByText('missions.approved')).toBeTruthy();
    expect(screen.queryByText('missions.rejected')).toBeNull();
  });

  it('renders rejected submission status text', () => {
    mockSubmissions[0] = { ...mockSubmissions[0], status: 'rejected' };
    render(<ParentMissionDetailScreen />);
    fireEvent.press(screen.getByText('missions.history'));
    expect(screen.getByText('missions.rejected')).toBeTruthy();
  });

  it('keeps resolved submissions hidden until the history dropdown is opened', () => {
    mockSubmissions[0] = { ...mockSubmissions[0], status: 'approved' };
    render(<ParentMissionDetailScreen />);
    // Collapsed by default: the dropdown header shows but not the status text.
    expect(screen.getByText('missions.history')).toBeTruthy();
    expect(screen.queryByText('missions.approved')).toBeNull();
    fireEvent.press(screen.getByText('missions.history'));
    expect(screen.getByText('missions.approved')).toBeTruthy();
  });

  // --- Quick actions: assign + validate for unassigned children ---

  it('renders quick actions section for unassigned children', () => {
    render(<ParentMissionDetailScreen />);
    expect(screen.getByText('missions.quickActions')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('missions.assign')).toBeTruthy();
    expect(screen.getByText('missions.validate')).toBeTruthy();
  });

  it('calls claimMission when assign button is pressed', async () => {
    mockClaimMission.mockResolvedValueOnce(undefined);
    render(<ParentMissionDetailScreen />);

    fireEvent.press(screen.getByText('missions.assign'));

    await waitFor(() => {
      expect(mockClaimMission).toHaveBeenCalledWith('m-1', 'child-2', 'fam-1', true);
    });
  });

  it('shows error alert when assign fails', async () => {
    mockClaimMission.mockRejectedValueOnce(new Error('Assign failed'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<ParentMissionDetailScreen />);

    fireEvent.press(screen.getByText('missions.assign'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('common.error', expect.stringContaining('Assign failed'));
    });
  });

  it('calls parentDirectValidate and fetchMembers when validate button is pressed', async () => {
    mockParentDirectValidate.mockResolvedValueOnce(undefined);
    mockFetchMembers.mockResolvedValueOnce(undefined);
    render(<ParentMissionDetailScreen />);

    fireEvent.press(screen.getByText('missions.validate'));

    await waitFor(() => {
      expect(mockParentDirectValidate).toHaveBeenCalledWith('m-1', 'child-2', 'fam-1', 'parent-1');
      expect(mockFetchMembers).toHaveBeenCalledWith('fam-1');
    });
  });

  it('does not show quick actions when all children are assigned', () => {
    mockSubmissions = [
      { id: 's-1', mission_id: 'm-1', child_id: 'child-1', status: 'pending', note: 'Done!', created_at: '2025-01-01', family_id: 'fam-1' },
      { id: 's-2', mission_id: 'm-1', child_id: 'child-2', status: 'claimed', note: null, created_at: '2025-01-01', family_id: 'fam-1' },
    ];
    render(<ParentMissionDetailScreen />);
    expect(screen.queryByText('missions.quickActions')).toBeNull();
  });

  it('does not show submissions section when there are no submissions', () => {
    mockSubmissions = [];
    render(<ParentMissionDetailScreen />);
    expect(screen.queryByText('missions.pendingSubmissions')).toBeNull();
  });
});
