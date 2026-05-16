/**
 * Workflow Transparency Component
 * Visual representation of EchoEvents → BEO → Production → Scheduling → Ordering → Recipe Scaling
 * Shows the complete journey from Event creation to Food on Plate
 */

import React from "react";
import {
  Calendar,
  FileText,
  ChefHat,
  Users,
  ShoppingCart,
  UtensilsCrossed,
  CheckCircle,
  Clock,
  ArrowRight,
  AlertCircle,
  Info,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Event, Task, Change, Conflict } from "../types";
import type {
  OrderLine,
  GenesisBEO,
  ChangeEvent,
} from "../types/genesis-integration";
import type { PurchasePlan } from "@/../shared/types/purchasing";
import type { ProductionSheet } from "@/../shared/types/production";
import type { LaborPlan } from "@/../shared/types/labor";
// Progress bar using simple div (if Progress component not available)
const Progress = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => (
  <div
    className={`relative h-2 w-full overflow-hidden rounded-full bg-secondary ${className || ""}`}
  >
    <div
      className="h-full bg-primary transition-all"
      style={{ width: `${value}%` }}
    />
  </div>
);

interface WorkflowStep {
  id: string;
  stage:
    | "event"
    | "beo"
    | "recipe"
    | "ordering"
    | "production"
    | "scheduling"
    | "receiving"
    | "plate";
  title: string;
  icon: React.ReactNode;
  status: "pending" | "in_progress" | "completed" | "blocked" | "not_started";
  timestamp?: string;
  details?: {
    itemCount?: number;
    cost?: number;
    margin?: number;
    conflicts?: number;
    exceptions?: number;
  };
  children?: WorkflowStep[];
}

interface WorkflowTransparencyProps {
  eventId?: string;
  beoId?: string;
  event?: Event | null;
  beo?: GenesisBEO | null;
  tasks?: Task[];
  orders?: OrderLine[];
  purchasePlan?: PurchasePlan | null;
  productionSheets?: ProductionSheet[];
  laborPlan?: LaborPlan | null;
  changes?: Array<Change | ChangeEvent>;
  conflicts?: Conflict[];
  cartSummary?: {
    itemCount: number;
    requiredQty: number;
    receivedQty: number;
    stagedQty: number;
    loadedQty: number;
  } | null;
  showDetails?: boolean;
  onStepClick?: (step: WorkflowStep) => void;
}

