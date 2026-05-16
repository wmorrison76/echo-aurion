/** iter224 · ECW Menu Builder — Excel-style editor.
 *
 * Scope (William's c+c on every line):
 *  - Station → menu-item → dish-component hierarchy with per-row editing
 *  - Cost/margin rollup live as you edit
 *  - "Push to mobile" button that publishes a version-locked snapshot
 *
 * Usage pattern: this is a single unified grid (not nested drawers) — chef
 * can see ALL stations/items at once, filter, inline-edit, and publish.
 */
import React from "react";
import { API } from "@/lib/api-url";

type Station = { id: string; name: string; sort: number; outlet_id: string };
type Item = {
  id: string; outlet_id: string; station_id: string; name: string;
  is_perishable: boolean; par_default: number; cost: number;
  sell_price: number; margin: number; temp_min_c?: number; temp_max_c?: number;
  sort: number; photo_url?: string; component_count?: number;
};
type Component = {
  id: string; item_id: string; ingredient: string; quantity_g: number;
  cost: number; is_perishable: boolean; temp_min_c?: number; temp_max_c?: number;
};

export default function MenuBuilderPanel() {
  const [outletId, setOutletId] = React.useState("outlet-main");
  const [stations, setStations] = React.useState<Station[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [components, setComponents] = React.useState<Record<string, Component[]>>({});
  const [filter, setFilter] = React.useState("");
  const [stationFilter, setStationFilter] = React.useState<string>("");
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [publishing, setPublishing] = React.useState(false);
  const [publishMsg, setPublishMsg] = React.useState<string | null>(null);
  const [outlets, setOutlets] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any>(null);

  React.useEffect(() => {
    fetch(`${API()}/api/ecw-ops/outlets/mine`, { headers: { "X-User-Id": "chef-william" } })
      .then((r) => r.json()).then((d) => setOutlets(d?.outlets || []));
  }, []);

  const load = React.useCallback(async () => {
    const [s, i, sum] = await Promise.all([
      fetch(`${API()}/api/ecw-ops/stations?outlet_id=${outletId}`).then((r) => r.json()),
      fetch(`${API()}/api/ecw-ops/items?outlet_id=${outletId}`).then((r) => r.json()),
      fetch(`${API()}/api/ecw-ops/summary?outlet_id=${outletId}`).then((r) => r.json()),
    ]);
    setStations(s?.rows || []); setItems(i?.rows || []); setSummary(sum);
  }, [outletId]);

  React.useEffect(() => { void load(); }, [load]);

  async function loadComponents(itemId: string) {
    if (components[itemId]) return;
    const r = await fetch(`${API()}/api/ecw-ops/components?item_id=${itemId}`).then((r) => r.json());
    setComponents((prev) => ({ ...prev, [itemId]: r?.rows || [] }));
  }

  async function patchItem(itemId: string, patch: any) {
    const r = await fetch(`${API()}/api/ecw-ops/items/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => r.json());
    if (r.ok) {
      setItems((prev) => prev.map((it) => (it.id === itemId ? r.item : it)));
    }
  }

  async function publish() {
    if (!confirm(`Publish v${(summary?.menu_version ?? 0) + 1} to mobile? All chefs on ${outletId} will see the new snapshot.`)) return;
    setPublishing(true);
    try {
      const r = await fetch(`${API()}/api/ecw-ops/publish?outlet_id=${outletId}`, {
        method: "POST",
      }).then((r) => r.json());
      setPublishMsg(r.ok
        ? `✓ Published v${r.publication.version} · ${r.publication.stations} stations · ${r.publication.items} items`
        : `✗ ${r.detail || "Failed"}`);
      await load();
      setTimeout(() => setPublishMsg(null), 6000);
    } finally { setPublishing(false); }
  }

  // Cost rollup live
  const totalCost = items.reduce((a, i) => a + (i.cost || 0) * (i.par_default || 0), 0);
  const totalRevenue = items.reduce((a, i) => a + (i.sell_price || 0) * (i.par_default || 0), 0);
  const blendedMargin = totalRevenue === 0 ? 0 : (totalRevenue - totalCost) / totalRevenue;

  // Row filtering
  const filteredItems = items.filter((it) => {
    if (stationFilter && it.station_id !== stationFilter) return false;
    if (filter && !it.name.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  // Group by station for display
  const byStation: Record<string, Item[]> = {};
  for (const it of filteredItems) {
    byStation[it.station_id] = byStation[it.station_id] || [];
    byStation[it.station_id].push(it);
  }

  return (
    <div data-testid="menu-builder-root" className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-500 font-bold">ECW · Menu Builder</div>
          <div className="text-sm text-foreground/60">Station → item → component · live cost/margin · push to mobile</div>
        </div>
        <div className="flex items-center gap-2">
          {outlets.length > 1 && (
            <select data-testid="menu-outlet-picker" value={outletId} onChange={(e) => setOutletId(e.target.value)}
              className="text-xs px-2 py-1 rounded border border-border/50 bg-background">
              {outlets.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
          <button data-testid="menu-refresh" onClick={() => void load()}
            className="text-xs px-3 py-1 rounded border border-border/50 hover:bg-muted/50">
            ↻ Refresh
          </button>
          <button data-testid="menu-publish" onClick={() => void publish()}
            disabled={publishing || items.length === 0}
            className="text-xs px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 disabled:opacity-40">
            {publishing ? "Publishing…" : "📤 Push to mobile"}
          </button>
        </div>
      </div>
      {publishMsg && <div data-testid="menu-publish-msg" className={`text-xs ${publishMsg.startsWith("✓") ? "text-emerald-400" : "text-rose-400"}`}>{publishMsg}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="menu-kpis">
        <Kpi label="Stations" value={stations.length} testId="menu-kpi-stations" />
        <Kpi label="Items" value={items.length} testId="menu-kpi-items" />
        <Kpi label="Par cost" value={`$${totalCost.toFixed(0)}`} testId="menu-kpi-cost" />
        <Kpi label="Par revenue" value={`$${totalRevenue.toFixed(0)}`} testId="menu-kpi-revenue" />
        <Kpi label="Blended margin" value={`${Math.round(blendedMargin * 100)}%`} testId="menu-kpi-margin"
          tone={blendedMargin >= 0.6 ? "emerald" : blendedMargin >= 0.4 ? "amber" : "rose"} />
      </div>

      {/* Filter row */}
      <div className="flex gap-2 flex-wrap">
        <input data-testid="menu-filter" placeholder="Filter items…"
          value={filter} onChange={(e) => setFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded border border-border/50 bg-background min-w-[200px]" />
        <select data-testid="menu-station-filter" value={stationFilter} onChange={(e) => setStationFilter(e.target.value)}
          className="text-xs px-2 py-1.5 rounded border border-border/50 bg-background">
          <option value="">All stations</option>
          {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Excel-style grid */}
      <div className="border border-border/40 rounded-md overflow-hidden" data-testid="menu-grid">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-foreground/60 w-64">Item</th>
              <th className="text-right px-3 py-2 font-medium text-foreground/60">Par</th>
              <th className="text-right px-3 py-2 font-medium text-foreground/60">Cost</th>
              <th className="text-right px-3 py-2 font-medium text-foreground/60">Sell</th>
              <th className="text-right px-3 py-2 font-medium text-foreground/60">Margin</th>
              <th className="text-right px-3 py-2 font-medium text-foreground/60">Temp °C</th>
              <th className="text-center px-3 py-2 font-medium text-foreground/60">Perish?</th>
              <th className="text-right px-3 py-2 font-medium text-foreground/60">Comps</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((s) => {
              const sitems = byStation[s.id] || [];
              if (sitems.length === 0) return null;
              return (
                <React.Fragment key={s.id}>
                  <tr className="bg-amber-500/5 border-t-2 border-amber-500/30">
                    <td colSpan={8} className="px-3 py-1.5 text-[11px] uppercase tracking-widest text-amber-400 font-bold">
                      {s.name} · {sitems.length} items
                    </td>
                  </tr>
                  {sitems.map((it) => (
                    <React.Fragment key={it.id}>
                      <tr className="border-t border-border/30 hover:bg-muted/10" data-testid={`menu-item-row-${it.id}`}>
                        <td className="px-3 py-1.5">
                          <button onClick={() => {
                            const newExp = !expanded[it.id];
                            setExpanded((p) => ({ ...p, [it.id]: newExp }));
                            if (newExp) void loadComponents(it.id);
                          }}
                            data-testid={`menu-expand-${it.id}`}
                            className="text-left text-foreground/80 hover:text-foreground">
                            {expanded[it.id] ? "▼" : "▶"} {it.name}
                          </button>
                        </td>
                        <InlineNumCell item={it} field="par_default" onPatch={patchItem} />
                        <InlineNumCell item={it} field="cost" onPatch={patchItem} prefix="$" />
                        <InlineNumCell item={it} field="sell_price" onPatch={patchItem} prefix="$" />
                        <td className={`px-3 py-1.5 text-right font-mono ${it.margin >= 0.6 ? "text-emerald-400" : it.margin >= 0.4 ? "text-amber-400" : "text-rose-400"}`}>
                          {Math.round((it.margin || 0) * 100)}%
                        </td>
                        <td className="px-3 py-1.5 text-right text-foreground/60 font-mono">
                          {it.temp_min_c != null ? `${it.temp_min_c}–${it.temp_max_c}` : "—"}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <input type="checkbox" checked={!!it.is_perishable}
                            data-testid={`menu-perish-${it.id}`}
                            onChange={(e) => void patchItem(it.id, { is_perishable: e.target.checked })} />
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-foreground/60">
                          {components[it.id]?.length ?? it.component_count ?? 0}
                        </td>
                      </tr>
                      {expanded[it.id] && (
                        <tr className="bg-background/30">
                          <td colSpan={8} className="px-6 py-2">
                            <ComponentsEditor itemId={it.id}
                              rows={components[it.id] || []}
                              onReload={() => loadComponents(it.id)}
                              onAdded={(rows) => setComponents((p) => ({ ...p, [it.id]: rows }))} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {filteredItems.length === 0 && (
          <div className="p-4 text-xs text-foreground/50 text-center">No items match.</div>
        )}
      </div>

      <div className="text-[11px] text-foreground/50">
        Inline edits save on blur. Publish snapshots a version-locked menu for all mobile chefs on this outlet.
        Last published: <b>v{summary?.menu_version ?? 0}</b>{summary?.menu_published_at && ` at ${summary.menu_published_at.slice(11, 19)} UTC`}.
      </div>
    </div>
  );
}

function InlineNumCell({ item, field, onPatch, prefix }: {
  item: any; field: string; onPatch: (id: string, patch: any) => void; prefix?: string;
}) {
  const [val, setVal] = React.useState<string>(String(item[field] ?? 0));
  React.useEffect(() => { setVal(String(item[field] ?? 0)); }, [item, field]);
  return (
    <td className="px-3 py-1.5 text-right">
      <div className="inline-flex items-center justify-end gap-0.5">
        {prefix && <span className="text-foreground/40 text-[10px]">{prefix}</span>}
        <input data-testid={`menu-cell-${field}-${item.id}`}
          type="number" value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            const num = Number(val);
            if (!isNaN(num) && num !== item[field]) onPatch(item.id, { [field]: num });
          }}
          className="w-16 bg-transparent text-right font-mono text-foreground/80 focus:bg-muted/30 focus:outline-amber-500 rounded px-1" />
      </div>
    </td>
  );
}

function ComponentsEditor({ itemId, rows, onReload, onAdded }: {
  itemId: string; rows: Component[];
  onReload: () => void;
  onAdded: (rows: Component[]) => void;
}) {
  const [ingredient, setIngredient] = React.useState("");
  const [qty, setQty] = React.useState("");
  const [cost, setCost] = React.useState("");

  async function add() {
    if (!ingredient || !qty) return;
    const r = await fetch(`${API()}/api/ecw-ops/components`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: itemId, ingredient,
        quantity_g: Number(qty), cost: Number(cost) || 0,
        is_perishable: false,
      }),
    }).then((r) => r.json());
    if (r.ok) {
      setIngredient(""); setQty(""); setCost("");
      onAdded([...rows, r.component]);
    }
  }

  async function del(cid: string) {
    await fetch(`${API()}/api/ecw-ops/components/${cid}`, { method: "DELETE" });
    onAdded(rows.filter((r) => r.id !== cid));
  }

  const totalCost = rows.reduce((a, r) => a + (r.cost || 0), 0);

  return (
    <div className="space-y-2" data-testid={`menu-components-${itemId}`}>
      <div className="text-[10px] uppercase tracking-widest text-foreground/50">Dish components · cost rollup ${totalCost.toFixed(2)}</div>
      {rows.length > 0 && (
        <div className="grid grid-cols-12 gap-2 text-[11px]">
          {rows.map((c) => (
            <React.Fragment key={c.id}>
              <div className="col-span-5 text-foreground/80">{c.ingredient}</div>
              <div className="col-span-2 text-right font-mono text-foreground/60">{c.quantity_g}g</div>
              <div className="col-span-2 text-right font-mono text-foreground/60">${c.cost}</div>
              <div className="col-span-2 text-foreground/50 text-[10px]">{c.is_perishable ? "perishable" : ""}</div>
              <div className="col-span-1 text-right">
                <button data-testid={`menu-component-delete-${c.id}`} onClick={() => void del(c.id)}
                  className="text-rose-400 text-[10px]">✕</button>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-center">
        <input data-testid={`menu-component-ingredient-${itemId}`} placeholder="Ingredient"
          value={ingredient} onChange={(e) => setIngredient(e.target.value)}
          className="text-[11px] px-2 py-1 rounded border border-border/50 bg-background flex-1" />
        <input data-testid={`menu-component-qty-${itemId}`} placeholder="grams" type="number"
          value={qty} onChange={(e) => setQty(e.target.value)}
          className="text-[11px] px-2 py-1 rounded border border-border/50 bg-background w-20" />
        <input data-testid={`menu-component-cost-${itemId}`} placeholder="$" type="number"
          value={cost} onChange={(e) => setCost(e.target.value)}
          className="text-[11px] px-2 py-1 rounded border border-border/50 bg-background w-20" />
        <button data-testid={`menu-component-add-${itemId}`} onClick={() => void add()}
          disabled={!ingredient || !qty}
          className="text-[10px] px-2 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 disabled:opacity-40">
          + Add
        </button>
      </div>
    </div>
  );
}

function Kpi({ label, value, testId, tone }: {
  label: string; value: any; testId: string; tone?: "emerald" | "amber" | "rose";
}) {
  const toneCls = tone === "emerald" ? "border-emerald-500/30 text-emerald-400"
                 : tone === "amber" ? "border-amber-500/30 text-amber-400"
                 : tone === "rose" ? "border-rose-500/30 text-rose-400"
                 : "border-border/50 text-foreground/80";
  return (
    <div data-testid={testId} className={`rounded-md border ${toneCls} px-3 py-2 bg-muted/10`}>
      <div className="text-[10px] uppercase tracking-widest text-foreground/50">{label}</div>
      <div className="text-lg font-bold font-mono">{value}</div>
    </div>
  );
}
