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
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  X,
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
interface ApprovalItem {
  id: string;
  documentType: "po" | "invoice" | "other";
  documentNumber: string;
  vendor: string;
  amount: number;
  submittedBy: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  approvalLevel: number;
  comments?: number;
  dueDate?: string;
} // Generate mock approvals
const generateMockApprovals = () => {
  const vendors = ["US Foods", "Sysco", "Local Produce Co"];
  const documentTypes: ("po" | "invoice" | "other")[] = ["po", "invoice"];
  const approvals = [];
  for (let i = 1; i <= 50; i++) {
    const docType =
      documentTypes[Math.floor(Math.random() * documentTypes.length)];
    const status =
      i % 8 === 0 ? "rejected" : i % 5 === 0 ? "approved" : "pending";
    approvals.push({
      id: `approval-${i}`,
      documentType: docType,
      documentNumber: docType === "po" ? `PO-${24000 + i}` : `INV-${50000 + i}`,
      vendor: vendors[Math.floor(Math.random() * vendors.length)],
      amount: Math.floor(Math.random() * 10000) + 500,
      submittedBy: ["John Manager", "Sarah Chef", "Mike Kitchen"][
        Math.floor(Math.random() * 3)
      ],
      submittedAt: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      status,
      approvalLevel: Math.floor(Math.random() * 2) + 1,
      comments:
        Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : undefined,
      dueDate:
        docType === "invoice"
          ? new Date(
              Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000,
            ).toISOString()
          : undefined,
    });
  }
  return approvals;
};
const MOCK_APPROVALS = generateMockApprovals();
const ITEMS_PER_PAGE = 20;
const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-amber-500/10 text-amber-700 border-amber-200/30";
    case "approved":
      return "bg-green-500/10 text-green-700 border-green-200/30";
    case "rejected":
      return "bg-red-500/10 text-red-700 border-red-200/30";
    default:
      return "bg-slate-500/10 text-foreground border-slate-200/30";
  }
};
const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return <Clock className="h-3 w-3" />;
    case "approved":
      return <CheckCircle2 className="h-3 w-3" />;
    case "rejected":
      return <XCircle className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
};
const getDocumentIcon = (docType: string) => {
  switch (docType) {
    case "po":
      return "🛒";
    case "invoice":
      return "📄";
    default:
      return "📋";
  }
};
export default function Approvals() {
  const { user } = useAuth();
  const { currentOutlet } = useMultiOutlet();
  const [activeTab, setActiveTab] = useState("all");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(
    null,
  );
  const [approvals, setApprovals] = useState<ApprovalItem[]>(MOCK_APPROVALS);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false); // Keyboard shortcuts useEffect(() => { const handleKeyPress = (e: KeyboardEvent) => { if (e.ctrlKey || e.metaKey) { if (e.key ==="1") setActiveTab("all"); if (e.key ==="2") setActiveTab("po"); if (e.key ==="3") setActiveTab("invoice"); } if (e.key ==="?") setShowKeyboardHelp(!showKeyboardHelp); if (e.key ==="Escape") setSelectedApproval(null); if (selectedApproval && e.key ==="a" && !e.ctrlKey) { if (selectedApproval.status ==="pending") handleApprove(selectedApproval.id); } if (selectedApproval && e.key ==="r" && !e.ctrlKey) { if (selectedApproval.status ==="pending") handleReject(selectedApproval.id); } }; window.addEventListener("keydown", handleKeyPress); return () => window.removeEventListener("keydown", handleKeyPress); }, [selectedApproval, showKeyboardHelp]); // Filter approvals const filteredApprovals = useMemo(() => { return approvals.filter((a) => { if (activeTab !=="all" && a.documentType !== activeTab) return false; if (filterStatus !=="all" && a.status !== filterStatus) return false; if (searchTerm && !a.documentNumber.includes(searchTerm) && !a.vendor.toLowerCase().includes(searchTerm.toLowerCase())) return false; return true; }); }, [approvals, activeTab, filterStatus, searchTerm]); // Pagination const totalPages = Math.ceil(filteredApprovals.length / ITEMS_PER_PAGE); const paginatedApprovals = useMemo(() => { const start = (currentPage - 1) * ITEMS_PER_PAGE; return filteredApprovals.slice(start, start + ITEMS_PER_PAGE); }, [filteredApprovals, currentPage]); // Metrics const metrics = useMemo(() => { return { pending: approvals.filter((a) => a.status ==="pending").length, po_pending: approvals.filter((a) => a.status ==="pending" && a.documentType ==="po").length, invoice_pending: approvals.filter((a) => a.status ==="pending" && a.documentType ==="invoice").length, total_pending_amount: approvals.filter((a) => a.status ==="pending").reduce((sum, a) => sum + a.amount, 0), }; }, [approvals]); const handleApprove = (approvalId: string) => { setApprovals((prev) => prev.map((a) => a.id === approvalId ? { ...a, status:"approved" as const } : a ) ); setSelectedApproval(null); }; const handleReject = (approvalId: string) => { setApprovals((prev) => prev.map((a) => a.id === approvalId ? { ...a, status:"rejected" as const } : a ) ); setSelectedApproval(null); }; return ( <AppLayout> <div className="space-y-4"> {/* Header */} <div className="flex items-center justify-between"> <div> <h1 className="text-2xl font-bold flex items-center gap-2"> <CheckCircle2 className="h-6 w-6" /> Unified Approvals </h1> <p className="text-xs text-slate-400 mt-1">POs, Invoices, and collaborative approvals</p> </div> <Button variant="ghost" size="sm" onClick={() => setShowKeyboardHelp(!showKeyboardHelp)} className="text-slate-400 hover:text-slate-200" > <HelpCircle className="h-4 w-4" /> </Button> </div> {/* Keyboard Help */} {showKeyboardHelp && ( <Alert className="border-slate-600 bg-slate-800/50"> <div className="flex items-start justify-between gap-4"> <div className="text-xs space-y-1"> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+1</kbd> All Approvals</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+2</kbd> PO Approvals</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+3</kbd> Invoice Approvals</div> </div> <div className="text-xs space-y-1"> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">A</kbd> Approve</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">R</kbd> Reject</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Esc</kbd> Close</div> </div> </div> </Alert> )} {/* Compact KPI Row */} <div className="grid gap-3 grid-cols-4"> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">Pending</div> <p className="text-2xl font-bold text-amber-400">{metrics.pending}</p> <p className="text-xs text-muted-foreground">${(metrics.total_pending_amount / 1000).toFixed(1)}K</p> </CardContent> </Card> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">PO Pending</div> <p className="text-2xl font-bold">{metrics.po_pending}</p> </CardContent> </Card> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">Invoice Pending</div> <p className="text-2xl font-bold">{metrics.invoice_pending}</p> </CardContent> </Card> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">Total</div> <p className="text-2xl font-bold">{approvals.length}</p> </CardContent> </Card> </div> {/* Tabs */} <Tabs value={activeTab} onValueChange={(tab) => { setActiveTab(tab); setCurrentPage(1); }} className="space-y-3"> <TabsList className="bg-surface border-b border-border h-auto w-full justify-start rounded-none p-0"> <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"> All Items ({metrics.pending}) </TabsTrigger> <TabsTrigger value="po" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"> POs ({metrics.po_pending}) </TabsTrigger> <TabsTrigger value="invoice" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"> Invoices ({metrics.invoice_pending}) </TabsTrigger> </TabsList> {/* All/PO/Invoice Tabs */} {["all","po","invoice"].map((tab) => ( <TabsContent key={tab} value={tab} className="space-y-3"> <div className="flex gap-2 items-center"> <Input placeholder="Search by document # or vendor..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="bg-slate-800 border-slate-600 h-8 text-sm" /> <div className="flex gap-1"> {["pending","approved","rejected","all"].map((status) => ( <Button key={status} variant={filterStatus === status ?"default" :"outline"} size="sm" onClick={() => { setFilterStatus(status); setCurrentPage(1); }} className="text-xs px-2 h-8" > {status.charAt(0).toUpperCase() + status.slice(1)} </Button> ))} </div> </div> <Card className="border-border bg-surface"> <CardContent className="p-0"> {filteredApprovals.length === 0 ? ( <div className="text-center py-8 text-slate-400 text-sm"> No approvals matching your criteria </div> ) : ( <> <div className="overflow-x-auto"> <Table> <TableHeader> <TableRow className="hover:bg-transparent border-border"> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Type</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Document #</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Vendor</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Amount</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Submitted</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Comments</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Status</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Actions</TableHead> </TableRow> </TableHeader> <TableBody> {paginatedApprovals.map((approval) => ( <TableRow key={approval.id} className="hover:bg-slate-800/30 border-border h-8 cursor-pointer" onClick={() => setSelectedApproval(approval)} > <TableCell className="text-sm p-2">{getDocumentIcon(approval.documentType)}</TableCell> <TableCell className="text-sm font-semibold text-blue-400 p-2">{approval.documentNumber}</TableCell> <TableCell className="text-xs text-slate-200 p-2">{approval.vendor}</TableCell> <TableCell className="text-sm font-medium text-slate-200 p-2">${approval.amount.toFixed(0)}</TableCell> <TableCell className="text-xs text-slate-400 p-2"> {formatDistanceToNow(parseISO(approval.submittedAt), { addSuffix: false })} </TableCell> <TableCell className="text-xs text-slate-400 p-2"> {approval.comments && ( <div className="flex items-center gap-1"> <MessageSquare className="h-3 w-3" /> {approval.comments} </div> )} </TableCell> <TableCell className="p-2"> <Badge className={getStatusColor(approval.status)}> {getStatusIcon(approval.status)} <span className="ml-1 text-xs">{approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}</span> </Badge> </TableCell> <TableCell className="p-2" onClick={(e) => e.stopPropagation()}> {approval.status ==="pending" && ( <div className="flex gap-1"> <Button size="sm" className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleApprove(approval.id)} title="A" > <ThumbsUp className="h-3 w-3" /> </Button> <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-slate-600" onClick={() => handleReject(approval.id)} title="R" > <ThumbsDown className="h-3 w-3" /> </Button> </div> )} </TableCell> </TableRow> ))} </TableBody> </Table> </div> {/* Pagination */} <div className="flex items-center justify-between p-3 border-t border-border bg-surface"> <span className="text-xs text-slate-400"> {filteredApprovals.length === 0 ?"No results" : `${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min( currentPage * ITEMS_PER_PAGE, filteredApprovals.length, )} of ${filteredApprovals.length}`} </span> <div className="flex gap-2"> <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="h-7 px-2 text-xs border-slate-600" > <ChevronLeft className="h-3 w-3" /> </Button> <span className="text-xs text-slate-400 px-2"> Page {currentPage} of {totalPages || 1} </span> <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="h-7 px-2 text-xs border-slate-600" > <ChevronRight className="h-3 w-3" /> </Button> </div> </div> </> )} </CardContent> </Card> </TabsContent> ))} </Tabs> {/* Detail Modal */} {selectedApproval && ( <div className="fixed inset-0 bg-black/50 flex items-end z-50"> <div className="bg-surface border-t border-border w-full max-w-2xl ml-auto animate-in slide-in-from-right"> <div className="p-4 border-b border-border flex items-center justify-between"> <div> <h2 className="text-lg font-bold">{selectedApproval.documentNumber}</h2> <p className="text-xs text-slate-400">{selectedApproval.vendor}</p> </div> <Button variant="ghost" size="sm" onClick={() => setSelectedApproval(null)} className="h-6 w-6 p-0"> <X className="h-4 w-4" /> </Button> </div> <div className="p-4 space-y-4 max-h-96 overflow-y-auto"> <div className="grid grid-cols-3 gap-4 text-sm"> <div> <p className="text-xs text-slate-400">Amount</p> <p className="text-lg font-bold">${selectedApproval.amount.toFixed(2)}</p> </div> <div> <p className="text-xs text-slate-400">Submitted</p> <p className="text-sm">{formatDistanceToNow(parseISO(selectedApproval.submittedAt), { addSuffix: true })}</p> </div> <div> <p className="text-xs text-slate-400">Type</p> <p className="text-sm capitalize">{selectedApproval.documentType}</p> </div> </div> {selectedApproval.status ==="pending" && ( <div className="space-y-2"> <p className="text-sm text-amber-600 font-medium">Awaiting approval</p> <div className="flex gap-2"> <Button className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-sm" onClick={() => handleApprove(selectedApproval.id)} > <ThumbsUp className="h-4 w-4 mr-2" /> Approve (A) </Button> <Button variant="outline" className="flex-1 border-slate-600 h-8 text-sm" onClick={() => handleReject(selectedApproval.id)} > <ThumbsDown className="h-4 w-4 mr-2" /> Reject (R) </Button> </div> </div> )} {selectedApproval.status ==="approved" && ( <Alert className="border-green-200/30 bg-green-500/5"> <CheckCircle2 className="h-4 w-4 text-green-600" /> <AlertDescription className="text-green-600 text-sm ml-2">Approved</AlertDescription> </Alert> )} {selectedApproval.status ==="rejected" && ( <Alert className="border-red-200/30 bg-red-500/5"> <XCircle className="h-4 w-4 text-red-600" /> <AlertDescription className="text-red-600 text-sm ml-2">Rejected</AlertDescription> </Alert> )} <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-border"> <div>Submitted by: {selectedApproval.submittedBy}</div> <div>Approval Level: {selectedApproval.approvalLevel}</div> {selectedApproval.comments && <div>{selectedApproval.comments} comments</div>} </div> </div> </div> </div> )} </div> </AppLayout> );
}
