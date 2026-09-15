import { api } from './api-client';
import type { Incident } from './api-types';

/**
 * There is no `GET /incidents/{id}` in the contract — incident history is
 * only exposed per-target (`GET /targets/{id}/incidents`). A push
 * notification's data payload always carries both ids (ADR-0007), so the
 * deep-link route is `/targets/[targetId]/incidents/[incidentId]` and
 * resolves the single incident by loading its target's incident list and
 * matching the id, rather than needing an endpoint that doesn't exist.
 */
export async function findIncident(
  targetId: string,
  incidentId: number
): Promise<Incident | null> {
  const incidents = await api.listTargetIncidents(targetId);
  return incidents.find((incident) => incident.id === incidentId) ?? null;
}
