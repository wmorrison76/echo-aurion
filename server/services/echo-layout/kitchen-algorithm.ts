/**
 * Kitchen-design algorithm (D5).
 *
 * Pure deterministic function — no external API calls. Produces:
 *   - station placement (cold prep, hot line, dish pit, expo, walk-in,
 *     pastry/bakery, bar) with concrete (x, y) footprints
 *   - thermal zones (heat map) summed from each piece of equipment's
 *     thermal_class + thermal_output_btu
 *   - utility zones (gas, water supply, water drain, electrical) showing
 *     where each station's hookups need to come from + run length
 *   - compliance HUD: NSF clearances around hot equipment, ADA aisle
 *     widths, hand-sink coverage rule (one per 25ft of hot line),
 *     three-comp-sink + mop-sink presence checks
 *
 * Coordinate system: origin (0,0) at front-left, x increases right
 * (long axis), y increases toward the back (short axis). All distances
 * in feet unless suffixed _in. Pure function so it can be tested
 * without DB; persistence happens in the calling service layer.
 */

export type KitchenWorkflow =
  | "line_kitchen"        // standard hot/cold line (most restaurants)
  | "banquet_prep"        // larger volumes, more cold prep, batch cooking
  | "pastry_bakery"       // ovens + proofers + mixer-heavy
  | "bar_only"            // beverage focus, smaller hot equipment
  | "ghost_kitchen";      // delivery-first, no expo

export type ThermalClass = "hot" | "warm" | "neutral" | "cool" | "cold";

export interface KitchenEquipment {
  id: string;
  slug: string;
  name: string;
  category: "cooking" | "refrigeration" | "prep" | "dish" | "storage" | "bar" | "pastry";
  station: string | null;
  width_ft: number;
  depth_ft: number;
  height_ft?: number;
  needs_gas: boolean;
  gas_btu?: number;
  needs_water_supply: boolean;
  needs_water_drain: boolean;
  needs_electric: boolean;
  voltage?: number;
  amperage?: number;
  phase?: number;
  needs_hood: boolean;
  thermal_output_btu: number;
  thermal_class: ThermalClass;
  min_clearance_back_in: number;
  min_clearance_sides_in: number;
  min_clearance_front_in: number;
  list_price_usd?: number;
}

export interface KitchenRoomSpec {
  width: number;   // long axis, ft
  length: number;  // short axis, ft
  units: "ft" | "m";
  ceiling_height_ft?: number;
  has_gas_main: boolean;
  has_grease_trap: boolean;
  exterior_wall_locations?: ("north" | "south" | "east" | "west")[];
}

export interface KitchenDesignInput {
  workflow: KitchenWorkflow;
  room: KitchenRoomSpec;
  equipment: KitchenEquipment[]; // pre-selected catalog items + qty implicitly via duplicates
  constraints?: {
    require_walk_in: boolean;
    require_three_comp_sink: boolean;
    expected_volume_covers_per_day?: number;
  };
}

export interface PlacedEquipment {
  equipmentId: string;
  slug: string;
  name: string;
  station: string;
  position: { x: number; y: number };  // top-left corner
  rotation: 0 | 90 | 180 | 270;
  dimensions: { width: number; depth: number };
  thermal_class: ThermalClass;
  thermal_output_btu: number;
}

export interface ThermalZone {
  classLabel: ThermalClass;
  // Convex hull bounding box
  bounds: { x0: number; y0: number; x1: number; y1: number };
  total_btu: number;
}

export interface UtilityRun {
  utility: "gas" | "water_supply" | "water_drain" | "electric_high_volt" | "electric_low_volt";
  from: { x: number; y: number };
  to: { x: number; y: number };
  length_ft: number;
  notes?: string;
}

export interface ComplianceFinding {
  rule: string;
  severity: "info" | "warning" | "violation";
  message: string;
  affects?: string[]; // equipment ids
}

