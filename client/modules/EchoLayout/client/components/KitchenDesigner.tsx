/**
 * KitchenDesigner (D5) — full kitchen-design tab inside EchoLayout.
 *
 * UX:
 *   1. Pick workflow (line_kitchen, banquet_prep, pastry_bakery,
 *      bar_only, ghost_kitchen)
 *   2. Set room dimensions
 *   3. Browse equipment library, add items to the selection
 *   4. Click "Generate Layout" → POST /api/echolayout/kitchen/design
 *   5. See SVG canvas with placements + thermal heat-map overlay +
 *      utility runs (gas/water/electric) + compliance findings
 *   6. Click "Save" to persist (POST /api/echolayout/kitchen/designs)
 *
 * The SVG canvas is intentionally lightweight — single file, no canvas
 * library. It scales to fit the available width and renders:
 *   - Room outline
 *   - Thermal-zone gradient (hot=red, warm=amber, cold=blue overlay)
 *   - Equipment rectangles labeled with name + station color
 *   - Utility-run lines (gas=orange, water_supply=blue, water_drain=
 *     dark blue, electric_high=red, electric_low=gold)
 *   - ADA aisle (dashed line down center)
 */

import * as React from "react";
const { useState, useEffect, useCallback, useMemo } = React;
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ChefHat,
  Flame,
  Snowflake,
  Wrench,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Minus,
} from "lucide-react";

const WORKFLOWS = [
  { value: "line_kitchen",  label: "Line Kitchen (à la carte)" },
  { value: "banquet_prep",  label: "Banquet / High-Volume Prep" },
  { value: "pastry_bakery", label: "Pastry & Bakery" },
  { value: "bar_only",      label: "Bar / Beverage" },
  { value: "ghost_kitchen", label: "Ghost / Delivery-First" },
] as const;

type Workflow = (typeof WORKFLOWS)[number]["value"];

interface CatalogItem {
  id: string;
  slug: string;
  name: string;
  category: string;
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
  thermal_class: "hot" | "warm" | "neutral" | "cool" | "cold";
  min_clearance_back_in: number;
  min_clearance_sides_in: number;
  min_clearance_front_in: number;
  list_price_usd?: number;
  notes?: string;
}

interface DesignResult {
  workflow: Workflow;
  room: { width: number; length: number; units: "ft" | "m" };
  placements: Array<{
    equipmentId: string;
    slug: string;
    name: string;
    station: string;
    position: { x: number; y: number };
    rotation: 0 | 90 | 180 | 270;
    dimensions: { width: number; depth: number };
    thermal_class: string;
    thermal_output_btu: number;
  }>;
  thermal_zones: Array<{
    classLabel: string;
    bounds: { x0: number; y0: number; x1: number; y1: number };
    total_btu: number;
  }>;
  utility_runs: Array<{
    utility: string;
    from: { x: number; y: number };
    to: { x: number; y: number };
    length_ft: number;
    notes?: string;
  }>;
  compliance: Array<{
    rule: string;
    severity: "info" | "warning" | "violation";
    message: string;
    affects?: string[];
  }>;
  totals: {
    equipment_count: number;
    total_thermal_btu: number;
    total_estimated_cost_usd: number;
    floor_area_used_pct: number;
    requires_hood_count: number;
  };
}

const STATION_COLORS: Record<string, string> = {
  hot_line: "#dc2626",
  cold_prep: "#0891b2",
  pastry: "#a855f7",
  walk_in: "#0e7490",
  dish_pit: "#475569",
  expo: "#f59e0b",
  bar: "#b45309",
  dry_storage: "#64748b",
};

const THERMAL_FILL: Record<string, string> = {
  hot: "rgba(220,38,38,0.15)",
  warm: "rgba(245,158,11,0.12)",
  neutral: "rgba(0,0,0,0)",
  cool: "rgba(8,145,178,0.10)",
  cold: "rgba(14,116,144,0.18)",
};

const UTILITY_COLORS: Record<string, string> = {
  gas: "#ea580c",
  water_supply: "#3b82f6",
  water_drain: "#1e40af",
  electric_high_volt: "#dc2626",
  electric_low_volt: "#eab308",
};

interface KitchenDesignerProps {
  onBack: () => void;
  initialRoomWidth?: number;
  initialRoomLength?: number;
}

