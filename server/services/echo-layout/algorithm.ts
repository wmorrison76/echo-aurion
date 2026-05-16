/**
 * EchoLayout — deterministic layout algorithm (A6)
 *
 * Pure functions: input is a RoomSpec + guest count + style + optional
 * constraints, output is tables/fixtures/aisles with concrete (x, y)
 * coordinates in feet (or meters; controlled by RoomSpec.units).
 *
 * No external API calls. Designed so a Gemini-backed alternate
 * implementation can plug into the same shape later via the service
 * layer (see echo-layout-design-service.ts).
 *
 * Coordinate system: origin (0,0) at the front-left of the room,
 * x increases to the right, y increases toward the back of the room.
 * Stage / head table sits at the front (low y).
 */

export type LayoutStyle = "banquet" | "theatre" | "classroom" | "cocktail" | "u_shape";

export interface RoomSpec {
  length: number;   // y dimension (front-to-back)
  width: number;    // x dimension (left-to-right)
  units: "ft" | "m";
  capacity?: number;
  hasStage?: boolean;
  hasDanceFloor?: boolean;
  hasBar?: boolean;
}

export interface LayoutConstraints {
  /** Reserve space for an X by Y dance floor at the room's center back. */
  danceFloor?: { width: number; depth: number };
  /** Reserve space for a stage at the front. */
  stage?: { width: number; depth: number };
  /** Reserve space for a bar at the back wall. */
  bar?: { width: number; depth: number };
  /** Reserve a head-table strip at the front (banquet style). */
  headTable?: { width: number; depth: number; seats: number };
  /** Minimum aisle width in the same units as the room. Default 3 ft. */
  minAisleWidth?: number;
  /** Per-table seat count override; otherwise style-defaulted. */
  seatsPerTable?: number;
}

export interface LayoutTable {
  id: string;
  type: "round_60" | "round_72" | "rect_6x2_5" | "rect_8x3" | "high_top_30" | "u_segment";
  seats: number;
  position: { x: number; y: number };       // table center
  rotation: number;                         // degrees
  dimensions: { width: number; depth: number }; // bounding box
}

export interface LayoutFixture {
  type: "stage" | "bar" | "dance_floor" | "dj" | "head_table";
  position: { x: number; y: number };       // top-left corner
  dimensions: { width: number; depth: number };
  notes?: string;
}

export interface LayoutAisle {
  from: { x: number; y: number };
  to: { x: number; y: number };
  width: number;
}

export interface LayoutResult {
  style: LayoutStyle;
  room: RoomSpec;
  tables: LayoutTable[];
  fixtures: LayoutFixture[];
  aisles: LayoutAisle[];
  totals: {
    tableCount: number;
    totalSeats: number;
    guestCount: number;
    capacityPct: number;
    floorAreaUsed: number;
    floorAreaTotal: number;
  };
  warnings: string[];
}

const ID = (prefix: string, n: number) => `${prefix}${n.toString().padStart(2, "0")}`;
const r2 = (n: number) => Math.round(n * 100) / 100;

/* ─── Style defaults ────────────────────────────────────────────────── */

interface StyleDefault {
  tableType: LayoutTable["type"];
  tableWidth: number;
  tableDepth: number;
  seatsPerTable: number;
  /** Footprint per table including chairs + walking room. */
  footprintWidth: number;
  footprintDepth: number;
}

function styleDefaults(style: LayoutStyle, units: "ft" | "m"): StyleDefault {
  // All numbers in feet; convert at the end if meters requested.
  const ft: Record<LayoutStyle, StyleDefault> = {
    banquet: {
      tableType: "round_60", tableWidth: 5, tableDepth: 5,
      seatsPerTable: 8, footprintWidth: 9, footprintDepth: 9,
    },
    theatre: {
      tableType: "round_60", tableWidth: 0, tableDepth: 0,
      seatsPerTable: 1, footprintWidth: 1.5, footprintDepth: 3,
    },
    classroom: {
      tableType: "rect_6x2_5", tableWidth: 6, tableDepth: 2.5,
      seatsPerTable: 3, footprintWidth: 7, footprintDepth: 6,
    },
    cocktail: {
      tableType: "high_top_30", tableWidth: 2.5, tableDepth: 2.5,
      seatsPerTable: 0, footprintWidth: 5, footprintDepth: 5,
    },
    u_shape: {
      tableType: "rect_8x3", tableWidth: 8, tableDepth: 3,
      seatsPerTable: 4, footprintWidth: 10, footprintDepth: 6,
    },
  };
  const base = ft[style];
  if (units === "m") {
    return {
      ...base,
      tableWidth: r2(base.tableWidth * 0.3048),
      tableDepth: r2(base.tableDepth * 0.3048),
      footprintWidth: r2(base.footprintWidth * 0.3048),
      footprintDepth: r2(base.footprintDepth * 0.3048),
    };
  }
  return base;
}

