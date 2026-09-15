import React from 'react';
import { Text } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';

import { AuthProvider, useAuth } from '../auth-context';
import { api, ApiError } from '../api-client';
import { __resetServerUrlCacheForTests, saveServerUrl } from '../server-config';
import { clearSessionHint, loadSessionHint, saveSessionHint } from '../auth-storage';

jest.mock('../api-client', () => {
  const actual = jest.requireActual('../api-client');
  return {
    ...actual,
    api: { listTargets: jest.fn(), login: jest.fn(), logout: jest.fn() },
  };
});

function Probe() {
  const { status, session, serverUrl } = useAuth();
  return (
    <>
      <Text testID="status">{status}</Text>
      <Text testID="email">{session?.email ?? ''}</Text>
      <Text testID="server">{serverUrl ?? ''}</Text>
    </>
  );
}

// render() is async in @testing-library/react-native 14 (it awaits its own
// act() call internally) — every call site below awaits it, or `screen`
// can still be bound to the previous test's tree when the next assertion
// runs.
function renderAuth() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

beforeEach(async () => {
  __resetServerUrlCacheForTests();
  await clearSessionHint();
  (api.listTargets as jest.Mock).mockReset();
  (api.login as jest.Mock).mockReset();
  (api.logout as jest.Mock).mockReset();
});

describe('AuthProvider bootstrapping', () => {
  it('goes to needs-server when no server URL is saved', async () => {
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('needs-server'));
  });

  it('goes to signed-out when a server is saved but there is no session hint', async () => {
    await saveServerUrl('https://pulsewatch.example.com');
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-out'));
    expect(screen.getByTestId('server')).toHaveTextContent('https://pulsewatch.example.com');
  });

  it('optimistically shows signed-in from a saved session hint, then confirms it', async () => {
    await saveServerUrl('https://pulsewatch.example.com');
    await saveSessionHint({ operatorId: 'op-1', email: 'a@b.com' });
    (api.listTargets as jest.Mock).mockResolvedValue([]);

    await renderAuth();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'));
    expect(screen.getByTestId('email')).toHaveTextContent('a@b.com');
    await waitFor(() => expect(api.listTargets).toHaveBeenCalled());
  });

  it('falls back to signed-out when the saved session hint is no longer valid (401)', async () => {
    await saveServerUrl('https://pulsewatch.example.com');
    await saveSessionHint({ operatorId: 'op-1', email: 'a@b.com' });
    (api.listTargets as jest.Mock).mockRejectedValue(
      new ApiError(401, { error: { code: 'unauthorized', message: 'expired', field: null } })
    );

    await renderAuth();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-out'));
    expect(await loadSessionHint()).toBeNull();
  });

  it('does not flip to signed-out on a non-401 error while confirming', async () => {
    await saveServerUrl('https://pulsewatch.example.com');
    await saveSessionHint({ operatorId: 'op-1', email: 'a@b.com' });
    (api.listTargets as jest.Mock).mockRejectedValue(new Error('network down'));

    await renderAuth();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'));
  });
});

describe('login', () => {
  it('persists the session hint and flips to signed-in', async () => {
    await saveServerUrl('https://pulsewatch.example.com');
    (api.login as jest.Mock).mockResolvedValue({ operator_id: 'op-2', email: 'c@d.com' });

    let auth!: ReturnType<typeof useAuth>;
    function Capture() {
      auth = useAuth();
      return <Probe />;
    }
    await render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-out'));
    await act(async () => {
      await auth.login('c@d.com', 'hunter2');
    });

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'));
    expect(screen.getByTestId('email')).toHaveTextContent('c@d.com');
    expect(await loadSessionHint()).toEqual({ operatorId: 'op-2', email: 'c@d.com' });
  });
});

describe('logout', () => {
  it('clears local session state even if the server call fails', async () => {
    await saveServerUrl('https://pulsewatch.example.com');
    await saveSessionHint({ operatorId: 'op-1', email: 'a@b.com' });
    (api.listTargets as jest.Mock).mockResolvedValue([]);
    (api.logout as jest.Mock).mockRejectedValue(new Error('server unreachable'));

    let auth!: ReturnType<typeof useAuth>;
    function Capture() {
      auth = useAuth();
      return <Probe />;
    }
    await render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'));
    await act(async () => {
      await auth.logout();
    });

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-out'));
    expect(screen.getByTestId('email')).toHaveTextContent('');
    expect(await loadSessionHint()).toBeNull();
  });
});
