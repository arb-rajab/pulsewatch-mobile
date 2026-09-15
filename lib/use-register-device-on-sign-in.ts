import { useEffect } from 'react';

import { useAuth } from './auth-context';
import { registerDeviceForPush } from './device-tokens';

/**
 * ADR-0007: "A mobile app re-registers on every launch" — re-registering
 * an unchanged token clears any dead/revoked marking on the backend, so
 * this has to run whenever the app becomes signed-in, not only right
 * after the login form submits.
 */
export function useRegisterDeviceOnSignIn(): void {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'signed-in') return;
    registerDeviceForPush().catch(() => {
      // Best-effort: a denied permission or a simulator without a real
      // push token shouldn't block using the rest of the app.
    });
  }, [status]);
}
