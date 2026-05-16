/** * Normalize a single GL code to uppercase, trimmed, no spaces or special chars */
export function normalizeGL(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9\-]/g, "");
} /** * Deduplicate GL codes after normalization */
export function dedupeGL(codes: string[]): string[] {
  const seen = new Set<string>();
  return codes.map(normalizeGL).filter((code) => {
    if (seen.has(code)) {
      return false;
    }
    seen.add(code);
    return true;
  });
} /** * Validate GL code format */
export function isValidGL(code: string): boolean {
  const normalized = normalizeGL(code);
  return /^[A-Z0-9\-]+$/.test(normalized) && normalized.length > 0;
}
