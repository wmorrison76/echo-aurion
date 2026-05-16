import React, { useState, useEffect } from "react";
import { Wine as WineIcon, BarChart3, TrendingUp } from "lucide-react";
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
  },
};
interface CompedDrink {
  id: string;
  comp_id: string;
  liquor_name?: string;
  beer_name?: string;
  wine_name?: string;
  quantity_poured: number;
  comp_reason: string;
  table_number?: number;
  comped_by_email: string;
  created_at: string;
  pos_entry_made: boolean;
}
interface CompStats {
  total_comps: number;
  rd_comps: number;
  service_comps: number;
  vip_comps: number;
  training_comps: number;
  wait_comps: number;
  pos_tracked: number;
  total_ml_poured: number;
}
interface Tab {
  id: string;
  label: string;
  icon: string;
}
const COMP_REASONS = [
  { value: "wait_time", label: "Wait Time" },
  { value: "service_recovery", label: "Service Recovery" },
  { value: "vip_courtesy", label: "VIP Courtesy" },
  { value: "staff_training", label: "Staff Training" },
  { value: "r_and_d", label: "R&D Testing" },
  { value: "quality_issue", label: "Quality Issue" },
];
export const CompedDrinks: React.FC = () => {
  const [activeTab, setActiveTab] = useState("log");
  const [venueId, setVenueId] = useState<string | null>(
    localStorage.getItem("currentVenueId"),
  );
  const [loading, setLoading] = useState(false);
  const [comps, setComps] = useState<CompedDrink[]>([]);
  const [stats, setStats] = useState<CompStats | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  useEffect(() => {
    if (venueId) {
      loadComps();
      loadStats();
    }
  }, [venueId, dateRange]);
  const loadComps = async () => {
    setLoading(true);
    try {
      const data = await apiService.getCompedDrinks({
        venueId,
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
      setComps(data || []);
    } catch (error) {
      console.error("Failed to load comped drinks:", error);
    } finally {
      setLoading(false);
    }
  };
  const loadStats = async () => {
    try {
      const data = await apiService.getCompedDrinksStats(venueId || "");
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };
  const tabs: Tab[] = [
    { id: "log", label: "Log Comp", icon: "➕" },
    { id: "history", label: "History", icon: "📋" },
    { id: "analytics", label: "Analytics", icon: "📊" },
    { id: "rd-analysis", label: "R&D Analysis", icon: "🔬" },
  ];
  const renderLogForm = () => (
    <div
      style={{
        padding: "1.5rem",
        backgroundColor: theme.colors.card,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: "12px",
        marginBottom: "2rem",
      }}
    >
      {" "}
      <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>
        Log Comped Drink
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
            Drink Type *{" "}
          </label>{" "}
          <select
            style={{
              width: "100%",
              padding: "0.75rem",
              border: `1px solid ${theme.colors.border}`,
              borderRadius: "8px",
            }}
          >
            {" "}
            <option value="">Select drink type</option>{" "}
            <option value="liquor">Liquor/Spirit</option>{" "}
            <option value="beer">Beer</option>{" "}
            <option value="wine">Wine</option>{" "}
          </select>{" "}
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
            Comp Reason *{" "}
          </label>{" "}
          <select
            style={{
              width: "100%",
              padding: "0.75rem",
              border: `1px solid ${theme.colors.border}`,
              borderRadius: "8px",
            }}
          >
            {" "}
            <option value="">Select reason</option>{" "}
            {COMP_REASONS.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {" "}
                {reason.label}{" "}
              </option>
            ))}{" "}
          </select>{" "}
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
            Quantity Poured (ml) *{" "}
          </label>{" "}
          <input
            type="number"
            placeholder="e.g., 50"
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
            Table Number{" "}
          </label>{" "}
          <input
            type="number"
            placeholder="Optional"
            style={{
              width: "100%",
              padding: "0.75rem",
              border: `1px solid ${theme.colors.border}`,
              borderRadius: "8px",
            }}
          />{" "}
        </div>{" "}
        <div style={{ gridColumn: "1 / -1" }}>
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
            placeholder="Optional notes about the comp (e.g., 'Guest feedback: liked the first pour')"
            style={{
              width: "100%",
              padding: "0.75rem",
              border: `1px solid ${theme.colors.border}`,
              borderRadius: "8px",
              minHeight: "80px",
              fontFamily: "inherit",
            }}
          />{" "}
        </div>{" "}
      </div>{" "}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        {" "}
        <button
          style={{
            flex: 1,
            padding: "0.75rem",
            backgroundColor: theme.colors.primary,
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {" "}
          Log Comp{" "}
        </button>{" "}
        <button
          onClick={() => setShowLogForm(false)}
          style={{
            flex: 1,
            padding: "0.75rem",
            backgroundColor: theme.colors.border,
            color: theme.colors.text,
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {" "}
          Cancel{" "}
        </button>{" "}
      </div>{" "}
    </div>
  );
  const renderHistoryTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {" "}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        {" "}
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) =>
            setDateRange({ ...dateRange, start: e.target.value })
          }
          style={{
            padding: "0.75rem",
            border: `1px solid ${theme.colors.border}`,
            borderRadius: "8px",
          }}
        />{" "}
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          style={{
            padding: "0.75rem",
            border: `1px solid ${theme.colors.border}`,
            borderRadius: "8px",
          }}
        />{" "}
      </div>{" "}
      <div
        style={{
          overflowX: "auto",
          border: `1px solid ${theme.colors.border}`,
          borderRadius: "12px",
          backgroundColor: theme.colors.card,
        }}
      >
        {" "}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          {" "}
          <thead>
            {" "}
            <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
              {" "}
              <th
                style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}
              >
                ID
              </th>{" "}
              <th
                style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}
              >
                Drink
              </th>{" "}
              <th
                style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}
              >
                Reason
              </th>{" "}
              <th
                style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}
              >
                Qty (ml)
              </th>{" "}
              <th
                style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}
              >
                Comped By
              </th>{" "}
              <th
                style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}
              >
                Date
              </th>{" "}
              <th
                style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}
              >
                POS Entry
              </th>{" "}
            </tr>{" "}
          </thead>{" "}
          <tbody>
            {" "}
            {comps.map((comp) => (
              <tr
                key={comp.id}
                style={{ borderBottom: `1px solid ${theme.colors.border}` }}
              >
                {" "}
                <td style={{ padding: "1rem", fontSize: "0.85rem" }}>
                  {comp.comp_id}
                </td>{" "}
                <td style={{ padding: "1rem", fontWeight: 500 }}>
                  {" "}
                  {comp.liquor_name || comp.beer_name || comp.wine_name}{" "}
                </td>{" "}
                <td style={{ padding: "1rem" }}>
                  {" "}
                  <span
                    style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      backgroundColor:
                        comp.comp_reason === "r_and_d"
                          ? "#DBEAFE"
                          : comp.comp_reason === "service_recovery"
                            ? "#FEF3C7"
                            : "#DCFCE7",
                      color:
                        comp.comp_reason === "r_and_d"
                          ? "#1E40AF"
                          : comp.comp_reason === "service_recovery"
                            ? "#92400E"
                            : "#166534",
                    }}
                  >
                    {" "}
                    {
                      COMP_REASONS.find((r) => r.value === comp.comp_reason)
                        ?.label
                    }{" "}
                  </span>{" "}
                </td>{" "}
                <td style={{ padding: "1rem" }}>{comp.quantity_poured} ml</td>{" "}
                <td style={{ padding: "1rem", fontSize: "0.9rem" }}>
                  {comp.comped_by_email}
                </td>{" "}
                <td style={{ padding: "1rem", fontSize: "0.9rem" }}>
                  {" "}
                  {new Date(comp.created_at).toLocaleDateString()}{" "}
                </td>{" "}
                <td style={{ padding: "1rem" }}>
                  {" "}
                  {comp.pos_entry_made ? (
                    <span
                      style={{ color: theme.colors.success, fontWeight: 600 }}
                    >
                      ✓
                    </span>
                  ) : (
                    <span
                      style={{ color: theme.colors.warning, fontWeight: 600 }}
                    >
                      ✗
                    </span>
                  )}{" "}
                </td>{" "}
              </tr>
            ))}{" "}
          </tbody>{" "}
        </table>{" "}
      </div>{" "}
    </div>
  );
  const renderAnalyticsTab = () => (
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
          Total Comps{" "}
        </p>{" "}
        <p style={{ fontSize: "2.5rem", fontWeight: 800, marginTop: "0.5rem" }}>
          {" "}
          {stats?.total_comps || 0}{" "}
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
          Total Volume{" "}
        </p>{" "}
        <p style={{ fontSize: "2.5rem", fontWeight: 800, marginTop: "0.5rem" }}>
          {" "}
          {stats?.total_ml_poured || 0}ml{" "}
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
          R&D Comps{" "}
        </p>{" "}
        <p style={{ fontSize: "2.5rem", fontWeight: 800, marginTop: "0.5rem" }}>
          {" "}
          {stats?.rd_comps || 0}{" "}
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
          Service Recovery{" "}
        </p>{" "}
        <p style={{ fontSize: "2.5rem", fontWeight: 800, marginTop: "0.5rem" }}>
          {" "}
          {stats?.service_comps || 0}{" "}
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
          POS Tracked{" "}
        </p>{" "}
        <p style={{ fontSize: "2.5rem", fontWeight: 800, marginTop: "0.5rem" }}>
          {" "}
          {stats?.pos_tracked || 0}{" "}
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
          VIP Courtesy{" "}
        </p>{" "}
        <p style={{ fontSize: "2.5rem", fontWeight: 800, marginTop: "0.5rem" }}>
          {" "}
          {stats?.vip_comps || 0}{" "}
        </p>{" "}
      </div>{" "}
    </div>
  );
  const renderRDAnalysisTab = () => (
    <div
      style={{
        padding: "2rem",
        textAlign: "center",
        backgroundColor: theme.colors.background,
        borderRadius: "12px",
      }}
    >
      {" "}
      <p style={{ color: theme.colors.textSecondary }}>
        {" "}
        R&D analysis dashboard coming soon{" "}
      </p>{" "}
    </div>
  );
  const renderTabContent = () => {
    switch (activeTab) {
      case "log":
        return (
          <>
            {" "}
            {showLogForm && renderLogForm()}{" "}
            {!showLogForm && (
              <button
                onClick={() => setShowLogForm(true)}
                style={{
                  padding: "1rem 2rem",
                  backgroundColor: theme.colors.primary,
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
              >
                {" "}
                + Log New Comp{" "}
              </button>
            )}{" "}
          </>
        );
      case "history":
        return renderHistoryTab();
      case "analytics":
        return renderAnalyticsTab();
      case "rd-analysis":
        return renderRDAnalysisTab();
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
          <WineIcon size={32} color={theme.colors.primary} />{" "}
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
              Comped Drinks Tracking{" "}
            </h1>{" "}
            <p style={{ fontSize: "1rem", color: theme.colors.textSecondary }}>
              {" "}
              Track manager comps for R&D, service recovery, and staff
              training{" "}
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
export default CompedDrinks;
