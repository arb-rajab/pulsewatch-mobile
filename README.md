# pulsewatch-mobile

React Native companion app for [pulsewatch](https://github.com/arb-rajab/pulsewatch),
a self-hosted uptime/SLO/alerting service. Signs in with the same operator
account as the pulsewatch dashboard, shows live target health and incident
history, and receives a push notification the moment an incident opens —
foreground or background — deep-linking straight to that incident.

## Stack

- [Expo](https://expo.dev) (SDK 57) + TypeScript, bare enough to use raw
  native push tokens (no managed Expo push service in the loop — see
  "Push notifications" below)
- [expo-router](https://docs.expo.dev/router/introduction/) for file-based
  navigation and deep linking (`pulsewatch://` scheme, plus universal
  paths matching the in-app routes)
- [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
  for permissions, raw device token retrieval, and foreground/background/
  killed-state notification handling
- Jest (`jest-expo` preset) + React Native Testing Library for tests

## Backend contract

This app is a pure client of pulsewatch's `/api/v1` REST API
(`docs/architecture/openapi.yaml` in the `pulsewatch` repo) — operator
session auth (`POST /auth/login`, an `HttpOnly` cookie), targets, target
status/SLO, incidents, and device-token registration. Push dispatch itself
(FCM + APNs, sent directly by the backend with no vendor SDK) is
`pulsewatch`'s ADR-0007; this repo only consumes it.

`lib/api-types.ts` is a deliberately 1:1 mirror of that OpenAPI schema —
if the backend contract changes, that file is where it shows up as a
diff, not something this app tries to abstract away.

## Setup

```bash
npm install
npm run typecheck
npm run lint
npm test
```

pulsewatch is self-hosted, so there's no baked-in production server URL —
on first launch the app asks for the pulsewatch server's URL (stored
locally) before showing the login screen.

### Running

```bash
npm run android   # or
npm run ios       # requires macOS
```

Push notifications require a real device / a development build (not Expo
Go — see "Named limitations" below) plus:

- **Android**: a Firebase project's `google-services.json` (for the FCM
  device token) placed at the project root and referenced from `app.json`.
- **iOS**: an Apple Developer account with push notifications enabled for
  the app's bundle id; `app.json`'s `aps-environment` entitlement is set
  to `development` — flip to `production` for a release build.

Neither is included in this repo (they're real credentials, not something
to commit) — see pulsewatch's own ADR-0007 for the same reasoning on the
backend side.

## Push notifications and deep linking

- **Registration** (`lib/device-tokens.ts`): requests notification
  permission, then fetches the *raw* native push token —
  `expo-notifications`' `getDevicePushTokenAsync()`, not an Expo push
  token — since the backend speaks FCM's HTTP v1 API and APNs' HTTP/2
  provider API directly. Android always registers as `fcm`, iOS as
  `apns` (`providerForPlatform`), matching pulsewatch's ADR-0007.
  Registration runs on every sign-in (`lib/use-register-device-on-sign-in.ts`),
  since re-registering an unchanged token is what clears a dead/revoked
  mark on the backend.
- **Payload shape**: every push's `data` carries `{ kind, incident_id,
  target_id }` as strings (`lib/push-notifications.ts`'s
  `extractDeepLinkData`), mirroring `internal/pushprovider`'s
  `Notification.Data` on the backend exactly.
- **Deep link**: `lib/use-notification-deep-linking.ts` wires
  `expo-notifications`' `useLastNotificationResponse()` — which covers a
  live tap, a background tap, *and* a cold start launched by tapping a
  notification, through one hook — to `router.push('/targets/[targetId]/
  incidents/[incidentId]')`, deduped by notification identifier so a
  re-render doesn't double-navigate.
- **Settings → Devices**: lists this operator's registered devices
  (including why a dead one died) and can revoke one (`DELETE
  /device-tokens/{id}`); signing out is the same action for the current
  device.

### Why the incident detail route needs both ids

There's no `GET /incidents/{id}` in the backend's API — incident history
is only exposed per-target. A push's payload always carries both
`target_id` and `incident_id` (ADR-0007), so the deep-link route is
`/targets/[targetId]/incidents/[incidentId]` and resolves the single
incident by loading that target's incident list and matching the id
(`lib/incidents.ts`).

## Testing

93 tests across 16 suites (`npm test`): API client, auth state machine,
device-token registration, target/incident data helpers, every screen,
and — the one most worth calling out — a genuine push → deep-link
integration test (`lib/__tests__/use-notification-deep-linking.test.tsx`)
that renders the *actual* production hook the app mounts, feeds it a
fabricated native notification-response event, and asserts the real
navigation call. It's not a reimplementation of the logic under test.

### Named limitation

What this repo's test suite (and this sandbox) cannot verify: an actual
push arriving from real FCM/APNs infrastructure, or an actual OS
cold-launching the app process from a killed state via a notification
tap — both require a physical device and real provider credentials.
This is the same class of limitation pulsewatch's own ADR-0007 names for
its server-side push delivery (B-016: "not verified... requires real
credentials") — stated here rather than implied or papered over.

## Project layout

```
app/                          expo-router routes
  index.tsx                   auth-state gate (bootstrapping/needs-server/signed-out/signed-in)
  server-setup.tsx            pulsewatch server URL entry
  login.tsx                   operator sign-in
  (app)/                      signed-in routes (guarded)
    index.tsx                 target health list
    settings.tsx               device list, revoke, sign out
    targets/[targetId]/       target detail (status + SLO)
    targets/[targetId]/incidents/            incident list
    targets/[targetId]/incidents/[incidentId] incident detail (push deep-link target)
lib/                          API client, auth, push, and data-loading logic (framework-agnostic, unit-tested)
```
