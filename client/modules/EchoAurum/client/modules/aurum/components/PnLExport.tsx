/** * P&L Export Component * Professional export capabilities for P&L statements * * Features: * - PDF export (multi-page, formatted) * - Excel export (multiple sheets, formulas preserved) * - CSV export * - XBRL export (compliance filing) * - Custom header/footer * - Page numbering * - Signature lines * - Notes and disclaimers * - Email delivery * - Scheduled exports */ import React, {
  useState,
  useMemo,
} from "react";
import { DetailedPnL, ExportFormat } from "@/shared/types/pnlTypes";
import {
  usePropertyPnLExport,
  ExportUtils,
} from "../hooks/usePropertyPnLExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  Clock,
} from "lucide-react";
interface PnLExportProps {
  pnl: DetailedPnL;
  onExportComplete?: (format: ExportFormat) => void;
  showScheduling?: boolean;
  showEmail?: boolean;
}
const EXPORT_FORMATS: Array<{
  id: ExportFormat;
  name: string;
  description: string;
  icon: string;
  fileExtension: string;
}> = [
  {
    id: "pdf",
    name: "PDF",
    description: "Professional PDF with formatting and signatures",
    icon: "📄",
    fileExtension: "pdf",
  },
  {
    id: "excel",
    name: "Excel",
    description: "Multi-sheet Excel with formulas and charts",
    icon: "📊",
    fileExtension: "xlsx",
  },
  {
    id: "csv",
    name: "CSV",
    description: "Comma-separated values for spreadsheets",
    icon: "📋",
    fileExtension: "csv",
  },
  {
    id: "xbrl",
    name: "XBRL",
    description: "eXtensible Business Reporting Language",
    icon: "📑",
    fileExtension: "xbrl",
  },
  {
    id: "json",
    name: "JSON",
    description: "JSON format for data integration",
    icon: "{ }",
    fileExtension: "json",
  },
];
export function PnLExport({
  pnl,
  onExportComplete,
  showScheduling = false,
  showEmail = false,
}: PnLExportProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("pdf");
  const [includeVariance, setIncludeVariance] = useState(true);
  const [includeGLDetail, setIncludeGLDetail] = useState(false);
  const [includeComparison, setIncludeComparison] = useState(true);
  const [includeDepartmentBreakdown, setIncludeDepartmentBreakdown] =
    useState(true);
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [companyHeader, setCompanyHeader] = useState(true);
  const [signatureLine, setSignatureLine] = useState(false);
  const [notes, setNotes] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [activeTab, setActiveTab] = useState("options");
  const { exportPnL, exporting, progress, error, result, downloadResult } =
    usePropertyPnLExport(); // Quick export handlers for client-side formats const handleQuickExport = async () => { if (selectedFormat ==="json") { ExportUtils.downloadJSON(pnl); onExportComplete?.(selectedFormat); return; } if (selectedFormat ==="csv") { ExportUtils.downloadCSV(pnl); onExportComplete?.(selectedFormat); return; } // For server-side exports (PDF, Excel, XBRL) const result = await exportPnL(pnl, { format: selectedFormat, includeVariance, includeGLDetail, includeComparison, includeDepartmentBreakdown, includeMetrics, companyHeader, signatureLine, notes, }); if (result) { onExportComplete?.(selectedFormat); } }; const handlePrint = () => { ExportUtils.printPnL(pnl); }; const selectedFormatInfo = useMemo( () => EXPORT_FORMATS.find((f) => f.id === selectedFormat), [selectedFormat] ); return ( <div className="space-y-6"> <Tabs value={activeTab} onValueChange={setActiveTab}> <TabsList className="grid w-full grid-cols-3"> <TabsTrigger value="options">Options</TabsTrigger> <TabsTrigger value="preview">Preview</TabsTrigger> <TabsTrigger value="schedule">Schedule</TabsTrigger> </TabsList> {/* Options Tab */} <TabsContent value="options" className="space-y-6"> {/* Format Selection */} <Card> <CardHeader> <CardTitle>Select Export Format</CardTitle> </CardHeader> <CardContent> <div className="grid grid-cols-1 md:grid-cols-2 gap-3"> {EXPORT_FORMATS.map((format) => ( <div key={format.id} className={`p-4 border rounded-lg cursor-pointer transition-all ${ selectedFormat === format.id ?"border-blue-500 bg-blue-50" :"border-gray-200 hover:border-border" }`} onClick={() => setSelectedFormat(format.id)} > <div className="flex items-start gap-3"> <span className="text-2xl">{format.icon}</span> <div className="flex-1"> <p className="font-semibold">{format.name}</p> <p className="text-sm text-muted-foreground"> {format.description} </p> <p className="text-xs text-muted-foreground mt-1"> .{format.fileExtension} </p> </div> {selectedFormat === format.id && ( <CheckCircle2 className="w-5 h-5 text-primary" /> )} </div> </div> ))} </div> </CardContent> </Card> {/* Export Options */} <Card> <CardHeader> <CardTitle>Export Options</CardTitle> </CardHeader> <CardContent className="space-y-4"> <div className="space-y-3"> <label className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"> <input type="checkbox" checked={includeVariance} onChange={(e) => setIncludeVariance(e.target.checked)} className="w-4 h-4" /> <span className="text-sm">Include Variance Analysis</span> </label> <label className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"> <input type="checkbox" checked={includeComparison} onChange={(e) => setIncludeComparison(e.target.checked)} className="w-4 h-4" /> <span className="text-sm">Include Comparison (Budget & Prior)</span> </label> <label className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"> <input type="checkbox" checked={includeDepartmentBreakdown} onChange={(e) => setIncludeDepartmentBreakdown(e.target.checked) } className="w-4 h-4" /> <span className="text-sm">Include Department Breakdown</span> </label> <label className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"> <input type="checkbox" checked={includeMetrics} onChange={(e) => setIncludeMetrics(e.target.checked)} className="w-4 h-4" /> <span className="text-sm">Include KPI Metrics</span> </label> {["pdf","excel"].includes(selectedFormat) && ( <> <label className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"> <input type="checkbox" checked={includeGLDetail} onChange={(e) => setIncludeGLDetail(e.target.checked)} className="w-4 h-4" /> <span className="text-sm">Include GL Account Detail</span> </label> <label className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"> <input type="checkbox" checked={companyHeader} onChange={(e) => setCompanyHeader(e.target.checked)} className="w-4 h-4" /> <span className="text-sm">Include Company Header</span> </label> <label className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"> <input type="checkbox" checked={signatureLine} onChange={(e) => setSignatureLine(e.target.checked)} className="w-4 h-4" /> <span className="text-sm">Include Signature Lines</span> </label> </> )} </div> {["pdf","excel"].includes(selectedFormat) && ( <div className="mt-4 pt-4 border-t"> <label className="text-sm font-medium block mb-2"> Notes & Disclaimers </label> <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any notes or disclaimers to include in the export..." className="w-full p-2 border rounded text-sm h-20 resize-none" /> </div> )} </CardContent> </Card> {/* Action Buttons */} <div className="flex gap-2"> <Button onClick={handleQuickExport} disabled={exporting} className="flex-1" > {exporting ? ( <> <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exporting... {progress}% </> ) : ( <> <Download className="w-4 h-4 mr-2" /> Export Now </> )} </Button> <Button onClick={handlePrint} variant="outline"> Print </Button> {result && ( <Button onClick={downloadResult} variant="outline" className="text-green-600" > <CheckCircle2 className="w-4 h-4 mr-2" /> Download </Button> )} </div> {/* Status Messages */} {error && ( <div className="p-4 border border-red-200 bg-red-50 rounded-lg flex items-start gap-3"> <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" /> <div> <p className="font-medium text-red-900">Export Failed</p> <p className="text-sm text-red-700 mt-1">{error.message}</p> </div> </div> )} {result && !error && ( <div className="p-4 border border-green-200 bg-green-50 rounded-lg flex items-start gap-3"> <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" /> <div> <p className="font-medium text-green-900">Export Complete</p> <p className="text-sm text-green-700 mt-1"> File: {result.filename} </p> <p className="text-sm text-green-700"> Size: {(result.fileSize / 1024).toFixed(2)} KB </p> </div> </div> )} </TabsContent> {/* Preview Tab */} <TabsContent value="preview"> <Card> <CardHeader> <CardTitle>Export Preview</CardTitle> </CardHeader> <CardContent> <div className="space-y-4 max-h-96 overflow-y-auto"> <div> <h3 className="font-semibold mb-2">{pnl.propertyName}</h3> <p className="text-sm text-muted-foreground"> Period: {pnl.period.label} </p> </div> <div className="border-t pt-4"> <div className="flex justify-between py-2"> <span>Total Revenue</span> <span className="font-semibold"> ${(pnl.totalRevenue / 1000).toFixed(1)}K </span> </div> <div className="flex justify-between py-2"> <span>Cost of Sales</span> <span className="font-semibold"> ${(pnl.totalCogs / 1000).toFixed(1)}K </span> </div> <div className="flex justify-between py-2 text-primary font-semibold"> <span>Gross Profit</span> <span>${(pnl.grossProfit / 1000).toFixed(1)}K</span> </div> <div className="border-t mt-2 pt-2"> <div className="flex justify-between py-2"> <span>Operating Expense</span> <span className="font-semibold"> ${(pnl.totalOperatingExpense / 1000).toFixed(1)}K </span> </div> <div className="flex justify-between py-2 text-green-600 font-semibold"> <span>Operating Income</span> <span>${(pnl.operatingIncome / 1000).toFixed(1)}K</span> </div> </div> <div className="border-t mt-2 pt-2"> <div className="flex justify-between py-2 text-lg font-bold"> <span>Net Income</span> <span>${(pnl.netIncome / 1000).toFixed(1)}K</span> </div> </div> </div> {includeVariance && ( <div className="border-t pt-4"> <h4 className="font-semibold mb-2">Variance Analysis</h4> <p className="text-sm text-muted-foreground"> ✓ Budget variance included </p> <p className="text-sm text-muted-foreground"> ✓ Prior year comparison included </p> </div> )} {signatureLine && ( <div className="border-t pt-4"> <h4 className="font-semibold mb-4">Signature Lines</h4> <div className="space-y-8"> <div> <div className="border-t border-border w-32"></div> <p className="text-sm mt-1">Prepared By</p> </div> <div> <div className="border-t border-border w-32"></div> <p className="text-sm mt-1">Reviewed By</p> </div> </div> </div> )} </div> </CardContent> </Card> </TabsContent> {/* Schedule Tab */} {showScheduling && ( <TabsContent value="schedule"> <Card> <CardHeader> <CardTitle>Schedule Export</CardTitle> </CardHeader> <CardContent className="space-y-4"> <div> <label className="text-sm font-medium block mb-2"> Frequency </label> <select className="w-full border rounded p-2"> <option>One Time</option> <option>Weekly</option> <option>Monthly</option> <option>Quarterly</option> </select> </div> <div> <label className="text-sm font-medium block mb-2"> Schedule Date/Time </label> <input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full border rounded p-2" /> </div> {showEmail && ( <div> <label className="text-sm font-medium block mb-2"> Email Recipients </label> <input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="email@example.com" className="w-full border rounded p-2" /> </div> )} <Button className="w-full"> <Clock className="w-4 h-4 mr-2" /> Schedule Export </Button> </CardContent> </Card> </TabsContent> )} </Tabs> </div> );
}
