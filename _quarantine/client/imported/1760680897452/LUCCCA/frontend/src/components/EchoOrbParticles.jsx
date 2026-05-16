import React, { useEffect, useMemo, useRef, useState } from "react";

// position: which corner to pin to
// density: 0..1 particle density scalar
export default function EchoOrbParticles({
  size = 88,
  intensity = 0.95,
  idle = true,
  position = "top-right",
  density = 1,
  className = "",
  onToggle,
  onOpen,
}) {
  const [hue, setHue] = useState(() => Math.floor(Math.random() * 360));
  const [sat, setSat] = useState(85);
  const [light, setLight] = useState(58);
  const [armed, setArmed] = useState(false);

  const btnRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const clickTimer = useRef(null);

  // --- color drift ---
  useEffect(() => {
    let ticks = 0;
    const step = () => {
      ticks += 1;
      setHue((h) => (h + 0.08) % 360); // slow drift
      if (ticks % 420 === 0) {
        setSat((s) => clamp01(s / 100 + (Math.random() * 0.2 - 0.1)) * 100);
        setLight((l) => clamp01(l / 100 + (Math.random() * 0.16 - 0.08)) * 100);
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, []);

  // --- mouse halo (for subtle brightness) ---
  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      el.style.setProperty("--halo", String(clamp01(1 - d / 300)));
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // --- particle cloud on canvas ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const px = Math.round(size * 2.6);       // canvas bigger than orb for bloom room
    canvas.width = px * dpr;
    canvas.height = px * dpr;
    canvas.style.width = px + "px";
    canvas.style.height = px + "px";

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.globalCompositeOperation = "lighter";

    const cx = px / 2, cy = px / 2;
    const maxR = px * 0.46;

    const baseCount = Math.round(320 * density * (size / 88));
    const maxCount = Math.round(1200 * density * (size / 88));
    const particles = [];
    const rnd = (a, b) => a + Math.random() * (b - a);

    const make = (burst = false) => {
      const count = burst ? Math.round(baseCount * 1.8) : Math.round(baseCount * 0.6);
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const r0 = rnd(maxR * 0.2, maxR * 0.45);
        const sp = rnd(0.12, 0.6); // outward speed
        particles.push({
          x: cx + Math.cos(ang) * r0 * rnd(0.2,0.9),
          y: cy + Math.sin(ang) * r0 * rnd(0.2,0.9),
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          life: rnd(0.8, 2.0),
          age: 0,
          size: rnd(0.6, 1.8),
          hueOffset: rnd(-14, 18),
        });
      }
      while (particles.length > maxCount) particles.shift();
    };

    let last = performance.now();
    let trail = 0.08; // fade the screen each frame (higher = more ghosting)
    const loop = (t) => {
      const dt = Math.max(0.016, Math.min(0.048, (t - last) / 1000));
      last = t;

      // fade the frame for trails
      ctx.fillStyle = `rgba(0,0,0,${trail})`;
      ctx.fillRect(0, 0, px, px);

      // update/draw particles
      const baseHue = hue;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += dt;
        p.x += p.vx;
        p.y += p.vy;
        const alpha = Math.max(0, 1 - p.age / p.life) * 0.9;
        if (alpha <= 0 || dist2(p.x, p.y, cx, cy) > (maxR * 1.2) ** 2) {
          particles.splice(i, 1);
          continue;
        }
        const color = `hsla(${(baseHue + p.hueOffset + 360) % 360}, 85%, 65%, ${alpha})`;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // steady emission
      if (particles.length < maxCount * 0.8) make(false);

      rafRef.current = requestAnimationFrame(loop);
    };

    // preseed & start
    make(true);
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fillRect(0, 0, px, px);
    rafRef.current = requestAnimationFrame(loop);

    // burst on click
    const burst = () => make(true);
    canvas.addEventListener("mousedown", burst);
    return () => {
      canvas.removeEventListener("mousedown", burst);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [size, density, hue]);

  // positions
  const posStyle = {
    position: "fixed",
    zIndex: 1300,
    ...(position.includes("top") ? { top: 12 } : { bottom: 16 }),
    ...(position.includes("right") ? { right: 16 } : { left: 16 }),
  };

  const px = `${size}px`;
  const blurPx = Math.round(size * 0.75);
  const shadowPx = Math.round(size * 0.9);

  const colors = useMemo(() => {
    const a = `hsl(${hue} ${sat}% ${light}%)`;
    const b = `hsl(${(hue + 30) % 360} ${sat}% ${Math.max(40, light - 12)}%)`;
    const c = `hsl(${(hue + 300) % 360} ${Math.max(70, sat)}% ${Math.min(80, light + 10)}%)`;
    const edge = `hsl(${hue} ${Math.max(65, sat - 10)}% ${Math.min(92, light + 18)}%)`;
    return { a, b, c, edge };
  }, [hue, sat, light]);

  function handleClick() {
    // single vs double click
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      onOpen && onOpen();
    } else {
      clickTimer.current = setTimeout(() => {
        onToggle && onToggle();
        clickTimer.current = null;
      }, 210);
    }
  }

  const containerPx = Math.round(size * 2.6);

  return (
    <button
      ref={btnRef}
      type="button"
      aria-label="Summon Echo"
      title="Summon Echo"
      onClick={handleClick}
      onMouseDown={() => setArmed(true)}
      onMouseUp={() => setArmed(false)}
      onMouseLeave={() => setArmed(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle && onToggle(); }
        else if (e.key.toLowerCase() === "o") { e.preventDefault(); onOpen && onOpen(); }
      }}
      style={{
        ...posStyle,
        width: px,
        height: px,
        filter: "drop-shadow(0 0 6px var(--rim)) drop-shadow(0 0 14px var(--orb))",
        "--orb": colors.a,
        "--orb2": colors.b,
        "--orb3": colors.c,
        "--rim": colors.edge,
        "--glow": String(intensity),
        "--halo": "0",
      }}
      className={[
        "relative isolate rounded-full select-none outline-none transition-transform duration-150 ease-out",
        armed ? "scale-95" : "hover:scale-[1.03]",
        className,
      ].join(" ")}
    >
      {/* particle canvas behind everything (big) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          width: containerPx,
          height: containerPx,
          left: `calc(50% - ${containerPx / 2}px)`,
          top: `calc(50% - ${containerPx / 2}px)`,
          filter: `blur(${Math.round(size * 0.15)}px)`,
          opacity: `calc(0.55 * var(--glow) + 0.45 * var(--halo))`,
          mixBlendMode: "screen",
        }}
      >
        <canvas
          ref={canvasRef}
          width={containerPx}
          height={containerPx}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </div>

      {/* Core orb (glass gradient) */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background: `
            radial-gradient(120% 120% at 30% 30%, var(--rim) 0%, transparent 55%),
            radial-gradient(90% 90% at 65% 60%, var(--orb3) 0%, transparent 70%),
            radial-gradient(80% 80% at 40% 70%, var(--orb2) 0%, transparent 70%),
            radial-gradient(100% 100% at 50% 50%, var(--orb) 0%, #0a0f1a 85%)
          `,
          boxShadow: `0 0 ${shadowPx}px rgba(255,255,255,0.06), inset 0 0 24px rgba(255,255,255,0.25)`,
        }}
      />

      {/* soft halo */}
      <span
        aria-hidden
        className="absolute -inset-6 rounded-full opacity-80 pointer-events-none"
        style={{
          background: "radial-gradient(closest-side, var(--orb) 0%, transparent 70%)",
          filter: `blur(${blurPx}px)`,
          opacity: "calc(0.35 * var(--glow) + 0.65 * var(--halo))",
        }}
      />

      {/* idle breathe + spark */}
      {idle && (
        <>
          <span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{ animation: "echo-breathe 3.8s ease-in-out infinite, echo-tilt 10s ease-in-out infinite", mixBlendMode: "screen" }}
          />
          <span
            aria-hidden
            className="absolute left-1/3 top-1/4 h-1.5 w-1.5 rounded-full"
            style={{ background: "white", filter: "blur(1px)", boxShadow: "0 0 12px white, 0 0 28px var(--rim)", animation: "echo-spark 2.6s ease-in-out infinite" }}
          />
        </>
      )}
    </button>
  );
}

function dist2(x1, y1, x2, y2){ const dx = x1 - x2, dy = y1 - y2; return dx*dx + dy*dy; }
function clamp01(n){ return Math.max(0, Math.min(1, n)); }
