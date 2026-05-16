/**
 * PastryLanding — marketing + pricing page for the standalone EchoAi³ Pastry Module.
 * Targeted at boutique bakeries. Converts visitors into Stripe Checkout sessions.
 */
import React, { useEffect, useState } from "react";

const API = "";  // relative; Vite proxies /api → backend

interface PackageInfo {
  label: string;
  amount: number;
  currency: string;
  setup_usd: number;
  monthly_usd: number;
  features: string[];
}

export function PastryLanding() {
  const [pkg, setPkg] = useState<PackageInfo | null>(null);
  const [stripeEnabled, setStripeEnabled] = useState<boolean>(true);
  const [email, setEmail] = useState("");
  const [bakery, setBakery] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/pastry/packages`)
      .then((r) => r.json())
      .then((d) => {
        setPkg(d.packages?.standalone_monthly || null);
        setStripeEnabled(!!d.stripe_enabled);
      })
      .catch(() => setErr("Unable to load pricing"));
  }, []);

  const startCheckout = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API}/api/pastry/checkout/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package_id: "standalone_monthly",
          origin_url: window.location.origin,
          email: email || undefined,
          bakery_name: bakery || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.detail || "Checkout failed");
      if (d.url) {
        window.location.href = d.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (e: any) {
      setErr(e.message || "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div style={wrapStyle} data-testid="pastry-landing">
      <div style={heroStyle}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={eyebrowStyle}>EchoAi³ · Pastry Module</div>
          <h1 style={h1Style} data-testid="pastry-hero-title">
            The entire <span style={{ color: "#c8a97e" }}>cake studio</span><br />
            your bakery deserves.
          </h1>
          <p style={leadStyle}>
            Premier 3D cake designer, AI photoreal renders your clients can almost taste,
            automated BEOs, scan-to-inventory, and an EchoAi assistant that runs the numbers for you.
          </p>
          <p style={{ ...leadStyle, color: "#94a3b8", fontSize: 15, marginTop: 8 }}>
            Built for boutique patisseries, wedding cake ateliers and micro-bakeries.
            No servers, no setup weeks — activate in under 10 minutes.
          </p>

          <div style={pricingCardStyle}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <div style={priceHuge}>$49</div>
              <div style={{ color: "#94a3b8", fontWeight: 600 }}>/month</div>
            </div>
            <div style={{ color: "#cbd5e1", fontSize: 14, marginTop: 4 }}>
              + one-time <b style={{ color: "#f8fafc" }}>$250</b> concierge onboarding (combined
              $299 today).
            </div>

            <ul style={featureListStyle}>
              {pkg?.features?.map((f, i) => (
                <li key={i} style={featureItemStyle}>
                  <span style={checkStyle}>✓</span> {f}
                </li>
              ))}
            </ul>

            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              <input
                type="text"
                placeholder="Bakery name"
                value={bakery}
                onChange={(e) => setBakery(e.target.value)}
                style={inputStyle}
                data-testid="pastry-bakery-input"
              />
              <input
                type="email"
                placeholder="you@bakery.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                data-testid="pastry-email-input"
              />
            </div>

            <button
              onClick={startCheckout}
              disabled={loading || !stripeEnabled}
              style={ctaBtnStyle}
              data-testid="pastry-checkout-btn"
            >
              {loading
                ? "Opening secure checkout…"
                : stripeEnabled
                  ? "Activate my bakery — $299 today"
                  : "Stripe not configured"}
            </button>
            {err && (
              <div style={{ color: "#f87171", fontSize: 13, marginTop: 10 }} data-testid="pastry-error">
                {err}
              </div>
            )}
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 10 }}>
              Secure payment via Stripe. Cancel anytime. 14-day satisfaction guarantee.
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 320, display: "flex", justifyContent: "center" }}>
          <div style={showcaseCardStyle}>
            <div style={badgeStyle}>Premier Studio</div>
            <img
              src="https://v3b.fal.media/files/b/0a96b655/U2A-ZO5yyqIKyzNd2_EBw.jpg"
              alt="EchoAi³ Pastry photoreal render"
              style={{ width: "100%", borderRadius: 12, display: "block" }}
              data-testid="pastry-hero-image"
            />
            <div style={showcaseCaptionStyle}>
              <span>AI Photoreal Render</span>
              <span style={{ opacity: 0.6 }}>· rendered in 12s with fal.ai Flux Pro</span>
            </div>
          </div>
        </div>
      </div>

      <section style={sectionStyle}>
        <h2 style={h2Style}>What's inside the standalone module</h2>
        <div style={gridStyle}>
          {[
            { t: "Premier 3D Cake Designer", d: "7 tier shapes (round, hex, heart, square, Mad Hatter, topsy-turvy, sheet), 12 piping styles, 10 designer stands, 8 flower arrangements, entremet cut-reveal." },
            { t: "AI Photoreal Studio", d: "Turn your 3D design into a magazine-quality render in 12 seconds with Flux Pro v1.1. Four scene styles: studio, garden, reception hall, minimalist." },
            { t: "Client Intake → BEO PDF", d: "Capture inquiries, allergens, guest count, event date. One click to generate a branded Banquet Event Order PDF with costing and timeline." },
            { t: "Scan-to-Inventory", d: "Snap a supplier invoice, OCR extracts line items, syncs to your ingredient stock and cost-per-serving." },
            { t: "EchoAi-lite Assistant", d: "Allergen propagator, pricing autopilot, structural feasibility check, cut-guide generator, critical-path timeline planner." },
            { t: "Reusable Design Library", d: "Save every design as a searchable 'look' with filters by theme, palette, tier count, price band." },
          ].map((f) => (
            <div key={f.t} style={featureCardStyle} data-testid={`pastry-feature-${f.t.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#f8fafc" }}>{f.t}</div>
              <div style={{ color: "#94a3b8", fontSize: 14, marginTop: 6, lineHeight: 1.55 }}>{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...sectionStyle, paddingTop: 20 }}>
        <div style={{ textAlign: "center", color: "#64748b", fontSize: 13 }}>
          Trusted foundation · EchoAi³ Platform · Powered by fal.ai Flux Pro, OpenAI, Claude Sonnet, Stripe
        </div>
      </section>
    </div>
  );
}

