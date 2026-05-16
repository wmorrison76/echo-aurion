/** iter238 · Staff Concierge v2 — amenity / guest issue / valet / HK / off-prop.
 *
 * William's spec: send amenity to guest if credentialed, log guest issue
 * with emoji severity, elevate to next management level, connect to valet,
 * housekeeping requests, off-property dining suggestions.
 */
import React from "react";
import { API } from "@/lib/api-url";

type View = "home" | "amenity" | "issue" | "valet" | "housekeeping" | "off-prop" | "hours";

export function StaffConciergeV2({ onBack }: { onBack: () => void }) {
  const [view, setView] = React.useState<View>("home");
  if (view === "amenity")       return <AmenityForm onBack={() => setView("home")} />;
  if (view === "issue")         return <GuestIssueForm onBack={() => setView("home")} />;
  if (view === "valet")         return <ValetForm onBack={() => setView("home")} />;
  if (view === "housekeeping")  return <HousekeepingForm onBack={() => setView("home")} />;
  if (view === "off-prop")      return <OffPropertyList onBack={() => setView("home")} />;
  if (view === "hours")         return <HoursView onBack={() => setView("home")} />;
  return (
    <div data-testid="staff-concierge-v2-root">
      <button onClick={onBack} data-testid="concierge-back"
        style={backBtnStyle}>← Back</button>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>
        Guest services. Loaded daily events + hours + amenity dispatch.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <ServiceTile testid="svc-amenity"   icon="🥂" label="Send amenity"  sub="Service recovery"
          onClick={() => setView("amenity")} />
        <ServiceTile testid="svc-issue"     icon="😟" label="Guest issue"   sub="Flag + elevate"
          onClick={() => setView("issue")} />
        <ServiceTile testid="svc-valet"     icon="🚗" label="Valet"         sub="Bring car around"
          onClick={() => setView("valet")} />
        <ServiceTile testid="svc-hk"        icon="🛏" label="Housekeeping"  sub="Towels, pillows…"
          onClick={() => setView("housekeeping")} />
        <ServiceTile testid="svc-offprop"   icon="🗺" label="Off-property"  sub="Dining + activities"
          onClick={() => setView("off-prop")} />
        <ServiceTile testid="svc-hours"     icon="🕒" label="Hours & events" sub="Per outlet today"
          onClick={() => setView("hours")} />
      </div>
    </div>
  );
}

function ServiceTile({ testid, icon, label, sub, onClick }: any) {
  return (
    <button data-testid={testid} onClick={onClick} style={{
      padding: 14, borderRadius: 8, cursor: "pointer",
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(148,163,184,0.18)",
      color: "#cbd5e1", textAlign: "left",
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: 12, color: "#f5efe4", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 10, color: "#94a3b8" }}>{sub}</span>
    </button>
  );
}

