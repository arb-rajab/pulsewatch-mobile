import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import SettingsScreen from '../settings';
import { api } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-context';
import type { DeviceToken } from '../../../lib/api-types';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock('../../../lib/api-client', () => ({
  api: { listDeviceTokens: jest.fn(), unregisterDeviceToken: jest.fn() },
}));

jest.mock('../../../lib/auth-context', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;

function makeDevice(overrides: Partial<DeviceToken> = {}): DeviceToken {
  return {
    id: 'dt-1',
    provider: 'fcm',
    platform: 'android',
    created_at: '2026-09-01T00:00:00Z',
    last_registered_at: '2026-09-01T00:00:00Z',
    last_delivered_at: null,
    revoked_at: null,
    dead_at: null,
    dead_reason: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SettingsScreen', () => {
  it('shows the signed-in operator email and their devices', async () => {
    mockUseAuth.mockReturnValue({
      session: { operatorId: 'op-1', email: 'a@b.com' },
      logout: jest.fn(),
    });
    (api.listDeviceTokens as jest.Mock).mockResolvedValue([
      makeDevice({ id: 'dt-1', platform: 'android', provider: 'fcm' }),
      makeDevice({ id: 'dt-2', platform: 'ios', provider: 'apns', dead_at: '2026-09-02T00:00:00Z', dead_reason: 'apns rejected device token: BadDeviceToken' }),
    ]);

    await render(<SettingsScreen />);

    expect(screen.getByTestId('settings-email')).toHaveTextContent('a@b.com');
    await waitFor(() => expect(screen.getByTestId('device-row-dt-1')).toBeTruthy());
    expect(screen.getByText('ANDROID · FCM')).toBeTruthy();
    expect(screen.getByText(/BadDeviceToken/)).toBeTruthy();
  });

  it('revokes a device and refreshes the list', async () => {
    mockUseAuth.mockReturnValue({
      session: { operatorId: 'op-1', email: 'a@b.com' },
      logout: jest.fn(),
    });
    (api.listDeviceTokens as jest.Mock)
      .mockResolvedValueOnce([makeDevice({ id: 'dt-1' })])
      .mockResolvedValueOnce([makeDevice({ id: 'dt-1', revoked_at: '2026-09-03T00:00:00Z' })]);
    (api.unregisterDeviceToken as jest.Mock).mockResolvedValue(undefined);

    await render(<SettingsScreen />);
    await waitFor(() => expect(screen.getByTestId('revoke-device-dt-1')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('revoke-device-dt-1'));

    await waitFor(() => expect(api.unregisterDeviceToken).toHaveBeenCalledWith('dt-1'));
    await waitFor(() => expect(api.listDeviceTokens).toHaveBeenCalledTimes(2));
  });

  it('does not show a revoke button for an already-revoked device', async () => {
    mockUseAuth.mockReturnValue({
      session: { operatorId: 'op-1', email: 'a@b.com' },
      logout: jest.fn(),
    });
    (api.listDeviceTokens as jest.Mock).mockResolvedValue([
      makeDevice({ id: 'dt-1', revoked_at: '2026-09-03T00:00:00Z' }),
    ]);

    await render(<SettingsScreen />);

    await waitFor(() => expect(screen.getByTestId('device-row-dt-1')).toBeTruthy());
    expect(screen.queryByTestId('revoke-device-dt-1')).toBeNull();
  });

  it('signs out and navigates to login', async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ session: { operatorId: 'op-1', email: 'a@b.com' }, logout });
    (api.listDeviceTokens as jest.Mock).mockResolvedValue([]);

    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByTestId('sign-out'));

    await waitFor(() => expect(logout).toHaveBeenCalled());
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
  });
});
