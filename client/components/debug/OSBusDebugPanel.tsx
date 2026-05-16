import { useEffect, useMemo, useState } from "react";
import { osBus, type OSBusEventMap } from "@/lib/os-bus";

/**
 * OSBus Debug Panel
 * - Shows last N bus events in real-time
 * - Purely additive; safe to remove later
 */
export default function OSBusDebugPanel() {
  const [events, setEvents] = useState<
    { ts: string; name: keyof OSBusEventMap; payload: any }[]
  >([]);

  const subs = useMemo(
    () =>
      [
        "calendar:event_created",
        "calendar:event_updated",
        "maestro:event_received",
        "beo:created",
        "beo:updated",
        "genesis:a_saved",
        "genesis:b_saved",
        "procurement:plan_generated",
        "aurum:journal_entry_created",
        "ui:open_panel",
      ] as (keyof OSBusEventMap)[],
    [],
  );

  useEffect(() => {
    const unsubs = subs.map((name) =>
      osBus.on(name, (payload) => {
        setEvents((prev) => {
          const next = [
            { ts: new Date().toLocaleTimeString(), name, payload },
            ...prev,
          ];
          return next.slice(0, 25);
        });
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [subs]);

  return (
    <div
      style={{
        padding: 12,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>OS Bus Debug</div>
      <div style={{ opacity: 0.7, marginBottom: 8 }}>
        Last {events.length} events
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {events.map((e, idx) => (
          <div
            key={idx}
            style={{
              border: "1px solid rgba(0,0,0,0.15)",
              borderRadius: 10,
              padding: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <span>
                <strong>{String(e.name)}</strong>
              </span>
              <span style={{ opacity: 0.7 }}>{e.ts}</span>
            </div>
            <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(e.payload, null, 2)}
            </pre>
          </div>
        ))}
        {events.length === 0 && (
          <div style={{ opacity: 0.7 }}>
            No events yet. Create/update an event to test.
          </div>
        )}
      </div>
    </div>
  );
}
