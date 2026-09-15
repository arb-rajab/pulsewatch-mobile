import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

import { useLocalSearchParams } from 'expo-router';

import IncidentDetailScreen from '../[incidentId]';
import { api } from '../../../../../../lib/api-client';
import type { Incident } from '../../../../../../lib/api-types';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
}));

jest.mock('../../../../../../lib/api-client', () => ({
  api: { listTargetIncidents: jest.fn() },
}));

const mockParams = useLocalSearchParams as jest.Mock;

const incidents: Incident[] = [
  {
    id: 42,
    target_id: 'target-abc',
    opened_at: '2026-09-01T00:00:00Z',
    closed_at: null,
    status: 'open',
  },
  {
    id: 41,
    target_id: 'target-abc',
    opened_at: '2026-08-30T00:00:00Z',
    closed_at: '2026-08-30T01:00:00Z',
    status: 'resolved',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

/**
 * This is the screen a tapped push notification actually lands on
 * (`incidentRouteFor` in lib/push-notifications.ts builds exactly
 * `/targets/[targetId]/incidents/[incidentId]`). Rendering it directly
 * with the same route params expo-router would supply from that URL is
 * the other half of the "genuine push -> deep-link" coverage — the
 * navigation-wiring half lives in
 * lib/__tests__/use-notification-deep-linking.test.tsx.
 */
describe('IncidentDetailScreen (push deep-link destination)', () => {
  it('renders the open incident matching the route params', async () => {
    mockParams.mockReturnValue({ targetId: 'target-abc', incidentId: '42' });
    (api.listTargetIncidents as jest.Mock).mockResolvedValue(incidents);

    await render(<IncidentDetailScreen />);

    await waitFor(() =>
      expect(screen.getByTestId('incident-detail-title')).toHaveTextContent('Incident #42')
    );
    expect(screen.getByText('Open')).toBeTruthy();
    expect(screen.getByText(/still open/)).toBeTruthy();
    expect(api.listTargetIncidents).toHaveBeenCalledWith('target-abc');
  });

  it('renders a resolved incident with its close time', async () => {
    mockParams.mockReturnValue({ targetId: 'target-abc', incidentId: '41' });
    (api.listTargetIncidents as jest.Mock).mockResolvedValue(incidents);

    await render(<IncidentDetailScreen />);

    await waitFor(() =>
      expect(screen.getByTestId('incident-detail-title')).toHaveTextContent('Incident #41')
    );
    expect(screen.getByText('Resolved')).toBeTruthy();
    expect(screen.getByText(/2026-08-30T01:00:00Z/)).toBeTruthy();
  });

  it('shows a not-found state when the id is not in the target incident list', async () => {
    mockParams.mockReturnValue({ targetId: 'target-abc', incidentId: '999' });
    (api.listTargetIncidents as jest.Mock).mockResolvedValue(incidents);

    await render(<IncidentDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('incident-not-found')).toBeTruthy());
  });

  it('shows an error state when the fetch fails', async () => {
    mockParams.mockReturnValue({ targetId: 'target-abc', incidentId: '42' });
    (api.listTargetIncidents as jest.Mock).mockRejectedValue(new Error('offline'));

    await render(<IncidentDetailScreen />);

    await waitFor(() =>
      expect(screen.getByTestId('incident-detail-error')).toHaveTextContent('offline')
    );
  });
});
