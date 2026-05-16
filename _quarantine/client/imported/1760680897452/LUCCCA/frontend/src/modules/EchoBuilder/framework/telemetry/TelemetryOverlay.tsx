import React, { useEffect, useRef, useState } from "react";

export function TelemetryOverlay(){
  const rafId = useRef<number | null>(null);
  const last = useRef(performance.now());
  const frames = useRef(0);
  const [fps, setFps] = useState(0);
  const [mem, setMem] = useState<string | null>(null);

  useEffect(() => {
    const loop = (t: number) => {
      frames.current++;
      const dt = t - last.current;
      if (dt >= 1000) {
        setFps(Math.round((frames.current * 1000) / dt));
        frames.current = 0; last.current = t;
      }
      rafId.current = requestAnimationFrame(loop);
    };
    rafId.current = requestAnimationFrame(loop);
    const memTimer = window.setInterval(() => {
      const n = (performance as any).memory;
      if (n) setMem(`${(n.usedJSHeapSize/1048576).toFixed(0)} / ${(n.jsHeapSizeLimit/1048576).toFixed(0)} MB`);
    }, 1500);
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); clearInterval(memTimer); };
  }, []);

  return (
    <div className="fixed bottom-3 right-3 z-[1400] px-3 py-2 rounded-lg text-xs
                    bg-[rgba(10,16,28,.85)] border border-white/12 shadow">
      <div>FPS: <b>{fps}</b> {mem && <span className="opacity-75">• Mem {mem}</span>}</div>
    </div>
  );
}

export default TelemetryOverlay;
