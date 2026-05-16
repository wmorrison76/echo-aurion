import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { EchoOrb, useEchoOrbController } from "@/echo-orb";
import { onOrb } from "@/utils/echoOrbBus";

function styleFromCorner(corner, pad, offX, offY, z) {
  const s = { position: "fixed", pointerEvents: "none", zIndex: z };
  const top    = `calc(env(safe-area-inset-top, 0px) + ${pad}px + ${offY}px)`;
  const right  = `calc(env(safe-area-inset-right, 0px) + ${pad}px + ${offX}px)`;
  const bottom = `calc(env(safe-area-inset-bottom, 0px) + ${pad}px - ${offY}px)`;
  const left   = `calc(env(safe-area-inset-left, 0px) + ${pad}px - ${offX}px)`;
  if (corner.includes("top")) s.top = top; else s.bottom = bottom;
  if (corner.includes("right")) s.right = right; else s.left = left;
  return s;
}

/** Large translucent backplate + smaller active orb, aligned at a corner. */
export default function OrbDock({
  corner        = "top-right",

  // sizes
  backSize      = 168,
  orbSize       = 95,

  // edge padding
  pad           = 6,

  // per-orb offsets (px) relative to the same corner
  backOffsetX   = 0,
  backOffsetY   = 0,
  orbOffsetX    = -4,
  orbOffsetY    = 62,     // ⬅️ moved UP from 78 → 62

  // layering & styles
  zIndex        = 200000,
  backStyle     = "tendrils",
  orbStyle      = "tendrils",

  autoplay      = true,
}) {
  const backCtrl = useEchoOrbController();
  const orbCtrl  = useEchoOrbController();

  // Route global bus events to the active orb
  useEffect(() => {
    const off = onOrb(({ type }) => {
      if (type === "question") orbCtrl.current?.ingestEvent("question");
      else if (type === "answer") orbCtrl.current?.ingestEvent("answer");
      else if (type === "error")  orbCtrl.current?.ingestEvent("error");
      else                        orbCtrl.current?.ingestEvent("ping");
    });
    return off;
  }, []);

  // Nonstop “breathing” + sparkle (RAF loop)
  useEffect(() => {
    if (!autoplay) return;
    let raf = 0, t0 = performance.now();
    const loop = (t) => {
      const sec = (t - t0) / 1000;
      // subtle low-freq oscillator [0..1]
      const osc = 0.5 + 0.5 * Math.sin(sec * 1.0);

      // Prefer pulse API if available; otherwise nudge with ping
      const pulse = (c, amt) => (c.current?.pulse ? c.current.pulse(amt) : c.current?.ingestEvent("ping"));
      pulse(orbCtrl, 0.28 + osc * 0.14);
      pulse(backCtrl, 0.16 + osc * 0.08);

      // occasional twinkle
      if ((sec % 1.2) < 0.016) {
        orbCtrl.current?.sparkle?.(10);
        backCtrl.current?.sparkle?.(6);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const backNode = (
    <div
      className="orb-portaled"
      style={{ ...styleFromCorner(corner, pad, backOffsetX, backOffsetY, zIndex - 1), width: backSize, height: backSize }}
    >
      <EchoOrb ref={backCtrl} size={backSize} quality="high" renderStyle={backStyle} />
    </div>
  );

  const orbNode = (
    <div
      className="orb-portaled"
      style={{ ...styleFromCorner(corner, pad, orbOffsetX, orbOffsetY, zIndex), width: orbSize, height: orbSize }}
    >
      <EchoOrb ref={orbCtrl} size={orbSize} quality="high" renderStyle={orbStyle} />
    </div>
  );

  return (
    <>
      {createPortal(backNode, document.body)}
      {createPortal(orbNode,  document.body)}
    </>
  );
}
