import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import TargetDetailScreen from '../index';
import { api } from '../../../../../lib/api-client';
import type { Target, TargetSlo, TargetStatus } from '../../../../../lib/api-types';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('../../../../../lib/api-client', () => ({
  api: { getTarget: jest.fn(), getTargetStatus: jest.fn(), getTargetSlo: jest.fn() },
}));

const mockParams = useLocalSearchParams as jest.Mock;

const target: Target = {
  id: 'target-abc',
  type: 'http',
  url: 'https://example.com/health',
  host: null,
  port: null,
  body_match_pattern: null,
  interval_seconds: 60,
  failure_threshold: 3,
  timeout_seconds: 5,
  agent_id: null,
  created_at: '2026-09-01T00:00:00Z',
};

const status: TargetStatus = {
  target_id: 'target-abc',
  display_state: 'alerting',
  raw_state: 'alerting',
  streak: 4,
  last_checked_at: '2026-09-05T00:00:00Z',
  next_due_at: '2026-09-05T00:01:00Z',
  agent_id: null,
  agent_stale: null,
  open_incident: { id: 42, opened_at: '2026-09-05T00:00:00Z' },
};

const slo: TargetSlo = {
  target_id: 'target-abc',
  window_days: 30,
  window_start: '2026-08-06T00:00:00Z',
  window_end: '2026-09-05T00:00:00Z',
  expected_checks: 1000,
  success_count: 950,
  failure_count: 50,
  unknown_count: 0,
  uptime_pct: 95,
  slo_target_pct: 99.9,
  error_budget_consumed_pct: 5005,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.mockReturnValue({ targetId: 'target-abc' });
});

describe('TargetDetailScreen', () => {
  it('renders config, live status, and SLO', async () => {
    (api.getTarget as jest.Mock).mockResolvedValue(target);
    (api.getTargetStatus as jest.Mock).mockResolvedValue(status);
    (api.getTargetSlo as jest.Mock).mockResolvedValue(slo);

    await render(<TargetDetailScreen />);

    await waitFor(() =>
      expect(screen.getByTestId('target-display-state')).toHaveTextContent('alerting')
    );
    expect(screen.getByText('https://example.com/health')).toBeTruthy();
    expect(screen.getByTestId('target-open-incident')).toHaveTextContent(
      /2026-09-05T00:00:00Z/
    );
    expect(screen.getByText(/uptime: 95.00%/i)).toBeTruthy();
    expect(api.getTarget).toHaveBeenCalledWith('target-abc');
    expect(api.getTargetStatus).toHaveBeenCalledWith('target-abc');
    expect(api.getTargetSlo).toHaveBeenCalledWith('target-abc');
  });

  it('navigates to the incident list on "View incidents"', async () => {
    (api.getTarget as jest.Mock).mockResolvedValue(target);
    (api.getTargetStatus as jest.Mock).mockResolvedValue(status);
    (api.getTargetSlo as jest.Mock).mockResolvedValue(slo);

    await render(<TargetDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('view-incidents')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('view-incidents'));

    expect(router.push).toHaveBeenCalledWith('/targets/target-abc/incidents');
  });

  it('shows an error state with retry', async () => {
    (api.getTarget as jest.Mock)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(target);
    (api.getTargetStatus as jest.Mock).mockResolvedValue(status);
    (api.getTargetSlo as jest.Mock).mockResolvedValue(slo);

    await render(<TargetDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('target-detail-error')).toHaveTextContent('boom'));
    await fireEvent.press(screen.getByTestId('target-detail-retry'));

    await waitFor(() => expect(screen.getByTestId('target-display-state')).toBeTruthy());
  });
});
