import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import ServerSetupScreen from '../server-setup';
import { useAuth } from '../../lib/auth-context';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock('../../lib/auth-context', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ServerSetupScreen', () => {
  it('saves a valid server URL and moves on to login', async () => {
    const configureServer = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ configureServer });

    await render(<ServerSetupScreen />);
    await fireEvent.changeText(
      screen.getByTestId('server-url-input'),
      'https://pulsewatch.example.com'
    );
    await fireEvent.press(screen.getByTestId('server-setup-submit'));

    await waitFor(() =>
      expect(configureServer).toHaveBeenCalledWith('https://pulsewatch.example.com')
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
  });

  it('shows an error and does not navigate when the URL is rejected', async () => {
    const configureServer = jest
      .fn()
      .mockRejectedValue(new Error('Server URL must start with http:// or https://'));
    mockUseAuth.mockReturnValue({ configureServer });

    await render(<ServerSetupScreen />);
    await fireEvent.changeText(screen.getByTestId('server-url-input'), 'not-a-url');
    await fireEvent.press(screen.getByTestId('server-setup-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('server-setup-error')).toHaveTextContent(/must start with http/i)
    );
    expect(router.replace).not.toHaveBeenCalled();
  });
});
