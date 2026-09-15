import { api } from './api-client';
import type { Target, TargetStatus } from './api-types';

export interface TargetWithStatus {
  target: Target;
  /** null when the per-target status fetch itself failed (config still loaded fine). */
  status: TargetStatus | null;
}

/**
 * `/targets` doesn't include live status, so the health view fans out one
 * `/targets/{id}/status` call per target. Acceptable at this project's
 * documented scale (~5-10 targets today, ≤100-target ceiling,
 * 05-api-contracts.md) — there's no bulk status endpoint to call instead.
 */
export async function loadTargetsWithStatus(): Promise<TargetWithStatus[]> {
  const targets = await api.listTargets();
  return Promise.all(
    targets.map(async (target): Promise<TargetWithStatus> => {
      try {
        const status = await api.getTargetStatus(target.id);
        return { target, status };
      } catch {
        return { target, status: null };
      }
    })
  );
}

export function targetLabel(target: Target): string {
  if (target.type === 'http') return target.url ?? '(no url)';
  return `${target.host ?? '?'}:${target.port ?? '?'}`;
}

export const DISPLAY_STATE_COLOR: Record<string, string> = {
  healthy: '#1B8A3D',
  suspect: '#B98900',
  alerting: '#C0271E',
  unknown: '#6B7280',
};
