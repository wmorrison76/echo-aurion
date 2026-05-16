export type CalendarSet = "none" | "federal" | "christian" | "jewish" | "all"; // Minimal examples. Extend as needed.
const federal = new Set<string>([
  // ISO dates examples
]);
const christian = new Set<string>([]);
const jewish = new Set<string>([]);
export function isHighlighted(iso: string, set: CalendarSet): boolean {
  if (set === "none") return false;
  const list = [federal, christian, jewish];
  if (set === "all") return list.some((s) => s.has(iso));
  if (set === "federal") return federal.has(iso);
  if (set === "christian") return christian.has(iso);
  if (set === "jewish") return jewish.has(iso);
  return false;
}
