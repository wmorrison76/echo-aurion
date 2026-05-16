import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  size?: number;
  intensity?: number;  // 0..1
  idle?: boolean;
  fixed?: boolean;
  className?: string;
  onSummon?: () => void;       // single click
  onSummonFullscreen?: () => void; // double click
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export default function EchoOrb({
  size = 84,
  intensity = 0.95,
  idle = true,
  fixed = true,
  className = "",
  onSummon,
  onSummonFullscreen,
}: Props) {
  const [hue, setHue] = useState<number>(() => Math.floor(Math.random() * 360));
  const [sat, setSat] = useState<number>(85);
  const [light, setLight] = useState<number>(58);
  const [armed, setArmed] = useState(false);
  const orbRef = useRef<HTMLButtonElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = orbRef.current; if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      el.style.setProperty("--halo", String(clamp01(1 - d / 300)));
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // gentle random color drift
  useEffect(() => {
    let t = 0;
    const step = () => {
      t += 1;
      setHue((h) => (h + 0.12) % 360);
      if (t % 360 === 0) {
        setSat((s) => clamp01(s / 100 + (Math.random() * 0.2 - 0.1)) * 100);
        setLight((l) => clamp01(l / 100 + (Math.random() * 0.16 - 0.08)) * 100);
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, []);

  const colors = useMemo(() => {
    const a = `hsl(${hue} ${sat}% ${light}%)`;
    const b = `hsl(${(hue + 30) % 360} ${sat}% ${Math.max(40, light - 12)}%)`;
    const c = `hsl(${(hue + 300) % 360} ${Math.max(70, sat)}% ${Math.min(80, light + 10)}%)`;
    const edge = `hsl(${hue} ${Math.max(65, sat - 10)}% ${Math.min(92, light + 18)}%)`;
    return { a, b, c, edge };
  }, [hue, sat, light]);

  const px = `${size}px`;
  const blurPx = Math.round(size * 0.75);
  const shadowPx = Math.round(size * 0.9);

  let clickTimer: number | null = null;
  const handleClick = () => {
    // single vs double click
    if (clickTimer) return; // waiting for dblclick
    clickTimer = window.setTimeout(() => {
      clickTimer && window.clearTimeout(clickTimer);
      clickTimer = null;
      onSummon?.();
    }, 200);
  };
  const handleDouble = () => {
    if (clickTimer) { window.clearTimeout(clickTimer); clickTimer = null; }
    onSummonFullscreen?.();
  };

  return (
    <button
      ref={orbRef}
      type="button"
      aria-label="Summon Echo"
      title="Summon Echo"
      onClick={handleClick}
      onDoubleClick={handleDouble}
      onMouseDown={() => setArmed(true)}
      onMouseUp={() => setArmed(false)}
      onMouseLeave={() => setArmed(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault(); onSummon?.();
        }
      }}
      style={
        {
          width: px,
          height: px,
          "--orb": colors.a,
          "--orb2": colors.b,
          "--orb3": colors.c,
          "--rim": colors.edge,
          "--glow": String(intensity),
          "--halo": "0",
          filter: "drop-shadow(0 0 6px var(--rim)) drop-shadow(0 0 14px var(--orb))",
        } as React.CSSProperties
      }
      className={[
        fixed ? "fixed top-3 right-4 z-[1300]" : "",
        "relative isolate rounded-full select-none outline-none",
        "transition-transform duration-150 ease-out",
        armed ? "scale-95" : "hover:scale-[1.03]",
        className,
      ].join(" ")}
    >
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
          boxShadow: `
            0 0 ${shadowPx}px rgba(255,255,255,0.06),
            inset 0 0 24px rgba(255,255,255,0.25)
          `,
        }}
      />
      <span
        aria-hidden
        className="absolute -inset-6 rounded-full opacity-80 pointer-events-none"
        style={{
          background: "radial-gradient(closest-side, var(--orb) 0%, transparent 70%)",
          filter: `blur(${blurPx}px)`,
          opacity: "calc(0.45 * var(--glow) + 0.55 * var(--halo))",
        }}
      />
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
