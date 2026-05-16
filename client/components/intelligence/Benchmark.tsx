/**
 * iter195 · FM-Upgrade 6 — Glass-Box Benchmark UX contract
 *
 * This component exists to ENFORCE explainability on every benchmark. Using
 * it is the only sanctioned way to render a peer/industry comparison number
 * in LUCCCA. Drive-by numbers without peer-set/sample/method are not allowed.
 *
 * The contract:
 *   - Every benchmark MUST show: the value, the peer set, the sample size,
 *     the method, and an actionable recommendation (optional but encouraged).
 *
 * Codebase discipline: if you find yourself rendering a "top-quartile",
 * "peer median", or "industry standard" number WITHOUT this component, stop.
 * Route it through here.
 */
import React from "react";

export type PeerSet = {
  size: number;                // e.g., 47
  geo?: string;                // "Mountain West"
  volume_range?: string;       // "2K–8K meals/week"
  channel_mix?: string;        // "protein-forward menus"
};

export type Sample = {
  window: string;              // "last 30 days"
  n: number;                   // data points considered
};

export type BenchmarkRec = {
  action: string;              // short verb phrase
  vendors?: string[];          // optional list of vendor names
};

export type BenchmarkProps = {
  label: string;               // "Chicken breast cost"
  value: string | number;      // "$4.12/lb" or 4.12
  unit?: string;               // "/lb"
  peerMedian?: string | number;
  peerTopQuartile?: string | number;
  peerSet: PeerSet;
  sample: Sample;
  method: string;              // "Volume-weighted average across peer invoices..."
  recommendation?: BenchmarkRec;
  tone?: "neutral" | "better" | "worse";
  testId?: string;
};

const TONE_COLORS: Record<NonNullable<BenchmarkProps["tone"]>, { border: string; accent: string }> = {
  neutral: { border: "rgba(200,169,126,0.35)", accent: "#c8a97e" },
  better:  { border: "rgba(34,197,94,0.4)",   accent: "#86efac" },
  worse:   { border: "rgba(239,68,68,0.4)",   accent: "#fca5a5" },
};

/**
 * Glass-Box Benchmark. Enforces FM-Upgrade 6 quality bar #3 from Claude spec §8.
 * Never shows a number without its peer-set + sample + method context.
 */
export default function Benchmark(props: BenchmarkProps) {
  const { label, value, unit, peerMedian, peerTopQuartile, peerSet, sample, method, recommendation } = props;
  const tone = props.tone || "neutral";
  const colors = TONE_COLORS[tone];
  const testId = props.testId || `benchmark-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <article data-testid={testId} style={{
      padding: 16, borderRadius: 14,
      background: "rgba(255,255,255,0.025)",
      border: `1px solid ${colors.border}`,
      color: "#f5efe4", fontFamily: "system-ui, sans-serif", maxWidth: 560,
    }}>
      <header style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "#c8a97e", fontWeight: 700 }}>
          Benchmark · Glass-Box
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "4px 0 0" }}>{label}</h3>
      </header>

      <section data-testid={`${testId}-values`} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        <ValueCell label="You"         value={value}            unit={unit} accent={colors.accent} prominent />
        <ValueCell label="Peer median" value={peerMedian ?? "—"} unit={unit} />
        <ValueCell label="Top quartile" value={peerTopQuartile ?? "—"} unit={unit} />
      </section>

      <section data-testid={`${testId}-context`} style={{
        marginTop: 12, padding: 10, borderRadius: 10,
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
        fontSize: 11, color: "#cbd5e1", lineHeight: 1.55,
      }}>
        <div>
          <strong style={{ color: "#f5efe4" }}>Peer set:</strong> {peerSet.size} operators
          {peerSet.volume_range && `, ${peerSet.volume_range}`}
          {peerSet.geo && `, ${peerSet.geo}`}
          {peerSet.channel_mix && `, ${peerSet.channel_mix}`}
        </div>
        <div style={{ marginTop: 4 }}>
          <strong style={{ color: "#f5efe4" }}>Sample:</strong> {sample.window}, n={sample.n.toLocaleString()}
        </div>
        <div style={{ marginTop: 4 }}>
          <strong style={{ color: "#f5efe4" }}>Method:</strong> {method}
        </div>
      </section>

      {recommendation && (
        <section data-testid={`${testId}-recommendation`} style={{
          marginTop: 10, padding: 10, borderRadius: 10,
          background: "rgba(200,169,126,0.08)", borderLeft: `3px solid ${colors.accent}`,
          fontSize: 12, color: "#f5efe4",
        }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
            Recommendation
          </div>
          <div>{recommendation.action}</div>
          {recommendation.vendors && recommendation.vendors.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: "#cbd5e1" }}>
              <strong style={{ color: "#f5efe4" }}>Vendors:</strong> {recommendation.vendors.join(" · ")}
            </div>
          )}
        </section>
      )}
    </article>
  );
}

function ValueCell(props: { label: string; value: string | number; unit?: string; accent?: string; prominent?: boolean }) {
  return (
    <div style={{
      padding: 10, borderRadius: 10,
      background: props.prominent ? "rgba(200,169,126,0.08)" : "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)", textAlign: "center",
    }}>
      <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>{props.label}</div>
      <div style={{ fontSize: props.prominent ? 20 : 16, fontWeight: 800, marginTop: 3, color: props.accent || "#f5efe4" }}>
        {props.value}{props.unit}
      </div>
    </div>
  );
}
