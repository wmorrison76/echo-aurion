import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Zap,
  Wrench,
  Eye,
  Send,
  Play,
  Settings,
  MoreVertical,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Undo2,
  Code2,
} from "lucide-react";

interface ControlBarProps {
  phase: "idea" | "understanding" | "planning" | "implementation" | "complete";
  isLoading?: boolean;
  onGenerate?: () => void;
  onFix?: () => void;
  onAnalyze?: () => void;
  onDeploy?: () => void;
  onUndo?: () => void;
  onManualOverride?: () => void;
  canGenerate?: boolean;
  canDeploy?: boolean;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  phase,
  isLoading = false,
  onGenerate,
  onFix,
  onAnalyze,
  onDeploy,
  onUndo,
  onManualOverride,
  canGenerate = true,
  canDeploy = false,
}) => {
  const [manualMode, setManualMode] = useState(false);

  const getPhaseColor = () => {
    switch (phase) {
      case "idea":
        return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
      case "understanding":
        return "bg-purple-500/20 text-purple-700 dark:text-purple-400";
      case "planning":
        return "bg-amber-500/20 text-amber-700 dark:text-amber-400";
      case "implementation":
        return "bg-green-500/20 text-green-700 dark:text-green-400";
      case "complete":
        return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3 gap-4">
        {/* Left: Phase Indicator */}
        <div className="flex items-center gap-3">
          <Badge
            className={`${getPhaseColor()} border-none capitalize font-medium`}
          >
            {phase.replace("-", " ")}
          </Badge>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {phase === "complete" ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-amber-500" />
            )}
            <span>
              {isLoading
                ? "Processing..."
                : phase === "complete"
                  ? "Ready"
                  : "In Progress"}
            </span>
          </div>
        </div>

        {/* Center: Main Actions */}
        <div className="flex items-center gap-2">
          {/* Generate Button */}
          <Button
            onClick={onGenerate}
            disabled={!canGenerate || isLoading || manualMode}
            variant={phase === "planning" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            title="Auto-generate code from dialog understanding"
          >
            <Zap className="w-4 h-4" />
            Generate
          </Button>

          {/* Fix Button */}
          <Button
            onClick={onFix}
            disabled={isLoading || manualMode || phase === "idea"}
            variant="outline"
            size="sm"
            className="gap-2"
            title="Fix errors in current code"
          >
            <Wrench className="w-4 h-4" />
            Fix
          </Button>

          {/* Analyze Button */}
          <Button
            onClick={onAnalyze}
            disabled={isLoading || manualMode || phase !== "implementation"}
            variant="outline"
            size="sm"
            className="gap-2"
            title="Analyze current code and get suggestions"
          >
            <Eye className="w-4 h-4" />
            Analyze
          </Button>

          {/* Deploy Button */}
          <Button
            onClick={onDeploy}
            disabled={!canDeploy || isLoading || manualMode}
            variant={canDeploy ? "default" : "outline"}
            size="sm"
            className="gap-2"
            title="Deploy to production"
          >
            <Send className="w-4 h-4" />
            Deploy
          </Button>
        </div>

        {/* Right: Advanced Controls */}
        <div className="flex items-center gap-2">
          {/* Manual Mode Toggle */}
          <Button
            onClick={() => setManualMode(!manualMode)}
            variant={manualMode ? "default" : "outline"}
            size="sm"
            className="gap-2"
            title="Toggle manual code editing mode"
          >
            <Code2 className="w-4 h-4" />
            {manualMode ? "Manual" : "Auto"}
          </Button>

          {/* Undo */}
          <Button
            onClick={onUndo}
            disabled={isLoading || phase === "idea"}
            variant="outline"
            size="icon"
            title="Undo last action"
          >
            <Undo2 className="w-4 h-4" />
          </Button>

          {/* Settings Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" title="More options">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={onManualOverride}>
                <Code2 className="w-4 h-4 mr-2" />
                <span>Edit Code Directly</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                <span>Workflow Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <AlertCircle className="w-4 h-4 mr-2" />
                <span>View Error Log</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Play className="w-4 h-4 mr-2" />
                <span>View Build Progress</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Eye className="w-4 h-4 mr-2" />
                <span>View File Interactions</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status Bar - Additional info based on phase */}
      <div className="px-4 py-2 border-t border-border/30 text-xs text-muted-foreground bg-background/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>
              {manualMode
                ? "🔧 Manual Mode - Full code control enabled"
                : "🤖 Auto Mode - AI guiding the workflow"}
            </span>
          </div>
          <div className="text-right">
            {phase === "complete" && (
              <span className="text-green-600 dark:text-green-400 font-medium">
                ✓ System ready for deployment
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlBar;
