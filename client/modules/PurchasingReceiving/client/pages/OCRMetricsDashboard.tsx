import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Calendar,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useMultiOutlet } from "@/context/MultiOutletContext";
interface OCRMetrics {
  metricDate: string;
  totalInvoicesProcessed: number;
  successfulExtractions: number;
  failedExtractions: number;
  averageConfidence: number;
  averageProcessingTimeMs: number;
  avgFieldAccuracy: number;
}
interface MetricsSummary {
  totalProcessed: number;
  successRate: number;
  avgConfidence: number;
  avgProcessingTime: number;
}
export default function OCRMetricsDashboard() {
  const { user } = useAuth();
  const { organization } = useMultiOutlet();
  const [metrics, setMetrics] = useState<OCRMetrics[]>([]);
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState(30);
  useEffect(() => {
    fetchMetrics();
  }, [daysFilter, organization?.id]);
  const fetchMetrics = async () => {
    if (!organization?.id) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/ocr/metrics?days=${daysFilter}`, {
        headers: { "X-Org-Id": organization.id },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch OCR metrics");
      }
      const data = await response.json();
      setMetrics(data.metrics || []);
      setSummary(data.summary);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };
  if (!user || !organization) {
    return (
      <AppLayout title="OCR Metrics">
        {" "}
        <main id="main-content" className="p-6">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>No Organization Selected</CardTitle>{" "}
              <CardDescription>
                {" "}
                Please select an organization to view OCR metrics{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
          </Card>{" "}
        </main>{" "}
      </AppLayout>
    );
  }
  return (
    <AppLayout title="OCR Metrics Dashboard">
      {" "}
      <main id="main-content" className="space-y-6 p-6">
        {" "}
        {/* Header with date range filter */}{" "}
        <div className="flex items-center justify-between">
          {" "}
          <div>
            {" "}
            <h2 className="text-3xl font-bold">OCR Performance Metrics</h2>{" "}
            <p className="text-muted-foreground mt-2">
              {" "}
              Track invoice OCR accuracy, processing speed, and quality
              metrics{" "}
            </p>{" "}
          </div>{" "}
          <div className="flex gap-2">
            {" "}
            {[7, 30, 90].map((days) => (
              <Button
                key={days}
                variant={daysFilter === days ? "default" : "outline"}
                onClick={() => setDaysFilter(days)}
                className="gap-2"
              >
                {" "}
                <Calendar className="h-4 w-4" /> {days}d{" "}
              </Button>
            ))}{" "}
          </div>{" "}
        </div>{" "}
        {/* Summary Cards */}{" "}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {" "}
            <Card>
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm font-medium">
                  Total Processed
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-3xl font-bold">
                  {summary.totalProcessed.toLocaleString()}
                </div>{" "}
                <p className="text-xs text-muted-foreground mt-1">
                  invoices
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card>
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {" "}
                  <CheckCircle className="h-4 w-4 text-green-600" /> Success
                  Rate{" "}
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-3xl font-bold">
                  {" "}
                  {(summary.successRate * 100).toFixed(1)}%{" "}
                </div>{" "}
                <p className="text-xs text-muted-foreground mt-1">
                  extraction accuracy
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card>
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {" "}
                  <TrendingUp className="h-4 w-4 text-primary" /> Avg
                  Confidence{" "}
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-3xl font-bold">
                  {" "}
                  {(summary.avgConfidence * 100).toFixed(1)}%{" "}
                </div>{" "}
                <p className="text-xs text-muted-foreground mt-1">
                  confidence score
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card>
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm font-medium">
                  Avg Processing Time
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-3xl font-bold">
                  {" "}
                  {Math.round(summary.avgProcessingTime / 1000)}s{" "}
                </div>{" "}
                <p className="text-xs text-muted-foreground mt-1">
                  per invoice
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
          </div>
        )}{" "}
        {/* Detailed Metrics Table */}{" "}
        {metrics.length > 0 ? (
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Daily Performance</CardTitle>{" "}
              <CardDescription>
                {" "}
                Detailed metrics for each day in the selected period{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="overflow-x-auto">
                {" "}
                <table className="w-full text-sm">
                  {" "}
                  <thead>
                    {" "}
                    <tr className="border-b">
                      {" "}
                      <th className="text-left py-3 px-4 font-semibold">
                        Date
                      </th>{" "}
                      <th className="text-center py-3 px-4 font-semibold">
                        Processed
                      </th>{" "}
                      <th className="text-center py-3 px-4 font-semibold">
                        Successful
                      </th>{" "}
                      <th className="text-center py-3 px-4 font-semibold">
                        Success Rate
                      </th>{" "}
                      <th className="text-center py-3 px-4 font-semibold">
                        Avg Confidence
                      </th>{" "}
                      <th className="text-center py-3 px-4 font-semibold">
                        Avg Time (ms)
                      </th>{" "}
                      <th className="text-center py-3 px-4 font-semibold">
                        Field Accuracy
                      </th>{" "}
                    </tr>{" "}
                  </thead>{" "}
                  <tbody>
                    {" "}
                    {metrics.map((metric, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? "bg-muted/30" : ""}
                      >
                        {" "}
                        <td className="py-3 px-4">
                          {" "}
                          {new Date(
                            metric.metricDate,
                          ).toLocaleDateString()}{" "}
                        </td>{" "}
                        <td className="text-center py-3 px-4">
                          {" "}
                          {metric.totalInvoicesProcessed}{" "}
                        </td>{" "}
                        <td className="text-center py-3 px-4 text-green-600 font-semibold">
                          {" "}
                          {metric.successfulExtractions}{" "}
                        </td>{" "}
                        <td className="text-center py-3 px-4">
                          {" "}
                          <div className="flex items-center justify-center">
                            {" "}
                            <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                              {" "}
                              <div
                                className="h-full bg-green-600 transition-all"
                                style={{
                                  width: `${metric.totalInvoicesProcessed > 0 ? ((metric.successfulExtractions / metric.totalInvoicesProcessed) * 100).toFixed(0) : 0}%`,
                                }}
                              />{" "}
                            </div>{" "}
                            <span className="ml-2">
                              {" "}
                              {metric.totalInvoicesProcessed > 0
                                ? (
                                    (metric.successfulExtractions /
                                      metric.totalInvoicesProcessed) *
                                    100
                                  ).toFixed(1)
                                : 0}{" "}
                              %{" "}
                            </span>{" "}
                          </div>{" "}
                        </td>{" "}
                        <td className="text-center py-3 px-4">
                          {" "}
                          <span
                            className={`font-semibold ${metric.averageConfidence >= 0.95 ? "text-green-600" : metric.averageConfidence >= 0.8 ? "text-yellow-600" : "text-orange-600"}`}
                          >
                            {" "}
                            {(metric.averageConfidence * 100).toFixed(1)}%{" "}
                          </span>{" "}
                        </td>{" "}
                        <td className="text-center py-3 px-4">
                          {" "}
                          {metric.averageProcessingTimeMs}{" "}
                        </td>{" "}
                        <td className="text-center py-3 px-4">
                          {" "}
                          <span
                            className={`font-semibold ${metric.avgFieldAccuracy >= 0.9 ? "text-green-600" : "text-yellow-600"}`}
                          >
                            {" "}
                            {(metric.avgFieldAccuracy * 100).toFixed(1)}%{" "}
                          </span>{" "}
                        </td>{" "}
                      </tr>
                    ))}{" "}
                  </tbody>{" "}
                </table>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>
        ) : (
          <Card>
            {" "}
            <CardContent className="py-12 text-center">
              {" "}
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />{" "}
              <h3 className="font-semibold mb-2">No Data Available</h3>{" "}
              <p className="text-sm text-muted-foreground">
                {" "}
                Start processing invoices to see metrics{" "}
              </p>{" "}
            </CardContent>{" "}
          </Card>
        )}{" "}
        {/* Tips and Information */}{" "}
        <Card className="bg-blue-50 border-blue-200">
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="text-base flex items-center gap-2">
              {" "}
              <AlertCircle className="h-5 w-5 text-primary" /> OCR Performance
              Tips{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent className="text-sm space-y-2">
            {" "}
            <p>
              {" "}
              • <strong>Confidence &gt; 95%:</strong> Excellent - Field can be
              auto-approved{" "}
            </p>{" "}
            <p>
              {" "}
              • <strong>Confidence 85-95%:</strong> Good - Minimal manual review
              recommended{" "}
            </p>{" "}
            <p>
              {" "}
              • <strong>Confidence 70-85%:</strong> Fair - Standard review
              recommended{" "}
            </p>{" "}
            <p>
              {" "}
              • <strong>Confidence &lt; 70%:</strong> Poor - Detailed manual
              review required{" "}
            </p>{" "}
            <p className="pt-2">
              {" "}
              Higher confidence scores and faster processing times indicate
              better OCR model accuracy and system performance. Monitor trends
              to identify optimization opportunities.{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </main>{" "}
    </AppLayout>
  );
}
