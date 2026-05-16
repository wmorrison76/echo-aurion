import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  TrendingDown,
  Thermometer,
  Droplets,
} from "lucide-react";
import {
  useSensorReadings,
  useSpoilagePredictions,
  useTemperatureCompliance,
} from "@/hooks/useSensorReadings";
interface SensorMonitoringPanelProps {
  organizationId: string;
  outletId?: string;
}
function SensorMonitoringPanelComponent({
  organizationId,
  outletId,
}: SensorMonitoringPanelProps) {
  const { readings: temperatureReadings } = useSensorReadings({
    organizationId,
    outletId,
    readingType: "temperature",
    autoRefresh: true,
    refreshInterval: 60,
  });
  const { readings: humidityReadings } = useSensorReadings({
    organizationId,
    outletId,
    readingType: "humidity",
    autoRefresh: true,
    refreshInterval: 60,
  });
  const { predictions: spoilagePredictions, summary: spoilageSummary } =
    useSpoilagePredictions({
      organizationId,
      outletId,
      autoRefresh: true,
      refreshInterval: 300,
    });
  const { events: complianceEvents, summary: complianceSummary } =
    useTemperatureCompliance({
      organizationId,
      outletId,
      unresolved: true,
      autoRefresh: true,
      refreshInterval: 60,
    });
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-surface text-gray-800";
    }
  };
  const avgTemperature = temperatureReadings.length
    ? (
        temperatureReadings.reduce((sum, r) => sum + r.value, 0) /
        temperatureReadings.length
      ).toFixed(1)
    : "N/A";
  const avgHumidity = humidityReadings.length
    ? (
        humidityReadings.reduce((sum, r) => sum + r.value, 0) /
        humidityReadings.length
      ).toFixed(1)
    : "N/A";
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
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {" "}
              <Thermometer className="w-4 h-4" /> Avg Temperature{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">{avgTemperature}°C</div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {" "}
              <Droplets className="w-4 h-4" /> Avg Humidity{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">{avgHumidity}%</div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Spoilage Risk
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-red-600">
              {spoilageSummary.critical}
            </div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              Critical items
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Compliance Issues
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-orange-600">
              {complianceSummary.unresolved}
            </div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              Unresolved events
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Spoilage Predictions */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="flex items-center gap-2">
            {" "}
            <TrendingDown className="w-5 h-5" /> Spoilage Risk Assessment{" "}
          </CardTitle>{" "}
          <CardDescription>Products at risk of spoilage</CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          {spoilagePredictions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No spoilage risks detected
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {" "}
              {spoilagePredictions.map((prediction) => (
                <div
                  key={prediction.id}
                  className="p-3 border rounded-lg flex items-start justify-between"
                >
                  {" "}
                  <div className="flex-1">
                    {" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <h4 className="font-medium">
                        {prediction.product_id || "Unknown Product"}
                      </h4>{" "}
                      <Badge
                        className={`text-xs ${getRiskColor(prediction.risk_level)}`}
                      >
                        {" "}
                        {prediction.risk_level}{" "}
                      </Badge>{" "}
                      {prediction.confidence_score && (
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          {(prediction.confidence_score * 100).toFixed(0)}%
                          confidence{" "}
                        </span>
                      )}{" "}
                    </div>{" "}
                    {prediction.recommended_action && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {prediction.recommended_action}
                      </div>
                    )}{" "}
                    {prediction.predicted_spoilage_date && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {" "}
                        Expected spoilage:{" "}
                        {new Date(
                          prediction.predicted_spoilage_date,
                        ).toLocaleDateString()}{" "}
                      </div>
                    )}{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </div>
          )}{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Temperature Compliance Issues */}{" "}
      {complianceSummary.unresolved > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="flex items-center gap-2 text-orange-900">
              {" "}
              <AlertTriangle className="w-5 h-5" />{" "}
              {complianceSummary.unresolved} Temperature Compliance
              Issue(s){" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {" "}
              {complianceEvents
                .filter((e) => !e.cleared_at)
                .slice(0, 5)
                .map((event) => (
                  <div
                    key={event.id}
                    className="p-2 bg-background rounded border border-orange-200"
                  >
                    {" "}
                    <div className="flex justify-between items-start">
                      {" "}
                      <div>
                        {" "}
                        <div className="font-medium text-sm">
                          {" "}
                          {event.threshold_type?.replace(/_/g, " ")}{" "}
                        </div>{" "}
                        {event.recorded_value && event.threshold_value && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {" "}
                            {event.recorded_value}° (Threshold:{" "}
                            {event.threshold_value}°){" "}
                          </div>
                        )}{" "}
                      </div>{" "}
                      {event.duration_seconds && (
                        <Badge variant="outline" className="text-xs">
                          {" "}
                          {Math.round(event.duration_seconds / 60)}m{" "}
                        </Badge>
                      )}{" "}
                    </div>{" "}
                  </div>
                ))}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
    </div>
  );
}
export const SensorMonitoringPanel = memo(SensorMonitoringPanelComponent);