// ── Amenity form ───────────────────────────────────────────────────────
function AmenityForm({ onBack }: { onBack: () => void }) {
  const [room, setRoom] = React.useState("");
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [amenity, setAmenity] = React.useState("champagne");
  const [value, setValue] = React.useState("75");
  const [reason, setReason] = React.useState("Service recovery");
  const [done, setDone] = React.useState(false);
  async function submit() {
    const r = await fetch(`${API()}/api/concierge/amenity`, {
      method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
      body: JSON.stringify({ guest_room: room, guest_first: first, guest_last: last,
                             amenity, dollar_value: parseFloat(value) || 0, reason }),
    });
    if (r.ok) { setDone(true); setTimeout(onBack, 1200); }
  }
  return (
    <div data-testid="amenity-form">
      <button onClick={onBack} style={backBtnStyle}>← Back</button>
      <div style={{ fontSize: 10, color: "#d4af37", letterSpacing: 2, marginBottom: 10 }}>🥂 SEND AMENITY</div>
      <Row><Field label="Room"><input data-testid="amenity-room" value={room} onChange={(e) => setRoom(e.target.value)} style={inStyle} placeholder="e.g. 2104" /></Field></Row>
      <Row>
        <Field label="First"><input data-testid="amenity-first" value={first} onChange={(e) => setFirst(e.target.value)} style={inStyle} /></Field>
        <Field label="Last"><input data-testid="amenity-last" value={last} onChange={(e) => setLast(e.target.value)} style={inStyle} /></Field>
      </Row>
      <Field label="Amenity">
        <select data-testid="amenity-type" value={amenity} onChange={(e) => setAmenity(e.target.value)} style={inStyle}>
          {["champagne", "fruit plate", "wine bottle", "chocolate box",
             "spa credit $50", "dinner credit $100", "handwritten apology"].map((a) => <option key={a}>{a}</option>)}
        </select>
      </Field>
      <Row>
        <Field label="$ value"><input data-testid="amenity-value" value={value} onChange={(e) => setValue(e.target.value)} type="number" style={inStyle} /></Field>
        <Field label="Reason"><input data-testid="amenity-reason" value={reason} onChange={(e) => setReason(e.target.value)} style={inStyle} /></Field>
      </Row>
      <button data-testid="amenity-submit" onClick={() => void submit()}
        disabled={!room || !first || !last}
        style={{ ...primaryBtn, marginTop: 12, background: done ? "rgba(16,185,129,0.3)" : primaryBtn.background,
                   color: done ? "#34d399" : primaryBtn.color }}>
        {done ? "✓ Dispatched · teams notified" : "🥂 Dispatch amenity"}
      </button>
    </div>
  );
}

