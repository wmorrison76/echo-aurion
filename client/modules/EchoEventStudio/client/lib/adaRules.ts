export type Aisle = {
  id: string;
  width_m: number;
  length_m: number;
  position: [number, number, number];
};
export type Door = {
  id: string;
  clearWidth_m: number;
  swingArc_m: number;
  position: [number, number, number];
};
export type Table = {
  id: string;
  type: "round" | "rect";
  seats: number;
  position: [number, number, number];
  size: [number, number, number];
};
export type Buffet = {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
};
export type AdaIssue = {
  code: string;
  severity: "info" | "warn" | "error";
  message: string;
  objectId?: string;
};
export type AdaFindings = { ok: boolean; issues: AdaIssue[] };
function distance2D(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dz * dz);
}
export function validateAda({
  aisles = [],
  doors = [],
  tables = [],
  buffets = [],
}: {
  aisles?: Aisle[];
  doors?: Door[];
  tables?: Table[];
  buffets?: Buffet[];
}): AdaFindings {
  const issues: AdaIssue[] = []; // Min aisle width: 36" (0.915 m); 44" (1.118 m) recommended for two-way service for (const aisle of aisles) { if (aisle.width_m < 0.915) { issues.push({ code:"ADA-AISLE-36", severity:"error", message: `Aisle"${aisle.id}" below 36" minimum width`, objectId: aisle.id, }); } else if (aisle.width_m < 1.118) { issues.push({ code:"ADA-AISLE-44", severity:"warn", message: `Aisle"${aisle.id}" below recommended 44" (two-way service)`, objectId: aisle.id, }); } } // Door clear width: 32" (0.813 m) minimum for (const door of doors) { if (door.clearWidth_m < 0.813) { issues.push({ code:"ADA-DOOR-32", severity:"error", message: `Door"${door.id}" below 32" minimum clearance`, objectId: door.id, }); } } // Door swing clearance (heuristic: compute distance from door to nearby tables/buffets) for (const door of doors) { if (door.swingArc_m > 0) { for (const table of tables) { const tableRadius = Math.max(table.size[0], table.size[2]) / 2 + 0.15; const dist = distance2D(door.position, table.position); if (dist < door.swingArc_m + tableRadius) { issues.push({ code:"EGRESS-SWEEP", severity:"warn", message: `Table"${table.id}" may obstruct door sweep`, objectId: table.id, }); } } for (const buffet of buffets) { const buffetRadius = Math.max(buffet.size[0], buffet.size[2]) / 2 + 0.15; const dist = distance2D(door.position, buffet.position); if (dist < door.swingArc_m + buffetRadius) { issues.push({ code:"EGRESS-SWEEP", severity:"warn", message: `Buffet"${buffet.id}" may obstruct door sweep`, objectId: buffet.id, }); } } } } // Emergency egress width check (typically 44" minimum for 50+ person occupancy) const totalSeats = tables.reduce((sum, t) => sum + (t.seats || 0), 0); if (totalSeats >= 50) { for (const aisle of aisles) { if (aisle.width_m < 1.118) { issues.push({ code:"EGRESS-WIDTH-OCCUPANCY", severity:"warn", message: `For ${totalSeats} occupants, aisles should be ≥44"`, objectId: aisle.id, }); } } } return { ok: issues.every((i) => i.severity !=="error"), issues, };
}
