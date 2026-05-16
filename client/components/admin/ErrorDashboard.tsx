import { useEffect, useState } from "react";
import { errorTracker } from "@/lib/error-tracker";
import { cn } from "@/lib/glass";
import { AlertCircle, AlertTriangle, Info, Trash2, RefreshCw } from "lucide-react";

interface ErrorLog {
  id: string;
  timestamp: number;
  level: "error" | "warning" | "info";
  category: string;
  message: string;
  details?: Record<string, any>;
}

export default function ErrorDashboard() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "error" | "warning" | "info">("all");
  const [loading, setLoading] = useState(false);

  const loadLogs = () => {
    setLoading(true);
    const allLogs = errorTracker.getLogs();
    let filtered = allLogs;

    if (filter !== "all") {
      filtered = filtered.filter((l) => l.level === filter);
    }

    setLogs(filtered.reverse());
    setStats(errorTracker.getStats());
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, [filter]);

  const handleClear = () => {
    if (confirm("Clear all error logs?")) {
      errorTracker.clearLogs();
      loadLogs();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-background to-background/50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/30">
        <h1 className="text-2xl font-bold text-foreground">Error Tracker</h1>
        <p className="text-sm text-foreground/60 mt-1">Monitor application errors and warnings</p>
      </div>

      {/* Stats */}
      <div className="px-6 py-4 border-b border-border/30 grid grid-cols-4 gap-4">
        <div className="p-3 bg-red-500/10 rounded border border-red-500/20">
          <p className="text-2xl font-bold text-red-600">{stats?.byLevel?.error || 0}</p>
          <p className="text-xs text-red-600/70">Errors</p>
        </div>
        <div className="p-3 bg-yellow-500/10 rounded border border-yellow-500/20">
          <p className="text-2xl font-bold text-yellow-600">{stats?.byLevel?.warning || 0}</p>
          <p className="text-xs text-yellow-600/70">Warnings</p>
        </div>
        <div className="p-3 bg-blue-500/10 rounded border border-blue-500/20">
          <p className="text-2xl font-bold text-blue-600">{stats?.byLevel?.info || 0}</p>
          <p className="text-xs text-blue-600/70">Info</p>
        </div>
        <div className="p-3 bg-primary/10 rounded border border-primary/20">
          <p className="text-2xl font-bold text-primary">{stats?.total || 0}</p>
          <p className="text-xs text-primary/70">Total</p>
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 py-3 border-b border-border/30 flex gap-2 items-center justify-between">
        <div className="flex gap-2">
          {["all", "error", "warning", "info"].map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level as any)}
              className={cn(
                "px-3 py-1 text-sm rounded transition-all",
                filter === level
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/60 hover:text-foreground hover:bg-primary/10"
              )}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadLogs}
            disabled={loading}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-foreground/60 hover:text-foreground hover:bg-primary/10 rounded transition-all"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-red-600/60 hover:text-red-600 hover:bg-red-500/10 rounded transition-all"
          >
            <Trash2 size={14} />
            Clear
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-2 p-6">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-foreground/50">No logs to display</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  "p-3 rounded border text-sm",
                  log.level === "error"
                    ? "bg-red-500/10 border-red-500/20"
                    : log.level === "warning"
                      ? "bg-yellow-500/10 border-yellow-500/20"
                      : "bg-blue-500/10 border-blue-500/20"
                )}
              >
                <div className="flex gap-2 items-start">
                  {log.level === "error" ? (
                    <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  ) : log.level === "warning" ? (
                    <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-2 items-center justify-between">
                      <div>
                        <span className="font-mono text-xs opacity-60">
                          {log.category}
                        </span>
                        <p className="text-sm font-medium text-foreground break-words">
                          {log.message}
                        </p>
                      </div>
                      <span className="text-xs text-foreground/40 flex-shrink-0 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {log.details && (
                      <pre className="text-xs opacity-60 mt-2 overflow-auto bg-black/20 p-2 rounded">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