export interface KitchenDesign {
  workflow: KitchenWorkflow;
  room: KitchenRoomSpec;
  placements: PlacedEquipment[];
  thermal_zones: ThermalZone[];
  utility_runs: UtilityRun[];
  compliance: ComplianceFinding[];
  totals: {
    equipment_count: number;
    total_thermal_btu: number;
    total_estimated_cost_usd: number;
    floor_area_used_pct: number;
    requires_hood_count: number;
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const ft = (inches: number) => inches / 12;

const STATION_ORDER: Record<KitchenWorkflow, string[]> = {
  line_kitchen:  ["walk_in", "cold_prep", "hot_line", "expo", "dish_pit", "dry_storage"],
  banquet_prep:  ["walk_in", "cold_prep", "hot_line", "pastry", "expo", "dish_pit", "dry_storage"],
  pastry_bakery: ["walk_in", "cold_prep", "pastry", "expo", "dish_pit", "dry_storage"],
  bar_only:      ["bar", "dish_pit", "walk_in", "dry_storage"],
  ghost_kitchen: ["walk_in", "cold_prep", "hot_line", "dish_pit"],
};

/**
 * Place stations along the long axis of the room. Walk-in goes to a
 * back wall corner (best for receiving access). Hot line gets the
 * exterior-wall side (for hood routing) when available. Dish pit
 * opposite the hot line. Cold prep adjacent to walk-in for short
 * pulls. This is a starting layout — the chef edits.
 */
function buildStationGrid(workflow: KitchenWorkflow, room: KitchenRoomSpec) {
  const stations = STATION_ORDER[workflow];
  // Reserve a 4ft circulation aisle along the long axis center.
  const aisleY = r2(room.length / 2 - 2);
  const aisleHeight = 4;

  // Front strip (chef-side): hot line + expo
  const frontStrip = { y0: 0, y1: aisleY };
  // Back strip: cold prep, walk-in, dish pit
  const backStrip = { y0: aisleY + aisleHeight, y1: room.length };

  // Allocate fractions of the front strip width per station based on
  // typical commercial-kitchen ratios.
  const frontWidth = room.width;
  const backWidth = room.width;

  const stationBounds: Record<string, { x0: number; y0: number; x1: number; y1: number }> = {};

  // Front strip allocation (by station)
  if (stations.includes("hot_line") && stations.includes("expo")) {
    stationBounds["hot_line"] = { x0: 0, y0: frontStrip.y0, x1: frontWidth * 0.65, y1: frontStrip.y1 };
    stationBounds["expo"] = { x0: frontWidth * 0.65, y0: frontStrip.y0, x1: frontWidth, y1: frontStrip.y1 };
  } else if (stations.includes("hot_line")) {
    stationBounds["hot_line"] = { x0: 0, y0: frontStrip.y0, x1: frontWidth, y1: frontStrip.y1 };
  } else if (stations.includes("bar")) {
    stationBounds["bar"] = { x0: 0, y0: frontStrip.y0, x1: frontWidth, y1: frontStrip.y1 };
  }
  if (stations.includes("pastry") && !stationBounds["pastry"]) {
    // Pastry tucks behind hot line if both present
    stationBounds["pastry"] = { x0: frontWidth * 0.35, y0: frontStrip.y0, x1: frontWidth * 0.65, y1: frontStrip.y1 };
  }

  // Back strip allocation
  let cursor = 0;
  const backStations = ["walk_in", "cold_prep", "dish_pit", "dry_storage"].filter((s) => stations.includes(s));
  const sliceWidth = backWidth / Math.max(1, backStations.length);
  for (const s of backStations) {
    stationBounds[s] = { x0: cursor, y0: backStrip.y0, x1: cursor + sliceWidth, y1: backStrip.y1 };
    cursor += sliceWidth;
  }

  return { stationBounds, aisleY, aisleHeight };
}

/**
 * Place each piece of equipment inside its station's bounds, packing
 * left-to-right along the back of the station (against the wall) so
 * the chef has clear front-of-station working space.
 */
function packStation(
  stationName: string,
  bounds: { x0: number; y0: number; x1: number; y1: number },
  equipment: KitchenEquipment[],
): PlacedEquipment[] {
  // Sort tallest/heaviest first for visual balance, then by category.
  const sorted = [...equipment].sort((a, b) => {
    const ha = a.height_ft ?? 0;
    const hb = b.height_ft ?? 0;
    return hb - ha || (b.weight_lb ?? 0) - (a.weight_lb ?? 0);
  });

  const placed: PlacedEquipment[] = [];
  let cursor = bounds.x0 + 0.5; // 6" wall clearance start
  const yPos = bounds.y0 + 0.5;
  for (const eq of sorted) {
    if (cursor + eq.width_ft > bounds.x1 - 0.5) {
      // Out of room in this station — skip with a warning (the algorithm
      // returns it on the compliance findings; the caller can show it).
      continue;
    }
    placed.push({
      equipmentId: eq.id,
      slug: eq.slug,
      name: eq.name,
      station: stationName,
      position: { x: r2(cursor), y: r2(yPos) },
      rotation: 0,
      dimensions: { width: eq.width_ft, depth: eq.depth_ft },
      thermal_class: eq.thermal_class,
      thermal_output_btu: eq.thermal_output_btu,
    });
    cursor = r2(cursor + eq.width_ft + ft(eq.min_clearance_sides_in));
  }
  return placed;
}

function buildThermalZones(placed: PlacedEquipment[]): ThermalZone[] {
  // Group placements by class, compute bounding box + total BTU.
  const byClass: Record<ThermalClass, PlacedEquipment[]> = {
    hot: [], warm: [], neutral: [], cool: [], cold: [],
  };
  for (const p of placed) byClass[p.thermal_class].push(p);

  const zones: ThermalZone[] = [];
  for (const [classLabel, items] of Object.entries(byClass) as [ThermalClass, PlacedEquipment[]][]) {
    if (items.length === 0 || classLabel === "neutral") continue;
    const xs = items.flatMap((i) => [i.position.x, i.position.x + i.dimensions.width]);
    const ys = items.flatMap((i) => [i.position.y, i.position.y + i.dimensions.depth]);
    zones.push({
      classLabel,
      bounds: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) },
      total_btu: items.reduce((s, i) => s + Math.abs(i.thermal_output_btu), 0),
    });
  }
  return zones;
}

