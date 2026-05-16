/**
 * iter183 · Guest Concierge Mobile App (refactored iter186 into sub-views)
 *
 * Route: /guest           — landing + room + last-name login (also supports QR query param)
 * Route: /guest/app       — authenticated home (venues, services, nearby, IRD, VIP, weather)
 *
 * Sleek, mobile-first. Dark gradient + cream-gold palette. Access control: 48h guest
 * session token stored in sessionStorage (cleared on browser close).
 */
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  API, getGuestToken, setGuestToken, guestFetch,
  firstName, formatDate,
  QuickCard, RequestCard,
  S,
  type Guest, type Venue, type Nearby,
} from "./shared";
import { IRDView, TrackerView } from "./views/IRD";
import { VIPView, CelebrationNudge } from "./views/VIP";
import { WeatherView } from "./views/Weather";
import { VenuesView, MenuView } from "./views/Venues";
import { NearbyView, RequestsView } from "./views/Requests";

// Re-export the helpers so existing callers keep working.
export { getGuestToken, setGuestToken, guestFetch };

// ─── Landing ──────────────────────────────────────────────────────────────
export default function GuestLanding() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [room, setRoom] = useState(sp.get("room") || "");
  const [lastName, setLastName] = useState(sp.get("last") || "");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (getGuestToken()) { nav("/guest/app", { replace: true }); return; }
    const r = sp.get("room"); const l = sp.get("last");
    if (r && l) submit(r, l);
    // eslint-disable-next-line
  }, []);

  async function submit(r: string, l: string) {
    setSubmitting(true); setErr(null);
    try {
      const res = await fetch(`${API()}/api/guest-concierge/authenticate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: r, last_name: l }),
      });
      if (!res.ok) {
        setErr(res.status === 404
          ? "We couldn't find that reservation — please check your room number and last name."
          : `Sign-in issue (${res.status}). Try again in a moment.`);
        return;
      }
      const j = await res.json();
      setGuestToken(j.token);
      nav("/guest/app", { replace: true });
    } catch (e: any) {
      setErr(`Network hiccup — ${e.message || e}`);
    } finally { setSubmitting(false); }
  }

  return (
    <div data-testid="guest-landing" style={S.landingRoot}>
      <div style={S.landingCard}>
        <div style={S.eyebrow}>Luccca Resort</div>
        <h1 style={S.landingHello}>Welcome</h1>
        <p style={S.landingSub}>Sign in with your room number and last name to access concierge, venues, transport and more.</p>
        <div style={{ marginTop: 28 }}>
          <label style={S.label}>Room number</label>
          <input data-testid="guest-input-room" value={room} onChange={e => setRoom(e.target.value)}
                 placeholder="e.g. 1208" autoComplete="off" inputMode="numeric" style={S.input} />
          <label style={{ ...S.label, marginTop: 14 }}>Last name</label>
          <input data-testid="guest-input-last-name" value={lastName} onChange={e => setLastName(e.target.value)}
                 placeholder="e.g. Reed" autoComplete="family-name" style={S.input} />
          {err && <div data-testid="guest-auth-error" style={S.errMsg}>{err}</div>}
          <button data-testid="guest-submit" disabled={submitting || !room || !lastName} onClick={() => submit(room, lastName)} style={{ ...S.primaryBtn, marginTop: 20, opacity: (submitting || !room || !lastName) ? 0.5 : 1 }}>
            {submitting ? "Signing in…" : "Enter"}
          </button>
        </div>
        <div style={S.landingFoot}>
          Scan the QR code in your welcome packet or at the concierge desk to skip this step next time.
        </div>
      </div>
    </div>
  );
}

// ─── Main app (authenticated) ─────────────────────────────────────────────
type View = "home" | "venues" | "services" | "nearby" | "requests" | "ird" | "vip" | "weather" | "menu" | "tracker";

export function GuestApp() {
  const nav = useNavigate();
  const [guest, setGuest] = useState<Guest | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [nearby, setNearby] = useState<Nearby[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [view, setView] = useState<View>("home");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [menuSlug, setMenuSlug] = useState<string | null>(null);
  const [trackerId, setTrackerId] = useState<string | null>(null);

  useEffect(() => {
    if (!getGuestToken()) { nav("/guest", { replace: true }); return; }
    loadAll();
    // eslint-disable-next-line
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, v, n, r] = await Promise.all([
        guestFetch("/api/guest-concierge/session"),
        guestFetch("/api/guest-concierge/venues"),
        guestFetch("/api/guest-concierge/nearby"),
        guestFetch("/api/guest-concierge/requests"),
      ]);
      if (s.status === 401 || s.status === 410) { setGuestToken(null); nav("/guest", { replace: true }); return; }
      setGuest((await s.json()).guest);
      setVenues((await v.json()).venues || []);
      setNearby((await n.json()).nearby || []);
      setMyRequests((await r.json()).requests || []);
    } finally { setLoading(false); }
  }

  function flash(type: "ok" | "err", msg: string) {
    setToast({ type, msg }); window.setTimeout(() => setToast(null), 3000);
  }

  async function callValet(minutes: number) {
    setBusy("valet");
    try {
      const r = await guestFetch("/api/guest-concierge/valet", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickup_minutes: minutes }),
      });
      const j = await r.json();
      if (!r.ok) return flash("err", j?.detail || "Failed");
      flash("ok", j.message);
      await loadAll();
    } finally { setBusy(null); }
  }

  async function callLuggage() {
    const location = prompt("Where should the bell stand pick up your bags?", `Room ${guest?.room || ""}`);
    if (!location) return;
    setBusy("luggage");
    try {
      const r = await guestFetch("/api/guest-concierge/luggage", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickup_location: location, pickup_time: "now", bag_count: 1 }),
      });
      const j = await r.json();
      flash(r.ok ? "ok" : "err", r.ok ? j.message : (j?.detail || "Failed"));
      if (r.ok) await loadAll();
    } finally { setBusy(null); }
  }

  async function callTransport() {
    const to = prompt("Where to?");
    if (!to) return;
    setBusy("transport");
    try {
      const r = await guestFetch("/api/guest-concierge/transport", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_location: `Room ${guest?.room || ""}`, to_location: to, party_size: 1, when: "in 5 min" }),
      });
      const j = await r.json();
      flash(r.ok ? "ok" : "err", r.ok ? j.message : (j?.detail || "Failed"));
      if (r.ok) await loadAll();
    } finally { setBusy(null); }
  }

  async function shareLocation() {
    if (!navigator.geolocation) { flash("err", "Geolocation not available on this browser."); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await guestFetch("/api/guest-concierge/location", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy_m: pos.coords.accuracy }),
      });
      flash("ok", "Location shared · the concierge will guide you.");
    }, (err) => flash("err", `Couldn't read location: ${err.message}`));
  }

  function signOut() {
    setGuestToken(null); nav("/guest", { replace: true });
  }

  async function reserveVenue(slug: string) {
    const today = new Date();
    const date = prompt("Reservation date (YYYY-MM-DD)?", today.toISOString().slice(0, 10));
    if (!date) return;
    const time = prompt("Time (HH:MM, 24h)?", "19:30");
    if (!time) return;
    const partyStr = prompt("Party size?", "2") || "2";
    const party = Math.max(1, Math.min(20, parseInt(partyStr, 10) || 2));
    setBusy("reserve");
    try {
      const r = await guestFetch("/api/guest-concierge/reserve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venue_slug: slug, date, time, party_size: party }),
      });
      const j = await r.json();
      flash(r.ok ? "ok" : "err", r.ok ? j.message : (j?.detail || "Failed"));
      if (r.ok) await loadAll();
    } finally { setBusy(null); }
  }

  if (loading || !guest) return <div style={S.loadingRoot}>Loading your Luccca…</div>;

  return (
    <div data-testid="guest-app-root" style={S.root}>
      <header style={S.header}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.eyebrow}>Luccca Resort</div>
          <h1 style={S.hello}>{firstName(guest.name)}</h1>
          <div style={S.stay}>Room {guest.room} · {formatDate(guest.check_in)} → {formatDate(guest.check_out)}</div>
          {guest.celebration && (
            <div style={S.celebration}>🥂 We're celebrating your {guest.celebration}.</div>
          )}
        </div>
        <button data-testid="guest-signout" onClick={signOut} style={S.linkBtn} aria-label="Sign out">Sign out</button>
      </header>

      {view === "home" && (
        <>
          {guest.celebration && <CelebrationNudge celebration={guest.celebration} onOpen={() => setView("vip")} />}

          <section style={S.section}>
            <h2 style={S.h2}>Quick actions</h2>
            <div style={S.quickGrid}>
              <QuickCard testid="qa-valet" emoji="🚘" label="Call valet (10 min)" subtitle="Car to front entrance" onClick={() => callValet(10)} busy={busy === "valet"} />
              <QuickCard testid="qa-valet-5" emoji="⏱" label="Valet now (5 min)" subtitle="Rush pickup" onClick={() => callValet(5)} busy={busy === "valet"} />
              <QuickCard testid="qa-luggage" emoji="🧳" label="Luggage pickup" subtitle="Bell stand to your door" onClick={callLuggage} busy={busy === "luggage"} />
              <QuickCard testid="qa-transport" emoji="🛺" label="Internal transport" subtitle="Golf cart / shuttle" onClick={callTransport} busy={busy === "transport"} />
              <QuickCard testid="qa-ird" emoji="🍽" label="Room service" subtitle="Order & track (Domino's-style)" onClick={() => setView("ird")} />
              <QuickCard testid="qa-venues" emoji="🗺" label="Venues & menus" subtitle={`${venues.length} places · allergens QR`} onClick={() => setView("venues")} />
              <QuickCard testid="qa-vip" emoji="✨" label="WOW experiences" subtitle="Curated VIP add-ons" onClick={() => setView("vip")} />
              <QuickCard testid="qa-weather" emoji="☔" label="Rain plan" subtitle="Beach day rained out?" onClick={() => setView("weather")} />
              <QuickCard testid="qa-nearby" emoji="📍" label="Nearby" subtitle="Restaurants · attractions" onClick={() => setView("nearby")} />
              <QuickCard testid="qa-location" emoji="🧭" label="Share my location" subtitle="Concierge can guide you" onClick={shareLocation} />
              <QuickCard testid="qa-requests" emoji="🛎" label="My requests" subtitle={`${myRequests.length} item(s)`} onClick={() => setView("requests")} />
            </div>
          </section>

          {myRequests.slice(0, 3).length > 0 && (
            <section style={S.section}>
              <h2 style={S.h2}>Active</h2>
              {myRequests.slice(0, 3).map(r => <RequestCard key={r.id} r={r} />)}
            </section>
          )}
        </>
      )}

      {view === "venues" && <VenuesView venues={venues} onBack={() => setView("home")} onReserve={reserveVenue} onMenu={(slug) => { setMenuSlug(slug); setView("menu"); }} />}
      {view === "nearby" && <NearbyView nearby={nearby} onBack={() => setView("home")} />}
      {view === "requests" && <RequestsView items={myRequests} onBack={() => setView("home")} />}
      {view === "ird" && <IRDView onBack={() => setView("home")} setTracker={(id) => { setTrackerId(id); setView("tracker"); }} flash={flash} />}
      {view === "tracker" && trackerId && <TrackerView orderId={trackerId} onBack={() => setView("ird")} />}
      {view === "vip" && <VIPView onBack={() => setView("home")} flash={flash} />}
      {view === "weather" && <WeatherView onBack={() => setView("home")} />}
      {view === "menu" && menuSlug && <MenuView venueSlug={menuSlug} onBack={() => setView("venues")} />}

      {toast && (
        <div data-testid={`guest-toast-${toast.type}`} style={{ ...S.toast, background: toast.type === "ok" ? "#064e3b" : "#7f1d1d" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
