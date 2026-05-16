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
  AlertCircle,
  CheckCircle2,
  WifiOff,
  Battery,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useIoTDevices, useDeviceStatus } from "@/hooks/useIoTDevices";
import { useIoTAlerts } from "@/hooks/useIoTAlerts";
import { useAuth } from "@/context/AuthContext";
interface IoTDeviceManagementPanelProps {
  organizationId: string;
  outletId?: string;
}
function IoTDeviceManagementPanelComponent({
  organizationId,
  outletId,
}: IoTDeviceManagementPanelProps) {
  const { user } = useAuth();
  const {
    statuses,
    summary,
    refetch: refetchDevices,
    loading: devicesLoading,
  } = useDeviceStatus({
    organizationId,
    outletId,
    autoRefresh: true,
    refreshInterval: 60,
  });
  const {
    alerts,
    summary: alertSummary,
    refetch: refetchAlerts,
  } = useIoTAlerts({
    organizationId,
    outletId,
    status: "open",
    autoRefresh: true,
    refreshInterval: 30,
  });
  const [showAddDevice, setShowAddDevice] = useState(false);
  const getHealthColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800";
      case "offline":
        return "bg-red-100 text-red-800";
      case "battery_low":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-surface text-gray-800";
    }
  };
  const getHealthIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="w-4 h-4" />;
      case "offline":
        return <WifiOff className="w-4 h-4" />;
      case "battery_low":
        return <Battery className="w-4 h-4" />;
      default:
        return null;
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
              Total Devices
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
              Healthy
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-green-600">
              {summary.healthy}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Offline
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-red-600">
              {summary.offline}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Battery
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-yellow-600">
              {summary.lowBattery}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Device List */}{" "}
      <Card>
        {" "}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          {" "}
          <div>
            {" "}
            <CardTitle>IoT Devices</CardTitle>{" "}
            <CardDescription>
              Monitor and manage all connected devices
            </CardDescription>{" "}
          </div>{" "}
          <div className="flex gap-2">
            {" "}
            <Button
              variant="outline"
              size="sm"
              onClick={refetchDevices}
              disabled={devicesLoading}
            >
              {" "}
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh{" "}
            </Button>{" "}
            <Button size="sm" onClick={() => setShowAddDevice(true)}>
              {" "}
              <Plus className="w-4 h-4 mr-2" /> Add Device{" "}
            </Button>{" "}
          </div>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          {devicesLoading ? (
            <div className="flex justify-center py-8">
              {" "}
              <div className="text-muted-foreground">
                Loading devices...
              </div>{" "}
            </div>
          ) : statuses.length === 0 ? (
            <div className="flex justify-center py-8">
              {" "}
              <div className="text-muted-foreground">
                No devices configured
              </div>{" "}
            </div>
          ) : (
            <div className="space-y-2">
              {" "}
              {statuses.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-surface"
                >
                  {" "}
                  <div className="flex-1">
                    {" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <h4 className="font-medium">{device.device_name}</h4>{" "}
                      <Badge variant="outline" className="text-xs">
                        {" "}
                        {device.device_category}{" "}
                      </Badge>{" "}
                      <Badge
                        className={`text-xs flex items-center gap-1 ${getHealthColor(device.health_status)}`}
                      >
                        {" "}
                        {getHealthIcon(device.health_status)}{" "}
                        {device.health_status}{" "}
                      </Badge>{" "}
                    </div>{" "}
                    <div className="text-sm text-muted-foreground mt-1">
                      {" "}
                      <div>SN: {device.serial_number}</div>{" "}
                      {device.location_description && (
                        <div>Location: {device.location_description}</div>
                      )}{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="text-right text-sm">
                    {" "}
                    {device.battery_level !== null &&
                      device.battery_level !== undefined && (
                        <div className="text-muted-foreground mb-1">
                          Battery: {device.battery_level}%
                        </div>
                      )}{" "}
                    {device.last_seen && (
                      <div className="text-xs text-muted-foreground">
                        {" "}
                        Last seen:{" "}
                        {new Date(device.last_seen).toLocaleTimeString()}{" "}
                      </div>
                    )}{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </div>
          )}{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Critical Alerts */}{" "}
      {alertSummary.unresolved_critical > 0 && (
        <Card className="border-red-200 bg-red-50">
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="flex items-center gap-2 text-red-900">
              {" "}
              <AlertCircle className="w-5 h-5" />{" "}
              {alertSummary.unresolved_critical} Critical Alert(s){" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {" "}
              {alerts
                .filter((a) => a.severity === "critical" && a.status === "open")
                .slice(0, 5)
                .map((alert) => (
                  <div
                    key={alert.id}
                    className="p-2 bg-background rounded border border-red-200"
                  >
                    {" "}
                    <div className="font-medium text-sm">
                      {alert.title}
                    </div>{" "}
                    <div className="text-xs text-muted-foreground mt-1">
                      {alert.message}
                    </div>{" "}
                  </div>
                ))}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      {/* Info Cards */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="text-sm">Device Types</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="space-y-2 text-sm">
              {" "}
              {Array.from(new Set(statuses.map((s) => s.device_category))).map(
                (category) => {
                  const count = statuses.filter(
                    (s) => s.device_category === category,
                  ).length;
                  return (
                    <div key={category} className="flex justify-between">
                      {" "}
                      <span className="text-muted-foreground">
                        {category}
                      </span>{" "}
                      <span className="font-medium">{count}</span>{" "}
                    </div>
                  );
                },
              )}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="text-sm">Alert Status</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="space-y-2 text-sm">
              {" "}
              <div className="flex justify-between">
                {" "}
                <span className="text-muted-foreground">Open Alerts</span>{" "}
                <span className="font-medium text-red-600">
                  {alertSummary.total_open}
                </span>{" "}
              </div>{" "}
              <div className="flex justify-between">
                {" "}
                <span className="text-muted-foreground">Acknowledged</span>{" "}
                <span className="font-medium text-yellow-600">
                  {alertSummary.total_acknowledged}
                </span>{" "}
              </div>{" "}
              <div className="flex justify-between">
                {" "}
                <span className="text-muted-foreground">Critical</span>{" "}
                <span className="font-medium text-red-600">
                  {alertSummary.unresolved_critical}
                </span>{" "}
              </div>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
    </div>
  );
}
export const IoTDeviceManagementPanel = memo(IoTDeviceManagementPanelComponent);
