import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  EyeOff,
  GripVertical,
  Layers,
  RotateCcw,
  Settings2,
} from "lucide-react";
export interface DashboardWidgetDefinition {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  layoutClass?: string;
  render: () => ReactNode;
}
interface DashboardWorkspaceProps {
  widgets: DashboardWidgetDefinition[];
  children?: ReactNode;
  className?: string;
}
interface DashboardCustomizationContextValue {
  isCustomizing: boolean;
  setIsCustomizing: React.Dispatch<React.SetStateAction<boolean>>;
  hiddenWidgets: string[];
  toggleWidgetVisibility: (id: string) => void;
  resetLayout: () => void;
  availableWidgets: DashboardWidgetDefinition[];
}
const DashboardCustomizationContext =
  createContext<DashboardCustomizationContextValue | null>(null);
export const useDashboardCustomization = () => {
  const context = useContext(DashboardCustomizationContext);
  if (!context) {
    throw new Error(
      "useDashboardCustomization must be used within DashboardWorkspace",
    );
  }
  return context;
};
interface WidgetContainerProps {
  widget: DashboardWidgetDefinition;
  collapsed: boolean;
  isCustomizing: boolean;
  onCollapse: () => void;
  onHide: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDropTarget: boolean;
  children: ReactNode;
}
function WidgetContainer({
  widget,
  collapsed,
  isCustomizing,
  onCollapse,
  onHide,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDropTarget,
  children,
}: WidgetContainerProps) {
  return (
    <div className={cn("col-span-12", widget.layoutClass ?? "lg:col-span-6")}>
      {" "}
      <div
        className={cn(
          "group relative rounded-xl border border-border/30 bg-background p-4 shadow-sm transition-all dark:border-slate-800/70 dark:bg-surface",
          collapsed ? "pb-3" : "pb-4",
          isCustomizing && "ring-1 ring-primary/30",
          isDropTarget && "border-primary/60 shadow-md",
          isDragging && "opacity-70",
        )}
        draggable={isCustomizing}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        role={isCustomizing ? "listitem" : undefined}
        aria-grabbed={isCustomizing ? isDragging : undefined}
      >
        {" "}
        <div className="flex items-start justify-between gap-3">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <widget.icon className="h-4 w-4 text-primary" />{" "}
            <div className="flex flex-col">
              {" "}
              <p className="text-sm font-semibold leading-tight text-foreground">
                {" "}
                {widget.title}{" "}
              </p>{" "}
              {widget.description && (
                <span className="text-xs text-muted-foreground">
                  {widget.description}
                </span>
              )}{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex items-center gap-1">
            {" "}
            {isCustomizing && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={onMoveUp}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border/50 bg-transparent text-muted-foreground transition hover:border-border hover:text-foreground"
                  aria-label={"Move" + widget.title + " up"}
                >
                  {" "}
                  <ArrowUp className="h-4 w-4" />{" "}
                </button>{" "}
                <button
                  type="button"
                  onClick={onMoveDown}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border/50 bg-transparent text-muted-foreground transition hover:border-border hover:text-foreground"
                  aria-label={"Move" + widget.title + " down"}
                >
                  {" "}
                  <ArrowDown className="h-4 w-4" />{" "}
                </button>{" "}
                <button
                  type="button"
                  onClick={onHide}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border/50 bg-transparent text-muted-foreground transition hover:border-border hover:text-red-500"
                  aria-label={"Hide" + widget.title}
                >
                  {" "}
                  <EyeOff className="h-4 w-4" />{" "}
                </button>{" "}
              </>
            )}{" "}
            <button
              type="button"
              onClick={onCollapse}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md border border-border/50 bg-transparent text-muted-foreground transition hover:border-border hover:text-foreground",
                collapsed && "rotate-180",
              )}
              aria-label={collapsed ? "Expand widget" : "Collapse widget"}
            >
              {" "}
              <ChevronDown className="h-4 w-4" />{" "}
            </button>{" "}
            {isCustomizing && (
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-border/60 text-muted-foreground">
                {" "}
                <GripVertical className="h-4 w-4" />{" "}
              </div>
            )}{" "}
          </div>{" "}
        </div>{" "}
        {!collapsed && <div className="mt-3">{children}</div>}{" "}
      </div>{" "}
    </div>
  );
}
const ensureWidgetInOrder = (
  currentOrder: string[],
  widgetId: string,
  defaultOrder: string[],
) => {
  if (currentOrder.includes(widgetId)) {
    return currentOrder;
  }
  const defaultIndex = defaultOrder.indexOf(widgetId);
  if (defaultIndex === -1) {
    return [...currentOrder, widgetId];
  }
  for (let i = defaultIndex + 1; i < defaultOrder.length; i += 1) {
    const nextId = defaultOrder[i];
    const targetIndex = currentOrder.indexOf(nextId);
    if (targetIndex !== -1) {
      const nextOrder = [...currentOrder];
      nextOrder.splice(targetIndex, 0, widgetId);
      return nextOrder;
    }
  }
  return [...currentOrder, widgetId];
};
export function DashboardWorkspace({
  widgets,
  children,
  className,
}: DashboardWorkspaceProps) {
  const { preferences, updatePreference, updatePreferences } =
    useUserPreferences();
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const widgetMap = useMemo(() => {
    const map = new Map<string, DashboardWidgetDefinition>();
    widgets.forEach((widget) => {
      map.set(widget.id, widget);
    });
    return map;
  }, [widgets]);
  const defaultOrder = useMemo(
    () => widgets.map((widget) => widget.id),
    [widgets],
  );
  const sanitizedHidden = useMemo(
    () => preferences.hiddenWidgets.filter((id) => widgetMap.has(id)),
    [preferences.hiddenWidgets, widgetMap],
  );
  const hiddenSet = useMemo(
    () => new Set<string>(sanitizedHidden),
    [sanitizedHidden],
  );
  const sanitizedCollapsed = useMemo(
    () => preferences.collapsedWidgets.filter((id) => widgetMap.has(id)),
    [preferences.collapsedWidgets, widgetMap],
  );
  const collapsedSet = useMemo(
    () => new Set<string>(sanitizedCollapsed),
    [sanitizedCollapsed],
  );
  const cleanedOrder = useMemo(() => {
    const order = preferences.widgetOrder.filter((id) => widgetMap.has(id));
    const missing = defaultOrder.filter((id) => !order.includes(id));
    return [...order, ...missing];
  }, [preferences.widgetOrder, widgetMap, defaultOrder]);
  const visibleOrder = useMemo(
    () => cleanedOrder.filter((id) => !hiddenSet.has(id)),
    [cleanedOrder, hiddenSet],
  );
  const handleDrop = useCallback(
    (dragId: string, targetId: string) => {
      if (dragId === targetId) return;
      const reordered = [...cleanedOrder];
      const dragIndex = reordered.indexOf(dragId);
      const targetIndex = reordered.indexOf(targetId);
      if (dragIndex === -1 || targetIndex === -1) {
        return;
      }
      reordered.splice(dragIndex, 1);
      reordered.splice(targetIndex, 0, dragId);
      updatePreference("widgetOrder", reordered);
    },
    [cleanedOrder, updatePreference],
  );
  const moveWidget = useCallback(
    (widgetId: string, direction: "up" | "down") => {
      const order = [...cleanedOrder];
      const currentIndex = order.indexOf(widgetId);
      if (currentIndex === -1) return;
      const offset = direction === "up" ? -1 : 1;
      let targetIndex = currentIndex + offset;
      while (targetIndex >= 0 && targetIndex < order.length) {
        const targetId = order[targetIndex];
        if (!hiddenSet.has(targetId)) {
          break;
        }
        targetIndex += offset;
      }
      if (targetIndex < 0 || targetIndex >= order.length) {
        return;
      }
      const reordered = [...order];
      const [removed] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, removed);
      updatePreference("widgetOrder", reordered);
    },
    [cleanedOrder, hiddenSet, updatePreference],
  );
  const toggleWidgetVisibility = useCallback(
    (widgetId: string) => {
      if (!widgetMap.has(widgetId)) return;
      if (hiddenSet.has(widgetId)) {
        const nextHidden = sanitizedHidden.filter((id) => id !== widgetId);
        const nextOrder = ensureWidgetInOrder(
          cleanedOrder,
          widgetId,
          defaultOrder,
        );
        updatePreferences({
          hiddenWidgets: nextHidden,
          widgetOrder: nextOrder,
        });
      } else {
        const nextHidden = [...sanitizedHidden, widgetId];
        updatePreference("hiddenWidgets", nextHidden);
      }
    },
    [
      cleanedOrder,
      defaultOrder,
      hiddenSet,
      sanitizedHidden,
      updatePreference,
      updatePreferences,
      widgetMap,
    ],
  );
  const toggleCollapse = useCallback(
    (widgetId: string) => {
      if (!widgetMap.has(widgetId)) return;
      if (collapsedSet.has(widgetId)) {
        const next = sanitizedCollapsed.filter((id) => id !== widgetId);
        updatePreference("collapsedWidgets", next);
      } else {
        updatePreference("collapsedWidgets", [...sanitizedCollapsed, widgetId]);
      }
    },
    [collapsedSet, sanitizedCollapsed, updatePreference, widgetMap],
  );
  const resetLayout = useCallback(() => {
    updatePreferences({
      widgetOrder: defaultOrder,
      hiddenWidgets: [],
      collapsedWidgets: [],
    });
    setIsCustomizing(false);
  }, [defaultOrder, updatePreferences]);
  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>, widgetId: string) => {
      setDraggingId(widgetId);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", widgetId);
    },
    [],
  );
  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>, widgetId: string) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDropTargetId(widgetId);
    },
    [],
  );
  const handleDropEvent = useCallback(
    (event: React.DragEvent<HTMLDivElement>, widgetId: string) => {
      event.preventDefault();
      const dragId = event.dataTransfer.getData("text/plain");
      if (dragId) {
        handleDrop(dragId, widgetId);
      }
      setDropTargetId(null);
      setDraggingId(null);
    },
    [handleDrop],
  );
  const handleDragEnd = useCallback(() => {
    setDropTargetId(null);
    setDraggingId(null);
  }, []);
  const contextValue = useMemo<DashboardCustomizationContextValue>(
    () => ({
      isCustomizing,
      setIsCustomizing,
      hiddenWidgets: sanitizedHidden,
      toggleWidgetVisibility,
      resetLayout,
      availableWidgets: widgets,
    }),
    [
      isCustomizing,
      sanitizedHidden,
      toggleWidgetVisibility,
      resetLayout,
      widgets,
    ],
  );
  return (
    <DashboardCustomizationContext.Provider value={contextValue}>
      {" "}
      {children}{" "}
      <div
        className={cn(
          "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12",
          className,
          isCustomizing && "relative",
        )}
        role={isCustomizing ? "list" : undefined}
      >
        {" "}
        {visibleOrder.map((widgetId) => {
          const widget = widgetMap.get(widgetId);
          if (!widget) return null;
          const collapsed = collapsedSet.has(widgetId);
          return (
            <WidgetContainer
              key={widget.id}
              widget={widget}
              collapsed={collapsed}
              isCustomizing={isCustomizing}
              onCollapse={() => toggleCollapse(widget.id)}
              onHide={() => toggleWidgetVisibility(widget.id)}
              onMoveUp={() => moveWidget(widget.id, "up")}
              onMoveDown={() => moveWidget(widget.id, "down")}
              onDragStart={(event) => handleDragStart(event, widget.id)}
              onDragOver={(event) => handleDragOver(event, widget.id)}
              onDrop={(event) => handleDropEvent(event, widget.id)}
              onDragEnd={handleDragEnd}
              isDragging={draggingId === widget.id}
              isDropTarget={dropTargetId === widget.id}
            >
              {" "}
              {!collapsed && widget.render()}{" "}
            </WidgetContainer>
          );
        })}{" "}
      </div>{" "}
    </DashboardCustomizationContext.Provider>
  );
}
export function DashboardControls({ className }: { className?: string }) {
  const {
    isCustomizing,
    setIsCustomizing,
    hiddenWidgets,
    toggleWidgetVisibility,
    resetLayout,
    availableWidgets,
  } = useDashboardCustomization();
  const handleToggle = useCallback(() => {
    setIsCustomizing((prev) => !prev);
  }, [setIsCustomizing]);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {" "}
      <DropdownMenu>
        {" "}
        <DropdownMenuTrigger className="inline-flex h-8 items-center justify-center gap-2 rounded-full border border-border/60 bg-background px-3 text-xs font-medium outline-none hover:bg-accent focus:ring-2 focus:ring-ring">
          {" "}
          <Layers className="mr-2 h-3.5 w-3.5" /> Widgets{" "}
        </DropdownMenuTrigger>{" "}
        <DropdownMenuContent
          className="w-52 rounded-lg border border-border/40 bg-background p-1 text-sm shadow-lg dark:border-slate-800 dark:bg-surface"
          align="end"
        >
          {" "}
          <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-muted-foreground">
            {" "}
            Toggle dashboard widgets{" "}
          </DropdownMenuLabel>{" "}
          <DropdownMenuSeparator className="mx-2" />{" "}
          {availableWidgets.map((widget) => {
            const checked = !hiddenWidgets.includes(widget.id);
            return (
              <DropdownMenuCheckboxItem
                key={widget.id}
                checked={checked}
                onCheckedChange={() => toggleWidgetVisibility(widget.id)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs"
              >
                {" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <widget.icon className="h-3.5 w-3.5" />{" "}
                  <span className="truncate">{widget.title}</span>{" "}
                </div>{" "}
              </DropdownMenuCheckboxItem>
            );
          })}{" "}
        </DropdownMenuContent>{" "}
      </DropdownMenu>{" "}
      <Button
        variant={isCustomizing ? "default" : "outline"}
        size="sm"
        className={cn(
          "h-8 rounded-full px-3 text-xs font-semibold",
          isCustomizing
            ? "bg-primary text-primary-foreground"
            : "border-border/60",
        )}
        onClick={handleToggle}
      >
        {" "}
        <Settings2 className="mr-2 h-3.5 w-3.5" />{" "}
        {isCustomizing ? "Done" : "Customize"}{" "}
      </Button>{" "}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 rounded-full px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
        onClick={resetLayout}
      >
        {" "}
        <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reset{" "}
      </Button>{" "}
    </div>
  );
}
export function DashboardVisibilityIndicator({
  className,
}: {
  className?: string;
}) {
  const { hiddenWidgets, availableWidgets } = useDashboardCustomization();
  if (hiddenWidgets.length === 0) {
    return null;
  }
  const hiddenTitles = availableWidgets
    .filter((widget) => hiddenWidgets.includes(widget.id))
    .map((widget) => widget.title)
    .join(",");
  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      {" "}
      Hidden widgets: {hiddenTitles}{" "}
    </span>
  );
}
