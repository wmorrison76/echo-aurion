import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/glass";

export type TimelineEntry = {
  time: string; // "HH:MM"
  label: string;
  department?: string;
  notes?: string;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function timeFromIso(iso: string, fallback = "17:00"): string {
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return fallback;
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return fallback;
  }
}

function addMinutes(hhmm: string, delta: number): string {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  const base = (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  const next = Math.max(0, base + delta);
  return `${pad(Math.floor(next / 60) % 24)}:${pad(next % 60)}`;
}

export function defaultTimeline(params: {
  startIso: string;
  endIso: string;
}): TimelineEntry[] {
  const start = timeFromIso(params.startIso, "17:00");
  const end = timeFromIso(params.endIso, "21:00");
  return [
    {
      time: addMinutes(start, -120),
      label: "BOH: Prep begins",
      department: "culinary",
    },
    {
      time: addMinutes(start, -90),
      label: "FOH: Setup begins",
      department: "banquetops",
    },
    {
      time: addMinutes(start, -60),
      label: "Vendors arrive / load-in",
      department: "events",
    },
    {
      time: addMinutes(start, -30),
      label: "Guests arrive",
      department: "banquetops",
    },
    { time: start, label: "Service begins", department: "banquetops" },
    {
      time: addMinutes(start, 30),
      label: "First course / buffet opens",
      department: "culinary",
    },
    {
      time: addMinutes(end, -30),
      label: "Last call / final touches",
      department: "bar",
    },
    {
      time: end,
      label: "Guest departure / service ends",
      department: "banquetops",
    },
    {
      time: addMinutes(end, 60),
      label: "Strike complete / room reset",
      department: "stewarding",
    },
  ];
}

export function BeoTimelineBuilder({
  startIso,
  endIso,
  value,
  onChange,
}: {
  startIso: string;
  endIso: string;
  value: TimelineEntry[];
  onChange: (next: TimelineEntry[]) => void;
}) {
  const items = value || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">
            Event timeline
          </div>
          <div className="text-xs text-muted-foreground">
            Guest arrival → guest departure, plus BOH/FOH milestones.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(defaultTimeline({ startIso, endIso }))}
            className="text-xs px-3 py-1.5 rounded-md border border-border/30 text-foreground/70 hover:text-foreground hover:bg-foreground/5"
          >
            Reset defaults
          </button>
          <button
            type="button"
            onClick={() =>
              onChange([
                ...items,
                { time: "00:00", label: "New timeline item" },
              ])
            }
            className="text-xs px-3 py-1.5 rounded-md bg-primary/20 text-primary border border-primary/30 hover:bg-primary/25 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
        <div className="divide-y divide-border/10">
          {items.map((it, idx) => (
            <div
              key={`${it.time}-${idx}`}
              className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2"
            >
              <div className="md:col-span-2">
                <label className="text-[11px] text-muted-foreground">
                  Time
                </label>
                <input
                  type="time"
                  value={it.time}
                  onChange={(e) => {
                    const next = items.slice();
                    next[idx] = { ...it, time: e.target.value };
                    onChange(next);
                  }}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
                />
              </div>
              <div className="md:col-span-4">
                <label className="text-[11px] text-muted-foreground">
                  Label
                </label>
                <input
                  value={it.label}
                  onChange={(e) => {
                    const next = items.slice();
                    next[idx] = { ...it, label: e.target.value };
                    onChange(next);
                  }}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
                />
              </div>
              <div className="md:col-span-3">
                <label className="text-[11px] text-muted-foreground">
                  Department
                </label>
                <input
                  value={it.department ?? ""}
                  onChange={(e) => {
                    const next = items.slice();
                    next[idx] = {
                      ...it,
                      department: e.target.value || undefined,
                    };
                    onChange(next);
                  }}
                  placeholder="events / culinary / banquetops..."
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[11px] text-muted-foreground">
                  Notes
                </label>
                <input
                  value={it.notes ?? ""}
                  onChange={(e) => {
                    const next = items.slice();
                    next[idx] = { ...it, notes: e.target.value || undefined };
                    onChange(next);
                  }}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
                />
              </div>
              <div className="md:col-span-1 flex items-end justify-end">
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, i) => i !== idx))}
                  className={cn(
                    "h-9 w-9 rounded-md border border-border/30 text-foreground/60 hover:text-foreground hover:bg-foreground/5 flex items-center justify-center",
                  )}
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No timeline entries yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
