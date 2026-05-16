import React from "react";
import { cn } from "@/lib/glass";
import { downloadTextFile } from "@/lib/genesis/device/orderGuides/download";

type StoredPack = {
  id: string;
  importedAt: string;
  eventId: string;
  eventName: string;
  beoNumber?: string;
  clientName?: string;
  property?: string;
  startDateTime?: string;
  pack: any;
};

function storageKey(): string {
  return "maestroBqt:historicalPacks";
}

function safeParse(raw: string | null): StoredPack[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredPack[]) : [];
  } catch {
    return [];
  }
}

function save(list: StoredPack[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(), JSON.stringify(list.slice(0, 500)));
}

function load(): StoredPack[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(storageKey()));
}

function fmt(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "—";
    return d.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export function HistoricalLookupView() {
  const [query, setQuery] = React.useState("");
  const [packs, setPacks] = React.useState<StoredPack[]>(() => load());

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return packs;
    return packs.filter((p) => {
      const hay =
        `${p.eventName} ${p.beoNumber ?? ""} ${p.clientName ?? ""} ${p.property ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [packs, query]);

  const importPack = React.useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const event = parsed?.event ?? {};
    const eventId = String(
      event?.id ?? event?.eventId ?? parsed?.eventId ?? `event-${Date.now()}`,
    );
    const eventName = String(event?.name ?? event?.eventName ?? "Event");
    const id = `${eventId}:${Date.now()}`;
    const next: StoredPack = {
      id,
      importedAt: new Date().toISOString(),
      eventId,
      eventName,
      beoNumber: event?.metadata?.beoNumber ?? event?.beoNumber,
      clientName: event?.metadata?.clientName ?? event?.clientName,
      property: event?.metadata?.property ?? event?.property,
      startDateTime: event?.startDateTime ?? event?.start_time,
      pack: parsed,
    };
    setPacks((prev) => {
      const merged = [next, ...prev].slice(0, 500);
      save(merged);
      return merged;
    });
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border/20 bg-background/95 px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">
            Historical Lookup
          </div>
          <div className="text-xs text-foreground/60">
            Search archived Event Packs by client/group/BEO across years (local
            archive).
          </div>
        </div>
        <label className="text-xs px-3 py-1.5 rounded-md bg-primary/20 text-primary border border-primary/30 hover:bg-primary/25 transition-colors cursor-pointer">
          Import Event Pack (JSON)
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              void importPack(f);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      <div className="p-3 border-b border-border/10">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search client / group / BEO…"
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
        />
      </div>

      <div className="flex-1 overflow-auto p-3">
        {filtered.length === 0 ? (
          <div className="p-6 text-sm text-foreground/60">
            No archived packs yet. Export an Event Pack from Run-of-Show, then
            import it here.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {p.eventName}
                    </div>
                    <div className="text-xs text-foreground/60 truncate">
                      {p.clientName ?? "Client"} • {p.beoNumber ?? "BEO"} •{" "}
                      {fmt(p.startDateTime)} • {p.property ?? "Property"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-md border border-border/30 text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors",
                    )}
                    onClick={() =>
                      downloadTextFile(
                        `event-pack-${p.eventId}.json`,
                        JSON.stringify(p.pack, null, 2),
                      )
                    }
                  >
                    Download
                  </button>
                </div>
                <div className="mt-2 text-[11px] text-foreground/50">
                  Imported {fmt(p.importedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
