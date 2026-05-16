import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clipboard,
  TrendingDown,
} from "lucide-react";
import apiService from "../lib/api";
const theme = {
  colors: {
    primary: "#007AFF",
    secondary: "#5AC8FA",
    accent: "#FF3B30",
    card: "#FFFFFF",
    border: "#E5E7EB",
    background: "#F9FAFB",
    text: "#1F2937",
    textSecondary: "#6B7280",
    success: "#34C759",
    warning: "#FF9500",
    error: "#FF3B30",
  },
};
interface Variance {
  id: string;
  liquor_name?: string;
  beer_name?: string;
  wine_name?: string;
  expected_count: number;
  actual_count: number;
  variance_qty: number;
  variance_percentage: number;
  variance_type: string;
  status: string;
  created_at: string;
}
interface Audit {
  id: string;
  audit_id: string;
  audit_date: string;
  status: string;
  item_count: number;
  variance_count: number;
  audited_by_email: string;
}
interface AuditReport {
  total_variances: number;
  shortage_count: number;
  overage_count: number;
  breakage_count: number;
  total_units_variance: number;
  avg_variance_percentage: number;
  still_flagged: number;
  written_off: number;
  total_write_off_amount: number;
}
interface Tab {
  id: string;
  label: string;
  icon: string;
}
export const VarianceAudit: React.FC = () => {
  const [activeTab, setActiveTab] = useState("flagged");
  const [venueId, setVenueId] = useState<string | null>(
    localStorage.getItem("currentVenueId"),
  );
  const [loading, setLoading] = useState(false);
  const [variances, setVariances] = useState<Variance[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [showStartAudit, setShowStartAudit] = useState(false);
  useEffect(() => {
    if (venueId) {
      loadVariances();
      loadAudits();
      loadReport();
    }
  }, [venueId, activeTab]);
  const loadVariances = async () => {
    setLoading(true);
    try {
      const data = await apiService.getFlaggedVariances(venueId || "");
      setVariances(data || []);
    } catch (error) {
      console.error("Failed to load variances:", error);
    } finally {
      setLoading(false);
    }
  };
  const loadAudits = async () => {
    try {
      const data = await apiService.getAudits(venueId || "");
      setAudits(data || []);
    } catch (error) {
      console.error("Failed to load audits:", error);
    }
  };
  const loadReport = async () => {
    try {
      const data = await apiService.getVarianceReport(venueId || "");
      setReport(data);
    } catch (error) {
      console.error("Failed to load report:", error);
    }
  };
  const tabs: Tab[] = [
    { id: "flagged", label: "Flagged Variances", icon: "⚠️" },
    { id: "audits", label: "Audits", icon: "📋" },
    { id: "report", label: "Report", icon: "📊" },
  ];
  const renderFlaggedTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {" "}
      {variances.length === 0 ? (
        <div
          style={{
            padding: "3rem 2rem",
            textAlign: "center",
            backgroundColor: theme.colors.background,
            borderRadius: "12px",
            color: theme.colors.textSecondary,
          }}
        >
          {" "}
          <CheckCircle
            size={48}
            style={{ margin: "0 auto 1rem" }}
            color={theme.colors.success}
          />{" "}
          <p style={{ fontSize: "1.1rem", fontWeight: 600 }}>
            No flagged variances
          </p>{" "}
          <p style={{ marginTop: "0.5rem" }}>
            All inventory counts are within tolerance thresholds
          </p>{" "}
        </div>
      ) : (
        variances.map((variance) => (
          <div
            key={variance.id}
            style={{
              padding: "1.5rem",
              backgroundColor: theme.colors.card,
              border: `2px solid ${variance.variance_type === "shortage" ? theme.colors.error : theme.colors.warning}`,
              borderRadius: "12px",
            }}
          >
            {" "}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                marginBottom: "1rem",
              }}
            >
              {" "}
              <div>
                {" "}
                <p
                  style={{
                    fontWeight: 600,
                    fontSize: "1.1rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  {" "}
                  {variance.liquor_name ||
                    variance.beer_name ||
                    variance.wine_name}{" "}
                </p>{" "}
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: theme.colors.textSecondary,
                  }}
                >
                  {" "}
                  {variance.variance_type.toUpperCase()} of{" "}
                  {Math.abs(variance.variance_qty)} units{" "}
                </p>{" "}
              </div>{" "}
              <div
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor:
                    variance.variance_type === "shortage"
                      ? "#FEE2E2"
                      : "#FEF3C7",
                  color:
                    variance.variance_type === "shortage"
                      ? "#991B1B"
                      : "#92400E",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                }}
              >
                {" "}
                {variance.variance_percentage.toFixed(2)}% variance{" "}
              </div>{" "}
            </div>{" "}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              {" "}
              <div>
                {" "}
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: theme.colors.textSecondary,
                  }}
                >
                  Expected
                </p>{" "}
                <p
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    marginTop: "0.25rem",
                  }}
                >
                  {" "}
                  {variance.expected_count}{" "}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: theme.colors.textSecondary,
                  }}
                >
                  Actual
                </p>{" "}
                <p
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    marginTop: "0.25rem",
                  }}
                >
                  {" "}
                  {variance.actual_count}{" "}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: theme.colors.textSecondary,
                  }}
                >
                  Difference
                </p>{" "}
                <p
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    marginTop: "0.25rem",
                    color:
                      variance.variance_qty > 0
                        ? theme.colors.warning
                        : theme.colors.error,
                  }}
                >
                  {" "}
                  {variance.variance_qty > 0 ? "+" : ""}
                  {variance.variance_qty}{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
            <p
              style={{
                fontSize: "0.85rem",
                color: theme.colors.textSecondary,
                marginBottom: "1rem",
              }}
            >
              {" "}
              Flagged {new Date(variance.created_at).toLocaleDateString()}{" "}
            </p>{" "}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {" "}
              <button
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  backgroundColor: theme.colors.secondary,
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                {" "}
                Investigate{" "}
              </button>{" "}
              <button
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  backgroundColor: theme.colors.primary,
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                {" "}
                Write Off{" "}
              </button>{" "}
            </div>{" "}
          </div>
        ))
      )}{" "}
    </div>
  );
  const renderAuditsTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {" "}
      <button
        onClick={() => setShowStartAudit(!showStartAudit)}
        style={{
          padding: "0.75rem 1.5rem",
          backgroundColor: theme.colors.primary,
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontWeight: 600,
          cursor: "pointer",
          alignSelf: "flex-start",
        }}
      >
        {" "}
        + Start New Audit{" "}
      </button>{" "}
      {showStartAudit && (
        <div
          style={{
            padding: "1.5rem",
            backgroundColor: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: "12px",
          }}
        >
          {" "}
          <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>
            Start Physical Inventory Audit
          </h3>{" "}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            {" "}
            <div>
              {" "}
              <label
                style={{
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  display: "block",
                  marginBottom: "0.5rem",
                }}
              >
                {" "}
                Audit Date *{" "}
              </label>{" "}
              <input
                type="date"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: "8px",
                }}
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label
                style={{
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  display: "block",
                  marginBottom: "0.5rem",
                }}
              >
                {" "}
                Audited By *{" "}
              </label>{" "}
              <input
                type="email"
                placeholder="Your email"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: "8px",
                }}
              />{" "}
            </div>{" "}
          </div>{" "}
          <div style={{ marginBottom: "1rem" }}>
            {" "}
            <label
              style={{
                fontWeight: 600,
                fontSize: "0.9rem",
                display: "block",
                marginBottom: "0.5rem",
              }}
            >
              {" "}
              Notes{" "}
            </label>{" "}
            <textarea
              placeholder="Optional notes about this audit"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: `1px solid ${theme.colors.border}`,
                borderRadius: "8px",
                minHeight: "60px",
                fontFamily: "inherit",
              }}
            />{" "}
          </div>{" "}
          <button
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: theme.colors.success,
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {" "}
            Start Audit{" "}
          </button>{" "}
        </div>
      )}{" "}
      {audits.length === 0 ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            backgroundColor: theme.colors.background,
            borderRadius: "12px",
            color: theme.colors.textSecondary,
          }}
        >
          {" "}
          <p>No audits recorded</p>{" "}
        </div>
      ) : (
        audits.map((audit) => (
          <div
            key={audit.id}
            style={{
              padding: "1.5rem",
              backgroundColor: theme.colors.card,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: "12px",
            }}
          >
            {" "}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
              }}
            >
              {" "}
              <div>
                {" "}
                <p
                  style={{
                    fontWeight: 600,
                    fontSize: "1.1rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  {" "}
                  {audit.audit_id}{" "}
                </p>{" "}
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: theme.colors.textSecondary,
                    marginBottom: "0.5rem",
                  }}
                >
                  {" "}
                  {audit.item_count} items • {audit.variance_count}{" "}
                  variances{" "}
                </p>{" "}
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: theme.colors.textSecondary,
                  }}
                >
                  {" "}
                  {new Date(audit.audit_date).toLocaleDateString()} •{" "}
                  {audit.audited_by_email}{" "}
                </p>{" "}
              </div>{" "}
              <div
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor:
                    audit.status === "completed" ? "#DCFCE7" : "#FEF3C7",
                  color: audit.status === "completed" ? "#166534" : "#92400E",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                }}
              >
                {" "}
                {audit.status === "completed"
                  ? "✓ Completed"
                  : "⏳ In Progress"}{" "}
              </div>{" "}
            </div>{" "}
          </div>
        ))
      )}{" "}
    </div>
  );
  const renderReportTab = () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "1.5rem",
      }}
    >
      {" "}
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: theme.colors.card,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: "12px",
        }}
      >
        {" "}
        <p
          style={{
            fontSize: "0.85rem",
            color: theme.colors.textSecondary,
            fontWeight: 600,
          }}
        >
          {" "}
          Total Variances{" "}
        </p>{" "}
        <p style={{ fontSize: "2.5rem", fontWeight: 800, marginTop: "0.5rem" }}>
          {" "}
          {report?.total_variances || 0}{" "}
        </p>{" "}
      </div>{" "}
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: theme.colors.card,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: "12px",
        }}
      >
        {" "}
        <p
          style={{
            fontSize: "0.85rem",
            color: theme.colors.textSecondary,
            fontWeight: 600,
          }}
        >
          {" "}
          Avg Variance %{" "}
        </p>{" "}
        <p style={{ fontSize: "2.5rem", fontWeight: 800, marginTop: "0.5rem" }}>
          {" "}
          {report?.avg_variance_percentage?.toFixed(2)}%{" "}
        </p>{" "}
      </div>{" "}
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: "#FEE2E2",
          border: `1px solid ${theme.colors.error}`,
          borderRadius: "12px",
        }}
      >
        {" "}
        <p style={{ fontSize: "0.85rem", color: "#991B1B", fontWeight: 600 }}>
          {" "}
          Shortages{" "}
        </p>{" "}
        <p
          style={{
            fontSize: "2.5rem",
            fontWeight: 800,
            marginTop: "0.5rem",
            color: theme.colors.error,
          }}
        >
          {" "}
          {report?.shortage_count || 0}{" "}
        </p>{" "}
      </div>{" "}
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: "#FEF3C7",
          border: `1px solid ${theme.colors.warning}`,
          borderRadius: "12px",
        }}
      >
        {" "}
        <p style={{ fontSize: "0.85rem", color: "#92400E", fontWeight: 600 }}>
          {" "}
          Overages{" "}
        </p>{" "}
        <p
          style={{
            fontSize: "2.5rem",
            fontWeight: 800,
            marginTop: "0.5rem",
            color: theme.colors.warning,
          }}
        >
          {" "}
          {report?.overage_count || 0}{" "}
        </p>{" "}
      </div>{" "}
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: theme.colors.card,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: "12px",
        }}
      >
        {" "}
        <p
          style={{
            fontSize: "0.85rem",
            color: theme.colors.textSecondary,
            fontWeight: 600,
          }}
        >
          {" "}
          Still Flagged{" "}
        </p>{" "}
        <p style={{ fontSize: "2.5rem", fontWeight: 800, marginTop: "0.5rem" }}>
          {" "}
          {report?.still_flagged || 0}{" "}
        </p>{" "}
      </div>{" "}
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: "#DCFCE7",
          border: `1px solid ${theme.colors.success}`,
          borderRadius: "12px",
        }}
      >
        {" "}
        <p style={{ fontSize: "0.85rem", color: "#166534", fontWeight: 600 }}>
          {" "}
          Written Off{" "}
        </p>{" "}
        <p
          style={{
            fontSize: "2.5rem",
            fontWeight: 800,
            marginTop: "0.5rem",
            color: theme.colors.success,
          }}
        >
          {" "}
          {report?.written_off || 0}{" "}
        </p>{" "}
      </div>{" "}
      <div
        style={{
          gridColumn: "1 / -1",
          padding: "1.5rem",
          backgroundColor: theme.colors.card,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: "12px",
        }}
      >
        {" "}
        <p
          style={{
            fontSize: "0.85rem",
            color: theme.colors.textSecondary,
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}
        >
          {" "}
          Total Write-Off Amount{" "}
        </p>{" "}
        <p style={{ fontSize: "2rem", fontWeight: 800 }}>
          {" "}
          ${report?.total_write_off_amount?.toFixed(2) || "0.00"}{" "}
        </p>{" "}
      </div>{" "}
    </div>
  );
  const renderTabContent = () => {
    switch (activeTab) {
      case "flagged":
        return renderFlaggedTab();
      case "audits":
        return renderAuditsTab();
      case "report":
        return renderReportTab();
      default:
        return null;
    }
  };
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.colors.background,
        padding: "2rem 1rem",
      }}
    >
      {" "}
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {" "}
        {/* Header */}{" "}
        <div
          style={{
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          {" "}
          <AlertTriangle size={32} color={theme.colors.primary} />{" "}
          <div>
            {" "}
            <h1
              style={{
                fontSize: "2.5rem",
                fontWeight: 800,
                marginBottom: "0.25rem",
              }}
            >
              {" "}
              Variance & Audit Management{" "}
            </h1>{" "}
            <p style={{ fontSize: "1rem", color: theme.colors.textSecondary }}>
              {" "}
              Monitor inventory variances (1% tolerance) and conduct physical
              audits{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
        {/* Tabs */}{" "}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "2rem",
            borderBottom: `2px solid ${theme.colors.border}`,
            overflowX: "auto",
          }}
        >
          {" "}
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "1rem 1.5rem",
                backgroundColor: "transparent",
                border: "none",
                borderBottom:
                  activeTab === tab.id
                    ? `3px solid ${theme.colors.primary}`
                    : "none",
                color:
                  activeTab === tab.id
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                fontWeight: activeTab === tab.id ? 600 : 500,
                cursor: "pointer",
                fontSize: "0.95rem",
                whiteSpace: "nowrap",
              }}
            >
              {" "}
              {tab.icon} {tab.label}{" "}
            </button>
          ))}{" "}
        </div>{" "}
        {/* Tab Content */}{" "}
        {loading && (
          <p style={{ textAlign: "center", color: theme.colors.textSecondary }}>
            Loading...
          </p>
        )}{" "}
        {!loading && renderTabContent()}{" "}
      </div>{" "}
    </div>
  );
};
export default VarianceAudit;
