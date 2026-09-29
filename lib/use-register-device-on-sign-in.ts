import { useEffect } from 'react';

import { useAuth } from './auth-context';
import {
  resetDeviceRegistrationStatus,
  setDeviceRegistrationStatus,
  type DeviceRegistrationStatus,
} from './device-registration-status';
import { registerDeviceForPush, UnsupportedDeviceError } from './device-tokens';

function failureFor(err: unknown): DeviceRegistrationStatus {
  if (err instanceof UnsupportedDeviceError) {
    return { state: 'failed', reason: 'unsupported-device' };
  }
  return {
    state: 'failed',
    reason: 'request-failed',
    message: err instanceof Error ? err.message : String(err),
  };
}

/**
 * ADR-0007: "A mobile app re-registers on every launch" — re-registering
 * an unchanged token clears any dead/revoked marking on the backend, so
 * this has to run whenever the app becomes signed-in, not only right
 * after the login form submits.
 *
 * A failure never blocks the rest of the app (a denied permission or a
 * simulator without a real push token is still usable), but it is recorded
 * in the device-registration status so Settings can tell the operator they
 * won't receive alerts on this device.
 */
export function useRegisterDeviceOnSignIn(): void {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'signed-in') {
      resetDeviceRegistrationStatus();
      return;
    }

    let cancelled = false;
    setDeviceRegistrationStatus({ state: 'registering' });
    registerDeviceForPush().then(
      (device) => {
        if (cancelled) return;
        setDeviceRegistrationStatus(
          device ? { state: 'registered' } : { state: 'failed', reason: 'permission-denied' }
        );
      },
      (err) => {
        if (cancelled) return;
        setDeviceRegistrationStatus(failureFor(err));
      }
    );
    return () => {
      cancelled = true;
    };
  }, [status]);
}
