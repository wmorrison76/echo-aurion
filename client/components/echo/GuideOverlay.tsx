import { useEffect, useState } from "react";

type Step = { selector: string; text: string };

export default function GuideOverlay() {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    const onStart = (e: any) => {
      const arr = (e?.detail?.steps || []) as Step[];
      if (Array.isArray(arr) && arr.length) {
        setSteps(arr);
        setI(0);
      }
    };
    window.addEventListener("guide:start", onStart as any);
    return () => window.removeEventListener("guide:start", onStart as any);
  }, []);

  if (!steps) return null;
  const step = steps[i];
  const el = step
    ? (document.querySelector(step.selector) as HTMLElement | null)
    : null;
  const r = el ? el.getBoundingClientRect() : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        pointerEvents: "none",
      }}
    >
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)" }}
      />
      {r && (
        <div
          style={{
            position: "fixed",
            left: r.left - 6,
            top: r.top - 6,
            width: r.width + 12,
            height: r.height + 12,
            border: "2px solid #38bdf8",
            borderRadius: 8,
            boxShadow: "0 0 24px rgba(56,189,248,0.6)",
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          position: "fixed",
          left: r ? r.left : 24,
          top: r ? r.bottom + 12 : 24,
          maxWidth: 360,
          background: "rgba(17,24,39,0.95)",
          color: "#fff",
          padding: 12,
          borderRadius: 8,
          border: "1px solid rgba(56,189,248,0.5)",
          pointerEvents: "auto",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>
          Step {i + 1} / {steps.length}
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.4 }}>{step?.text || ""}</div>
        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={() => setSteps(null)}
            style={{
              padding: "4px 8px",
              fontSize: 12,
              border: "1px solid #999",
              borderRadius: 6,
              background: "transparent",
              color: "#ddd",
            }}
          >
            Close
          </button>
          <button
            onClick={() => setI((v) => Math.max(0, v - 1))}
            disabled={i === 0}
            style={{
              padding: "4px 8px",
              fontSize: 12,
              border: "1px solid #38bdf8",
              borderRadius: 6,
              background: "transparent",
              color: "#38bdf8",
              opacity: i === 0 ? 0.5 : 1,
            }}
          >
            Back
          </button>
          <button
            onClick={() => {
              if (i < steps.length - 1) setI(i + 1);
              else setSteps(null);
            }}
            style={{
              padding: "4px 8px",
              fontSize: 12,
              border: "1px solid #38bdf8",
              borderRadius: 6,
              background: "#38bdf81a",
              color: "#38bdf8",
            }}
          >
            {i < steps.length - 1 ? "Next" : "Finish"}
          </button>
        </div>
      </div>
    </div>
  );
}
