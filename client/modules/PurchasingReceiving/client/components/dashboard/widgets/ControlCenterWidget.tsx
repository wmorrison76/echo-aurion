import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";
import { Pin, PinOff, RotateCcw } from "lucide-react";
export interface ControlCenterPanelConfig {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
}
interface ControlCenterWidgetProps {
  panels: ControlCenterPanelConfig[];
  pinned: Set<string>;
  disabled: Set<string>;
  locked?: Set<string>;
  onToggleVisibility: (panelId: string, enabled: boolean) => void;
  onTogglePin: (panelId: string) => void;
  onReset: () => void;
}
export function ControlCenterWidget({
  panels,
  pinned,
  disabled,
  locked,
  onToggleVisibility,
  onTogglePin,
  onReset,
}: ControlCenterWidgetProps) {
  return (
    <div className="space-y-4">
      {" "}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {" "}
        <div>
          {" "}
          <h3 className="text-sm font-semibold text-slate-100">
            Panel registry
          </h3>{" "}
          <p className="text-xs text-slate-400">
            Enable, pin, or hide modules to tailor the command center.
          </p>{" "}
        </div>{" "}
        <Tooltip>
          {" "}
          <TooltipTrigger asChild>
            {" "}
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-xs"
              onClick={onReset}
            >
              {" "}
              <RotateCcw className="h-4 w-4" /> Reset layout{" "}
            </Button>{" "}
          </TooltipTrigger>{" "}
          <TooltipContent side="bottom">
            Restore default ordering, pins, and visibility
          </TooltipContent>{" "}
        </Tooltip>{" "}
      </div>{" "}
      <div className="space-y-3">
        {" "}
        {panels.map((panel) => {
          const Icon = panel.icon;
          const isDisabled = disabled.has(panel.id);
          const isPinned = pinned.has(panel.id);
          const status = isDisabled
            ? "Docked"
            : isPinned
              ? "Pinned"
              : "Workspace";
          const statusBadgeClass =
            status === "Docked"
              ? "bg-slate-700 text-slate-100"
              : status === "Pinned"
                ? "bg-amber-500/30 text-amber-50"
                : "bg-sky-500/20 text-sky-100";
          return (
            <div
              key={panel.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-slate-800/30 p-3"
            >
              {" "}
              <div className="flex min-w-[240px] items-center gap-3">
                {" "}
                <span className="rounded-md bg-slate-700/50 p-2 text-cyan-300">
                  {" "}
                  <Icon className="h-4 w-4" />{" "}
                </span>{" "}
                <div className="flex flex-col gap-1">
                  {" "}
                  <span className="text-sm font-semibold text-slate-50">
                    {panel.title}
                  </span>{" "}
                  {panel.description ? (
                    <span className="text-xs text-slate-300">
                      {panel.description}
                    </span>
                  ) : null}{" "}
                  <Badge
                    className={`w-fit text-[0.6rem] uppercase tracking-[0.3em] ${statusBadgeClass}`}
                  >
                    {status}
                  </Badge>{" "}
                </div>{" "}
              </div>{" "}
              <div className="flex items-center gap-3">
                {" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <Switch
                    checked={!isDisabled}
                    onCheckedChange={(checked) =>
                      onToggleVisibility(panel.id, checked)
                    }
                    aria-label={`Toggle visibility for ${panel.title}`}
                    disabled={locked?.has(panel.id)}
                  />{" "}
                  <span className="text-xs text-slate-400">Visible</span>{" "}
                </div>{" "}
                <Tooltip>
                  {" "}
                  <TooltipTrigger asChild>
                    {" "}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${isPinned ? "text-amber-200" : "text-slate-300"}`}
                      onClick={() => onTogglePin(panel.id)}
                      aria-label={
                        isPinned ? `Unpin ${panel.title}` : `Pin ${panel.title}`
                      }
                      disabled={isDisabled || locked?.has(panel.id)}
                    >
                      {" "}
                      {isPinned ? (
                        <PinOff className="h-4 w-4" />
                      ) : (
                        <Pin className="h-4 w-4" />
                      )}{" "}
                    </Button>{" "}
                  </TooltipTrigger>{" "}
                  <TooltipContent side="bottom">
                    {" "}
                    {isPinned ? "Unpin from top" : "Pin to top"}{" "}
                  </TooltipContent>{" "}
                </Tooltip>{" "}
              </div>{" "}
            </div>
          );
        })}{" "}
      </div>{" "}
    </div>
  );
}
