import React, { useState, useEffect } from "react";
import { useTheme } from "../components/ThemeProvider";
import { apiService } from "../lib/api";
import { Package, Plus, Truck, DollarSign, AlertCircle } from "lucide-react"; // Temporarily use legacy purchase orders to fix module loading
// import { PurchaseOrdersOptimized } from"./PurchaseOrdersOptimized"; // Legacy component (restored for module loading fix)
export const PurchaseOrders: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<
    "all" | "pending" | "delivered" | "overdue"
  >("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  useEffect(() => {
    loadOrders();
  }, [filter]);
  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getPurchaseOrders(
        filter === "all" ? undefined : filter,
      );
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to load purchase orders";
      console.error("Failed to load purchase orders:", error);
      setError(errorMsg);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };
  const displayedOrders =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);
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
  const getStatusColor = (status: string) => {
    if (status === "delivered")
      return { bg: `rgba(34, 197, 94, 0.1)`, text: "#22C55E" };
    if (status === "pending")
      return { bg: `rgba(59, 130, 246, 0.1)`, text: theme.colors.primary };
    if (status === "overdue")
      return { bg: `rgba(220, 38, 38, 0.1)`, text: "#DC2626" };
    return { bg: theme.colors.muted, text: theme.text.secondary };
  };
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
                <Package
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
                Purchase Orders{" "}
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
              Manage supplier orders, delivery tracking, and cost per
              bottle{" "}
            </p>{" "}
          </div>{" "}
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            style={{
              padding: "0.875rem 1.5rem",
              backgroundColor: theme.colors.primary,
              color: theme.colors.background,
              border: "none",
              borderRadius: "10px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                "translateY(0)";
            }}
          >
            {" "}
            <Plus size={20} /> New Order{" "}
          </button>{" "}
        </div>{" "}
        {/* Stats */}{" "}
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
            icon={Package}
            label="Total Orders"
            value={orders.length}
            color={theme.colors.primary}
          />{" "}
          <StatCard
            icon={Truck}
            label="Pending Delivery"
            value={orders.filter((o) => o.status === "pending").length}
            color={theme.colors.secondary}
          />{" "}
          <StatCard
            icon={DollarSign}
            label="Total Spend (YTD)"
            value={`$${orders.reduce((sum, o) => sum + (o.total || 0), 0).toLocaleString()}`}
            color={theme.colors.accent}
          />{" "}
          <StatCard
            icon={AlertCircle}
            label="Overdue Orders"
            value={orders.filter((o) => o.status === "overdue").length}
            color="#DC2626"
          />{" "}
        </div>{" "}
        {/* Filters */}{" "}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            marginBottom: "2rem",
            flexWrap: "wrap",
          }}
        >
          {" "}
          {(["all", "pending", "delivered", "overdue"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "0.625rem 1.25rem",
                backgroundColor:
                  filter === f ? theme.colors.primary : theme.colors.background,
                color:
                  filter === f
                    ? theme.colors.background
                    : theme.colors.foreground,
                border: `1.5px solid ${filter === f ? theme.colors.primary : theme.colors.border}`,
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {" "}
              {f.charAt(0).toUpperCase() + f.slice(1)}{" "}
            </button>
          ))}{" "}
        </div>{" "}
        {/* Orders List */}{" "}
        {error && (
          <div
            style={{
              backgroundColor: "rgba(220, 38, 38, 0.1)",
              border: "1px solid #DC2626",
              borderRadius: "12px",
              padding: "1.5rem",
              marginBottom: "2rem",
              display: "flex",
              gap: "1rem",
              alignItems: "flex-start",
            }}
          >
            {" "}
            <AlertCircle
              size={24}
              style={{ color: "#DC2626", flexShrink: 0 }}
            />{" "}
            <div>
              {" "}
              <p
                style={{
                  fontWeight: "600",
                  margin: "0 0 0.25rem 0",
                  color: "#DC2626",
                }}
              >
                {" "}
                Failed to load purchase orders{" "}
              </p>{" "}
              <p
                style={{
                  color: theme.text.secondary,
                  margin: 0,
                  fontSize: "0.9rem",
                }}
              >
                {" "}
                {error}{" "}
              </p>{" "}
            </div>{" "}
          </div>
        )}{" "}
        {loading ? (
          <p style={{ color: theme.text.secondary }}>Loading orders...</p>
        ) : displayedOrders.length > 0 ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            {" "}
            {displayedOrders.map((order) => {
              const statusColors = getStatusColor(order.status);
              return (
                <div
                  key={order.id}
                  style={{
                    backgroundColor: theme.colors.card,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: "12px",
                    padding: "1.5rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = theme.colors.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = theme.colors.border;
                  }}
                >
                  {" "}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr auto",
                      gap: "2rem",
                      alignItems: "center",
                      marginBottom: "1rem",
                    }}
                  >
                    {" "}
                    <div>
                      {" "}
                      <h3
                        style={{ fontWeight: "700", marginBottom: "0.25rem" }}
                      >
                        {" "}
                        {order.id}{" "}
                      </h3>{" "}
                      <p
                        style={{
                          color: theme.text.secondary,
                          fontSize: "0.85rem",
                          margin: 0,
                        }}
                      >
                        {" "}
                        {order.supplier}{" "}
                      </p>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <p
                        style={{
                          color: theme.text.secondary,
                          fontSize: "0.8rem",
                          margin: 0,
                          marginBottom: "0.25rem",
                        }}
                      >
                        {" "}
                        Expected Delivery{" "}
                      </p>{" "}
                      <p style={{ fontWeight: "600", margin: 0 }}>
                        {" "}
                        {new Date(
                          order.expectedDelivery,
                        ).toLocaleDateString()}{" "}
                      </p>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <p
                        style={{
                          color: theme.text.secondary,
                          fontSize: "0.8rem",
                          margin: 0,
                          marginBottom: "0.25rem",
                        }}
                      >
                        {" "}
                        Order Total{" "}
                      </p>{" "}
                      <p
                        style={{
                          fontWeight: "700",
                          fontSize: "1.1rem",
                          margin: 0,
                        }}
                      >
                        {" "}
                        ${order.total.toLocaleString()}{" "}
                      </p>{" "}
                    </div>{" "}
                    <div
                      style={{
                        backgroundColor: statusColors.bg,
                        color: statusColors.text,
                        padding: "0.5rem 1rem",
                        borderRadius: "8px",
                        fontWeight: "600",
                        fontSize: "0.85rem",
                        textAlign: "center",
                      }}
                    >
                      {" "}
                      {order.status.charAt(0).toUpperCase() +
                        order.status.slice(1)}{" "}
                    </div>{" "}
                  </div>{" "}
                  {/* Items */}{" "}
                  <div
                    style={{
                      borderTop: `1px solid ${theme.colors.border}`,
                      paddingTop: "1rem",
                    }}
                  >
                    {" "}
                    <p style={{ fontWeight: "600", marginBottom: "0.75rem" }}>
                      {" "}
                      Items ({order.items.length}){" "}
                    </p>{" "}
                    {order.items.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.9rem",
                          color: theme.text.secondary,
                          marginBottom: "0.5rem",
                        }}
                      >
                        {" "}
                        <span>{item.wine}</span>{" "}
                        <div
                          style={{
                            display: "flex",
                            gap: "2rem",
                            alignItems: "center",
                          }}
                        >
                          {" "}
                          <span>{item.qty} bottles</span>{" "}
                          <span>${item.costPerBottle}/bottle</span>{" "}
                          <span
                            style={{
                              fontWeight: "700",
                              color: theme.colors.primary,
                            }}
                          >
                            {" "}
                            ${item.total.toLocaleString()}{" "}
                          </span>{" "}
                        </div>{" "}
                      </div>
                    ))}{" "}
                  </div>{" "}
                </div>
              );
            })}{" "}
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 2rem",
              backgroundColor: theme.colors.card,
              borderRadius: "12px",
              border: `1px dashed ${theme.colors.border}`,
            }}
          >
            {" "}
            <Package
              size={48}
              style={{ opacity: 0.3, marginBottom: "1rem" }}
            />{" "}
            <p style={{ color: theme.text.secondary }}>
              {" "}
              No orders found for this filter{" "}
            </p>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
};
export default PurchaseOrders;
