import { BarChart3, TrendingUp } from "lucide-react";
import { MiniPanel } from "../MiniPanel";
import { cn } from "@/lib/utils";
interface MetricCard {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
}
interface MetricsPanelProps {
  metrics?: MetricCard[];
  isMinimized?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
  size?: "small" | "medium" | "large";
  onSizeChange?: (size: "small" | "medium" | "large") => void;
}
const DEFAULT_METRICS: MetricCard[] = [
  { label: "Active Events", value: "12", change: 8 },
  { label: "Pipeline Value", value: "$485K", change: 12 },
  { label: "Conversion Rate", value: "34%", change: -2 },
  { label: "Avg Deal Size", value: "$42K", change: 5 },
];
export function MetricsPanel({
  metrics = DEFAULT_METRICS,
  isMinimized,
  onMinimize,
  onClose,
  size = "medium",
  onSizeChange,
}: MetricsPanelProps) {
  return (
    <MiniPanel
      id="metrics"
      title="Key Metrics"
      icon={<BarChart3 className="h-4 w-4" />}
      isMinimized={isMinimized}
      onMinimize={onMinimize}
      onClose={onClose}
      size={size}
      onSizeChange={onSizeChange}
    >
      {" "}
      <div className="grid grid-cols-2 gap-3">
        {" "}
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            className="p-3 rounded-lg bg-background border border-white/10 hover:bg-background transition-colors"
          >
            {" "}
            <p className="text-xs text-white/60 mb-1">{metric.label}</p>{" "}
            <div className="flex items-end justify-between gap-2">
              {" "}
              <span className="text-lg font-bold text-white">
                {" "}
                {metric.value}{" "}
              </span>{" "}
              {metric.change !== undefined && (
                <span
                  className={cn(
                    "text-xs font-semibold flex items-center gap-0.5",
                    metric.change >= 0 ? "text-green-400" : "text-red-400",
                  )}
                >
                  {" "}
                  <TrendingUp className="h-3 w-3" /> {Math.abs(metric.change)}
                  %{" "}
                </span>
              )}{" "}
            </div>{" "}
          </div>
        ))}{" "}
      </div>{" "}
    </MiniPanel>
  );
}
