import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  __resetServerUrlCacheForTests,
  clearServerUrl,
  getCachedServerUrl,
  loadServerUrl,
  normalizeServerUrl,
  saveServerUrl,
} from '../server-config';

describe('normalizeServerUrl', () => {
  it('trims trailing slashes', () => {
    expect(normalizeServerUrl('https://pulsewatch.example.com/')).toBe(
      'https://pulsewatch.example.com'
    );
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeServerUrl('  https://pulsewatch.example.com  ')).toBe(
      'https://pulsewatch.example.com'
    );
  });

  it('rejects a URL without an http(s) scheme', () => {
    expect(() => normalizeServerUrl('pulsewatch.example.com')).toThrow(
      /must start with http/i
    );
  });

  it('accepts http for local/self-hosted development', () => {
    expect(normalizeServerUrl('http://192.168.1.20:8080')).toBe('http://192.168.1.20:8080');
  });
});

describe('server URL persistence', () => {
  beforeEach(async () => {
    __resetServerUrlCacheForTests();
    await AsyncStorage.clear();
  });

  it('round-trips through AsyncStorage', async () => {
    await saveServerUrl('https://pulsewatch.example.com/');
    __resetServerUrlCacheForTests();
    expect(await loadServerUrl()).toBe('https://pulsewatch.example.com');
  });

  it('caches after the first load', async () => {
    await saveServerUrl('https://pulsewatch.example.com');
    await AsyncStorage.setItem('pulsewatch:serverUrl', 'https://tampered.example.com');
    // cache was populated by saveServerUrl, so this reads the cache, not storage
    expect(await loadServerUrl()).toBe('https://pulsewatch.example.com');
    expect(getCachedServerUrl()).toBe('https://pulsewatch.example.com');
  });

  it('returns null when nothing has been saved', async () => {
    expect(await loadServerUrl()).toBeNull();
  });

  it('clears both the cache and storage', async () => {
    await saveServerUrl('https://pulsewatch.example.com');
    await clearServerUrl();
    __resetServerUrlCacheForTests();
    expect(await loadServerUrl()).toBeNull();
  });
});
