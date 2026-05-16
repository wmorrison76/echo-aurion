/**
 * BEO Transparency View
 * Shows complete AI processing transparency for a BEO:
 * - Recipe connections and scaling logic
 * - Labor optimization calculations
 * - Order configuration logic
 * - Inventory comparison (ordered vs. on hand)
 */

import React from "react";
import {
  ChefHat,
  Users,
  ShoppingCart,
  Package,
  TrendingUp,
  Calculator,
  AlertCircle,
  CheckCircle,
  Info,
  ArrowRight,
  BarChart3,
  Calendar,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/glass";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PurchasePlan } from "@/../shared/types/purchasing";
import type { ProductionSheet } from "@/../shared/types/production";
import type { LaborPlan } from "@/../shared/types/labor";
import type {
  OrderLine,
  TraceEntry,
  GenesisBEO,
} from "../types/genesis-integration";
import type { Event } from "../types";
import { TraceDrawer } from "./TraceDrawer";
import { useAiTransparencyLog } from "@/lib/ai-transparency-log";

interface RecipeScaling {
  recipeId: string;
  recipeName: string;
  originalPortions: number;
  scaledPortions: number;
  guestCount: number;
  scalingFactor: number;
  logic: {
    portionSize: number; // e.g., 7oz
    yieldLoss: number; // e.g., 0.18 (18%)
    assumptions: string[];
    calculation: string; // e.g., "220 guests * 7oz / (1 - 0.18) = 187.8 lbs raw"
  };
}

interface LaborOptimization {
  stations: Array<{
    station: string;
    estimatedHours: number;
    staffRequired: number;
    skillLevel: string;
    optimizationLogic: {
      prepTimePerItem: number;
      concurrentItems: number;
      efficiencyMultiplier: number;
      calculation: string;
    };
  }>;
  totalLaborHours: number;
  totalStaffRequired: number;
  costSavings: number;
}

interface OrderConfiguration {
  items: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    unit: string;
    vendorId: string;
    vendorName: string;
    pricePerUnit: number;
    totalPrice: number;
    logic: {
      baseQuantity: number;
      safetyMargin: number; // e.g., 0.10 (10%)
      vendorPackSize: number;
      roundingRule: string;
      calculation: string;
    };
  }>;
  totalOrderValue: number;
}

interface InventoryComparison {
  items: Array<{
    itemId: string;
    itemName: string;
    requiredQuantity: number;
    onHandQuantity: number;
    orderedQuantity: number;
    variance: number; // ordered - (required - onHand)
    status: "sufficient" | "short" | "excess";
    storeroomLocation?: string;
  }>;
}

interface BEOTransparencyViewProps {
  beoId: string;
  eventId?: string;
  event?: Event | null;
  beo?: GenesisBEO | null;
  productionSheets?: ProductionSheet[];
  purchasePlan?: PurchasePlan | null;
  laborPlan?: LaborPlan | null;
  orders?: OrderLine[];
  onClose?: () => void;
}

