import React from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { osBus } from "@/lib/os-bus";
import { cn } from "@/lib/glass";

type SavedLayout = {
  id: string;
  name: string;
  roomWidth: number;
  roomLength: number;
  objects: any[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
};

function loadEchoLayouts(): SavedLayout[] {
  try {
    const raw = localStorage.getItem("echo_layouts");
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as SavedLayout[]) : [];
  } catch {
    return [];
  }
}

export function BeoLayoutIntegrationStep({
  eventId,
  venueName,
  selectedLayoutId,
  onSelectLayoutId,
}: {
  eventId: string;
  venueName: string;
  selectedLayoutId: string | null;
  onSelectLayoutId: (id: string | null) => void;
}) {
  const [layouts, setLayouts] = React.useState<SavedLayout[]>(() =>
    loadEchoLayouts(),
  );

  const refresh = React.useCallback(() => setLayouts(loadEchoLayouts()), []);

  const openEchoLayout = React.useCallback(() => {
    osBus.emit("ui:open_panel", {
      panelKey: "layout",
      payload: {
        eventId,
        venueName,
        source: "echoeventstudio:beo_builder",
      },
      focus: true,
      source: "EchoEventStudio",
    });
  }, [eventId, venueName]);

  const selected = selectedLayoutId
    ? (layouts.find((l) => l.id === selectedLayoutId) ?? null)
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">
            Layout & seating (EchoLayout)
          </div>
          <div className="text-xs text-muted-foreground">
            Design seating, buffet placement, stages, bars, egress—then attach
            the layout to this BEO.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="text-xs px-3 py-1.5 rounded-md border border-border/30 text-foreground/70 hover:text-foreground hover:bg-foreground/5 flex items-center gap-2"
            title="Reload saved layouts"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            type="button"
            onClick={openEchoLayout}
            className="text-xs px-3 py-1.5 rounded-md bg-primary/20 text-primary border border-primary/30 hover:bg-primary/25 flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" /> Open EchoLayout
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
        <div className="p-3 border-b border-border/10 flex items-center justify-between">
          <div className="text-xs font-semibold text-foreground">
            Attach a saved layout
          </div>
          {selected ? (
            <div className="text-[11px] text-foreground/60 truncate max-w-[55%]">
              Selected: <span className="text-foreground">{selected.name}</span>
            </div>
          ) : (
            <div className="text-[11px] text-foreground/60">
              No layout selected
            </div>
          )}
        </div>
        <div className="divide-y divide-border/10 max-h-[320px] overflow-auto">
          {layouts.map((l) => {
            const active = selectedLayoutId === l.id;
            const objCount = Array.isArray(l.objects) ? l.objects.length : 0;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => onSelectLayoutId(active ? null : l.id)}
                className={cn(
                  "w-full text-left px-3 py-2 hover:bg-foreground/5 transition-colors",
                  active && "bg-primary/10",
                )}
              >
                <div className="text-sm font-semibold text-foreground truncate">
                  {l.name}
                </div>
                <div className="text-[11px] text-foreground/60">
                  {Math.round(l.roomWidth)}×{Math.round(l.roomLength)} •{" "}
                  {objCount} objects • updated{" "}
                  {new Date(l.updatedAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </button>
            );
          })}
          {layouts.length === 0 ? (
            <div className="p-6 text-sm text-foreground/60">
              No EchoLayout layouts found yet. Open EchoLayout, save a layout,
              then come back and click Refresh.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
