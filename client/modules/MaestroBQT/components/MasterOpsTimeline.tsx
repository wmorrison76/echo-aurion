import React from "react";
import type { Event, Space } from "../types";
import { cn } from "@/lib/glass";

function toDateKey(iso: string): string | null {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  try {
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function minutesSinceMidnight(iso: string): number | null {
  const d = new Date(iso);
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return null;
  return d.getHours() * 60 + d.getMinutes();
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function MasterOpsTimeline({
  events,
  spaces,
  daysAhead = 30,
}: {
  events: Event[];
  spaces: Space[];
  daysAhead?: number;
}) {
  const spacesById = React.useMemo(
    () => new Map(spaces.map((s) => [s.id, s])),
    [spaces],
  );

  const todayKey = React.useMemo(
    () => new Date().toISOString().slice(0, 10),
    [],
  );
  const endKey = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + Math.max(1, Math.round(daysAhead)));
    return d.toISOString().slice(0, 10);
  }, [daysAhead]);

  const grouped = React.useMemo(() => {
    type SpaceGroup = { spaceId: string; spaceName: string; events: Event[] };
    type DateGroup = { dateKey: string; spaces: SpaceGroup[] };

    const byDate = new Map<string, Map<string, SpaceGroup>>();

    for (const evt of events) {
      const dk = toDateKey(evt.startDateTime);
      if (!dk) continue;
      if (dk < todayKey || dk > endKey) continue;

      const spaceId = evt.spaceIds?.[0] ?? "space-unknown";
      const spaceName = spacesById.get(spaceId)?.name ?? spaceId;

      const spacesMap = byDate.get(dk) ?? new Map<string, SpaceGroup>();
      if (!byDate.has(dk)) byDate.set(dk, spacesMap);

      const sg = spacesMap.get(spaceId) ?? { spaceId, spaceName, events: [] };
      if (!spacesMap.has(spaceId)) spacesMap.set(spaceId, sg);

      sg.events.push(evt);
    }

    const out: DateGroup[] = [];
    for (const [dateKey, spacesMap] of byDate.entries()) {
      const spacesArr = Array.from(spacesMap.values()).map((sg) => ({
        ...sg,
        events: sg.events
          .slice()
          .sort(
            (a, b) =>
              new Date(a.startDateTime).getTime() -
              new Date(b.startDateTime).getTime(),
          ),
      }));
      spacesArr.sort((a, b) => a.spaceName.localeCompare(b.spaceName));
      out.push({ dateKey, spaces: spacesArr });
    }
    out.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    return out;
  }, [events, spacesById, todayKey, endKey]);

  // 06:00–22:00 operational window
  const windowStartMin = 6 * 60;
  const windowEndMin = 22 * 60;
  const windowSpan = windowEndMin - windowStartMin;

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border/20 bg-background/95 px-4 py-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">
          Master Ops Timeline
        </div>
        <div className="text-xs text-foreground/60">
          {todayKey} → {endKey}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {grouped.length === 0 ? (
          <div className="p-6 text-sm text-foreground/60">
            No events in range.
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {grouped.map((day) => (
              <div
                key={day.dateKey}
                className="rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm"
              >
                <div className="px-3 py-2 border-b border-border/20 flex items-center justify-between">
                  <div className="text-xs font-semibold text-foreground">
                    {day.dateKey}
                  </div>
                  <div className="text-[11px] text-foreground/60">
                    {day.spaces.length} spaces
                  </div>
                </div>

                <div className="p-2 space-y-2">
                  {day.spaces.map((sg) => (
                    <div
                      key={sg.spaceId}
                      className="rounded-md border border-border/20 bg-background/50"
                    >
                      <div className="px-2 py-1.5 border-b border-border/20 flex items-center justify-between">
                        <div className="text-xs font-medium text-foreground truncate">
                          {sg.spaceName}
                        </div>
                        <div className="text-[11px] text-foreground/60">
                          {sg.events.length} events
                        </div>
                      </div>

                      <div className="divide-y divide-border/10">
                        {sg.events.map((evt) => {
                          const startMin = minutesSinceMidnight(
                            evt.startDateTime,
                          );
                          const endMin = minutesSinceMidnight(evt.endDateTime);
                          const leftPct =
                            startMin === null
                              ? 0
                              : (clamp(startMin, windowStartMin, windowEndMin) -
                                  windowStartMin) /
                                windowSpan;
                          const rightPct =
                            endMin === null
                              ? 0
                              : (clamp(endMin, windowStartMin, windowEndMin) -
                                  windowStartMin) /
                                windowSpan;
                          const widthPct = clamp(rightPct - leftPct, 0.005, 1);

                          const timeLabel = (() => {
                            try {
                              const s = new Date(evt.startDateTime);
                              const e = new Date(evt.endDateTime);
                              if (
                                !Number.isFinite(s.getTime()) ||
                                !Number.isFinite(e.getTime())
                              )
                                return "—";
                              return `${s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–${e.toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}`;
                            } catch {
                              return "—";
                            }
                          })();

                          return (
                            <div
                              key={evt.id}
                              className="px-2 py-2 flex items-center gap-2"
                            >
                              <div className="w-[260px] min-w-[260px]">
                                <div className="text-xs font-medium text-foreground truncate">
                                  {evt.name}
                                </div>
                                <div className="text-[11px] text-foreground/60 truncate">
                                  {timeLabel} • {evt.guestCountExpected} guests
                                  • {evt.status}
                                </div>
                              </div>

                              <div className="flex-1">
                                <div className="relative h-4 rounded bg-foreground/5 border border-border/20 overflow-hidden">
                                  <div
                                    className={cn(
                                      "absolute top-0 bottom-0 rounded-sm",
                                      evt.status === "definite"
                                        ? "bg-primary/40"
                                        : evt.status === "tentative"
                                          ? "bg-amber-500/35"
                                          : evt.status === "in_house"
                                            ? "bg-green-500/35"
                                            : evt.status === "canceled"
                                              ? "bg-red-500/25"
                                              : "bg-foreground/15",
                                    )}
                                    style={{
                                      left: `${leftPct * 100}%`,
                                      width: `${widthPct * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
