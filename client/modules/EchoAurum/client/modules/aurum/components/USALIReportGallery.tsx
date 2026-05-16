import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Grid, List } from "lucide-react";
import { RoomRevenueReport } from "./usali-reports/RoomRevenueReport";
import { FBRevenueReport } from "./usali-reports/FBRevenueReport";
import { LaborAnalysisReport } from "./usali-reports/LaborAnalysisReport";
import { DepartmentalPLReport } from "./usali-reports/DepartmentalPLReport";
import { OperatingExpensesReport } from "./usali-reports/OperatingExpensesReport";
import { CostOfSalesReport } from "./usali-reports/CostOfSalesReport";
import { GuestSummaryReport } from "./usali-reports/GuestSummaryReport";
import { DepartmentalProfitReport } from "./usali-reports/DepartmentalProfitReport";
import { BanquetProfitabilityReport } from "./usali-reports/BanquetProfitabilityReport";
import { CashPositionReport } from "./usali-reports/CashPositionReport";
interface USALIReportGalleryProps {
  entityId: string;
  periodDate: string;
}
const REPORTS = [
  {
    id: "room-revenue",
    name: "Room Revenue by Type",
    description:
      "Detailed breakdown of room revenue by room type, rate category, and occupancy metrics",
    category: "Revenue",
    component: RoomRevenueReport,
    icon: "🏨",
  },
  {
    id: "fb-revenue",
    name: "Food & Beverage Revenue",
    description:
      "Revenue breakdown by department and service type with cost analysis",
    category: "Revenue",
    component: FBRevenueReport,
    icon: "🍽️",
  },
  {
    id: "labor-analysis",
    name: "Labor Analysis by Department",
    description: "Labor cost tracking and productivity metrics by department",
    category: "Expense",
    component: LaborAnalysisReport,
    icon: "👥",
  },
  {
    id: "departmental-pl",
    name: "Departmental P&L",
    description: "Profit and loss statement by department with margin analysis",
    category: "Profitability",
    component: DepartmentalPLReport,
    icon: "📊",
  },
  {
    id: "operating-expenses",
    name: "Operating Expenses",
    description: "Detailed operating expense breakdown by category",
    category: "Expense",
    component: OperatingExpensesReport,
    icon: "💰",
  },
  {
    id: "cost-of-sales",
    name: "Cost of Sales Analysis",
    description:
      "Food, beverage, and goods cost tracking with variance analysis",
    category: "Expense",
    component: CostOfSalesReport,
    icon: "📦",
  },
  {
    id: "guest-summary",
    name: "Guest Summary",
    description: "Guest count and occupancy metrics with trend analysis",
    category: "Operations",
    component: GuestSummaryReport,
    icon: "🎫",
  },
  {
    id: "departmental-profit",
    name: "Departmental Profitability",
    description: "Contribution margin and profit by department",
    category: "Profitability",
    component: DepartmentalProfitReport,
    icon: "📈",
  },
  {
    id: "banquet-profitability",
    name: "Banquet & Event Profitability",
    description:
      "Banquet and special events revenue and profitability analysis",
    category: "Operations",
    component: BanquetProfitabilityReport,
    icon: "🎉",
  },
  {
    id: "cash-position",
    name: "Cash Position Report",
    description: "Daily cash flow and liquidity analysis with projections",
    category: "Operations",
    component: CashPositionReport,
    icon: "💵",
  },
];
export function USALIReportGallery({
  entityId,
  periodDate,
}: USALIReportGalleryProps) {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"gallery" | "selected">("gallery");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const selectedReport = REPORTS.find((r) => r.id === selectedReportId);
  const filteredReports =
    categoryFilter === "all"
      ? REPORTS
      : REPORTS.filter((r) => r.category === categoryFilter);
  const categories = ["all", ...new Set(REPORTS.map((r) => r.category))];
  return (
    <div className="space-y-6">
      {" "}
      {/* Header */}{" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h1 className="text-3xl font-bold">USALI Reports</h1>{" "}
          <p className="text-muted-foreground text-sm mt-1">
            {" "}
            Uniform System of Accounts for the Lodging Industry (USALI 11) - 10
            comprehensive hospitality reports{" "}
          </p>{" "}
        </div>{" "}
        <div className="flex gap-2">
          {" "}
          <Button
            variant={viewMode === "gallery" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("gallery")}
          >
            {" "}
            <Grid size={16} className="mr-1" /> Gallery{" "}
          </Button>{" "}
          {selectedReport && (
            <Button
              variant={viewMode === "selected" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("selected")}
            >
              {" "}
              <List size={16} className="mr-1" /> View Report{" "}
            </Button>
          )}{" "}
        </div>{" "}
      </div>{" "}
      {/* Gallery View */}{" "}
      {viewMode === "gallery" ? (
        <div className="space-y-6">
          {" "}
          {/* Category Filter */}{" "}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {" "}
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter(cat)}
              >
                {" "}
                {cat === "all" ? "All Reports" : cat}{" "}
              </Button>
            ))}{" "}
          </div>{" "}
          {/* Reports Grid */}{" "}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {" "}
            {filteredReports.map((report) => (
              <Card
                key={report.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  setSelectedReportId(report.id);
                  setViewMode("selected");
                }}
              >
                {" "}
                <CardHeader>
                  {" "}
                  <div className="flex items-start justify-between">
                    {" "}
                    <div>
                      {" "}
                      <div className="text-3xl mb-2">{report.icon}</div>{" "}
                      <CardTitle className="text-lg">
                        {report.name}
                      </CardTitle>{" "}
                    </div>{" "}
                    <span className="px-2 py-1 bg-surface text-foreground text-xs rounded font-semibold">
                      {" "}
                      {report.category}{" "}
                    </span>{" "}
                  </div>{" "}
                </CardHeader>{" "}
                <CardContent>
                  {" "}
                  <p className="text-sm text-muted-foreground mb-4">
                    {" "}
                    {report.description}{" "}
                  </p>{" "}
                  <Button variant="outline" size="sm" className="w-full">
                    {" "}
                    View Report{" "}
                  </Button>{" "}
                </CardContent>{" "}
              </Card>
            ))}{" "}
          </div>{" "}
        </div>
      ) : (
        /* Selected Report View */ <div className="space-y-4">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("gallery")}
            >
              {" "}
              ← Back to Gallery{" "}
            </Button>{" "}
            {selectedReport && (
              <div>
                {" "}
                <h2 className="text-lg font-semibold">
                  {" "}
                  {selectedReport.icon} {selectedReport.name}{" "}
                </h2>{" "}
              </div>
            )}{" "}
          </div>{" "}
          {selectedReport && (
            <div className="bg-background rounded-lg border p-6">
              {" "}
              <selectedReport.component
                entityId={entityId}
                periodDate={periodDate}
              />{" "}
            </div>
          )}{" "}
        </div>
      )}{" "}
      {/* Help Section */}{" "}
      {viewMode === "gallery" && (
        <Card className="bg-blue-50 border-blue-200">
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="text-blue-900">
              About USALI Reports
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent className="text-sm text-blue-800 space-y-2">
            {" "}
            <p>
              {" "}
              USALI is the standard accounting system for the hospitality
              industry, adopted by major hotel chains, independent properties,
              and restaurant groups worldwide.{" "}
            </p>{" "}
            <p>
              {" "}
              These 10 reports provide complete financial visibility into your
              operations, enabling data-driven decision making across revenue,
              expense, and profitability dimensions.{" "}
            </p>{" "}
            <p className="font-semibold">
              {" "}
              Each report automatically pulls data from your GL accounts and
              calculates industry-standard metrics.{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
    </div>
  );
}
