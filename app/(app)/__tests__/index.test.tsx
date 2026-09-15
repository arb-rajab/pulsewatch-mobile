import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import TargetsScreen from '../index';
import { api } from '../../../lib/api-client';
import type { Target, TargetStatus } from '../../../lib/api-types';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock('../../../lib/api-client', () => ({
  api: { listTargets: jest.fn(), getTargetStatus: jest.fn() },
}));

function makeTarget(overrides: Partial<Target> = {}): Target {
  return {
    id: 't-1',
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
    ...overrides,
  };
}

function makeStatus(overrides: Partial<TargetStatus> = {}): TargetStatus {
  return {
    target_id: 't-1',
    display_state: 'healthy',
    raw_state: 'healthy',
    streak: 5,
    last_checked_at: '2026-09-01T00:05:00Z',
    next_due_at: '2026-09-01T00:06:00Z',
    agent_id: null,
    agent_stale: null,
    open_incident: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TargetsScreen', () => {
  it('renders each target with its live status', async () => {
    (api.listTargets as jest.Mock).mockResolvedValue([
      makeTarget({ id: 't-1', url: 'https://a.example.com' }),
      makeTarget({ id: 't-2', type: 'tcp', url: null, host: 'db.internal', port: 5432 }),
    ]);
    (api.getTargetStatus as jest.Mock).mockImplementation((id: string) =>
      Promise.resolve(
        makeStatus({
          target_id: id,
          display_state: id === 't-1' ? 'healthy' : 'alerting',
          open_incident: id === 't-2' ? { id: 7, opened_at: '2026-09-01T00:00:00Z' } : null,
        })
      )
    );

    await render(<TargetsScreen />);

    await waitFor(() => expect(screen.getByTestId('target-row-t-1')).toBeTruthy());
    expect(screen.getByText('https://a.example.com')).toBeTruthy();
    expect(screen.getByText('db.internal:5432')).toBeTruthy();
    expect(screen.getByText(/open incident/i)).toBeTruthy();
  });

  it('navigates to the target detail route on tap', async () => {
    (api.listTargets as jest.Mock).mockResolvedValue([makeTarget({ id: 't-1' })]);
    (api.getTargetStatus as jest.Mock).mockResolvedValue(makeStatus({ target_id: 't-1' }));

    await render(<TargetsScreen />);
    await waitFor(() => expect(screen.getByTestId('target-row-t-1')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('target-row-t-1'));

    expect(router.push).toHaveBeenCalledWith('/targets/t-1');
  });

  it('shows an empty state with no targets', async () => {
    (api.listTargets as jest.Mock).mockResolvedValue([]);

    await render(<TargetsScreen />);

    await waitFor(() => expect(screen.getByText(/no targets registered/i)).toBeTruthy());
  });

  it('shows an error state with a working retry', async () => {
    (api.listTargets as jest.Mock)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce([makeTarget({ id: 't-1' })]);
    (api.getTargetStatus as jest.Mock).mockResolvedValue(makeStatus({ target_id: 't-1' }));

    await render(<TargetsScreen />);

    await waitFor(() => expect(screen.getByTestId('targets-error')).toHaveTextContent('network down'));

    await fireEvent.press(screen.getByTestId('targets-retry'));

    await waitFor(() => expect(screen.getByTestId('target-row-t-1')).toBeTruthy());
  });
});
