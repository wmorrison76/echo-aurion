/**
 * iter210 · Central API base-URL resolver (audit recommendation FE-2).
 *
 * Before: 12+ copies of `const API = () => env.VITE_REACT_APP_BACKEND_URL || ...`
 * After:  `import { API } from "@/lib/api-url";`
 *
 * The helper supports every env var this project uses:
 *   - VITE_REACT_APP_BACKEND_URL  (Vite preferred)
 *   - REACT_APP_BACKEND_URL       (CRA-style, passed through)
 *   - VITE_BACKEND_URL            (alt)
 */
export function API(): string {
  const env = (import.meta as any).env || {};
  return (
    env.VITE_REACT_APP_BACKEND_URL ||
    env.REACT_APP_BACKEND_URL ||
    env.VITE_BACKEND_URL ||
    ""
  );
}

/** Convenience — returns a ready-to-fetch absolute URL. Accepts either a
 *  leading-slash path (preferred) or a full URL (pass-through). */
export function apiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const base = API();
  if (!path.startsWith("/")) path = "/" + path;
  return base + path;
}
