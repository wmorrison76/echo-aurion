import React, { useState } from "react";
import { Plus, X, Save } from "lucide-react";
import { cn } from "@/lib/glass";
import { Button } from "@/components/ui/button";

export interface CustomWidget {
  id: string;
  name: string;
  metrics: string[];
  color?: string;
  createdAt: number;
  sharedWith?: string[];
}

interface CustomWidgetBuilderProps {
  onCreateWidget: (widget: CustomWidget) => void;
  existingWidgets?: CustomWidget[];
}

const AVAILABLE_METRICS = [
  { id: "labor-cost", label: "Labor Cost %", icon: "💼" },
  { id: "labor-hours", label: "Labor Hours", icon: "⏱️" },
  { id: "sales", label: "Sales Revenue", icon: "💵" },
  { id: "peak-sales", label: "Peak Sales Hour", icon: "📈" },
  { id: "purchase-history", label: "Purchase History", icon: "📋" },
  { id: "inventory", label: "Inventory Levels", icon: "📦" },
  { id: "food-cost", label: "Food Cost %", icon: "🍽️" },
  { id: "covers", label: "Covers Served", icon: "👥" },
  { id: "occupancy", label: "Table Occupancy", icon: "🏪" },
  { id: "avg-check", label: "Avg Check Size", icon: "💳" },
  { id: "waste", label: "Food Waste %", icon: "♻️" },
  { id: "delivery", label: "Delivery Status", icon: "🚚" },
];

const COLORS = [
  { name: "Blue", value: "from-blue-500/10 to-blue-400/5 border-blue-400/20" },
  { name: "Green", value: "from-green-500/10 to-green-400/5 border-green-400/20" },
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

export function CustomWidgetBuilder({
  onCreateWidget,
  existingWidgets = [],
}: CustomWidgetBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [widgetName, setWidgetName] = useState("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId)
        ? prev.filter((id) => id !== metricId)
        : [...prev, metricId],
    );
  };

  const handleCreateWidget = () => {
    if (!widgetName.trim() || selectedMetrics.length === 0) {
      alert("Please enter a widget name and select at least one metric");
      return;
    }

    const newWidget: CustomWidget = {
      id: `custom-${Date.now()}`,
      name: widgetName,
      metrics: selectedMetrics,
      color: selectedColor,
      createdAt: Date.now(),
      sharedWith: [],
    };

    onCreateWidget(newWidget);
    setWidgetName("");
    setSelectedMetrics([]);
    setSelectedColor(COLORS[0].value);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center w-7 h-7 rounded transition-all text-foreground/60 hover:text-foreground hover:bg-primary/10"
        title="Create a custom widget"
        type="button"
      >
        <Plus size={14} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-background border border-border/50 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 border-b border-border/30 bg-background/95 backdrop-blur p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Create Custom Widget
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-primary/10 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
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
              placeholder="e.g., Labor & Sales Summary"
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

          {/* Metrics Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Select Metrics ({selectedMetrics.length} selected)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AVAILABLE_METRICS.map((metric) => (
                <button
                  key={metric.id}
                  onClick={() => toggleMetric(metric.id)}
                  className={cn(
                    "p-3 rounded-lg border transition-all text-left text-sm",
                    selectedMetrics.includes(metric.id)
                      ? "bg-primary/20 border-primary/50 ring-1 ring-primary/30 text-foreground"
                      : "bg-background/60 border-border/30 text-foreground/70 hover:bg-background/80 hover:border-border/50",
                  )}
                >
                  <div className="text-lg mb-1">{metric.icon}</div>
                  <div className="font-medium">{metric.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-xs text-foreground/70">
              💡 <strong>Tip:</strong> Combine related metrics to monitor specific
              aspects of your restaurant. For example, pair "Labor Cost %" with
              "Covers Served" to track labor efficiency.
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
              disabled={!widgetName.trim() || selectedMetrics.length === 0}
              className="flex items-center gap-2"
            >
              <Save size={16} />
              Create Widget
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
