import { getCachedServerUrl } from './server-config';
import type {
  ApiErrorBody,
  DeviceToken,
  DeviceTokenRegisterRequest,
  Incident,
  LoginResponse,
  Target,
  TargetSlo,
  TargetStatus,
} from './api-types';

const API_PREFIX = '/api/v1';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly field: string | null;

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.error.message ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.error.code ?? 'unknown';
    this.field = body?.error.field ?? null;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

function requireServerUrl(): string {
  const url = getCachedServerUrl();
  if (!url) {
    throw new Error('No pulsewatch server configured yet.');
  }
  return url;
}

async function request<T>(
  path: string,
  init?: RequestInit & { skipJsonBody?: boolean }
): Promise<T> {
  const base = requireServerUrl();
  const response = await fetch(`${base}${API_PREFIX}${path}`, {
    ...init,
    // RN's fetch is backed by the platform's native HTTP stack, which
    // maintains its own cookie jar per host — there is no browser-style
    // cross-origin restriction to opt into here. `credentials: 'include'`
    // is set anyway so the intent (send the HttpOnly session cookie) is
    // explicit rather than implicit in platform behaviour.
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(response.status, body as ApiErrorBody | null);
  }

  return body as T;
}

export const api = {
  login(email: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  logout(): Promise<void> {
    return request<void>('/auth/logout', { method: 'POST' });
  },

  listTargets(): Promise<Target[]> {
    return request<Target[]>('/targets');
  },

  getTarget(targetId: string): Promise<Target> {
    return request<Target>(`/targets/${encodeURIComponent(targetId)}`);
  },

  getTargetStatus(targetId: string): Promise<TargetStatus> {
    return request<TargetStatus>(`/targets/${encodeURIComponent(targetId)}/status`);
  },

  getTargetSlo(
    targetId: string,
    params?: { windowDays?: number; sloTargetPct?: number }
  ): Promise<TargetSlo> {
    const query = new URLSearchParams();
    if (params?.windowDays !== undefined) {
      query.set('window_days', String(params.windowDays));
    }
    if (params?.sloTargetPct !== undefined) {
      query.set('slo_target_pct', String(params.sloTargetPct));
    }
    const qs = query.toString();
    return request<TargetSlo>(
      `/targets/${encodeURIComponent(targetId)}/slo${qs ? `?${qs}` : ''}`
    );
  },

  listTargetIncidents(targetId: string): Promise<Incident[]> {
    return request<Incident[]>(`/targets/${encodeURIComponent(targetId)}/incidents`);
  },

  registerDeviceToken(payload: DeviceTokenRegisterRequest): Promise<DeviceToken> {
    return request<DeviceToken>('/device-tokens', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listDeviceTokens(): Promise<DeviceToken[]> {
    return request<DeviceToken[]>('/device-tokens');
  },

  unregisterDeviceToken(deviceTokenId: string): Promise<void> {
    return request<void>(`/device-tokens/${encodeURIComponent(deviceTokenId)}`, {
      method: 'DELETE',
    });
  },
};