export function BEOTransparencyView({
  beoId,
  eventId,
  event,
  beo,
  productionSheets = [],
  purchasePlan,
  laborPlan,
  orders = [],
  onClose,
}: BEOTransparencyViewProps) {
  const [activeTab, setActiveTab] = React.useState<string>("recipes");
  const [traceEntry, setTraceEntry] = React.useState<TraceEntry | null>(null);
  const aiLog = React.useMemo(() => useAiTransparencyLog(50), []);
  const [aiLogEntries, setAiLogEntries] = React.useState(aiLog.entries);

  React.useEffect(() => {
    setAiLogEntries(aiLog.entries);
    return aiLog.subscribe(() => {
      const next = useAiTransparencyLog(50);
      setAiLogEntries(next.entries);
    });
  }, [aiLog]);

  const resolvedEvent = event ?? null;
  const guestCount =
    resolvedEvent?.guestCountExpected ?? resolvedEvent?.guestCountCurrent ?? 0;

  const sheetsForBeo = React.useMemo(
    () => productionSheets.filter((s) => s.beoId === beoId),
    [productionSheets, beoId],
  );

  const ordersForBeo = React.useMemo(
    () =>
      orders.filter(
        (o) =>
          (o.sourceBEODs || []).includes(beoId) ||
          (eventId ? (o.sourceEventIds || []).includes(eventId) : false),
      ),
    [orders, beoId, eventId],
  );

  const buildTraceEntry = React.useCallback(
    (args: {
      entityType: TraceEntry["entityType"];
      entityId: string;
      formula: string;
      inputs: Record<string, number>;
      result: number;
      assumptions?: { portionSize?: number; yield?: number };
      affectsOrders?: string[];
      affectsRecipes?: string[];
    }): TraceEntry => {
      const now = new Date().toISOString();
      return {
        id: `trace-${args.entityId}`,
        entityType: args.entityType,
        entityId: args.entityId,
        origin: {
          source: "calculation",
          sourceType: args.entityType,
          sourceId: args.entityId,
        },
        assumptions: {
          portionSize: args.assumptions?.portionSize,
          yield: args.assumptions?.yield
            ? Math.round(args.assumptions.yield * 100)
            : undefined,
        },
        calculation: {
          formula: args.formula,
          inputs: args.inputs,
          result: args.result,
          steps: [`${args.formula} = ${args.result}`],
        },
        dependencies: {
          affectsBEODs: [beoId],
          affectsOrders: args.affectsOrders,
          affectsRecipes: args.affectsRecipes,
          affectsTimeline: true,
        },
        changeHistory: [
          {
            id: `trace-change-${args.entityId}`,
            timestamp: now,
            changeType: "calculated",
            changeDescription: "Derived via MaestroBQT transparency pipeline",
          },
        ],
        createdAt: now,
        updatedAt: now,
      };
    },
    [beoId],
  );

  const recipeScaling: RecipeScaling[] = React.useMemo(() => {
    const fallbackPortionSize = 6;
    const fallbackYield = 0.15;

    if (beo?.recipeBindings?.length) {
      return beo.recipeBindings.map((binding) => {
        const baseGuests = Math.max(
          1,
          Math.round(binding.scaling?.guestCount || guestCount || 1),
        );
        const scaledGuests = Math.max(
          1,
          Math.round(guestCount || binding.scaling?.guestCount || baseGuests),
        );
        const portionSize = binding.scaling?.portionSize || fallbackPortionSize;
        const yieldLoss = binding.scaling?.yieldLoss ?? fallbackYield;
        const scalingFactor = Number((scaledGuests / baseGuests).toFixed(2));
        const calc = `${scaledGuests} guests * ${portionSize}oz / (1 - ${yieldLoss})`;

        return {
          recipeId: binding.recipeId,
          recipeName: `Recipe ${binding.recipeId}`,
          originalPortions: baseGuests,
          scaledPortions: scaledGuests,
          guestCount: scaledGuests,
          scalingFactor,
          logic: {
            portionSize,
            yieldLoss,
            assumptions: [
              `${portionSize}oz portion size`,
              `${Math.round(yieldLoss * 100)}% yield loss`,
              `${scaledGuests} guests`,
            ],
            calculation: calc,
          },
        };
      });
    }

    if (!sheetsForBeo.length) return [];

    return sheetsForBeo.flatMap((sheet) =>
      sheet.items.map((item) => {
        const basePortions = Math.max(1, Math.round(item.quantity || 1));
        const scaledPortions = Math.max(
          1,
          Math.round(guestCount || basePortions),
        );
        const scalingFactor = Number(
          (scaledPortions / basePortions).toFixed(2),
        );
        const portionSize = /lb|pound/i.test(item.unit)
          ? 8
          : fallbackPortionSize;
        const yieldLoss = fallbackYield;
        const calc = `${scaledPortions} guests * ${portionSize}oz / (1 - ${yieldLoss})`;

        return {
          recipeId: `${item.itemId}`,
          recipeName: item.itemName,
          originalPortions: basePortions,
          scaledPortions,
          guestCount: scaledPortions,
          scalingFactor,
          logic: {
            portionSize,
            yieldLoss,
            assumptions: [
              `${portionSize}oz portion size`,
              `${Math.round(yieldLoss * 100)}% yield loss`,
              `${scaledPortions} guests`,
            ],
            calculation: calc,
          },
        };
      }),
    );
  }, [beo?.recipeBindings, sheetsForBeo, guestCount]);

  const laborOptimization: LaborOptimization = React.useMemo(() => {
    if (!laborPlan) {
      return {
        stations: [],
        totalLaborHours: 0,
        totalStaffRequired: 0,
        costSavings: 0,
      };
    }

    const stations = laborPlan.requirements.map((req) => ({
      station: req.station,
      estimatedHours: req.estimatedHours,
      staffRequired: req.requiredStaff,
      skillLevel: (req.requiredSkills || []).join(", ") || "Staff",
      optimizationLogic: {
        prepTimePerItem: Math.max(
          5,
          Math.round(
            (req.estimatedHours / Math.max(1, req.requiredStaff)) * 30,
          ),
        ),
        concurrentItems: Math.max(1, Math.round(req.requiredStaff)),
        efficiencyMultiplier: 0.9,
        calculation: `${req.estimatedHours.toFixed(1)}h / ${Math.max(1, req.requiredStaff)} staff`,
      },
    }));

    const totalHours = laborPlan.requirements.reduce(
      (sum, r) => sum + r.estimatedHours,
      0,
    );
    const totalStaff = laborPlan.requirements.reduce(
      (sum, r) => sum + r.requiredStaff,
      0,
    );
    const deltaTotal = laborPlan.deltas.reduce((sum, d) => sum + d.delta, 0);
    const costSavings = Math.max(0, -deltaTotal * 35);

    return {
      stations,
      totalLaborHours: Math.round(totalHours),
      totalStaffRequired: Math.round(totalStaff),
      costSavings: Math.round(costSavings),
    };
  }, [laborPlan]);

  const orderConfiguration: OrderConfiguration = React.useMemo(() => {
    if (ordersForBeo.length > 0) {
      const items = ordersForBeo.map((line) => ({
        itemId: line.itemId,
        itemName: line.itemId,
        quantity: line.quantity,
        unit: line.unit,
        vendorId: line.vendorId || "vendor-unassigned",
        vendorName: line.vendorId || "Unassigned Vendor",
        pricePerUnit: 0,
        totalPrice: 0,
        logic: {
          baseQuantity: line.quantity,
          safetyMargin: 0.08,
          vendorPackSize: 1,
          roundingRule: "As needed",
          calculation: `${line.quantity} ${line.unit}`,
        },
      }));
      return {
        items,
        totalOrderValue: 0,
      };
    }

    if (purchasePlan) {
      const items = purchasePlan.ingredients.map((ing) => ({
        itemId: ing.ingredientId,
        itemName: ing.ingredientName,
        quantity: ing.toOrder,
        unit: ing.unit,
        vendorId: "vendor-auto",
        vendorName: "Auto-matched Vendor",
        pricePerUnit: 0,
        totalPrice: 0,
        logic: {
          baseQuantity: ing.required,
          safetyMargin: 0.1,
          vendorPackSize: 1,
          roundingRule: "Round to unit",
          calculation: `${ing.required} ${ing.unit} + ${ing.toOrder} to order`,
        },
      }));
      const totalOrderValue = purchasePlan.ingredients.reduce(
        (sum, ing) => sum + ing.toOrder * 6,
        0,
      );
      return { items, totalOrderValue };
    }

    return { items: [], totalOrderValue: 0 };
  }, [ordersForBeo, purchasePlan]);

  const inventoryComparison: InventoryComparison = React.useMemo(() => {
    if (!purchasePlan) return { items: [] };
    return {
      items: purchasePlan.ingredients.map((ing) => {
        const required = ing.required;
        const onHand = ing.onHand;
        const ordered = ing.toOrder;
        const variance = ordered + onHand - required;
        const status =
          variance < 0 ? "short" : variance === 0 ? "sufficient" : "excess";
        return {
          itemId: ing.ingredientId,
          itemName: ing.ingredientName,
          requiredQuantity: required,
          onHandQuantity: onHand,
          orderedQuantity: ordered,
          variance,
          status,
        };
      }),
    };
  }, [purchasePlan]);

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border/20 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Info className="w-6 h-6 text-primary" />
                BEO Transparency View
              </h1>
              <p className="text-sm text-foreground/60 mt-1">
                Complete AI processing logic for BEO #{beoId.slice(-6)}
              </p>
            </div>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full flex flex-col"
        >
          <TabsList className="px-6 pt-4 border-b border-border/20 bg-transparent">
            <TabsTrigger value="recipes" className="flex items-center gap-2">
              <ChefHat className="w-4 h-4" />
              Recipe Scaling
            </TabsTrigger>
            <TabsTrigger value="labor" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Labor Optimization
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Order Configuration
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Inventory Comparison
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              AI Logs
            </TabsTrigger>
          </TabsList>

          {/* Recipe Scaling Tab */}
          <TabsContent value="recipes" className="flex-1 overflow-auto p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChefHat className="w-5 h-5 text-primary" />
                    Recipe Connections & Scaling Logic
                  </CardTitle>
                  <CardDescription>
                    How EchoAI scaled each recipe from base portions to event
                    size
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recipeScaling.length === 0 ? (
                      <div className="text-sm text-foreground/60">
                        No production sheets yet. Generate production artifacts
                        to see recipe scaling.
                      </div>
                    ) : (
                      recipeScaling.map((recipe) => (
                        <Card
                          key={recipe.recipeId}
                          className="border-border/20 bg-background/40"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">
                                {recipe.recipeName}
                              </CardTitle>
                              <Badge
                                variant="outline"
                                className="text-primary border-primary"
                              >
                                {recipe.scalingFactor}x Scale
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Scaling Overview */}
                            <div className="grid grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-foreground/60 mb-1">
                                  Original
                                </p>
                                <p className="text-lg font-bold text-foreground">
                                  {recipe.originalPortions} portions
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-foreground/60 mb-1">
                                  Scaled
                                </p>
                                <p className="text-lg font-bold text-primary">
                                  {recipe.scaledPortions} portions
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-foreground/60 mb-1">
                                  Guests
                                </p>
                                <p className="text-lg font-bold text-foreground">
                                  {recipe.guestCount}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-foreground/60 mb-1">
                                  Factor
                                </p>
                                <p className="text-lg font-bold text-foreground">
                                  {recipe.scalingFactor}x
                                </p>
                              </div>
                            </div>

                            {/* Scaling Logic */}
                            <div className="border-t border-border/20 pt-4">
                              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <Calculator className="w-4 h-4" />
                                Scaling Calculation
                              </h4>
                              <div className="bg-background/60 rounded-lg p-4 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-foreground/70">
                                    Portion Size:
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {recipe.logic.portionSize} oz
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-foreground/70">
                                    Yield Loss:
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {(recipe.logic.yieldLoss * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div className="border-t border-border/20 pt-2 mt-2">
                                  <p className="text-xs text-foreground/60 mb-1">
                                    Formula:
                                  </p>
                                  <code className="text-sm font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                                    {recipe.logic.calculation}
                                  </code>
                                </div>
                              </div>
                            </div>

                            {/* Assumptions */}
                            <div className="border-t border-border/20 pt-4">
                              <h4 className="text-sm font-semibold text-foreground mb-2">
                                Assumptions
                              </h4>
                              <ul className="space-y-1">
                                {recipe.logic.assumptions.map(
                                  (assumption, idx) => (
                                    <li
                                      key={idx}
                                      className="flex items-center gap-2 text-sm text-foreground/70"
                                    >
                                      <CheckCircle className="w-3 h-3 text-green-600" />
                                      {assumption}
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>

                            {/* Trace Button */}
                            <div className="border-t border-border/20 pt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const trace = buildTraceEntry({
                                    entityType: "recipe",
                                    entityId: recipe.recipeId,
                                    formula:
                                      "guests * portionSize / (1 - yield)",
                                    inputs: {
                                      guests: recipe.guestCount,
                                      portionSize: recipe.logic.portionSize,
                                      yield: recipe.logic.yieldLoss,
                                    },
                                    result: recipe.scaledPortions,
                                    assumptions: {
                                      portionSize: recipe.logic.portionSize,
                                      yield: recipe.logic.yieldLoss,
                                    },
                                    affectsOrders: ordersForBeo.map(
                                      (o) => o.orderId,
                                    ),
                                    affectsRecipes: [recipe.recipeId],
                                  });
                                  setTraceEntry(trace);
                                }}
                              >
                                <BarChart3 className="w-4 h-4 mr-2" />
                                View Complete Trace
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Labor Optimization Tab */}
          <TabsContent value="labor" className="flex-1 overflow-auto p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Labor Optimization Logic
                  </CardTitle>
                  <CardDescription>
                    How EchoAI calculated staff requirements and optimized labor
                    costs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <Card className="border-border/20 bg-background/40">
                        <CardContent className="p-4">
                          <p className="text-xs text-foreground/60 mb-1">
                            Total Hours
                          </p>
                          <p className="text-2xl font-bold text-foreground">
                            {laborOptimization.totalLaborHours}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="border-border/20 bg-background/40">
                        <CardContent className="p-4">
                          <p className="text-xs text-foreground/60 mb-1">
                            Staff Required
                          </p>
                          <p className="text-2xl font-bold text-foreground">
                            {laborOptimization.totalStaffRequired}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="border-border/20 bg-background/40">
                        <CardContent className="p-4">
                          <p className="text-xs text-foreground/60 mb-1">
                            Cost Savings
                          </p>
                          <p className="text-2xl font-bold text-green-600">
                            ${laborOptimization.costSavings}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="border-border/20 bg-background/40">
                        <CardContent className="p-4">
                          <p className="text-xs text-foreground/60 mb-1">
                            Stations
                          </p>
                          <p className="text-2xl font-bold text-foreground">
                            {laborOptimization.stations.length}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Station Details */}
                    {laborOptimization.stations.map((station, idx) => (
                      <Card
                        key={idx}
                        className="border-border/20 bg-background/40"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              {station.station}
                            </CardTitle>
                            <Badge variant="outline">
                              {station.skillLevel}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-foreground/60 mb-1">
                                Hours
                              </p>
                              <p className="text-lg font-bold text-foreground">
                                {station.estimatedHours}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-foreground/60 mb-1">
                                Staff
                              </p>
                              <p className="text-lg font-bold text-foreground">
                                {station.staffRequired}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-foreground/60 mb-1">
                                Efficiency
                              </p>
                              <p className="text-lg font-bold text-foreground">
                                {(
                                  station.optimizationLogic
                                    .efficiencyMultiplier * 100
                                ).toFixed(0)}
                                %
                              </p>
                            </div>
                          </div>

                          <div className="border-t border-border/20 pt-4">
                            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                              <Calculator className="w-4 h-4" />
                              Optimization Calculation
                            </h4>
                            <div className="bg-background/60 rounded-lg p-4 space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-foreground/70">
                                  Prep Time/Item:
                                </span>
                                <span className="font-medium text-foreground">
                                  {station.optimizationLogic.prepTimePerItem}{" "}
                                  min
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-foreground/70">
                                  Concurrent Items:
                                </span>
                                <span className="font-medium text-foreground">
                                  {station.optimizationLogic.concurrentItems}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-foreground/70">
                                  Efficiency:
                                </span>
                                <span className="font-medium text-foreground">
                                  {(
                                    station.optimizationLogic
                                      .efficiencyMultiplier * 100
                                  ).toFixed(0)}
                                  %
                                </span>
                              </div>
                              <div className="border-t border-border/20 pt-2 mt-2">
                                <p className="text-xs text-foreground/60 mb-1">
                                  Formula:
                                </p>
                                <code className="text-sm font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                                  {station.optimizationLogic.calculation}
                                </code>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Order Configuration Tab */}
          <TabsContent value="orders" className="flex-1 overflow-auto p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    Order Configuration Logic
                  </CardTitle>
                  <CardDescription>
                    How EchoAI configured purchase orders with quantities,
                    vendors, and pricing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-background/40 border border-border/20">
                      <div>
                        <p className="text-xs text-foreground/60 mb-1">
                          Total Order Value
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          $
                          {orderConfiguration.totalOrderValue.toLocaleString(
                            undefined,
                            { minimumFractionDigits: 2 },
                          )}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-lg px-4 py-2">
                        {orderConfiguration.items.length} Items
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {orderConfiguration.items.length === 0 ? (
                      <div className="text-sm text-foreground/60">
                        No order lines available yet. Generate ordering
                        artifacts to see configuration logic.
                      </div>
                    ) : (
                      orderConfiguration.items.map((item) => (
                        <Card
                          key={item.itemId}
                          className="border-border/20 bg-background/40"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-lg">
                                  {item.itemName}
                                </CardTitle>
                                <p className="text-sm text-foreground/60 mt-1">
                                  {item.vendorName}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-foreground">
                                  $
                                  {Number(item.totalPrice || 0).toLocaleString(
                                    undefined,
                                    { minimumFractionDigits: 2 },
                                  )}
                                </p>
                                <p className="text-xs text-foreground/60">
                                  {item.quantity} {item.unit} @ $
                                  {Number(item.pricePerUnit || 0)}/{item.unit}
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Order Logic */}
                            <div className="border-t border-border/20 pt-4">
                              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <Calculator className="w-4 h-4" />
                                Order Calculation
                              </h4>
                              <div className="bg-background/60 rounded-lg p-4 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-foreground/70">
                                    Base Quantity:
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {item.logic.baseQuantity} {item.unit}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-foreground/70">
                                    Safety Margin:
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {(item.logic.safetyMargin * 100).toFixed(0)}
                                    %
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-foreground/70">
                                    Vendor Pack Size:
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {item.logic.vendorPackSize} {item.unit}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-foreground/70">
                                    Rounding Rule:
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {item.logic.roundingRule}
                                  </span>
                                </div>
                                <div className="border-t border-border/20 pt-2 mt-2">
                                  <p className="text-xs text-foreground/60 mb-1">
                                    Formula:
                                  </p>
                                  <code className="text-sm font-mono text-primary bg-primary/10 px-2 py-1 rounded block">
                                    {item.logic.calculation}
                                  </code>
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-border/20 pt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const trace = buildTraceEntry({
                                    entityType: "order",
                                    entityId: item.itemId,
                                    formula:
                                      "baseQuantity * (1 + safetyMargin)",
                                    inputs: {
                                      baseQuantity: item.logic.baseQuantity,
                                      safetyMargin: item.logic.safetyMargin,
                                    },
                                    result: item.quantity,
                                    assumptions: {
                                      portionSize: undefined,
                                      yield: undefined,
                                    },
                                    affectsOrders: ordersForBeo.map(
                                      (o) => o.orderId,
                                    ),
                                  });
                                  setTraceEntry(trace);
                                }}
                              >
                                <BarChart3 className="w-4 h-4 mr-2" />
                                View Complete Trace
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Inventory Comparison Tab */}
          <TabsContent value="inventory" className="flex-1 overflow-auto p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Inventory Comparison: Ordered vs. On Hand
                  </CardTitle>
                  <CardDescription>
                    Comparison of what's ordered vs. what's already in storeroom
                    inventory
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {inventoryComparison.items.length === 0 ? (
                      <div className="text-sm text-foreground/60">
                        No purchase plan yet. Generate a purchase plan to
                        compare inventory.
                      </div>
                    ) : (
                      inventoryComparison.items.map((item) => (
                        <Card
                          key={item.itemId}
                          className={cn(
                            "border-border/20",
                            item.status === "sufficient" &&
                              "bg-green-500/5 border-green-500/30",
                            item.status === "short" &&
                              "bg-red-500/5 border-red-500/30",
                            item.status === "excess" &&
                              "bg-amber-500/5 border-amber-500/30",
                          )}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">
                                {item.itemName}
                              </CardTitle>
                              <Badge
                                variant={
                                  item.status === "sufficient"
                                    ? "default"
                                    : item.status === "short"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {item.status === "sufficient" && (
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                )}
                                {item.status === "short" && (
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                )}
                                {item.status === "excess" && (
                                  <Info className="w-3 h-3 mr-1" />
                                )}
                                {item.status.charAt(0).toUpperCase() +
                                  item.status.slice(1)}
                              </Badge>
                            </div>
                            {item.storeroomLocation && (
                              <p className="text-xs text-foreground/60 mt-2">
                                📍 Storeroom: {item.storeroomLocation}
                              </p>
                            )}
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-foreground/60 mb-1">
                                  Required
                                </p>
                                <p className="text-lg font-bold text-foreground">
                                  {item.requiredQuantity}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-foreground/60 mb-1">
                                  On Hand
                                </p>
                                <p className="text-lg font-bold text-foreground">
                                  {item.onHandQuantity}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-foreground/60 mb-1">
                                  Ordered
                                </p>
                                <p className="text-lg font-bold text-primary">
                                  {item.orderedQuantity}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-foreground/60 mb-1">
                                  Variance
                                </p>
                                <p
                                  className={cn(
                                    "text-lg font-bold",
                                    item.variance === 0
                                      ? "text-foreground"
                                      : item.variance > 0
                                        ? "text-amber-600"
                                        : "text-red-600",
                                  )}
                                >
                                  {item.variance > 0 && "+"}
                                  {item.variance}
                                </p>
                              </div>
                            </div>

                            {/* Calculation Breakdown */}
                            <div className="border-t border-border/20 pt-4 mt-4">
                              <div className="bg-background/60 rounded-lg p-4">
                                <div className="flex items-center justify-between text-sm mb-2">
                                  <span className="text-foreground/70">
                                    Calculation:
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm font-mono">
                                  <span className="text-foreground/70">
                                    Required:
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {item.requiredQuantity}
                                  </span>
                                  <ArrowRight className="w-4 h-4 text-foreground/40" />
                                  <span className="text-foreground/70">
                                    On Hand:
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {item.onHandQuantity}
                                  </span>
                                  <ArrowRight className="w-4 h-4 text-foreground/40" />
                                  <span className="text-foreground/70">
                                    Need to Order:
                                  </span>
                                  <span className="font-medium text-primary">
                                    {Math.max(
                                      0,
                                      item.requiredQuantity -
                                        item.onHandQuantity,
                                    )}
                                  </span>
                                  {item.variance !== 0 && (
                                    <>
                                      <ArrowRight className="w-4 h-4 text-foreground/40" />
                                      <span
                                        className={cn(
                                          "font-medium",
                                          item.variance > 0
                                            ? "text-amber-600"
                                            : "text-red-600",
                                        )}
                                      >
                                        Variance: {item.variance > 0 && "+"}
                                        {item.variance}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="flex-1 overflow-auto p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary" />
                    EchoAi³ Transparency Log
                  </CardTitle>
                  <CardDescription>
                    Recent AI orchestration signals and decisions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {aiLogEntries.length === 0 ? (
                    <div className="text-sm text-foreground/60">
                      No AI logs yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiLogEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-lg border border-border/40 bg-background/60 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">
                              {entry.event}
                            </Badge>
                            <span className="text-xs text-foreground/60">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {entry.summary ? (
                            <div className="mt-2 text-sm">{entry.summary}</div>
                          ) : null}
                          {entry.source ? (
                            <div className="mt-1 text-xs text-foreground/50">
                              Source: {entry.source}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {traceEntry && (
        <TraceDrawer
          trace={traceEntry}
          isOpen={!!traceEntry}
          onClose={() => setTraceEntry(null)}
        />
      )}
    </div>
  );
}

export default BEOTransparencyView;
