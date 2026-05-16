import React, { useState, useEffect } from "react";
import { useTheme } from "../components/ThemeProvider";
import { apiService } from "../lib/api";
import { Receipt, DollarSign, TrendingDown, AlertCircle } from "lucide-react";
export const CostingReport: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [method, setMethod] = useState<"FIFO" | "LIFO" | "WAC">("WAC");
  const [report, setReport] = useState<any>(null);
  const [costAnalysis, setCostAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadReport();
  }, [month, year, method]);
  const loadReport = async () => {
    setLoading(true);
    try {
      const [reportData, analysisData] = await Promise.all([
        apiService.getMonthEndReport(month, year),
        apiService.getCostAnalysis(method),
      ]);
      setReport(reportData);
      setCostAnalysis(analysisData);
    } catch (error) {
      console.error("Failed to load costing report:", error);
    } finally {
      setLoading(false);
    }
  };
  const StatCard = ({ label, value, change, icon: Icon, color }: any) => (
    <div
      style={{
        backgroundColor: theme.colors.card,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: "12px",
        padding: "1.5rem",
      }}
    >
      {" "}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1rem",
        }}
      >
        {" "}
        <p
          style={{
            color: theme.text.secondary,
            fontSize: "0.85rem",
            fontWeight: "600",
            margin: 0,
          }}
        >
          {" "}
          {label}{" "}
        </p>{" "}
        <div
          style={{
            backgroundColor: `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.1)`,
            borderRadius: "8px",
            padding: "0.5rem",
            color: color,
          }}
        >
          {" "}
          <Icon size={20} />{" "}
        </div>{" "}
      </div>{" "}
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
      {change && (
        <p
          style={{
            color: change.includes("-") ? "#DC2626" : "#16A34A",
            fontSize: "0.85rem",
            fontWeight: "600",
            marginTop: "0.5rem",
          }}
        >
          {" "}
          {change}{" "}
        </p>
      )}{" "}
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
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {" "}
        {/* Header */}{" "}
        <div style={{ marginBottom: "3rem" }}>
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
              <Receipt
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
              Month-End Costing Report{" "}
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
            Track COGS, inventory variance, and cost analysis{" "}
          </p>{" "}
        </div>{" "}
        {/* Controls */}{" "}
        <div
          style={{
            backgroundColor: theme.colors.card,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: "16px",
            padding: "2rem",
            marginBottom: "2rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {" "}
          <div>
            {" "}
            <label
              style={{
                display: "block",
                fontWeight: "600",
                marginBottom: "0.5rem",
                fontSize: "0.9rem",
              }}
            >
              {" "}
              Month{" "}
            </label>{" "}
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: theme.colors.background,
                color: theme.colors.foreground,
                border: `1.5px solid ${theme.colors.border}`,
                borderRadius: "8px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              {" "}
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {" "}
                  {new Date(2024, i, 1).toLocaleDateString("en-US", {
                    month: "long",
                  })}{" "}
                </option>
              ))}{" "}
            </select>{" "}
          </div>{" "}
          <div>
            {" "}
            <label
              style={{
                display: "block",
                fontWeight: "600",
                marginBottom: "0.5rem",
                fontSize: "0.9rem",
              }}
            >
              {" "}
              Year{" "}
            </label>{" "}
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: theme.colors.background,
                color: theme.colors.foreground,
                border: `1.5px solid ${theme.colors.border}`,
                borderRadius: "8px",
                fontWeight: "500",
              }}
            />{" "}
          </div>{" "}
          <div>
            {" "}
            <label
              style={{
                display: "block",
                fontWeight: "600",
                marginBottom: "0.5rem",
                fontSize: "0.9rem",
              }}
            >
              {" "}
              Costing Method{" "}
            </label>{" "}
            <select
              value={method}
              onChange={(e) =>
                setMethod(e.target.value as "FIFO" | "LIFO" | "WAC")
              }
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: theme.colors.background,
                color: theme.colors.foreground,
                border: `1.5px solid ${theme.colors.border}`,
                borderRadius: "8px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              {" "}
              <option value="FIFO">FIFO (First-In, First-Out)</option>{" "}
              <option value="LIFO">LIFO (Last-In, First-Out)</option>{" "}
              <option value="WAC">WAC (Weighted Average Cost)</option>{" "}
            </select>{" "}
          </div>{" "}
        </div>{" "}
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            {" "}
            <p style={{ color: theme.text.secondary }}>
              Loading report...
            </p>{" "}
          </div>
        ) : (
          <>
            {" "}
            {/* Key Metrics */}{" "}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "1.5rem",
                marginBottom: "2rem",
              }}
            >
              {" "}
              <StatCard
                icon={DollarSign}
                label="Total COGS"
                value={`$${(report?.totalCOGS || 0).toLocaleString()}`}
                color={theme.colors.primary}
              />{" "}
              <StatCard
                icon={TrendingDown}
                label="COGS %"
                value={`${report?.cogsPercentage || 0}%`}
                color={theme.colors.secondary}
              />{" "}
              <StatCard
                icon={AlertCircle}
                label="Variance"
                value={`${report?.variance || 0}%`}
                change={`${report?.varianceDirection || "+"} from budget`}
                color={
                  report?.varianceDirection?.includes("-")
                    ? "#16A34A"
                    : "#DC2626"
                }
              />{" "}
              <StatCard
                icon={Receipt}
                label="Inventory Value"
                value={`$${(report?.inventoryValue || 0).toLocaleString()}`}
                color="#F59E0B"
              />{" "}
            </div>{" "}
            {/* Detailed Report */}{" "}
            <div
              style={{
                backgroundColor: theme.colors.card,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: "16px",
                padding: "2rem",
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
                Cost Analysis ({method}){" "}
              </h2>{" "}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "2rem",
                  marginBottom: "2rem",
                }}
              >
                {" "}
                <div>
                  {" "}
                  <h3
                    style={{
                      fontSize: "1rem",
                      fontWeight: "600",
                      marginBottom: "1rem",
                    }}
                  >
                    {" "}
                    Cost Breakdown{" "}
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
                      {
                        category: "Beginning Inventory",
                        value: report?.beginningInventory || 0,
                      },
                      { category: "Purchases", value: report?.purchases || 0 },
                      {
                        category: "Goods Available",
                        value: report?.goodsAvailable || 0,
                      },
                      {
                        category: "Ending Inventory",
                        value: report?.endingInventory || 0,
                      },
                      {
                        category: "Cost of Goods Sold",
                        value: report?.totalCOGS || 0,
                        isBold: true,
                      },
                    ].map((item) => (
                      <div
                        key={item.category}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          paddingBottom: "0.75rem",
                          borderBottom: item.isBold
                            ? `2px solid ${theme.colors.border}`
                            : "none",
                        }}
                      >
                        {" "}
                        <span
                          style={{ fontWeight: item.isBold ? "700" : "500" }}
                        >
                          {" "}
                          {item.category}{" "}
                        </span>{" "}
                        <span
                          style={{
                            fontWeight: item.isBold ? "700" : "600",
                            color: theme.colors.primary,
                          }}
                        >
                          {" "}
                          ${(item.value as number).toLocaleString()}{" "}
                        </span>{" "}
                      </div>
                    ))}{" "}
                  </div>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <h3
                    style={{
                      fontSize: "1rem",
                      fontWeight: "600",
                      marginBottom: "1rem",
                    }}
                  >
                    {" "}
                    Variance Analysis{" "}
                  </h3>{" "}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.5rem",
                    }}
                  >
                    {" "}
                    <div
                      style={{
                        padding: "1rem",
                        backgroundColor: theme.colors.muted,
                        borderRadius: "8px",
                      }}
                    >
                      {" "}
                      <p
                        style={{
                          color: theme.text.secondary,
                          fontSize: "0.8rem",
                          margin: 0,
                          marginBottom: "0.5rem",
                        }}
                      >
                        {" "}
                        Standard Cost{" "}
                      </p>{" "}
                      <p
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: "700",
                          margin: 0,
                        }}
                      >
                        {" "}
                        ${(report?.standardCost || 0).toLocaleString()}{" "}
                      </p>{" "}
                    </div>{" "}
                    <div
                      style={{
                        padding: "1rem",
                        backgroundColor: theme.colors.muted,
                        borderRadius: "8px",
                      }}
                    >
                      {" "}
                      <p
                        style={{
                          color: theme.text.secondary,
                          fontSize: "0.8rem",
                          margin: 0,
                          marginBottom: "0.5rem",
                        }}
                      >
                        {" "}
                        Actual Cost{" "}
                      </p>{" "}
                      <p
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: "700",
                          margin: 0,
                        }}
                      >
                        {" "}
                        ${(report?.actualCost || 0).toLocaleString()}{" "}
                      </p>{" "}
                    </div>{" "}
                    <div
                      style={{
                        padding: "1rem",
                        backgroundColor: `rgba(${report?.varianceDirection?.includes("-") ? "22, 163, 74" : "220, 38, 38"}, 0.1)`,
                        borderRadius: "8px",
                        border: `1px solid rgba(${report?.varianceDirection?.includes("-") ? "22, 163, 74" : "220, 38, 38"}, 0.3)`,
                      }}
                    >
                      {" "}
                      <p
                        style={{
                          color: theme.text.secondary,
                          fontSize: "0.8rem",
                          margin: 0,
                          marginBottom: "0.5rem",
                        }}
                      >
                        {" "}
                        Variance{" "}
                      </p>{" "}
                      <p
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: "700",
                          margin: 0,
                          color: report?.varianceDirection?.includes("-")
                            ? "#16A34A"
                            : "#DC2626",
                        }}
                      >
                        {" "}
                        {report?.varianceDirection} ${" "}
                        {Math.abs(
                          report?.varianceAmount || 0,
                        ).toLocaleString()}{" "}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              {/* Notes */}{" "}
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: theme.colors.muted,
                  borderRadius: "8px",
                  borderLeft: `4px solid ${theme.colors.primary}`,
                }}
              >
                {" "}
                <p
                  style={{
                    color: theme.colors.foreground,
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                  }}
                >
                  {" "}
                  Method Notes{" "}
                </p>{" "}
                <p
                  style={{
                    color: theme.text.secondary,
                    fontSize: "0.9rem",
                    margin: 0,
                  }}
                >
                  {" "}
                  {method === "FIFO"
                    ? "FIFO assumes oldest inventory is sold first, best for inflation-sensitive industries."
                    : method === "LIFO"
                      ? "LIFO assumes newest inventory is sold first, useful for tax purposes in certain situations."
                      : "WAC calculates a weighted average cost, smoothing price fluctuations over time."}{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
          </>
        )}{" "}
      </div>{" "}
    </div>
  );
};
export default CostingReport;
