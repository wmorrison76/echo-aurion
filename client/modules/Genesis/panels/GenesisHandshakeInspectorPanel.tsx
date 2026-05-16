/**
 * Genesis Handshake Inspector Panel (Phase 3)
 * View and trace handshake contract events (genesis:* and aurum:*)
 */

import React from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listAuditEntries } from "@/lib/genesis-audit-store";
import { getCurrentUser } from "@/stores/genesisAuthStore";
import { getPermissionDescription } from "@/lib/genesis/permissions/permissionChecks";
import { PermissionGate } from "@/lib/genesis/ui/uiGuards";

type EventTrace = {
  eventId: string;
  eventType: string;
  timestamp: string;
  idempotencyKey: string;
  correlationId: string;
  causationId?: string;
  actor?: { userId?: string; role?: string; system?: string };
  explain: string;
  payload?: any;
};

function eventColor(eventType: string): string {
  if (eventType.startsWith("genesis:")) return "bg-blue-900/20 text-blue-200";
  if (eventType.startsWith("aurum:")) return "bg-amber-900/20 text-amber-200";
  return "bg-surface text-slate-200";
}

export default function GenesisHandshakeInspectorPanel() {
  const [user, setUser] = React.useState<any>(null);
  const [events, setEvents] = React.useState<EventTrace[]>([]);
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(
    null,
  );
  const [filterType, setFilterType] = React.useState<
    "ALL" | "GENESIS" | "AURUM"
  >("ALL");
  const [stats, setStats] = React.useState({
    totalEvents: 0,
    genesisEvents: 0,
    aurumEvents: 0,
    duplicateKeys: 0,
  });

  React.useEffect(() => {
    setUser(getCurrentUser());
    const auditEntries = listAuditEntries();
    const traces: EventTrace[] = auditEntries.map((entry: any) => ({
      eventId: entry.eventId,
      eventType: entry.eventType,
      timestamp: entry.timestamp,
      idempotencyKey: entry.idempotencyKey || "",
      correlationId: entry.correlationId || "",
      causationId: entry.causationId,
      actor: entry.actor,
      explain: entry.explain,
      payload: entry.payload,
    }));
    setEvents(traces);

    const genesisCnt = traces.filter((e) =>
      e.eventType.startsWith("genesis:"),
    ).length;
    const aurumCnt = traces.filter((e) =>
      e.eventType.startsWith("aurum:"),
    ).length;
    const keyMap = new Map<string, number>();
    for (const e of traces)
      keyMap.set(e.idempotencyKey, (keyMap.get(e.idempotencyKey) || 0) + 1);
    const duplicateCnt = Array.from(keyMap.values()).filter(
      (c) => c > 1,
    ).length;
    setStats({
      totalEvents: traces.length,
      genesisEvents: genesisCnt,
      aurumEvents: aurumCnt,
      duplicateKeys: duplicateCnt,
    });
  }, []);

  const selectedEvent = React.useMemo(
    () => events.find((e) => e.eventId === selectedEventId) || null,
    [events, selectedEventId],
  );

  const filteredEvents = React.useMemo(() => {
    if (filterType === "GENESIS")
      return events.filter((e) => e.eventType.startsWith("genesis:"));
    if (filterType === "AURUM")
      return events.filter((e) => e.eventType.startsWith("aurum:"));
    return events;
  }, [events, filterType]);

  const causeChain = React.useMemo(() => {
    if (!selectedEvent) return [];
    const chain: EventTrace[] = [];
    let currentId: string | undefined = selectedEvent.eventId;
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      const evt = events.find((e) => e.eventId === currentId);
      if (!evt) break;
      chain.push(evt);
      visited.add(currentId);
      currentId = evt.causationId || undefined;
    }
    return chain;
  }, [events, selectedEvent]);

  const sameIdempotency = React.useMemo(() => {
    if (!selectedEvent?.idempotencyKey) return [];
    return events.filter(
      (e) => e.idempotencyKey === selectedEvent.idempotencyKey,
    );
  }, [events, selectedEvent?.idempotencyKey]);

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      <div className="flex-shrink-0 border-b border-border/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-foreground">
              Genesis Handshake Inspector
            </div>
            <div className="text-sm text-foreground/70 mt-1">
              Audit log: genesis:* and aurum:* events with idempotency tracing
            </div>
          </div>
        </div>
      </div>

      <PermissionGate
        user={user}
        requiredPermission="AUDIT_VIEW"
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-semibold text-red-400">
                Access Denied
              </div>
              <div className="text-sm text-foreground/70 mt-2">
                Requires: {getPermissionDescription("AUDIT_VIEW")}
              </div>
            </div>
          </div>
        }
      >
        <div className="flex-shrink-0 border-b border-border/30 p-4">
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            <div>
              <div className="text-foreground/70">Total Events</div>
              <div className="text-lg font-semibold">{stats.totalEvents}</div>
            </div>
            <div>
              <div className="text-foreground/70">Genesis Events</div>
              <div className="text-lg font-semibold text-blue-400">
                {stats.genesisEvents}
              </div>
            </div>
            <div>
              <div className="text-foreground/70">Aurum Events</div>
              <div className="text-lg font-semibold text-amber-400">
                {stats.aurumEvents}
              </div>
            </div>
            <div>
              <div className="text-foreground/70">Duplicate Keys</div>
              <div
                className={
                  stats.duplicateKeys > 0
                    ? "text-lg font-semibold text-amber-400"
                    : "text-lg font-semibold text-green-400"
                }
              >
                {stats.duplicateKeys}
              </div>
            </div>
          </div>
        </div>

        <Tabs
          defaultValue="timeline"
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="flex-shrink-0 ml-4 mt-4 w-fit">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="causation">Causation Chain</TabsTrigger>
            <TabsTrigger value="idempotency">Idempotency</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="flex-1 overflow-auto p-4">
            <div className="flex gap-4 h-full">
              <div className="flex-shrink-0 w-40">
                <div className="space-y-2">
                  <button
                    onClick={() => setFilterType("ALL")}
                    className={`w-full px-3 py-2 rounded text-sm ${filterType === "ALL" ? "bg-primary text-white" : "bg-slate-700 hover:bg-slate-600 text-white"}`}
                  >
                    All ({stats.totalEvents})
                  </button>
                  <button
                    onClick={() => setFilterType("GENESIS")}
                    className={`w-full px-3 py-2 rounded text-sm ${filterType === "GENESIS" ? "bg-primary text-white" : "bg-slate-700 hover:bg-slate-600 text-white"}`}
                  >
                    Genesis ({stats.genesisEvents})
                  </button>
                  <button
                    onClick={() => setFilterType("AURUM")}
                    className={`w-full px-3 py-2 rounded text-sm ${filterType === "AURUM" ? "bg-primary text-white" : "bg-slate-700 hover:bg-slate-600 text-white"}`}
                  >
                    Aurum ({stats.aurumEvents})
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto space-y-1">
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((evt) => (
                    <Card
                      key={evt.eventId}
                      className={`p-2 cursor-pointer transition ${selectedEventId === evt.eventId ? "bg-primary/30 border-blue-500" : "hover:bg-slate-700/20"}`}
                      onClick={() => setSelectedEventId(evt.eventId)}
                    >
                      <Badge
                        className={`text-xs mb-1 ${eventColor(evt.eventType)}`}
                      >
                        {evt.eventType}
                      </Badge>
                      <div className="text-xs text-foreground/70 truncate">
                        {evt.explain}
                      </div>
                      <div className="text-xs text-foreground/50 mt-1">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="p-4 text-center text-foreground/70">
                    No events
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="details" className="flex-1 overflow-auto p-4">
            {selectedEvent ? (
              <div className="space-y-3">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">
                    {selectedEvent.eventType}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <div className="text-foreground/70">Event ID</div>
                      <div className="font-mono text-xs">
                        {selectedEvent.eventId}
                      </div>
                    </div>
                    <div>
                      <div className="text-foreground/70">Timestamp</div>
                      <div>
                        {new Date(selectedEvent.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-foreground/70">Idempotency Key</div>
                      <div className="font-mono text-xs">
                        {selectedEvent.idempotencyKey}
                      </div>
                    </div>
                    <div>
                      <div className="text-foreground/70">Correlation ID</div>
                      <div className="font-mono text-xs">
                        {selectedEvent.correlationId}
                      </div>
                    </div>
                    {selectedEvent.causationId ? (
                      <div>
                        <div className="text-foreground/70">Causation ID</div>
                        <div className="font-mono text-xs">
                          {selectedEvent.causationId}
                        </div>
                      </div>
                    ) : null}
                    <div>
                      <div className="text-foreground/70">Explanation</div>
                      <div className="text-xs">{selectedEvent.explain}</div>
                    </div>
                  </div>
                </Card>
                {selectedEvent.payload ? (
                  <Card className="p-4">
                    <h4 className="font-semibold mb-2 text-sm">Payload</h4>
                    <pre className="text-xs bg-black/30 p-2 rounded overflow-auto max-h-72">
                      {JSON.stringify(selectedEvent.payload, null, 2)}
                    </pre>
                  </Card>
                ) : null}
              </div>
            ) : (
              <Card className="p-4 text-center text-foreground/70">
                Select an event to view details
              </Card>
            )}
          </TabsContent>

          <TabsContent value="causation" className="flex-1 overflow-auto p-4">
            {selectedEvent ? (
              <div className="space-y-2">
                {causeChain.map((evt, idx) => (
                  <Card key={evt.eventId} className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="text-lg font-bold text-foreground/70 w-6">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <Badge
                          className={`text-xs mb-1 ${eventColor(evt.eventType)}`}
                        >
                          {evt.eventType}
                        </Badge>
                        <div className="text-xs text-foreground/70">
                          {evt.explain}
                        </div>
                        <div className="text-xs text-foreground/50 mt-1">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-4 text-center text-foreground/70">
                Select an event to view causation chain
              </Card>
            )}
          </TabsContent>

          <TabsContent value="idempotency" className="flex-1 overflow-auto p-4">
            {selectedEvent ? (
              <Card className="p-4">
                <h4 className="font-semibold mb-2">
                  Events with same idempotency key
                </h4>
                <div className="space-y-2">
                  {sameIdempotency.map((evt) => (
                    <div
                      key={evt.eventId}
                      className="p-2 bg-slate-700/20 rounded text-xs"
                    >
                      <div className="font-mono">{evt.eventType}</div>
                      <div className="text-foreground/70">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card className="p-4 text-center text-foreground/70">
                Select an event to view idempotency history
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </PermissionGate>
    </div>
  );
}