/* ─── Builders per style ────────────────────────────────────────────── */

function reserveFixtures(
  room: RoomSpec,
  c: LayoutConstraints,
): { fixtures: LayoutFixture[]; usableArea: { x0: number; y0: number; x1: number; y1: number } } {
  const fixtures: LayoutFixture[] = [];
  let y0 = 0;            // front wall reserved area depth
  let yEnd = room.length; // back wall reserved area depth (start)

  if (c.stage) {
    fixtures.push({
      type: "stage",
      position: { x: r2((room.width - c.stage.width) / 2), y: 0 },
      dimensions: { width: c.stage.width, depth: c.stage.depth },
    });
    y0 = Math.max(y0, c.stage.depth);
  }
  if (c.headTable) {
    fixtures.push({
      type: "head_table",
      position: { x: r2((room.width - c.headTable.width) / 2), y: r2(y0 + 1) },
      dimensions: { width: c.headTable.width, depth: c.headTable.depth },
      notes: `${c.headTable.seats} seats`,
    });
    y0 = r2(y0 + 1 + c.headTable.depth);
  }
  if (c.bar) {
    fixtures.push({
      type: "bar",
      position: { x: r2(room.width - c.bar.width), y: r2(yEnd - c.bar.depth) },
      dimensions: { width: c.bar.width, depth: c.bar.depth },
    });
    yEnd = r2(yEnd - c.bar.depth);
  }
  if (c.danceFloor) {
    const yPos = r2(yEnd - c.danceFloor.depth - 2);
    fixtures.push({
      type: "dance_floor",
      position: { x: r2((room.width - c.danceFloor.width) / 2), y: yPos },
      dimensions: { width: c.danceFloor.width, depth: c.danceFloor.depth },
    });
    yEnd = yPos;
  }

  return {
    fixtures,
    usableArea: { x0: 0, y0, x1: room.width, y1: yEnd },
  };
}

function buildAisles(
  area: { x0: number; y0: number; x1: number; y1: number },
  width: number,
): LayoutAisle[] {
  // One central aisle running front-to-back. Always present for ADA.
  const xMid = r2((area.x0 + area.x1) / 2);
  return [
    {
      from: { x: xMid, y: area.y0 },
      to: { x: xMid, y: area.y1 },
      width,
    },
  ];
}

