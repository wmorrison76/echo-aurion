import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { EchoOrb, useEchoOrbController } from "@/echo-orb";
import { onOrb } from "@/utils/echoOrbBus";

/** Compact orb pinned to a screen corner (via body portal). */
export default function OrbOverlay({
  corner   = "top-right",   // "top-right" | "bottom-right" | "top-left" | "bottom-left"
  size     = 95,            // compact default
  pad      = 4,             // distance from edges
  offsetX  = 0,            // + = push right,  − = push left
  offsetY  = -5,             // + = push down,   − = push up
  zIndex   = 200000,
}) {
  const ctrl = useEchoOrbController();

  // React to global events (question/answer/error/ping)
  useEffect(() => {
    const off = onOrb(({ type }) => {
      if (type === "question") ctrl.current?.ingestEvent("question");
      else if (type === "answer") ctrl.current?.ingestEvent("answer");
      else if (type === "error")  ctrl.current?.ingestEvent("error");
      else                        ctrl.current?.ingestEvent("ping");
    });
    return off;
  }, []);

  // Autoplay: kick off a little sequence + periodic sparkle so it never looks idle
  useEffect(() => {
    const kick = setTimeout(() => {
      ctrl.current?.ingestEvent("question");
      setTimeout(() => ctrl.current?.ingestEvent("answer"), 900);
    }, 250);
    const spark = setInterval(() => ctrl.current?.sparkle?.(12), 1600);
    return () => { clearTimeout(kick); clearInterval(spark); };
  }, []);

  const pos = { position: "fixed", pointerEvents: "none", zIndex };
  const topPad    = `calc(env(safe-area-inset-top, 0px) + ${pad}px + ${offsetY}px)`;
  const rightPad  = `calc(env(safe-area-inset-right, 0px) + ${pad}px + ${offsetX}px)`;
  const bottomPad = `calc(env(safe-area-inset-bottom, 0px) + ${pad}px - ${offsetY}px)`;
  const leftPad   = `calc(env(safe-area-inset-left, 0px) + ${pad}px - ${offsetX}px)`;
  if (corner.includes("top")) pos.top = topPad; else pos.bottom = bottomPad;
  if (corner.includes("right")) pos.right = rightPad; else pos.left = leftPad;

  const node = (
    <div className="orb-portaled" style={{ ...pos, width: size, height: size }}>
      {/* tendrils = filaments; switch to "hybrid" to add speck highlights */}
      <EchoOrb ref={ctrl} size={size} quality="high" renderStyle="tendrils" />
    </div>
  );
  return createPortal(node, document.body);
}
