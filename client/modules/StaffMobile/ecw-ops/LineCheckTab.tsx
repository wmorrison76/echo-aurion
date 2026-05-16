/** iter224 · Line Check tab — station → items → par adjust → temp check.
 * Flow: chef picks a station → sees today's items with EchoAi-suggested pars
 *       → taps each to confirm par observed / adjust par / record temp
 *       (perishable items auto-prompt temp; flags if out of range).
 * Completes the session → captures items_checked + temp_excursions.
 */
import React from "react";
import { API } from "@/lib/api-url";

type Station = { id: string; name: string };
type Item = {
  id: string; name: string; is_perishable: boolean;
  par_default: number; temp_min_c?: number; temp_max_c?: number;
  par_suggested?: { suggested: number; baseline: number; drivers: any };
};

export function LineCheckTab({ outletId }: { outletId: string }) {
  const [stations, setStations] = React.useState<Station[]>([]);
  const [station, setStation] = React.useState<Station | null>(null);
  const [session, setSession] = React.useState<any>(null);
  const [items, setItems] = React.useState<Item[]>([]);
  const [recordedIds, setRecordedIds] = React.useState<Record<string, any>>({});
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    fetch(`${API()}/api/ecw-ops/stations?outlet_id=${outletId}`)
      .then((r) => r.json())
      .then((d) => setStations(d?.rows || []));
  }, [outletId]);

  async function startStation(s: Station) {
    setLoading(true);
    try {
      const r = await fetch(`${API()}/api/ecw-ops/line-check/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
        body: JSON.stringify({ outlet_id: outletId, station_id: s.id }),
      }).then((r) => r.json());
      if (r.ok) {
        setStation(s); setSession(r.session); setItems(r.items || []);
        setRecordedIds({});
      }
    } finally { setLoading(false); }
  }

  async function recordItem(item: Item, parObserved: number, parAdjusted: number, tempC?: number, note?: string) {
    const r = await fetch(`${API()}/api/ecw-ops/line-check/record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: session.id, item_id: item.id,
        par_observed: parObserved, par_adjusted: parAdjusted,
        temp_c: tempC ?? null, note: note || null,
      }),
    }).then((r) => r.json());
    if (r.ok) setRecordedIds((prev) => ({ ...prev, [item.id]: r.record }));
  }

  async function completeSession() {
    const r = await fetch(`${API()}/api/ecw-ops/line-check/complete`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: session.id }),
    }).then((r) => r.json());
    if (r.ok) {
      alert(`Line check complete · ${r.session.items_checked} items · ${r.session.temp_excursions} temp excursions`);
      setStation(null); setSession(null); setItems([]);
    }
  }

  // Station picker
  if (!station) {
    return (
      <div data-testid="linecheck-root" style={{ padding: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Line Check</h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>Pick a station to start walk-through.</p>
        {stations.length === 0 && <div style={{ fontSize: 12, color: "#64748b" }}>Loading stations…</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {stations.map((s) => (
            <button key={s.id}
              data-testid={`linecheck-station-${s.id}`}
              onClick={() => void startStation(s)}
              disabled={loading}
              style={{
                padding: "14px 16px", background: "rgba(200,169,126,0.08)",
                border: "1px solid rgba(200,169,126,0.3)", borderRadius: 8,
                color: "#f5efe4", textAlign: "left", fontSize: 14, cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
              <span>{s.name}</span>
              <span style={{ color: "#c8a97e", fontSize: 11 }}>→</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Items checklist
  return (
    <div data-testid="linecheck-session-root" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: "#c8a97e", letterSpacing: 2 }}>LINE CHECK · {station.name.toUpperCase()}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
            {Object.keys(recordedIds).length} / {items.length} items
          </div>
        </div>
        <button data-testid="linecheck-back"
          onClick={() => { setStation(null); setSession(null); }}
          style={{ fontSize: 11, color: "#94a3b8", background: "none", border: "1px solid rgba(148,163,184,0.2)", padding: "4px 10px", borderRadius: 4, cursor: "pointer" }}>
          ← Switch station
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((it) => (
          <LineCheckItem key={it.id} item={it}
            recorded={recordedIds[it.id]}
            onRecord={(obs, adj, temp, note) => void recordItem(it, obs, adj, temp, note)} />
        ))}
      </div>

      <button data-testid="linecheck-complete"
        onClick={() => void completeSession()}
        disabled={Object.keys(recordedIds).length === 0}
        style={{
          marginTop: 18, width: "100%", padding: 14,
          background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)",
          borderRadius: 8, color: "#10b981", fontSize: 14, fontWeight: 600,
          cursor: "pointer",
          opacity: Object.keys(recordedIds).length === 0 ? 0.5 : 1,
        }}>
        ✓ Complete line check
      </button>
    </div>
  );
}

function LineCheckItem({ item, recorded, onRecord }: {
  item: Item; recorded: any;
  onRecord: (observed: number, adjusted: number, tempC?: number, note?: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [observed, setObserved] = React.useState<string>(String(item.par_default || 0));
  const [adjusted, setAdjusted] = React.useState<string>(
    String(item.par_suggested?.suggested ?? item.par_default ?? 0)
  );
  const [temp, setTemp] = React.useState<string>("");
  const [note, setNote] = React.useState<string>("");
  const sug = item.par_suggested;
  const isRecorded = !!recorded;

  return (
    <div data-testid={`linecheck-item-${item.id}`} style={{
      background: isRecorded ? "rgba(16,185,129,0.06)" : "rgba(200,169,126,0.04)",
      border: `1px solid ${isRecorded ? "rgba(16,185,129,0.3)" : "rgba(200,169,126,0.2)"}`,
      borderRadius: 8, padding: 12,
    }}>
      <div onClick={() => setExpanded((e) => !e)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 14, color: "#f5efe4" }}>
            {item.name}
            {item.is_perishable && <span style={{ marginLeft: 8, fontSize: 9, padding: "2px 5px", background: "rgba(251,191,36,0.15)", color: "#fbbf24", borderRadius: 3 }}>PERISHABLE</span>}
            {isRecorded && <span style={{ marginLeft: 8, fontSize: 9, color: "#10b981" }}>✓</span>}
          </div>
          {sug && (
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
              Default par {item.par_default} · <span style={{ color: "#c8a97e" }}>EchoAi suggests {sug.suggested}</span>
              {sug.drivers && <span style={{ marginLeft: 4, opacity: 0.6 }}>· occ {Math.round((sug.drivers.occupancy || 0) * 100)}% · DOW×{sug.drivers.dow_mult}</span>}
            </div>
          )}
        </div>
        <span style={{ fontSize: 18, color: "#94a3b8" }}>{expanded ? "−" : "+"}</span>
      </div>

      {expanded && !isRecorded && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Par observed" value={observed} onChange={setObserved}
                  testid={`linecheck-observed-${item.id}`} type="number" />
          <Field label="Par adjusted (accept EchoAi or override)" value={adjusted} onChange={setAdjusted}
                  testid={`linecheck-adjusted-${item.id}`} type="number" />
          {item.is_perishable && (
            <Field label={`Temp °C ${item.temp_min_c != null ? `(${item.temp_min_c}-${item.temp_max_c})` : ""}`}
                    value={temp} onChange={setTemp}
                    testid={`linecheck-temp-${item.id}`} type="number" required />
          )}
          <Field label="Note (optional)" value={note} onChange={setNote}
                  testid={`linecheck-note-${item.id}`} type="text" />
          <button data-testid={`linecheck-record-${item.id}`}
            onClick={() => {
              onRecord(Number(observed), Number(adjusted),
                       temp ? Number(temp) : undefined, note || undefined);
              setExpanded(false);
            }}
            disabled={item.is_perishable && !temp}
            style={{
              padding: 12, background: "rgba(200,169,126,0.15)",
              border: "1px solid rgba(200,169,126,0.4)",
              borderRadius: 6, color: "#c8a97e", fontSize: 13, fontWeight: 600,
              cursor: "pointer", opacity: (item.is_perishable && !temp) ? 0.4 : 1,
            }}>
            Save record
          </button>
        </div>
      )}

      {isRecorded && recorded.flag_temp_excursion && (
        <div data-testid={`linecheck-temp-flag-${item.id}`} style={{
          marginTop: 8, padding: 8, background: "rgba(244,63,94,0.1)",
          border: "1px solid rgba(244,63,94,0.3)", borderRadius: 4,
          fontSize: 11, color: "#f43f5e",
        }}>
          ⚠ Temp excursion logged: {recorded.temp_c}°C (range {item.temp_min_c}-{item.temp_max_c})
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, testid, type, required }: {
  label: string; value: string; onChange: (v: string) => void;
  testid: string; type: string; required?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase" }}>
        {label}{required && <span style={{ color: "#f43f5e" }}> *</span>}
      </span>
      <input data-testid={testid} type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "10px 12px", background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(148,163,184,0.2)", borderRadius: 4,
          color: "#f5efe4", fontSize: 14,
        }} />
    </label>
  );
}
