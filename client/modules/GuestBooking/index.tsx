import React, { useState, useEffect } from "react";

const API = window.location.origin;
const C = { bg: "#0b0f1a", card: "#111827", border: "#1e293b", accent: "#d946ef", accentDim: "rgba(217,70,239,0.12)", green: "#10b981", red: "#ef4444", amber: "#f59e0b", blue: "#3b82f6", text: "#e2e8f0", dim: "#64748b", muted: "#475569" };

function Badge({ text, color }: { text: string; color: string }) {
  return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, textTransform: "uppercase" }}>{text}</span>;
}

export default function GuestBooking() {
  const [treatments, setTreatments] = useState<any[]>([]);
  const [selectedTrt, setSelectedTrt] = useState<any>(null);
  const [date, setDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [form, setForm] = useState({ guest_name: "", guest_email: "", guest_phone: "", room_number: "" });
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [step, setStep] = useState(1); // 1=treatments, 2=time, 3=details, 4=confirm

  useEffect(() => { fetch(`${API}/api/guest-booking/treatments`).then(r => r.json()).then(d => setTreatments(d.treatments || [])); }, []);

  useEffect(() => {
    if (selectedTrt && date) {
      fetch(`${API}/api/guest-booking/availability?date=${date}&treatment_id=${selectedTrt.id}`).then(r => r.json()).then(d => setSlots(d.slots || []));
    }
  }, [selectedTrt, date]);

  const submitBooking = async () => {
    const r = await fetch(`${API}/api/guest-booking/book`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, treatment_id: selectedTrt.id, preferred_date: date, preferred_time: selectedTime, notes }) });
    const d = await r.json();
    setBooking(d);
    setStep(4);
  };

  const catColors: Record<string, string> = { massage: C.accent, facial: C.blue, body: C.green, nail: C.amber, package: "#c8a97e" };

  return (
    <div data-testid="guest-booking-panel" style={{ height: "100%", background: `linear-gradient(180deg, ${C.bg} 0%, #0f172a 100%)`, color: C.text, fontFamily: "'Inter', sans-serif", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 28px", borderBottom: `1px solid ${C.border}`, background: "rgba(217,70,239,0.04)", textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.accent, letterSpacing: "-0.02em" }}>Spa & Wellness</div>
        <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>Book your perfect treatment experience</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{ width: 8, height: 8, borderRadius: "50%", background: step >= s ? C.accent : "rgba(255,255,255,0.1)", transition: "all 0.3s" }} />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        {/* Step 1: Choose Treatment */}
        {step === 1 && (
          <div data-testid="guest-step-treatments">
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Choose Your Treatment</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {treatments.map(t => (
                <button key={t.id} onClick={() => { setSelectedTrt(t); setStep(2); }} data-testid={`treatment-${t.id}`} style={{ background: selectedTrt?.id === t.id ? C.accentDim : C.card, border: `1px solid ${selectedTrt?.id === t.id ? C.accent : C.border}`, borderRadius: 10, padding: 16, textAlign: "left", cursor: "pointer", borderTop: `3px solid ${catColors[t.category] || C.dim}`, transition: "all 0.2s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{t.name}</div>
                    <Badge text={t.category} color={catColors[t.category] || C.dim} />
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, marginBottom: 8, lineHeight: 1.4 }}>{t.description}</div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: C.accent, fontFamily: "'IBM Plex Mono', monospace" }}>${t.price}</span>
                    <span style={{ fontSize: 11, color: C.dim }}>{t.duration_mins} min</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Choose Date & Time */}
        {step === 2 && selectedTrt && (
          <div data-testid="guest-step-time">
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{selectedTrt.name}</div>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 16 }}>${selectedTrt.price} | {selectedTrt.duration_mins} min</div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Select Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }} data-testid="guest-date-input" />
            </div>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>Available Times</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8 }}>
              {slots.map(s => (
                <button key={s.time} onClick={() => { setSelectedTime(s.time); setStep(3); }} data-testid={`slot-${s.time}`} style={{ padding: "10px 8px", borderRadius: 6, border: `1px solid ${selectedTime === s.time ? C.accent : C.border}`, background: selectedTime === s.time ? C.accentDim : C.card, color: selectedTime === s.time ? C.accent : C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>{s.time}</button>
              ))}
              {slots.length === 0 && <div style={{ gridColumn: "1 / -1", textAlign: "center", color: C.dim, padding: 20 }}>No availability on this date</div>}
            </div>
            <button onClick={() => setStep(1)} style={{ marginTop: 16, padding: "6px 16px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, fontSize: 11, cursor: "pointer" }}>Back</button>
          </div>
        )}

        {/* Step 3: Guest Details */}
        {step === 3 && (
          <div data-testid="guest-step-details">
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{selectedTrt?.name} — {date} at {selectedTime}</div>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 16 }}>Enter your details to confirm</div>
            <div style={{ display: "grid", gap: 12, maxWidth: 400 }}>
              <div>
                <label style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Full Name *</label>
                <input value={form.guest_name} onChange={e => setForm({ ...form, guest_name: e.target.value })} placeholder="Your name" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }} data-testid="guest-name-input" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Email *</label>
                <input value={form.guest_email} onChange={e => setForm({ ...form, guest_email: e.target.value })} placeholder="your@email.com" type="email" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }} data-testid="guest-email-input" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Phone</label>
                  <input value={form.guest_phone} onChange={e => setForm({ ...form, guest_phone: e.target.value })} placeholder="555-0000" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Room #</label>
                  <input value={form.room_number} onChange={e => setForm({ ...form, room_number: e.target.value })} placeholder="412" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Special Requests</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any preferences or allergies..." rows={2} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={submitBooking} disabled={!form.guest_name || !form.guest_email} data-testid="guest-book-btn" style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: form.guest_name && form.guest_email ? C.accent : C.muted, color: "#fff", fontSize: 13, fontWeight: 600, cursor: form.guest_name && form.guest_email ? "pointer" : "default" }}>Confirm Booking</button>
              <button onClick={() => setStep(2)} style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, fontSize: 12, cursor: "pointer" }}>Back</button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && booking && (
          <div data-testid="guest-step-confirmation" style={{ textAlign: "center", paddingTop: 30 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: `${C.green}20`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill={C.green}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>Booking Confirmed!</div>
            <div style={{ fontSize: 12, color: C.dim, marginBottom: 20, maxWidth: 350, margin: "0 auto 20px" }}>{booking.confirmation}</div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, display: "inline-block", textAlign: "left" }}>
              <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
                <div><span style={{ color: C.dim }}>Treatment:</span> <span style={{ color: C.text, fontWeight: 600 }}>{booking.treatment}</span></div>
                <div><span style={{ color: C.dim }}>Date:</span> <span style={{ color: C.text }}>{booking.date}</span></div>
                <div><span style={{ color: C.dim }}>Time:</span> <span style={{ color: C.text }}>{booking.time}</span></div>
                <div><span style={{ color: C.dim }}>Therapist:</span> <span style={{ color: C.text }}>{booking.therapist}</span></div>
                <div><span style={{ color: C.dim }}>Price:</span> <span style={{ color: C.accent, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>${booking.price}</span></div>
                <div><span style={{ color: C.dim }}>Booking ID:</span> <span style={{ color: C.muted, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>{booking.booking_id}</span></div>
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <button onClick={() => { setStep(1); setBooking(null); setSelectedTrt(null); setSelectedTime(""); setForm({ guest_name: "", guest_email: "", guest_phone: "", room_number: "" }); setNotes(""); }} style={{ padding: "10px 24px", borderRadius: 8, border: `1px solid ${C.accent}`, background: "transparent", color: C.accent, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Book Another Treatment</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
