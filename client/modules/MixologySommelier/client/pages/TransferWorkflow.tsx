import React, { useState, useEffect } from "react";
import { ArrowRight, CheckCircle, Clock, AlertCircle } from "lucide-react";
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
interface Transfer {
  id: string;
  transfer_id: string;
  from_venue_id: string;
  from_venue_name: string;
  to_venue_id: string;
  to_venue_name: string;
  status: "pending" | "approved" | "in_transit" | "received" | "rejected";
  requested_at: string;
  approved_at?: string;
  received_at?: string;
  item_count: number;
}
interface Tab {
  id: string;
  label: string;
  icon: string;
}
export const TransferWorkflow: React.FC = () => {
  const [activeTab, setActiveTab] = useState("active");
  const [venueId, setVenueId] = useState<string | null>(
    localStorage.getItem("currentVenueId"),
  );
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(
    null,
  );
  useEffect(() => {
    if (venueId) {
      loadTransfers();
    }
  }, [venueId, activeTab]);
  const loadTransfers = async () => {
    setLoading(true);
    try {
      const status =
        activeTab === "active"
          ? "pending,approved,in_transit"
          : activeTab === "completed"
            ? "received"
            : "rejected";
      const data = await apiService.getTransfers({ venueId, status });
      setTransfers(data || []);
    } catch (error) {
      console.error("Failed to load transfers:", error);
    } finally {
      setLoading(false);
    }
  };
  const tabs: Tab[] = [
    { id: "active", label: "Active Transfers", icon: "🔄" },
    { id: "pending", label: "Pending Approval", icon: "⏳" },
    { id: "completed", label: "Completed", icon: "✓" },
    { id: "rejected", label: "Rejected", icon: "✗" },
  ];
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return { bg: "#FEF3C7", text: "#92400E", icon: "⏳" };
      case "approved":
        return { bg: "#DBEAFE", text: "#1E40AF", icon: "✓" };
      case "in_transit":
        return { bg: "#E0E7FF", text: "#3730A3", icon: "→" };
      case "received":
        return { bg: "#DCFCE7", text: "#166534", icon: "✓" };
      case "rejected":
        return { bg: "#FEE2E2", text: "#991B1B", icon: "✗" };
      default:
        return { bg: "#F3F4F6", text: "#4B5563", icon: "?" };
    }
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const renderTransferCard = (transfer: Transfer) => {
    const statusColor = getStatusColor(transfer.status);
    return (
      <div
        key={transfer.id}
        onClick={() => setSelectedTransfer(transfer)}
        style={{
          padding: "1.5rem",
          backgroundColor: theme.colors.card,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: "12px",
          cursor: "pointer",
          transition: "all 0.3s",
          borderLeft: `4px solid ${statusColor.bg.replace("bg", "")}`,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            "0 4px 12px rgba(0,0,0,0.1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
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
              {transfer.transfer_id}{" "}
            </p>{" "}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              {" "}
              <div>
                {" "}
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: theme.colors.textSecondary,
                  }}
                >
                  From
                </p>{" "}
                <p style={{ fontWeight: 600 }}>
                  {transfer.from_venue_name}
                </p>{" "}
              </div>{" "}
              <ArrowRight size={24} color={theme.colors.textSecondary} />{" "}
              <div>
                {" "}
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: theme.colors.textSecondary,
                  }}
                >
                  To
                </p>{" "}
                <p style={{ fontWeight: 600 }}>{transfer.to_venue_name}</p>{" "}
              </div>{" "}
            </div>{" "}
            <p
              style={{ fontSize: "0.85rem", color: theme.colors.textSecondary }}
            >
              {" "}
              {transfer.item_count} items • Requested{" "}
              {formatDate(transfer.requested_at)}{" "}
            </p>{" "}
          </div>{" "}
          <div style={{ textAlign: "right" }}>
            {" "}
            <div
              style={{
                display: "inline-block",
                padding: "0.5rem 1rem",
                backgroundColor: statusColor.bg,
                color: statusColor.text,
                borderRadius: "12px",
                fontWeight: 600,
                fontSize: "0.9rem",
              }}
            >
              {" "}
              {statusColor.icon}{" "}
              {transfer.status.replace("_", "").toUpperCase()}{" "}
            </div>{" "}
            {transfer.approved_at && (
              <p
                style={{
                  fontSize: "0.85rem",
                  color: theme.colors.textSecondary,
                  marginTop: "0.75rem",
                }}
              >
                {" "}
                Approved {formatDate(transfer.approved_at)}{" "}
              </p>
            )}{" "}
          </div>{" "}
        </div>{" "}
      </div>
    );
  };
  const renderActiveTransfersTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {" "}
      {transfers.filter((t) =>
        ["pending", "approved", "in_transit"].includes(t.status),
      ).length === 0 ? (
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
          <p>No active transfers</p>{" "}
        </div>
      ) : (
        transfers
          .filter((t) =>
            ["pending", "approved", "in_transit"].includes(t.status),
          )
          .map(renderTransferCard)
      )}{" "}
    </div>
  );
  const renderPendingApprovalsTab = () => {
    const pendingForMe = transfers.filter(
      (t) => t.status === "pending" && t.to_venue_id === venueId,
    );
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {" "}
        {pendingForMe.length === 0 ? (
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
            <p>No pending transfers awaiting your approval</p>{" "}
          </div>
        ) : (
          pendingForMe.map((transfer) => (
            <div
              key={transfer.id}
              style={{
                padding: "1.5rem",
                backgroundColor: theme.colors.card,
                border: `2px solid ${theme.colors.warning}`,
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
                      marginBottom: "0.5rem",
                    }}
                  >
                    {" "}
                    {transfer.transfer_id}{" "}
                  </p>{" "}
                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: theme.colors.textSecondary,
                    }}
                  >
                    {" "}
                    From {transfer.from_venue_name} • {transfer.item_count}{" "}
                    items{" "}
                  </p>{" "}
                </div>{" "}
                <div
                  style={{
                    display: "inline-block",
                    padding: "0.5rem 1rem",
                    backgroundColor: "#FEF3C7",
                    color: "#92400E",
                    borderRadius: "12px",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                  }}
                >
                  {" "}
                  ⏳ AWAITING YOUR APPROVAL{" "}
                </div>{" "}
              </div>{" "}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                {" "}
                <button
                  onClick={() => {
                    /* Handle approve */ console.log(
                      "Approve transfer",
                      transfer.id,
                    );
                  }}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    backgroundColor: theme.colors.success,
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {" "}
                  ✓ Approve{" "}
                </button>{" "}
                <button
                  onClick={() => {
                    /* Handle reject */ console.log(
                      "Reject transfer",
                      transfer.id,
                    );
                  }}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    backgroundColor: theme.colors.accent,
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {" "}
                  ✗ Reject{" "}
                </button>{" "}
              </div>{" "}
            </div>
          ))
        )}{" "}
      </div>
    );
  };
  const renderCompletedTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {" "}
      {transfers.filter((t) => t.status === "received").length === 0 ? (
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
          <p>No completed transfers</p>{" "}
        </div>
      ) : (
        transfers.filter((t) => t.status === "received").map(renderTransferCard)
      )}{" "}
    </div>
  );
  const renderRejectedTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {" "}
      {transfers.filter((t) => t.status === "rejected").length === 0 ? (
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
          <p>No rejected transfers</p>{" "}
        </div>
      ) : (
        transfers.filter((t) => t.status === "rejected").map(renderTransferCard)
      )}{" "}
    </div>
  );
  const renderTabContent = () => {
    switch (activeTab) {
      case "active":
        return renderActiveTransfersTab();
      case "pending":
        return renderPendingApprovalsTab();
      case "completed":
        return renderCompletedTab();
      case "rejected":
        return renderRejectedTab();
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
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {" "}
        {/* Header */}{" "}
        <div
          style={{
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {" "}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {" "}
            <ArrowRight size={32} color={theme.colors.primary} />{" "}
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
                Transfer Workflow{" "}
              </h1>{" "}
              <p
                style={{ fontSize: "1rem", color: theme.colors.textSecondary }}
              >
                {" "}
                Request, approve, and receive inventory transfers between
                venues{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <button
            onClick={() => setShowRequestForm(!showRequestForm)}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: theme.colors.primary,
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.95rem",
            }}
          >
            {" "}
            + Request Transfer{" "}
          </button>{" "}
        </div>{" "}
        {/* Request Form */}{" "}
        {showRequestForm && (
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
              Create New Transfer Request
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
                  From Venue{" "}
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
                  <option>Select venue</option>{" "}
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
                  To Venue{" "}
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
                  <option>Select venue</option>{" "}
                </select>{" "}
              </div>{" "}
            </div>{" "}
            <div
              style={{
                padding: "1rem",
                backgroundColor: theme.colors.background,
                borderRadius: "8px",
                marginBottom: "1rem",
                fontSize: "0.9rem",
                color: theme.colors.textSecondary,
              }}
            >
              {" "}
              Add items to transfer (coming soon){" "}
            </div>{" "}
            <button
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: theme.colors.secondary,
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {" "}
              Create Transfer Request{" "}
            </button>{" "}
          </div>
        )}{" "}
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
        {!loading && renderTabContent()} {/* Detail Modal */}{" "}
        {selectedTransfer && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setSelectedTransfer(null)}
          >
            {" "}
            <div
              style={{
                backgroundColor: theme.colors.card,
                borderRadius: "12px",
                padding: "2rem",
                maxWidth: "600px",
                width: "90%",
                maxHeight: "80vh",
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {" "}
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  marginBottom: "1rem",
                }}
              >
                {" "}
                {selectedTransfer.transfer_id}{" "}
              </h2>{" "}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1.5rem",
                  marginBottom: "1.5rem",
                }}
              >
                {" "}
                <div>
                  {" "}
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: theme.colors.textSecondary,
                      fontWeight: 600,
                    }}
                  >
                    {" "}
                    From Venue{" "}
                  </p>{" "}
                  <p
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      marginTop: "0.25rem",
                    }}
                  >
                    {" "}
                    {selectedTransfer.from_venue_name}{" "}
                  </p>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: theme.colors.textSecondary,
                      fontWeight: 600,
                    }}
                  >
                    {" "}
                    To Venue{" "}
                  </p>{" "}
                  <p
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      marginTop: "0.25rem",
                    }}
                  >
                    {" "}
                    {selectedTransfer.to_venue_name}{" "}
                  </p>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: theme.colors.textSecondary,
                      fontWeight: 600,
                    }}
                  >
                    {" "}
                    Items{" "}
                  </p>{" "}
                  <p
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      marginTop: "0.25rem",
                    }}
                  >
                    {" "}
                    {selectedTransfer.item_count} items{" "}
                  </p>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: theme.colors.textSecondary,
                      fontWeight: 600,
                    }}
                  >
                    {" "}
                    Status{" "}
                  </p>{" "}
                  <p
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      marginTop: "0.25rem",
                      color: getStatusColor(selectedTransfer.status).text,
                    }}
                  >
                    {" "}
                    {selectedTransfer.status
                      .replace("_", "")
                      .toUpperCase()}{" "}
                  </p>{" "}
                </div>{" "}
              </div>{" "}
              <button
                onClick={() => setSelectedTransfer(null)}
                style={{
                  width: "100%",
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
                Close{" "}
              </button>{" "}
            </div>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
};
export default TransferWorkflow;
