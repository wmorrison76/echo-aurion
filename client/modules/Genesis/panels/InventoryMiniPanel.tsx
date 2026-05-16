/** * Inventory Mini Panel (Genesis G) * Daily-use inventory widget for chefs: * - Health score (based on snapshot recency + surplus activity) * - On-hand snapshot (location ledger) * - Surplus broadcast feed (items from other locations) * - Quick adjustments (manual counts, waste tracking) */ import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
import { osBus } from "@/lib/os-bus";
import {
  initializeInventoryLedgerSamples,
  getLocationSnapshot,
} from "@/lib/inventory-ledger-store";
import {
  optimisticallyCommitAdjustment,
  proposeInventorySurplus,
} from "@/lib/commands/inventory";
interface SurplusItem {
  id: string;
  locationId: string;
  name: string;
  qty: number;
  uom: string;
  note?: string;
  createdAt: number;
  expiresAt?: number;
}
interface LedgerLine {
  itemKey: string;
  name: string;
  onHand: number;
  uom: string;
}
const LOCATIONS = [
  { id: "storeroom", name: "Storeroom" },
  { id: "banquets-commissary", name: "Banquets Commissary" },
  { id: "pastry-commissary", name: "Pastry Commissary" },
];
function computeHealth(params: {
  lastUpdateAt: number;
  surplusCount: number;
}): number {
  const now = Date.now();
  const minutesAgo = (now - params.lastUpdateAt) / 60000;
  let score = 0.45; // baseline if (minutesAgo <= 60) { score += 0.35; } else if (minutesAgo <= 360) { score += 0.2; } else if (minutesAgo <= 1440) { score += 0.1; } if (params.surplusCount > 0) { score += 0.05 * Math.min(params.surplusCount / 5, 1); } return Math.min(score, 1);
}
function healthLabel(score: number): { text: string; tone: string } {
  if (score >= 0.8) {
    return { text: "EXCELLENT", tone: "text-green-400" };
  } else if (score >= 0.6) {
    return { text: "GOOD", tone: "text-blue-400" };
  } else if (score >= 0.4) {
    return { text: "OK", tone: "text-yellow-400" };
  } else {
    return { text: "STALE", tone: "text-red-400" };
  }
}
export default function InventoryMiniPanel() {
  const [locationId, setLocationId] = useState("storeroom");
  const [snapshot, setSnapshot] = useState<LedgerLine[]>([]);
  const [lastUpdateAt, setLastUpdateAt] = useState(Date.now());
  const [surplus, setSurplus] = useState<SurplusItem[]>([]);
  const [showAdjust, setShowAdjust] = useState(false); // Quick adjust form state const [adjItemKey, setAdjItemKey] = useState("chicken_breast_6oz"); const [adjQty, setAdjQty] = useState("1"); const [adjUom, setAdjUom] = useState("cs"); const [adjDir, setAdjDir] = useState<"IN" |"OUT">("OUT"); const [adjNote, setAdjNote] = useState(""); // Initialize ledger samples on first mount useEffect(() => { initializeInventoryLedgerSamples(); const initial = getLocationSnapshot(locationId); setSnapshot(initial); }, []); // Load snapshot when location changes useEffect(() => { const initial = getLocationSnapshot(locationId); setSnapshot(initial); setLastUpdateAt(Date.now()); }, [locationId]); // Listen for snapshot updates useEffect(() => { const unsubscribe = osBus.on("inventory:snapshot_updated", (event) => { if (event.locationId === locationId) { setSnapshot( event.snapshot.map((s) => ({ itemKey: s.itemKey, name: s.name, onHand: s.onHand, uom: s.uom, })), ); setLastUpdateAt(event.updatedAt); } }); return () => unsubscribe(); }, [locationId]); // Listen for surplus broadcasts useEffect(() => { const unsubscribe = osBus.on("inventory:surplus_broadcasted", (event) => { setSurplus((prev) => { const newItem: SurplusItem = { id: event.id, locationId: event.locationId, name: event.name, qty: event.qty, uom: event.uom, note: event.note, createdAt: event.createdAt, expiresAt: event.expiresAt, }; // Keep last 25 items return [newItem, ...prev].slice(0, 25); }); }); return () => unsubscribe(); }, []); // Health score const health = useMemo( () => computeHealth({ lastUpdateAt, surplusCount: surplus.length }), [lastUpdateAt, surplus.length], ); const healthStatus = healthLabel(health); // Handle quick adjust submit const handleSubmitAdjustment = async () => { const item = snapshot.find((s) => s.itemKey === adjItemKey); if (!item) return; const result = await optimisticallyCommitAdjustment( locationId, [ { itemKey: adjItemKey, name: item.name, qty: parseInt(adjQty, 10) || 1, uom: adjUom, direction: adjDir, }, ], adjNote, ); if (result.ok) { // Clear form setAdjQty("1"); setAdjNote(""); setShowAdjust(false); // Reload snapshot const updated = getLocationSnapshot(locationId); setSnapshot(updated); setLastUpdateAt(Date.now()); } }; // Seed example surplus for demo const handleSeedSurplus = () => { proposeInventorySurplus({ locationId:"storeroom", name:"Chicken Breast (extra case remainder)", qty: 20, uom:"lb", note:"Found in walk-in, expires tomorrow", expiresAt: Date.now() + 86400000, }); }; // Refresh snapshot const handleRefresh = () => { const updated = getLocationSnapshot(locationId); setSnapshot(updated); setLastUpdateAt(Date.now()); }; return ( <div className={cn("w-full h-full flex flex-col bg-black/40 overflow-hidden")} > {/* Header */} <div className={cn("flex-shrink-0 border-b border-white/10 p-3")}> <div className={cn("flex items-center justify-between gap-3 mb-3")}> <div> <div className={cn("text-lg font-semibold text-white")}> Inventory — Daily </div> </div> <Badge className={cn("bg-background text-white")}> Health:{""} <span className={cn("ml-1 font-semibold", healthStatus.tone)}> {healthStatus.text} </span> </Badge> </div> {/* Controls */} <div className={cn("flex items-center gap-2")}> <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={cn("px-2 py-1 text-xs bg-black/60 border border-white/10 text-white rounded", )} > {LOCATIONS.map((loc) => ( <option key={loc.id} value={loc.id}> {loc.name} </option> ))} </select> <Button size="sm" onClick={() => setShowAdjust(!showAdjust)} className={cn("bg-primary/40 text-blue-200 hover:bg-primary/60")} > {showAdjust ?"Cancel" :"Quick Adjust"} </Button> <Button size="sm" onClick={handleRefresh} className={cn("bg-background text-white hover:bg-background")} > Refresh </Button> <Button size="sm" onClick={handleSeedSurplus} className={cn("bg-purple-600/40 text-purple-200 hover:bg-purple-600/60", )} > Seed Example </Button> </div> </div> {/* Quick Adjust Form (collapsible) */} {showAdjust && ( <div className={cn("flex-shrink-0 border-b border-white/10 p-3 bg-black/60", )} > <div className={cn("space-y-2")}> <div className={cn("text-xs text-white/70")}>Quick Adjustment</div> <div className={cn("grid grid-cols-5 gap-2")}> <select value={adjItemKey} onChange={(e) => setAdjItemKey(e.target.value)} className={cn("col-span-2 px-2 py-1 text-xs bg-black/40 border border-white/10 text-white rounded", )} > {snapshot.map((item) => ( <option key={item.itemKey} value={item.itemKey}> {item.name} </option> ))} </select> <input type="number" value={adjQty} onChange={(e) => setAdjQty(e.target.value)} placeholder="Qty" className={cn("px-2 py-1 text-xs bg-black/40 border border-white/10 text-white rounded", )} /> <select value={adjDir} onChange={(e) => setAdjDir(e.target.value as"IN" |"OUT")} className={cn("px-2 py-1 text-xs bg-black/40 border border-white/10 text-white rounded", )} > <option value="IN">IN</option> <option value="OUT">OUT</option> </select> <Button size="sm" onClick={handleSubmitAdjustment} className={cn("bg-green-600/40 text-green-200 hover:bg-green-600/60", )} > Submit </Button> </div> <input type="text" value={adjNote} onChange={(e) => setAdjNote(e.target.value)} placeholder="Note (e.g. 'Found extra case in back')" className={cn("w-full px-2 py-1 text-xs bg-black/40 border border-white/10 text-white rounded placeholder-white/30", )} /> </div> </div> )} {/* Main Content Grid */} <div className={cn("flex-1 overflow-auto")}> <div className={cn("grid grid-cols-12 gap-3 p-3 h-full")}> {/* Left: On-Hand Snapshot */} <div className={cn("col-span-7 flex flex-col")}> <Card className={cn("flex-1 bg-black/40 border-white/10 overflow-auto")} > <div className={cn("p-3")}> <div className={cn("text-xs text-white/70 font-semibold mb-2")}> On-Hand Snapshot </div> {snapshot.length === 0 ? ( <div className={cn("text-xs text-white/50")}> No items in snapshot </div> ) : ( <div className={cn("space-y-1")}> {snapshot.map((item) => ( <div key={item.itemKey} className={cn("flex justify-between text-xs text-white/80 py-1 px-2 bg-black/30 rounded", )} > <span className={cn("flex-1")}>{item.name}</span> <span className={cn("font-mono font-semibold")}> {item.onHand} {item.uom} </span> </div> ))} </div> )} </div> </Card> </div> {/* Right: Surplus Broadcast Feed */} <div className={cn("col-span-5 flex flex-col")}> <Card className={cn("flex-1 bg-black/40 border-white/10 overflow-auto")} > <div className={cn("p-3")}> <div className={cn("text-xs text-white/70 font-semibold mb-2")}> Surplus Broadcast </div> {surplus.length === 0 ? ( <div className={cn("text-xs text-white/50")}> No surplus broadcasts yet... </div> ) : ( <div className={cn("space-y-2")}> {surplus.map((item) => ( <div key={item.id} className={cn("p-2 bg-purple-900/30 border border-purple-600/30 rounded text-xs", )} > <div className={cn("text-white/90 font-semibold")}> {item.name} </div> <div className={cn("text-white/60 mt-1")}> {item.qty} {item.uom} </div> {item.note && ( <div className={cn("text-white/50 text-xs mt-1 italic")} > {item.note} </div> )} <div className={cn("text-white/40 text-xs mt-1")}> From: {item.locationId} •{""} {new Date(item.createdAt).toLocaleTimeString()} </div> {item.expiresAt && ( <div className={cn("text-orange-300 text-xs mt-1")}> Expires:{""} {new Date(item.expiresAt).toLocaleTimeString()} </div> )} </div> ))} </div> )} </div> </Card> </div> </div> </div> </div> );
}
