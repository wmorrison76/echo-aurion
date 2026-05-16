import type { Obj } from "@/store/sceneStore"; // Support for Planner.tsx Item type
export interface PlannerItem {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label?: string;
  seats?: number;
  color?: string;
} /** * Generate chair positions in a ring around a round table */
export function chairsAroundRound(
  table: Obj,
  perTable: number = 8,
  radiusOffset: number = 0.6,
): [number, number, number][] {
  const [x, y, z] = table.position;
  const r = (table.size?.[0] ?? 1.6) / 2 + radiusOffset;
  const seatY = (table.size?.[1] ?? 0.75) * 0.9;
  const arr: [number, number, number][] = [];
  for (let i = 0; i < perTable; i++) {
    const a = (i / perTable) * Math.PI * 2;
    arr.push([x + Math.cos(a) * r, seatY, z + Math.sin(a) * r]);
  }
  return arr;
} /** * Collect all chair positions from layout objects */
export function collectChairPositions(objs: Obj[]): [number, number, number][] {
  const chairs: [number, number, number][] = [];
  for (const o of objs) {
    if (o.type === "table_round") {
      chairs.push(...chairsAroundRound(o, o.seats ?? 8));
    }
  }
  return chairs;
} /** * Generate chair items in a full circle around a round table (Planner compatibility) */
export function generateRoundChairsFull(table: PlannerItem): PlannerItem[] {
  const count = table.seats ?? 8;
  const radius = Math.max(table.width, table.height) / 2 + 0.5;
  const chairs: PlannerItem[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const x = table.x + Math.cos(angle) * radius;
    const y = table.y + Math.sin(angle) * radius;
    chairs.push({
      id: Math.random().toString(36).slice(2, 9),
      type: "chair",
      x,
      y,
      width: 1,
      height: 1,
      rotation: (angle * 180) / Math.PI,
      color: "#8b7355",
      label: `Chair ${i + 1}`,
    });
  }
  return chairs;
} /** * Generate chair items in a crescent pattern around a round table (Planner compatibility) */
export function generateRoundChairsCrescent(table: PlannerItem): PlannerItem[] {
  const count = table.seats ?? 8;
  const radius = Math.max(table.width, table.height) / 2 + 0.5;
  const chairs: PlannerItem[] = []; // Crescent: 180 degree arc (half circle facing the table) const startAngle = -Math.PI / 4; const endAngle = Math.PI + Math.PI / 4; const angleRange = endAngle - startAngle; for (let i = 0; i < count; i++) { const t = i / (count - 1); const angle = startAngle + t * angleRange; const x = table.x + Math.cos(angle) * radius; const y = table.y + Math.sin(angle) * radius; chairs.push({ id: Math.random().toString(36).slice(2, 9), type:"chair", x, y, width: 1, height: 1, rotation: (angle * 180) / Math.PI, color:"#8b7355", label: `Chair ${i + 1}`, }); } return chairs;
} /** * Generate items in a U-shape configuration */
export function generateUShape(
  center: { x: number; y: number },
  options?: { topCount?: number; sideCount?: number; spacingFt?: number },
): PlannerItem[] {
  const topCount = options?.topCount ?? 5;
  const sideCount = options?.sideCount ?? 3;
  const spacingFt = options?.spacingFt ?? 2;
  const items: PlannerItem[] = []; // Top row (horizontal) for (let i = 0; i < topCount; i++) { const offset = (i - (topCount - 1) / 2) * spacingFt; items.push({ id: Math.random().toString(36).slice(2, 9), type:"rect6x30", x: center.x + offset, y: center.y, width: 6, height: 30, rotation: 0, color:"#8b5cf6", label: `Top Table ${i + 1}`, }); } // Left side (vertical) for (let i = 0; i < sideCount; i++) { const offset = (i + 1) * spacingFt; items.push({ id: Math.random().toString(36).slice(2, 9), type:"rect6x30", x: center.x - (topCount / 2 + 1) * spacingFt, y: center.y + offset, width: 6, height: 30, rotation: 0, color:"#8b5cf6", label: `Left Table ${i + 1}`, }); } // Right side (vertical) for (let i = 0; i < sideCount; i++) { const offset = (i + 1) * spacingFt; items.push({ id: Math.random().toString(36).slice(2, 9), type:"rect6x30", x: center.x + (topCount / 2 + 1) * spacingFt, y: center.y + offset, width: 6, height: 30, rotation: 0, color:"#8b5cf6", label: `Right Table ${i + 1}`, }); } return items;
}
