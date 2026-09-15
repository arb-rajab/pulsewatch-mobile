import AsyncStorage from '@react-native-async-storage/async-storage';

// The session itself lives in an HttpOnly cookie the native cookie jar
// manages (05-api-contracts.md: `pulsewatch_session`) — JS can't read or
// write it, by design. This is only a *local* "was the last login
// successful" flag so the app can skip straight to an optimistic
// logged-in UI on launch instead of always bouncing through the login
// screen while it revalidates in the background.
const SESSION_HINT_KEY = 'pulsewatch:sessionHint';

export interface SessionHint {
  operatorId: string;
  email: string;
}

export async function loadSessionHint(): Promise<SessionHint | null> {
  const raw = await AsyncStorage.getItem(SESSION_HINT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionHint;
  } catch {
    return null;
  }
}

export async function saveSessionHint(hint: SessionHint): Promise<void> {
  await AsyncStorage.setItem(SESSION_HINT_KEY, JSON.stringify(hint));
}

export async function clearSessionHint(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_HINT_KEY);
}
