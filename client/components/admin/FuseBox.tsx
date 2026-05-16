/**
 * D17f · Fuse Box admin panel.
 *
 * Renders the snapshot from `GET /api/admin/fuse-box` — every
 * infrastructure wire grouped by category, with a green/red dot per
 * wire and a per-category roll-up at the top. Read-only by design;
 * secrets are masked server-side ("set" / "") and never sent to the
 * browser.
 *
 * Audience: DevOps / customer IT verifying what's wired before going
 * live, or after migrating to a new server. Not a place to *edit*
 * secrets — that happens in .env / the secrets manager.
 */
import React, { useCallback, useEffect, useState } from "react";

interface Wire {
  key: string;
  value: string | null;
  configured: boolean;
  category: string;
  doc: string;
}

interface FuseBoxResponse {
  ok: boolean;
  env: string;
  by_category: Record<string, { wired: number; total: number }>;
  wires: Wire[];
}

interface HealthCheck {
  ok: boolean;
  error?: string;
  latency_ms?: number;
  wired?: boolean;
  note?: string;
}

interface HealthResponse {
  ok: boolean;
  checks: Record<string, HealthCheck>;
}

const CATEGORY_LABELS: Record<string, string> = {
  deployment:    "Deployment",
  database:      "Database",
  auth:          "Auth",
  "ai-providers":"AI Providers",
  storage:       "Storage",
  telemetry:     "Telemetry",
  other:         "Other",
};

const CATEGORY_ORDER = [
  "deployment", "database", "auth", "ai-providers",
  "storage", "telemetry", "other",
];

export default function FuseBox() {
  const [data, setData] = useState<FuseBoxResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const [snapRes, healthRes] = await Promise.all([
        fetch("/api/admin/fuse-box"),
        fetch("/api/admin/fuse-box/health"),
      ]);
      if (!snapRes.ok) throw new Error(`fuse-box: ${snapRes.status}`);
      if (!healthRes.ok) throw new Error(`health: ${healthRes.status}`);
      setData(await snapRes.json());
      setHealth(await healthRes.json());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return <div className="p-6 text-sm opacity-70">Loading fuse box…</div>;
  }
  if (err && !data) {
    return (
      <div className="p-6">
        <div className="text-sm text-rose-600">Failed to load fuse box: {err}</div>
        <button onClick={load} className="mt-3 px-3 py-1.5 rounded border text-sm">
          Retry
        </button>
      </div>
    );
  }
  if (!data) return null;

  const grouped: Record<string, Wire[]> = {};
  for (const w of data.wires) {
    grouped[w.category] = grouped[w.category] || [];
    grouped[w.category].push(w);
  }
  const orderedCats = [
    ...CATEGORY_ORDER.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <header className="flex items-baseline justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fuse Box</h2>
          <p className="text-sm opacity-70 mt-1">
            Infrastructure wiring for this LUCCCA instance. Edit{" "}
            <code className="px-1 rounded bg-slate-100">.env</code> /
            secrets manager and restart to change values.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <EnvPill env={data.env} />
          <button
            onClick={load}
            className="px-3 py-1.5 rounded border hover:bg-slate-50"
            disabled={loading}
          >
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </header>

      <CategoryRollup
        byCategory={data.by_category}
        order={orderedCats}
      />

      {health && <HealthStrip checks={health.checks} />}

      <div className="space-y-6">
        {orderedCats.map((cat) => (
          <CategoryCard
            key={cat}
            category={cat}
            wires={grouped[cat]}
          />
        ))}
      </div>

      <p className="text-xs opacity-60 pt-4 border-t">
        Per-customer business integrations (Stripe accounts, Toast POS,
        ADP payroll, OpenTable, etc.) are managed separately in the
        Integrations Hub — they don't appear here because they belong to
        the customer, not the server.
      </p>
    </div>
  );
}

// ─── Pieces ────────────────────────────────────────────────────────────

function EnvPill({ env }: { env: string }) {
  const tone =
    env === "production" ? "bg-rose-50 text-rose-700 border-rose-200" :
    env === "staging"    ? "bg-amber-50 text-amber-700 border-amber-200" :
                           "bg-emerald-50 text-emerald-700 border-emerald-200";
  return (
    <span className={`px-2 py-1 rounded border text-xs font-medium ${tone}`}>
      {env}
    </span>
  );
}

function CategoryRollup({
  byCategory,
  order,
}: {
  byCategory: Record<string, { wired: number; total: number }>;
  order: string[];
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      {order.map((cat) => {
        const c = byCategory[cat];
        if (!c) return null;
        const complete = c.wired === c.total;
        return (
          <div
            key={cat}
            className={`rounded-lg border p-3 ${
              complete
                ? "bg-emerald-50 border-emerald-200"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            <div className="text-xs uppercase opacity-70">
              {CATEGORY_LABELS[cat] || cat}
            </div>
            <div className="text-lg font-semibold mt-1">
              {c.wired}/{c.total}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HealthStrip({ checks }: { checks: Record<string, HealthCheck> }) {
  return (
    <div className="rounded-lg border p-3 bg-slate-50">
      <div className="text-xs uppercase opacity-70 mb-2">Live health</div>
      <div className="flex flex-wrap gap-3">
        {Object.entries(checks).map(([service, h]) => (
          <div key={service} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className={`inline-block w-2 h-2 rounded-full ${
                h.ok ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            <span className="font-medium">{service}</span>
            {typeof h.latency_ms === "number" && (
              <span className="opacity-60 text-xs">{h.latency_ms} ms</span>
            )}
            {h.error && <span className="text-rose-600 text-xs">({h.error})</span>}
            {h.note && <span className="opacity-60 text-xs">{h.note}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  wires,
}: {
  category: string;
  wires: Wire[];
}) {
  return (
    <section className="rounded-lg border">
      <header className="px-4 py-2 border-b bg-slate-50 rounded-t-lg">
        <h3 className="text-sm font-semibold">
          {CATEGORY_LABELS[category] || category}
        </h3>
      </header>
      <ul className="divide-y">
        {wires.map((w) => (
          <li key={w.key} className="px-4 py-3 flex items-start gap-3">
            <span
              aria-hidden
              className={`mt-1.5 inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                w.configured ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3">
                <code className="text-sm font-mono">{w.key}</code>
                <span className={`text-xs ${w.configured ? "text-emerald-600" : "text-slate-500"}`}>
                  {w.configured ? "wired" : "not configured"}
                </span>
              </div>
              {w.doc && (
                <div className="text-xs opacity-70 mt-1">{w.doc}</div>
              )}
              {w.value && w.value !== "set" && (
                <div className="text-xs font-mono mt-1 opacity-80">{w.value}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
