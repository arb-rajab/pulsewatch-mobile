import AsyncStorage from '@react-native-async-storage/async-storage';

// pulsewatch is self-hosted (01-scope-and-non-goals.md): there is no fixed
// production host to bake in, so the operator points the app at their own
// server the same way they'd point a browser at their dashboard.
const SERVER_URL_KEY = 'pulsewatch:serverUrl';

let cachedServerUrl: string | null = null;

export function normalizeServerUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('Server URL must start with http:// or https://');
  }
  return trimmed;
}

export async function loadServerUrl(): Promise<string | null> {
  if (cachedServerUrl !== null) return cachedServerUrl;
  const stored = await AsyncStorage.getItem(SERVER_URL_KEY);
  cachedServerUrl = stored;
  return stored;
}

export async function saveServerUrl(url: string): Promise<string> {
  const normalized = normalizeServerUrl(url);
  await AsyncStorage.setItem(SERVER_URL_KEY, normalized);
  cachedServerUrl = normalized;
  return normalized;
}

export async function clearServerUrl(): Promise<void> {
  await AsyncStorage.removeItem(SERVER_URL_KEY);
  cachedServerUrl = null;
}

export function getCachedServerUrl(): string | null {
  return cachedServerUrl;
}

/** Test-only: reset the in-memory cache between test cases. */
export function __resetServerUrlCacheForTests(): void {
  cachedServerUrl = null;
}
