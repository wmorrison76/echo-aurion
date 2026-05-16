/**
 * Public Booking Page — NO AUTH required
 * Route: /book/:hotelSlug
 * Linked from hotel's public website. QR code points here.
 */
import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Loader2, CheckCircle2, Clock, User, Mail, Phone, Calendar, Home } from "lucide-react";

const ACCENT = "#c8a97e";
const BORDER = "rgba(255,255,255,0.08)";
const API = typeof window !== "undefined" ? window.location.origin : "";

interface Service {
  id: string; name: string; category: string; description?: string;
  duration_min: number; price: number; color?: string;
}

export default function PublicBookingPage() {
  const { hotelSlug = "resort" } = useParams<{ hotelSlug: string }>();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cat, setCat] = useState<string>("");
  const [selected, setSelected] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [room, setRoom] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState("14:00");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API}/api/spa-booking/services/${hotelSlug}`);
        const d = await r.json();
        setServices(d.services || []);
        setCategories(d.categories || []);
      } catch { /* */ }
      setLoading(false);
    })();
  }, [hotelSlug]);

  const shown = useMemo(
    () => services.filter(s => !cat || s.category === cat),
    [services, cat]
  );

  const submit = async () => {
    if (!selected || !name.trim() || !email.trim()) {
      setError("Name, email, and a service selection are required.");
      return;
    }
    setSubmitting(true); setError(null);
    try {
      const r = await fetch(`${API}/api/spa-booking/book`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotel_slug: hotelSlug,
          service_id: selected.id,
          guest: { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, room_number: room.trim() || undefined },
          preferred_date: date,
          preferred_time: time,
          notes: notes.trim() || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Booking failed");
      setResult(d.booking);
    } catch (e: any) {
      setError(e.message || "Unable to submit booking");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg,#0b1020 0%,#07090f 100%)", color: "#e2e8f0", fontFamily: "'Inter',system-ui,sans-serif" }} data-testid="public-booking-page">
      {/* Header */}
      <header className="px-6 md:px-12 py-10 border-b" style={{ borderColor: BORDER }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-[10px] font-mono uppercase tracking-[0.35em]" style={{ color: ACCENT }}>{hotelSlug.replace(/-/g, " ")}</div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mt-2 tracking-tight">Book Your Spa Experience</h1>
          <p className="text-white/50 text-sm md:text-base mt-3 max-w-2xl">
            Select a treatment below. We'll confirm your preferred time by email within 2 hours.
          </p>
        </div>
      </header>

      {result ? (
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="rounded-xl p-10 text-center" style={{ background: "rgba(200,169,126,0.06)", border: `1px solid ${ACCENT}35` }} data-testid="booking-success">
            <CheckCircle2 className="w-14 h-14 mx-auto mb-4" style={{ color: ACCENT }} />
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/50 mb-2">Booking Requested</div>
            <div className="text-[32px] font-mono font-bold tracking-wider mb-3" style={{ color: ACCENT }} data-testid="booking-confirmation-code">
              {result.confirmation_code}
            </div>
            <div className="text-white text-base mb-1">{result.service_name}</div>
            <div className="text-white/50 text-sm">{result.preferred_date} at {result.preferred_time}</div>
            <div className="text-white/40 text-xs mt-6">A confirmation email is on its way to {result.guest?.email}.</div>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_360px] gap-8 px-6 md:px-12 py-10">
          {/* Services grid */}
          <div>
            {/* Category filter */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
              <button onClick={() => setCat("")}
                className="px-4 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all"
                style={{
                  background: !cat ? ACCENT : "transparent", color: !cat ? "#0b1020" : "rgba(255,255,255,0.6)",
                  border: !cat ? `1px solid ${ACCENT}` : `1px solid ${BORDER}`,
                }}>
                All Treatments
              </button>
              {categories.map(c => (
                <button key={c} onClick={() => setCat(c)}
                  className="px-4 py-1.5 rounded-full text-[11px] font-medium capitalize whitespace-nowrap transition-all"
                  style={{
                    background: cat === c ? ACCENT : "transparent", color: cat === c ? "#0b1020" : "rgba(255,255,255,0.6)",
                    border: cat === c ? `1px solid ${ACCENT}` : `1px solid ${BORDER}`,
                  }} data-testid={`booking-cat-${c}`}>
                  {c}
                </button>
              ))}
            </div>

            {loading && <div className="text-center text-white/40 text-sm py-16"><Loader2 className="w-5 h-5 animate-spin inline" /> Loading services…</div>}
            {!loading && shown.length === 0 && <div className="text-center text-white/30 text-sm py-16">No treatments in this category.</div>}

            <div className="grid sm:grid-cols-2 gap-3">
              {shown.map(s => (
                <button key={s.id} onClick={() => setSelected(s)}
                  className="text-left p-5 rounded-xl transition-all"
                  style={{
                    background: selected?.id === s.id ? `${ACCENT}12` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${selected?.id === s.id ? ACCENT : BORDER}`,
                    boxShadow: selected?.id === s.id ? `0 0 0 3px ${ACCENT}20` : "none",
                  }} data-testid={`booking-service-${s.id}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-[8px] font-mono uppercase tracking-widest text-white/40 mb-1.5">{s.category}</div>
                      <div className="text-[16px] font-semibold text-white leading-tight">{s.name}</div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="text-[20px] font-bold" style={{ color: ACCENT }}>${s.price}</div>
                      <div className="text-[9px] text-white/40 mt-0.5">{s.duration_min} min</div>
                    </div>
                  </div>
                  {s.description && <div className="text-[11px] text-white/50 mt-2 leading-relaxed">{s.description}</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Form sticky sidebar */}
          <aside className="md:sticky md:top-6 self-start">
            <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
              <div className="text-[9px] font-mono uppercase tracking-[0.2em]" style={{ color: `${ACCENT}99` }}>Your Selection</div>
              {!selected ? (
                <div className="text-[12px] text-white/40 mt-3">Choose a treatment to continue.</div>
              ) : (
                <>
                  <div className="text-[14px] text-white font-semibold mt-2">{selected.name}</div>
                  <div className="text-[11px] text-white/50 mt-0.5">
                    {selected.duration_min} min · <span style={{ color: ACCENT }}>${selected.price}</span>
                  </div>
                </>
              )}

              <div className="h-px my-5" style={{ background: BORDER }} />

              <div className="space-y-2.5">
                <Field icon={<User className="w-3 h-3" />} label="Name *">
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                    className="w-full bg-transparent outline-none text-[12px] text-white" data-testid="booking-name" />
                </Field>
                <Field icon={<Mail className="w-3 h-3" />} label="Email *">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                    className="w-full bg-transparent outline-none text-[12px] text-white" data-testid="booking-email" />
                </Field>
                <Field icon={<Phone className="w-3 h-3" />} label="Phone (optional)">
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555-0142"
                    className="w-full bg-transparent outline-none text-[12px] text-white" />
                </Field>
                <Field icon={<Home className="w-3 h-3" />} label="Room # (if staying)">
                  <input value={room} onChange={e => setRoom(e.target.value)} placeholder="212"
                    className="w-full bg-transparent outline-none text-[12px] text-white" />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field icon={<Calendar className="w-3 h-3" />} label="Date *">
                    <input type="date" value={date} onChange={e => setDate(e.target.value)}
                      className="w-full bg-transparent outline-none text-[12px] text-white" style={{ colorScheme: "dark" }} data-testid="booking-date" />
                  </Field>
                  <Field icon={<Clock className="w-3 h-3" />} label="Time *">
                    <input type="time" value={time} onChange={e => setTime(e.target.value)}
                      className="w-full bg-transparent outline-none text-[12px] text-white" style={{ colorScheme: "dark" }} />
                  </Field>
                </div>
                <Field icon={null} label="Notes (allergies, preferences)">
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    className="w-full bg-transparent outline-none text-[12px] text-white resize-none" />
                </Field>
              </div>

              {error && (
                <div className="mt-3 text-[11px] text-red-400 rounded p-2.5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)" }}>
                  {error}
                </div>
              )}

              <button onClick={submit} disabled={!selected || submitting || !name.trim() || !email.trim()}
                className="w-full mt-5 py-3 rounded-md text-[12px] font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: ACCENT, color: "#0b1020" }} data-testid="booking-submit">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Request Booking"}
              </button>
              <div className="text-[9px] text-white/30 mt-2 text-center">
                We'll confirm by email within 2 hours.
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-md px-3 py-2" style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-white/40 mb-1">
        {icon && <span style={{ color: ACCENT }}>{icon}</span>}
        {label}
      </div>
      {children}
    </label>
  );
}