// ── Guest issue form (severity emoji + auto-flag + elevate) ────────────
function GuestIssueForm({ onBack }: { onBack: () => void }) {
  const [room, setRoom] = React.useState("");
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [severity, setSeverity] = React.useState<"happy" | "neutral" | "sad" | "angry">("sad");
  const [dept, setDept] = React.useState("dining");
  const [description, setDescription] = React.useState("");
  const [table, setTable] = React.useState("");
  const [elevate, setElevate] = React.useState(false);
  const [done, setDone] = React.useState<any>(null);
  const emojis: any = { happy: "😊", neutral: "😐", sad: "😟", angry: "😠" };
  async function submit() {
    const r = await fetch(`${API()}/api/concierge/guest-issue`, {
      method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
      body: JSON.stringify({ guest_room: room, guest_first: first, guest_last: last,
                             severity, department: dept, description,
                             table_number: table || null,
                             elevated_to: elevate ? "mgmt-next-level" : null }),
    });
    if (r.ok) { setDone(await r.json()); setTimeout(onBack, 1500); }
  }
  return (
    <div data-testid="guest-issue-form">
      <button onClick={onBack} style={backBtnStyle}>← Back</button>
      <div style={{ fontSize: 10, color: "#fb7185", letterSpacing: 2, marginBottom: 10 }}>⚑ LOG GUEST ISSUE</div>
      <Row><Field label="Room"><input data-testid="issue-room" value={room} onChange={(e) => setRoom(e.target.value)} style={inStyle} /></Field></Row>
      <Row>
        <Field label="First"><input data-testid="issue-first" value={first} onChange={(e) => setFirst(e.target.value)} style={inStyle} /></Field>
        <Field label="Last"><input data-testid="issue-last" value={last} onChange={(e) => setLast(e.target.value)} style={inStyle} /></Field>
      </Row>
      <Field label="Mood">
        <div style={{ display: "flex", gap: 4 }}>
          {(["happy", "neutral", "sad", "angry"] as const).map((s) => (
            <button key={s} data-testid={`issue-sev-${s}`} onClick={() => setSeverity(s)}
              style={{ flex: 1, padding: 10, fontSize: 22,
                        background: severity === s ? "rgba(212,175,55,0.15)" : "transparent",
                        border: `1px solid ${severity === s ? "rgba(212,175,55,0.5)" : "rgba(148,163,184,0.15)"}`,
                        borderRadius: 6, cursor: "pointer" }}>
              {emojis[s]}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Department">
        <select data-testid="issue-dept" value={dept} onChange={(e) => setDept(e.target.value)} style={inStyle}>
          {["dining", "room", "spa", "pool", "front-desk", "other"].map((d) => <option key={d}>{d}</option>)}
        </select>
      </Field>
      {dept === "dining" && (
        <Field label="Table (reservation link)">
          <input data-testid="issue-table" value={table} onChange={(e) => setTable(e.target.value)} style={inStyle} placeholder="e.g. 17" />
        </Field>
      )}
      <Field label="Description">
        <textarea data-testid="issue-desc" value={description} onChange={(e) => setDescription(e.target.value)}
          rows={3} style={{ ...inStyle, fontFamily: "inherit", resize: "vertical" }} />
      </Field>
      <label data-testid="issue-elevate" style={{ display: "flex", gap: 6, fontSize: 11,
                   color: "#cbd5e1", marginTop: 8, cursor: "pointer" }}>
        <input type="checkbox" checked={elevate} onChange={(e) => setElevate(e.target.checked)} />
        Elevate to next management level
      </label>
      <button data-testid="issue-submit" onClick={() => void submit()}
        disabled={!room || !first || !last || !description}
        style={{ ...primaryBtn, marginTop: 12,
                   background: done ? "rgba(16,185,129,0.3)" : "rgba(251,113,133,0.2)",
                   border: `1px solid ${done ? "rgba(16,185,129,0.5)" : "rgba(251,113,133,0.5)"}`,
                   color: done ? "#34d399" : "#fb7185" }}>
        {done ? `✓ Logged ${done.severity_emoji} · ticket ${done.ticket_id?.slice(-6)}` : "Log issue + auto-ticket"}
      </button>
    </div>
  );
}

// ── Valet ──────────────────────────────────────────────────────────────
function ValetForm({ onBack }: { onBack: () => void }) {
  const [room, setRoom] = React.useState(""); const [name, setName] = React.useState("");
  const [done, setDone] = React.useState<any>(null);
  async function submit() {
    const r = await fetch(`${API()}/api/concierge/valet`, {
      method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
      body: JSON.stringify({ guest_room: room, guest_name: name }),
    });
    if (r.ok) { setDone(await r.json()); setTimeout(onBack, 1500); }
  }
  return (
    <div data-testid="valet-form">
      <button onClick={onBack} style={backBtnStyle}>← Back</button>
      <div style={{ fontSize: 10, color: "#60a5fa", letterSpacing: 2, marginBottom: 10 }}>🚗 BRING CAR AROUND</div>
      <Field label="Room"><input data-testid="valet-room" value={room} onChange={(e) => setRoom(e.target.value)} style={inStyle} /></Field>
      <Field label="Guest name"><input data-testid="valet-name" value={name} onChange={(e) => setName(e.target.value)} style={inStyle} /></Field>
      <button data-testid="valet-submit" onClick={() => void submit()}
        disabled={!room || !name} style={{ ...primaryBtn, marginTop: 12 }}>
        {done ? `✓ Requested · ETA ${done.eta}` : "🚗 Call valet"}
      </button>
    </div>
  );
}

// ── Housekeeping ───────────────────────────────────────────────────────
function HousekeepingForm({ onBack }: { onBack: () => void }) {
  const [room, setRoom] = React.useState(""); const [item, setItem] = React.useState("towels");
  const [qty, setQty] = React.useState("2"); const [done, setDone] = React.useState(false);
  async function submit() {
    const r = await fetch(`${API()}/api/concierge/housekeeping`, {
      method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
      body: JSON.stringify({ guest_room: room, item, qty: parseInt(qty) || 1 }),
    });
    if (r.ok) { setDone(true); setTimeout(onBack, 1300); }
  }
  return (
    <div data-testid="hk-form">
      <button onClick={onBack} style={backBtnStyle}>← Back</button>
      <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: 2, marginBottom: 10 }}>🛏 HOUSEKEEPING</div>
      <Field label="Room"><input data-testid="hk-room" value={room} onChange={(e) => setRoom(e.target.value)} style={inStyle} /></Field>
      <Field label="Item">
        <select data-testid="hk-item" value={item} onChange={(e) => setItem(e.target.value)} style={inStyle}>
          {["towels", "pillows", "toiletries", "extra bedding", "iron", "robes", "coffee pods"].map((i) => <option key={i}>{i}</option>)}
        </select>
      </Field>
      <Field label="Qty"><input data-testid="hk-qty" value={qty} onChange={(e) => setQty(e.target.value)} type="number" style={inStyle} /></Field>
      <button data-testid="hk-submit" onClick={() => void submit()}
        disabled={!room} style={{ ...primaryBtn, marginTop: 12,
                                      background: done ? "rgba(16,185,129,0.3)" : primaryBtn.background,
                                      color: done ? "#34d399" : primaryBtn.color }}>
        {done ? "✓ Sent to housekeeping" : "🛏 Request"}
      </button>
    </div>
  );
}

// ── Off-property ───────────────────────────────────────────────────────
function OffPropertyList({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = React.useState<any[]>([]);
  React.useEffect(() => {
    fetch(`${API()}/api/concierge/off-property`).then((r) => r.json()).then((d) => setRows(d?.rows || []));
  }, []);
  return (
    <div data-testid="off-prop-list">
      <button onClick={onBack} style={backBtnStyle}>← Back</button>
      <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: 2, marginBottom: 10 }}>🗺 OFF-PROPERTY</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((s) => (
          <div key={s.name} data-testid={`off-prop-${s.name.replace(/\s/g, '-').toLowerCase()}`}
            style={{ padding: 10, borderRadius: 6,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(148,163,184,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 13, color: "#f5efe4", fontWeight: 500 }}>{s.name}</span>
              <span style={{ fontSize: 10, color: "#d4af37" }}>★ {s.rating}</span>
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
              {s.cuisine || s.kind} · {s.distance_mi} mi · {s.price}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Hours (per outlet today) ────────────────────────────────────────────
function HoursView({ onBack }: { onBack: () => void }) {
  const [outlets, setOutlets] = React.useState<any[]>([]);
  React.useEffect(() => {
    fetch(`${API()}/api/outlets/all`).then((r) => r.json()).then((d) => setOutlets(d?.rows || []));
  }, []);
  const today = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date().getDay()];
  return (
    <div data-testid="hours-view">
      <button onClick={onBack} style={backBtnStyle}>← Back</button>
      <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: 2, marginBottom: 10 }}>🕒 HOURS · TODAY</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {outlets.map((o) => (
          <OutletHoursRow key={o.id} outlet={o} today={today} />
        ))}
      </div>
    </div>
  );
}
function OutletHoursRow({ outlet, today }: { outlet: any; today: string }) {
  const [hours, setHours] = React.useState<any>(null);
  React.useEffect(() => {
    fetch(`${API()}/api/outlets/${outlet.id}/hours`).then((r) => r.json()).then(setHours);
  }, [outlet.id]);
  const todayHours = hours?.base_hours?.[today];
  return (
    <div data-testid={`hours-row-${outlet.id}`} style={{
      padding: 8, borderRadius: 4, display: "flex", justifyContent: "space-between", alignItems: "center",
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(148,163,184,0.12)",
    }}>
      <div>
        <div style={{ fontSize: 12, color: "#f5efe4" }}>{outlet.name}</div>
        <div style={{ fontSize: 9, color: outlet.owned_by === "third-party" ? "#fb923c" : "#94a3b8" }}>
          {outlet.owned_by === "third-party" ? "3rd-party · split" : outlet.category || outlet.kind}
        </div>
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: todayHours?.closed ? "#fb7185" : "#d4af37" }}>
        {todayHours?.closed ? "CLOSED" : todayHours ? `${todayHours.open} – ${todayHours.close}` : "…"}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 6 }}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, marginBottom: 8 }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase" }}>{label}</div>
      {children}
    </div>
  );
}
const inStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(148,163,184,0.2)", borderRadius: 6,
  color: "#f5efe4", fontSize: 13,
};
const primaryBtn: React.CSSProperties = {
  width: "100%", padding: 12, borderRadius: 6,
  background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)",
  color: "#d4af37", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
const backBtnStyle: React.CSSProperties = {
  fontSize: 11, color: "#94a3b8", background: "none",
  border: "1px solid rgba(148,163,184,0.2)", padding: "4px 10px",
  borderRadius: 4, cursor: "pointer", marginBottom: 12,
};
