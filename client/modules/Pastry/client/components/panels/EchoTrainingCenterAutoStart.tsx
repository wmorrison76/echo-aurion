import React from "react";
import { EchoTrainingCenter } from "./EchoTrainingCenter";
import { useAutoTrainingStart } from "@/hooks/use-auto-training-start";
import { Button } from "@/components/ui/button";
import { AlertCircle, Play } from "lucide-react";
interface EchoTrainingCenterAutoStartProps {
  autoStart?: boolean;
  mode?: "sequential" | "parallel";
  className?: string;
} /** * Wrapper component that auto-starts training * Can be toggled on/off via UI */
export function EchoTrainingCenterAutoStart({
  autoStart = true,
  mode = "sequential",
  className,
}: EchoTrainingCenterAutoStartProps) {
  // Echo AI Training has been moved to the unified EchoAI³Complete interface
  // This module-level component is no longer used
  return null;
}