export function WorkflowTransparency({
  eventId,
  beoId,
  event,
  beo,
  tasks = [],
  orders = [],
  purchasePlan,
  productionSheets = [],
  laborPlan,
  changes = [],
  conflicts = [],
  cartSummary,
  showDetails = true,
  onStepClick,
}: WorkflowTransparencyProps) {
  const [selectedStep, setSelectedStep] = React.useState<string | null>(null);

  const workflowSteps: WorkflowStep[] = React.useMemo(() => {
    const resolvedEvent = event ?? null;
    const resolvedBeo = beo ?? (beoId ? ({ id: beoId } as GenesisBEO) : null);

    const guestCount =
      resolvedEvent?.guestCountExpected ??
      resolvedEvent?.guestCountCurrent ??
      0;

    const tasksForEvent = resolvedEvent
      ? tasks.filter((t) => t.eventId === resolvedEvent.id)
      : [];

    const ordersForBeo = resolvedBeo
      ? orders.filter(
          (o) =>
            (o.sourceBEODs || []).includes(resolvedBeo.id) ||
            (resolvedEvent?.id
              ? (o.sourceEventIds || []).includes(resolvedEvent.id)
              : false),
        )
      : [];

    const sheetsForBeo = resolvedBeo
      ? productionSheets.filter((s) => s.beoId === resolvedBeo.id)
      : productionSheets;

    const purchaseMatches =
      !!purchasePlan &&
      (resolvedBeo ? purchasePlan.beoId === resolvedBeo.id : true);
    const laborMatches =
      !!laborPlan && (resolvedBeo ? laborPlan.beoId === resolvedBeo.id : true);

    const conflictsCount = conflicts.length;
    const changesCount = changes.length;

    const eventStatus: WorkflowStep["status"] = resolvedEvent
      ? "completed"
      : "not_started";

    const beoStatus: WorkflowStep["status"] = resolvedBeo
      ? "completed"
      : resolvedEvent
        ? "in_progress"
        : "not_started";

    const recipeStatus: WorkflowStep["status"] =
      sheetsForBeo.length > 0
        ? "completed"
        : resolvedBeo
          ? "in_progress"
          : "not_started";

    const orderingStatus: WorkflowStep["status"] =
      ordersForBeo.length > 0 && purchaseMatches
        ? "completed"
        : ordersForBeo.length > 0 || purchaseMatches
          ? "in_progress"
          : resolvedBeo
            ? "pending"
            : "not_started";

    const schedulingStatus: WorkflowStep["status"] = laborMatches
      ? "completed"
      : tasksForEvent.length > 0
        ? "in_progress"
        : resolvedBeo
          ? "pending"
          : "not_started";

    const productionStatus: WorkflowStep["status"] =
      sheetsForBeo.length > 0
        ? "completed"
        : ordersForBeo.length > 0 || tasksForEvent.length > 0
          ? "in_progress"
          : resolvedBeo
            ? "pending"
            : "not_started";

    const receivingStatus: WorkflowStep["status"] =
      purchaseMatches ||
      ordersForBeo.length > 0 ||
      (cartSummary?.receivedQty ?? 0) > 0
        ? "in_progress"
        : resolvedBeo
          ? "pending"
          : "not_started";

    const plateStatus: WorkflowStep["status"] =
      resolvedEvent?.status === "completed"
        ? "completed"
        : resolvedEvent?.status === "in_house"
          ? "in_progress"
          : "not_started";

    return [
      {
        id: "event",
        stage: "event",
        title: "Event Created",
        icon: <Calendar className="w-5 h-5" />,
        status: eventStatus,
        timestamp: resolvedEvent?.startDateTime,
        details: { itemCount: guestCount },
      },
      {
        id: "beo",
        stage: "beo",
        title: "BEO Generated",
        icon: <FileText className="w-5 h-5" />,
        status: beoStatus,
        timestamp: resolvedEvent?.startDateTime,
        details: {
          itemCount: ordersForBeo.length,
          conflicts: conflictsCount,
        },
      },
      {
        id: "recipe-scaling",
        stage: "recipe",
        title: "Recipe Scaling",
        icon: <UtensilsCrossed className="w-5 h-5" />,
        status: recipeStatus,
        timestamp: sheetsForBeo[0]?.generatedAt,
        details: {
          itemCount: sheetsForBeo.reduce(
            (sum, s) => sum + (s.items?.length || 0),
            0,
          ),
        },
      },
      {
        id: "ordering",
        stage: "ordering",
        title: "Order Generation",
        icon: <ShoppingCart className="w-5 h-5" />,
        status: orderingStatus,
        timestamp: purchasePlan?.generatedAt,
        details: {
          itemCount:
            ordersForBeo.length || purchasePlan?.ingredients.length || 0,
          conflicts: conflictsCount,
        },
      },
      {
        id: "scheduling",
        stage: "scheduling",
        title: "Staff Scheduling",
        icon: <Users className="w-5 h-5" />,
        status: schedulingStatus,
        details: {
          itemCount: laborPlan?.requirements?.length || tasksForEvent.length,
        },
      },
      {
        id: "production",
        stage: "production",
        title: "Production Planning",
        icon: <ChefHat className="w-5 h-5" />,
        status: productionStatus,
        details: {
          itemCount: sheetsForBeo.reduce(
            (sum, s) => sum + (s.items?.length || 0),
            0,
          ),
        },
      },
      {
        id: "receiving",
        stage: "receiving",
        title: "Receiving & Cart Staging",
        icon: <ShoppingCart className="w-5 h-5" />,
        status: receivingStatus,
        details: {
          itemCount: cartSummary?.itemCount ?? ordersForBeo.length,
          exceptions: changesCount,
        },
      },
      {
        id: "plate",
        stage: "plate",
        title: "Food on Plate",
        icon: <UtensilsCrossed className="w-5 h-5" />,
        status: plateStatus,
      },
    ];
  }, [
    event,
    beo,
    beoId,
    tasks,
    orders,
    purchasePlan,
    productionSheets,
    laborPlan,
    changes,
    conflicts,
    cartSummary,
  ]);

  const getStatusColor = (status: WorkflowStep["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-700 border-green-500/30 dark:bg-green-500/20 dark:text-green-400";
      case "in_progress":
        return "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400";
      case "pending":
        return "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400";
      case "blocked":
        return "bg-red-500/10 text-red-700 border-red-500/30 dark:bg-red-500/20 dark:text-red-400";
      case "not_started":
        return "bg-gray-500/10 text-gray-700 border-gray-500/30 dark:bg-gray-500/20 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: WorkflowStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-blue-600 animate-pulse" />;
      case "blocked":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  const completedSteps = workflowSteps.filter(
    (s) => s.status === "completed",
  ).length;
  const totalSteps = workflowSteps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <Card className="border-border/20 bg-background/40 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">
                Workflow Transparency
              </CardTitle>
              <p className="text-xs text-foreground/60 mt-1">
                Event → BEO → Production → Plate
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {completedSteps} / {totalSteps} Complete
          </Badge>
        </div>
        <Progress value={progressPercentage} className="mt-3 h-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {workflowSteps.map((step, index) => {
            const isSelected = selectedStep === step.id;
            const hasChildren = step.children && step.children.length > 0;

            return (
              <React.Fragment key={step.id}>
                {/* Main Step */}
                <div
                  onClick={() => {
                    setSelectedStep(isSelected ? null : step.id);
                    onStepClick?.(step);
                  }}
                  className={cn(
                    "relative p-4 rounded-lg border cursor-pointer transition-all",
                    getStatusColor(step.status),
                    isSelected && "ring-2 ring-primary shadow-lg",
                    "hover:shadow-md",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-background/60 flex-shrink-0">
                      {step.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm text-foreground">
                          {step.title}
                        </h4>
                        {getStatusIcon(step.status)}
                        {step.details?.conflicts &&
                          step.details.conflicts > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {step.details.conflicts} conflicts
                            </Badge>
                          )}
                      </div>
                      {step.timestamp && (
                        <p className="text-xs text-foreground/60 mb-2">
                          {step.timestamp}
                        </p>
                      )}
                      {step.details && showDetails && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-foreground/70">
                          {step.details.itemCount !== undefined && (
                            <span>{step.details.itemCount} items</span>
                          )}
                          {step.details.cost !== undefined && (
                            <span>
                              Cost: ${step.details.cost.toLocaleString()}
                            </span>
                          )}
                          {step.details.margin !== undefined && (
                            <span className="text-green-600 font-medium">
                              Margin: {step.details.margin}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {index < workflowSteps.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-foreground/30 flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>

                {/* Child Steps (Recipe Details, etc.) */}
                {hasChildren && isSelected && (
                  <div className="ml-8 space-y-2 mt-2 border-l-2 border-primary/30 pl-4">
                    {step.children!.map((child) => (
                      <div
                        key={child.id}
                        className={cn(
                          "p-3 rounded-lg border text-sm",
                          getStatusColor(child.status),
                          "bg-background/40",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {child.icon}
                          <span className="font-medium text-foreground">
                            {child.title}
                          </span>
                          {getStatusIcon(child.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Summary Stats */}
        {showDetails && (
          <div className="mt-6 pt-4 border-t border-border/20">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-foreground/60 mb-1">Total Items</p>
                <p className="text-lg font-bold text-foreground">
                  {workflowSteps.reduce(
                    (sum, s) => sum + (s.details?.itemCount || 0),
                    0,
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground/60 mb-1">
                  Estimated Cost
                </p>
                <p className="text-lg font-bold text-foreground">
                  $
                  {workflowSteps
                    .reduce((sum, s) => sum + (s.details?.cost || 0), 0)
                    .toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground/60 mb-1">Completion</p>
                <p className="text-lg font-bold text-foreground">
                  {progressPercentage.toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WorkflowTransparency;
