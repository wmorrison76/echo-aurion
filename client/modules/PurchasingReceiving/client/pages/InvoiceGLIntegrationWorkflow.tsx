import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { useMultiOutlet } from "@/context/MultiOutletContext";
import {
  GLAllocationPanel,
  VarianceReviewPanel,
} from "@/components/invoice/gl-integration-index";
import {
  useExtractionResults,
  useApprovalWorkflows,
  useGLPostingQueue,
} from "@/hooks/useInvoiceGLIntegration";
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  RefreshCw,
  DollarSign,
} from "lucide-react";
export default function InvoiceGLIntegrationWorkflow() {
  const { organization } = useMultiOutlet();
  const [activeTab, setActiveTab] = useState("allocations");
  const [refreshing, setRefreshing] = useState(false);
  const { results: extractions, refetch: refreshExtractions } =
    useExtractionResults(50);
  const { workflows, refetch: refreshWorkflows } = useApprovalWorkflows(50);
  const { queueItems, refetch: refreshQueue } = useGLPostingQueue(50);
  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshExtractions(),
        refreshWorkflows(),
        refreshQueue(),
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  }; // Calculate summary metrics const pendingExtractions = extractions.filter( (e) => e.lineExtractionStatus ==="pending" ).length; const completedExtractions = extractions.filter( (e) => e.lineExtractionStatus ==="completed" ).length; const approvalsPending = workflows.filter((w) => w.status ==="pending").length; const approvalsCompleted = workflows.filter((w) => w.status ==="approved").length; const queuePending = queueItems.filter((q) => q.status ==="pending").length; const queuePosted = queueItems.filter((q) => q.status ==="posted").length; return ( <AppLayout title="Invoice Processing & GL Integration"> <main id="main-content" className="space-y-6"> {/* Header Metrics */} <div className="grid grid-cols-1 md:grid-cols-4 gap-4"> <Card> <CardHeader className="pb-3"> <CardTitle className="text-sm font-medium flex items-center gap-2"> <FileText className="w-4 h-4" /> Extractions </CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold">{completedExtractions}</div> <p className="text-xs text-muted-foreground mt-1"> {pendingExtractions} pending </p> </CardContent> </Card> <Card> <CardHeader className="pb-3"> <CardTitle className="text-sm font-medium flex items-center gap-2"> <CheckCircle className="w-4 h-4" /> Approvals </CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold">{approvalsCompleted}</div> <p className="text-xs text-muted-foreground mt-1"> {approvalsPending} pending </p> </CardContent> </Card> <Card> <CardHeader className="pb-3"> <CardTitle className="text-sm font-medium flex items-center gap-2"> <DollarSign className="w-4 h-4" /> GL Posts </CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold">{queuePosted}</div> <p className="text-xs text-muted-foreground mt-1"> {queuePending} pending </p> </CardContent> </Card> <Card> <CardHeader className="pb-3"> <CardTitle className="text-sm font-medium">Last Sync</CardTitle> </CardHeader> <CardContent> <div className="text-lg font-bold">Now</div> <p className="text-xs text-muted-foreground mt-1"> {new Date().toLocaleTimeString()} </p> </CardContent> </Card> </div> {/* Main Content Area */} <div> <div className="flex items-center justify-between mb-4"> <div> <h2 className="text-2xl font-bold">Invoice Processing</h2> <p className="text-muted-foreground text-sm mt-1"> Extract invoice data, map to GL accounts, and post to journal </p> </div> <Button onClick={handleRefreshAll} disabled={refreshing} variant="outline" size="sm" className="gap-2" > <RefreshCw className={`w-4 h-4 ${refreshing ?"animate-spin" :""}`} /> {refreshing ?"Refreshing..." :"Refresh All"} </Button> </div> <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full"> <TabsList className="grid w-full grid-cols-3 mb-6"> <TabsTrigger value="allocations" className="gap-2"> <DollarSign className="w-4 h-4" /> <span className="hidden sm:inline">Allocations</span> </TabsTrigger> <TabsTrigger value="variances" className="gap-2"> <AlertTriangle className="w-4 h-4" /> <span className="hidden sm:inline">Variances</span> </TabsTrigger> <TabsTrigger value="posting" className="gap-2"> <CheckCircle className="w-4 h-4" /> <span className="hidden sm:inline">Posting</span> </TabsTrigger> </TabsList> {/* Allocations Tab */} <TabsContent value="allocations" className="space-y-6"> <GLAllocationPanel organizationId={organization?.id ||""} /> </TabsContent> {/* Variances Tab */} <TabsContent value="variances" className="space-y-6"> <VarianceReviewPanel /> </TabsContent> {/* Posting Tab */} <TabsContent value="posting" className="space-y-6"> <Card> <CardHeader> <CardTitle>GL Posting Queue</CardTitle> <CardDescription> Manage invoice GL entry posting to the ledger </CardDescription> </CardHeader> <CardContent> <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"> <div> <p className="text-sm font-medium text-muted-foreground"> Pending Posts </p> <p className="text-2xl font-bold">{queuePending}</p> </div> <div> <p className="text-sm font-medium text-muted-foreground"> Posted </p> <p className="text-2xl font-bold text-green-600"> {queuePosted} </p> </div> <div> <p className="text-sm font-medium text-muted-foreground"> Total Items </p> <p className="text-2xl font-bold"> {queueItems.length} </p> </div> </div> <div className="p-6 bg-blue-50 rounded-lg text-sm"> <p> <strong>GL Posting:</strong> Invoice allocations are queued for posting to the general ledger. Process them to update your accounting records. </p> </div> </CardContent> </Card> </TabsContent> </Tabs> </div> {/* Info Panel */} <Card className="bg-blue-50 border-blue-200"> <CardHeader> <CardTitle className="text-base flex items-center gap-2"> <TrendingUp className="w-5 h-5" /> About Invoice Processing & GL Integration </CardTitle> </CardHeader> <CardContent className="text-sm space-y-2"> <p> <strong>Automated Extraction:</strong> Extract invoice data from PDFs or other documents using OCR or API integrations. </p> <p> <strong>GL Mapping:</strong> Automatically map invoice line items to GL accounts based on product categories and vendor setup. </p> <p> <strong>Variance Detection:</strong> Identify discrepancies between expected and actual amounts for manual review. </p> <p> <strong>Approval Workflows:</strong> Route invoices through approval chains based on amount thresholds and risk factors. </p> <p> <strong>GL Posting:</strong> Post approved invoices to the general ledger with automatic debit/credit generation. </p> <p> <strong>Multi-outlet Tracking:</strong> Track invoice costs by outlet and cost center for accurate financial reporting. </p> </CardContent> </Card> </main> </AppLayout> );
}
