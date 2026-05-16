import { ArrowLeft } from "lucide-react";

export interface ComingSoonProps {
  title: string;
  eyebrow: string;
  endpoints: string[];
  doctrineNote?: string;
  onBack: () => void;
}

export default function ComingSoon({
  title,
  eyebrow,
  endpoints,
  doctrineNote,
  onBack,
}: ComingSoonProps) {
  return (
    <div className="app-shell">
      <div className="sub-header">
        <div className="brand">
          <button
            type="button"
            onClick={onBack}
            className="crumb"
            style={{ marginBottom: 0 }}
            data-testid="back-to-live"
          >
            <ArrowLeft size={14} />
          </button>
          <span className="brand-mark">{title}</span>
          <span className="brand-sub">{eyebrow}</span>
        </div>
        <div className="banner-meta">
          <span>
            <span className="status-dot warn" /> ui · under construction
          </span>
        </div>
      </div>

      <div className="drilldown" data-testid="coming-soon-page">
        <div className="section-title">{title}</div>
        <div className="section-sub">{eyebrow}</div>

        <div
          className="callout"
          style={{
            fontStyle: "normal",
            fontFamily: "Inter, sans-serif",
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          <div
            style={{
              fontFamily: "Fraunces, serif",
              fontStyle: "italic",
              fontSize: 18,
              marginBottom: 12,
            }}
          >
            §1.1 · This module's UI is under construction.
          </div>
          The substrate is live — the endpoints below are returning real data from{" "}
          <span style={{ color: "var(--gold)", fontFamily: "JetBrains Mono, monospace" }}>
            pier-sixty-six-demo
          </span>{" "}
          right now. The frontend rendering layer is the work that remains. Per doctrine §1.1,
          this missing-data state surfaces here as a first-class fact — not a 404, not a generic
          placeholder.
          {doctrineNote && (
            <div style={{ marginTop: 12, fontSize: 13, color: "var(--dim)" }}>{doctrineNote}</div>
          )}
        </div>

        <div className="panel" style={{ marginTop: 20 }}>
          <div className="panel-head">
            <div className="panel-title">Live Backend Endpoints</div>
            <span className="eyebrow">curl-able · {endpoints.length} routes</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {endpoints.map((ep, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  border: "1px solid var(--line-soft)",
                  borderRadius: 2,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "var(--cream)" }}>
                  <span style={{ color: "var(--green)" }}>GET</span>{" "}
                  <span style={{ color: "var(--gold)" }}>{ep}</span>
                </span>
                <span style={{ color: "var(--dim)" }}>live · returning data</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button
            type="button"
            onClick={onBack}
            className="btn"
            data-testid="back-to-live-cta"
          >
            ← back to live dashboard
          </button>
        </div>

        <div
          style={{
            marginTop: 32,
            padding: "20px 0",
            borderTop: "1px solid var(--line-soft)",
            fontSize: 11,
            color: "var(--dim2)",
            fontFamily: "JetBrains Mono, monospace",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span>§1.1 · transparency · data quality and missing-data states surface as first-class facts</span>
        </div>
      </div>
    </div>
  );
}
