import React, { useEffect, useState } from "react";
import { AlertTriangle, X, ChevronDown, CheckCircle, Zap } from "lucide-react";
import RealtimeSyncEngine from "./RealtimeSyncEngine";
import { RemoteChange } from "./types/CollaborationTypes";
import { cn } from "@/lib/glass";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
interface ConflictIndicatorBadgeProps {
  syncEngine: RealtimeSyncEngine | null;
  onResolveConflict?: (
    conflictId: string,
    resolution: "local" | "remote",
  ) => void;
  className?: string;
}
export const ConflictIndicatorBadge: React.FC<ConflictIndicatorBadgeProps> = ({
  syncEngine,
  onResolveConflict,
  className,
}) => {
  const [conflicts, setConflicts] = useState<Map<string, RemoteChange>>(
    new Map(),
  );
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!syncEngine) return;
    const updateConflicts = () => {
      const conflictMap = syncEngine.getConflicts();
      setConflicts(new Map(conflictMap));
    };
    updateConflicts();
    const interval = setInterval(updateConflicts, 500);
    return () => clearInterval(interval);
  }, [syncEngine]);
  if (conflicts.size === 0) {
    return null;
  }
  const handleClearConflict = (conflictId: string) => {
    syncEngine?.clearConflicts();
    setConflicts(new Map());
  };
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-sm dark:bg-red-900",
        className,
      )}
    >
      {" "}
      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />{" "}
      <span className="font-medium text-red-700 dark:text-red-200">
        {" "}
        {conflicts.size} conflict{conflicts.size !== 1 ? "s" : ""}{" "}
      </span>{" "}
      <DropdownMenu open={expanded} onOpenChange={setExpanded}>
        {" "}
        <DropdownMenuTrigger asChild>
          {" "}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-red-200 dark:hover:bg-red-800"
          >
            {" "}
            <ChevronDown className="h-4 w-4" />{" "}
          </Button>{" "}
        </DropdownMenuTrigger>{" "}
        <DropdownMenuContent align="end">
          {" "}
          {Array.from(conflicts.values()).map((conflict) => (
            <DropdownMenuItem key={conflict.changeId} disabled>
              {" "}
              <div className="w-full">
                {" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <Zap className="h-3 w-3 text-yellow-600" />{" "}
                  <span className="text-xs font-medium">
                    {" "}
                    {conflict.elementType}: {conflict.type}{" "}
                  </span>{" "}
                </div>{" "}
                <span className="text-xs text-muted-foreground">
                  {" "}
                  User: {conflict.userId}{" "}
                </span>{" "}
              </div>{" "}
            </DropdownMenuItem>
          ))}{" "}
          <div className="border-t border-slate-200 dark:border-border">
            {" "}
            <DropdownMenuItem
              onClick={() =>
                handleClearConflict(Array.from(conflicts.keys())[0])
              }
              className="text-xs font-medium text-red-600 dark:text-red-400"
            >
              {" "}
              <CheckCircle className="mr-2 h-3 w-3" /> Clear All Conflicts{" "}
            </DropdownMenuItem>{" "}
          </div>{" "}
        </DropdownMenuContent>{" "}
      </DropdownMenu>{" "}
      <button
        onClick={() => setConflicts(new Map())}
        className="ml-auto rounded hover:bg-red-200 dark:hover:bg-red-800"
      >
        {" "}
        <X className="h-4 w-4 text-red-600 dark:text-red-400" />{" "}
      </button>{" "}
    </div>
  );
};
export default ConflictIndicatorBadge;
