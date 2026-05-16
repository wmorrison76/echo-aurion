/** iter242 · Mobile schedule editor — weekly grid + tap-to-add shift + SMS push.
 *
 * Why a tap UI not full drag-drop on a phone:
 *   - On-screen keyboard + small target sizes make HTML5 drag-drop brittle on iOS.
 *   - Tap a slot → search employee → confirm. Faster for 90% of edit cases.
 *   - "Long-press to move" is added as a follow-up if needed.
 */
import React from "react";
import { API } from "@/lib/api-url";

type Shift = { employee_id: string; start: string; end: string; role?: string; notes?: string };
type Employee = { id: string; full_name: string; position: string; phone?: string; outlet_id?: string };

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const SLOTS = [
  { id: "am",      label: "AM 6-2",   start: "06:00", end: "14:00" },
  { id: "pm",      label: "PM 11-7",  start: "11:00", end: "19:00" },
  { id: "evening", label: "EVE 4-12", start: "16:00", end: "00:00" },
];

function mondayOfWeek(d: Date): string {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x.toISOString().slice(0, 10);
}

export function ScheduleEditor({ outletId }: { outletId: string }) {
  const [weekStart, setWeekStart] = React.useState<string>(() => mondayOfWeek(new Date()));
  const [shifts, setShifts] = React.useState<Shift[]>([]);
  const [scheduleId, setScheduleId] = React.useState<string | null>(null);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [picker, setPicker] = React.useState<{ day: string; slot: any } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [pushed, setPushed] = React.useState<{ count: number; ts: number } | null>(null);

  const loadWeek = React.useCallback(() => {
    fetch(`${API()}/api/schedules/week?outlet_id=${outletId}&week_start=${weekStart}`)
      .then((r) => r.json())
      .then((d) => {
        setShifts(d?.shifts || []);
        setScheduleId(d?.id || null);
      }).catch(() => undefined);
  }, [outletId, weekStart]);

  React.useEffect(() => { loadWeek(); }, [loadWeek]);
  React.useEffect(() => {
    fetch(`${API()}/api/employees?outlet_id=${outletId}&limit=200`)
      .then((r) => r.json()).then((d) => setEmployees(d?.rows || [])).catch(() => undefined);
  }, [outletId]);

  function shiftsForCell(day: string, slot: any): Shift[] {
    return shifts.filter((s) => s.start.includes(day) || isoMatchesDaySlot(s, day, slot));
  }

  function isoMatchesDaySlot(s: Shift, day: string, slot: any): boolean {
    try {
      const dt = new Date(s.start);
      const sDay = DAYS[(dt.getDay() + 6) % 7];
      const sSlotStart = `${dt.getUTCHours().toString().padStart(2, "0")}:00`;
      return sDay === day && sSlotStart === slot.start;
    } catch { return false; }
  }

  async function addShift(emp: Employee) {
    if (!picker) return;
    const date = new Date(weekStart);
    date.setDate(date.getDate() + DAYS.indexOf(picker.day));
    const start = `${date.toISOString().slice(0, 10)}T${picker.slot.start}:00Z`;
    const endDate = picker.slot.end === "00:00"
      ? `${new Date(date.getTime() + 86400_000).toISOString().slice(0, 10)}T00:00:00Z`
      : `${date.toISOString().slice(0, 10)}T${picker.slot.end}:00Z`;
    const next = [...shifts, { employee_id: emp.id, start, end: endDate, role: emp.position }];
    setShifts(next);
    setPicker(null);
    void save(next);
  }

  async function removeShift(idx: number) {
    const next = shifts.filter((_, i) => i !== idx);
    setShifts(next);
    void save(next);
  }

  async function save(next: Shift[]) {
    setBusy(true);
    const r = await fetch(`${API()}/api/schedules/week`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
      body: JSON.stringify({ outlet_id: outletId, week_start: weekStart, shifts: next }),
    });
    if (r.ok) {
      const d = await r.json();
      setScheduleId(d.schedule_id);
    }
    setBusy(false);
  }

  async function pushSchedule() {
    if (!scheduleId) return;
    setBusy(true);
    const r = await fetch(`${API()}/api/schedules/${scheduleId}/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "sms" }),
    });
    if (r.ok) {
      const d = await r.json();
      setPushed({ count: d.queued_count, ts: Date.now() });
      window.setTimeout(() => setPushed(null), 4000);
    }
    setBusy(false);
  }

  function shiftWeek(delta: number) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  }

  return (
    <div data-testid="schedule-editor-root" style={{ padding: "12px 12px 90px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#d4af37", fontWeight: 700 }}>
            🗓 SCHEDULE EDITOR
          </div>
          <h1 style={{ fontSize: 17, fontWeight: 400, color: "#f5efe4", margin: "2px 0 0" }}>
            Week of {weekStart} · {shifts.length} shifts
          </h1>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button data-testid="sched-week-prev" onClick={() => shiftWeek(-1)}
            style={smallBtn}>‹</button>
          <button data-testid="sched-week-next" onClick={() => shiftWeek(1)}
            style={smallBtn}>›</button>
        </div>
      </div>

      <div data-testid="sched-grid" style={{ overflowX: "auto", marginBottom: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: `60px repeat(7, minmax(70px, 1fr))`, gap: 2 }}>
          <div />
          {DAYS.map((d) => (
            <div key={d} data-testid={`sched-col-${d}`} style={{
              fontSize: 9, letterSpacing: 1.5, color: "#94a3b8",
              textAlign: "center", padding: "4px 0", textTransform: "uppercase", fontWeight: 700,
            }}>{d}</div>
          ))}
          {SLOTS.map((slot) => (
            <React.Fragment key={slot.id}>
              <div style={{ fontSize: 9, color: "#d4af37", padding: "8px 4px", letterSpacing: 1, fontWeight: 600 }}>
                {slot.label}
              </div>
              {DAYS.map((day) => {
                const cellShifts = shiftsForCell(day, slot);
                return (
                  <button key={day + slot.id} data-testid={`sched-cell-${day}-${slot.id}`}
                    onClick={() => setPicker({ day, slot })}
                    style={{
                      minHeight: 64, padding: 4, borderRadius: 4,
                      background: cellShifts.length > 0
                        ? "rgba(16,185,129,0.08)"
                        : "rgba(148,163,184,0.04)",
                      border: `1px solid ${cellShifts.length > 0
                                                ? "rgba(16,185,129,0.3)"
                                                : "rgba(148,163,184,0.12)"}`,
                      color: "#f5efe4", textAlign: "left", fontSize: 9,
                      cursor: "pointer", display: "flex", flexDirection: "column", gap: 2,
                      fontFamily: "inherit",
                    }}>
                    {cellShifts.length === 0
                      ? <span style={{ color: "#475569", fontSize: 14, alignSelf: "center" }}>+</span>
                      : cellShifts.map((s) => {
                          const emp = employees.find((e) => e.id === s.employee_id);
                          const idx = shifts.indexOf(s);
                          return (
                            <span key={s.start + s.employee_id} data-testid={`sched-shift-${idx}`}
                              onClick={(e) => { e.stopPropagation(); removeShift(idx); }}
                              style={{
                                background: "rgba(16,185,129,0.18)", borderRadius: 3, padding: "1px 4px",
                                color: "#34d399", fontWeight: 600, fontSize: 9,
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                              }}>
                              {emp?.full_name?.split(" ")[0] || s.employee_id.slice(-4)}
                            </span>
                          );
                        })}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <button data-testid="sched-push-btn" onClick={pushSchedule}
        disabled={!scheduleId || busy}
        style={{
          width: "100%", padding: 13, borderRadius: 8,
          background: !scheduleId ? "rgba(148,163,184,0.08)"
                                       : "linear-gradient(135deg, rgba(96,165,250,0.22) 0%, rgba(59,130,246,0.14) 100%)",
          border: `1px solid ${!scheduleId ? "rgba(148,163,184,0.2)" : "rgba(96,165,250,0.55)"}`,
          color: !scheduleId ? "#64748b" : "#60a5fa",
          fontSize: 12, fontWeight: 700, letterSpacing: 1.5,
          cursor: !scheduleId ? "not-allowed" : "pointer",
        }}>
        📲 PUSH TO ALL EMPLOYEES VIA SMS
      </button>

      {pushed && (
        <div data-testid="sched-pushed-toast" style={{
          marginTop: 10, padding: 10, borderRadius: 6,
          background: "rgba(16,185,129,0.14)", border: "1px solid rgba(16,185,129,0.4)",
          color: "#34d399", textAlign: "center", fontSize: 12, fontWeight: 600,
        }}>
          ✓ Queued {pushed.count} SMS {pushed.count === 1 ? "message" : "messages"} (Twilio FROM number pending)
        </div>
      )}

      {picker && (
        <EmployeePicker employees={employees}
          day={picker.day} slot={picker.slot}
          onPick={addShift} onClose={() => setPicker(null)} />
      )}
    </div>
  );
}


function EmployeePicker({ employees, day, slot, onPick, onClose }: {
  employees: Employee[]; day: string; slot: any;
  onPick: (e: Employee) => void; onClose: () => void;
}) {
  const [q, setQ] = React.useState("");
  const filtered = employees.filter((e) =>
    !q || (e.full_name + " " + e.position).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div data-testid="sched-picker" onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 99999985, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "flex-end",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", background: "#0a0e1a", borderRadius: "14px 14px 0 0",
        padding: 14, paddingBottom: 28, maxHeight: "70vh", display: "flex", flexDirection: "column",
        border: "1px solid rgba(212,175,55,0.4)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#d4af37", fontWeight: 700 }}>
              ASSIGN {day.toUpperCase()} · {slot.label}
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>
              Tap an employee to add the shift
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", color: "#94a3b8",
            border: "1px solid rgba(148,163,184,0.25)", borderRadius: 6,
            width: 28, height: 28, fontSize: 14, cursor: "pointer",
          }}>×</button>
        </div>
        <input data-testid="sched-picker-search" value={q}
          onChange={(e) => setQ(e.target.value)} autoFocus
          placeholder="Search by name or role…"
          style={{
            padding: 10, borderRadius: 6, fontSize: 13, marginBottom: 8,
            background: "rgba(8,12,22,0.8)", border: "1px solid rgba(148,163,184,0.2)",
            color: "#f5efe4", fontFamily: "inherit",
          }} />
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.map((e) => (
            <button key={e.id} data-testid={`sched-emp-${e.id}`}
              onClick={() => onPick(e)}
              style={{
                width: "100%", padding: 10, marginBottom: 4, borderRadius: 5,
                background: "rgba(148,163,184,0.05)",
                border: "1px solid rgba(148,163,184,0.12)",
                color: "#f5efe4", textAlign: "left", fontSize: 12, cursor: "pointer",
                fontFamily: "inherit",
              }}>
              <div style={{ fontWeight: 600 }}>{e.full_name}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>{e.position}</div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ color: "#64748b", padding: 20, textAlign: "center", fontSize: 12 }}>
              No employees match.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


const smallBtn: React.CSSProperties = {
  background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)",
  color: "#d4af37", borderRadius: 6, width: 32, height: 32,
  fontSize: 18, cursor: "pointer", fontFamily: "inherit",
};
