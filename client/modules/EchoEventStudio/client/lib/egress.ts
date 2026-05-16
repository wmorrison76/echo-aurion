import type { Item } from "@/pages/Planner";
function rotExtents(w: number, h: number, rotDeg: number) {
  const a = (rotDeg * Math.PI) / 180;
  const cw = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
  const ch = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
  return { w: cw, h: ch };
}
export interface ClearanceIssue {
  a: string;
  b: string;
  clearanceInches: number;
}
export function checkClearances(
  items: Item[],
  minInches = 36,
): ClearanceIssue[] {
  const issues: ClearanceIssue[] = [];
  for (let i = 0; i < items.length; i++) {
    const A = items[i];
    const Ae = rotExtents(A.width, A.height, A.rotation);
    const Ax1 = A.x - Ae.w / 2,
      Ax2 = A.x + Ae.w / 2;
    const Ay1 = A.y - Ae.h / 2,
      Ay2 = A.y + Ae.h / 2;
    for (let j = i + 1; j < items.length; j++) {
      const B = items[j];
      const Be = rotExtents(B.width, B.height, B.rotation);
      const Bx1 = B.x - Be.w / 2,
        Bx2 = B.x + Be.w / 2;
      const By1 = B.y - Be.h / 2,
        By2 = B.y + Be.h / 2;
      const dx = Math.max(0, Math.max(Ax1 - Bx2, Bx1 - Ax2));
      const dy = Math.max(0, Math.max(Ay1 - By2, By1 - Ay2));
      const clearanceFt = Math.min(dx, dy);
      const clearanceIn = clearanceFt * 12;
      if (clearanceIn > 0 && clearanceIn < minInches) {
        issues.push({
          a: A.id,
          b: B.id,
          clearanceInches: Math.round(clearanceIn),
        });
      }
    }
  }
  return issues;
}
