import * as Notifications from 'expo-notifications';

import type { PushDeepLinkData } from './api-types';

// Foreground presentation: an incident push should still surface as a
// banner while the app is open, not silently update state — the operator
// is meant to notice.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Pure extraction of the deep-link fields the backend puts in every push's
 * data payload (ADR-0007 / internal/pushprovider: "incident_id, target_id,
 * kind", sent as strings on both FCM and APNs). Kept separate from any
 * navigation call so it can be unit-tested against fabricated payloads
 * without touching expo-router.
 */
export function extractDeepLinkData(
  response: Notifications.NotificationResponse
): PushDeepLinkData | null {
  const data = response.notification.request.content.data as
    | Record<string, unknown>
    | undefined;

  const incidentId = data?.incident_id;
  const targetId = data?.target_id;
  if (typeof incidentId !== 'string' || typeof targetId !== 'string') {
    return null;
  }
  if (incidentId.length === 0 || targetId.length === 0) {
    return null;
  }

  return {
    kind: typeof data?.kind === 'string' ? data.kind : 'opened',
    incident_id: incidentId,
    target_id: targetId,
  };
}

/** The in-app route a given push's deep-link data should open. */
export function incidentRouteFor(data: PushDeepLinkData): string {
  return `/targets/${encodeURIComponent(data.target_id)}/incidents/${encodeURIComponent(
    data.incident_id
  )}`;
}
