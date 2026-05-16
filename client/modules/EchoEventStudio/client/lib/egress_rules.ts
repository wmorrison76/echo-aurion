import type { Item } from "@/pages/Planner";
export type Occupancy = "banquet" | "classroom" | "theater" | "assembly";
export function requiredWidthInches(occ: Occupancy): number {
  switch (occ) {
    case "theater":
    case "assembly":
      return 44;
    case "banquet":
    case "classroom":
    default:
      return 36;
  }
}
export interface DoorArc {
  id: string;
  cx: number;
  cy: number;
  radius: number;
  startDeg: number;
  endDeg: number;
  label?: string;
}
function rotExtents(w: number, h: number, rotDeg: number) {
  const a = (rotDeg * Math.PI) / 180;
  const cw = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
  const ch = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
  return { w: cw, h: ch };
}
function clampAngle(a: number) {
  const t = ((a % 360) + 360) % 360;
  return t;
}
function angleInSector(angle: number, start: number, end: number) {
  angle = clampAngle(angle);
  start = clampAngle(start);
  end = clampAngle(end);
  if (start <= end) return angle >= start && angle <= end;
  return angle >= start || angle <= end;
}
export interface DoorIssue {
  arcId: string;
  itemId: string;
}
export function checkDoorSwings(items: Item[], arcs: DoorArc[]): DoorIssue[] {
  const issues: DoorIssue[] = [];
  for (const arc of arcs) {
    for (const it of items) {
      const e = rotExtents(it.width, it.height, it.rotation);
      const ix1 = it.x - e.w / 2,
        ix2 = it.x + e.w / 2;
      const iy1 = it.y - e.h / 2,
        iy2 = it.y + e.h / 2;
      const nx = Math.max(ix1, Math.min(arc.cx, ix2));
      const ny = Math.max(iy1, Math.min(arc.cy, iy2));
      const dx = nx - arc.cx;
      const dy = ny - arc.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ang = (Math.atan2(ny - arc.cy, nx - arc.cx) * 180) / Math.PI;
      if (dist <= arc.radius && angleInSector(ang, arc.startDeg, arc.endDeg)) {
        issues.push({ arcId: arc.id, itemId: it.id });
      }
    }
  }
  return issues;
}
