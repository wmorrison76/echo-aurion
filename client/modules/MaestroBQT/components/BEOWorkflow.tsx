/**
 * Event Workflow BEO View + Changelog + Food Cost Analysis for MaestroBQT
 * Shows real BEOs from /api/event-workflow/beos
 * BQT Food Cost Target: 14-18%
 * Portion Standards: 6-8oz protein for single entree, 8oz total for duo
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  ChefHat,
  Users,
  MapPin,
  Calendar,
  FileText,
  History,
  X,
  Loader2,
  LayoutGrid,
  ChevronRight,
  Sparkles,
  Scale,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  Target,
} from "lucide-react";
import { cn } from "@/lib/glass";

interface BEO {
  id: string;
  event_id: string;
  event_name: string;
  client_name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  guaranteed_count: number;
  venue: string;
  room: string;
  setup_style: string;
  menu_items: any[];
  dietary_requirements: string[];
  beo_notes: string;
  total_food_cost: number;
  food_cost_target_min_pct?: number;
  food_cost_target_max_pct?: number;
  layout_id?: string;
  layout_name?: string;
  layout?: any;
  status: string;
  changelog?: any[];
  created_at: string;
}

interface ChangelogEntry {
  id: string;
  event_id: string;
  action: string;
  details: string;
  module: string;
  by: string;
  timestamp: string;
}

interface FoodCostAnalysis {
  food_cost_pct: number;
  food_cost_per_guest: number;
  total_food_cost: number;
  status: string;
  status_message: string;
  item_analysis: any[];
  recommendations: string[];
  target_range: { min: number; max: number };
}

const MODULE_COLORS: Record<string, string> = {
  "echo-events": "#3b82f6",
  "calendar": "#8b5cf6",
  "maestro-bqt": "#f59e0b",
  "schedule": "#06b6d4",
  "culinary": "#ef4444",
  "echolayout": "#10b981",
  "echo-ai": "#ec4899",
  "workflow": "#6366f1",
};

// ─── BEO List Component ────────────────────────────────────────────

export function BEOWorkflowList() {
  const [beos, setBeos] = useState<BEO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBeo, setSelectedBeo] = useState<BEO | null>(null);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [showChangelog, setShowChangelog] = useState(false);
  const [foodCostAnalysis, setFoodCostAnalysis] = useState<FoodCostAnalysis | null>(null);
  const [analyzingCost, setAnalyzingCost] = useState(false);

  const fetchBeos = useCallback(async () => {
    try {
      const res = await fetch("/api/event-workflow/beos");
      if (res.ok) {
        const data = await res.json();
        setBeos(data.beos || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchChangelog = useCallback(async (eventId: string) => {
    try {
      const res = await fetch(`/api/event-workflow/changelog/${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setChangelog(data.changelog || []);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchFoodCostAnalysis = useCallback(async (eventId: string) => {
    setAnalyzingCost(true);
    try {
      const res = await fetch("/api/event-workflow/food-cost-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, menu_price_per_guest: 95.0 }),
      });
      if (res.ok) {
        const data = await res.json();
        setFoodCostAnalysis(data);
      }
    } catch { /* ignore */ }
    setAnalyzingCost(false);
  }, []);

  const selectBeo = useCallback(async (beo: BEO) => {
    try {
      const res = await fetch(`/api/event-workflow/beo/${beo.event_id}`);
      if (res.ok) {
        const fullBeo = await res.json();
        setSelectedBeo(fullBeo);
        setChangelog(fullBeo.changelog || []);
        fetchFoodCostAnalysis(beo.event_id);
        return;
      }
    } catch { /* ignore */ }
    setSelectedBeo(beo);
    fetchChangelog(beo.event_id);
    fetchFoodCostAnalysis(beo.event_id);
  }, [fetchChangelog, fetchFoodCostAnalysis]);

  useEffect(() => { fetchBeos(); }, [fetchBeos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Detail view
  if (selectedBeo) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4" data-testid="beo-detail-view">
        <button onClick={() => { setSelectedBeo(null); setShowChangelog(false); setFoodCostAnalysis(null); }}
          className="text-sm text-primary hover:underline flex items-center gap-1">
          &larr; Back to BEO List
        </button>

        {/* BEO Header */}
        <div className="rounded-xl border border-border/30 bg-gradient-to-br from-sky-950/30 to-background p-5" data-testid="beo-header">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-sky-400/80 font-semibold">Banquet Event Order</p>
              <h2 className="text-xl font-bold text-foreground mt-1">{selectedBeo.event_name}</h2>
              <p className="text-sm text-foreground/60 mt-0.5">{selectedBeo.client_name} &middot; {selectedBeo.venue}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{selectedBeo.event_date}</p>
              <p className="text-xs text-foreground/50">{selectedBeo.start_time} - {selectedBeo.end_time}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="p-2.5 rounded-lg bg-background/30 border border-border/20">
              <p className="text-[10px] uppercase text-foreground/50">Guests</p>
              <p className="text-lg font-bold text-foreground">{selectedBeo.guest_count}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-background/30 border border-border/20">
              <p className="text-[10px] uppercase text-foreground/50">Room</p>
              <p className="text-sm font-semibold text-foreground">{selectedBeo.room}</p>
              <p className="text-[10px] text-foreground/40">{selectedBeo.setup_style}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-background/30 border border-border/20">
              <p className="text-[10px] uppercase text-foreground/50">Layout</p>
              <p className="text-sm font-semibold text-foreground">{selectedBeo.layout?.name || selectedBeo.layout_name || "Not attached"}</p>
              {selectedBeo.layout && (
                <p className="text-[10px] text-foreground/40">
                  {selectedBeo.layout.table_count} tables &middot; {selectedBeo.layout.total_seats} seats
                </p>
              )}
            </div>
            <div className="p-2.5 rounded-lg bg-background/30 border border-border/20">
              <p className="text-[10px] uppercase text-foreground/50">Food Cost</p>
              <p className="text-lg font-bold text-emerald-400">${selectedBeo.total_food_cost?.toFixed(2) || "0.00"}</p>
              <p className="text-[10px] text-foreground/40">Target: 14-18%</p>
            </div>
          </div>
        </div>

        {/* Food Cost Analysis Card */}
        {analyzingCost ? (
          <div className="rounded-xl border border-border/20 bg-background/40 p-4 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-foreground/60">Analyzing food cost...</span>
          </div>
        ) : foodCostAnalysis && (
          <FoodCostCard analysis={foodCostAnalysis} />
        )}

        {/* Menu with Portion Sizes */}
        <div className="rounded-xl border border-border/20 bg-background/40 overflow-hidden" data-testid="beo-menu-section">
          <div className="px-4 py-3 border-b border-border/10 flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Menu & Portions</h3>
            {selectedBeo.dietary_requirements?.length > 0 && (
              <div className="ml-auto flex gap-1">
                {selectedBeo.dietary_requirements.map((d: string) => (
                  <span key={d} className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 font-medium">{d}</span>
                ))}
              </div>
            )}
          </div>
          <div className="divide-y divide-border/10">
            {(selectedBeo.menu_items || []).map((item: any, i: number) => {
              const portionOz = item.portion_size_oz || 0;
              const isDuo = item.is_duo;
              const costItem = foodCostAnalysis?.item_analysis?.[i];
              return (
                <div key={i} className="px-4 py-3" data-testid={`menu-item-${i}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] uppercase tracking-wider text-primary/80 font-semibold">{item.course}</p>
                        {isDuo && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 font-medium">DUO</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">{item.dish_name}</p>
                      {item.description && <p className="text-xs text-foreground/50 mt-0.5">{item.description}</p>}
                      {isDuo && item.duo_proteins?.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          {item.duo_proteins.map((p: string, j: number) => (
                            <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-medium">
                              {p}{item.duo_split_oz?.[j] ? ` (${item.duo_split_oz[j]}oz)` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right space-y-0.5">
                      {portionOz > 0 && (
                        <div className="flex items-center gap-1 justify-end">
                          <Scale className="w-3 h-3 text-foreground/40" />
                          <span className={cn(
                            "text-xs font-semibold",
                            costItem?.portion_status === "ok" ? "text-emerald-400" :
                            costItem?.portion_status === "under" ? "text-amber-400" :
                            costItem?.portion_status === "over" ? "text-red-400" :
                            "text-foreground/70"
                          )}>
                            {portionOz}oz
                          </span>
                        </div>
                      )}
                      {item.recipe_name && (
                        <p className="text-xs text-foreground/60 flex items-center gap-1 justify-end">
                          <Sparkles className="w-3 h-3 text-primary" />
                          {item.recipe_name}
                        </p>
                      )}
                      {item.ingredients_count > 0 && (
                        <p className="text-[10px] text-foreground/40">{item.ingredients_count} ingredients</p>
                      )}
                      {costItem && costItem.cost_per_portion > 0 && (
                        <p className="text-[10px] text-foreground/50">${costItem.cost_per_portion.toFixed(2)}/pp</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BEO Notes */}
        {selectedBeo.beo_notes && (
          <div className="rounded-xl border border-border/20 bg-background/40 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Notes</h3>
            <p className="text-xs text-foreground/60">{selectedBeo.beo_notes}</p>
          </div>
        )}

        {/* Changelog Toggle */}
        <button onClick={() => setShowChangelog(!showChangelog)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border/20 bg-background/40 hover:bg-background/60 transition-colors"
          data-testid="toggle-changelog-btn">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Event Changelog</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">{changelog.length}</span>
          </div>
          <ChevronRight className={cn("w-4 h-4 text-foreground/40 transition-transform", showChangelog && "rotate-90")} />
        </button>

        {showChangelog && <ChangelogTimeline entries={changelog} />}
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-4xl mx-auto px-4 py-6" data-testid="beo-list-view">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">BEO Operations</h2>
          <p className="text-xs text-foreground/50">{beos.length} Banquet Event Orders</p>
        </div>
      </div>

      {beos.length === 0 ? (
        <div className="text-center py-12 text-foreground/40">
          <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No BEOs created yet</p>
          <p className="text-xs mt-1">Create events through the Event Workflow to generate BEOs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {beos.map((beo) => (
            <div key={beo.id} onClick={() => selectBeo(beo)}
              className="rounded-xl border border-border/20 bg-background/40 p-4 cursor-pointer hover:bg-background/60 transition-colors"
              data-testid={`beo-card-${beo.id.slice(0, 8)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{beo.event_name}</h3>
                  <p className="text-xs text-foreground/50">{beo.client_name} &middot; {beo.event_date} &middot; {beo.room}</p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-sm font-medium text-foreground">{beo.guest_count} guests</p>
                    <p className="text-[10px] text-foreground/40">{beo.menu_items?.length || 0} courses</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-foreground/30" />
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                {beo.layout_name && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-medium flex items-center gap-1">
                    <LayoutGrid className="w-2.5 h-2.5" /> {beo.layout_name}
                  </span>
                )}
                {beo.menu_items?.map((m: any) => (
                  <span key={m.course} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                    {m.course}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Food Cost Analysis Card ───────────────────────────────────────

function FoodCostCard({ analysis }: { analysis: FoodCostAnalysis }) {
  const pct = analysis.food_cost_pct;
  const isOnTarget = analysis.status === "on_target";
  const isAbove = analysis.status === "above_target";
  const isBelow = analysis.status === "below_target";

  // Calculate bar position (0-100 scale, target range mapped to center)
  const barMin = 0;
  const barMax = 30;
  const barPct = Math.min(100, Math.max(0, (pct / barMax) * 100));
  const targetLeftPct = (analysis.target_range.min / barMax) * 100;
  const targetRightPct = (analysis.target_range.max / barMax) * 100;

  return (
    <div className="rounded-xl border border-border/20 bg-background/40 overflow-hidden" data-testid="food-cost-analysis">
      <div className="px-4 py-3 border-b border-border/10 flex items-center gap-2">
        <Target className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">BQT Food Cost Analysis</h3>
        <span className={cn(
          "ml-auto text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase",
          isOnTarget && "bg-emerald-500/15 text-emerald-400",
          isAbove && "bg-red-500/15 text-red-400",
          isBelow && "bg-amber-500/15 text-amber-400",
        )}>
          {isOnTarget ? "On Target" : isAbove ? "Above Target" : "Below Target"}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Main Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-background/50 border border-border/10 text-center">
            <p className="text-[10px] uppercase text-foreground/50 mb-1">Food Cost %</p>
            <p className={cn(
              "text-2xl font-bold",
              isOnTarget ? "text-emerald-400" : isAbove ? "text-red-400" : "text-amber-400"
            )}>
              {pct}%
            </p>
            <p className="text-[10px] text-foreground/40">Target: 14-18%</p>
          </div>
          <div className="p-3 rounded-lg bg-background/50 border border-border/10 text-center">
            <p className="text-[10px] uppercase text-foreground/50 mb-1">Cost / Guest</p>
            <p className="text-2xl font-bold text-foreground">${analysis.food_cost_per_guest.toFixed(2)}</p>
            <p className="text-[10px] text-foreground/40">per person</p>
          </div>
          <div className="p-3 rounded-lg bg-background/50 border border-border/10 text-center">
            <p className="text-[10px] uppercase text-foreground/50 mb-1">Total Food Cost</p>
            <p className="text-2xl font-bold text-foreground">${analysis.total_food_cost.toLocaleString()}</p>
            <p className="text-[10px] text-foreground/40">{analysis.guests} guests</p>
          </div>
        </div>

        {/* Visual Bar */}
        <div className="relative pt-2 pb-4">
          <div className="h-3 rounded-full bg-background/70 border border-border/20 relative overflow-visible">
            {/* Target zone */}
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/20 border-l border-r border-emerald-500/40"
              style={{ left: `${targetLeftPct}%`, right: `${100 - targetRightPct}%` }}
            />
            {/* Current indicator */}
            <div
              className={cn(
                "absolute top-[-3px] w-4 h-[18px] rounded-sm border-2 shadow-md transition-all",
                isOnTarget ? "border-emerald-400 bg-emerald-500" :
                isAbove ? "border-red-400 bg-red-500" :
                "border-amber-400 bg-amber-500"
              )}
              style={{ left: `calc(${barPct}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[9px] text-foreground/30">0%</span>
            <span className="text-[9px] text-emerald-500/70 font-medium">14%</span>
            <span className="text-[9px] text-emerald-500/70 font-medium">18%</span>
            <span className="text-[9px] text-foreground/30">30%</span>
          </div>
        </div>

        {/* Status Message */}
        <div className={cn(
          "flex items-start gap-2 p-3 rounded-lg border text-xs",
          isOnTarget && "bg-emerald-500/5 border-emerald-500/20 text-emerald-300",
          isAbove && "bg-red-500/5 border-red-500/20 text-red-300",
          isBelow && "bg-amber-500/5 border-amber-500/20 text-amber-300",
        )}>
          {isOnTarget ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> :
           isAbove ? <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" /> :
           <TrendingDown className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          <span>{analysis.status_message}</span>
        </div>

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-foreground/50 font-semibold">Recommendations</p>
            {analysis.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-foreground/60">
                <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        )}

        {/* Per-Item Portion Analysis */}
        {analysis.item_analysis.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-foreground/50 font-semibold">Portion Analysis</p>
            <div className="grid gap-1.5">
              {analysis.item_analysis.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-background/30 border border-border/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[9px] uppercase text-primary/70 font-semibold w-16 flex-shrink-0">{item.course}</span>
                    <span className="text-foreground/80 truncate">{item.dish_name}</span>
                    {item.is_duo && <span className="text-[8px] px-1 py-0 rounded bg-violet-500/15 text-violet-400 flex-shrink-0">DUO</span>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {item.portion_size_oz > 0 && (
                      <span className={cn(
                        "text-[10px] font-medium",
                        item.portion_status === "ok" ? "text-emerald-400" :
                        item.portion_status === "under" ? "text-amber-400" : "text-red-400"
                      )}>
                        {item.portion_size_oz}oz
                      </span>
                    )}
                    {item.cost_per_portion > 0 && (
                      <span className="text-foreground/50">${item.cost_per_portion.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Changelog Timeline Component ──────────────────────────────────

export function ChangelogTimeline({ entries }: { entries: ChangelogEntry[] }) {
  return (
    <div className="space-y-0 pl-4" data-testid="changelog-timeline">
      {entries.map((entry, i) => {
        const color = MODULE_COLORS[entry.module] || "#6b7280";
        return (
          <div key={entry.id || i} className="flex gap-3 relative">
            {/* Vertical line */}
            {i < entries.length - 1 && (
              <div className="absolute left-[7px] top-[20px] bottom-0 w-px bg-border/30" />
            )}
            {/* Dot */}
            <div className="relative z-10 mt-1.5 w-[15px] h-[15px] flex-shrink-0">
              <div className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: color, backgroundColor: `${color}30` }} />
            </div>
            {/* Content */}
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider"
                  style={{ backgroundColor: `${color}15`, color }}>{entry.module}</span>
                <span className="text-[10px] text-foreground/40">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-xs font-medium text-foreground mt-0.5">{entry.action.replace(/_/g, " ")}</p>
              <p className="text-[11px] text-foreground/50">{entry.details}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Changelog Toolbar Button ──────────────────────────────────────

export function ChangelogToolbarButton({ eventId }: { eventId?: string }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/event-workflow/changelog/${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.changelog || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    if (open && eventId) fetchAll();
  }, [open, eventId, fetchAll]);

  if (!eventId) return null;

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/20 hover:bg-background/60 transition-colors"
        data-testid="changelog-toolbar-btn">
        <History className="w-3.5 h-3.5 text-primary" />
        Changelog
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" data-testid="changelog-modal">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-[520px] max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/20">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Event Changelog</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">{entries.length}</span>
              </div>
              <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : entries.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">No changelog entries</p>
              ) : (
                <ChangelogTimeline entries={entries} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
