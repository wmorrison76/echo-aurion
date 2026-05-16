export type Zone = {
  id: string;
  kind: "rect";
  label?: string;
  x: number; // feet y: number; // feet width: number; // feet height: number; // feet
};
export function makeZoneId() {
  return Math.random().toString(36).slice(2, 9);
}
function rotExtents(w: number, h: number, rotDeg: number) {
  const a = (rotDeg * Math.PI) / 180;
  const cw = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
  const ch = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
  return { w: cw, h: ch };
}
export interface ZoneIssue {
  zoneId: string;
  itemId: string;
}
export function checkZones(
  items: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  }[],
  zones: Zone[],
): ZoneIssue[] {
  const issues: ZoneIssue[] = [];
  for (const z of zones) {
    const zx1 = z.x - z.width / 2,
      zx2 = z.x + z.width / 2;
    const zy1 = z.y - z.height / 2,
      zy2 = z.y + z.height / 2;
    for (const it of items) {
      const e = rotExtents(it.width, it.height, it.rotation);
      const ix1 = it.x - e.w / 2,
        ix2 = it.x + e.w / 2;
      const iy1 = it.y - e.h / 2,
        iy2 = it.y + e.h / 2;
      const overlap = !(ix2 < zx1 || ix1 > zx2 || iy2 < zy1 || iy1 > zy2);
      if (overlap) issues.push({ zoneId: z.id, itemId: it.id });
    }
  }
  return issues;
}
export function serializeZones(zones: Zone[]) {
  return zones.map(({ id, kind, label, x, y, width, height }) => ({
    id,
    kind,
    label,
    x,
    y,
    width,
    height,
  }));
}
export function deserializeZones(raw: any): Zone[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((z) => ({
      id: String(z.id || makeZoneId()),
      kind: "rect" as const,
      label: z.label ? String(z.label) : undefined,
      x: Number(z.x) || 0,
      y: Number(z.y) || 0,
      width: Number(z.width) || 0,
      height: Number(z.height) || 0,
    }))
    .filter(
      (z) =>
        isFinite(z.x) &&
        isFinite(z.y) &&
        isFinite(z.width) &&
        isFinite(z.height),
    );
}
