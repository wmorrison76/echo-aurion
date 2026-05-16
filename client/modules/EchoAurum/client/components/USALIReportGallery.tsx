import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Calendar, Filter } from "lucide-react";
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
  periodDate?: string;
}
type ReportId =
  | "room-revenue"
  | "fb-revenue"
  | "labor-analysis"
  | "departmental-pl"
  | "operating-expenses"
  | "cost-of-sales"
  | "guest-summary"
  | "departmental-profit"
  | "banquet-profitability"
  | "cash-position";
interface ReportConfig {
  id: ReportId;
  name: string;
  description: string;
  category: string;
  component: React.ComponentType<{ entityId: string; periodDate: string }>;
  icon: string;
}
const REPORTS: ReportConfig[] = [
  {
    id: "room-revenue",
    name: "Room Revenue by Type",
    description:
      "Revenue breakdown by room type with ADR and occupancy metrics",
    category: "Revenue",
    component: RoomRevenueReport,
    icon: "🏨",
  },
  {
    id: "fb-revenue",
    name: "Food & Beverage Revenue",
    description: "F&B revenue analysis by department with transaction metrics",
    category: "Revenue",
    component: FBRevenueReport,
    icon: "🍽️",
  },
  {
    id: "labor-analysis",
    name: "Labor Analysis",
    description: "Labor cost and efficiency metrics by department",
    category: "Costs",
    component: LaborAnalysisReport,
    icon: "👥",
  },
  {
    id: "departmental-pl",
    name: "Departmental P&L",
    description: "Complete profit and loss statement by department",
    category: "Reports",
    component: DepartmentalPLReport,
    icon: "📊",
  },
  {
    id: "operating-expenses",
    name: "Operating Expenses",
    description:
      "Operating expenses breakdown by category with budget comparison",
    category: "Costs",
    component: OperatingExpensesReport,
    icon: "💰",
  },
  {
    id: "cost-of-sales",
    name: "Cost of Sales Analysis",
    description: "COGS analysis and margin reporting",
    category: "Costs",
    component: CostOfSalesReport,
    icon: "📉",
  },
  {
    id: "guest-summary",
    name: "Guest Summary",
    description: "Guest metrics including repeat rates and revenue per guest",
    category: "Analytics",
    component: GuestSummaryReport,
    icon: "🎯",
  },
  {
    id: "departmental-profit",
    name: "Departmental Profitability",
    description: "Profit margins and performance by department",
    category: "Reports",
    component: DepartmentalProfitReport,
    icon: "📈",
  },
  {
    id: "banquet-profitability",
    name: "Banquet & Event Profitability",
    description: "Event revenue and profit analysis with guest metrics",
    category: "Analytics",
    component: BanquetProfitabilityReport,
    icon: "🎉",
  },
  {
    id: "cash-position",
    name: "Cash Position & Forecast",
    description: "Cash flow statement and position forecasting",
    category: "Finance",
    component: CashPositionReport,
    icon: "💵",
  },
];
const CATEGORIES = ["Revenue", "Costs", "Reports", "Analytics", "Finance"];
export function USALIReportGallery({
  entityId,
  periodDate = getDefaultPeriod(),
}: USALIReportGalleryProps) {
  const [selectedReportId, setSelectedReportId] = useState<ReportId | null>(
    null,
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(periodDate);
  const filteredReports = selectedCategory
    ? REPORTS.filter((r) => r.category === selectedCategory)
    : REPORTS;
  const selectedReport = selectedReportId
    ? REPORTS.find((r) => r.id === selectedReportId)
    : null;
  if (selectedReport && selectedReportId) {
    const ReportComponent = selectedReport.component;
    return (
      <div className="space-y-6">
        {" "}
        {/* Header */}{" "}
        <div className="flex items-center justify-between">
          {" "}
          <div>
            {" "}
            <button
              onClick={() => setSelectedReportId(null)}
              className="text-sm text-aurum-600 hover:text-aurum-700 mb-2 flex items-center gap-1"
            >
              {" "}
              ← Back to Gallery{" "}
            </button>{" "}
            <h1 className="text-3xl font-bold">
              {" "}
              {selectedReport.icon} {selectedReport.name}{" "}
            </h1>{" "}
            <p className="text-muted-foreground mt-1">
              {" "}
              {selectedReport.description}{" "}
            </p>{" "}
          </div>{" "}
          <div className="flex items-center gap-2">
            {" "}
            <Calendar className="h-5 w-5 text-muted-foreground" />{" "}
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg"
            />{" "}
          </div>{" "}
        </div>{" "}
        {/* Report Component */}{" "}
        <ReportComponent entityId={entityId} periodDate={selectedPeriod} />{" "}
      </div>
    );
  }
  return (
    <div className="space-y-8">
      {" "}
      {/* Header */}{" "}
      <div>
        {" "}
        <h1 className="text-4xl font-bold mb-2">USALI Reports</h1>{" "}
        <p className="text-lg text-muted-foreground">
          {" "}
          Hospitality Standard Uniform System of Accounts for the Lodging
          Industry Reports{" "}
        </p>{" "}
      </div>{" "}
      {/* Period Selector */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="flex items-center gap-2">
            {" "}
            <Calendar className="h-5 w-5" /> Report Period{" "}
          </CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg text-lg"
          />{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Category Filter */}{" "}
      <div className="space-y-4">
        {" "}
        <h2 className="text-xl font-semibold flex items-center gap-2">
          {" "}
          <Filter className="h-5 w-5" /> Filter by Category{" "}
        </h2>{" "}
        <div className="flex flex-wrap gap-2">
          {" "}
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === null ? "bg-aurum-500 text-white" : "bg-muted text-foreground hover:bg-muted/80"}`}
          >
            {" "}
            All Reports ({REPORTS.length}){" "}
          </button>{" "}
          {CATEGORIES.map((cat) => {
            const count = REPORTS.filter((r) => r.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === cat ? "bg-aurum-500 text-white" : "bg-muted text-foreground hover:bg-muted/80"}`}
              >
                {" "}
                {cat} ({count}){" "}
              </button>
            );
          })}{" "}
        </div>{" "}
      </div>{" "}
      {/* Reports Grid */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {" "}
        {filteredReports.map((report) => (
          <button
            key={report.id}
            onClick={() => setSelectedReportId(report.id)}
            className="text-left"
          >
            {" "}
            <Card className="h-full hover:border-aurum-500 hover:shadow-lg transition-all cursor-pointer">
              {" "}
              <CardHeader>
                {" "}
                <div className="flex items-start justify-between mb-2">
                  {" "}
                  <span className="text-3xl">{report.icon}</span>{" "}
                  <Badge variant="secondary">{report.category}</Badge>{" "}
                </div>{" "}
                <CardTitle className="line-clamp-2">
                  {report.name}
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {" "}
                  {report.description}{" "}
                </p>{" "}
                <div className="flex items-center gap-2 text-aurum-600 font-semibold">
                  {" "}
                  View Report <ChevronRight className="h-4 w-4" />{" "}
                </div>{" "}
              </CardContent>{" "}
            </Card>{" "}
          </button>
        ))}{" "}
      </div>{" "}
      {/* Info Section */}{" "}
      <Card className="bg-aurum-50/50 border-aurum-200">
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>About USALI Reports</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-3 text-sm">
          {" "}
          <p>
            {" "}
            The Uniform System of Accounts for the Lodging Industry (USALI) is
            the industry-standard chart of accounts and reporting framework for
            hotel operations.{" "}
          </p>{" "}
          <p>
            {" "}
            These reports provide hospitality-specific financial analysis
            including:{" "}
          </p>{" "}
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {" "}
            <li>Revenue metrics (ADR, RevPAR, occupancy)</li>{" "}
            <li>Departmental profitability analysis</li>{" "}
            <li>Labor and operational cost tracking</li>{" "}
            <li>Guest and event analytics</li>{" "}
            <li>Cash flow and financial forecasting</li>{" "}
          </ul>{" "}
          <p className="font-semibold text-foreground mt-4">
            {" "}
            All reports are automatically generated from your GL data and
            updated in real-time.{" "}
          </p>{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
}
function getDefaultPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
