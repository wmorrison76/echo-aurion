/**
 * iter207d · EchoViewerDrawer
 *
 * A lightweight right-side drawer that listens for `echo:event:open-viewer`
 * events dispatched from contextual row buttons (iter207b) and shows every
 * live fact Echo knows about the target event. Also handles:
 *   - `echo:event:push-maestro` → POST /api/beo-builder/beos/{id}/push-maestro
 *   - `echo:event:open-aurum`   → scrolls to Aurum GL section of viewer
 */
import React from "react";
import { Loader2, RefreshCw } from "lucide-react";
import SidePanel from "@/lib/side-panel";
import { API } from "@/lib/api-url";

type ViewerData = {
  ok: boolean;
  event_id: string;
  event?: any;
  contact?: any;
  beo_draft?: any;
  beo?: any;
  maestro_dispatches?: any[];
  aurum_gl_entries?: any[];
  calendar_entries?: any[];
  timeline?: any[];
  summary?: Record<string, any>;
};

export default function EchoViewerDrawer() {
  const [open, setOpen] = React.useState(false);
  const [eventId, setEventId] = React.useState<string | null>(null);
  const [eventName, setEventName] = React.useState<string>("");
  const [data, setData] = React.useState<ViewerData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const load = React.useCallback(async (id: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${API()}/api/echo-viewer/event/${encodeURIComponent(id)}`);
      if (r.ok) setData(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      setEventId(d.id);
      setEventName(d.name || d.id);
      setOpen(true);
      if (d.id) load(d.id);
    };
    const onAurum = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      setEventId(d.id);
      setEventName(d.name || d.id);
      setOpen(true);
      if (d.id) {
        load(d.id).then(() => {
          setTimeout(() => {
            const el = document.querySelector('[data-testid="viewer-aurum-section"]');
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 250);
        });
      }
    };
    const onMaestro = async (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (!d.id) return;
      // Lookup the latest BEO for this event_id, then push to Maestro
      try {
        const viewer = await fetch(`${API()}/api/echo-viewer/event/${encodeURIComponent(d.id)}`);
        if (!viewer.ok) {
          setToast("Echo viewer unavailable — cannot resolve BEO.");
          return;
        }
        const body: ViewerData = await viewer.json();
        const beoId = body.beo?.beo_id;
        if (!beoId) {
          setToast(`No finalized BEO found for "${d.name || d.id}" — finalize one first.`);
          return;
        }
        const r = await fetch(`${API()}/api/beo-builder/beos/${encodeURIComponent(beoId)}/push-maestro`, {
          method: "POST",
        });
        if (r.ok) setToast(`✓ Pushed BEO ${beoId} → MaestroBQT`);
        else setToast(`Push failed (${r.status})`);
      } catch (err: any) {
        setToast(`Push error: ${err?.message || err}`);
      } finally {
        setTimeout(() => setToast(null), 4000);
      }
    };
    window.addEventListener("echo:event:open-viewer", onOpen as EventListener);
    window.addEventListener("echo:event:open-aurum", onAurum as EventListener);
    window.addEventListener("echo:event:push-maestro", onMaestro as EventListener);
    return () => {
      window.removeEventListener("echo:event:open-viewer", onOpen as EventListener);
      window.removeEventListener("echo:event:open-aurum", onAurum as EventListener);
      window.removeEventListener("echo:event:push-maestro", onMaestro as EventListener);
    };
  }, [load]);

  if (!open && !toast) return null;

  return (
    <>
      {toast && (
        <div
          data-testid="echo-viewer-toast"
          className="fixed bottom-6 right-6 z-[120] px-4 py-3 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-100 text-sm backdrop-blur-md shadow-xl"
        >
          {toast}
        </div>
      )}

      <SidePanel
        open={open}
        onClose={() => setOpen(false)}
        testId="echo-viewer-drawer"
        title={
          <>
            <div className="text-[10px] tracking-[3px] uppercase text-amber-400 font-bold">
              Echo Viewer · live event brief
            </div>
            <span className="block mt-1">{eventName || "—"}</span>
          </>
        }
        subtitle={<span className="font-mono">id: {eventId}</span>}
        headerActions={
          <button
            data-testid="echo-viewer-refresh"
            onClick={() => eventId && load(eventId)}
            className="p-2 rounded-md hover:bg-slate-800 text-slate-400"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        }
      >
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading live facts…
          </div>
        )}

        {data && (
          <div className="space-y-5">
            <SummaryStrip summary={data.summary} />
            <Section label="Event Record" testid="viewer-event-section">
              <Kv data={data.event} />
            </Section>
            <Section label="CRM Contact" testid="viewer-contact-section">
              <Kv data={data.contact} />
            </Section>
            <Section label="BEO Finalized" testid="viewer-beo-section">
              <Kv data={data.beo} />
            </Section>
            <Section label="BEO Draft" testid="viewer-beo-draft-section">
              <Kv data={data.beo_draft} />
            </Section>
            <Section label="MaestroBQT Dispatches" testid="viewer-maestro-section">
              <List items={data.maestro_dispatches} keys={["dispatched_at", "status", "beo_id"]} />
            </Section>
            <Section label="Aurum GL Journal" testid="viewer-aurum-section">
              <List items={data.aurum_gl_entries} keys={["posted_at", "gl_code", "amount", "status"]} />
            </Section>
            <Section label="Calendar Entries" testid="viewer-calendar-section">
              <List items={data.calendar_entries} keys={["title", "start", "dept"]} />
            </Section>
            <Section label={`Timeline · ${data.timeline?.length ?? 0} events`} testid="viewer-timeline-section">
              <List
                items={(data.timeline || []).slice(0, 20)}
                keys={["timestamp", "type", "actor"]}
                render={(it: any) => (
                  <div className="text-[11px]">
                    <span className="text-slate-500 font-mono">{(it.timestamp || "").slice(11, 19)}</span>
                    <span className="ml-2 text-amber-300">{it.type}</span>
                    <span className="ml-2 text-slate-400">{it.actor?.name || "system"}</span>
                  </div>
                )}
              />
            </Section>
          </div>
        )}

        {!loading && !data && (
          <div className="text-slate-500 text-sm">Nothing loaded yet.</div>
        )}
      </SidePanel>
    </>
  );
}

function SummaryStrip({ summary }: { summary?: Record<string, any> }) {
  if (!summary) return null;
  const pills = [
    { k: "Event", v: summary.has_event ? "✓" : "—", ok: !!summary.has_event },
    { k: "BEO", v: summary.has_finalized_beo ? summary.beo_status || "issued" : "—", ok: !!summary.has_finalized_beo },
    { k: "GL", v: summary.gl_code || "—", ok: !!summary.gl_code },
    { k: "Maestro", v: summary.maestro_pushed ? "pushed" : "—", ok: !!summary.maestro_pushed },
    { k: "Timeline", v: String(summary.timeline_events ?? 0), ok: (summary.timeline_events || 0) > 0 },
  ];
  return (
    <div data-testid="viewer-summary-strip" className="grid grid-cols-5 gap-2">
      {pills.map((p) => (
        <div
          key={p.k}
          className={`p-2 rounded-md border text-center ${p.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-700 bg-slate-900/50"}`}
        >
          <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{p.k}</div>
          <div className={`text-xs mt-0.5 ${p.ok ? "text-emerald-300" : "text-slate-500"}`}>{p.v}</div>
        </div>
      ))}
    </div>
  );
}

