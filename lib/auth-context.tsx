import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api, ApiError } from './api-client';
import { clearSessionHint, loadSessionHint, saveSessionHint, SessionHint } from './auth-storage';
import { loadServerUrl, saveServerUrl } from './server-config';

export type AuthStatus =
  | 'bootstrapping'
  | 'needs-server'
  | 'signed-out'
  | 'signed-in';

export interface AuthContextValue {
  status: AuthStatus;
  serverUrl: string | null;
  session: SessionHint | null;
  configureServer: (url: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('bootstrapping');
  const [serverUrl, setServerUrlState] = useState<string | null>(null);
  const [session, setSession] = useState<SessionHint | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const url = await loadServerUrl();
      if (cancelled) return;
      setServerUrlState(url);

      if (!url) {
        setStatus('needs-server');
        return;
      }

      const hint = await loadSessionHint();
      if (cancelled) return;

      if (!hint) {
        setStatus('signed-out');
        return;
      }

      // Optimistic: show the app immediately from the local hint, then
      // confirm in the background. A stale/expired cookie surfaces as a
      // 401 on this first real request and flips us back to signed-out.
      setSession(hint);
      setStatus('signed-in');

      try {
        await api.listTargets();
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.isUnauthorized) {
          await clearSessionHint();
          setSession(null);
          setStatus('signed-out');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const configureServer = useCallback(async (url: string) => {
    const normalized = await saveServerUrl(url);
    setServerUrlState(normalized);
    setStatus('signed-out');
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login(email, password);
    const hint: SessionHint = { operatorId: response.operator_id, email: response.email };
    await saveSessionHint(hint);
    setSession(hint);
    setStatus('signed-in');
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Logout is best-effort server-side (05-api-contracts.md: a
      // stateless signed cookie can't be server-revoked per-session
      // anyway) — local sign-out must proceed even if this request fails.
    }
    await clearSessionHint();
    setSession(null);
    setStatus('signed-out');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, serverUrl, session, configureServer, login, logout }),
    [status, serverUrl, session, configureServer, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
