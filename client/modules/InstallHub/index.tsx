/** iter248 · Install Hub — public page that helps anyone install Echo AURION
 * (managers/desktop) or MyEcho (hourly staff/mobile) on their device.
 *
 * Two QR codes side-by-side. OS-detected install instructions. No App Store.
 *
 * URLs:
 *   /install            ← public, no login needed
 *   /install?role=staff
 *   /install?role=mgr
 */
import React from "react";

const C = {
  bg: "#04060d", surface: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)",
  accent: "#d4af37", text: "#f5efe4", dim: "#94a3b8", muted: "#5a554d",
  emerald: "#064e3b", emeraldA: "#10b981",
};
const FONT: React.CSSProperties = { fontFamily: "'Inter', system-ui, sans-serif" };

function detectOS(): "ios" | "android" | "macos" | "windows" | "linux" | "unknown" {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Mac/.test(ua)) return "macos";
  if (/Windows/.test(ua)) return "windows";
  if (/Linux/.test(ua)) return "linux";
  return "unknown";
}

function qrUrl(target: string, size = 320): string {
  // Public QR generator — works without API key, returns PNG. Uses a simple
  // free service. Can swap to local generation later if we want.
  const u = encodeURIComponent(target);
  return `https://api.qrserver.com/v1/create-qr-code/?data=${u}&size=${size}x${size}&margin=4&qzone=1&format=png`;
}

export default function InstallHub() {
  const [os] = React.useState(detectOS());
  const origin = window.location.origin;
  const params = new URLSearchParams(window.location.search);
  const focused = params.get("role"); // null | "mgr" | "staff"
  const mgrUrl = `${origin}/`;
  const staffUrl = `${origin}/m/me`;

  return (
    <div data-testid="install-hub-root" style={{
      ...FONT, minHeight: "100vh", background: C.bg, color: C.text,
      padding: "40px 20px 80px",
    }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 9, letterSpacing: 6, color: C.accent, fontWeight: 700 }}>
            LUCCCA RESORT · INSTALL HUB
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif",
                          fontSize: 42, fontWeight: 200, margin: "8px 0 12px",
                          letterSpacing: -1 }}>
            Install your app
          </h1>
          <div style={{ fontSize: 13, color: C.dim, maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
            No App Store. No approvals. Scan the QR with your phone camera, or click "Install"
            on a desktop browser — it lands as a real app on your home screen / dock in under 10 seconds.
          </div>
        </div>

        {/* Two role cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20,
                          marginBottom: 36 }}>
          <RoleCard testid="role-card-mgr"
            kind="mgr" focused={focused === "mgr"}
            iconSrc="/icons/echo-aurion-mgr-512.png"
            title="Echo AURION"
            subtitle="Salaried Managers · GM · Exec Chef · Directors"
            theme={{ bg: "linear-gradient(180deg, #0c1a35 0%, #04060d 100%)",
                       glow: "rgba(212,175,55,0.35)", accent: C.accent }}
            url={mgrUrl} qr={qrUrl(mgrUrl)}
            features={["Full desktop · all panels", "Reports Hub · Maestro BQT · VIP Atlas",
                          "Exec Chef training (Gio + Carissa)",
                          "EchoAurium P&L drill-downs",
                          "Sidebar mirrors your role permissions"]}
          />
          <RoleCard testid="role-card-staff"
            kind="staff" focused={focused === "staff"}
            iconSrc="/icons/myecho-staff-512.png"
            title="MyEcho · Staff"
            subtitle="Hourly Staff · Servers · Cooks · Bartenders · Housekeeping"
            theme={{ bg: "linear-gradient(180deg, #064e3b 0%, #03291e 100%)",
                       glow: "rgba(16,185,129,0.45)", accent: "#d4af37" }}
            url={staffUrl} qr={qrUrl(staffUrl)}
            features={["My Schedule · 14 days ahead", "Request PTO · sick · personal",
                          "Paystubs · YTD totals · PDF download",
                          "W-2 / I-9 / tax docs",
                          "Concierge — shift swap · uniforms · benefits"]}
          />
        </div>

        {/* Per-OS install instructions */}
        <section style={{ padding: 24, borderRadius: 12, background: C.surface,
                              border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: C.accent, fontWeight: 700, marginBottom: 6 }}>
            HOW TO INSTALL · DETECTED: {os.toUpperCase()}
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif",
                          fontSize: 24, fontWeight: 300, margin: "0 0 20px",
                          letterSpacing: -0.5 }}>
            Step-by-step for your device
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <InstallSteps os="iOS · Safari (iPhone, iPad)" highlight={os === "ios"} steps={[
              "Open Safari (must be Safari, not Chrome)",
              "Tap the Share button (square with arrow up)",
              "Scroll down → tap 'Add to Home Screen'",
              "Tap 'Add' in the top-right corner",
              "App icon appears on your home screen",
            ]} />
            <InstallSteps os="Android · Chrome" highlight={os === "android"} steps={[
              "Open Chrome",
              "An 'Install app' banner usually appears at the bottom",
              "If not — tap the ⋮ menu → 'Install app'",
              "Confirm 'Install'",
              "App icon lands in your app drawer",
            ]} />
            <InstallSteps os="Desktop · Chrome / Edge" highlight={["macos","windows","linux"].includes(os)} steps={[
              "Visit the URL in Chrome or Edge",
              "Look at the address bar → click the ⊕ install icon",
              "Or open menu → 'Install Echo AURION'",
              "Confirm 'Install'",
              "App opens in its own window — no browser chrome",
            ]} />
          </div>
        </section>

        {/* What this gives the manager (vs hourly staff) */}
        <section style={{ marginTop: 36, padding: 24, borderRadius: 12,
                              background: "rgba(212,175,55,0.04)",
                              border: `1px solid ${C.accent}33` }}>
          <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif",
                          fontSize: 20, fontWeight: 300, margin: 0, letterSpacing: -0.3 }}>
            How it stays in sync
          </h3>
          <ul style={{ marginTop: 14, lineHeight: 1.8, fontSize: 13, color: C.dim, paddingLeft: 18 }}>
            <li>Every device runs the SAME backend — anything created on a phone is visible on the desktop instantly.</li>
            <li>Bug fixes pushed to the server reach every installed phone within ~30 seconds — no App Store re-submission.</li>
            <li>EchoAurium (P&L accounting) is restricted on the staff app for security.</li>
            <li>Login governs access — same username/password as desktop. Sidebar adapts to your role.</li>
            <li>Offline-first for inventory, voice notes, and waste sheets — syncs when you're back online.</li>
          </ul>
        </section>

        <div style={{ marginTop: 30, textAlign: "center", fontSize: 10, color: C.muted }}>
          Need help? Email <a href="mailto:it@luccca.com" style={{ color: C.accent }}>it@luccca.com</a>
          {" · "}or print this page and post it in the back-of-house corkboard.
        </div>
      </div>
    </div>
  );
}