function Section({
  label,
  children,
  testid,
}: {
  label: string;
  children: React.ReactNode;
  testid?: string;
}) {
  return (
    <section data-testid={testid} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <div className="text-[10px] tracking-[2px] uppercase text-slate-500 font-bold mb-2">{label}</div>
      {children}
    </section>
  );
}

function Kv({ data }: { data: any }) {
  if (!data) return <div className="text-[11px] text-slate-600">— nothing on file —</div>;
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (entries.length === 0) return <div className="text-[11px] text-slate-600">— empty —</div>;
  return (
    <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1">
      {entries.slice(0, 24).map(([k, v]) => (
        <React.Fragment key={k}>
          <div className="text-[10px] text-slate-500 font-mono truncate">{k}</div>
          <div className="text-[11px] text-slate-200 break-all">
            {typeof v === "object" ? JSON.stringify(v).slice(0, 140) : String(v).slice(0, 140)}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function List({
  items,
  keys,
  render,
}: {
  items?: any[];
  keys: string[];
  render?: (it: any) => React.ReactNode;
}) {
  if (!items || items.length === 0) {
    return <div className="text-[11px] text-slate-600">— nothing on file —</div>;
  }
  return (
    <div className="space-y-1.5">
      {items.slice(0, 8).map((it, i) => (
        <div key={i} className="text-[11px] text-slate-300 py-1 px-2 rounded bg-slate-950/40 border border-slate-800">
          {render
            ? render(it)
            : keys.map((k) => (
                <span key={k} className="mr-3">
                  <span className="text-slate-500">{k}:</span>{" "}
                  <span className="text-slate-200">{String(it[k] ?? "—").slice(0, 40)}</span>
                </span>
              ))}
        </div>
      ))}
    </div>
  );
}
