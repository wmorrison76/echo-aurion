import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Search, Zap, AlertCircle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Invoice } from "@shared/types/invoices";
interface ApprovalQueueItem {
  id: string;
  invoiceNumber: string;
  vendor: string;
  total: number;
  status: "pending" | "approved" | "rejected";
  confidenceScore: number; // 0-100 lineItemCount: number; issues: string[]; createdAt: string;
}
interface ApprovalQueueProps {
  items: ApprovalQueueItem[];
  onSelectInvoice: (item: ApprovalQueueItem) => void;
  onBulkApprove?: (items: ApprovalQueueItem[]) => Promise<void>;
  onTrain?: (item: ApprovalQueueItem) => void;
  selectedInvoice?: ApprovalQueueItem | null;
}
export function ApprovalQueue({
  items,
  onSelectInvoice,
  onBulkApprove,
  onTrain,
  selectedInvoice,
}: ApprovalQueueProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "vendor-asc" | "vendor-desc" | "date" | "confidence"
  >("date");
  const [isExpanded, setIsExpanded] = useState(true);
  const [bulkApproving, setBulkApproving] = useState(false); // Filter and sort items const processedItems = useMemo(() => { let filtered = items.filter((item) => { const searchLower = searchTerm.toLowerCase(); return ( item.invoiceNumber.toLowerCase().includes(searchLower) || item.vendor.toLowerCase().includes(searchLower) ); }); // Sort switch (sortBy) { case"vendor-asc": filtered.sort((a, b) => a.vendor.localeCompare(b.vendor)); break; case"vendor-desc": filtered.sort((a, b) => b.vendor.localeCompare(a.vendor)); break; case"confidence": filtered.sort((a, b) => a.confidenceScore - b.confidenceScore); break; case"date": default: filtered.sort( (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(), ); break; } return filtered; }, [items, searchTerm, sortBy]); // Count items by status const statusCounts = useMemo(() => { return { pending: items.filter((i) => i.status ==="pending").length, approved: items.filter((i) => i.status ==="approved").length, rejected: items.filter((i) => i.status ==="rejected").length, }; }, [items]); // Items eligible for bulk approval (confidence >= 95%) const bulkApprovableItems = useMemo(() => { return processedItems.filter( (item) => item.status ==="pending" && item.confidenceScore >= 95, ); }, [processedItems]); // Check if system confidence is high enough for bulk approval const systemConfidence = useMemo(() => { if (processedItems.length === 0) return 0; const pendingApprovals = processedItems.filter( (i) => i.status ==="pending", ); if (pendingApprovals.length === 0) return 100; const avgConfidence = pendingApprovals.reduce((sum, i) => sum + i.confidenceScore, 0) / pendingApprovals.length; return avgConfidence; }, [processedItems]); const handleBulkApprove = async () => { if (!onBulkApprove || bulkApprovableItems.length === 0) return; setBulkApproving(true); try { await onBulkApprove(bulkApprovableItems); } finally { setBulkApproving(false); } }; const pendingPendingItems = useMemo( () => processedItems.filter((i) => i.status ==="pending"), [processedItems], ); return ( <Card className="border border-slate-800/60 bg-card"> <CardHeader className="pb-3"> <div className="flex items-start justify-between gap-4"> <div className="flex-1"> <div className="flex items-center gap-2"> <CardTitle className="text-lg">Approvals Queue</CardTitle> <Badge variant="outline" className="font-mono"> {statusCounts.pending} pending </Badge> <Badge variant="secondary" className="font-mono"> {statusCounts.approved} approved </Badge> </div> <CardDescription className="mt-1"> System confidence:{""} <span className="font-semibold"> {Math.round(systemConfidence)}% </span> {systemConfidence >= 99.9 && ( <span className="ml-2 inline-block rounded bg-green-500/20 px-2 py-1 text-xs text-green-300"> ✓ Bulk approval enabled </span> )} </CardDescription> </div> <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="mt-1" > <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded ?"rotate-180" :"", )} /> </Button> </div> </CardHeader> {isExpanded && ( <> {/* Search and Controls */} <CardContent className="space-y-3 pb-3"> <div className="flex gap-2"> <div className="relative flex-1"> <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /> <Input placeholder="Search invoice #, vendor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /> </div> <select value={sortBy} onChange={(e) => setSortBy( e.target.value as |"vendor-asc" |"vendor-desc" |"date" |"confidence", ) } className="rounded border border-border bg-slate-800 px-3 py-2 text-sm text-slate-100" > <option value="date">Newest First</option> <option value="vendor-asc">Vendor A-Z</option> <option value="vendor-desc">Vendor Z-A</option> <option value="confidence">Lowest Confidence</option> </select> </div> {/* Bulk Approval Button */} {systemConfidence >= 99.9 && bulkApprovableItems.length > 0 && ( <Button onClick={handleBulkApprove} disabled={bulkApproving} className="w-full gap-2 bg-green-600 hover:bg-green-700" > <Zap className="h-4 w-4" /> {bulkApproving ?"Approving..." : `Bulk Approve ${bulkApprovableItems.length} Item${bulkApprovableItems.length !== 1 ?"s" :""} (≥95%)`} </Button> )} </CardContent> {/* Queue List - Compact Single Line View */} <div className="max-h-96 overflow-y-auto border-t border-slate-800/60"> {processedItems.length === 0 ? ( <div className="p-4 text-center text-sm text-slate-400"> No invoices match your search </div> ) : ( <div className="divide-y divide-slate-800/60"> {processedItems.map((item) => { const isSelected = selectedInvoice?.id === item.id; const isLowConfidence = item.confidenceScore < 95; return ( <div key={item.id} onClick={() => onSelectInvoice(item)} className={cn("w-full px-4 py-2 text-left transition-colors hover:bg-surface flex items-center justify-between gap-3 text-sm cursor-pointer", isSelected &&"bg-surface", item.status ==="approved" &&"opacity-60", )} > <div className="flex items-center gap-3 min-w-0 flex-1"> <span className="font-mono font-semibold text-cyan-400 whitespace-nowrap"> {item.invoiceNumber} </span> <span className="truncate text-slate-300 flex-1"> {item.vendor} </span> <span className="text-slate-400 whitespace-nowrap"> ${item.total.toFixed(2)} </span> <span className="text-muted-foreground whitespace-nowrap text-xs"> {item.lineItemCount} items </span> </div> <div className="flex items-center gap-2 whitespace-nowrap"> {isLowConfidence && ( <span className="text-xs text-yellow-400"> {item.confidenceScore}% </span> )} {onTrain && item.status ==="pending" && ( <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onTrain(item); }} className="h-6 px-2 text-xs gap-1" title="Train system on this invoice" > <BookOpen className="h-3 w-3" /> Train </Button> )} <Badge variant={ item.status ==="approved" ?"default" : item.status ==="rejected" ?"destructive" :"outline" } className="text-xs py-0.5 px-1.5" > {item.status ==="approved" ?"✓" : item.status ==="rejected" ?"✗" :"▪"} </Badge> </div> </div> ); })} </div> )} </div> </> )} </Card> );
}
