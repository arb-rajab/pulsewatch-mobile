import React from 'react';
import { render } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import type { NotificationResponse } from 'expo-notifications';

import { useNotificationDeepLinking } from '../use-notification-deep-linking';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('expo-notifications', () => ({
  useLastNotificationResponse: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

/**
 * This is the "genuine end-to-end push -> deep-link" test: it renders the
 * *actual* production hook (`useNotificationDeepLinking`, the same one
 * app/_layout.tsx mounts for the whole app) and only fakes the two things
 * a real device would otherwise supply — the native notification-response
 * event and expo-router's imperative navigator. Everything in between
 * (extracting incident_id/target_id from the data payload, building the
 * route, deduping by notification identifier) is the real code path, not
 * reimplemented here.
 *
 * What this sandbox cannot verify: an actual OS cold-launching the app
 * process from a killed state via a notification tap, or an actual push
 * arriving from real FCM/APNs infrastructure — both require a physical
 * device (named limitation, README.md; same posture pulsewatch's own
 * ADR-0007 takes for its unverified real-device delivery, B-016).
 */
function fakeResponse(
  identifier: string,
  data: Record<string, unknown> | undefined
): NotificationResponse {
  return {
    notification: {
      date: Date.now(),
      request: {
        identifier,
        content: {
          title: 'A target is failing',
          subtitle: null,
          body: 'A monitored target has started failing its checks.',
          data,
          categoryIdentifier: null,
          sound: 'default',
        } as never,
        trigger: { type: 'push' },
      },
    },
    actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
  };
}

function Harness() {
  useNotificationDeepLinking();
  return null;
}

const mockUseLastNotificationResponse =
  Notifications.useLastNotificationResponse as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useNotificationDeepLinking', () => {
  it('navigates to /targets/[targetId]/incidents/[incidentId] when a push is tapped', async () => {
    mockUseLastNotificationResponse.mockReturnValue(
      fakeResponse('req-1', { kind: 'opened', incident_id: '42', target_id: 'target-abc' })
    );

    await render(<Harness />);

    expect(router.push).toHaveBeenCalledWith('/targets/target-abc/incidents/42');
  });

  it('does nothing before the hook has resolved (undefined)', async () => {
    mockUseLastNotificationResponse.mockReturnValue(undefined);
    await render(<Harness />);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('does nothing when there is no prior tap to resume from (null)', async () => {
    mockUseLastNotificationResponse.mockReturnValue(null);
    await render(<Harness />);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('ignores a response whose payload is missing the deep-link ids', async () => {
    mockUseLastNotificationResponse.mockReturnValue(
      fakeResponse('req-2', { some: 'unrelated payload' })
    );
    await render(<Harness />);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('does not re-navigate for a new object carrying the same notification identifier', async () => {
    const first = fakeResponse('req-3', {
      kind: 'opened',
      incident_id: '7',
      target_id: 'target-x',
    });
    mockUseLastNotificationResponse.mockReturnValue(first);
    const { rerender } = await render(<Harness />);
    expect(router.push).toHaveBeenCalledTimes(1);

    // A fresh object, but the same underlying notification (identifier
    // matches) — this is what getLastNotificationResponse() vs. a live
    // listener callback can each hand back for the same physical tap.
    const sameNotificationAgain = fakeResponse('req-3', {
      kind: 'opened',
      incident_id: '7',
      target_id: 'target-x',
    });
    mockUseLastNotificationResponse.mockReturnValue(sameNotificationAgain);
    await rerender(<Harness />);

    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('navigates again for a genuinely new notification', async () => {
    mockUseLastNotificationResponse.mockReturnValue(
      fakeResponse('req-4', { kind: 'opened', incident_id: '1', target_id: 'target-a' })
    );
    const { rerender } = await render(<Harness />);
    expect(router.push).toHaveBeenNthCalledWith(1, '/targets/target-a/incidents/1');

    mockUseLastNotificationResponse.mockReturnValue(
      fakeResponse('req-5', { kind: 'opened', incident_id: '2', target_id: 'target-b' })
    );
    await rerender(<Harness />);

    expect(router.push).toHaveBeenNthCalledWith(2, '/targets/target-b/incidents/2');
  });

  it('handles a cold-start launch the same as a live tap (identical hook contract)', async () => {
    // expo-notifications' real useLastNotificationResponse sources its
    // first value from getLastNotificationResponse(), which the native
    // side populates before JS even starts when the app was launched by
    // tapping a notification — from this hook's contract there is no
    // observable difference from a live tap, so the same wiring covers it.
    mockUseLastNotificationResponse.mockReturnValue(
      fakeResponse('cold-start-req', {
        kind: 'opened',
        incident_id: '99',
        target_id: 'target-cold',
      })
    );
    await render(<Harness />);
    expect(router.push).toHaveBeenCalledWith('/targets/target-cold/incidents/99');
  });
});