function RoleCard({ testid, kind, focused, iconSrc, title, subtitle, theme, url, qr, features }: {
  testid: string; kind: "mgr" | "staff"; focused: boolean;
  iconSrc: string; title: string; subtitle: string;
  theme: { bg: string; glow: string; accent: string };
  url: string; qr: string; features: string[];
}) {
  return (
    <div data-testid={testid} style={{
      padding: 24, borderRadius: 14,
      background: theme.bg,
      border: focused ? `2px solid ${theme.accent}` : `1px solid ${C.border}`,
      boxShadow: focused ? `0 0 30px ${theme.glow}` : `0 0 20px ${theme.glow}`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
        <img src={iconSrc} alt={title} style={{
          width: 78, height: 78, borderRadius: 18,
          boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
        }} />
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif",
                          fontSize: 22, fontWeight: 300, margin: 0, letterSpacing: -0.5 }}>
            {title}
          </h2>
          <div style={{ fontSize: 10, color: C.dim, marginTop: 4, letterSpacing: 0.5 }}>
            {subtitle}
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", padding: 12, borderRadius: 10,
                      width: 220, margin: "16px auto", display: "flex",
                      alignItems: "center", justifyContent: "center" }}>
        <img src={qr} alt={`QR for ${title}`} style={{ width: "100%", height: "auto", display: "block" }} />
      </div>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <a href={url} target="_blank" rel="noreferrer" data-testid={`role-link-${kind}`}
          style={{
            display: "inline-block", padding: "10px 22px", borderRadius: 999,
            background: `${theme.accent}1a`, color: theme.accent,
            border: `1px solid ${theme.accent}88`, fontSize: 11, fontWeight: 700,
            letterSpacing: 1, textDecoration: "none",
          }}>↗ OPEN IN BROWSER</a>
        <div style={{ marginTop: 8, fontSize: 9, color: C.muted, fontFamily: "monospace" }}>{url}</div>
      </div>

      <div style={{ fontSize: 9, letterSpacing: 2, color: theme.accent,
                      fontWeight: 700, marginBottom: 8 }}>WHAT'S INSIDE</div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 11, color: C.dim }}>
        {features.map((f, i) => (
          <li key={i} style={{ paddingLeft: 16, position: "relative", marginBottom: 6, lineHeight: 1.5 }}>
            <span style={{ position: "absolute", left: 0, color: theme.accent }}>·</span>{f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InstallSteps({ os, steps, highlight }: { os: string; steps: string[]; highlight: boolean }) {
  return (
    <div data-testid={`install-${os.split(" ")[0].toLowerCase()}`} style={{
      padding: 16, borderRadius: 10,
      background: highlight ? "rgba(212,175,55,0.06)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${highlight ? C.accent + "55" : C.border}`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 12, color: highlight ? C.accent : C.text }}>
        {os}{highlight && " ← YOU"}
      </div>
      <ol style={{ margin: 0, padding: "0 0 0 18px", fontSize: 11, color: C.dim, lineHeight: 1.8 }}>
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </div>
  );
}
