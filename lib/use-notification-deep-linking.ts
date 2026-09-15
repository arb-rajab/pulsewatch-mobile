import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { extractDeepLinkData, incidentRouteFor } from './push-notifications';

/**
 * Wires a tapped push notification to in-app navigation, for all three
 * states a tap can happen from:
 *  - foreground/background (app process alive): the tap fires a fresh
 *    NotificationResponse through the listener `useLastNotificationResponse`
 *    wraps.
 *  - killed (cold start via notification tap): the same hook's first read
 *    picks up the response the native side already recorded before JS
 *    started (`getLastNotificationResponse`), so this one hook covers all
 *    three — see expo-notifications' own `useLastNotificationResponse`
 *    source, which dedupes by notification request identifier internally.
 *
 * This is the actual production wiring (not reimplemented in tests): the
 * push -> deep-link integration test in
 * lib/__tests__/use-notification-deep-linking.test.tsx exercises this
 * hook directly with a fabricated NotificationResponse and a real
 * expo-router navigator, asserting the resulting route — the one part of
 * "genuine end-to-end" this sandbox can verify without a physical device
 * or push infrastructure (named limitation, same posture as the backend's
 * own ADR-0007: "not verified... requires real credentials").
 */
export function useNotificationDeepLinking(): void {
  const response = Notifications.useLastNotificationResponse();
  const handledIdentifier = useRef<string | null>(null);

  useEffect(() => {
    if (!response) return;

    const identifier = response.notification.request.identifier;
    if (handledIdentifier.current === identifier) return;
    handledIdentifier.current = identifier;

    const data = extractDeepLinkData(response);
    if (!data) return;

    router.push(incidentRouteFor(data) as never);
  }, [response]);
}
