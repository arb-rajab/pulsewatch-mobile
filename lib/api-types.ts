// Mirrors docs/architecture/openapi.yaml (pulsewatch backend, /api/v1) as of
// ADR-0007. Kept intentionally 1:1 with the wire schema rather than remodeled
// for UI convenience, so a contract change is a visible diff here.

export type TargetType = 'http' | 'tcp';

export interface Target {
  id: string;
  type: TargetType;
  url: string | null;
  host: string | null;
  port: number | null;
  body_match_pattern: string | null;
  interval_seconds: number;
  failure_threshold: number;
  timeout_seconds: number;
  agent_id: string | null;
  created_at: string;
}

export type DisplayState = 'healthy' | 'suspect' | 'alerting' | 'unknown';
export type RawState = 'healthy' | 'suspect' | 'alerting';

export interface TargetStatus {
  target_id: string;
  display_state: DisplayState;
  raw_state: RawState;
  streak: number;
  last_checked_at: string | null;
  next_due_at: string;
  agent_id: string | null;
  agent_stale: boolean | null;
  open_incident: { id: number; opened_at: string } | null;
}

export interface TargetSlo {
  target_id: string;
  window_days: number;
  window_start: string;
  window_end: string;
  expected_checks: number;
  success_count: number;
  failure_count: number;
  unknown_count: number;
  uptime_pct: number;
  slo_target_pct: number;
  error_budget_consumed_pct: number;
}

export type IncidentStatus = 'open' | 'resolved';

export interface Incident {
  id: number;
  target_id: string;
  opened_at: string;
  closed_at: string | null;
  status: IncidentStatus;
}

export type DeviceTokenProvider = 'fcm' | 'apns';
export type DevicePlatform = 'ios' | 'android';

export interface DeviceTokenRegisterRequest {
  provider: DeviceTokenProvider;
  platform: DevicePlatform;
  token: string;
}

export interface DeviceToken {
  id: string;
  provider: DeviceTokenProvider;
  platform: DevicePlatform;
  created_at: string;
  last_registered_at: string;
  last_delivered_at: string | null;
  revoked_at: string | null;
  dead_at: string | null;
  dead_reason: string | null;
}

export interface LoginResponse {
  operator_id: string;
  email: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    field: string | null;
  };
}

// The two fields a push notification's data payload always carries
// (ADR-0007: "ids, not target URLs or hostnames") plus `kind`, which
// mirrors internal/pushprovider's Notification.Data on the backend.
export type PushNotificationKind = 'opened' | string;

export interface PushDeepLinkData {
  kind: PushNotificationKind;
  incident_id: string;
  target_id: string;
}
