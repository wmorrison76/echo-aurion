import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useMultiOutlet } from "@/context/MultiOutletContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  X,
  Zap,
  Eye,
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { logger } from "@/lib/logger";
import type { StandardizedLineItem } from "@shared/api";
interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  vendor: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  confidenceScore: number;
  lineItemCount: number;
  issues: string[];
  createdAt: string;
  lineItems?: StandardizedLineItem[];
  imageUrl?: string;
  invoiceDate?: string;
  glCode?: string;
  department?: string;
} // Generate mock invoices for testing
const generateMockInvoices = () => {
  const vendors = ["US Foods", "Sysco", "Local Produce Co", "Restaurant Depot"];
  const invoices = [];
  for (let i = 1; i <= 60; i++) {
    const status =
      i % 10 === 0 ? "rejected" : i % 5 === 0 ? "approved" : "pending";
    invoices.push({
      id: `invoice-${i}`,
      invoiceNumber: `INV-${50000 + i}`,
      vendor: vendors[Math.floor(Math.random() * vendors.length)],
      amount: Math.floor(Math.random() * 5000) + 200,
      status,
      confidenceScore: Math.floor(Math.random() * 30) + 70,
      lineItemCount: Math.floor(Math.random() * 20) + 2,
      issues: Math.random() > 0.7 ? ["Missing vendor", "Low confidence"] : [],
      createdAt: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      imageUrl: "",
      invoiceDate: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      glCode: "6100",
      department: "F&B",
    });
  }
  return invoices;
};
const MOCK_INVOICES = generateMockInvoices();
const ITEMS_PER_PAGE = 20;
export default function Invoices() {
  const { user } = useAuth();
  const { currentOutlet } = useMultiOutlet();
  const [activeTab, setActiveTab] = useState("queue");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(
    null,
  );
  const [invoices, setInvoices] = useState<InvoiceItem[]>(MOCK_INVOICES);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [dragActive, setDragActive] = useState(false); // Keyboard shortcuts useEffect(() => { const handleKeyPress = (e: KeyboardEvent) => { if (e.ctrlKey || e.metaKey) { if (e.key ==="1") setActiveTab("queue"); if (e.key ==="2") setActiveTab("upload"); if (e.key ==="3") setActiveTab("review"); if (e.key ==="4") setActiveTab("gl"); if (e.key ==="5") setActiveTab("attachments"); } if (e.key ==="?") setShowKeyboardHelp(!showKeyboardHelp); if (e.key ==="Escape") setSelectedInvoice(null); if (selectedInvoice && e.key ==="a" && !e.ctrlKey) { if (selectedInvoice.status ==="pending") handleApproveInvoice(selectedInvoice.id); } if (selectedInvoice && e.key ==="r" && !e.ctrlKey) { if (selectedInvoice.status ==="pending") handleRejectInvoice(selectedInvoice.id); } }; window.addEventListener("keydown", handleKeyPress); return () => window.removeEventListener("keydown", handleKeyPress); }, [selectedInvoice, showKeyboardHelp, activeTab]); // Filter and search const filteredInvoices = useMemo(() => { return invoices.filter((inv) => { if (filterStatus !=="all" && inv.status !== filterStatus) return false; if (searchTerm && !inv.invoiceNumber.includes(searchTerm) && !inv.vendor.toLowerCase().includes(searchTerm.toLowerCase())) return false; return true; }); }, [invoices, filterStatus, searchTerm]); // Pagination const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE); const paginatedInvoices = useMemo(() => { const start = (currentPage - 1) * ITEMS_PER_PAGE; return filteredInvoices.slice(start, start + ITEMS_PER_PAGE); }, [filteredInvoices, currentPage]); // Metrics const metrics = useMemo(() => { return { pending: invoices.filter((i) => i.status ==="pending").length, approved: invoices.filter((i) => i.status ==="approved").length, rejected: invoices.filter((i) => i.status ==="rejected").length, total_amount: invoices.filter((i) => i.status ==="pending").reduce((sum, i) => sum + i.amount, 0), }; }, [invoices]); const handleApproveInvoice = (invoiceId: string) => { setInvoices((prev) => prev.map((inv) => inv.id === invoiceId ? { ...inv, status:"approved" as const } : inv ) ); setSelectedInvoice(null); }; const handleRejectInvoice = (invoiceId: string) => { setInvoices((prev) => prev.map((inv) => inv.id === invoiceId ? { ...inv, status:"rejected" as const } : inv ) ); setSelectedInvoice(null); }; const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragActive(true); }; const handleDragLeave = () => { setDragActive(false); }; const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragActive(false); console.log("Files dropped:", e.dataTransfer.files); }; return ( <AppLayout> <div className="space-y-4"> {/* Header */} <div className="flex items-center justify-between"> <div> <h1 className="text-2xl font-bold flex items-center gap-2"> <FileText className="h-6 w-6" /> Invoice Management </h1> <p className="text-xs text-slate-400 mt-1">Intake, review, GL mapping & approval</p> </div> <Button variant="ghost" size="sm" onClick={() => setShowKeyboardHelp(!showKeyboardHelp)} className="text-slate-400 hover:text-slate-200" > <HelpCircle className="h-4 w-4" /> </Button> </div> {/* Keyboard Help */} {showKeyboardHelp && ( <Alert className="border-slate-600 bg-slate-800/50"> <div className="flex items-start justify-between gap-4"> <div className="text-xs space-y-1"> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+1</kbd> Queue</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+2</kbd> Upload</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+3</kbd> Review</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+4</kbd> GL Integration</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+5</kbd> Attachments</div> </div> <div className="text-xs space-y-1"> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">A</kbd> Approve (modal open)</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">R</kbd> Reject (modal open)</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Esc</kbd> Close modal</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">?</kbd> Toggle help</div> </div> </div> </Alert> )} {/* Compact KPI Row */} <div className="grid gap-3 grid-cols-4"> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">Pending</div> <p className="text-2xl font-bold text-amber-400">{metrics.pending}</p> <p className="text-xs text-muted-foreground">${(metrics.total_amount / 1000).toFixed(1)}K</p> </CardContent> </Card> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">Approved</div> <p className="text-2xl font-bold text-green-400">{metrics.approved}</p> </CardContent> </Card> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">Rejected</div> <p className="text-2xl font-bold text-red-400">{metrics.rejected}</p> </CardContent> </Card> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">Total</div> <p className="text-2xl font-bold">{invoices.length}</p> </CardContent> </Card> </div> {/* Tabs */} <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3"> <TabsList className="bg-surface border-b border-border h-auto w-full justify-start rounded-none p-0"> <TabsTrigger value="queue" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"> <Clock className="h-4 w-4 mr-2" /> Queue ({metrics.pending}) </TabsTrigger> <TabsTrigger value="upload" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"> <Upload className="h-4 w-4 mr-2" /> Upload </TabsTrigger> <TabsTrigger value="review" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"> <Eye className="h-4 w-4 mr-2" /> Review </TabsTrigger> <TabsTrigger value="gl" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"> <Zap className="h-4 w-4 mr-2" /> GL Integration </TabsTrigger> <TabsTrigger value="attachments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"> <FileText className="h-4 w-4 mr-2" /> Attachments </TabsTrigger> </TabsList> {/* Queue Tab */} <TabsContent value="queue" className="space-y-3"> <div className="flex gap-2 items-center"> <Input placeholder="Search by invoice # or vendor..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="bg-slate-800 border-slate-600 h-8 text-sm" /> <div className="flex gap-1"> {["pending","approved","rejected","all"].map((status) => ( <Button key={status} variant={filterStatus === status ?"default" :"outline"} size="sm" onClick={() => { setFilterStatus(status); setCurrentPage(1); }} className="text-xs px-2 h-8" > {status.charAt(0).toUpperCase() + status.slice(1)} </Button> ))} </div> </div> <Card className="border-border bg-surface"> <CardContent className="p-0"> <div className="overflow-x-auto"> <Table> <TableHeader> <TableRow className="hover:bg-transparent border-border"> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Invoice #</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Vendor</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Amount</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Items</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Confidence</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Date</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Status</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Actions</TableHead> </TableRow> </TableHeader> <TableBody> {paginatedInvoices.map((invoice) => ( <TableRow key={invoice.id} className="hover:bg-slate-800/30 border-border h-8 cursor-pointer" onClick={() => setSelectedInvoice(invoice)} > <TableCell className="text-sm font-semibold text-blue-400 p-2">{invoice.invoiceNumber}</TableCell> <TableCell className="text-xs text-slate-200 p-2">{invoice.vendor}</TableCell> <TableCell className="text-sm font-medium text-slate-200 p-2">${invoice.amount.toFixed(0)}</TableCell> <TableCell className="text-xs text-slate-400 p-2">{invoice.lineItemCount}</TableCell> <TableCell className="text-xs p-2"> <Badge className={invoice.confidenceScore >= 80 ?"bg-green-500/20 text-green-400" :"bg-amber-500/20 text-amber-400"}> {invoice.confidenceScore}% </Badge> </TableCell> <TableCell className="text-xs text-slate-400 p-2"> {formatDistanceToNow(parseISO(invoice.createdAt), { addSuffix: false })} </TableCell> <TableCell className="p-2"> <Badge className={invoice.status ==="pending" ?"bg-amber-500/20 text-amber-400" : invoice.status ==="approved" ?"bg-green-500/20 text-green-400" :"bg-red-500/20 text-red-400"}> {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)} </Badge> </TableCell> <TableCell className="p-2" onClick={(e) => e.stopPropagation()}> {invoice.status ==="pending" && ( <div className="flex gap-1"> <Button size="sm" className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleApproveInvoice(invoice.id)}>✓</Button> <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-slate-600" onClick={() => handleRejectInvoice(invoice.id)}>✗</Button> </div> )} </TableCell> </TableRow> ))} </TableBody> </Table> </div> {/* Pagination */} <div className="flex items-center justify-between p-3 border-t border-border bg-surface"> <span className="text-xs text-slate-400"> {filteredInvoices.length === 0 ?"No results" : `${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredInvoices.length)} of ${filteredInvoices.length}`} </span> <div className="flex gap-2"> <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="h-7 px-2 text-xs border-slate-600"> <ChevronLeft className="h-3 w-3" /> </Button> <span className="text-xs text-slate-400 px-2">Page {currentPage} of {totalPages || 1}</span> <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="h-7 px-2 text-xs border-slate-600"> <ChevronRight className="h-3 w-3" /> </Button> </div> </div> </CardContent> </Card> </TabsContent> {/* Upload Tab */} <TabsContent value="upload"> <Card className="border-border bg-surface"> <CardContent className="p-6"> <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ?"border-primary bg-primary/5" :"border-slate-600 bg-surface"}`} > <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" /> <p className="text-sm text-slate-200 font-medium mb-1">Drag and drop invoices here</p> <p className="text-xs text-slate-400 mb-4">or</p> <Button className="bg-primary">Choose Files</Button> </div> <div className="mt-4 text-xs text-slate-400 space-y-1"> <p>✓ Supports PDF, JPG, PNG</p> <p>✓ Automatic OCR & vendor detection</p> <p>✓ Duplicate detection & merging</p> </div> </CardContent> </Card> </TabsContent> {/* Review Tab */} <TabsContent value="review"> <Card className="border-border bg-surface"> <CardContent className="p-6"> <p className="text-slate-400 text-sm">Select an invoice from the Queue tab to review line items, correct extraction errors, and validate against POs.</p> </CardContent> </Card> </TabsContent> {/* GL Integration Tab */} <TabsContent value="gl"> <Card className="border-border bg-surface"> <CardContent className="p-6"> <p className="text-slate-400 text-sm">Map invoice items to GL codes, review variances, and post to the general ledger.</p> </CardContent> </Card> </TabsContent> {/* Attachments Tab */} <TabsContent value="attachments"> <Card className="border-border bg-surface"> <CardContent className="p-6"> <p className="text-slate-400 text-sm">Browse and manage uploaded invoice images and supporting documents.</p> </CardContent> </Card> </TabsContent> </Tabs> {/* Detail Modal */} {selectedInvoice && ( <div className="fixed inset-0 bg-black/50 flex items-end z-50"> <div className="bg-surface border-t border-border w-full max-w-2xl ml-auto animate-in slide-in-from-right"> <div className="p-4 border-b border-border flex items-center justify-between"> <div> <h2 className="text-lg font-bold">{selectedInvoice.invoiceNumber}</h2> <p className="text-xs text-slate-400">{selectedInvoice.vendor} • {selectedInvoice.lineItemCount} items</p> </div> <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(null)} className="h-6 w-6 p-0"> <X className="h-4 w-4" /> </Button> </div> <div className="p-4 space-y-4 max-h-96 overflow-y-auto"> <div className="grid grid-cols-3 gap-4 text-sm"> <div> <p className="text-xs text-slate-400">Amount</p> <p className="text-lg font-bold">${selectedInvoice.amount.toFixed(2)}</p> </div> <div> <p className="text-xs text-slate-400">Confidence</p> <Badge className={selectedInvoice.confidenceScore >= 80 ?"bg-green-500/20 text-green-400" :"bg-amber-500/20 text-amber-400"}> {selectedInvoice.confidenceScore}% </Badge> </div> <div> <p className="text-xs text-slate-400">Date</p> <p className="text-sm">{format(parseISO(selectedInvoice.createdAt),"MMM d, yyyy")}</p> </div> </div> {selectedInvoice.issues.length > 0 && ( <Alert className="border-amber-200/30 bg-amber-500/5"> <AlertCircle className="h-4 w-4 text-amber-600" /> <AlertDescription className="text-amber-600 text-sm ml-2"> {selectedInvoice.issues.join(",")} </AlertDescription> </Alert> )} {selectedInvoice.status ==="pending" && ( <div className="space-y-2 pt-2 border-t border-border"> <p className="text-sm text-amber-600 font-medium">Awaiting approval</p> <div className="flex gap-2"> <Button className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-sm" onClick={() => handleApproveInvoice(selectedInvoice.id)} > <CheckCircle2 className="h-4 w-4 mr-2" /> Approve (A) </Button> <Button variant="outline" className="flex-1 border-slate-600 h-8 text-sm" onClick={() => handleRejectInvoice(selectedInvoice.id)} > <AlertCircle className="h-4 w-4 mr-2" /> Reject (R) </Button> </div> </div> )} {selectedInvoice.status ==="approved" && ( <Alert className="border-green-200/30 bg-green-500/5"> <CheckCircle2 className="h-4 w-4 text-green-600" /> <AlertDescription className="text-green-600 text-sm ml-2">Approved</AlertDescription> </Alert> )} {selectedInvoice.status ==="rejected" && ( <Alert className="border-red-200/30 bg-red-500/5"> <AlertCircle className="h-4 w-4 text-red-600" /> <AlertDescription className="text-red-600 text-sm ml-2">Rejected</AlertDescription> </Alert> )} </div> </div> </div> )} </div> </AppLayout> );
}
