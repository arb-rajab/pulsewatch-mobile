import { useSyncExternalStore } from 'react';

/**
 * Why *this* device's push registration didn't succeed. Kept distinct (not
 * one generic "failed") because the operator's next step differs: a denied
 * permission is fixed in the OS settings, an unsupported token type can't
 * be fixed by the operator at all, and a request failure may just need a
 * retry once the server is reachable.
 */
export type DeviceRegistrationFailureReason =
  | 'permission-denied'
  | 'unsupported-device'
  | 'request-failed';

export type DeviceRegistrationStatus =
  | { state: 'idle' }
  | { state: 'registering' }
  | { state: 'registered' }
  | { state: 'failed'; reason: DeviceRegistrationFailureReason; message?: string };

// The registration attempt runs in app/(app)/_layout.tsx and the screen that
// reports it (settings.tsx) is a sibling route, so there's no prop or parent
// state to carry the result between them. A one-value external store is the
// smallest thing that lets both see it.
let current: DeviceRegistrationStatus = { state: 'idle' };
const listeners = new Set<() => void>();

export function setDeviceRegistrationStatus(next: DeviceRegistrationStatus): void {
  current = next;
  listeners.forEach((listener) => listener());
}

export function resetDeviceRegistrationStatus(): void {
  setDeviceRegistrationStatus({ state: 'idle' });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDeviceRegistrationStatus(): DeviceRegistrationStatus {
  return useSyncExternalStore(subscribe, () => current);
}
