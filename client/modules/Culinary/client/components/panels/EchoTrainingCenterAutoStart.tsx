import React, { useState } from "react";
import { EchoTrainingCenter } from "./EchoTrainingCenter";
import { useAutoTrainingStart } from "@/hooks/use-auto-training-start";
import { Button } from "@/components/ui/button";
import { AlertCircle, Play } from "lucide-react";

interface EchoTrainingCenterAutoStartProps {
  autoStart?: boolean;
  mode?: "sequential" | "parallel";
  className?: string;
}

/**
 * Wrapper component that auto-starts training
 * Can be toggled on/off via UI
 */
export function EchoTrainingCenterAutoStart({
  autoStart = true,
  mode = "sequential",
  className,
}: EchoTrainingCenterAutoStartProps) {
  const [isAutoStartEnabled, setIsAutoStartEnabled] = useState(autoStart);
  const [manuallyStarted, setManuallyStarted] = useState(false);

  useAutoTrainingStart(
    isAutoStartEnabled && !manuallyStarted,
    mode
  );

  const handleManualStart = () => {
    setManuallyStarted(true);
    setIsAutoStartEnabled(false);
  };

  return (
    <div className={className}>
      {/* Auto-start toggle */}
      {!manuallyStarted && (
        <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <AlertCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-blue-900 dark:text-blue-100">
                  Auto-Start Enabled
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  Training will begin automatically. You can disable this and configure sources instead.
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAutoStartEnabled(false)}
              className="whitespace-nowrap"
            >
              Configure
            </Button>
          </div>
        </div>
      )}

      {/* Main training center */}
      <EchoTrainingCenter />
    </div>
  );
}