// ─── styles ───
const wrapStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "radial-gradient(1200px 600px at 20% -10%, rgba(200,169,126,0.18), transparent), #0b1020",
  color: "#f8fafc",
  fontFamily: "'Instrument Serif', Georgia, system-ui, sans-serif",
  padding: "0 24px 60px",
};

const heroStyle: React.CSSProperties = {
  maxWidth: 1200, margin: "0 auto", padding: "72px 0 40px",
  display: "flex", gap: 48, flexWrap: "wrap", alignItems: "center",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 12, letterSpacing: 2, color: "#c8a97e",
  fontWeight: 700, textTransform: "uppercase",
};

const h1Style: React.CSSProperties = {
  fontSize: "clamp(44px, 6vw, 76px)",
  lineHeight: 1.02, margin: "14px 0 20px",
  fontFamily: "'Instrument Serif', Georgia, serif",
  fontWeight: 400, letterSpacing: -1.5,
};

const leadStyle: React.CSSProperties = {
  color: "#cbd5e1", fontSize: 18, lineHeight: 1.6,
  fontFamily: "system-ui, sans-serif", maxWidth: 560,
};

const pricingCardStyle: React.CSSProperties = {
  marginTop: 30, padding: 24, borderRadius: 18,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(200,169,126,0.25)",
  backdropFilter: "blur(10px)", maxWidth: 520,
};

const priceHuge: React.CSSProperties = {
  fontSize: 56, fontWeight: 400, color: "#f8fafc",
  fontFamily: "'Instrument Serif', Georgia, serif", letterSpacing: -1,
};

const featureListStyle: React.CSSProperties = {
  listStyle: "none", padding: 0, margin: "16px 0 0",
  fontFamily: "system-ui, sans-serif",
};
const featureItemStyle: React.CSSProperties = {
  color: "#e2e8f0", fontSize: 14, padding: "6px 0",
  display: "flex", gap: 10, alignItems: "flex-start",
};
const checkStyle: React.CSSProperties = {
  color: "#c8a97e", fontWeight: 700, flex: "0 0 auto",
};
const inputStyle: React.CSSProperties = {
  padding: "12px 14px", borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(0,0,0,0.3)", color: "#f8fafc",
  fontSize: 14, fontFamily: "system-ui",
};
const ctaBtnStyle: React.CSSProperties = {
  marginTop: 16, padding: "14px 20px", borderRadius: 12,
  background: "linear-gradient(135deg, #c8a97e 0%, #a88357 100%)",
  color: "#0b1020", border: 0, fontWeight: 700, fontSize: 16,
  cursor: "pointer", fontFamily: "system-ui",
  boxShadow: "0 6px 20px rgba(200,169,126,0.3)",
};

const showcaseCardStyle: React.CSSProperties = {
  position: "relative", padding: 14, maxWidth: 520, width: "100%",
  borderRadius: 20, background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(200,169,126,0.2)",
  boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
};
const badgeStyle: React.CSSProperties = {
  position: "absolute", top: -12, left: 20,
  padding: "4px 12px", borderRadius: 20, background: "#c8a97e",
  color: "#0b1020", fontWeight: 700, fontSize: 11, letterSpacing: 1,
  textTransform: "uppercase", fontFamily: "system-ui",
};
const showcaseCaptionStyle: React.CSSProperties = {
  display: "flex", gap: 10, marginTop: 12, padding: "0 4px 4px",
  fontSize: 12, color: "#e2e8f0", fontFamily: "system-ui",
  fontWeight: 500, justifyContent: "space-between",
};

const sectionStyle: React.CSSProperties = {
  maxWidth: 1200, margin: "40px auto", padding: "40px 0",
  borderTop: "1px solid rgba(255,255,255,0.06)",
};
const h2Style: React.CSSProperties = {
  fontSize: 36, color: "#f8fafc", marginBottom: 30,
  fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400,
};
const gridStyle: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 18,
};
const featureCardStyle: React.CSSProperties = {
  padding: 22, borderRadius: 14,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
};
