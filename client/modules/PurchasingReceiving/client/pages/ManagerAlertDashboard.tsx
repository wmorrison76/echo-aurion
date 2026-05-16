import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import {
  useManagerAlerts,
  useAlertNotifications,
  useAlertSummary,
} from "@/hooks/useManagerAlerts";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export default function ManagerAlertDashboard() {
  const [activeTab, setActiveTab] = useState("active");
  const {
    alerts,
    loading: alertsLoading,
    acknowledgeAlert,
    resolveAlert,
    refetch: refetchAlerts,
  } = useManagerAlerts(50);
  const { notifications, refetch: refetchNotifications } =
    useAlertNotifications(20);
  const { summary, refetch: refetchSummary } = useAlertSummary();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchAlerts(),
        refetchNotifications(),
        refetchSummary(),
      ]);
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  };
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-surface text-gray-800";
    }
  };
  const activeAlerts = alerts.filter((a) => a.status === "active");
  const acknowledgedAlerts = alerts.filter((a) => a.status === "acknowledged");
  const unreadNotifications = notifications.filter((n) => !n.readAt).length;
  return (
    <AppLayout title="Manager Alert Dashboard">
      {" "}
      <main id="main-content" className="space-y-6">
        {" "}
        {/* Summary Cards */}{" "}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {" "}
                <AlertTriangle className="w-4 h-4 text-red-500" /> Critical{" "}
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="text-3xl font-bold text-red-600">
                {" "}
                {summary?.criticalAlerts || 0}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                High Priority
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="text-3xl font-bold text-orange-600">
                {" "}
                {summary?.highAlerts || 0}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium">
                Total Alerts
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="text-3xl font-bold">
                {" "}
                {summary?.totalAlerts || 0}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {" "}
                <Bell className="w-4 h-4" /> Notifications{" "}
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="text-3xl font-bold">
                {unreadNotifications}
              </div>{" "}
              <p className="text-xs text-muted-foreground mt-1">Unread</p>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>{" "}
        {/* Main Alert Management */}{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <div className="flex items-center justify-between">
              {" "}
              <div>
                {" "}
                <CardTitle>Alert Management</CardTitle>{" "}
                <CardDescription>
                  {" "}
                  Monitor and manage all organization alerts{" "}
                </CardDescription>{" "}
              </div>{" "}
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {" "}
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                />{" "}
                {refreshing ? "Refreshing..." : "Refresh"}{" "}
              </Button>{" "}
            </div>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {" "}
              <TabsList className="grid w-full grid-cols-2 mb-6">
                {" "}
                <TabsTrigger value="active" className="gap-2">
                  {" "}
                  <AlertCircle className="w-4 h-4" /> Active (
                  {activeAlerts.length}){" "}
                </TabsTrigger>{" "}
                <TabsTrigger value="acknowledged" className="gap-2">
                  {" "}
                  <CheckCircle className="w-4 h-4" /> Acknowledged (
                  {acknowledgedAlerts.length}){" "}
                </TabsTrigger>{" "}
              </TabsList>{" "}
              <TabsContent value="active">
                {" "}
                <div className="overflow-x-auto">
                  {" "}
                  <Table>
                    {" "}
                    <TableHeader>
                      {" "}
                      <TableRow>
                        {" "}
                        <TableHead>Title</TableHead> <TableHead>Type</TableHead>{" "}
                        <TableHead>Severity</TableHead>{" "}
                        <TableHead>Outlet</TableHead>{" "}
                        <TableHead>Created</TableHead>{" "}
                        <TableHead>Actions</TableHead>{" "}
                      </TableRow>{" "}
                    </TableHeader>{" "}
                    <TableBody>
                      {" "}
                      {activeAlerts.length === 0 ? (
                        <TableRow>
                          {" "}
                          <TableCell
                            colSpan={6}
                            className="text-center py-8 text-muted-foreground"
                          >
                            {" "}
                            No active alerts{" "}
                          </TableCell>{" "}
                        </TableRow>
                      ) : (
                        activeAlerts.map((alert) => (
                          <TableRow key={alert.id}>
                            {" "}
                            <TableCell className="font-medium">
                              {" "}
                              {alert.title}{" "}
                            </TableCell>{" "}
                            <TableCell>{alert.alert_type}</TableCell>{" "}
                            <TableCell>
                              {" "}
                              <Badge
                                className={getSeverityColor(alert.severity)}
                              >
                                {" "}
                                {alert.severity}{" "}
                              </Badge>{" "}
                            </TableCell>{" "}
                            <TableCell>{alert.outlet?.name || "All"}</TableCell>{" "}
                            <TableCell className="text-sm text-muted-foreground">
                              {" "}
                              {new Date(
                                alert.created_at,
                              ).toLocaleDateString()}{" "}
                            </TableCell>{" "}
                            <TableCell className="space-x-2">
                              {" "}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => acknowledgeAlert(alert.id)}
                              >
                                {" "}
                                Acknowledge{" "}
                              </Button>{" "}
                            </TableCell>{" "}
                          </TableRow>
                        ))
                      )}{" "}
                    </TableBody>{" "}
                  </Table>{" "}
                </div>{" "}
              </TabsContent>{" "}
              <TabsContent value="acknowledged">
                {" "}
                <div className="overflow-x-auto">
                  {" "}
                  <Table>
                    {" "}
                    <TableHeader>
                      {" "}
                      <TableRow>
                        {" "}
                        <TableHead>Title</TableHead> <TableHead>Type</TableHead>{" "}
                        <TableHead>Severity</TableHead>{" "}
                        <TableHead>Outlet</TableHead>{" "}
                        <TableHead>Acknowledged</TableHead>{" "}
                        <TableHead>Actions</TableHead>{" "}
                      </TableRow>{" "}
                    </TableHeader>{" "}
                    <TableBody>
                      {" "}
                      {acknowledgedAlerts.length === 0 ? (
                        <TableRow>
                          {" "}
                          <TableCell
                            colSpan={6}
                            className="text-center py-8 text-muted-foreground"
                          >
                            {" "}
                            No acknowledged alerts{" "}
                          </TableCell>{" "}
                        </TableRow>
                      ) : (
                        acknowledgedAlerts.map((alert) => (
                          <TableRow key={alert.id}>
                            {" "}
                            <TableCell className="font-medium">
                              {" "}
                              {alert.title}{" "}
                            </TableCell>{" "}
                            <TableCell>{alert.alert_type}</TableCell>{" "}
                            <TableCell>
                              {" "}
                              <Badge
                                className={getSeverityColor(alert.severity)}
                              >
                                {" "}
                                {alert.severity}{" "}
                              </Badge>{" "}
                            </TableCell>{" "}
                            <TableCell>{alert.outlet?.name || "All"}</TableCell>{" "}
                            <TableCell className="text-sm text-muted-foreground">
                              {" "}
                              {alert.acknowledged_at
                                ? new Date(
                                    alert.acknowledged_at,
                                  ).toLocaleDateString()
                                : "-"}{" "}
                            </TableCell>{" "}
                            <TableCell>
                              {" "}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  resolveAlert(alert.id, "Resolved")
                                }
                              >
                                {" "}
                                Resolve{" "}
                              </Button>{" "}
                            </TableCell>{" "}
                          </TableRow>
                        ))
                      )}{" "}
                    </TableBody>{" "}
                  </Table>{" "}
                </div>{" "}
              </TabsContent>{" "}
            </Tabs>{" "}
          </CardContent>{" "}
        </Card>{" "}
        {/* Info Panel */}{" "}
        <Card className="bg-blue-50 border-blue-200">
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="text-base">
              About Alert Dashboard
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent className="text-sm space-y-2">
            {" "}
            <p>
              {" "}
              <strong>Real-time Monitoring:</strong> Track inventory shortages,
              receiving discrepancies, invoicing issues, and system alerts.{" "}
            </p>{" "}
            <p>
              {" "}
              <strong>Smart Routing:</strong> Alerts are automatically routed to
              relevant managers based on outlet and role.{" "}
            </p>{" "}
            <p>
              {" "}
              <strong>Action Tracking:</strong> Acknowledge and resolve alerts
              with audit trails for compliance.{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </main>{" "}
    </AppLayout>
  );
}
