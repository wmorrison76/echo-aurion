/** * P&L Transaction Detail Component * Complete transaction detail with audit trail and document linking * * Features: * - Full journal entry detail * - Debit/credit breakdown * - Associated documents * - Approval workflow status * - Reversals and adjustments * - GL posting detail * - Complete audit trail */ import React, {
  useState,
  useMemo,
} from "react";
import {
  GLTransaction,
  GLBackingDetail,
  Period,
} from "@/shared/types/pnlTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Download,
  Eye,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
interface PnLTransactionDetailProps {
  glDetail: GLBackingDetail;
  selectedTransaction?: GLTransaction;
  onTransactionSelect?: (transaction: GLTransaction) => void;
  onDocumentClick?: (docType: string, docId: string) => void;
  readonly?: boolean;
}
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};
const getStatusColor = (
  status: string,
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "posted":
      return "default";
    case "pending":
      return "secondary";
    case "reversed":
      return "destructive";
    case "voided":
      return "destructive";
    default:
      return "outline";
  }
};
const getApprovalStatusIcon = (status?: string) => {
  switch (status) {
    case "approved":
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case "pending-approval":
      return <Clock className="w-4 h-4 text-amber-600" />;
    case "rejected":
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    default:
      return null;
  }
};
export function PnLTransactionDetail({
  glDetail,
  selectedTransaction: initialSelection,
  onTransactionSelect,
  onDocumentClick,
  readonly = false,
}: PnLTransactionDetailProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<
    GLTransaction | undefined
  >(initialSelection);
  const [expandedDocuments, setExpandedDocuments] = useState<Set<string>>(
    new Set(),
  );
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const handleTransactionSelect = (transaction: GLTransaction) => {
    setSelectedTransaction(transaction);
    onTransactionSelect?.(transaction);
  }; // Summary statistics const summary = useMemo(() => { return { totalTransactions: glDetail.transactions.length, totalDebits: glDetail.debits, totalCredits: glDetail.credits, balance: glDetail.closingBalance, posted: glDetail.transactions.filter((t) => t.status ==="posted").length, pending: glDetail.transactions.filter((t) => t.status ==="pending").length, reversed: glDetail.transactions.filter((t) => t.status ==="reversed").length, }; }, [glDetail]); // Group transactions by date const transactionsByDate = useMemo(() => { const grouped = new Map<string, GLTransaction[]>(); glDetail.transactions.forEach((transaction) => { const date = transaction.transactionDate.split("T")[0]; if (!grouped.has(date)) { grouped.set(date, []); } grouped.get(date)!.push(transaction); }); return Array.from(grouped.entries()) .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()) .map(([date, transactions]) => ({ date, transactions })); }, [glDetail.transactions]); // Get transactions by department const transactionsByDepartment = useMemo(() => { const grouped = new Map<string, GLTransaction[]>(); glDetail.transactions.forEach((transaction) => { const dept = transaction.department ||"Unallocated"; if (!grouped.has(dept)) { grouped.set(dept, []); } grouped.get(dept)!.push(transaction); }); return Array.from(grouped.entries()) .sort((a, b) => b[1].length - a[1].length) .map(([department, transactions]) => ({ department, transactions, total: transactions.reduce((sum, t) => sum + t.debitAmount - t.creditAmount, 0), })); }, [glDetail.transactions]); return ( <div className="space-y-6"> {/* GL Account Header */} <Card> <CardHeader> <div className="flex items-start justify-between"> <div> <CardTitle className="text-2xl">{glDetail.glAccountCode}</CardTitle> <p className="text-muted-foreground mt-1">{glDetail.glAccountName}</p> <p className="text-sm text-muted-foreground mt-2"> {glDetail.glAccountDescription} </p> </div> <div className="text-right"> <p className="text-sm text-muted-foreground mb-2">Account Type</p> <Badge variant="outline">{glDetail.type}</Badge> </div> </div> </CardHeader> </Card> {/* Account Summary */} <div className="grid grid-cols-1 md:grid-cols-5 gap-4"> <Card> <CardHeader className="pb-2"> <CardTitle className="text-sm font-medium text-muted-foreground"> Opening Balance </CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold"> {formatCurrency(glDetail.openingBalance)} </div> </CardContent> </Card> <Card> <CardHeader className="pb-2"> <CardTitle className="text-sm font-medium text-muted-foreground"> Total Debits </CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold text-primary"> {formatCurrency(glDetail.debits)} </div> </CardContent> </Card> <Card> <CardHeader className="pb-2"> <CardTitle className="text-sm font-medium text-muted-foreground"> Total Credits </CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold text-orange-600"> {formatCurrency(glDetail.credits)} </div> </CardContent> </Card> <Card> <CardHeader className="pb-2"> <CardTitle className="text-sm font-medium text-muted-foreground"> Net Movement </CardTitle> </CardHeader> <CardContent> <div className={`text-2xl font-bold ${ glDetail.debits > glDetail.credits ?"text-green-600" :"text-red-600" }`} > {formatCurrency(glDetail.debits - glDetail.credits)} </div> </CardContent> </Card> <Card> <CardHeader className="pb-2"> <CardTitle className="text-sm font-medium text-muted-foreground"> Closing Balance </CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold"> {formatCurrency(glDetail.closingBalance)} </div> </CardContent> </Card> </div> {/* Tabs */} <Tabs defaultValue="transactions"> <TabsList className="grid w-full grid-cols-4"> <TabsTrigger value="transactions"> Transactions ({summary.totalTransactions}) </TabsTrigger> <TabsTrigger value="byDate">By Date</TabsTrigger> <TabsTrigger value="byDepartment">By Department</TabsTrigger> <TabsTrigger value="detail">Detail</TabsTrigger> </TabsList> {/* Transactions Tab */} <TabsContent value="transactions"> <Card> <CardHeader> <CardTitle>All Transactions</CardTitle> </CardHeader> <CardContent> <div className="space-y-2 max-h-96 overflow-y-auto"> {glDetail.transactions.map((transaction) => ( <div key={transaction.id} className={`p-3 border rounded-lg cursor-pointer transition-colors ${ selectedTransaction?.id === transaction.id ?"bg-blue-50 border-primary" :"hover:bg-accent" }`} onClick={() => handleTransactionSelect(transaction)} > <div className="flex items-start justify-between"> <div className="flex-1"> <div className="flex items-center gap-2"> <p className="font-medium">{transaction.description}</p> <Badge variant={getStatusColor(transaction.status)}> {transaction.status} </Badge> {transaction.approvalStatus && ( <div className="flex items-center gap-1"> {getApprovalStatusIcon(transaction.approvalStatus)} <span className="text-xs text-muted-foreground"> {transaction.approvalStatus} </span> </div> )} </div> <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground"> <span>{transaction.transactionDate}</span> {transaction.reference && <span>{transaction.reference}</span>} {transaction.department && <span>{transaction.department}</span>} </div> </div> <div className="text-right ml-4"> {transaction.debitAmount > 0 && ( <div className="text-primary font-semibold"> Dr {formatCurrency(transaction.debitAmount)} </div> )} {transaction.creditAmount > 0 && ( <div className="text-orange-600 font-semibold"> Cr {formatCurrency(transaction.creditAmount)} </div> )} </div> </div> </div> ))} </div> </CardContent> </Card> </TabsContent> {/* By Date Tab */} <TabsContent value="byDate"> <Card> <CardHeader> <CardTitle>Transactions by Date</CardTitle> </CardHeader> <CardContent> <div className="space-y-4"> {transactionsByDate.map(({ date, transactions }) => ( <div key={date} className="border rounded-lg p-4"> <h4 className="font-semibold mb-3">{date}</h4> <div className="space-y-2"> {transactions.map((transaction) => ( <div key={transaction.id} className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer" onClick={() => handleTransactionSelect(transaction)} > <div> <p className="font-medium">{transaction.description}</p> <p className="text-sm text-muted-foreground"> {transaction.reference} </p> </div> <div className="text-right"> <p className="font-semibold text-primary"> Dr {formatCurrency(transaction.debitAmount)} </p> <p className="font-semibold text-orange-600"> Cr {formatCurrency(transaction.creditAmount)} </p> </div> </div> ))} </div> </div> ))} </div> </CardContent> </Card> </TabsContent> {/* By Department Tab */} <TabsContent value="byDepartment"> <Card> <CardHeader> <CardTitle>Transactions by Department</CardTitle> </CardHeader> <CardContent> <div className="space-y-4"> {transactionsByDepartment.map(({ department, transactions, total }) => ( <div key={department} className="border rounded-lg p-4"> <div className="flex items-center justify-between mb-3"> <h4 className="font-semibold">{department}</h4> <div className="text-right"> <p className="font-semibold">{formatCurrency(total)}</p> <p className="text-sm text-muted-foreground"> {transactions.length} transactions </p> </div> </div> <div className="space-y-2"> {transactions.slice(0, 3).map((transaction) => ( <div key={transaction.id} className="flex items-center justify-between p-2 text-sm hover:bg-muted rounded" > <span className="text-muted-foreground"> {transaction.description} </span> <span className="font-medium"> {transaction.debitAmount > 0 ? `Dr ${formatCurrency(transaction.debitAmount)}` : `Cr ${formatCurrency(transaction.creditAmount)}`} </span> </div> ))} {transactions.length > 3 && ( <p className="text-xs text-muted-foreground p-2"> +{transactions.length - 3} more... </p> )} </div> </div> ))} </div> </CardContent> </Card> </TabsContent> {/* Detail Tab */} <TabsContent value="detail"> {selectedTransaction ? ( <Card> <CardHeader> <CardTitle>Transaction Detail</CardTitle> </CardHeader> <CardContent className="space-y-6"> {/* Transaction Header */} <div> <h3 className="font-semibold mb-4">Transaction Information</h3> <div className="grid grid-cols-2 gap-4"> <div> <p className="text-sm text-muted-foreground">Description</p> <p className="font-medium">{selectedTransaction.description}</p> </div> <div> <p className="text-sm text-muted-foreground">Reference</p> <p className="font-medium">{selectedTransaction.reference}</p> </div> <div> <p className="text-sm text-muted-foreground">Transaction Date</p> <p className="font-medium"> {new Date(selectedTransaction.transactionDate).toLocaleDateString()} </p> </div> <div> <p className="text-sm text-muted-foreground">Posted By</p> <p className="font-medium">{selectedTransaction.postedBy}</p> </div> </div> </div> {/* Amounts */} <div> <h3 className="font-semibold mb-4">Amounts</h3> <div className="grid grid-cols-3 gap-4"> <div> <p className="text-sm text-muted-foreground">Debit</p> <p className="text-2xl font-bold text-primary"> {formatCurrency(selectedTransaction.debitAmount)} </p> </div> <div> <p className="text-sm text-muted-foreground">Credit</p> <p className="text-2xl font-bold text-orange-600"> {formatCurrency(selectedTransaction.creditAmount)} </p> </div> <div> <p className="text-sm text-muted-foreground">Net</p> <p className="text-2xl font-bold"> {formatCurrency( selectedTransaction.debitAmount - selectedTransaction.creditAmount )} </p> </div> </div> </div> {/* Related Documents */} {selectedTransaction.relatedDocuments.length > 0 && ( <div> <h3 className="font-semibold mb-4">Related Documents</h3> <div className="space-y-2"> {selectedTransaction.relatedDocuments.map((doc) => ( <div key={doc.documentId} className="flex items-center justify-between p-3 border rounded hover:bg-accent cursor-pointer" onClick={() => onDocumentClick?.(doc.documentType, doc.documentId) } > <div className="flex items-center gap-3"> <FileText className="w-4 h-4 text-muted-foreground" /> <div> <p className="font-medium">{doc.documentNumber}</p> <p className="text-sm text-muted-foreground"> {doc.documentType} </p> </div> </div> <Eye className="w-4 h-4 text-muted-foreground" /> </div> ))} </div> </div> )} {/* Status */} <div> <h3 className="font-semibold mb-4">Status</h3> <div className="grid grid-cols-2 gap-4"> <div> <p className="text-sm text-muted-foreground">Transaction Status</p> <Badge variant={getStatusColor(selectedTransaction.status)}> {selectedTransaction.status} </Badge> </div> {selectedTransaction.approvalStatus && ( <div> <p className="text-sm text-muted-foreground">Approval Status</p> <div className="flex items-center gap-2"> {getApprovalStatusIcon(selectedTransaction.approvalStatus)} <Badge variant="outline"> {selectedTransaction.approvalStatus} </Badge> </div> </div> )} </div> </div> {/* Actions */} {!readonly && ( <div className="flex items-center gap-2 pt-4 border-t"> <Button variant="outline" size="sm"> <Download className="w-4 h-4 mr-2" /> Download </Button> <Button variant="outline" size="sm"> <FileText className="w-4 h-4 mr-2" /> View Details </Button> </div> )} </CardContent> </Card> ) : ( <Card> <CardHeader> <CardTitle>Transaction Detail</CardTitle> </CardHeader> <CardContent> <p className="text-muted-foreground"> Select a transaction to view details </p> </CardContent> </Card> )} </TabsContent> </Tabs> </div> );
}
