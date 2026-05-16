import React, { useEffect, useState } from "react";
import { AlertCircle, Loader } from "lucide-react";
import { MiniPanel } from "../MiniPanel";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
interface AssistantPanelProps {
  userId: string;
  isMinimized?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
  size?: "small" | "medium" | "large";
  onSizeChange?: (size: "small" | "medium" | "large") => void;
}
export function AssistantPanel({
  userId,
  isMinimized,
  onMinimize,
  onClose,
  size = "medium",
  onSizeChange,
}: AssistantPanelProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/assistant/data?userId=${userId}`);
        if (!response.ok) throw new Error("Failed to fetch assistant data");
        const json = await response.json();
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error || "No data available");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading data");
      } finally {
        setLoading(false);
      }
    };
    if (userId && userId !== "current-user") {
      fetchData();
    }
  }, [userId]);
  return (
    <MiniPanel
      id="assistant"
      title="Smart Assistant"
      icon={<Zap className="h-4 w-4" />}
      isMinimized={isMinimized}
      onMinimize={onMinimize}
      onClose={onClose}
      size={size}
      onSizeChange={onSizeChange}
    >
      {" "}
      {loading && (
        <div className="flex items-center justify-center py-8">
          {" "}
          <Loader className="h-5 w-5 animate-spin text-white/60" />{" "}
        </div>
      )}{" "}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded bg-red-500/10 border border-red-500/20">
          {" "}
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />{" "}
          <p className="text-xs text-red-300">{error}</p>{" "}
        </div>
      )}{" "}
      {data && !loading && !error && (
        <div className="space-y-3">
          {" "}
          <div>
            {" "}
            <p className="text-xs text-white/60 mb-1">Generated at</p>{" "}
            <p className="text-xs text-white">
              {" "}
              {new Date(data.generatedAt).toLocaleTimeString()}{" "}
            </p>{" "}
          </div>{" "}
          <div>
            {" "}
            <p className="text-xs text-white/60 mb-1">Status</p>{" "}
            <div className="flex flex-wrap gap-1">
              {" "}
              <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-300 text-xs">
                {" "}
                Active{" "}
              </span>{" "}
            </div>{" "}
          </div>{" "}
          {data.actionSummary && (
            <div>
              {" "}
              <p className="text-xs text-white/60 mb-1">Summary</p>{" "}
              <p className="text-xs text-white/80">{data.actionSummary}</p>{" "}
            </div>
          )}{" "}
        </div>
      )}{" "}
    </MiniPanel>
  );
}
