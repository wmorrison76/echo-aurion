export type EngineRole = "designer" | "editor" | "admin" | "lead" | "lead-dev";
export function normalizeRole(role: string | null | undefined): string {
  return role ? role.trim().toLowerCase() : "";
}
export function canEditEngine(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return (
    normalized === "admin" ||
    normalized === "lead" ||
    normalized === "lead dev" ||
    normalized === "lead-dev" ||
    normalized === "lead_dev"
  );
}
