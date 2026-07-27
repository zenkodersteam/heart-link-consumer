/**
 * Remembers a deep link (e.g. an emailed /sponsor?profile=... invite) across
 * the sign-up + onboarding detour so the visitor lands where the link pointed.
 * Web-only persistence (localStorage); native falls back to in-memory.
 */

const KEY = 'heartlink.pendingRoute';
let memory: string | null = null;

export function savePendingRoute(path: string): void {
  memory = path;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(KEY, path);
    }
  } catch {
    // Storage unavailable (private mode); memory fallback covers the session.
  }
}

export function takePendingRoute(): string | null {
  let value = memory;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      value = window.localStorage.getItem(KEY) ?? value;
      window.localStorage.removeItem(KEY);
    }
  } catch {
    // ignore
  }
  memory = null;
  return value;
}
