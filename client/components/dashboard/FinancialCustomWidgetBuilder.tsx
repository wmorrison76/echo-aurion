import React, { useState, useEffect } from "react";
import { Plus, X, Save, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/glass";
import { Button } from "@/components/ui/button";

export interface FinancialCustomWidget {
  id: string;
  name: string;
  selectedMetrics: string[];
  selectedOutlets: string[];
  selectedPeriod: {
    type: "monthly" | "daily" | "custom";
    fiscalYear?: number;
    fiscalPeriod?: number;
    startDate?: string;
    endDate?: string;
  };
  drillDownLevel: "summary" | "departmental" | "cost-center" | "gl-account";
  includeComparisons: {
    budget: boolean;
    priorYear: boolean;
    priorPeriod: boolean;
  };
  color?: string;
  createdAt: number;
  sharedWith?: string[];
}

interface FinancialCustomWidgetBuilderProps {
  onCreateWidget: (widget: FinancialCustomWidget) => void;
  existingWidgets?: FinancialCustomWidget[];
}

interface AvailableMetric {
  id: string;
  label: string;
  type: "currency" | "percentage" | "count";
  category: string;
  description: string;
}

interface AvailableOutlet {
  id: string;
  name: string;
  type: string;
}

interface AvailablePeriod {
  type: string;
  fiscalYear: number;
  fiscalPeriod: number;
  label: string;
  startDate: string;
  endDate: string;
}

const METRIC_CATEGORIES = [
  { id: "P&L", label: "Profit & Loss" },
  { id: "Costs", label: "Costs" },
  { id: "Operations", label: "Operations" },
];

const COLORS = [
  { name: "Blue", value: "from-blue-500/10 to-blue-400/5 border-blue-400/20" },
  {
    name: "Green",
    value: "from-green-500/10 to-green-400/5 border-green-400/20",
  },
  {
    name: "Purple",
    value: "from-purple-500/10 to-purple-400/5 border-purple-400/20",
  },
  { name: "Rose", value: "from-rose-500/10 to-rose-400/5 border-rose-400/20" },
  {
    name: "Amber",
    value: "from-amber-500/10 to-amber-400/5 border-amber-400/20",
  },
];

export function FinancialCustomWidgetBuilder({
  onCreateWidget,
  existingWidgets = [],
}: FinancialCustomWidgetBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [widgetName, setWidgetName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState({
    type: "monthly" as const,
    fiscalYear: new Date().getFullYear(),
    fiscalPeriod: new Date().getMonth() + 1,
  });
  const [drillDownLevel, setDrillDownLevel] = useState<
    "summary" | "departmental" | "cost-center" | "gl-account"
  >("summary");
  const [includeComparisons, setIncludeComparisons] = useState({
    budget: false,
    priorYear: false,
    priorPeriod: false,
  });

  const [availableMetrics, setAvailableMetrics] = useState<AvailableMetric[]>(
    [],
  );
  const [availableOutlets, setAvailableOutlets] = useState<AvailableOutlet[]>(
    [],
  );
  const [availablePeriods, setAvailablePeriods] = useState<AvailablePeriod[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    "P&L",
  ]);

  // Fetch available metrics when builder opens
  useEffect(() => {
    if (isOpen && availableMetrics.length === 0) {
      fetchAvailableOptions();
    }
  }, [isOpen]);

  const fetchAvailableOptions = async () => {
    try {
      setIsLoading(true);

      // Fetch available metrics
      const metricsRes = await fetch(
        "/api/financial-data-query/available-metrics",
      );
      const metricsData = await metricsRes.json();
      setAvailableMetrics(metricsData.metrics || []);

      // Fetch available outlets
      const outletsRes = await fetch(
        "/api/financial-data-query/available-outlets",
      );
      const outletsData = await outletsRes.json();
      setAvailableOutlets(outletsData.outlets || []);
      if (outletsData.outlets?.length > 0) {
        setSelectedOutlets([outletsData.outlets[0].id]);
      }

      // Fetch available periods
      const periodsRes = await fetch(
        "/api/financial-data-query/available-periods",
      );
      const periodsData = await periodsRes.json();
      setAvailablePeriods(periodsData.periods || []);
    } catch (error) {
      console.error("Failed to fetch financial options", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId)
        ? prev.filter((id) => id !== metricId)
        : [...prev, metricId],
    );
  };

  const toggleOutlet = (outletId: string) => {
    setSelectedOutlets((prev) =>
      prev.includes(outletId)
        ? prev.filter((id) => id !== outletId)
        : [...prev, outletId],
    );
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  const toggleComparison = (key: "budget" | "priorYear" | "priorPeriod") => {
    setIncludeComparisons((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCreateWidget = () => {
    if (
      !widgetName.trim() ||
      selectedMetrics.length === 0 ||
      selectedOutlets.length === 0
    ) {
      alert(
        "Please enter a widget name, select metrics, and select at least one outlet",
      );
      return;
    }

    const newWidget: FinancialCustomWidget = {
      id: `custom-financial-${Date.now()}`,
      name: widgetName,
      selectedMetrics,
      selectedOutlets,
      selectedPeriod,
      drillDownLevel,
      includeComparisons,
      color: selectedColor,
      createdAt: Date.now(),
      sharedWith: [],
    };

    onCreateWidget(newWidget);

    // Reset form
    setWidgetName("");
    setSelectedMetrics([]);
    setSelectedOutlets([]);
    setSelectedPeriod({
      type: "monthly",
      fiscalYear: new Date().getFullYear(),
      fiscalPeriod: new Date().getMonth() + 1,
    });
    setDrillDownLevel("summary");
    setIncludeComparisons({
      budget: false,
      priorYear: false,
      priorPeriod: false,
    });
    setSelectedColor(COLORS[0].value);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center w-7 h-7 rounded transition-all text-foreground/60 hover:text-foreground hover:bg-primary/10"
        title="Create a financial custom widget"
        type="button"
      >
        <Plus size={14} />
      </button>
    );
  }

  const groupedMetrics = METRIC_CATEGORIES.map((cat) => ({
    ...cat,
    metrics: availableMetrics.filter((m) => m.category === cat.id),
  }));

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 999999 }}
    >
      <div className="bg-background border border-border/50 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 border-b border-border/30 bg-background/95 backdrop-blur p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Create Financial Custom Widget
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-primary/10 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Widget Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Widget Name
              </label>
              <input
                type="text"
                value={widgetName}
                onChange={(e) => setWidgetName(e.target.value)}
                placeholder="e.g., Labor Cost Analysis"
                className="w-full px-3 py-2 bg-background/60 border border-border/30 rounded-lg text-foreground placeholder-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {/* Color Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Widget Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.value)}
                    className={cn(
                      "w-16 h-16 rounded-lg border-2 bg-gradient-to-br transition-all",
                      color.value,
                      selectedColor === color.value
                        ? "border-foreground/40 ring-2 ring-primary"
                        : "border-transparent hover:border-foreground/20",
                    )}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Outlets Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Select Outlets ({selectedOutlets.length} selected)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-border/30 rounded-lg p-3">
                {availableOutlets.map((outlet) => (
                  <button
                    key={outlet.id}
                    onClick={() => toggleOutlet(outlet.id)}
                    className={cn(
                      "p-2 rounded border transition-all text-left text-sm",
                      selectedOutlets.includes(outlet.id)
                        ? "bg-primary/20 border-primary/50 text-foreground"
                        : "bg-background/60 border-border/30 text-foreground/70 hover:bg-background/80",
                    )}
                  >
                    <div className="font-medium">{outlet.name}</div>
                    <div className="text-xs text-foreground/40">
                      {outlet.type}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Select Metrics ({selectedMetrics.length} selected)
              </label>
              <div className="space-y-3">
                {groupedMetrics.map((category) => (
                  <div
                    key={category.id}
                    className="border border-border/30 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center justify-between p-3 bg-background/40 hover:bg-background/60 transition-colors"
                    >
                      <span className="font-medium text-foreground">
                        {category.label}
                      </span>
                      <ChevronDown
                        size={16}
                        className={cn(
                          "transition-transform",
                          expandedCategories.includes(category.id) &&
                            "rotate-180",
                        )}
                      />
                    </button>

                    {expandedCategories.includes(category.id) && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-background/20">
                        {category.metrics.map((metric) => (
                          <button
                            key={metric.id}
                            onClick={() => toggleMetric(metric.id)}
                            className={cn(
                              "p-3 rounded border transition-all text-left text-sm",
                              selectedMetrics.includes(metric.id)
                                ? "bg-primary/20 border-primary/50 text-foreground"
                                : "bg-background/60 border-border/30 text-foreground/70 hover:bg-background/80",
                            )}
                            title={metric.description}
                          >
                            <div className="font-medium">{metric.label}</div>
                            <div className="text-xs text-foreground/40">
                              {metric.type}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Time Period Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Period Type
                </label>
                <select
                  value={selectedPeriod.type}
                  onChange={(e) =>
                    setSelectedPeriod({
                      ...selectedPeriod,
                      type: e.target.value as "monthly" | "daily" | "custom",
                    })
                  }
                  className="w-full px-3 py-2 bg-background/60 border border-border/30 rounded-lg text-foreground focus:outline-none focus:border-primary/50"
                >
                  <option value="monthly">Monthly</option>
                  <option value="daily">Daily</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {selectedPeriod.type === "monthly" &&
                availablePeriods.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Month
                    </label>
                    <select
                      value={`${selectedPeriod.fiscalYear}-${selectedPeriod.fiscalPeriod}`}
                      onChange={(e) => {
                        const [year, period] = e.target.value.split("-");
                        setSelectedPeriod({
                          ...selectedPeriod,
                          fiscalYear: parseInt(year),
                          fiscalPeriod: parseInt(period),
                        });
                      }}
                      className="w-full px-3 py-2 bg-background/60 border border-border/30 rounded-lg text-foreground focus:outline-none focus:border-primary/50"
                    >
                      {availablePeriods.map((period) => (
                        <option
                          key={period.label}
                          value={`${period.fiscalYear}-${period.fiscalPeriod}`}
                        >
                          {period.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
            </div>

            {/* Drill Down Level */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Drill Down Level
              </label>
              <select
                value={drillDownLevel}
                onChange={(e) =>
                  setDrillDownLevel(
                    e.target.value as
                      | "summary"
                      | "departmental"
                      | "cost-center"
                      | "gl-account",
                  )
                }
                className="w-full px-3 py-2 bg-background/60 border border-border/30 rounded-lg text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="summary">Summary</option>
                <option value="departmental">By Department</option>
                <option value="cost-center">By Cost Center</option>
                <option value="gl-account">By GL Account</option>
              </select>
            </div>

            {/* Comparisons */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Include Comparisons
              </label>
              <div className="space-y-2">
                {[
                  { key: "budget" as const, label: "Budget Variance" },
                  { key: "priorYear" as const, label: "Prior Year Comparison" },
                  {
                    key: "priorPeriod" as const,
                    label: "Prior Period Comparison",
                  },
                ].map((comp) => (
                  <label
                    key={comp.key}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={includeComparisons[comp.key]}
                      onChange={() => toggleComparison(comp.key)}
                      className="rounded border-border/30"
                    />
                    <span className="text-sm text-foreground">
                      {comp.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-xs text-foreground/70">
                💡 <strong>Tip:</strong> This widget will display real-time
                financial data from EchoAurum. You can update the metrics and
                period at any time, and the data will automatically refresh.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-border/30">
              <Button
                onClick={() => setIsOpen(false)}
                variant="outline"
                className="text-foreground/70 hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateWidget}
                disabled={
                  !widgetName.trim() ||
                  selectedMetrics.length === 0 ||
                  selectedOutlets.length === 0
                }
                className="flex items-center gap-2"
              >
                <Save size={16} />
                Create Widget
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
