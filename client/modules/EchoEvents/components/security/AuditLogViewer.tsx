import React, { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Download, Search } from "lucide-react";
interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  status: "success" | "failure";
  createdAt: Date;
  ipAddress?: string;
  errorMessage?: string;
}
interface AuditLogViewerProps {
  onExport?: () => void;
}
export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ onExport }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: "",
    userId: "",
    status: "",
  });
  useEffect(() => {
    fetchLogs();
  }, [filters]);
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append("action", filters.action);
      if (filters.userId) params.append("userId", filters.userId);
      if (filters.status) params.append("status", filters.status);
      const response = await fetch(`/api/v1/audit/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch logs");
      const data = await response.json();
      setLogs(data.data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleExport = async () => {
    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const response = await fetch(
        `/api/v1/audit/logs/export?startDate=${startDate.toISOString()}&endDate=${now.toISOString()}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "audit-trail.json";
      a.click();
    } catch (error) {
      console.error("Error exporting logs:", error);
    }
  };
  const getStatusBadge = (status: string) => {
    return status === "success" ? (
      <Badge className="bg-green-100 text-green-800">Success</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">Failed</Badge>
    );
  };
  const getActionIcon = (action: string): string => {
    if (action.includes("create")) return "➕";
    if (action.includes("update")) return "✏️";
    if (action.includes("delete")) return "🗑️";
    if (action.includes("read")) return "👁️";
    return "📋";
  };
  return (
    <div className="space-y-4 p-6 bg-surface">
      {" "}
      {/* Filters */}{" "}
      <Card className="p-4">
        {" "}
        <h3 className="font-semibold mb-3 text-sm">Filters</h3>{" "}
        <div className="grid grid-cols-3 gap-3">
          {" "}
          <Input
            placeholder="Filter by user ID"
            value={filters.userId}
            onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
            className="text-sm"
          />{" "}
          <Input
            placeholder="Filter by action"
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="text-sm"
          />{" "}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border rounded text-sm"
          >
            {" "}
            <option value="">All Status</option>{" "}
            <option value="success">Success</option>{" "}
            <option value="failure">Failed</option>{" "}
          </select>{" "}
        </div>{" "}
      </Card>{" "}
      {/* Export Button */}{" "}
      <div className="flex justify-end">
        {" "}
        <Button onClick={handleExport} className="flex items-center gap-2">
          {" "}
          <Download size={16} /> Export Audit Trail{" "}
        </Button>{" "}
      </div>{" "}
      {/* Logs Table */}{" "}
      {loading ? (
        <Card className="p-8 text-center text-gray-400">
          {" "}
          <p>Loading logs...</p>{" "}
        </Card>
      ) : logs.length === 0 ? (
        <Card className="p-8 text-center text-gray-400">
          {" "}
          <p>No audit logs found</p>{" "}
        </Card>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {" "}
          {logs.map((log) => (
            <Card key={log.id} className="p-3">
              {" "}
              <div className="flex justify-between items-start">
                {" "}
                <div className="flex-1">
                  {" "}
                  <div className="flex items-center gap-2 mb-1">
                    {" "}
                    <span className="text-lg">
                      {getActionIcon(log.action)}
                    </span>{" "}
                    <span className="font-medium text-sm">{log.action}</span>{" "}
                    {getStatusBadge(log.status)}{" "}
                  </div>{" "}
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {" "}
                    <div>User: {log.userId}</div>{" "}
                    {log.resourceType && (
                      <div>
                        {" "}
                        Resource: {log.resourceType} ({log.resourceId}){" "}
                      </div>
                    )}{" "}
                    {log.ipAddress && <div>IP: {log.ipAddress}</div>}{" "}
                    <div>{new Date(log.createdAt).toLocaleString()}</div>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              {log.errorMessage && (
                <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                  {" "}
                  {log.errorMessage}{" "}
                </div>
              )}{" "}
            </Card>
          ))}{" "}
        </div>
      )}{" "}
    </div>
  );
};
