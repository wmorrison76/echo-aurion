import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Send,
  Download,
  AlertTriangle,
  TrendingUp,
  Activity,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useMultiOutlet } from "@/context/MultiOutletContext";

interface EDIMessage {
  id: string;
  supplier_id: string;
  supplier_name?: string;
  message_type: string;
  direction: string;
  po_number?: string;
  invoice_number?: string;
  asn_number?: string;
  status: string;
  error_message?: string;
  sent_at?: string;
  received_at?: string;
  created_at: string;
}

interface EDIStats {
  totalMessages: number;
  successRate: number;
  errorRate: number;
  messagesByType: {
    PO: { sent: number; received: number; errors: number };
    INVOICE: { sent: number; received: number; errors: number };
    ASN: { sent: number; received: number; errors: number };
  };
  messagesByStatus: {
    pending: number;
    sent: number;
    received: number;
    error: number;
  };
  messagesBySupplier: Array<{
    supplier_id: string;
    supplier_name: string;
    total: number;
    success: number;
    errors: number;
    successRate: number;
  }>;
  recentErrors: Array<{
    id: string;
    supplier_id: string;
    message_type: string;
    error_message: string;
    created_at: string;
  }>;
  last24Hours: {
    sent: number;
    received: number;
    errors: number;
  };
}

