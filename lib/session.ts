import type { SmartKiaSession } from "@/lib/types";

const STORAGE_KEY = "smartkia_session";

export function saveSession(session: SmartKiaSession): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getSession(): SmartKiaSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SmartKiaSession;
    if (parsed.expiresAt * 1000 <= Date.now()) {
      clearSession();
      return null;
    }

    return parsed;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
