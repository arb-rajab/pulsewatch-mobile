import { findIncident } from '../incidents';
import { api } from '../api-client';
import type { Incident } from '../api-types';

jest.mock('../api-client', () => ({
  api: { listTargetIncidents: jest.fn() },
}));

const incidents: Incident[] = [
  { id: 1, target_id: 't-1', opened_at: '2026-09-01T00:00:00Z', closed_at: '2026-09-01T01:00:00Z', status: 'resolved' },
  { id: 2, target_id: 't-1', opened_at: '2026-09-02T00:00:00Z', closed_at: null, status: 'open' },
];

beforeEach(() => {
  (api.listTargetIncidents as jest.Mock).mockReset();
});

describe('findIncident', () => {
  it('returns the incident matching the id', async () => {
    (api.listTargetIncidents as jest.Mock).mockResolvedValue(incidents);
    const result = await findIncident('t-1', 2);
    expect(result).toEqual(incidents[1]);
  });

  it('returns null when no incident matches', async () => {
    (api.listTargetIncidents as jest.Mock).mockResolvedValue(incidents);
    const result = await findIncident('t-1', 999);
    expect(result).toBeNull();
  });

  it('fetches incidents scoped to the given target', async () => {
    (api.listTargetIncidents as jest.Mock).mockResolvedValue([]);
    await findIncident('t-42', 1);
    expect(api.listTargetIncidents).toHaveBeenCalledWith('t-42');
  });
});
