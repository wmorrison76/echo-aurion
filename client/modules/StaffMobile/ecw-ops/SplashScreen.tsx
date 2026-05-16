/** iter234 · SplashScreen — particle background + logo zoom-toward-viewer
 *
 * William's spec: "Add a splash screen on load while we pull live data from
 * the Main program. Particle background. Logo starts from the center small
 * and appears to move towards the viewer as it gets larger."
 *
 * We pre-warm critical endpoints (outlets, P&L, weather) in parallel so
 * that when the splash fades the app is already hydrated.
 */
import React from "react";
import { API } from "@/lib/api-url";

export function SplashScreen({ outletId, onDone }: {
  outletId: string;
  onDone: () => void;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [fading, setFading] = React.useState(false);
  const [stage, setStage] = React.useState<"loading" | "ready">("loading");

  // ── Particle background (gold swirl — EchoAurion brand) ─────────────
  React.useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = window.innerWidth;
    let h = window.innerHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Swirl particles — spiral toward center with rotational bias
    type P = { angle: number; radius: number; speed: number; r: number; hue: number; alpha: number };
    const N = 180;
    const particles: P[] = Array.from({ length: N }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: 40 + Math.random() * Math.max(w, h) * 0.6,
      speed: 0.003 + Math.random() * 0.006,
      r: 0.6 + Math.random() * 1.8,
      hue: 38 + Math.random() * 18,         // 38–56° — gold range
      alpha: 0.3 + Math.random() * 0.55,
    }));

    let raf = 0; const t0 = performance.now();
    const paint = (now: number) => {
      const t = (now - t0) / 1000;
      // Solid black base with very subtle radial gold tint
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      const tint = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.45);
      tint.addColorStop(0, "rgba(212,175,55,0.10)");
      tint.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, w, h);

      // Update + draw swirl
      for (const p of particles) {
        p.angle += p.speed;
        p.radius -= 0.15 + Math.sin(t + p.angle) * 0.05;
        if (p.radius < 20) {
          // respawn far out so the swirl feeds continuously
          p.radius = Math.max(w, h) * 0.55 + Math.random() * 40;
          p.angle = Math.random() * Math.PI * 2;
        }
        const x = w / 2 + Math.cos(p.angle) * p.radius;
        const y = h / 2 + Math.sin(p.angle) * p.radius * 0.85;  // slight ellipse
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 85%, 60%, ${p.alpha})`;
        ctx.shadowColor = `hsla(${p.hue}, 95%, 62%, 0.95)`;
        ctx.shadowBlur = 8;
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);

    const onResize = () => {
      w = window.innerWidth; h = window.innerHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.scale(dpr, dpr);
    };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  // ── Pre-warm critical live-data endpoints while splash is showing ─────
  React.useEffect(() => {
    const base = API();
    const t0 = Date.now();
    Promise.allSettled([
      fetch(`${base}/api/echoaurium/outlets`, { headers: { "X-User-Id": "chef-william" } }),
      fetch(`${base}/api/echoaurium/pnl/full?outlet_id=${outletId}&period=2026-03`),
      fetch(`${base}/api/weather/current`),
      fetch(`${base}/api/ecw-ops/activity?outlet_id=${outletId}&limit=10`),
    ]).then(() => {
      // Enforce a minimum splash time so the logo animation actually plays
      const elapsed = Date.now() - t0;
      const wait = Math.max(0, 1700 - elapsed);
      setTimeout(() => setStage("ready"), wait);
    });
  }, [outletId]);

  // ── Fade out and unmount once ready ───────────────────────────────────
  React.useEffect(() => {
    if (stage !== "ready") return;
    setFading(true);
    const t = setTimeout(() => onDone(), 1200);
    return () => clearTimeout(t);
  }, [stage, onDone]);

  return (
    <div data-testid="ecw-splash" style={{
      position: "fixed", inset: 0, zIndex: 9999999,
      opacity: fading ? 0 : 1,
      transform: fading ? "scale(1.08)" : "scale(1)",
      filter: fading ? "blur(14px) saturate(1.4)" : "blur(0) saturate(1)",
      transition: "opacity 1100ms cubic-bezier(0.4,0.0,0.2,1), transform 1100ms cubic-bezier(0.4,0.0,0.2,1), filter 1100ms cubic-bezier(0.4,0.0,0.2,1)",
      pointerEvents: fading ? "none" : "auto",
    }}>
      <canvas ref={canvasRef} data-testid="ecw-splash-canvas"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Logo mark — EchoAurion brand, starts small and zooms toward viewer */}
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 18, padding: "0 24px",
      }}>
        <div data-testid="ecw-splash-logo"
          style={{
            animation: "ecwSplashZoom 1600ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
            transformOrigin: "center center",
            fontFamily: '"SF Pro Display", -apple-system, sans-serif',
            textAlign: "center",
          }}>
          {/* Gold logo PNG — uses mix-blend-mode to strip the white card background. */}
          <img src="/echo-aurion-logo.png" alt="Echo Aurion"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            style={{
              width: "min(80vw, 320px)", height: "auto", display: "block", margin: "0 auto",
              mixBlendMode: "screen" as any,
              filter: "drop-shadow(0 0 32px rgba(212,175,55,0.6)) contrast(1.05)",
            }} />
          <div style={{
            fontSize: 9, letterSpacing: 5, color: "rgba(212,175,55,0.55)",
            marginTop: 18, textTransform: "uppercase",
          }}>
            Mobile · Operations
          </div>
        </div>

        <div data-testid="ecw-splash-status" style={{
          fontSize: 9, letterSpacing: 3, color: "rgba(212,175,55,0.45)",
          textTransform: "uppercase", marginTop: 40,
          animation: "ecwSplashPulse 1.5s ease-in-out infinite",
        }}>
          {stage === "loading" ? "Loading live data…" : "Ready"}
        </div>
      </div>

      <style>{`
        @keyframes ecwSplashZoom {
          0%   { transform: scale(0.1);  opacity: 0; filter: blur(6px); }
          35%  { opacity: 1; filter: blur(0); }
          100% { transform: scale(1.0);  opacity: 1; filter: blur(0); }
        }
        @keyframes ecwSplashPulse {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
