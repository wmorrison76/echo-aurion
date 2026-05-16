import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, Info, CheckCircle, X } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { apiService } from "../../lib/api";
interface Alert {
  id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  created_at: string;
  acknowledged: boolean;
}
interface AlertsPanelProps {
  venueId: string;
  isOpen: boolean;
  onClose: () => void;
  onAlertReceived?: (alert: Alert) => void;
}
export function AlertsNotificationPanel({
  venueId,
  isOpen,
  onClose,
  onAlertReceived,
}: AlertsPanelProps) {
  const { theme, isDark } = useTheme();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    new Set(),
  );
  const { data: alerts = [], refetch } = useQuery({
    queryKey: ["active-alerts", venueId],
    queryFn: () => apiService.analytics.getActiveAlerts(venueId),
    enabled: isOpen && !!venueId,
    refetchInterval: 5000,
  });
  const handleAcknowledge = async (alertId: string) => {
    try {
      await apiService.analytics.acknowledgeAlert(alertId);
      setDismissedAlerts((prev) => new Set([...prev, alertId]));
      refetch();
    } catch (error) {
      console.error("Error acknowledging alert:", error);
    }
  };
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-900/30 border-red-700/50";
      case "warning":
        return "bg-yellow-900/30 border-yellow-700/50";
      default:
        return "bg-blue-900/30 border-blue-700/50";
    }
  };
  const activeAlerts = alerts.filter(
    (a: Alert) => !dismissedAlerts.has(a.id) && !a.acknowledged,
  );
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        right: 0,
        width: "500px",
        maxHeight: "600px",
        backgroundColor: theme.colors.card,
        border: `1px solid ${theme.colors.border}`,
        borderTopLeftRadius: "16px",
        borderTopRightRadius: "16px",
        boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.4)",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
      }}
    >
      {" "}
      <div
        style={{
          padding: "1rem",
          borderBottom: `1px solid ${theme.colors.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {" "}
        <h3
          style={{
            fontSize: "1.1rem",
            fontWeight: "600",
            color: theme.text.primary,
            margin: 0,
          }}
        >
          {" "}
          Alerts & Notifications{" "}
        </h3>{" "}
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: theme.text.secondary,
          }}
        >
          {" "}
          <X className="w-5 h-5" />{" "}
        </button>{" "}
      </div>{" "}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        {" "}
        {activeAlerts.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "200px",
              color: theme.text.secondary,
            }}
          >
            {" "}
            <CheckCircle className="w-8 h-8 mb-2 text-green-500" />{" "}
            <p>All clear! No active alerts.</p>{" "}
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {" "}
            {activeAlerts.map((alert: Alert) => (
              <div
                key={alert.id}
                style={{
                  padding: "1rem",
                  borderRadius: "8px",
                  border: `1px solid ${theme.colors.border}`,
                  backgroundColor: isDark
                    ? getSeverityColor(alert.severity).split("")[0]
                    : "rgba(255, 255, 255, 0.5)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  opacity: dismissedAlerts.has(alert.id) ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as any).style.borderColor =
                    theme.colors.primary;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as any).style.borderColor =
                    theme.colors.border;
                }}
              >
                {" "}
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "flex-start",
                  }}
                >
                  {" "}
                  {getSeverityIcon(alert.severity)}{" "}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {" "}
                    <p
                      style={{
                        fontWeight: "600",
                        color: theme.text.primary,
                        margin: "0 0 0.25rem 0",
                        fontSize: "0.95rem",
                      }}
                    >
                      {" "}
                      {alert.title}{" "}
                    </p>{" "}
                    <p
                      style={{
                        color: theme.text.secondary,
                        margin: "0 0 0.5rem 0",
                        fontSize: "0.85rem",
                        lineHeight: "1.4",
                      }}
                    >
                      {" "}
                      {alert.description}{" "}
                    </p>{" "}
                    <p
                      style={{
                        color: theme.text.secondary,
                        margin: 0,
                        fontSize: "0.75rem",
                      }}
                    >
                      {" "}
                      {new Date(alert.created_at).toLocaleTimeString()}{" "}
                    </p>{" "}
                  </div>{" "}
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: theme.colors.primary,
                      color: "#000",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {" "}
                    Acknowledge{" "}
                  </button>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>
        )}{" "}
      </div>{" "}
      <div
        style={{
          padding: "1rem",
          borderTop: `1px solid ${theme.colors.border}`,
          backgroundColor: isDark
            ? "rgba(0, 0, 0, 0.3)"
            : "rgba(255, 255, 255, 0.3)",
          fontSize: "0.85rem",
          color: theme.text.secondary,
          textAlign: "center",
        }}
      >
        {" "}
        {activeAlerts.length} active alert
        {activeAlerts.length !== 1 ? "s" : ""}{" "}
      </div>{" "}
    </div>
  );
}
