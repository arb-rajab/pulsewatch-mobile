import { api, ApiError } from '../api-client';
import { __resetServerUrlCacheForTests, saveServerUrl } from '../server-config';

function mockFetchOnce(status: number, body: unknown) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    status,
    ok: status >= 200 && status < 300,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

beforeEach(async () => {
  global.fetch = jest.fn();
  __resetServerUrlCacheForTests();
  await saveServerUrl('https://pulsewatch.example.com');
});

describe('api client', () => {
  it('throws when no server has been configured', async () => {
    __resetServerUrlCacheForTests();
    await expect(api.listTargets()).rejects.toThrow(/no pulsewatch server/i);
  });

  it('POSTs login with the right path, body, and credentials', async () => {
    mockFetchOnce(200, { operator_id: 'op-1', email: 'a@b.com' });

    const result = await api.login('a@b.com', 'hunter2');

    expect(result).toEqual({ operator_id: 'op-1', email: 'a@b.com' });
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://pulsewatch.example.com/api/v1/auth/login');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com', password: 'hunter2' });
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('treats a 204 response as no body', async () => {
    mockFetchOnce(204, undefined);
    await expect(api.logout()).resolves.toBeUndefined();
  });

  it('builds the SLO query string only from provided params', async () => {
    mockFetchOnce(200, {});
    await api.getTargetSlo('t-1', { windowDays: 7 });
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://pulsewatch.example.com/api/v1/targets/t-1/slo?window_days=7');
  });

  it('omits the query string entirely when no SLO params are given', async () => {
    mockFetchOnce(200, {});
    await api.getTargetSlo('t-1');
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://pulsewatch.example.com/api/v1/targets/t-1/slo');
  });

  it('URL-encodes path parameters', async () => {
    mockFetchOnce(200, {});
    await api.getTarget('weird id/with slash');
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe(
      'https://pulsewatch.example.com/api/v1/targets/weird%20id%2Fwith%20slash'
    );
  });

  it('raises ApiError with status/code/message/field from the response body', async () => {
    mockFetchOnce(422, {
      error: { code: 'invalid_interval', message: 'interval out of range', field: 'interval_seconds' },
    });

    await expect(api.listTargets()).rejects.toMatchObject({
      status: 422,
      code: 'invalid_interval',
      message: 'interval out of range',
      field: 'interval_seconds',
    });
  });

  it('flags a 401 response as unauthorized via ApiError', async () => {
    mockFetchOnce(401, { error: { code: 'unauthorized', message: 'nope', field: null } });
    try {
      await api.listTargets();
      throw new Error('expected api.listTargets() to reject');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).isUnauthorized).toBe(true);
    }
  });

  it('falls back to a generic message when the error body is empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 500,
      ok: false,
      text: async () => '',
    });
    await expect(api.listTargets()).rejects.toThrow(/status 500/i);
  });

  it('registers a device token with the exact upsert payload', async () => {
    mockFetchOnce(200, { id: 'dt-1', provider: 'fcm', platform: 'android' });
    await api.registerDeviceToken({ provider: 'fcm', platform: 'android', token: 'tok-123' });
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://pulsewatch.example.com/api/v1/device-tokens');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      provider: 'fcm',
      platform: 'android',
      token: 'tok-123',
    });
  });

  it('issues a DELETE for unregisterDeviceToken', async () => {
    mockFetchOnce(204, undefined);
    await api.unregisterDeviceToken('dt-1');
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://pulsewatch.example.com/api/v1/device-tokens/dt-1');
    expect(init.method).toBe('DELETE');
  });
});
