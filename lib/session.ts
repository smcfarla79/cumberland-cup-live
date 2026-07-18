import type { AppSession } from "@/lib/types";

const SESSION_KEY = "cumberland-cup-session";

export function getSession(): AppSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppSession;
    if (!parsed?.tournamentId || !parsed?.playerId || !parsed?.playerName) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(session: AppSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

/** True when saved identity matches this tournament and player list. */
export function isSessionValid(
  session: AppSession | null,
  tournamentId: string,
  playerIds: string[],
): session is AppSession {
  return Boolean(
    session &&
      session.tournamentId === tournamentId &&
      playerIds.includes(session.playerId),
  );
}
