import { loadTargetsWithStatus, targetLabel } from '../targets';
import { api } from '../api-client';
import type { Target, TargetStatus } from '../api-types';

jest.mock('../api-client', () => ({
  api: { listTargets: jest.fn(), getTargetStatus: jest.fn() },
}));

function makeTarget(overrides: Partial<Target> = {}): Target {
  return {
    id: 't-1',
    type: 'http',
    url: 'https://example.com/health',
    host: null,
    port: null,
    body_match_pattern: null,
    interval_seconds: 60,
    failure_threshold: 3,
    timeout_seconds: 5,
    agent_id: null,
    created_at: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

function makeStatus(overrides: Partial<TargetStatus> = {}): TargetStatus {
  return {
    target_id: 't-1',
    display_state: 'healthy',
    raw_state: 'healthy',
    streak: 5,
    last_checked_at: '2026-09-01T00:05:00Z',
    next_due_at: '2026-09-01T00:06:00Z',
    agent_id: null,
    agent_stale: null,
    open_incident: null,
    ...overrides,
  };
}

beforeEach(() => {
  (api.listTargets as jest.Mock).mockReset();
  (api.getTargetStatus as jest.Mock).mockReset();
});

describe('loadTargetsWithStatus', () => {
  it('pairs each target with its status', async () => {
    const targets = [makeTarget({ id: 't-1' }), makeTarget({ id: 't-2' })];
    (api.listTargets as jest.Mock).mockResolvedValue(targets);
    (api.getTargetStatus as jest.Mock).mockImplementation((id: string) =>
      Promise.resolve(makeStatus({ target_id: id }))
    );

    const result = await loadTargetsWithStatus();

    expect(result).toHaveLength(2);
    expect(result[0].target.id).toBe('t-1');
    expect(result[0].status?.target_id).toBe('t-1');
    expect(result[1].status?.target_id).toBe('t-2');
  });

  it('tolerates a single target status fetch failing without dropping the target', async () => {
    const targets = [makeTarget({ id: 't-1' }), makeTarget({ id: 't-2' })];
    (api.listTargets as jest.Mock).mockResolvedValue(targets);
    (api.getTargetStatus as jest.Mock).mockImplementation((id: string) =>
      id === 't-1' ? Promise.reject(new Error('boom')) : Promise.resolve(makeStatus({ target_id: id }))
    );

    const result = await loadTargetsWithStatus();

    expect(result).toHaveLength(2);
    expect(result[0].status).toBeNull();
    expect(result[1].status?.target_id).toBe('t-2');
  });

  it('returns an empty list when there are no targets', async () => {
    (api.listTargets as jest.Mock).mockResolvedValue([]);
    const result = await loadTargetsWithStatus();
    expect(result).toEqual([]);
    expect(api.getTargetStatus).not.toHaveBeenCalled();
  });
});

describe('targetLabel', () => {
  it('shows the URL for an http target', () => {
    expect(targetLabel(makeTarget({ type: 'http', url: 'https://example.com' }))).toBe(
      'https://example.com'
    );
  });

  it('shows host:port for a tcp target', () => {
    expect(
      targetLabel(makeTarget({ type: 'tcp', url: null, host: 'db.internal', port: 5432 }))
    ).toBe('db.internal:5432');
  });
});
