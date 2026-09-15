import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import IncidentListScreen from '../index';
import { api } from '../../../../../../lib/api-client';
import type { Incident } from '../../../../../../lib/api-types';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('../../../../../../lib/api-client', () => ({
  api: { listTargetIncidents: jest.fn() },
}));

const mockParams = useLocalSearchParams as jest.Mock;

const incidents: Incident[] = [
  { id: 2, target_id: 'target-abc', opened_at: '2026-09-05T00:00:00Z', closed_at: null, status: 'open' },
  { id: 1, target_id: 'target-abc', opened_at: '2026-09-01T00:00:00Z', closed_at: '2026-09-01T01:00:00Z', status: 'resolved' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.mockReturnValue({ targetId: 'target-abc' });
});

describe('IncidentListScreen', () => {
  it('lists incidents for the target, newest as returned by the API', async () => {
    (api.listTargetIncidents as jest.Mock).mockResolvedValue(incidents);

    await render(<IncidentListScreen />);

    await waitFor(() => expect(screen.getByTestId('incident-row-2')).toBeTruthy());
    expect(screen.getByText('Incident #2')).toBeTruthy();
    expect(screen.getByText('Incident #1')).toBeTruthy();
    expect(api.listTargetIncidents).toHaveBeenCalledWith('target-abc');
  });

  it('navigates to the incident detail route on tap', async () => {
    (api.listTargetIncidents as jest.Mock).mockResolvedValue(incidents);

    await render(<IncidentListScreen />);
    await waitFor(() => expect(screen.getByTestId('incident-row-1')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('incident-row-1'));

    expect(router.push).toHaveBeenCalledWith('/targets/target-abc/incidents/1');
  });

  it('shows an empty state', async () => {
    (api.listTargetIncidents as jest.Mock).mockResolvedValue([]);

    await render(<IncidentListScreen />);

    await waitFor(() => expect(screen.getByText(/no incidents recorded/i)).toBeTruthy());
  });

  it('shows an error state with retry', async () => {
    (api.listTargetIncidents as jest.Mock)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(incidents);

    await render(<IncidentListScreen />);

    await waitFor(() => expect(screen.getByTestId('incidents-error')).toHaveTextContent('offline'));
    await fireEvent.press(screen.getByTestId('incidents-retry'));

    await waitFor(() => expect(screen.getByTestId('incident-row-2')).toBeTruthy());
  });
});