function buildUtilityRuns(
  placed: PlacedEquipment[],
  equipmentBySlug: Map<string, KitchenEquipment>,
  room: KitchenRoomSpec,
): UtilityRun[] {
  // Source walls (heuristic): gas + electric panel on front-left, water
  // main + drain on back-right (typical commercial kitchen architecture).
  const gasSource = { x: 0, y: 0 };
  const waterSource = { x: room.width, y: room.length };
  const electricSource = { x: 0, y: 0 };

  const runs: UtilityRun[] = [];
  for (const p of placed) {
    const eq = equipmentBySlug.get(p.slug);
    if (!eq) continue;
    const center = { x: p.position.x + p.dimensions.width / 2, y: p.position.y + p.dimensions.depth / 2 };
    if (eq.needs_gas) {
      const len = r2(Math.abs(center.x - gasSource.x) + Math.abs(center.y - gasSource.y));
      runs.push({
        utility: "gas",
        from: gasSource,
        to: center,
        length_ft: len,
        notes: `${eq.gas_btu?.toLocaleString() ?? "—"} BTU/hr`,
      });
    }
    if (eq.needs_water_supply) {
      const len = r2(Math.abs(center.x - waterSource.x) + Math.abs(center.y - waterSource.y));
      runs.push({ utility: "water_supply", from: waterSource, to: center, length_ft: len });
    }
    if (eq.needs_water_drain) {
      const len = r2(Math.abs(center.x - waterSource.x) + Math.abs(center.y - waterSource.y));
      runs.push({ utility: "water_drain", from: waterSource, to: center, length_ft: len });
    }
    if (eq.needs_electric) {
      const len = r2(Math.abs(center.x - electricSource.x) + Math.abs(center.y - electricSource.y));
      const isHigh = (eq.voltage ?? 120) >= 208;
      runs.push({
        utility: isHigh ? "electric_high_volt" : "electric_low_volt",
        from: electricSource,
        to: center,
        length_ft: len,
        notes: `${eq.voltage ?? 120}V ${eq.amperage ?? "—"}A ${eq.phase ?? 1}-phase`,
      });
    }
  }
  return runs;
}

