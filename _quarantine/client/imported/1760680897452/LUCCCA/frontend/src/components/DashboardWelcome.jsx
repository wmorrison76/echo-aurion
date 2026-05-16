// frontend/src/components/DashboardWelcome.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./DashboardWelcome.glass.css";

const LSK = "lu:home:widgets";

/* ---------------- Widgets (fake “live” data) ---------------- */
function useJitter(base, spread = 0.02, interval = 1500) {
  const [v, setV] = useState(base);
  useEffect(() => {
    const t = setInterval(() => {
      const n = base * (1 + (Math.random() * 2 - 1) * spread);
      setV(Math.max(0, n));
    }, interval);
    return () => clearInterval(t);
  }, [base, spread, interval]);
  return v;
}

function MiniSpark({ points = 20 }) {
  const values = useMemo(() => Array.from({ length: points }, () => 0), []);
  const [arr, setArr] = useState(values);
  useEffect(() => {
    const t = setInterval(() => setArr(a => a.slice(1).concat([Math.random()])), 500);
    return () => clearInterval(t);
  }, []);
  return (
    <svg viewBox="0 0 100 28" className="w-full h-14 opacity-80">
      <polyline
        fill="url(#g)" stroke="rgba(22,224,255,.8)" strokeWidth="1.5"
        points={arr.map((v, i) => `${(i / (arr.length - 1)) * 100},${28 - v * 24}`).join(" ")}
      />
      <defs>
        <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="rgba(22,224,255,.18)" />
          <stop offset="1" stopColor="rgba(22,224,255,0)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function CoversWidget() {
  const v = useJitter(1377, 0.015, 1200);
  return (
    <>
      <div className="text-4xl font-black text-white">{Math.round(v).toLocaleString()}</div>
      <MiniSpark />
    </>
  );
}

function FoodWidget() {
  const v = useJitter(0.275, 0.04, 1600);
  return (
    <>
      <div className="text-4xl font-black text-white">{(v * 100).toFixed(1)}%</div>
      <div className="h-2 bg-white/10 rounded">
        <div className="h-2 rounded bg-cyan-400/80" style={{ width: `${Math.min(100, v * 100)}%` }} />
      </div>
      <div className="text-xs text-cyan-200/70 mt-1">Target: 28–30%</div>
    </>
  );
}

function LaborWidget() {
  const v = useJitter(0.277, 0.035, 1700);
  return (
    <>
      <div className="text-4xl font-black text-white">{(v * 100).toFixed(1)}%</div>
      <div className="h-2 bg-white/10 rounded">
        <div className="h-2 rounded bg-cyan-400/80" style={{ width: `${Math.min(100, v * 100)}%` }} />
      </div>
      <div className="text-xs text-cyan-200/70 mt-1">Auto-updates from Scheduler</div>
    </>
  );
}

function OutletsWidget() {
  const ok = 6, attn = 4;
  return (
    <div className="flex items-center gap-5">
      <div className="flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full bg-green-400 shadow-[0_0_8px_rgba(34,197,94,.9)]" />
        <span className="text-3xl font-black text-white">{ok}</span>
      </div>
      <span className="text-cyan-200/60 text-xl">/</span>
      <div className="flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,.9)]" />
        <span className="text-3xl font-black text-white">{attn}</span>
      </div>
    </div>
  );
}

function PeopleWidget() {
  const today = ["Ava", "Ben", "Cam", "Diego", "Eve"];
  return (
    <div className="flex flex-wrap gap-2">
      {today.map(n => (
        <span key={n} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-cyan-100/90">{n}</span>
      ))}
      <button
        className="ml-auto px-3 py-1 rounded-md bg-cyan-500/20 border border-cyan-400/50 text-cyan-100"
        onClick={() => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "scheduling" } }))}
      >
        Open Scheduler
      </button>
    </div>
  );
}

const WIDGETS = {
  covers: { title: "Today's Covers", Component: CoversWidget, minW: 3 },
  food: { title: "Food Cost", Component: FoodWidget, minW: 3 },
  labor: { title: "Labor %", Component: LaborWidget, minW: 3 },
  outlets: { title: "Outlet Health", Component: OutletsWidget, minW: 3 },
  people: { title: "Who's Scheduled", Component: PeopleWidget, minW: 6 },
};

function greet() {
  const h = new Date().getHours();
  if (h < 4) return "Still up, Chef?";
  if (h < 12) return "Good Morning, Chef.";
  if (h < 17) return "Good Afternoon, Chef.";
  if (h < 22) return "Good Evening, Chef.";
  return "Late Night Mode, Chef.";
}

export default function DashboardWelcome() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LSK) || "null") || Object.keys(WIDGETS);
    } catch {
      return Object.keys(WIDGETS);
    }
  });
  useEffect(() => localStorage.setItem(LSK, JSON.stringify(enabled)), [enabled]);

  const toggle = (id) =>
    setEnabled(arr => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);

  const title = useMemo(greet, []);

  return (
    <div className="p-6">
      <h1 className="dw-title text-4xl sm:text-5xl font-extrabold tracking-tight mb-2">
        {title}
      </h1>
      <p className="opacity-80 mb-4">Live pulse • covers, costs, labor and staff status.</p>

      {/* widget selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(WIDGETS).map(([id, meta]) => (
          <button
            key={id}
            className={`px-3 py-1 rounded-md border ${enabled.includes(id)
              ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-100"
              : "bg-white/5 border-white/10 text-white/70"}`}
            onClick={() => toggle(id)}
          >
            {enabled.includes(id) ? "✓ " : ""}{meta.title}
          </button>
        ))}
      </div>

      {/* grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {enabled.map((id) => {
          const { Component, title } = WIDGETS[id];
          return (
            <section key={id} className="relative glass-card p-4">
              <div className="glass-sheen" />
              <h3 className="font-bold text-cyan-100/90 mb-2">{title}</h3>
              <Component />
            </section>
          );
        })}
      </div>
    </div>
  );
}
