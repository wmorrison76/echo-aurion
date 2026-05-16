import React, { useMemo, useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PageLayout } from "../components/layout/PageLayout";
import { SessionRequiredNotice } from "../modules/auth";
import { useSession } from "../modules/auth/hooks/useSession";
import {
  FinancialReportsDashboard,
  ReportExport,
  VarianceInsightsPanel,
  DetailedPropertyPnL,
  PnLVarianceAnalysis,
  PnLComparison,
  PnLTransactionDetail,
  PnLExport,
  PnLAdvancedFeatures,
} from "../modules/aurum/components";
import { VarianceInsightsPanel as VarianceInsights } from "../modules/insights/components";
import { usePropertyPnL } from "../modules/aurum/hooks";
export default function Reports() {
  const { session } = useSession();
  const [selectedPropertyId] = useState("property-001");
  const [pnlViewMode, setPnlViewMode] = useState<
    "overview" | "variance" | "comparison" | "detail" | "export"
  >("overview"); // Fetch P&L data const { pnl, comparison, loading, error } = usePropertyPnL({ propertyId: selectedPropertyId, includeComparison: true, }); // Mock data for demo purposes - replace with real data in production const mockPnlData = useMemo(() => ({ id:"pnl-001", propertyId: selectedPropertyId, propertyName:"Sample Property", period: { type:"monthly" as const, startDate:"2024-01-01", endDate:"2024-01-31", fiscalYear: 2024, fiscalPeriod: 1, label:"January 2024", }, generatedAt: new Date().toISOString(), lastUpdated: new Date().toISOString(), totalRevenue: 500000, totalCogs: 150000, grossProfit: 350000, grossMarginPercent: 70, totalOperatingExpense: 200000, operatingIncome: 150000, operatingMarginPercent: 30, netIncome: 120000, ebitda: 170000, sections: [ { id:"revenue", sectionNumber: 100, title:"Revenue", type:"revenue" as const, isExpanded: true, lineItems: [ { id:"room-revenue", lineNumber: 110, code:"4100", name:"Room Revenue", description:"Guest room revenue", type:"revenue" as const, glAccounts: ["4100"], isCalculated: false, isExpanded: false, precedence: 100, metrics: [], variance: { budgetAmount: 300000, priorYearAmount: 280000, variance: 20000, variancePercent: 7.1 }, }, { id:"food-beverage", lineNumber: 120, code:"4200", name:"Food & Beverage", description:"Restaurant and bar revenue", type:"revenue" as const, glAccounts: ["4200"], isCalculated: false, isExpanded: false, precedence: 110, metrics: [], variance: { budgetAmount: 200000, priorYearAmount: 190000, variance: 10000, variancePercent: 5.3 }, }, ], subtotal: 500000, subtotalPercent: 100, }, { id:"expense", sectionNumber: 200, title:"Operating Expenses", type:"operating-expense" as const, isExpanded: true, lineItems: [ { id:"labor", lineNumber: 210, code:"5100", name:"Labor Cost", description:"Salaries and wages", type:"operating-expense" as const, glAccounts: ["5100"], isCalculated: false, isExpanded: false, precedence: 200, metrics: [], variance: { budgetAmount: 150000, priorYearAmount: 145000, variance: 5000, variancePercent: 3.4 }, }, ], subtotal: 200000, subtotalPercent: 40, }, ], canDrillDown: true, }), [selectedPropertyId]); if (!session) { return ( <PageLayout> <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10"> <SessionRequiredNotice description="Authenticate to access reports." /> </div> </PageLayout> ); } return ( <PageLayout> <div className="mx-auto max-w-7xl overflow-hidden px-6 py-8 sm:px-10"> <div className="space-y-8 ml-5 pl-5"> {/* Page Header */} <div className="space-y-2"> <h1 className="text-3xl font-bold text-foreground"> Financial Reports </h1> <p className="text-muted-foreground"> Generate financial statements, variance analysis, P&L reports, and export </p> </div> {/* P&L Reports - NEW */} <Section title="P&L Reports" description="Enterprise-grade Profit & Loss statements with complete detail and transparency" > <Tabs value={pnlViewMode} onValueChange={(v) => setPnlViewMode(v as any)}> <TabsList className="grid w-full grid-cols-6"> <TabsTrigger value="overview">Overview</TabsTrigger> <TabsTrigger value="variance">Variance</TabsTrigger> <TabsTrigger value="comparison">Comparison</TabsTrigger> <TabsTrigger value="detail">Detail</TabsTrigger> <TabsTrigger value="export">Export</TabsTrigger> <TabsTrigger value="advanced">Advanced</TabsTrigger> </TabsList> {/* Overview Tab */} <TabsContent value="overview" className="mt-6"> {loading ? ( <div className="text-center py-8">Loading P&L data...</div> ) : error ? ( <div className="text-center py-8 text-red-600">{error.message}</div> ) : ( <DetailedPropertyPnL pnlData={pnl || mockPnlData} initialViewMode="full-page" showComparison={true} showVarianceAnalysis={true} /> )} </TabsContent> {/* Variance Tab */} <TabsContent value="variance" className="mt-6"> <PnLVarianceAnalysis current={pnl || mockPnlData} budget={undefined} priorYear={undefined} showDepartmentBreakdown={true} /> </TabsContent> {/* Comparison Tab */} <TabsContent value="comparison" className="mt-6"> {comparison ? ( <PnLComparison comparison={comparison} metric="revenue" showMetrics={true} showTrends={true} showRanking={true} /> ) : ( <div className="text-center py-8 text-muted-foreground"> No comparison data available </div> )} </TabsContent> {/* Detail Tab */} <TabsContent value="detail" className="mt-6"> {pnl && pnl.sections && pnl.sections.length > 0 ? ( <div className="text-center py-8 text-muted-foreground"> <p>Detailed GL account information available through drill-down</p> </div> ) : ( <div className="text-center py-8 text-muted-foreground"> No detail data available </div> )} </TabsContent> {/* Export Tab */} <TabsContent value="export" className="mt-6"> <PnLExport pnl={pnl || mockPnlData} showScheduling={true} showEmail={true} /> </TabsContent> {/* Advanced Features Tab */} <TabsContent value="advanced" className="mt-6"> <PnLAdvancedFeatures pnl={pnl || mockPnlData} propertyId={selectedPropertyId} period={mockPnlData.period} /> </TabsContent> </Tabs> </Section> {/* Financial Statements */} <Section title="Financial Statements" description="Trial Balance, Income Statement, Balance Sheet" > <FinancialReportsDashboard /> </Section> {/* Variance Analysis */} <Section title="Variance Analysis" description="Analyze budget vs. actual vs. forecast" > <VarianceInsights /> </Section> {/* Export Reports */} <Section title="Export Reports" description="Download reports in multiple formats" > <ReportExport /> </Section> </div> </div> </PageLayout> );
}
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      {" "}
      <div>
        {" "}
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>{" "}
        <p className="text-sm text-muted-foreground mt-1">{description}</p>{" "}
      </div>{" "}
      <div className="rounded-lg border border-border/40 bg-surface/60 p-6 shadow-sm">
        {" "}
        {children}{" "}
      </div>{" "}
    </div>
  );
}
