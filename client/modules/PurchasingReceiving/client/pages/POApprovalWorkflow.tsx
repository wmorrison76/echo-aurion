import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useMultiOutlet } from "@/context/MultiOutletContext";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  FileText,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ExternalLink,
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns"; // Mock approval data - generate 50 records for testing pagination
const generateMockApprovals = () => {
  const vendors = [
    "US Foods",
    "Sysco",
    "Local Produce Co",
    "Restaurant Depot",
    "Reinhart",
  ];
  const submitters = [
    "John Manager",
    "Sarah Chef",
    "Mike Kitchen",
    "Lisa Manager",
    "Tom Director",
  ];
  const approvals = [];
  for (let i = 1; i <= 50; i++) {
    const status =
      i % 8 === 0 ? "rejected" : i % 5 === 0 ? "approved" : "pending";
    approvals.push({
      id: `approval-${i}`,
      po_number: `PO-${24000 + i}`,
      vendor_name: vendors[Math.floor(Math.random() * vendors.length)],
      amount: Math.floor(Math.random() * 15000) + 500,
      submitted_by: submitters[Math.floor(Math.random() * submitters.length)],
      submitted_at: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      status,
      approval_level: Math.floor(Math.random() * 2) + 1,
      required_approver_role: Math.random() > 0.5 ? "manager" : "finance",
      items_count: Math.floor(Math.random() * 30) + 2,
      delivery_date: new Date(
        Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      approved_by: status === "approved" ? "John Manager" : undefined,
      approved_at:
        status === "approved"
          ? new Date(
              Date.now() - Math.random() * 24 * 60 * 60 * 1000,
            ).toISOString()
          : undefined,
      rejected_by: status === "rejected" ? "Sarah Finance" : undefined,
      rejected_at:
        status === "rejected"
          ? new Date(
              Date.now() - Math.random() * 24 * 60 * 60 * 1000,
            ).toISOString()
          : undefined,
      rejection_reason: status === "rejected" ? "Budget exceeded" : undefined,
    });
  }
  return approvals;
};
let MOCK_APPROVALS = generateMockApprovals();
const ITEMS_PER_PAGE = 25;
type SortColumn = "vendor" | "delivery" | "status" | null;
type SortDirection = "asc" | "desc";
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
      return <AlertCircle className="h-3 w-3" />;
  }
};
const SortHeader = ({
  column,
  label,
  currentSort,
  sortDirection,
  onSort,
}: {
  column: SortColumn;
  label: string;
  currentSort: SortColumn;
  sortDirection: SortDirection;
  onSort: (col: SortColumn) => void;
}) => {
  const isActive = currentSort === column;
  return (
    <button
      onClick={() => onSort(column)}
      className="flex items-center gap-1 hover:text-slate-100 transition-colors"
    >
      {" "}
      {label}{" "}
      {isActive ? (
        sortDirection === "asc" ? (
          <ArrowUp className="h-3 w-3 text-blue-400" />
        ) : (
          <ArrowDown className="h-3 w-3 text-blue-400" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      )}{" "}
    </button>
  );
};
export default function POApprovalWorkflow() {
  const { currentOutlet } = useMultiOutlet();
  const { user } = useAuth();
  const [approvals, setApprovals] = useState(MOCK_APPROVALS);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedApproval, setSelectedApproval] = useState<
    (typeof approvals)[0] | null
  >(null);
  const [viewingDocument, setViewingDocument] = useState<
    (typeof approvals)[0] | null
  >(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc"); // Sort handler const handleSort = (column: SortColumn) => { if (sortColumn === column) { setSortDirection(sortDirection ==="asc" ?"desc" :"asc"); } else { setSortColumn(column); setSortDirection("asc"); } }; // Filter and search const filteredApprovals = useMemo(() => { let filtered = approvals.filter((a) => { if (filterStatus !=="all" && a.status !== filterStatus) return false; if (searchTerm && !a.po_number.includes(searchTerm) && !a.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())) return false; return true; }); // Apply sorting if (sortColumn) { filtered = [...filtered].sort((a, b) => { let aVal: any =""; let bVal: any =""; if (sortColumn ==="vendor") { aVal = a.vendor_name; bVal = b.vendor_name; } else if (sortColumn ==="delivery") { aVal = new Date(a.delivery_date).getTime(); bVal = new Date(b.delivery_date).getTime(); } else if (sortColumn ==="status") { const statusOrder = { pending: 0, approved: 1, rejected: 2 }; aVal = statusOrder[a.status as keyof typeof statusOrder] ?? 3; bVal = statusOrder[b.status as keyof typeof statusOrder] ?? 3; } if (typeof aVal ==="string") { return sortDirection ==="asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal); } return sortDirection ==="asc" ? aVal - bVal : bVal - aVal; }); } return filtered; }, [approvals, filterStatus, searchTerm, sortColumn, sortDirection]); // Pagination const totalPages = Math.ceil(filteredApprovals.length / ITEMS_PER_PAGE); const paginatedApprovals = useMemo(() => { const start = (currentPage - 1) * ITEMS_PER_PAGE; return filteredApprovals.slice(start, start + ITEMS_PER_PAGE); }, [filteredApprovals, currentPage]); // Metrics const metrics = useMemo(() => { return { pending: approvals.filter((a) => a.status ==="pending").length, approved: approvals.filter((a) => a.status ==="approved").length, rejected: approvals.filter((a) => a.status ==="rejected").length, total_amount: approvals.filter((a) => a.status ==="pending").reduce( (sum, a) => sum + a.amount, 0, ), }; }, [approvals]); // Keyboard shortcuts useEffect(() => { const handleKeyPress = (e: KeyboardEvent) => { if (e.ctrlKey || e.metaKey) { if (e.key ==="1") setFilterStatus("pending"); if (e.key ==="2") setFilterStatus("approved"); if (e.key ==="3") setFilterStatus("rejected"); if (e.key ==="a") setFilterStatus("all"); } if (e.key ==="?") { setShowKeyboardHelp(!showKeyboardHelp); } if (e.key ==="Escape") { setSelectedApproval(null); } if (selectedApproval && e.key ==="a" && !e.ctrlKey && !e.metaKey) { if (selectedApproval.status ==="pending") { handleApprove(selectedApproval.id); } } if (selectedApproval && e.key ==="r" && !e.ctrlKey && !e.metaKey) { if (selectedApproval.status ==="pending") { handleReject(selectedApproval.id); } } }; window.addEventListener("keydown", handleKeyPress); return () => window.removeEventListener("keydown", handleKeyPress); }, [selectedApproval, showKeyboardHelp]); // Approve/Reject handlers const handleApprove = (approvalId: string) => { const now = new Date().toISOString(); const updatedApprovals = approvals.map((a) => a.id === approvalId ? { ...a, status:"approved", approved_by: user?.name ||"Current User", approved_at: now, } : a ); setApprovals(updatedApprovals); setSelectedApproval((current) => current && current.id === approvalId ? updatedApprovals.find((a) => a.id === approvalId) || current : current ); }; const handleReject = (approvalId: string) => { const now = new Date().toISOString(); const updatedApprovals = approvals.map((a) => a.id === approvalId ? { ...a, status:"rejected", rejected_by: user?.name ||"Current User", rejected_at: now, rejection_reason:"Rejected by approver", } : a ); setApprovals(updatedApprovals); setSelectedApproval((current) => current && current.id === approvalId ? updatedApprovals.find((a) => a.id === approvalId) || current : current ); }; return ( <AppLayout> <div className="space-y-4"> {/* Header */} <div className="flex items-center justify-between"> <div> <h1 className="text-2xl font-bold flex items-center gap-2"> <FileText className="h-6 w-6" /> PO Approvals </h1> <p className="text-xs text-slate-400 mt-1"> Manage and approve purchase orders </p> </div> <Button variant="ghost" size="sm" onClick={() => setShowKeyboardHelp(!showKeyboardHelp)} className="text-slate-400 hover:text-slate-200" > <HelpCircle className="h-4 w-4" /> </Button> </div> {/* Keyboard Help */} {showKeyboardHelp && ( <Alert className="border-slate-600 bg-slate-800/50"> <div className="flex items-start justify-between gap-4"> <div className="text-xs space-y-1"> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+1</kbd> Pending</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+2</kbd> Approved</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+3</kbd> Rejected</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+A</kbd> All</div> </div> <div className="text-xs space-y-1"> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">A</kbd> Approve (when modal open)</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">R</kbd> Reject (when modal open)</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Esc</kbd> Close modal</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">?</kbd> Toggle help</div> </div> </div> </Alert> )} {/* Compact KPI Row */} <div className="grid gap-3 grid-cols-4"> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">Pending</div> <p className="text-2xl font-bold text-amber-400">{metrics.pending}</p> <p className="text-xs text-muted-foreground">${(metrics.total_amount / 1000).toFixed(1)}K</p> </CardContent> </Card> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">Approved</div> <p className="text-2xl font-bold text-green-400">{metrics.approved}</p> </CardContent> </Card> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">Rejected</div> <p className="text-2xl font-bold text-red-400">{metrics.rejected}</p> </CardContent> </Card> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">Total</div> <p className="text-2xl font-bold">{approvals.length}</p> </CardContent> </Card> </div> {/* Search & Filters */} <div className="flex gap-2 items-center"> <Input placeholder="Search by PO # or vendor..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="bg-slate-800 border-slate-600 h-8 text-sm" /> <div className="flex gap-1"> {["pending","approved","rejected","all"].map((status) => ( <Button key={status} variant={filterStatus === status ?"default" :"outline"} size="sm" onClick={() => { setFilterStatus(status); setCurrentPage(1); }} className="text-xs px-2 h-8" > {status.charAt(0).toUpperCase() + status.slice(1)} </Button> ))} </div> </div> {/* Compact Table */} <Card className="border-border bg-surface"> <CardContent className="p-0"> {filteredApprovals.length === 0 ? ( <div className="text-center py-8 text-slate-400 text-sm"> No approvals matching your search </div> ) : ( <> <div className="flex flex-col max-h-96"> <Table className="border-collapse"> <TableHeader className="sticky top-0 bg-surface z-10 border-b-2 border-slate-600"> <TableRow className="hover:bg-transparent border-border"> <TableHead className="text-xs font-semibold text-slate-300 h-8">PO #</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8"> <SortHeader column="vendor" label="Vendor" currentSort={sortColumn} sortDirection={sortDirection} onSort={handleSort} /> </TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8">Amount</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8">Items</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8">Submitted</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8"> <SortHeader column="delivery" label="Delivery" currentSort={sortColumn} sortDirection={sortDirection} onSort={handleSort} /> </TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8"> <SortHeader column="status" label="Status" currentSort={sortColumn} sortDirection={sortDirection} onSort={handleSort} /> </TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8">Actions</TableHead> </TableRow> </TableHeader> </Table> <div className="overflow-y-auto flex-1"> <Table> <TableBody> {paginatedApprovals.map((approval) => ( <TableRow key={approval.id} className="hover:bg-slate-800/30 border-border h-8 cursor-pointer" onClick={() => setSelectedApproval(approval)} > <TableCell className="text-sm font-semibold text-blue-400 p-2">{approval.po_number}</TableCell> <TableCell className="text-xs text-slate-200 p-2">{approval.vendor_name}</TableCell> <TableCell className="text-sm font-medium text-slate-200 p-2">${approval.amount.toFixed(0)}</TableCell> <TableCell className="text-xs text-slate-400 p-2">{approval.items_count}</TableCell> <TableCell className="text-xs text-slate-400 p-2"> {formatDistanceToNow(parseISO(approval.submitted_at), { addSuffix: false })} </TableCell> <TableCell className="text-xs text-slate-400 p-2"> {format(parseISO(approval.delivery_date),"MMM d")} </TableCell> <TableCell className="p-2"> <Badge className={`${getStatusColor(approval.status)} text-xs`}> {getStatusIcon(approval.status)} <span className="ml-1">{approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}</span> </Badge> </TableCell> <TableCell className="p-2" onClick={(e) => e.stopPropagation()}> {approval.status ==="pending" && ( <div className="flex gap-1"> <Button size="sm" className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleApprove(approval.id)} title="A" > <ThumbsUp className="h-3 w-3" /> </Button> <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-slate-600" onClick={() => handleReject(approval.id)} title="R" > <ThumbsDown className="h-3 w-3" /> </Button> </div> )} </TableCell> </TableRow> ))} </TableBody> </Table> </div> </div> {/* Pagination */} <div className="flex items-center justify-between p-3 border-t border-border bg-surface"> <span className="text-xs text-slate-400"> {filteredApprovals.length === 0 ?"No results" : `${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min( currentPage * ITEMS_PER_PAGE, filteredApprovals.length, )} of ${filteredApprovals.length}`} </span> <div className="flex gap-2"> <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="h-7 px-2 text-xs border-slate-600" > <ChevronLeft className="h-3 w-3" /> </Button> <span className="text-xs text-slate-400 px-2 py-1"> Page {currentPage} of {totalPages} </span> <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="h-7 px-2 text-xs border-slate-600" > <ChevronRight className="h-3 w-3" /> </Button> </div> </div> </> )} </CardContent> </Card> {/* Detail Modal */} {selectedApproval && !viewingDocument && ( <div className="fixed inset-0 bg-black/50 flex items-end z-50"> <div className="bg-surface border-t border-border w-full max-w-2xl ml-auto animate-in slide-in-from-right"> <div className="p-4 border-b border-border flex items-center justify-between"> <div> <h2 className="text-lg font-bold">{selectedApproval.po_number}</h2> <p className="text-xs text-slate-400">{selectedApproval.vendor_name} • {selectedApproval.items_count} items</p> </div> <Button variant="ghost" size="sm" onClick={() => setSelectedApproval(null)} className="h-6 w-6 p-0" > <X className="h-4 w-4" /> </Button> </div> <div className="p-4 space-y-4 max-h-96 overflow-y-auto"> {/* Summary */} <div className="grid grid-cols-3 gap-4 text-sm"> <div> <p className="text-xs text-slate-400">Amount</p> <p className="text-lg font-bold">${selectedApproval.amount.toFixed(2)}</p> </div> <div> <p className="text-xs text-slate-400">Submitted</p> <p className="text-sm">{formatDistanceToNow(parseISO(selectedApproval.submitted_at), { addSuffix: true })}</p> </div> <div> <p className="text-xs text-slate-400">Delivery</p> <p className="text-sm">{format(parseISO(selectedApproval.delivery_date),"MMM d, yyyy")}</p> </div> </div> {/* View Document Link */} <div className="flex gap-2 pt-2 border-t border-border"> <Button variant="outline" size="sm" className="flex-1 border-primary text-blue-400 hover:bg-primary/10 h-8 text-sm" onClick={() => { setViewingDocument(selectedApproval); }} > <FileText className="h-3 w-3 mr-2" /> View Purchase Order </Button> </div> {/* Approval Actions */} {selectedApproval.status ==="pending" && ( <div className="space-y-2"> <p className="text-sm text-amber-600 font-medium">Awaiting approval</p> <div className="flex gap-2"> <Button className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-sm" onClick={() => { handleApprove(selectedApproval.id); setTimeout(() => setSelectedApproval(null), 500); }} > <ThumbsUp className="h-4 w-4 mr-2" /> Approve (A) </Button> <Button variant="outline" className="flex-1 border-slate-600 h-8 text-sm" onClick={() => { handleReject(selectedApproval.id); setTimeout(() => setSelectedApproval(null), 500); }} > <ThumbsDown className="h-4 w-4 mr-2" /> Reject (R) </Button> </div> </div> )} {selectedApproval.status ==="approved" && selectedApproval.approved_by && ( <Alert className="border-green-200/30 bg-green-500/5"> <CheckCircle2 className="h-4 w-4 text-green-600" /> <AlertDescription className="text-green-600 text-sm ml-2"> Approved by {selectedApproval.approved_by} {selectedApproval.approved_at && `on ${format(parseISO(selectedApproval.approved_at),"MMM d, yyyy")}`} </AlertDescription> </Alert> )} {selectedApproval.status ==="rejected" && selectedApproval.rejection_reason && ( <Alert className="border-red-200/30 bg-red-500/5"> <XCircle className="h-4 w-4 text-red-600" /> <AlertDescription className="text-red-600 text-sm ml-2"> Rejected: {selectedApproval.rejection_reason} </AlertDescription> </Alert> )} {/* Additional Info */} <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-border"> <div>Submitted by: {selectedApproval.submitted_by}</div> <div>Approval Level: {selectedApproval.approval_level} ({selectedApproval.required_approver_role})</div> </div> </div> </div> </div> )} {/* Document Viewing Modal - Popup with scrollable preview */} {viewingDocument && ( <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"> <div className="bg-surface border border-border rounded-lg w-full max-w-3xl max-h-90vh flex flex-col shadow-2xl"> {/* Modal Header */} <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-surface z-10"> <div> <h2 className="text-lg font-bold">{viewingDocument.po_number}</h2> <p className="text-xs text-slate-400">{viewingDocument.vendor_name}</p> </div> <Button variant="ghost" size="sm" onClick={() => setViewingDocument(null)} className="h-6 w-6 p-0" > <X className="h-4 w-4" /> </Button> </div> {/* Document Content - Scrollable */} <div className="flex-1 overflow-y-auto p-6 space-y-6"> {/* Invoice/PO Preview - Simulated */} <div className="bg-background text-foreground p-8 rounded border border-slate-200"> <div className="flex justify-between mb-6"> <div> <h3 className="text-2xl font-bold">PURCHASE ORDER</h3> <p className="text-sm text-muted-foreground">{viewingDocument.po_number}</p> </div> <div className="text-right"> <p className="text-sm font-semibold">Amount:</p> <p className="text-2xl font-bold text-green-600">${viewingDocument.amount.toFixed(2)}</p> </div> </div> <div className="grid grid-cols-2 gap-6 mb-8 pb-8 border-b border-slate-200"> <div> <p className="text-xs text-muted-foreground font-semibold">Vendor</p> <p className="text-sm font-medium">{viewingDocument.vendor_name}</p> </div> <div> <p className="text-xs text-muted-foreground font-semibold">Delivery Date</p> <p className="text-sm font-medium">{format(parseISO(viewingDocument.delivery_date),"MMMM d, yyyy")}</p> </div> <div> <p className="text-xs text-muted-foreground font-semibold">Submitted By</p> <p className="text-sm font-medium">{viewingDocument.submitted_by}</p> </div> <div> <p className="text-xs text-muted-foreground font-semibold">Submitted Date</p> <p className="text-sm font-medium">{format(parseISO(viewingDocument.submitted_at),"MMMM d, yyyy")}</p> </div> </div> {/* Line Items Table */} <div className="mb-8"> <h4 className="font-semibold text-sm mb-4">Line Items</h4> <table className="w-full text-sm border-collapse"> <thead> <tr className="border-b border-slate-300"> <th className="text-left py-2 text-xs font-semibold text-foreground">Item</th> <th className="text-center py-2 text-xs font-semibold text-foreground">Qty</th> <th className="text-right py-2 text-xs font-semibold text-foreground">Unit Price</th> <th className="text-right py-2 text-xs font-semibold text-foreground">Total</th> </tr> </thead> <tbody> {Array.from({ length: viewingDocument.items_count }).map((_, i) => { const itemTotal = Math.floor(Math.random() * 1000) + 50; const qty = Math.floor(Math.random() * 10) + 1; return ( <tr key={i} className="border-b border-slate-200"> <td className="py-2 text-foreground">Item {i + 1}</td> <td className="py-2 text-center text-foreground">{qty}</td> <td className="py-2 text-right text-foreground">${(itemTotal / qty).toFixed(2)}</td> <td className="py-2 text-right font-medium text-foreground">${itemTotal.toFixed(2)}</td> </tr> ); })} </tbody> </table> </div> <div className="flex justify-end pt-4 border-t border-slate-200"> <div className="text-right"> <p className="text-xs text-muted-foreground mb-2">Total Amount:</p> <p className="text-2xl font-bold text-foreground">${viewingDocument.amount.toFixed(2)}</p> </div> </div> </div> {/* Document Notes */} <div className="bg-slate-800/50 border border-border p-4 rounded"> <p className="text-xs text-slate-400 font-semibold mb-2">Notes</p> <p className="text-sm text-slate-300"> This purchase order is pending approval. Review all details carefully before approving or rejecting. </p> </div> </div> {/* Action Buttons - Sticky at bottom */} {viewingDocument.status ==="pending" && ( <div className="border-t border-border p-4 bg-surface flex gap-2 sticky bottom-0"> <Button className="flex-1 bg-green-600 hover:bg-green-700 h-10 text-sm" onClick={() => { handleApprove(viewingDocument.id); setTimeout(() => { setViewingDocument(null); setSelectedApproval(null); }, 500); }} > <ThumbsUp className="h-4 w-4 mr-2" /> Approve </Button> <Button variant="outline" className="flex-1 border-slate-600 h-10 text-sm" onClick={() => { handleReject(viewingDocument.id); setTimeout(() => { setViewingDocument(null); setSelectedApproval(null); }, 500); }} > <ThumbsDown className="h-4 w-4 mr-2" /> Reject </Button> </div> )} {viewingDocument.status ==="approved" && ( <div className="border-t border-border p-4 bg-green-600/10 flex items-center justify-center"> <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" /> <span className="text-green-600 font-medium">Approved by {viewingDocument.approved_by}</span> </div> )} {viewingDocument.status ==="rejected" && ( <div className="border-t border-border p-4 bg-red-600/10 flex items-center justify-center"> <XCircle className="h-5 w-5 text-red-600 mr-2" /> <span className="text-red-600 font-medium">Rejected: {viewingDocument.rejection_reason}</span> </div> )} </div> </div> )} </div> </AppLayout> );
}
