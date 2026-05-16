// Lightweight typed fetch wrapper for the LUCCCA backend
const RAW = (import.meta as any).env?.VITE_BACKEND_URL
  || (import.meta as any).env?.REACT_APP_BACKEND_URL
  || "";

// Strip trailing slash so we can compose `${API}/api/...` cleanly
export const API = String(RAW).replace(/\/+$/, "");

export async function get<T = any>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${path}`);
  return res.json();
}

export async function post<T = any>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${path}`);
  return res.json();
}

// Display helpers
export const fmtUsd = (cents: number, opts: { compact?: boolean } = {}) => {
  if (cents == null || isNaN(cents)) return "—";
  const dollars = cents / 100;
  if (opts.compact && Math.abs(dollars) >= 1000) {
    if (Math.abs(dollars) >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
    if (Math.abs(dollars) >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(dollars);
};

export const fmtNum = (n: number, opts: { compact?: boolean } = {}) => {
  if (n == null || isNaN(n)) return "—";
  if (opts.compact && Math.abs(n) >= 1000) {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat("en-US").format(n);
};

export const fmtPct = (frac: number, digits = 1) => {
  if (frac == null || isNaN(frac)) return "—";
  return `${(frac * 100).toFixed(digits)}%`;
};

// Demo property is the canonical seeded property
export const DEMO_PROPERTY = "pier-sixty-six-demo";

// Friendly tag for the data_source string returned by the backend
export const sourceTag = (src: string | undefined): { label: string; cls: "live" | "fallback" | "cold" } => {
  if (!src) return { label: "unknown", cls: "fallback" };
  const s = src.toLowerCase();
  if (s.includes("live") || s.includes("v1") || s.includes("mongo") || s.includes("outlet_capture")) {
    return { label: src, cls: "live" };
  }
  if (s.includes("cold") || s.includes("synthetic") || s.includes("none")) {
    return { label: src, cls: "cold" };
  }
  return { label: src, cls: "fallback" };
};
