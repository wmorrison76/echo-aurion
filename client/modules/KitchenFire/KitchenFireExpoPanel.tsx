/**
 * Kitchen Fire Expo Panel — iter265.
 *
 * Single-pane-of-glass for the expo:
 *   · Active tickets grouped by state (open / in-progress / called)
 *   · Per-item state with fire/bump/fire-back actions
 *   · All-day count for the line
 *   · Recent callouts feed
 *   · Fire-back summary (chef accountability)
 *
 * Polls /api/kitchen-fire/tickets/active every 3 s for now. (TODO: swap to
 * SSE/WebSocket when echo-events bus is wired through preview-server.)
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Flame, Bell, RotateCcw, Check, AlertTriangle, Plus } from "lucide-react";

const API = `${import.meta.env.VITE_BACKEND_URL || ""}/api/kitchen-fire`;

interface FireItem {
  id: string;
  ticket_id: string;
  name: string;
  course: number;
  station_id: string;
  qty: number;
  state: "queued" | "fired" | "ready" | "bumped" | "fire_back";
  notes?: string;
  fire_back_count?: number;
}

interface FireTicket {
  id: string;
  table: string;
  server: string;
  party_size: number;
  state: "open" | "in_progress" | "expo_called" | "closed";
  fired_courses: number[];
  items: FireItem[];
  created_at: string;
}

interface Callout {
  id: string;
  ticket_id: string;
  table: string;
  minutes_out: number;
  message: string;
  called_at: string;
}

const STATE_COLORS: Record<FireItem["state"], string> = {
  queued: "bg-slate-100 text-slate-700 border-slate-300",
  fired: "bg-amber-100 text-amber-700 border-amber-400",
  ready: "bg-emerald-100 text-emerald-700 border-emerald-400",
  bumped: "bg-blue-100 text-blue-700 border-blue-400",
  fire_back: "bg-red-100 text-red-700 border-red-400",
};

export default function KitchenFireExpoPanel() {
  const [tickets, setTickets] = useState<FireTicket[]>([]);
  const [callouts, setCallouts] = useState<Callout[]>([]);
  const [allDay, setAllDay] = useState<Array<{ name: string; qty: number; station_id: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    try {
      setLoading(true);
      const [tRes, cRes, aRes] = await Promise.all([
        fetch(`${API}/tickets/active`).then((r) => r.json()),
        fetch(`${API}/callouts/recent?limit=10`).then((r) => r.json()),
        fetch(`${API}/all-day`).then((r) => r.json()),
      ]);
      setTickets(tRes.tickets || []);
      setCallouts(cRes.callouts || []);
      setAllDay(aRes.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, []);

  const grouped = useMemo(() => {
    const g: Record<string, FireTicket[]> = { open: [], in_progress: [], expo_called: [] };
    for (const t of tickets) {
      if (t.state in g) g[t.state].push(t);
    }
    return g;
  }, [tickets]);

  async function fireCourse(ticketId: string, course: number) {
    await fetch(`${API}/tickets/${ticketId}/fire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course }),
    });
    refresh();
  }

  async function callout(ticketId: string, minutes_out: number) {
    await fetch(`${API}/tickets/${ticketId}/callout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes_out, message: "" }),
    });
    refresh();
  }

  async function bump(itemId: string) {
    await fetch(`${API}/items/${itemId}/bump`, { method: "POST" });
    refresh();
  }

  async function expoBump(itemId: string) {
    await fetch(`${API}/items/${itemId}/expo-bump`, { method: "POST" });
    refresh();
  }

  async function fireBack(itemId: string, reason: string) {
    await fetch(`${API}/items/${itemId}/fire-back`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, action: "redo", notes: "" }),
    });
    refresh();
  }

  async function closeTicket(ticketId: string) {
    await fetch(`${API}/tickets/${ticketId}/close`, { method: "POST" });
    refresh();
  }

  return (
    <div className="p-4 space-y-4" data-testid="kitchen-fire-expo-panel">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Flame className="h-6 w-6 text-orange-500" />
          Kitchen Fire — Expo
          {loading && <span className="text-xs text-muted-foreground">syncing…</span>}
        </h2>
        <div className="flex gap-2">
          <NewTicketDialog onCreated={refresh} open={creating} setOpen={setCreating} />
          <Button variant="outline" size="sm" onClick={refresh} data-testid="fire-refresh-btn">
            <RotateCcw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </header>

      {/* Three columns: open / in-progress / called */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Column
          title="Open"
          tickets={grouped.open}
          fireCourse={fireCourse}
          callout={callout}
          bump={bump}
          expoBump={expoBump}
          fireBack={fireBack}
          closeTicket={closeTicket}
        />
        <Column
          title="In Progress"
          tickets={grouped.in_progress}
          fireCourse={fireCourse}
          callout={callout}
          bump={bump}
          expoBump={expoBump}
          fireBack={fireBack}
          closeTicket={closeTicket}
        />
        <Column
          title="Expo Called"
          tickets={grouped.expo_called}
          fireCourse={fireCourse}
          callout={callout}
          bump={bump}
          expoBump={expoBump}
          fireBack={fireBack}
          closeTicket={closeTicket}
        />
      </div>

      {/* Bottom row: all-day + callouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card data-testid="fire-allday-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">All-Day Count</CardTitle>
          </CardHeader>
          <CardContent>
            {allDay.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active items.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-1">Item</th>
                    <th className="py-1">Station</th>
                    <th className="py-1 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {allDay.map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1">{r.name}</td>
                      <td className="py-1 text-xs text-muted-foreground">{r.station_id}</td>
                      <td className="py-1 text-right font-semibold">{r.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card data-testid="fire-callouts-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" /> Recent Callouts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {callouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No callouts yet.</p>
            ) : (
              callouts.map((c) => (
                <div
                  key={c.id}
                  className="text-sm border-l-4 border-amber-400 pl-3 py-1 bg-amber-50/50"
                >
                  <p>
                    <strong>Table {c.table}</strong>
                    <span className="ml-2 text-amber-700">{c.minutes_out} min out</span>
                  </p>
                  {c.message && <p className="text-xs text-muted-foreground">{c.message}</p>}
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(c.called_at).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Column({
  title,
  tickets,
  fireCourse,
  callout,
  bump,
  expoBump,
  fireBack,
  closeTicket,
}: {
  title: string;
  tickets: FireTicket[];
  fireCourse: (id: string, c: number) => void;
  callout: (id: string, m: number) => void;
  bump: (id: string) => void;
  expoBump: (id: string) => void;
  fireBack: (id: string, reason: string) => void;
  closeTicket: (id: string) => void;
}) {
  return (
    <div className="space-y-2" data-testid={`fire-column-${title.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
        {title} <Badge variant="outline">{tickets.length}</Badge>
      </div>
      {tickets.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Empty</p>
      )}
      {tickets.map((t) => {
        const maxCourse = Math.max(0, ...t.items.map((i) => i.course));
        const nextCourse = (() => {
          for (let c = 1; c <= maxCourse; c++) {
            if (!t.fired_courses.includes(c)) return c;
          }
          return null;
        })();
        return (
          <Card key={t.id} className="border-l-4 border-orange-400" data-testid={`fire-ticket-${t.id}`}>
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  Table {t.table} · {t.server}
                </CardTitle>
                <div className="flex gap-1">
                  {nextCourse !== null && (
                    <Button
                      size="sm"
                      variant="default"
                      className="h-6 text-xs px-2"
                      onClick={() => fireCourse(t.id, nextCourse)}
                      data-testid={`fire-course-btn-${t.id}`}
                    >
                      <Flame className="h-3 w-3 mr-1" />
                      Fire C{nextCourse}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs px-2"
                    onClick={() => callout(t.id, 3)}
                  >
                    <Bell className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2"
                    onClick={() => closeTicket(t.id)}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Party {t.party_size} · Fired: {t.fired_courses.join(", ") || "none"}
              </p>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-1">
              {t.items.map((item) => (
                <div
                  key={item.id}
                  className={`text-xs px-2 py-1 rounded border ${STATE_COLORS[item.state]} flex items-center justify-between gap-1`}
                  data-testid={`fire-item-${item.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">C{item.course}·</span> {item.name} ×{item.qty}
                    {item.notes && <span className="opacity-70 ml-1">({item.notes})</span>}
                    {(item.fire_back_count ?? 0) > 0 && (
                      <AlertTriangle className="inline h-3 w-3 ml-1 text-red-600" />
                    )}
                  </div>
                  <div className="flex gap-0.5">
                    {item.state === "fired" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 px-1 text-[10px]"
                        onClick={() => bump(item.id)}
                      >
                        Ready
                      </Button>
                    )}
                    {item.state === "ready" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 px-1 text-[10px]"
                        onClick={() => expoBump(item.id)}
                      >
                        Bump
                      </Button>
                    )}
                    {(item.state === "fired" || item.state === "ready") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 px-1 text-[10px] text-red-600"
                        onClick={() => {
                          const r = prompt("Fire-back reason?");
                          if (r) fireBack(item.id, r);
                        }}
                      >
                        ↩
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function NewTicketDialog({
  onCreated,
  open,
  setOpen,
}: {
  onCreated: () => void;
  open: boolean;
  setOpen: (b: boolean) => void;
}) {
  const [table, setTable] = useState("");
  const [server, setServer] = useState("");
  const [party, setParty] = useState(2);
  const [itemsText, setItemsText] = useState(
    "1|Caesar Salad|stn-garde|2\n2|Filet Mignon|stn-grill|2|med-rare\n3|Creme Brulee|stn-pastry|2",
  );
  async function submit() {
    const items = itemsText
      .split("\n")
      .map((line) => line.split("|").map((s) => s.trim()))
      .filter((parts) => parts.length >= 4 && parts[1])
      .map((parts) => ({
        course: parseInt(parts[0]) || 1,
        name: parts[1],
        station_id: parts[2],
        qty: parseInt(parts[3]) || 1,
        notes: parts[4] || "",
      }));
    await fetch(`${API}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, server, party_size: party, items }),
    });
    setOpen(false);
    setTable("");
    setServer("");
    onCreated();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="new-fire-ticket-btn">
          <Plus className="h-4 w-4 mr-1" />
          New Ticket
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Fire Ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Table"
              value={table}
              onChange={(e) => setTable(e.target.value)}
              data-testid="new-ticket-table-input"
            />
            <Input
              placeholder="Server"
              value={server}
              onChange={(e) => setServer(e.target.value)}
              data-testid="new-ticket-server-input"
            />
            <Input
              type="number"
              placeholder="Party"
              value={party}
              onChange={(e) => setParty(parseInt(e.target.value) || 1)}
              data-testid="new-ticket-party-input"
            />
          </div>
          <textarea
            className="w-full h-32 border rounded p-2 text-xs font-mono"
            placeholder="course|name|station_id|qty|notes (one per line)"
            value={itemsText}
            onChange={(e) => setItemsText(e.target.value)}
            data-testid="new-ticket-items-textarea"
          />
          <Button onClick={submit} disabled={!table || !server} data-testid="submit-new-ticket-btn">
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
