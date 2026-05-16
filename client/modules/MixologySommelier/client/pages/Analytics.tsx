import React, { useState, useEffect } from "react";
import { useTheme } from "../components/ThemeProvider";
import { apiService } from "../lib/api";
import { BarChart3, TrendingUp, Wine, DollarSign } from "lucide-react";
export const Analytics: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [analytics, setAnalytics] = useState<any>(null);
  const [topPairings, setTopPairings] = useState<any[]>([]);
  const [salesMetrics, setSalesMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  useEffect(() => {
    loadAnalytics();
  }, [period]);
  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [analyticsData, pairingsData, metricsData] = await Promise.all([
        apiService.getAnalytics(period),
        apiService.getTopPairings(10),
        apiService.getSalesMetrics(),
      ]);
      setAnalytics(analyticsData);
      setTopPairings(pairingsData);
      setSalesMetrics(metricsData);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };
  const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div
      style={{
        backgroundColor: theme.colors.card,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: "12px",
        padding: "1.5rem",
        display: "flex",
        gap: "1.25rem",
        alignItems: "flex-start",
      }}
    >
      {" "}
      <div
        style={{
          backgroundColor: `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.1)`,
          borderRadius: "10px",
          padding: "0.875rem",
          color: color,
        }}
      >
        {" "}
        <Icon size={24} />{" "}
      </div>{" "}
      <div>
        {" "}
        <p
          style={{
            color: theme.text.secondary,
            fontSize: "0.85rem",
            margin: 0,
            marginBottom: "0.375rem",
          }}
        >
          {" "}
          {label}{" "}
        </p>{" "}
        <p
          style={{
            color: theme.colors.foreground,
            fontSize: "1.75rem",
            fontWeight: "700",
            margin: 0,
          }}
        >
          {" "}
          {value}{" "}
        </p>{" "}
      </div>{" "}
    </div>
  );
  return (
    <div
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.foreground,
        minHeight: "100vh",
        padding: "3rem 2rem",
        background: isDark
          ? `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(${parseInt(theme.colors.primary.slice(1, 3), 16)}, ${parseInt(theme.colors.primary.slice(3, 5), 16)}, ${parseInt(theme.colors.primary.slice(5, 7), 16)}, 0.03) 100%)`
          : theme.colors.background,
      }}
    >
      {" "}
      <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
        {" "}
        {/* Header */}{" "}
        <div
          style={{
            marginBottom: "3rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {" "}
          <div>
            {" "}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "0.75rem",
              }}
            >
              {" "}
              <div
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                  borderRadius: "12px",
                  padding: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {" "}
                <BarChart3
                  size={28}
                  style={{ color: theme.colors.background }}
                />{" "}
              </div>{" "}
              <h1
                style={{
                  fontSize: "2.75rem",
                  fontWeight: "700",
                  marginBottom: 0,
                  color: theme.colors.foreground,
                  letterSpacing: "-0.5px",
                }}
              >
                {" "}
                Sales Analytics{" "}
              </h1>{" "}
            </div>{" "}
            <p
              style={{
                color: theme.text.secondary,
                fontSize: "1.05rem",
                marginTop: "0.5rem",
              }}
            >
              {" "}
              Track wine revenue, top pairings, and guest preferences{" "}
            </p>{" "}
          </div>{" "}
          {/* Period Selector */}{" "}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {" "}
            {(["week", "month", "year"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: "0.625rem 1.25rem",
                  backgroundColor:
                    period === p
                      ? theme.colors.primary
                      : theme.colors.background,
                  color:
                    period === p
                      ? theme.colors.background
                      : theme.colors.foreground,
                  border: `1.5px solid ${period === p ? theme.colors.primary : theme.colors.border}`,
                  borderRadius: "10px",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {" "}
                {p.charAt(0).toUpperCase() + p.slice(1)}{" "}
              </button>
            ))}{" "}
          </div>{" "}
        </div>{" "}
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            {" "}
            <p style={{ color: theme.text.secondary }}>
              Loading analytics...
            </p>{" "}
          </div>
        ) : (
          <>
            {" "}
            {/* Stats Grid */}{" "}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "1.5rem",
                marginBottom: "3rem",
              }}
            >
              {" "}
              <StatCard
                icon={DollarSign}
                label="Total Revenue"
                value={`$${(salesMetrics?.totalRevenue || 0).toLocaleString()}`}
                color={theme.colors.primary}
              />{" "}
              <StatCard
                icon={Wine}
                label="Wine Sales %"
                value={`${salesMetrics?.winePercentage || 0}%`}
                color={theme.colors.secondary}
              />{" "}
              <StatCard
                icon={TrendingUp}
                label="Avg Order Value"
                value={`$${(salesMetrics?.avgOrderValue || 0).toFixed(2)}`}
                color={theme.colors.accent}
              />{" "}
              <StatCard
                icon={BarChart3}
                label="Total Orders"
                value={salesMetrics?.totalOrders || 0}
                color="#8B5CF6"
              />{" "}
            </div>{" "}
            {/* Top Pairings */}{" "}
            <div
              style={{
                backgroundColor: theme.colors.card,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: "16px",
                padding: "2rem",
                marginBottom: "2rem",
              }}
            >
              {" "}
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  marginBottom: "1.5rem",
                  color: theme.colors.foreground,
                }}
              >
                {" "}
                Top Wine-Dish Pairings{" "}
              </h2>{" "}
              <div style={{ overflowX: "auto" }}>
                {" "}
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  {" "}
                  <thead>
                    {" "}
                    <tr style={{ backgroundColor: theme.colors.muted }}>
                      {" "}
                      <th
                        style={{
                          padding: "1rem",
                          textAlign: "left",
                          fontWeight: "600",
                          fontSize: "0.85rem",
                        }}
                      >
                        {" "}
                        Rank{" "}
                      </th>{" "}
                      <th
                        style={{
                          padding: "1rem",
                          textAlign: "left",
                          fontWeight: "600",
                          fontSize: "0.85rem",
                        }}
                      >
                        {" "}
                        Wine{" "}
                      </th>{" "}
                      <th
                        style={{
                          padding: "1rem",
                          textAlign: "left",
                          fontWeight: "600",
                          fontSize: "0.85rem",
                        }}
                      >
                        {" "}
                        Dish{" "}
                      </th>{" "}
                      <th
                        style={{
                          padding: "1rem",
                          textAlign: "center",
                          fontWeight: "600",
                          fontSize: "0.85rem",
                        }}
                      >
                        {" "}
                        Orders{" "}
                      </th>{" "}
                      <th
                        style={{
                          padding: "1rem",
                          textAlign: "right",
                          fontWeight: "600",
                          fontSize: "0.85rem",
                        }}
                      >
                        {" "}
                        Revenue{" "}
                      </th>{" "}
                    </tr>{" "}
                  </thead>{" "}
                  <tbody>
                    {" "}
                    {topPairings.map((pairing, index) => (
                      <tr
                        key={index}
                        style={{
                          borderTop: `1px solid ${theme.colors.border}`,
                        }}
                      >
                        {" "}
                        <td
                          style={{
                            padding: "1rem",
                            fontWeight: "700",
                            color: theme.colors.primary,
                          }}
                        >
                          {" "}
                          #{index + 1}{" "}
                        </td>{" "}
                        <td style={{ padding: "1rem" }}>{pairing.wine}</td>{" "}
                        <td
                          style={{
                            padding: "1rem",
                            color: theme.text.secondary,
                          }}
                        >
                          {" "}
                          {pairing.dish}{" "}
                        </td>{" "}
                        <td
                          style={{
                            padding: "1rem",
                            textAlign: "center",
                            fontWeight: "600",
                          }}
                        >
                          {" "}
                          {pairing.orders}{" "}
                        </td>{" "}
                        <td
                          style={{
                            padding: "1rem",
                            textAlign: "right",
                            fontWeight: "700",
                          }}
                        >
                          {" "}
                          ${pairing.revenue.toLocaleString()}{" "}
                        </td>{" "}
                      </tr>
                    ))}{" "}
                  </tbody>{" "}
                </table>{" "}
              </div>{" "}
            </div>{" "}
            {/* Revenue Breakdown */}{" "}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "2rem",
              }}
            >
              {" "}
              <div
                style={{
                  backgroundColor: theme.colors.card,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: "16px",
                  padding: "2rem",
                }}
              >
                {" "}
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "700",
                    marginBottom: "1.5rem",
                    color: theme.colors.foreground,
                  }}
                >
                  {" "}
                  Revenue by Wine Type{" "}
                </h3>{" "}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  {" "}
                  {[
                    { type: "Red Wine", percentage: 45, color: "#991B1B" },
                    { type: "White Wine", percentage: 30, color: "#F59E0B" },
                    { type: "Sparkling", percentage: 15, color: "#F97316" },
                    { type: "Rosé", percentage: 10, color: "#EC4899" },
                  ].map((item) => (
                    <div key={item.type}>
                      {" "}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        {" "}
                        <span style={{ fontWeight: "600" }}>
                          {item.type}
                        </span>{" "}
                        <span
                          style={{
                            fontWeight: "700",
                            color: theme.colors.primary,
                          }}
                        >
                          {" "}
                          {item.percentage}%{" "}
                        </span>{" "}
                      </div>{" "}
                      <div
                        style={{
                          height: "8px",
                          backgroundColor: theme.colors.muted,
                          borderRadius: "4px",
                          overflow: "hidden",
                        }}
                      >
                        {" "}
                        <div
                          style={{
                            height: "100%",
                            width: `${item.percentage}%`,
                            backgroundColor: item.color,
                            transition: "width 0.3s",
                          }}
                        />{" "}
                      </div>{" "}
                    </div>
                  ))}{" "}
                </div>{" "}
              </div>{" "}
              <div
                style={{
                  backgroundColor: theme.colors.card,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: "16px",
                  padding: "2rem",
                }}
              >
                {" "}
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "700",
                    marginBottom: "1.5rem",
                    color: theme.colors.foreground,
                  }}
                >
                  {" "}
                  Guest Preferences{" "}
                </h3>{" "}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem",
                  }}
                >
                  {" "}
                  <div>
                    {" "}
                    <p
                      style={{
                        color: theme.text.secondary,
                        fontSize: "0.9rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {" "}
                      Most Popular Price Range{" "}
                    </p>{" "}
                    <p
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: "700",
                        margin: 0,
                      }}
                    >
                      {" "}
                      $30 - $60 per bottle{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p
                      style={{
                        color: theme.text.secondary,
                        fontSize: "0.9rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {" "}
                      Preferred Wine Type{" "}
                    </p>{" "}
                    <p
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: "700",
                        margin: 0,
                      }}
                    >
                      {" "}
                      Red Wine (45%){" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p
                      style={{
                        color: theme.text.secondary,
                        fontSize: "0.9rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {" "}
                      Avg Bottles per Reservation{" "}
                    </p>{" "}
                    <p
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: "700",
                        margin: 0,
                      }}
                    >
                      {" "}
                      2.3 bottles{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </>
        )}{" "}
      </div>{" "}
    </div>
  );
};
export default Analytics;
