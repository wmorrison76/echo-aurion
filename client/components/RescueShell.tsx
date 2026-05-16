import React from "react";
import { Button } from "@/components/ui/button";

type RescueShellProps = {
  moduleName: string;
  error: Error;
  onRetry?: () => void;
};

export function RescueShell({ moduleName, error, onRetry }: RescueShellProps) {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="max-w-lg space-y-4 rounded-xl border border-red-200 bg-red-50/40 p-6 text-left text-sm text-red-900">
        <div className="text-xs uppercase tracking-[0.3em] text-red-500">
          Panel Rescue Shell
        </div>
        <h3 className="text-lg font-semibold">Panel failed to load</h3>
        <p>
          We could not load <span className="font-semibold">{moduleName}</span>. The
          system captured diagnostics and logged this failure for review.
        </p>
        <div className="rounded-lg bg-red-100 p-3 text-xs text-red-800">
          {error.message}
        </div>
        <div className="flex flex-wrap gap-2">
          {onRetry && (
            <Button onClick={onRetry} size="sm">
              Retry Panel Load
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              }
            }}
          >
            Reload Shell
          </Button>
        </div>
      </div>
    </div>
  );
}
