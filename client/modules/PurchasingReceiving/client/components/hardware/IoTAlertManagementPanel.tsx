import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Settings,
} from "lucide-react";
import {
  useIoTAlerts,
  useAlertRules,
  useAlertSummary,
} from "@/hooks/useIoTAlerts";
interface IoTAlertManagementPanelProps {
  organizationId: string;
  outletId?: string;
}
export function IoTAlertManagementPanel({
  organizationId,
  outletId,
}: IoTAlertManagementPanelProps) {
  const {
    alerts,
    summary,
    refetch: refetchAlerts,
    acknowledgeAlert,
    resolveAlert,
  } = useIoTAlerts({
    organizationId,
    outletId,
    autoRefresh: true,
    refreshInterval: 30,
  });
  const { rules, summary: rulesSummary } = useAlertRules({
    organizationId,
    outletId,
    autoRefresh: true,
    refreshInterval: 300,
  });
  const { summary: alertSummary } = useAlertSummary({
    organizationId,
    outletId,
    autoRefresh: true,
    refreshInterval: 60,
  });
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "info":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-surface text-gray-800";
    }
  };
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
      case "warning":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-800";
      case "acknowledged":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      default:
        return "bg-surface text-gray-800";
    }
  };
  return (
    <div className="space-y-6">
      {" "}
      {/* Summary Cards */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Alerts
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">{summary.total}</div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-red-600">
              {summary.open}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-red-600">
              {summary.critical}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Rules
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {rulesSummary.enabled}
            </div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              of {rulesSummary.total}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Tabs */}{" "}
      <div className="flex gap-2 border-b">
        {" "}
        <Button
          variant={!showRules ? "default" : "ghost"}
          size="sm"
          onClick={() => setShowRules(false)}
        >
          {" "}
          <Bell className="w-4 h-4 mr-2" /> Alerts{" "}
        </Button>{" "}
        <Button
          variant={showRules ? "default" : "ghost"}
          size="sm"
          onClick={() => setShowRules(true)}
        >
          {" "}
          <Settings className="w-4 h-4 mr-2" /> Rules ({rulesSummary.total}
          ){" "}
        </Button>{" "}
      </div>{" "}
      {!showRules ? (
        <>
          {" "}
          {/* Alerts List */}{" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Active Alerts</CardTitle>{" "}
              <CardDescription>
                Open and acknowledged alerts requiring action
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              {alerts.length === 0 ? (
                <div className="flex justify-center py-8 text-muted-foreground">
                  No active alerts
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {" "}
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-surface ${selectedAlert === alert.id ? "bg-surface border-blue-500" : ""}`}
                      onClick={() =>
                        setSelectedAlert(
                          selectedAlert === alert.id ? null : alert.id,
                        )
                      }
                    >
                      {" "}
                      <div className="flex items-start justify-between gap-3">
                        {" "}
                        <div className="flex items-start gap-3 flex-1">
                          {" "}
                          <div
                            className={`p-2 rounded ${getSeverityColor(alert.severity)}`}
                          >
                            {" "}
                            {getSeverityIcon(alert.severity)}{" "}
                          </div>{" "}
                          <div className="flex-1">
                            {" "}
                            <div className="font-medium">
                              {alert.title}
                            </div>{" "}
                            <div className="text-sm text-muted-foreground mt-1">
                              {alert.message}
                            </div>{" "}
                            {alert.device_id && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {" "}
                                Device: {alert.device_id}{" "}
                              </div>
                            )}{" "}
                          </div>{" "}
                        </div>{" "}
                        <div className="flex items-center gap-2">
                          {" "}
                          <Badge
                            className={`text-xs ${getStatusColor(alert.status)}`}
                          >
                            {" "}
                            {alert.status}{" "}
                          </Badge>{" "}
                        </div>{" "}
                      </div>{" "}
                      {selectedAlert === alert.id && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          {" "}
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {" "}
                            <div>
                              {" "}
                              <span className="text-muted-foreground">
                                Type:{" "}
                              </span>{" "}
                              <span>{alert.alert_type}</span>{" "}
                            </div>{" "}
                            {alert.reading_value && (
                              <div>
                                {" "}
                                <span className="text-muted-foreground">
                                  Reading:{" "}
                                </span>{" "}
                                <span>{alert.reading_value}</span>{" "}
                              </div>
                            )}{" "}
                          </div>{" "}
                          <div className="flex gap-2 mt-3">
                            {" "}
                            {alert.status === "open" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  acknowledgeAlert(alert.id, "current_user")
                                }
                              >
                                {" "}
                                <CheckCircle2 className="w-4 h-4 mr-2" />{" "}
                                Acknowledge{" "}
                              </Button>
                            )}{" "}
                            {alert.status !== "resolved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  resolveAlert(alert.id, "current_user")
                                }
                              >
                                {" "}
                                <CheckCircle2 className="w-4 h-4 mr-2" />{" "}
                                Resolve{" "}
                              </Button>
                            )}{" "}
                          </div>{" "}
                        </div>
                      )}{" "}
                    </div>
                  ))}{" "}
                </div>
              )}{" "}
            </CardContent>{" "}
          </Card>{" "}
          {/* Alert Summary by Type */}{" "}
          {alertSummary && (
            <Card>
              {" "}
              <CardHeader>
                {" "}
                <CardTitle className="text-sm">Alerts by Type</CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="space-y-2">
                  {" "}
                  {Object.entries(alertSummary.by_type || {}).map(
                    ([type, count]) => (
                      <div key={type} className="flex justify-between text-sm">
                        {" "}
                        <span className="text-muted-foreground">
                          {type}
                        </span>{" "}
                        <span className="font-medium">{count}</span>{" "}
                      </div>
                    ),
                  )}{" "}
                </div>{" "}
              </CardContent>{" "}
            </Card>
          )}{" "}
        </>
      ) : (
        <>
          {" "}
          {/* Rules List */}{" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Alert Rules</CardTitle>{" "}
              <CardDescription>
                Configure rules that trigger alerts
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              {rules.length === 0 ? (
                <div className="flex justify-center py-8 text-muted-foreground">
                  No alert rules configured
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {" "}
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-3 border rounded-lg hover:bg-surface"
                    >
                      {" "}
                      <div className="flex items-start justify-between gap-3">
                        {" "}
                        <div className="flex-1">
                          {" "}
                          <div className="font-medium">{rule.name}</div>{" "}
                          {rule.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {rule.description}
                            </div>
                          )}{" "}
                          <div className="flex items-center gap-2 mt-2">
                            {" "}
                            <Badge variant="outline" className="text-xs">
                              {" "}
                              {rule.alert_type}{" "}
                            </Badge>{" "}
                            <Badge variant="outline" className="text-xs">
                              {" "}
                              {rule.priority}{" "}
                            </Badge>{" "}
                          </div>{" "}
                        </div>{" "}
                        <div className="flex flex-col items-end gap-2">
                          {" "}
                          <Badge
                            variant="outline"
                            className={`text-xs ${rule.enabled ? "bg-green-50 text-green-700 border-green-200" : "bg-surface text-foreground border-gray-200"}`}
                          >
                            {" "}
                            {rule.enabled ? "Enabled" : "Disabled"}{" "}
                          </Badge>{" "}
                        </div>{" "}
                      </div>{" "}
                    </div>
                  ))}{" "}
                </div>
              )}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </>
      )}{" "}
    </div>
  );
}