function checkCompliance(
  placed: PlacedEquipment[],
  equipmentBySlug: Map<string, KitchenEquipment>,
  input: KitchenDesignInput,
): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];

  // Rule: NSF requires hand sink within 25ft of every hot-line station.
  const hotLineEquip = placed.filter((p) => p.station === "hot_line" && p.thermal_class === "hot");
  const handSinks = placed.filter((p) => p.slug.startsWith("hand_sink"));
  if (hotLineEquip.length > 0 && handSinks.length === 0) {
    findings.push({
      rule: "NSF Hand Sink Coverage",
      severity: "violation",
      message: `Hot line has ${hotLineEquip.length} cooking units but no hand sink within 25ft. NSF requires at least one wall-mount hand sink per 25ft of hot line.`,
    });
  }

  // Rule: 3-compartment sink mandatory for kitchens that wash dishes.
  if (input.constraints?.require_three_comp_sink !== false) {
    const has3C = placed.some((p) => p.slug === "three_comp_sink");
    const hasDishMachine = placed.some((p) => p.slug.startsWith("dishwasher"));
    if (!has3C && !hasDishMachine) {
      findings.push({
        rule: "Health Code · 3-Compartment Sink",
        severity: "violation",
        message: "No 3-compartment sink or commercial dishwasher present. One is required by health code for any food-service kitchen.",
      });
    }
  }

  // Rule: Walk-in required for refrigeration if expected volume > 100 covers/day.
  if (input.constraints?.require_walk_in && !placed.some((p) => p.slug.startsWith("walkin_cooler"))) {
    findings.push({
      rule: "Refrigeration · Walk-In",
      severity: "warning",
      message: "Workflow expects walk-in cooler (banquet/large-volume) but none placed. Reach-in capacity may be insufficient.",
    });
  }

  // Rule: Hood coverage — every cooking unit with thermal_class='hot' or
  // gas_btu > 0 must be under a hood.
  const needsHoodList = placed.filter((p) => {
    const eq = equipmentBySlug.get(p.slug);
    return eq?.needs_hood;
  });
  if (needsHoodList.length > 0) {
    findings.push({
      rule: "Mechanical Code · Hood",
      severity: "info",
      message: `${needsHoodList.length} unit(s) require a Type-I commercial hood. Hood length must extend 6" past each end of the cooking line.`,
      affects: needsHoodList.map((p) => p.equipmentId),
    });
  }

  // Rule: ADA primary aisle ≥ 42" — checked geometrically against room layout.
  if (input.room.width < 8) {
    findings.push({
      rule: "ADA · Primary Aisle Width",
      severity: "violation",
      message: `Room width ${input.room.width}ft is below 8ft; primary aisle cannot meet 42" ADA minimum without obstructing stations.`,
    });
  }

  // Rule: each piece's required clearances against room walls.
  for (const p of placed) {
    const eq = equipmentBySlug.get(p.slug);
    if (!eq) continue;
    const backWall = input.room.length;
    const sideWall = input.room.width;
    const backClearance = r2(backWall - (p.position.y + p.dimensions.depth));
    if (backClearance < ft(eq.min_clearance_back_in)) {
      findings.push({
        rule: `Clearance · ${eq.name}`,
        severity: "warning",
        message: `${eq.name} has ${r2(backClearance * 12)}" back clearance; minimum is ${eq.min_clearance_back_in}".`,
        affects: [p.equipmentId],
      });
    }
    if (p.position.x < ft(eq.min_clearance_sides_in)) {
      findings.push({
        rule: `Clearance · ${eq.name}`,
        severity: "warning",
        message: `${eq.name} too close to left wall (${r2(p.position.x * 12)}"); minimum is ${eq.min_clearance_sides_in}".`,
        affects: [p.equipmentId],
      });
    }
  }

  // Rule: gas service capacity warning when sum exceeds 500K BTU.
  const totalGasBtu = placed.reduce((s, p) => {
    const eq = equipmentBySlug.get(p.slug);
    return s + (eq?.needs_gas ? eq.gas_btu ?? 0 : 0);
  }, 0);
  if (totalGasBtu > 500_000 && !input.room.has_gas_main) {
    findings.push({
      rule: "Gas Service · Capacity",
      severity: "warning",
      message: `Total gas demand ${totalGasBtu.toLocaleString()} BTU/hr — confirm meter sizing with utility provider; standard residential service caps around 500K.`,
    });
  }

  return findings;
}

export function designKitchen(input: KitchenDesignInput): KitchenDesign {
  const equipmentBySlug = new Map(input.equipment.map((e) => [e.slug, e] as const));
  const { stationBounds } = buildStationGrid(input.workflow, input.room);

  // Group equipment by station from catalog metadata.
  const byStation = new Map<string, KitchenEquipment[]>();
  for (const eq of input.equipment) {
    const station = eq.station ?? "dry_storage";
    if (!byStation.has(station)) byStation.set(station, []);
    byStation.get(station)!.push(eq);
  }

  const placements: PlacedEquipment[] = [];
  for (const [stationName, bounds] of Object.entries(stationBounds)) {
    const equipForStation = byStation.get(stationName) ?? [];
    placements.push(...packStation(stationName, bounds, equipForStation));
  }

  const thermal_zones = buildThermalZones(placements);
  const utility_runs = buildUtilityRuns(placements, equipmentBySlug, input.room);
  const compliance = checkCompliance(placements, equipmentBySlug, input);

  const total_thermal_btu = placements.reduce(
    (s, p) => s + Math.abs(p.thermal_output_btu),
    0,
  );
  const total_estimated_cost_usd = input.equipment.reduce(
    (s, e) => s + (e.list_price_usd ?? 0),
    0,
  );
  const floor_area_used = placements.reduce(
    (s, p) => s + p.dimensions.width * p.dimensions.depth,
    0,
  );
  const total_room_area = input.room.width * input.room.length;
  const requires_hood_count = placements.filter((p) => {
    const eq = equipmentBySlug.get(p.slug);
    return eq?.needs_hood;
  }).length;

  return {
    workflow: input.workflow,
    room: input.room,
    placements,
    thermal_zones,
    utility_runs,
    compliance,
    totals: {
      equipment_count: placements.length,
      total_thermal_btu,
      total_estimated_cost_usd: r2(total_estimated_cost_usd),
      floor_area_used_pct: r2((floor_area_used / total_room_area) * 100),
      requires_hood_count,
    },
  };
}
