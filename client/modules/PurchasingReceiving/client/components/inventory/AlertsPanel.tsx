import React, { useState } from "react";
import { useInventoryAlerts } from "../../hooks/useInventorySync";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import {
  AlertCircle,
  TrendingDown,
  Package,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
interface AlertsPanelProps {
  outletId?: string;
}
export function AlertsPanel({ outletId }: AlertsPanelProps) {
  const { alerts, loading, error, resolveAlert, refetch } =
    useInventoryAlerts();
  const [resolving, setResolving] = useState<string | null>(null);
  const handleResolve = async (alertId: string) => {
    setResolving(alertId);
    await resolveAlert(alertId);
    setResolving(null);
  };
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-blue-100 text-blue-800 border-primary";
      default:
        return "bg-surface text-gray-800";
    }
  };
  const getAlertIcon = (type: string) => {
    switch (type) {
      case "out_of_stock":
        return <Package className="w-4 h-4" />;
      case "below_minimum":
        return <TrendingDown className="w-4 h-4" />;
      case "above_maximum":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };
  const unresolved = alerts.filter((a) => !a.resolved_at);
  const critical = unresolved.filter((a) => a.severity === "critical").length;
  const high = unresolved.filter((a) => a.severity === "high").length;
  if (loading) {
    return (
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Inventory Alerts</CardTitle>{" "}
          <CardDescription>Loading alerts...</CardDescription>{" "}
        </CardHeader>{" "}
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {" "}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {" "}
              <AlertCircle className="w-4 h-4 text-red-500" /> Critical{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-red-600">
              {critical}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {" "}
              <AlertTriangle className="w-4 h-4 text-orange-500" /> High
              Priority{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-orange-600">
              {high}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium">
              {" "}
              Total Unresolved{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">{unresolved.length}</div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <div className="flex items-center justify-between">
            {" "}
            <div>
              {" "}
              <CardTitle>Inventory Alerts</CardTitle>{" "}
              <CardDescription>
                Unresolved inventory issues
              </CardDescription>{" "}
            </div>{" "}
            <Button onClick={() => refetch()} variant="outline" size="sm">
              {" "}
              Refresh{" "}
            </Button>{" "}
          </div>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          {error && (
            <Alert variant="destructive" className="mb-4">
              {" "}
              <AlertCircle className="h-4 w-4" />{" "}
              <AlertDescription>{error}</AlertDescription>{" "}
            </Alert>
          )}{" "}
          <div className="overflow-x-auto">
            {" "}
            <Table>
              {" "}
              <TableHeader>
                {" "}
                <TableRow>
                  {" "}
                  <TableHead>Product</TableHead> <TableHead>Outlet</TableHead>{" "}
                  <TableHead>Type</TableHead> <TableHead>Severity</TableHead>{" "}
                  <TableHead className="text-right">Current</TableHead>{" "}
                  <TableHead className="text-right">Expected</TableHead>{" "}
                  <TableHead>Message</TableHead>{" "}
                  <TableHead>Actions</TableHead>{" "}
                </TableRow>{" "}
              </TableHeader>{" "}
              <TableBody>
                {" "}
                {unresolved.length === 0 ? (
                  <TableRow>
                    {" "}
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {" "}
                      No unresolved alerts. Everything is in order!{" "}
                    </TableCell>{" "}
                  </TableRow>
                ) : (
                  unresolved.map((alert) => (
                    <TableRow key={alert.id} className="hover:bg-surface">
                      {" "}
                      <TableCell className="font-medium">
                        {" "}
                        <div className="flex items-center gap-2">
                          {" "}
                          {getAlertIcon(alert.alert_type)}{" "}
                          <span>{alert.standard_products?.name}</span>{" "}
                        </div>{" "}
                      </TableCell>{" "}
                      <TableCell>
                        {" "}
                        <span className="text-sm text-muted-foreground">
                          {" "}
                          {alert.outlet?.name}{" "}
                        </span>{" "}
                      </TableCell>{" "}
                      <TableCell>
                        {" "}
                        <span className="text-sm capitalize">
                          {" "}
                          {alert.alert_type.replace(/_/g, "")}{" "}
                        </span>{" "}
                      </TableCell>{" "}
                      <TableCell>
                        {" "}
                        <Badge className={getSeverityColor(alert.severity)}>
                          {" "}
                          {alert.severity.charAt(0).toUpperCase() +
                            alert.severity.slice(1)}{" "}
                        </Badge>{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right">
                        {" "}
                        <span className="font-semibold">
                          {" "}
                          {alert.current_quantity?.toFixed(2) || "N/A"}{" "}
                        </span>{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right">
                        {" "}
                        <span className="text-muted-foreground">
                          {" "}
                          {alert.expected_quantity?.toFixed(2) || "N/A"}{" "}
                        </span>{" "}
                      </TableCell>{" "}
                      <TableCell>
                        {" "}
                        <p className="text-sm text-muted-foreground max-w-xs">
                          {" "}
                          {alert.message}{" "}
                        </p>{" "}
                      </TableCell>{" "}
                      <TableCell>
                        {" "}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResolve(alert.id)}
                          disabled={resolving === alert.id}
                          className="text-green-600 hover:text-green-700"
                        >
                          {" "}
                          <Trash2 className="w-4 h-4" />{" "}
                          {resolving === alert.id ? "..." : "Resolve"}{" "}
                        </Button>{" "}
                      </TableCell>{" "}
                    </TableRow>
                  ))
                )}{" "}
              </TableBody>{" "}
            </Table>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
}