export default function EDIMonitoringDashboard() {
  const { user } = useAuth();
  const { currentOutlet } = useMultiOutlet();
  const [stats, setStats] = useState<EDIStats | null>(null);
  const [messages, setMessages] = useState<EDIMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [currentOutlet]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const orgId = currentOutlet?.organization_id || user?.organization_id;
      if (!orgId) {
        setError("Organization ID not found");
        return;
      }

      const [statsRes, messagesRes] = await Promise.all([
        fetch(`/api/edi-monitoring/stats?organization_id=${orgId}`),
        fetch(
          `/api/edi-monitoring/messages?organization_id=${orgId}&limit=100`,
        ),
      ]);

      if (!statsRes.ok || !messagesRes.ok) {
        throw new Error("Failed to fetch EDI data");
      }

      const statsData = await statsRes.json();
      const messagesData = await messagesRes.json();

      setStats(statsData);
      setMessages(messagesData.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load EDI data");
      logger.error("EDI monitoring fetch error", { error: err });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleRetry = async (messageId: string) => {
    try {
      const response = await fetch("/api/edi-monitoring/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: messageId }),
      });

      if (!response.ok) {
        throw new Error("Failed to retry message");
      }

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry message");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
      case "received":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
      case "received":
        return "bg-green-50 border-green-200 text-green-800";
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      case "pending":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">
          Loading EDI monitoring data...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            EDI Monitoring Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor EDI message status, errors, and supplier connections
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {stats && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Total Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalMessages.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.successRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.errorRate.toFixed(1)}% errors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Last 24 Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.last24Hours.sent + stats.last24Hours.received}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.last24Hours.sent} sent, {stats.last24Hours.received}{" "}
                  received
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Errors (24h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats.last24Hours.errors}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.messagesByStatus.error} total errors
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="messages">
                Messages ({messages.length})
              </TabsTrigger>
              <TabsTrigger value="suppliers">
                Suppliers ({stats.messagesBySupplier.length})
              </TabsTrigger>
              <TabsTrigger value="errors">
                Errors ({stats.recentErrors.length})
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Messages by Type */}
                <Card>
                  <CardHeader>
                    <CardTitle>Messages by Type</CardTitle>
                    <CardDescription>Breakdown by message type</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Purchase Orders (PO)</span>
                        <span className="font-medium">
                          {stats.messagesByType.PO.sent +
                            stats.messagesByType.PO.received}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stats.messagesByType.PO.sent} sent,{" "}
                        {stats.messagesByType.PO.received} received,{" "}
                        {stats.messagesByType.PO.errors} errors
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Invoices</span>
                        <span className="font-medium">
                          {stats.messagesByType.INVOICE.sent +
                            stats.messagesByType.INVOICE.received}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stats.messagesByType.INVOICE.sent} sent,{" "}
                        {stats.messagesByType.INVOICE.received} received,{" "}
                        {stats.messagesByType.INVOICE.errors} errors
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Ship Notices (ASN)</span>
                        <span className="font-medium">
                          {stats.messagesByType.ASN.sent +
                            stats.messagesByType.ASN.received}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stats.messagesByType.ASN.sent} sent,{" "}
                        {stats.messagesByType.ASN.received} received,{" "}
                        {stats.messagesByType.ASN.errors} errors
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Messages by Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Messages by Status</CardTitle>
                    <CardDescription>
                      Current message status breakdown
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          Sent/Received
                        </span>
                        <span className="font-medium">
                          {stats.messagesByStatus.sent +
                            stats.messagesByStatus.received}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          Pending
                        </span>
                        <span className="font-medium">
                          {stats.messagesByStatus.pending}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          Errors
                        </span>
                        <span className="font-medium text-red-600">
                          {stats.messagesByStatus.error}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Messages Tab */}
            <TabsContent value="messages" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent EDI Messages</CardTitle>
                  <CardDescription>Latest EDI message activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No messages found
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Time</th>
                            <th className="text-left p-2">Supplier</th>
                            <th className="text-left p-2">Type</th>
                            <th className="text-left p-2">Direction</th>
                            <th className="text-left p-2">Reference</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-left p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {messages.map((msg) => (
                            <tr
                              key={msg.id}
                              className="border-b hover:bg-muted/50"
                            >
                              <td className="p-2">
                                {new Date(msg.created_at).toLocaleString()}
                              </td>
                              <td className="p-2">
                                {msg.supplier_name || msg.supplier_id}
                              </td>
                              <td className="p-2">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                  {msg.message_type}
                                </span>
                              </td>
                              <td className="p-2">
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    msg.direction === "outbound"
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {msg.direction === "outbound" ? (
                                    <Send className="h-3 w-3 inline mr-1" />
                                  ) : (
                                    <Download className="h-3 w-3 inline mr-1" />
                                  )}
                                  {msg.direction}
                                </span>
                              </td>
                              <td className="p-2 font-mono text-xs">
                                {msg.po_number ||
                                  msg.invoice_number ||
                                  msg.asn_number ||
                                  "-"}
                              </td>
                              <td className="p-2">
                                <span
                                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 w-fit ${getStatusColor(
                                    msg.status,
                                  )}`}
                                >
                                  {getStatusIcon(msg.status)}
                                  {msg.status}
                                </span>
                              </td>
                              <td className="p-2">
                                {msg.status === "error" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRetry(msg.id)}
                                  >
                                    Retry
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Suppliers Tab */}
            <TabsContent value="suppliers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Supplier EDI Status</CardTitle>
                  <CardDescription>
                    EDI connection status by supplier
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.messagesBySupplier.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No supplier data available
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Supplier</th>
                            <th className="text-right p-2">Total Messages</th>
                            <th className="text-right p-2">Success</th>
                            <th className="text-right p-2">Errors</th>
                            <th className="text-right p-2">Success Rate</th>
                            <th className="text-left p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.messagesBySupplier.map((supplier) => (
                            <tr
                              key={supplier.supplier_id}
                              className="border-b hover:bg-muted/50"
                            >
                              <td className="p-2 font-medium">
                                {supplier.supplier_name}
                              </td>
                              <td className="p-2 text-right">
                                {supplier.total}
                              </td>
                              <td className="p-2 text-right text-green-600">
                                {supplier.success}
                              </td>
                              <td className="p-2 text-right text-red-600">
                                {supplier.errors}
                              </td>
                              <td className="p-2 text-right">
                                <span
                                  className={
                                    supplier.successRate >= 95
                                      ? "text-green-600 font-medium"
                                      : supplier.successRate >= 85
                                        ? "text-yellow-600 font-medium"
                                        : "text-red-600 font-medium"
                                  }
                                >
                                  {supplier.successRate.toFixed(1)}%
                                </span>
                              </td>
                              <td className="p-2">
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    supplier.successRate >= 95
                                      ? "bg-green-100 text-green-800"
                                      : supplier.successRate >= 85
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {supplier.successRate >= 95
                                    ? "Healthy"
                                    : supplier.successRate >= 85
                                      ? "Warning"
                                      : "Error"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Errors Tab */}
            <TabsContent value="errors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Errors</CardTitle>
                  <CardDescription>
                    EDI message errors requiring attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.recentErrors.length === 0 ? (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription>No recent errors</AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      {stats.recentErrors.map((error) => (
                        <Card
                          key={error.id}
                          className="bg-red-50 border-red-200"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertCircle className="h-5 w-5 text-red-600" />
                                  <span className="font-semibold">
                                    {error.message_type} - {error.supplier_id}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(
                                      error.created_at,
                                    ).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm text-red-800">
                                  {error.error_message}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRetry(error.id)}
                              >
                                Retry
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// Add logger if not available
const logger = {
  error: (message: string, meta?: any) => console.error(message, meta),
};
