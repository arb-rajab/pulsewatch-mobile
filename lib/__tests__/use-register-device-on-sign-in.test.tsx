import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ApiError } from '../api-client';
import { useAuth } from '../auth-context';
import { registerDeviceForPush, UnsupportedDeviceError } from '../device-tokens';
import {
  resetDeviceRegistrationStatus,
  useDeviceRegistrationStatus,
} from '../device-registration-status';
import { useRegisterDeviceOnSignIn } from '../use-register-device-on-sign-in';
import type { DeviceToken } from '../api-types';

jest.mock('../auth-context', () => ({ useAuth: jest.fn() }));

// Keep the real UnsupportedDeviceError class (the hook classifies with
// instanceof) and fake only the registration call itself.
jest.mock('../device-tokens', () => ({
  ...jest.requireActual('../device-tokens'),
  registerDeviceForPush: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockRegister = registerDeviceForPush as jest.Mock;

const registeredDevice: DeviceToken = {
  id: 'dt-1',
  provider: 'fcm',
  platform: 'android',
  created_at: '2026-09-01T00:00:00Z',
  last_registered_at: '2026-09-01T00:00:00Z',
  last_delivered_at: null,
  revoked_at: null,
  dead_at: null,
  dead_reason: null,
};

// Mounts the production hook the way app/(app)/_layout.tsx does, and reads
// the result the way settings.tsx does — the two never share props, only the
// registration status.
function Harness() {
  useRegisterDeviceOnSignIn();
  const status = useDeviceRegistrationStatus();
  return (
    <Text testID="status">
      {status.state === 'failed'
        ? ['failed', status.reason, status.message].filter(Boolean).join(':')
        : status.state}
    </Text>
  );
}

async function renderSignedIn() {
  mockUseAuth.mockReturnValue({ status: 'signed-in' });
  await render(<Harness />);
  // let the registerDeviceForPush() promise settle
  await act(async () => {});
}

beforeEach(() => {
  jest.clearAllMocks();
  resetDeviceRegistrationStatus();
});

describe('useRegisterDeviceOnSignIn', () => {
  it('records "registered" when registration succeeds', async () => {
    mockRegister.mockResolvedValue(registeredDevice);
    await renderSignedIn();
    expect(screen.getByTestId('status')).toHaveTextContent('registered');
  });

  it('surfaces a permission denial (registerDeviceForPush resolves null)', async () => {
    mockRegister.mockResolvedValue(null);
    await renderSignedIn();
    expect(screen.getByTestId('status')).toHaveTextContent('failed:permission-denied');
  });

  it('surfaces an unsupported device push-token type', async () => {
    mockRegister.mockRejectedValue(new UnsupportedDeviceError());
    await renderSignedIn();
    expect(screen.getByTestId('status')).toHaveTextContent('failed:unsupported-device');
  });

  it('surfaces a backend API error with its message', async () => {
    mockRegister.mockRejectedValue(
      new ApiError(500, { error: { code: 'internal', message: 'database is down' } } as never)
    );
    await renderSignedIn();
    expect(screen.getByTestId('status')).toHaveTextContent('failed:request-failed:database is down');
  });

  it('surfaces a network failure', async () => {
    mockRegister.mockRejectedValue(new TypeError('Network request failed'));
    await renderSignedIn();
    expect(screen.getByTestId('status')).toHaveTextContent(
      'failed:request-failed:Network request failed'
    );
  });

  it('does not attempt registration, or record anything, while signed out', async () => {
    mockUseAuth.mockReturnValue({ status: 'signed-out' });
    await render(<Harness />);
    await act(async () => {});
    expect(mockRegister).not.toHaveBeenCalled();
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
  });

  it('clears a previous failure when the operator signs out', async () => {
    mockRegister.mockResolvedValue(null);
    mockUseAuth.mockReturnValue({ status: 'signed-in' });
    const view = await render(<Harness />);
    await act(async () => {});
    expect(screen.getByTestId('status')).toHaveTextContent('failed:permission-denied');

    mockUseAuth.mockReturnValue({ status: 'signed-out' });
    await view.rerender(<Harness />);
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
  });
});