function buildBanquet(
  guestCount: number,
  room: RoomSpec,
  c: LayoutConstraints,
  defaults: StyleDefault,
  warnings: string[],
): { tables: LayoutTable[]; fixtures: LayoutFixture[]; aisles: LayoutAisle[]; usableArea: any } {
  const seatsPerTable = c.seatsPerTable ?? defaults.seatsPerTable;
  const tableCount = Math.max(1, Math.ceil(guestCount / seatsPerTable));

  const fixSet = reserveFixtures(room, {
    ...c,
    stage: c.stage ?? (room.hasStage ? { width: r2(room.width * 0.4), depth: 5 } : undefined),
    bar: c.bar ?? (room.hasBar ? { width: r2(room.width * 0.3), depth: 4 } : undefined),
    danceFloor:
      c.danceFloor ??
      (room.hasDanceFloor ? { width: r2(room.width * 0.4), depth: r2(room.length * 0.2) } : undefined),
  });

  const aisleW = c.minAisleWidth ?? 3;
  const aisles = buildAisles(fixSet.usableArea, aisleW);

  // Grid layout: figure out how many tables fit per row given the usable
  // width and the table footprint, leaving the central aisle clear.
  const usable = fixSet.usableArea;
  const usableW = usable.x1 - usable.x0;
  const usableD = usable.y1 - usable.y0;

  // Reserve the central aisle by treating it as a vertical no-go strip.
  const halfW = (usableW - aisleW) / 2;
  const tablesPerHalfRow = Math.max(1, Math.floor(halfW / defaults.footprintWidth));
  const tablesPerRow = tablesPerHalfRow * 2;
  const rowsNeeded = Math.ceil(tableCount / tablesPerRow);
  const totalDepthNeeded = rowsNeeded * defaults.footprintDepth;

  if (totalDepthNeeded > usableD) {
    warnings.push(
      `Banquet layout requires ${r2(totalDepthNeeded)}${room.units} of depth but only ${r2(usableD)}${room.units} available; tables overlap fixtures or aisles`,
    );
  }

  const tables: LayoutTable[] = [];
  let placed = 0;
  for (let row = 0; row < rowsNeeded && placed < tableCount; row++) {
    const yCenter = r2(usable.y0 + (row + 0.5) * defaults.footprintDepth);
    for (let i = 0; i < tablesPerRow && placed < tableCount; i++) {
      const half = i < tablesPerHalfRow ? "left" : "right";
      const localIdx = half === "left" ? i : i - tablesPerHalfRow;
      const xBaseStart = half === "left" ? usable.x0 : usable.x0 + halfW + aisleW;
      const xCenter = r2(xBaseStart + (localIdx + 0.5) * defaults.footprintWidth);
      tables.push({
        id: ID("T", placed + 1),
        type: defaults.tableType,
        seats: seatsPerTable,
        position: { x: xCenter, y: yCenter },
        rotation: 0,
        dimensions: { width: defaults.tableWidth, depth: defaults.tableDepth },
      });
      placed += 1;
    }
  }

  return { tables, fixtures: fixSet.fixtures, aisles, usableArea: fixSet.usableArea };
}

function buildTheatre(
  guestCount: number,
  room: RoomSpec,
  c: LayoutConstraints,
  defaults: StyleDefault,
  warnings: string[],
): { tables: LayoutTable[]; fixtures: LayoutFixture[]; aisles: LayoutAisle[]; usableArea: any } {
  const fixSet = reserveFixtures(room, {
    ...c,
    stage: c.stage ?? { width: r2(room.width * 0.6), depth: 6 },
  });
  const aisleW = c.minAisleWidth ?? 4;
  const aisles = buildAisles(fixSet.usableArea, aisleW);

  const usable = fixSet.usableArea;
  const halfW = (usable.x1 - usable.x0 - aisleW) / 2;
  const chairsPerHalfRow = Math.max(1, Math.floor(halfW / defaults.footprintWidth));
  const chairsPerRow = chairsPerHalfRow * 2;
  const rowsNeeded = Math.ceil(guestCount / chairsPerRow);
  if (rowsNeeded * defaults.footprintDepth > usable.y1 - usable.y0) {
    warnings.push("Theatre layout exceeds room depth; consider larger venue or split session");
  }

  const tables: LayoutTable[] = [];
  let placed = 0;
  for (let row = 0; row < rowsNeeded && placed < guestCount; row++) {
    const yCenter = r2(usable.y0 + (row + 0.5) * defaults.footprintDepth);
    for (let i = 0; i < chairsPerRow && placed < guestCount; i++) {
      const half = i < chairsPerHalfRow ? "left" : "right";
      const localIdx = half === "left" ? i : i - chairsPerHalfRow;
      const xStart = half === "left" ? usable.x0 : usable.x0 + halfW + aisleW;
      const xCenter = r2(xStart + (localIdx + 0.5) * defaults.footprintWidth);
      tables.push({
        id: ID("S", placed + 1),
        type: defaults.tableType,
        seats: 1,
        position: { x: xCenter, y: yCenter },
        rotation: 0,
        dimensions: { width: defaults.tableWidth, depth: defaults.tableDepth },
      });
      placed += 1;
    }
  }
  return { tables, fixtures: fixSet.fixtures, aisles, usableArea: fixSet.usableArea };
}