export default function KitchenDesigner({
  onBack,
  initialRoomWidth = 30,
  initialRoomLength = 25,
}: KitchenDesignerProps) {
  const [workflow, setWorkflow] = useState<Workflow>("line_kitchen");
  const [roomWidth, setRoomWidth] = useState(initialRoomWidth);
  const [roomLength, setRoomLength] = useState(initialRoomLength);
  const [hasGasMain, setHasGasMain] = useState(true);
  const [hasGreaseTrap, setHasGreaseTrap] = useState(true);

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [selected, setSelected] = useState<CatalogItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("cooking");

  const [design, setDesign] = useState<DesignResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load equipment catalog on mount.
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/echolayout/kitchen/equipment-library");
        if (!res.ok) throw new Error("Failed to load catalog");
        const json = await res.json();
        setCatalog(json.items ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Catalog load failed");
      } finally {
        setCatalogLoading(false);
      }
    };
    void load();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(catalog.map((c) => c.category));
    return Array.from(set).sort();
  }, [catalog]);

  const visibleCatalog = useMemo(
    () => catalog.filter((c) => c.category === activeCategory),
    [catalog, activeCategory],
  );

  const addEquipment = useCallback(
    (item: CatalogItem) => setSelected((prev) => [...prev, item]),
    [],
  );
  const removeEquipment = useCallback((idx: number) => {
    setSelected((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setGenerating(true);
    setDesign(null);
    setSavedId(null);
    try {
      const res = await fetch("/api/echolayout/kitchen/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workflow,
          room: {
            width: roomWidth,
            length: roomLength,
            units: "ft",
            has_gas_main: hasGasMain,
            has_grease_trap: hasGreaseTrap,
          },
          equipment: selected,
          constraints: {
            require_walk_in: workflow === "banquet_prep",
            require_three_comp_sink: true,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Design failed (${res.status})`);
      setDesign(json.design);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Design failed");
    } finally {
      setGenerating(false);
    }
  }, [workflow, roomWidth, roomLength, hasGasMain, hasGreaseTrap, selected]);

  const handleSave = useCallback(async () => {
    if (!design) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/echolayout/kitchen/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: `Kitchen — ${WORKFLOWS.find((w) => w.value === workflow)?.label}`,
          outletId: "demo-outlet", // TODO wire from current outlet context
          workflow,
          room: design.room,
          placements: design.placements,
          thermal_zones: design.thermal_zones,
          utility_runs: design.utility_runs,
          compliance: design.compliance,
          totals: design.totals,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setSavedId(json.designId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [design, workflow]);

  // SVG sizing — fit width 800px, scale based on room width.
  const SVG_WIDTH = 800;
  const PADDING = 30;
  const scale = (SVG_WIDTH - PADDING * 2) / roomWidth;
  const SVG_HEIGHT = roomLength * scale + PADDING * 2;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/40 bg-background/70">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="h-5 w-px bg-border/60" />
          <div>
            <div className="font-semibold leading-tight">EchoLayout · Kitchen Designer</div>
            <div className="text-xs text-muted-foreground">
              Equipment library · thermal heat map · plumbing/gas runs · NSF/ADA compliance HUD
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="gap-1">
          <ChefHat className="h-3 w-3" /> Kitchen Mode
        </Badge>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* Left rail — controls + equipment library */}
        <div className="col-span-4 overflow-y-auto space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Workflow & Room</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <Label htmlFor="workflow">Workflow type</Label>
                <select
                  id="workflow"
                  value={workflow}
                  onChange={(e) => setWorkflow(e.target.value as Workflow)}
                  className="w-full mt-1 px-2 py-1.5 border rounded-md text-sm bg-background"
                >
                  {WORKFLOWS.map((w) => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="rw">Width (ft)</Label>
                  <Input id="rw" type="number" value={roomWidth} onChange={(e) => setRoomWidth(Number(e.target.value) || 0)} />
                </div>
                <div>
                  <Label htmlFor="rl">Length (ft)</Label>
                  <Input id="rl" type="number" value={roomLength} onChange={(e) => setRoomLength(Number(e.target.value) || 0)} />
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={hasGasMain} onChange={(e) => setHasGasMain(e.target.checked)} />
                  Gas main
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={hasGreaseTrap} onChange={(e) => setHasGreaseTrap(e.target.checked)} />
                  Grease trap
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Equipment Library</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setActiveCategory(c)}
                    className={`text-[10px] px-2 py-1 rounded uppercase tracking-wider ${
                      activeCategory === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {catalogLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
              <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                {visibleCatalog.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-2 border rounded-md hover:bg-muted/40"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {item.width_ft}×{item.depth_ft}ft
                        {item.needs_gas && <span className="text-orange-600"> · gas</span>}
                        {item.needs_electric && <span className="text-yellow-600"> · {item.voltage}V</span>}
                        {item.needs_hood && <span className="text-red-600"> · hood</span>}
                        {item.list_price_usd && <span className="text-emerald-700"> · ${item.list_price_usd.toLocaleString()}</span>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => addEquipment(item)} className="shrink-0">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                Selected ({selected.length})
                <Button size="sm" disabled={selected.length === 0 || generating} onClick={handleGenerate}>
                  {generating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Wrench className="h-3.5 w-3.5 mr-1" />}
                  Generate Layout
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-[20vh] overflow-y-auto">
              {selected.length === 0 ? (
                <p className="text-xs text-muted-foreground">Add equipment from the library above.</p>
              ) : (
                selected.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="flex items-center justify-between text-xs">
                    <span className="truncate">{item.name}</span>
                    <Button size="sm" variant="ghost" onClick={() => removeEquipment(idx)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right pane — SVG canvas + compliance HUD */}
        <div className="col-span-8 overflow-y-auto space-y-3">
          {error && (
            <Card className="border-red-300 bg-red-50">
              <CardContent className="text-sm text-red-700 py-3">{error}</CardContent>
            </Card>
          )}

          {!design && !generating && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                <ChefHat className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Pick a workflow, set the room, add equipment, click Generate Layout.
              </CardContent>
            </Card>
          )}

          {design && (
            <>
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Layout Preview</CardTitle>
                  <div className="flex items-center gap-2">
                    {savedId && <Badge variant="secondary">Saved</Badge>}
                    <Button size="sm" disabled={saving || !!savedId} onClick={handleSave}>
                      {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                      {savedId ? "Saved" : "Save Design"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} width="100%" height={SVG_HEIGHT} className="border rounded-md bg-white">
                    {/* Room outline */}
                    <rect
                      x={PADDING} y={PADDING}
                      width={roomWidth * scale} height={roomLength * scale}
                      fill="#fafafa" stroke="#94a3b8" strokeWidth={1.5}
                    />
                    {/* Thermal zones */}
                    {design.thermal_zones.map((z, i) => (
                      <rect
                        key={i}
                        x={PADDING + z.bounds.x0 * scale}
                        y={PADDING + z.bounds.y0 * scale}
                        width={(z.bounds.x1 - z.bounds.x0) * scale}
                        height={(z.bounds.y1 - z.bounds.y0) * scale}
                        fill={THERMAL_FILL[z.classLabel] ?? "transparent"}
                      />
                    ))}
                    {/* Utility runs */}
                    {design.utility_runs.map((u, i) => (
                      <line
                        key={i}
                        x1={PADDING + u.from.x * scale}
                        y1={PADDING + u.from.y * scale}
                        x2={PADDING + u.to.x * scale}
                        y2={PADDING + u.to.y * scale}
                        stroke={UTILITY_COLORS[u.utility] ?? "#888"}
                        strokeWidth={1}
                        strokeDasharray={u.utility.startsWith("electric") ? "4,2" : "0"}
                        opacity={0.55}
                      />
                    ))}
                    {/* Equipment */}
                    {design.placements.map((p, i) => (
                      <g key={i}>
                        <rect
                          x={PADDING + p.position.x * scale}
                          y={PADDING + p.position.y * scale}
                          width={p.dimensions.width * scale}
                          height={p.dimensions.depth * scale}
                          fill={STATION_COLORS[p.station] ?? "#475569"}
                          fillOpacity={0.85}
                          stroke="#1f2937"
                          strokeWidth={0.5}
                          rx={2}
                        />
                        {p.dimensions.width * scale > 60 && (
                          <text
                            x={PADDING + (p.position.x + p.dimensions.width / 2) * scale}
                            y={PADDING + (p.position.y + p.dimensions.depth / 2) * scale + 3}
                            textAnchor="middle"
                            fontSize={10}
                            fill="white"
                            fontWeight={600}
                          >
                            {p.name.length > 14 ? p.name.slice(0, 12) + "…" : p.name}
                          </text>
                        )}
                      </g>
                    ))}
                  </svg>

                  {/* Legend */}
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    {Object.entries(STATION_COLORS).map(([s, c]) => (
                      <div key={s} className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-sm" style={{ background: c }} />
                        <span className="uppercase tracking-wider">{s.replace(/_/g, " ")}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Flame className="h-4 w-4 text-red-600" /> Totals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs">
                    <div className="flex justify-between"><span>Equipment</span><span>{design.totals.equipment_count}</span></div>
                    <div className="flex justify-between"><span>Total thermal output</span><span>{design.totals.total_thermal_btu.toLocaleString()} BTU/hr</span></div>
                    <div className="flex justify-between"><span>Estimated cost</span><span>${design.totals.total_estimated_cost_usd.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Floor used</span><span>{design.totals.floor_area_used_pct}%</span></div>
                    <div className="flex justify-between"><span>Hood-required units</span><span>{design.totals.requires_hood_count}</span></div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Snowflake className="h-4 w-4 text-cyan-600" /> Compliance ({design.compliance.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 text-xs max-h-48 overflow-y-auto">
                    {design.compliance.length === 0 ? (
                      <div className="flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> All checks pass
                      </div>
                    ) : (
                      design.compliance.map((f, i) => (
                        <div key={i} className={`flex items-start gap-1.5 p-1.5 rounded ${
                          f.severity === "violation" ? "bg-red-50 text-red-700" :
                          f.severity === "warning"   ? "bg-amber-50 text-amber-700" :
                                                       "bg-blue-50 text-blue-700"
                        }`}>
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          <div>
                            <div className="font-medium">{f.rule}</div>
                            <div className="text-[10px] opacity-90">{f.message}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
