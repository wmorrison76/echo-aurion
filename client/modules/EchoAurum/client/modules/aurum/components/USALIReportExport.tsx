import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, Loader } from "lucide-react";
import { fetchWithLucccaSession } from "../../auth";
interface ExportOption {
  format: "pdf" | "excel" | "csv";
  label: string;
  description: string;
  mimeType: string;
}
interface USALIReportExportProps {
  entityId: string;
  periodDate: string;
  reportType: string;
  reportName: string;
}
const EXPORT_OPTIONS: ExportOption[] = [
  {
    format: "pdf",
    label: "PDF",
    description: "Professional PDF document suitable for printing and sharing",
    mimeType: "application/pdf",
  },
  {
    format: "excel",
    label: "Excel",
    description: "Excel workbook with multiple sheets for analysis",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  {
    format: "csv",
    label: "CSV",
    description: "CSV format for data import and analysis",
    mimeType: "text/csv",
  },
];
export function USALIReportExport({
  entityId,
  periodDate,
  reportType,
  reportName,
}: USALIReportExportProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const handleExport = async (format: "pdf" | "excel" | "csv") => {
    setExporting(format);
    setError(null);
    setSuccess(null);
    try {
      const params = new URLSearchParams({ entityId, periodDate, format });
      const response = await fetchWithLucccaSession(
        `/api/aurum/reports/usali/${reportType}/export?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error(`Export failed with status ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().split("T")[0];
      const extension = format === "excel" ? "xlsx" : format;
      a.download = `${reportName.replace(/\s+/g, "-")}-${timestamp}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccess(`Report exported successfully as ${format.toUpperCase()}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unknown error during export",
      );
    } finally {
      setExporting(null);
    }
  };
  return (
    <Card>
      {" "}
      <CardHeader>
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div>
            {" "}
            <CardTitle>Export Report</CardTitle>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              {reportName} • Period: {periodDate}{" "}
            </p>{" "}
          </div>{" "}
          <Badge variant="secondary">Export</Badge>{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-4">
        {" "}
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
            {" "}
            {error}{" "}
          </div>
        )}{" "}
        {success && (
          <div className="bg-green-100 text-green-800 px-4 py-3 rounded-lg text-sm">
            {" "}
            {success}{" "}
          </div>
        )}{" "}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {" "}
          {EXPORT_OPTIONS.map((option) => (
            <Button
              key={option.format}
              variant="outline"
              className="h-auto flex flex-col items-start p-4 justify-start"
              onClick={() => handleExport(option.format)}
              disabled={exporting !== null}
            >
              {" "}
              <div className="flex items-center gap-2 mb-2">
                {" "}
                {exporting === option.format ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}{" "}
                <span className="font-semibold">{option.label}</span>{" "}
              </div>{" "}
              <span className="text-xs text-muted-foreground text-left">
                {" "}
                {option.description}{" "}
              </span>{" "}
            </Button>
          ))}{" "}
        </div>{" "}
        <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
          {" "}
          <p className="font-medium">Export Information</p>{" "}
          <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
            {" "}
            <li>
              All reports include full account details and calculations
            </li>{" "}
            <li>Excel exports contain multiple sheets for detailed analysis</li>{" "}
            <li>
              {" "}
              PDF exports are optimized for printing and professional
              sharing{" "}
            </li>{" "}
            <li>CSV exports are compatible with most business tools</li>{" "}
            <li>
              {" "}
              All exports include the report period and entity information{" "}
            </li>{" "}
          </ul>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
