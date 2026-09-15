import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import LoginScreen from '../login';
import { useAuth } from '../../lib/auth-context';
import { ApiError } from '../../lib/api-client';

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

describe('LoginScreen', () => {
  it('shows the configured server URL', async () => {
    mockUseAuth.mockReturnValue({
      login: jest.fn(),
      serverUrl: 'https://pulsewatch.example.com',
    });
    await render(<LoginScreen />);
    expect(screen.getByTestId('login-server-url')).toHaveTextContent(
      'https://pulsewatch.example.com'
    );
  });

  it('logs in and navigates to the app on success', async () => {
    const login = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ login, serverUrl: 'https://pulsewatch.example.com' });

    await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByTestId('email-input'), 'a@b.com');
    await fireEvent.changeText(screen.getByTestId('password-input'), 'hunter2');
    await fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() => expect(login).toHaveBeenCalledWith('a@b.com', 'hunter2'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(app)'));
  });

  it('shows a friendly message for an incorrect password (401)', async () => {
    const login = jest
      .fn()
      .mockRejectedValue(
        new ApiError(401, { error: { code: 'unauthorized', message: 'nope', field: null } })
      );
    mockUseAuth.mockReturnValue({ login, serverUrl: null });

    await render(<LoginScreen />);
    await fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('login-error')).toHaveTextContent(/incorrect email or password/i)
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shows the server message for a non-401 ApiError', async () => {
    const login = jest
      .fn()
      .mockRejectedValue(
        new ApiError(422, { error: { code: 'invalid', message: 'email is malformed', field: 'email' } })
      );
    mockUseAuth.mockReturnValue({ login, serverUrl: null });

    await render(<LoginScreen />);
    await fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('login-error')).toHaveTextContent('email is malformed')
    );
  });

  it('shows a connectivity message for a non-ApiError failure', async () => {
    const login = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    mockUseAuth.mockReturnValue({ login, serverUrl: null });

    await render(<LoginScreen />);
    await fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('login-error')).toHaveTextContent(/could not reach the server/i)
    );
  });

  it('navigates to server-setup from "Change server"', async () => {
    mockUseAuth.mockReturnValue({ login: jest.fn(), serverUrl: null });
    await render(<LoginScreen />);
    await fireEvent.press(screen.getByTestId('change-server-link'));
    expect(router.push).toHaveBeenCalledWith('/server-setup');
  });
});
