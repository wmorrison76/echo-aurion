import React, { useEffect, useRef } from "react";

/** Professional, subtle floating text (parallax + blur) */
export default function FloatingTextOverlay({ text = "LIVE", opacity = 0.12 }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e) => {
      const { innerWidth: w, innerHeight: h } = window;
      const dx = (e.clientX - w/2) / (w/2);
      const dy = (e.clientY - h/2) / (h/2);
      el.style.transform = `translate3d(${dx*8}px, ${dy*6}px, 0)`;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none select-none fixed top-16 left-1/2 -translate-x-1/2"
      style={{ filter: "blur(1.2px)", letterSpacing: "0.18em", opacity }}
    >
      <div className="text-[72px] md:text-[96px] font-black tracking-widest text-white/90 drop-shadow-[0_6px_24px_rgba(0,0,0,0.35)]">
        {text}
      </div>
    </div>
  );
}
