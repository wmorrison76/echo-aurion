import React from "react";

import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Upload,
  DollarSign,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type WorkflowStep = "capture" | "match" | "approve" | "complete";

interface InvoiceData {
  invoiceId?: string;
  vendorId: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  poNumber?: string;
  currency: string;
  entityId: string;
}

interface MatchingResult {
  poMatched: boolean;
  receiptMatched: boolean;
  threeWayMatched: boolean;
  varianceAmount: number;
  variancePercent: number;
}

const STEPS: {
  id: WorkflowStep;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    id: "capture",
    label: "Capture Invoice",
    icon: <Upload className="h-4 w-4" />,
    description: "Upload and OCR scan",
  },
  {
    id: "match",
    label: "3-Way Match",
    icon: <CheckCircle2 className="h-4 w-4" />,
    description: "Match PO & receipt",
  },
  {
    id: "approve",
    label: "Approve",
    icon: <FileText className="h-4 w-4" />,
    description: "Manager approval",
  },
  {
    id: "complete",
    label: "Complete",
    icon: <DollarSign className="h-4 w-4" />,
    description: "Ready for payment",
  },
];

function CaptureStep({
  onNext,
  loading,
}: {
  onNext: (data: InvoiceData) => void;
  loading: boolean;
}) {
  const [formData, setFormData] = React.useState<InvoiceData>({
    vendorId: "",
    vendorName: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    amount: 0,
    currency: "USD",
    entityId: "ent_default",
  });
  const [file, setFile] = React.useState<File | null>(null);

  const isComplete = Boolean(
    formData.vendorId && formData.invoiceNumber && formData.amount > 0,
  );

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Invoice Capture</h3>
        <p className="text-sm text-blue-800">
          Upload a scanned invoice or enter details manually.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-1 md:col-span-2">
          <label className="text-sm font-medium text-foreground mb-2 block">
            Scanned Invoice (Optional)
          </label>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-900">
                {file ? file.name : "Click to upload"}
              </p>
              <p className="text-xs text-muted-foreground">PDF, PNG, or JPG</p>
            </label>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Vendor ID *
          </label>
          <Input
            value={formData.vendorId}
            onChange={(e) =>
              setFormData({ ...formData, vendorId: e.target.value })
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Vendor Name
          </label>
          <Input
            value={formData.vendorName}
            onChange={(e) =>
              setFormData({ ...formData, vendorName: e.target.value })
            }
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Invoice Number *
          </label>
          <Input
            value={formData.invoiceNumber}
            onChange={(e) =>
              setFormData({ ...formData, invoiceNumber: e.target.value })
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Invoice Date
          </label>
          <Input
            type="date"
            value={formData.invoiceDate}
            onChange={(e) =>
              setFormData({ ...formData, invoiceDate: e.target.value })
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Due Date
          </label>
          <Input
            type="date"
            value={formData.dueDate}
            onChange={(e) =>
              setFormData({ ...formData, dueDate: e.target.value })
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Amount *
          </label>
          <Input
            type="number"
            step="0.01"
            value={formData.amount || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                amount: Number.parseFloat(e.target.value) || 0,
              })
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            PO Number (Optional)
          </label>
          <Input
            value={formData.poNumber || ""}
            onChange={(e) =>
              setFormData({ ...formData, poNumber: e.target.value })
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Entity
          </label>
          <Select
            value={formData.entityId}
            onValueChange={(value) =>
              setFormData({ ...formData, entityId: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ent_default">Main Entity</SelectItem>
              <SelectItem value="ent_spa">Spa Location</SelectItem>
              <SelectItem value="ent_restaurant">Restaurant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {isComplete ? (
            <span className="text-green-600 font-medium">
              ✓ Ready to proceed
            </span>
          ) : null}
        </div>
        <Button
          onClick={() => onNext(formData)}
          disabled={loading || !isComplete}
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Next: Match
        </Button>
      </div>
    </div>
  );
}

function MatchingStep({
  invoice,
  onNext,
  onBack,
  loading,
}: {
  invoice: InvoiceData;
  onNext: (result: MatchingResult) => void;
  onBack: () => void;
  loading: boolean;
}) {
  const [matching, setMatching] = React.useState<MatchingResult>({
    poMatched: true,
    receiptMatched: true,
    threeWayMatched: true,
    varianceAmount: 0,
    variancePercent: 0,
  });

  const handleMatch = async () => {
    setMatching((prev) => ({ ...prev }));
    onNext(matching);
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold text-amber-900 mb-2">3-Way Matching</h3>
        <p className="text-sm text-amber-800">
          Verify PO, receipt, and invoice amounts match within tolerance.
        </p>
      </div>

      {!matching.threeWayMatched ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-yellow-900">
              Variance Detected
            </div>
            <div className="text-sm text-yellow-800 mt-1">
              Variance is {matching.variancePercent.toFixed(2)}% ($
              {matching.varianceAmount.toFixed(2)}).
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleMatch}
          disabled={loading || !matching.threeWayMatched}
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Next: Approval
        </Button>
      </div>
    </div>
  );
}

function ApprovalStep({
  invoice,
  onNext,
  onBack,
  loading,
}: {
  invoice: InvoiceData;
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  const [approvalNotes, setApprovalNotes] = React.useState("");
  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-900 mb-2">
          Ready for Approval
        </h3>
        <p className="text-sm text-green-800">
          Submit this invoice for manager approval.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Approval Notes (Optional)
        </label>
        <textarea
          value={approvalNotes}
          onChange={(e) => setApprovalNotes(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm"
          rows={3}
        />
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={loading}
          className="gap-2 bg-green-600 hover:bg-green-700"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Submit for Approval
        </Button>
      </div>
    </div>
  );
}

function CompletionStep({
  invoice,
  onNewInvoice,
}: {
  invoice: InvoiceData;
  onNewInvoice: () => void;
}) {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Invoice Submitted!
        </h3>
        <p className="text-muted-foreground">
          Your invoice has been submitted for approval.
        </p>
      </div>
      <Button onClick={onNewInvoice} className="w-full gap-2">
        <Upload className="h-4 w-4" />
        Process Another Invoice
      </Button>
    </div>
  );
}

export function InvoicePaymentWorkflow() {
  const [currentStep, setCurrentStep] = React.useState<WorkflowStep>("capture");
  const [invoiceData, setInvoiceData] = React.useState<InvoiceData | null>(
    null,
  );
  const [matchingResult, setMatchingResult] =
    React.useState<MatchingResult | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleCaptureNext = async (data: InvoiceData) => {
    setLoading(true);
    try {
      const response = await fetch("/api/aurum/payments/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const result = await response.json();
        setInvoiceData({ ...data, invoiceId: result?.invoice?.id });
        setCurrentStep("match");
      }
    } catch (error) {
      console.error("Failed to capture invoice:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchNext = async (result: MatchingResult) => {
    setLoading(true);
    try {
      if (invoiceData?.invoiceId) {
        const response = await fetch("/api/aurum/payments/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceId: invoiceData.invoiceId, ...result }),
        });
        if (response.ok) {
          setMatchingResult(result);
          setCurrentStep("approve");
        }
      }
    } catch (error) {
      console.error("Failed to match invoice:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalNext = async () => {
    setLoading(true);
    try {
      if (invoiceData?.invoiceId) {
        const response = await fetch("/api/aurum/payments/submit-approval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceId: invoiceData.invoiceId }),
        });
        if (response.ok) setCurrentStep("complete");
      }
    } catch (error) {
      console.error("Failed to submit approval:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep("capture");
    setInvoiceData(null);
    setMatchingResult(null);
  };

  const activeIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="w-full bg-background rounded-lg border border-gray-200 shadow-sm">
      <div className="border-b border-gray-200 px-4 md:px-6 py-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
          Invoice Payment Workflow
        </h2>

        <div className="grid grid-cols-4 gap-2 md:gap-4">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex flex-col items-center">
              <button
                className={cn(
                  "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all mb-2",
                  step.id === currentStep
                    ? "bg-primary border-primary text-white"
                    : activeIndex > idx
                      ? "bg-green-600 border-green-600 text-white"
                      : "bg-surface border-border text-muted-foreground",
                )}
              >
                {activeIndex > idx ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <span className="text-xs font-semibold">{idx + 1}</span>
                )}
              </button>
              <div className="text-center">
                <div className="text-xs md:text-sm font-semibold text-gray-900">
                  {step.label}
                </div>
                <div className="hidden md:block text-xs text-muted-foreground">
                  {step.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-6">
        {currentStep === "capture" ? (
          <CaptureStep onNext={handleCaptureNext} loading={loading} />
        ) : null}
        {currentStep === "match" && invoiceData ? (
          <MatchingStep
            invoice={invoiceData}
            onNext={handleMatchNext}
            onBack={() => setCurrentStep("capture")}
            loading={loading}
          />
        ) : null}
        {currentStep === "approve" && invoiceData && matchingResult ? (
          <ApprovalStep
            invoice={invoiceData}
            onNext={handleApprovalNext}
            onBack={() => setCurrentStep("match")}
            loading={loading}
          />
        ) : null}
        {currentStep === "complete" && invoiceData ? (
          <CompletionStep invoice={invoiceData} onNewInvoice={handleReset} />
        ) : null}
      </div>
    </div>
  );
}
