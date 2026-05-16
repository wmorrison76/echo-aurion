import type { CSSProperties, ReactNode } from "react";
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, ChevronRight, EyeOff, Pin, PinOff } from "lucide-react";
interface DashboardPanelProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  isPinned?: boolean;
  isCollapsed?: boolean;
  disableHide?: boolean;
  dragAttributes?: DraggableAttributes;
  dragListeners?: DraggableSyntheticListeners;
  dragHandleRef?: (element: HTMLElement | null) => void;
  isDragging?: boolean;
  style?: CSSProperties;
  onTogglePin: () => void;
  onToggleCollapse: () => void;
  onDisable: () => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}
export function DashboardPanel({
  title,
  description,
  icon: Icon,
  isPinned = false,
  isCollapsed = false,
  disableHide = false,
  dragAttributes,
  dragListeners,
  dragHandleRef,
  isDragging = false,
  style,
  onTogglePin,
  onToggleCollapse,
  onDisable,
  children,
  className,
  contentClassName,
}: DashboardPanelProps) {
  return (
    <Card
      style={style}
      className={cn(
        "border border-slate-800/70 bg-card shadow-lg shadow-slate-950/40 backdrop-blur transition hover:border-border",
        isDragging && "ring-2 ring-sky-500/60",
        className,
      )}
    >
      {" "}
      <CardHeader
        ref={dragHandleRef}
        {...dragAttributes}
        {...dragListeners}
        className={cn(
          "flex flex-row items-start gap-4 border-b border-slate-800/60 bg-card py-4",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
      >
        {" "}
        <div className="flex flex-1 items-start gap-3">
          {" "}
          <span
            className={cn(
              "mt-1 rounded-lg bg-slate-800/80 p-2 text-sky-300",
              isPinned && "text-amber-300",
            )}
          >
            {" "}
            <Icon className="h-4 w-4" />{" "}
          </span>{" "}
          <div className="flex flex-col gap-1">
            {" "}
            <CardTitle className="text-lg font-semibold tracking-tight text-slate-100">
              {" "}
              {title}{" "}
            </CardTitle>{" "}
            {description ? (
              <CardDescription className="max-w-2xl text-sm text-slate-400">
                {" "}
                {description}{" "}
              </CardDescription>
            ) : null}{" "}
            {isPinned ? (
              <Badge
                variant="secondary"
                className="w-fit bg-amber-300/20 text-amber-200"
              >
                {" "}
                Pinned{" "}
              </Badge>
            ) : null}{" "}
          </div>{" "}
        </div>{" "}
        <div className="flex items-center gap-1">
          {" "}
          <Tooltip>
            {" "}
            <TooltipTrigger asChild>
              {" "}
              <Button
                variant="ghost"
                size="icon"
                aria-label={isCollapsed ? "Expand panel" : "Collapse panel"}
                className="h-8 w-8 text-slate-300 hover:text-white"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleCollapse();
                }}
              >
                {" "}
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}{" "}
              </Button>{" "}
            </TooltipTrigger>{" "}
            <TooltipContent side="bottom">
              {" "}
              {isCollapsed ? "Expand" : "Collapse"}{" "}
            </TooltipContent>{" "}
          </Tooltip>{" "}
          <Tooltip>
            {" "}
            <TooltipTrigger asChild>
              {" "}
              <Button
                variant="ghost"
                size="icon"
                aria-label={isPinned ? "Unpin panel" : "Pin panel"}
                className="h-8 w-8 text-slate-300 hover:text-white"
                onClick={(event) => {
                  event.stopPropagation();
                  onTogglePin();
                }}
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
              {isPinned ? "Unpin panel" : "Pin panel"}{" "}
            </TooltipContent>{" "}
          </Tooltip>{" "}
          <Tooltip>
            {" "}
            <TooltipTrigger asChild>
              {" "}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Hide panel"
                className="h-8 w-8 text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                disabled={disableHide}
                onClick={(event) => {
                  event.stopPropagation();
                  if (disableHide) return;
                  onDisable();
                }}
              >
                {" "}
                <EyeOff className="h-4 w-4" />{" "}
              </Button>{" "}
            </TooltipTrigger>{" "}
            <TooltipContent side="bottom">
              {" "}
              {disableHide ? "Required module" : "Hide from dashboard"}{" "}
            </TooltipContent>{" "}
          </Tooltip>{" "}
        </div>{" "}
      </CardHeader>{" "}
      <AnimatePresence initial={false} mode="wait">
        {" "}
        {!isCollapsed ? (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {" "}
            <CardContent className={cn("space-y-4 py-6", contentClassName)}>
              {" "}
              {children}{" "}
            </CardContent>{" "}
          </motion.div>
        ) : null}{" "}
      </AnimatePresence>{" "}
    </Card>
  );
}
