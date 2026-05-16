export type ItemType =
  | "round60"
  | "round72"
  | "rect8x30"
  | "rect6x30"
  | "cocktail30"
  | "serpentine"
  | "chair"
  | "stage"
  | "riser"
  | "dancefloor"
  | "buffet"
  | "pipedrape";

export interface Item {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label?: string;
  seats?: number;
  color?: string;
}

export interface Metrics {
  seatsTotal: number;
  tables: Record<string, number>;
  danceFloorSqFt: number;
  densitySeatsPer1000SqFt: number;
  areaSqFt: number;
}

export function computeMetrics(items: Item[]): Metrics {
  let seatsTotal = 0;
  const tables: Record<string, number> = {};
  let danceFloorSqFt = 0;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const it of items) {
    minX = Math.min(minX, it.x - it.width / 2);
    maxX = Math.max(maxX, it.x + it.width / 2);
    minY = Math.min(minY, it.y - it.height / 2);
    maxY = Math.max(maxY, it.y + it.height / 2);

    if (it.type.startsWith("round") || it.type.startsWith("rect"))
      seatsTotal += Math.max(0, it.seats || 0);
    if (it.type === "chair") seatsTotal += 1;
    if (it.type === "dancefloor") danceFloorSqFt += it.width * it.height;

    tables[it.type] = (tables[it.type] || 0) + 1;
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    /* default room */
    minX = 0;
    minY = 0;
    maxX = 40;
    maxY = 40;
  }

  /* add margin */
  const areaSqFt = Math.max(1, (maxX - minX + 10) * (maxY - minY + 10));
  const densitySeatsPer1000SqFt = seatsTotal * (1000 / areaSqFt);

  return {
    seatsTotal,
    tables,
    danceFloorSqFt,
    densitySeatsPer1000SqFt,
    areaSqFt,
  };
}

export function buildPayload(
  outletId: string,
  layoutId: string,
  items: Item[],
) {
  const metrics = computeMetrics(items);
  const nodes = items.map((i) => ({
    id: i.id,
    type: i.type,
    x: i.x,
    y: i.y,
    w: i.width,
    h: i.height,
    rot: i.rotation,
    label: i.label || "",
    seats: i.seats || 0,
    color: i.color || "",
  }));
  return { outletId, layoutId, nodes, metrics };
}

export async function syncEchoStratus(apiBase: string, payload: any) {
  const url = apiBase.replace(/\/$/, "") + "/layouts/sync";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`EchoStratus sync failed: ${res.status}`);
  return res.json();
}
