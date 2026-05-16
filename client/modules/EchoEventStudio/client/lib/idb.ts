/** * Simple localStorage-based shell caching for offline mode */ export async function saveShell(
  session: string,
  glbUrl: string,
): Promise<void> {
  localStorage.setItem(`shell:${session}`, glbUrl);
}
export function loadShell(session: string): string | null {
  return localStorage.getItem(`shell:${session}`);
}
export async function saveLayout(session: string, layout: any): Promise<void> {
  localStorage.setItem(`layout:${session}`, JSON.stringify(layout));
}
export function loadLayout(session: string): any {
  const data = localStorage.getItem(`layout:${session}`);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
export async function clearCache(session: string): Promise<void> {
  localStorage.removeItem(`shell:${session}`);
  localStorage.removeItem(`layout:${session}`);
}
export function getCacheKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith("shell:") || key.startsWith("layout:"))) {
      keys.push(key);
    }
  }
  return keys;
}
