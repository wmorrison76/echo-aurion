import React from "react";
/** * Genesis H — Standing PAR & Lead-Time Production Intelligence Panel * Chef-friendly UI for viewing PAR rules, projecting demand, and getting early production recommendations. */ import {
  useMemo,
  useState,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
import { listParRules, initializeSampleParRules } from "@/lib/par-store";
import {
  forecastPars,
  evaluateLocationHealth,
} from "@/lib/par-forecast-engine";
import { listInventoryLocations } from "@/lib/inventory-store";
import type { ParProjection } from "@/../shared/types/par";
const LOCATION_OPTIONS = [
  { id: "pastry_commissary", name: "Pastry Commissary" },
  { id: "bqt_commissary", name: "Banquets Production" },
  { id: "storeroom_main", name: "Storeroom" },
];
export default function GenesisHPanel() {
  const { t } = useI18n(); // Initialize sample locations and rules on first load const [initialized] = useState(() => { initializeSampleParRules(); return true; }); const [selectedLocationId, setSelectedLocationId] = useState("pastry_commissary"); const [demandInput, setDemandInput] = useState(""); const [demandQty, setDemandQty] = useState(0); const [upcomingDemand, setUpcomingDemand] = useState<Record<string, number>>({"Cheesecake 9in": 45, }); const [, setTick] = useState(0); // Get all locations (for reference) const locations = useMemo(() => listInventoryLocations(), []); // Get PAR rules for selected location const rules = useMemo(() => { return listParRules().filter((r) => r.locationId === selectedLocationId); }, [selectedLocationId, initialized]); // Run forecasts const projections = useMemo(() => { if (rules.length === 0) return []; return forecastPars({ locationId: selectedLocationId, rules, upcomingDemand, }); }, [rules, upcomingDemand, selectedLocationId]); // Evaluate location health const health = useMemo(() => { if (projections.length === 0) { return { totalRules: 0, healthy: 0, earlyProduction: 0, overProduction: 0, riskLevel:"green" as const, }; } return evaluateLocationHealth(projections); }, [projections]); const selectedLocation = LOCATION_OPTIONS.find( (l) => l.id === selectedLocationId, ); return ( <div className="w-full h-full flex flex-col bg-background overflow-hidden"> {/* Header */} <div className="flex-shrink-0 border-b border-border/30 p-4"> <div className="flex items-start justify-between gap-3"> <div> <div className="text-lg font-semibold text-foreground"> Genesis H — Standing PAR & Lead-Time Intelligence </div> <div className="text-sm text-foreground/70 mt-1"> Ensure production locations maintain optimal inventory. Never surprise the chef. </div> </div> <Badge>PAR</Badge> </div> </div> {/* Content */} <div className="flex-1 overflow-auto p-4 space-y-4"> {/* Location Selector */} <Card className="p-4"> <div className="text-sm font-semibold text-foreground mb-3"> Production Location </div> <div className="flex gap-2 flex-wrap"> {LOCATION_OPTIONS.map((loc) => ( <Button key={loc.id} variant={selectedLocationId === loc.id ?"default" :"outline"} size="sm" onClick={() => { setSelectedLocationId(loc.id); setTick((t) => t + 1); }} > {loc.name} </Button> ))} </div> </Card> {/* Demand Forecast Input */} <Card className="p-4"> <div className="text-sm font-semibold text-foreground mb-3"> Upcoming Demand (Demo) </div> <div className="space-y-3"> <div className="text-xs text-foreground/60 mb-2"> Add ingredient demand to see production recommendations. </div> <div className="flex gap-2"> <Input placeholder="Ingredient name" value={demandInput} onChange={(e) => setDemandInput(e.target.value)} className="flex-1" /> <Input type="number" placeholder="Qty" value={demandQty} onChange={(e) => setDemandQty(Number(e.target.value))} className="w-20" /> <Button variant="secondary" size="sm" onClick={() => { if (demandInput.trim()) { setUpcomingDemand((prev) => ({ ...prev, [demandInput]: demandQty, })); setDemandInput(""); setDemandQty(0); } }} > Add </Button> </div> {/* Current Demand Display */} {Object.entries(upcomingDemand).length > 0 && ( <div className="bg-surface/50 rounded p-2 space-y-1 mt-3"> <div className="text-xs font-semibold text-foreground/70"> Current Demand: </div> {Object.entries(upcomingDemand).map(([ingredient, qty]) => ( <div key={ingredient} className="flex justify-between items-center text-xs text-foreground/80" > <span>{ingredient}</span> <div className="flex items-center gap-2"> <span className="font-semibold">{qty}</span> <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-foreground/50 hover:text-foreground" onClick={() => { setUpcomingDemand((prev) => { const next = { ...prev }; delete next[ingredient]; return next; }); }} > × </Button> </div> </div> ))} </div> )} </div> </Card> {/* Location Health Summary */} {projections.length > 0 && ( <Card className="p-4 bg-surface/50"> <div className="space-y-2"> <div className="flex items-center justify-between"> <div className="text-xs font-semibold text-foreground/70"> {selectedLocation?.name} Health </div> <Badge variant={ health.riskLevel ==="red" ?"destructive" : health.riskLevel ==="yellow" ?"secondary" :"default" } > {health.riskLevel.toUpperCase()} </Badge> </div> <div className="grid grid-cols-3 gap-2 text-xs"> <div> <div className="text-foreground/70">Healthy</div> <div className="font-semibold text-green-600"> {health.healthy} </div> </div> <div> <div className="text-foreground/70">Early Prod</div> <div className="font-semibold text-red-600"> {health.earlyProduction} </div> </div> <div> <div className="text-foreground/70">Over PAR</div> <div className="font-semibold text-yellow-600"> {health.overProduction} </div> </div> </div> </div> </Card> )} {/* PAR Projections */} <div> <div className="text-sm font-semibold text-foreground mb-3"> PAR Forecast Projections </div> {projections.length === 0 ? ( <Card className="p-4"> <div className="text-sm text-foreground/70 text-center py-4"> No PAR rules configured for {selectedLocation?.name}. </div> </Card> ) : ( <div className="space-y-3"> {projections.map((proj) => ( <ProjectionCard key={proj.ingredientName} projection={proj} /> ))} </div> )} </div> {/* Info Section */} <Card className="p-4 bg-surface/30 border-border/50"> <div className="text-xs space-y-2 text-foreground/70"> <div className="font-semibold text-foreground/80"> How Genesis H Works </div> <ul className="list-disc list-inside space-y-1"> <li> <strong>PAR</strong> = target inventory quantity per ingredient </li> <li> <strong>Lead Time</strong> = days needed to replenish from now </li> <li> <strong>Projection</strong> = current inventory minus upcoming demand </li> <li> <strong>Action</strong>: PRODUCE_EARLY if falling below PAR </li> <li>Chefs guide the system; EchoAI³ warns, never overrides</li> </ul> </div> </Card> </div> </div> );
} /** * Individual projection card component */
function ProjectionCard({ projection }: { projection: ParProjection }) {
  const statusColor =
    projection.action === "PRODUCE_EARLY"
      ? "text-red-600"
      : projection.action === "OVER_PAR_WARNING"
        ? "text-yellow-600"
        : "text-green-600";
  const badgeVariant =
    projection.action === "PRODUCE_EARLY"
      ? "destructive"
      : projection.action === "OVER_PAR_WARNING"
        ? "secondary"
        : "default";
  return (
    <Card className="p-4">
      {" "}
      <div className="flex items-start justify-between gap-3 mb-2">
        {" "}
        <div className="flex-1">
          {" "}
          <div className="font-semibold text-foreground">
            {" "}
            {projection.ingredientName}{" "}
          </div>{" "}
          <div className="text-xs text-foreground/70 mt-1">
            {" "}
            Unit: <span className="font-mono">{projection.unit}</span> • Lead
            time:{""}{" "}
            <span className="font-semibold">
              {projection.leadTimeDays}d
            </span>{" "}
          </div>{" "}
        </div>{" "}
        <Badge variant={badgeVariant}>{projection.action}</Badge>{" "}
      </div>{" "}
      <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
        {" "}
        <div>
          {" "}
          <div className="text-foreground/60 text-xs">On-Hand</div>{" "}
          <div className="font-semibold text-foreground">
            {" "}
            {projection.currentOnHand}{" "}
          </div>{" "}
        </div>{" "}
        <div>
          {" "}
          <div className="text-foreground/60 text-xs">PAR Target</div>{" "}
          <div className="font-semibold text-foreground">
            {" "}
            {projection.targetPar}{" "}
          </div>{" "}
        </div>{" "}
        <div>
          {" "}
          <div className="text-foreground/60 text-xs">
            Projected Ending
          </div>{" "}
          <div className={`font-semibold ${statusColor}`}>
            {" "}
            {projection.projectedEnding}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <div className="text-sm text-foreground/80 p-2 bg-surface/50 rounded">
        {" "}
        {projection.explanation}{" "}
      </div>{" "}
    </Card>
  );
}