function buildClassroom(
  guestCount: number,
  room: RoomSpec,
  c: LayoutConstraints,
  defaults: StyleDefault,
  warnings: string[],
): { tables: LayoutTable[]; fixtures: LayoutFixture[]; aisles: LayoutAisle[]; usableArea: any } {
  const seatsPerTable = c.seatsPerTable ?? defaults.seatsPerTable;
  const tableCount = Math.max(1, Math.ceil(guestCount / seatsPerTable));
  const fixSet = reserveFixtures(room, {
    ...c,
    stage: c.stage ?? { width: r2(room.width * 0.5), depth: 5 },
  });
  const aisleW = c.minAisleWidth ?? 4;
  const aisles = buildAisles(fixSet.usableArea, aisleW);

  const usable = fixSet.usableArea;
  const halfW = (usable.x1 - usable.x0 - aisleW) / 2;
  const tablesPerHalfRow = Math.max(1, Math.floor(halfW / defaults.footprintWidth));
  const tablesPerRow = tablesPerHalfRow * 2;
  const rowsNeeded = Math.ceil(tableCount / tablesPerRow);
  if (rowsNeeded * defaults.footprintDepth > usable.y1 - usable.y0) {
    warnings.push("Classroom layout exceeds room depth");
  }

  const tables: LayoutTable[] = [];
  let placed = 0;
  for (let row = 0; row < rowsNeeded && placed < tableCount; row++) {
    const yCenter = r2(usable.y0 + (row + 0.5) * defaults.footprintDepth);
    for (let i = 0; i < tablesPerRow && placed < tableCount; i++) {
      const half = i < tablesPerHalfRow ? "left" : "right";
      const localIdx = half === "left" ? i : i - tablesPerHalfRow;
      const xStart = half === "left" ? usable.x0 : usable.x0 + halfW + aisleW;
      const xCenter = r2(xStart + (localIdx + 0.5) * defaults.footprintWidth);
      tables.push({
        id: ID("C", placed + 1),
        type: defaults.tableType,
        seats: seatsPerTable,
        position: { x: xCenter, y: yCenter },
        rotation: 0,
        dimensions: { width: defaults.tableWidth, depth: defaults.tableDepth },
      });
      placed += 1;
    }
  }
  return { tables, fixtures: fixSet.fixtures, aisles, usableArea: fixSet.usableArea };
}

function buildCocktail(
  guestCount: number,
  room: RoomSpec,
  c: LayoutConstraints,
  defaults: StyleDefault,
  warnings: string[],
): { tables: LayoutTable[]; fixtures: LayoutFixture[]; aisles: LayoutAisle[]; usableArea: any } {
  // Heuristic: 1 high-top per 5 guests, scattered with min spacing.
  const tableCount = Math.max(1, Math.ceil(guestCount / 5));
  const fixSet = reserveFixtures(room, {
    ...c,
    bar: c.bar ?? { width: r2(room.width * 0.5), depth: 4 },
  });
  const usable = fixSet.usableArea;
  const cols = Math.max(1, Math.floor((usable.x1 - usable.x0) / defaults.footprintWidth));
  const rows = Math.max(1, Math.ceil(tableCount / cols));
  if (rows * defaults.footprintDepth > usable.y1 - usable.y0) {
    warnings.push("Cocktail layout density exceeds usable depth; reduce headcount or widen room");
  }

  const tables: LayoutTable[] = [];
  let placed = 0;
  for (let r = 0; r < rows && placed < tableCount; r++) {
    const yCenter = r2(usable.y0 + (r + 0.5) * defaults.footprintDepth);
    // Stagger every other row by half a column for visual interest
    // (also matches industry best practice for cocktail flow).
    const stagger = r % 2 === 1 ? defaults.footprintWidth / 2 : 0;
    for (let i = 0; i < cols && placed < tableCount; i++) {
      const xCenter = r2(usable.x0 + (i + 0.5) * defaults.footprintWidth + stagger);
      if (xCenter > usable.x1) continue;
      tables.push({
        id: ID("H", placed + 1),
        type: defaults.tableType,
        seats: 0,
        position: { x: xCenter, y: yCenter },
        rotation: 0,
        dimensions: { width: defaults.tableWidth, depth: defaults.tableDepth },
      });
      placed += 1;
    }
  }
  return { tables, fixtures: fixSet.fixtures, aisles: [], usableArea: usable };
}

