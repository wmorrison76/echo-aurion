/**
 * Admin authentication helper for standalone SaaS dashboards.
 * Stores the admin token in localStorage and injects it as X-Admin-Token header.
 */

const KEY = "echoai3_admin_token";

export function getAdminToken(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function setAdminToken(token: string): void {
  try { localStorage.setItem(KEY, token); } catch {}
}

export function clearAdminToken(): void {
  try { localStorage.removeItem(KEY); } catch {}
}

export function adminHeaders(extra?: HeadersInit): HeadersInit {
  const token = getAdminToken();
  const base: Record<string, string> = token ? { "X-Admin-Token": token } : {};
  return { ...base, ...(extra as any) };
}

export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = { ...adminHeaders(init.headers), ...(init.headers || {}) };
  return fetch(input, { ...init, headers });
}

/** Prompt + persist helper. Returns true if token now set. */
export function ensureAdminToken(): boolean {
  if (getAdminToken()) return true;
  const tok = prompt("Enter admin token (X-Admin-Token):\nFind in backend/.env as ADMIN_API_TOKEN");
  if (!tok) return false;
  setAdminToken(tok.trim());
  return true;
}
