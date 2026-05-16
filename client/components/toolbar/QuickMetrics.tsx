import { useState, useRef, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/glass";
import { safeFetchJson } from "@/lib/safe-fetch";

interface Metric {
  label: string;
  value: string;
  change: number;
  icon: string;
}

interface OpsMetricsResponse {
  revenue: number;
  covers: number;
  avgCheck: number;
  laborPct: number;
  trendRevenue?: number;
  trendCovers?: number;
  trendAvgCheck?: number;
  trendLaborPct?: number;
}

export function QuickMetrics() {
  const [isOpen, setIsOpen] = useState(false);
  const metricsRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<Metric[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await safeFetchJson<OpsMetricsResponse>(
          "/api/dashboard/ops-metrics",
          {},
          null,
        );
        if (cancelled) return;
        if (!data) {
          setMetrics(null);
          return;
        }
        if (cancelled) return;
        setMetrics([
          { label: "Today's Revenue", value: `$${data.revenue.toLocaleString()}`, change: data.trendRevenue ?? 0, icon: "💵" },
          { label: "Covers Seated", value: String(data.covers), change: data.trendCovers ?? 0, icon: "👥" },
          { label: "Avg Check", value: `$${data.avgCheck.toFixed(2)}`, change: data.trendAvgCheck ?? 0, icon: "🧾" },
          { label: "Labor %", value: `${data.laborPct}%`, change: data.trendLaborPct ?? 0, icon: "👨‍💼" },
        ]);
      } catch {
        if (!cancelled) {
          setMetrics(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchMetrics();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (metricsRef.current && !metricsRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={metricsRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-7 w-7 rounded flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-primary/15 transition-colors flex-shrink-0"
        title="Quick Metrics"
      >
        <BarChart3 size={14} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-background/95 backdrop-blur-sm border border-border/30 rounded-lg shadow-xl z-50">
          {/* Header */}
          <div className="p-4 border-b border-border/30">
            <h3 className="font-semibold text-foreground text-sm">
              Today's Metrics
            </h3>
            <p className="text-xs text-foreground/60 mt-1">
              Real-time dashboard overview
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="p-4 space-y-3">
            {loading && (
              <div className="flex items-center justify-center py-8 text-foreground/60">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
            {error && (
              <div className="py-4 text-center text-sm text-destructive">{error}</div>
            )}
            {!loading && !error && metrics?.map((metric, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-background/60 border border-border/20 hover:border-border/40 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{metric.icon}</span>
                    <span className="text-xs font-medium text-foreground/70">
                      {metric.label}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded",
                      metric.change >= 0
                        ? "text-green-600 bg-green-500/20"
                        : "text-red-600 bg-red-500/20"
                    )}
                  >
                    {metric.change >= 0 ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    {Math.abs(metric.change)}%
                  </div>
                </div>
                <div className="text-lg font-bold text-foreground">
                  {metric.value}
                </div>
              </div>
            ))}
            {!loading && !error && !metrics?.length && (
              <div className="py-4 text-center text-sm text-foreground/60">No metrics available</div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/30">
            <button
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("open-panel", { detail: { id: "dashboard" } })
                );
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-foreground text-xs font-medium transition-colors"
            >
              View Full Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