function buildUShape(
  guestCount: number,
  room: RoomSpec,
  c: LayoutConstraints,
  defaults: StyleDefault,
  warnings: string[],
): { tables: LayoutTable[]; fixtures: LayoutFixture[]; aisles: LayoutAisle[]; usableArea: any } {
  // Three sides of a rectangle. Seats only on the outer edge of each side.
  // 2ft per seat along a U side. Compute side length from guest count.
  const seatsPerSide = Math.ceil(guestCount / 3);
  const sideLength = Math.max(8, seatsPerSide * 2);
  const fixSet = reserveFixtures(room, {
    ...c,
    stage: c.stage ?? { width: r2(room.width * 0.4), depth: 5 },
  });
  const usable = fixSet.usableArea;

  const totalWidth = Math.min(sideLength, usable.x1 - usable.x0 - 4);
  const totalDepth = Math.min(sideLength, usable.y1 - usable.y0 - 4);
  if (totalWidth < sideLength || totalDepth < sideLength) {
    warnings.push("U-shape required side length exceeds room; truncating");
  }

  const xLeft = r2(usable.x0 + (usable.x1 - usable.x0 - totalWidth) / 2);
  const xRight = r2(xLeft + totalWidth);
  const yFront = r2(usable.y0 + 2);
  const yBack = r2(yFront + totalDepth);

  const tables: LayoutTable[] = [
    // Front (head) segment
    {
      id: "U_FRONT",
      type: "rect_8x3",
      seats: Math.ceil(totalWidth / 2),
      position: { x: r2((xLeft + xRight) / 2), y: yFront },
      rotation: 0,
      dimensions: { width: totalWidth, depth: 3 },
    },
    // Left segment
    {
      id: "U_LEFT",
      type: "rect_8x3",
      seats: Math.ceil(totalDepth / 2),
      position: { x: xLeft, y: r2((yFront + yBack) / 2) },
      rotation: 90,
      dimensions: { width: totalDepth, depth: 3 },
    },
    // Right segment
    {
      id: "U_RIGHT",
      type: "rect_8x3",
      seats: Math.ceil(totalDepth / 2),
      position: { x: xRight, y: r2((yFront + yBack) / 2) },
      rotation: 90,
      dimensions: { width: totalDepth, depth: 3 },
    },
  ];

  const seatedTotal = tables.reduce((s, t) => s + t.seats, 0);
  if (seatedTotal < guestCount) {
    warnings.push(`U-shape seats ${seatedTotal} of ${guestCount} requested; consider banquet style`);
  }

  return { tables, fixtures: fixSet.fixtures, aisles: [], usableArea: usable };
}

/* ─── Public entry point ────────────────────────────────────────────── */

export function designLayout(args: {
  guestCount: number;
  style: LayoutStyle;
  room: RoomSpec;
  constraints?: LayoutConstraints;
}): LayoutResult {
  const room = args.room;
  const c = args.constraints ?? {};
  const defaults = styleDefaults(args.style, room.units);
  const warnings: string[] = [];

  if (args.guestCount <= 0) {
    warnings.push("guestCount is 0; producing empty layout");
  }
  if (room.capacity && args.guestCount > room.capacity) {
    warnings.push(
      `guestCount ${args.guestCount} exceeds room capacity ${room.capacity}; layout may be over-dense`,
    );
  }

  let built: { tables: LayoutTable[]; fixtures: LayoutFixture[]; aisles: LayoutAisle[]; usableArea: any };
  switch (args.style) {
    case "banquet":   built = buildBanquet(args.guestCount, room, c, defaults, warnings); break;
    case "theatre":   built = buildTheatre(args.guestCount, room, c, defaults, warnings); break;
    case "classroom": built = buildClassroom(args.guestCount, room, c, defaults, warnings); break;
    case "cocktail":  built = buildCocktail(args.guestCount, room, c, defaults, warnings); break;
    case "u_shape":   built = buildUShape(args.guestCount, room, c, defaults, warnings); break;
  }

  const totalSeats = built.tables.reduce((s, t) => s + t.seats, 0);
  const floorAreaTotal = room.length * room.width;
  const floorAreaUsed = built.tables.reduce(
    (s, t) => s + t.dimensions.width * t.dimensions.depth,
    0,
  ) + built.fixtures.reduce(
    (s, f) => s + f.dimensions.width * f.dimensions.depth,
    0,
  );

  return {
    style: args.style,
    room,
    tables: built.tables,
    fixtures: built.fixtures,
    aisles: built.aisles,
    totals: {
      tableCount: built.tables.length,
      totalSeats,
      guestCount: args.guestCount,
      capacityPct: room.capacity ? r2((args.guestCount / room.capacity) * 100) : 0,
      floorAreaUsed: r2(floorAreaUsed),
      floorAreaTotal: r2(floorAreaTotal),
    },
    warnings,
  };
}
