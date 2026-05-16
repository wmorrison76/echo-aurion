/**
 * PastrySuccess — post-Stripe redirect page. Polls checkout status until paid.
 */
import React, { useEffect, useState, useRef } from "react";

const API = "";  // relative; Vite proxies /api → backend

export function PastrySuccess() {
  const [status, setStatus] = useState<"polling" | "paid" | "expired" | "timeout" | "error">("polling");
  const [msg, setMsg] = useState("Verifying your payment with Stripe…");
  const [meta, setMeta] = useState<any>(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    if (!sid) {
      setStatus("error");
      setMsg("No session_id in URL. Return to /pastry to retry.");
      return;
    }

    const poll = async () => {
      attemptsRef.current += 1;
      if (attemptsRef.current > 10) {
        setStatus("timeout");
        setMsg("Taking longer than expected. Please check your email or contact support.");
        return;
      }
      try {
        const r = await fetch(`${API}/api/pastry/checkout/status/${sid}`);
        const d = await r.json();
        setMeta(d);
        if (d.payment_status === "paid") {
          setStatus("paid");
          setMsg("Payment confirmed. Your bakery is activated.");
          return;
        }
        if (d.status === "expired") {
          setStatus("expired");
          setMsg("Checkout session expired. Start a new checkout from /pastry.");
          return;
        }
        // continue polling
        setTimeout(poll, 2000);
      } catch {
        setTimeout(poll, 2500);
      }
    };

    poll();
  }, []);

  const color = status === "paid" ? "#22c55e" : status === "polling" ? "#c8a97e" : "#ef4444";

  return (
    <div style={wrapStyle} data-testid="pastry-success-page">
      <div style={cardStyle}>
        <div style={{ fontSize: 12, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" }}>
          EchoAi³ · Pastry Module
        </div>
        <h1 style={{ fontSize: 44, margin: "14px 0 16px", fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, lineHeight: 1.1 }}>
          {status === "paid" ? "Welcome, bakery family." : "One moment."}
        </h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
          <div style={{ width: 12, height: 12, borderRadius: 99, background: color, animation: status === "polling" ? "pulse 1.4s infinite" : "none" }} />
          <div style={{ color: "#cbd5e1", fontSize: 16 }} data-testid="pastry-success-msg">
            {msg}
          </div>
        </div>

        {status === "paid" && (
          <>
            <div style={{ padding: 18, borderRadius: 14, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", marginTop: 12 }}>
              <div style={{ color: "#86efac", fontWeight: 700, fontSize: 14 }}>What happens next</div>
              <ul style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.7, marginTop: 8, paddingLeft: 20 }}>
                <li>Your onboarding email will arrive within 5 minutes with credentials.</li>
                <li>A success manager will reach out within 24 hours to walk you through the 3D studio.</li>
                <li>Your first $49 monthly billing starts 30 days from today.</li>
              </ul>
            </div>
            <a href="/" style={primaryBtnStyle} data-testid="pastry-enter-btn">
              Enter the EchoAi³ Studio →
            </a>
          </>
        )}

        {status !== "paid" && status !== "polling" && (
          <a href="/pastry" style={primaryBtnStyle}>
            Back to pricing
          </a>
        )}
      </div>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }`}</style>
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "radial-gradient(900px 500px at 50% -10%, rgba(200,169,126,0.18), transparent), #0b1020",
  color: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "system-ui, sans-serif", padding: 24,
};
const cardStyle: React.CSSProperties = {
  width: "min(640px, 100%)", padding: 36, borderRadius: 20,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(200,169,126,0.25)",
};
const primaryBtnStyle: React.CSSProperties = {
  display: "inline-block", marginTop: 20, padding: "12px 20px",
  borderRadius: 12, background: "#c8a97e", color: "#0b1020",
  fontWeight: 700, textDecoration: "none", fontSize: 14,
};
