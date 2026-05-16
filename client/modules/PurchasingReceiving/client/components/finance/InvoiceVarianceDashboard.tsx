import React, { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Scan, ShieldCheck, TriangleAlert } from "lucide-react";
import { InvoiceCameraCapture } from "@/components/invoice/InvoiceCameraCapture";
interface ReviewSummary {
  pending: number;
  flagged: number;
  autoHold: number;
  varianceExposure: number;
  averageConfidence: number | null;
}
interface ReviewTaskRow {
  id: string;
  invoiceId: string;
  reason: string;
  confidence: number | null;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
  invoice: {
    id: string;
    vendor: string | null;
    total: number | null;
    status: string;
    varianceScore: number | null;
    requiresReview: boolean;
    reviewStatus: string | null;
    ocrConfidence: number | null;
    createdAt: string;
    thresholds: Record<string, unknown> | null;
  } | null;
  variances: Array<{
    id: string;
    invoiceLineId: string | null;
    type: string;
    expected: number | null;
    actual: number | null;
    variancePct: number | null;
    confidence: number | null;
    requiresReview: boolean;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
  feedback: Array<{
    eventType: string;
    payload: Record<string, unknown>;
    actorId: string | null;
    createdAt: string;
  }>;
}
interface ReviewResponse {
  summary: ReviewSummary;
  tasks: ReviewTaskRow[];
}
async function fetchReviewQueue(): Promise<ReviewResponse> {
  const response = await fetch("/api/invoices/review-queue");
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Unable to load invoice review queue");
  }
  return response.json();
}
async function resolveTask(input: {
  taskId: string;
  action: "approve" | "reject" | "dismiss";
  notes: string;
  reviewerId?: string | null;
  feedback?: Record<string, unknown> | null;
  confidence?: number | null;
}): Promise<void> {
  const response = await fetch(
    `/api/invoices/review-tasks/${input.taskId}/resolve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Failed to resolve review task");
  }
}
async function validateBarcode(
  invoiceId: string,
  code: string,
): Promise<boolean> {
  const response = await fetch(`/api/invoices/${invoiceId}/barcode-validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Barcode validation failed");
  }
  const payload = await response.json();
  return Boolean(payload.valid);
}
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const percent = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};
interface DetailDialogProps {
  task: ReviewTaskRow | null;
  onClose: () => void;
  onResolve: (params: {
    action: "approve" | "reject" | "dismiss";
    notes: string;
    feedback: Record<string, unknown> | null;
  }) => Promise<void>;
}
function TaskDetailDialog({ task, onClose, onResolve }: DetailDialogProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [sendToTraining, setSendToTraining] = useState(true);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [barcodeMessage, setBarcodeMessage] = useState<string | null>(null);
  const [barcodeValid, setBarcodeValid] = useState<boolean | null>(null);
  const [resolvingAction, setResolvingAction] = useState<
    "approve" | "reject" | "dismiss" | null
  >(null);
  const handleResolve = useCallback(
    async (action: "approve" | "reject" | "dismiss") => {
      if (!task) return;
      setResolvingAction(action);
      try {
        const feedbackPayload = sendToTraining
          ? {
              sendToTraining: true,
              variances: task.variances.map((entry) => ({
                id: entry.id,
                invoiceLineId: entry.invoiceLineId,
                variancePct: entry.variancePct,
                metadata: entry.metadata,
              })),
            }
          : null;
        await onResolve({ action, notes, feedback: feedbackPayload });
        toast({
          title: action === "approve" ? "Invoice cleared" : "Review updated",
          description: notes ? "Notes recorded." : undefined,
        });
        setNotes("");
        setBarcodeMessage(null);
        setBarcodeValid(null);
        onClose();
      } catch (error) {
        toast({
          title: "Unable to resolve task",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      } finally {
        setResolvingAction(null);
      }
    },
    [task, notes, onResolve, sendToTraining, toast, onClose],
  );
  const handleBarcodeScan = useCallback(
    async (code: string) => {
      if (!task?.invoice) return false;
      try {
        const valid = await validateBarcode(task.invoice.id, code);
        setBarcodeValid(valid);
        setBarcodeMessage(
          valid
            ? "Barcode matched and logged"
            : "Code does not match this invoice",
        );
        toast({
          title: valid ? "Barcode matched" : "Barcode mismatch",
          description: code,
          variant: valid ? "default" : "destructive",
        });
        return valid;
      } catch (error) {
        setBarcodeValid(false);
        setBarcodeMessage(
          error instanceof Error ? error.message : String(error),
        );
        toast({
          title: "Validation failed",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
        return false;
      }
    },
    [task?.invoice, toast],
  );
  if (!task) return null;
  const vendor = task.invoice?.vendor ?? "Unknown vendor";
  const invoiceNumber =
    (task.payload?.invoiceNumber as string | undefined) ?? null;
  return (
    <Dialog
      open={Boolean(task)}
      onOpenChange={(open) => (!open ? onClose() : null)}
    >
      {" "}
      <DialogContent className="max-h-[85vh] w-full max-w-3xl overflow-hidden p-0">
        {" "}
        <DialogHeader className="px-6 pb-4 pt-6">
          {" "}
          <DialogTitle className="flex items-center justify-between text-lg">
            {" "}
            Invoice variance review{" "}
            <Badge
              variant="outline"
              className={cn(
                task.invoice?.requiresReview
                  ? "border-amber-500 text-amber-600"
                  : "border-emerald-600 text-emerald-600",
                "ml-2 capitalize",
              )}
            >
              {task.invoice?.reviewStatus ?? task.status}
            </Badge>{" "}
          </DialogTitle>{" "}
          <DialogDescription>
            {" "}
            {vendor} • {task.invoice?.id}{" "}
            {invoiceNumber ? ` • Invoice #${invoiceNumber}` : ""}{" "}
          </DialogDescription>{" "}
        </DialogHeader>{" "}
        <Separator />{" "}
        <div className="grid grid-cols-1 gap-6 px-6 py-5 lg:grid-cols-[1fr_280px]">
          {" "}
          <ScrollArea className="max-h-[52vh] pr-4">
            {" "}
            <div className="space-y-4">
              {" "}
              <div>
                {" "}
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Variance signals
                </h3>{" "}
                <ul className="mt-2 space-y-2 text-sm">
                  {" "}
                  {task.variances.length ? (
                    task.variances.map((variance) => (
                      <li
                        key={variance.id}
                        className="flex items-start justify-between rounded border px-3 py-2 text-sm"
                      >
                        {" "}
                        <div className="mr-3 flex-1">
                          {" "}
                          <div className="font-medium text-foreground">
                            {" "}
                            {variance.type}{" "}
                            {variance.invoiceLineId ? (
                              <span className="ml-2 text-xs text-muted-foreground">
                                Line {variance.invoiceLineId.slice(0, 8)}
                              </span>
                            ) : null}{" "}
                          </div>{" "}
                          <div className="mt-1 text-xs text-muted-foreground">
                            {" "}
                            Expected{" "}
                            {variance.expected != null
                              ? currency.format(variance.expected)
                              : "—"}{" "}
                            • Actual{" "}
                            {variance.actual != null
                              ? currency.format(variance.actual)
                              : "—"}{" "}
                          </div>{" "}
                          {variance.metadata?.vendorSku ? (
                            <div className="text-xs text-muted-foreground">
                              SKU {String(variance.metadata.vendorSku)}
                            </div>
                          ) : null}{" "}
                        </div>{" "}
                        <div className="flex flex-col items-end gap-1">
                          {" "}
                          <Badge
                            variant={
                              variance.requiresReview
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {percent(variance.variancePct)}
                          </Badge>{" "}
                          {variance.confidence != null ? (
                            <span className="text-xs text-muted-foreground">
                              Conf {Math.round(variance.confidence * 100)}%
                            </span>
                          ) : null}{" "}
                        </div>{" "}
                      </li>
                    ))
                  ) : (
                    <li className="rounded border border-dashed px-3 py-2 text-sm text-muted-foreground">
                      No variance data recorded.
                    </li>
                  )}{" "}
                </ul>{" "}
              </div>{" "}
              <div>
                {" "}
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Event timeline
                </h3>{" "}
                <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                  {" "}
                  {task.feedback.length ? (
                    task.feedback.map((entry, index) => (
                      <li
                        key={`${entry.eventType}-${index}`}
                        className="rounded border px-3 py-2"
                      >
                        {" "}
                        <div className="flex items-center justify-between">
                          {" "}
                          <span className="font-medium uppercase tracking-wide text-foreground">
                            {entry.eventType}
                          </span>{" "}
                          <span>
                            {formatDistanceToNow(new Date(entry.createdAt), {
                              addSuffix: true,
                            })}
                          </span>{" "}
                        </div>{" "}
                        <pre className="mt-2 whitespace-pre-wrap break-words text-[11px]">
                          {JSON.stringify(entry.payload, null, 2)}
                        </pre>{" "}
                      </li>
                    ))
                  ) : (
                    <li className="rounded border border-dashed px-3 py-2">
                      No feedback recorded yet.
                    </li>
                  )}{" "}
                </ul>{" "}
              </div>{" "}
            </div>{" "}
          </ScrollArea>{" "}
          <div className="space-y-4">
            {" "}
            <div className="rounded border bg-muted/40 p-4 text-sm">
              {" "}
              <div className="flex items-center gap-2 text-muted-foreground">
                {" "}
                <ShieldCheck className="h-4 w-4" /> OCR confidence{" "}
                {task.invoice?.ocrConfidence != null
                  ? `${task.invoice.ocrConfidence.toFixed(1)}%`
                  : "—"}{" "}
              </div>{" "}
              <div className="mt-2 text-xs text-muted-foreground">
                {" "}
                Variance score{" "}
                {task.invoice?.varianceScore != null
                  ? `${task.invoice.varianceScore.toFixed(2)}%`
                  : "—"}{" "}
              </div>{" "}
              <div className="mt-3 flex items-center justify-between">
                {" "}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {" "}
                  <Switch
                    id="toggle-training"
                    checked={sendToTraining}
                    onCheckedChange={setSendToTraining}
                  />{" "}
                  <label htmlFor="toggle-training">
                    Add to feedback dataset
                  </label>{" "}
                </div>{" "}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBarcodeOpen(true)}
                >
                  {" "}
                  <Scan className="mr-2 h-4 w-4" /> Scan barcode{" "}
                </Button>{" "}
              </div>{" "}
              {barcodeMessage ? (
                <div
                  className={cn(
                    "mt-3 rounded border px-3 py-2 text-xs",
                    barcodeValid
                      ? "border-emerald-500 text-emerald-600"
                      : "border-destructive text-destructive",
                  )}
                >
                  {barcodeMessage}
                </div>
              ) : null}{" "}
            </div>{" "}
            <div className="space-y-2">
              {" "}
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="resolution-notes"
              >
                {" "}
                Resolution notes{" "}
              </label>{" "}
              <Textarea
                id="resolution-notes"
                placeholder="Document your decision for the audit trail"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="h-32"
              />{" "}
            </div>{" "}
            <div className="space-y-2 text-xs text-muted-foreground">
              {" "}
              <div className="flex items-center gap-2">
                {" "}
                <TriangleAlert className="h-4 w-4" /> Created{" "}
                {formatDistanceToNow(new Date(task.createdAt), {
                  addSuffix: true,
                })}{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <DialogFooter className="flex flex-col gap-2 bg-muted/20 px-6 py-4 sm:flex-row sm:justify-between">
          {" "}
          <Button
            variant="outline"
            onClick={() => handleResolve("dismiss")}
            disabled={resolvingAction !== null}
          >
            {" "}
            Dismiss{" "}
          </Button>{" "}
          <div className="flex flex-1 justify-end gap-2 sm:gap-3">
            {" "}
            <Button
              variant="destructive"
              onClick={() => handleResolve("reject")}
              disabled={resolvingAction !== null}
            >
              {" "}
              Reject{" "}
            </Button>{" "}
            <Button
              onClick={() => handleResolve("approve")}
              disabled={resolvingAction !== null}
            >
              {" "}
              {resolvingAction === "approve" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Approve"
              )}{" "}
            </Button>{" "}
          </div>{" "}
        </DialogFooter>{" "}
        {barcodeOpen && (
          <InvoiceCameraCapture
            open={barcodeOpen}
            onOpenChange={setBarcodeOpen}
            onCapture={() => {}}
            onScanCode={handleBarcodeScan}
            hideGallery
          />
        )}{" "}
      </DialogContent>{" "}
    </Dialog>
  );
}
export function InvoiceVarianceDashboard() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["finance", "invoice-review"],
    queryFn: fetchReviewQueue,
    refetchInterval: 30000,
  });
  const [selected, setSelected] = useState<ReviewTaskRow | null>(null);
  const resolveMutation = useMutation({
    mutationFn: resolveTask,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["finance", "invoice-review"],
      }),
  });
  const summaryCards = useMemo(() => {
    const summary = data?.summary;
    if (!summary) {
      return [
        { title: "Pending reviews", value: "—", description: "Awaiting data" },
        { title: "Flagged variances", value: "—", description: "Waiting" },
        { title: "Auto-hold invoices", value: "—", description: "Waiting" },
        {
          title: "Avg reviewer confidence",
          value: "—",
          description: "Waiting",
        },
      ];
    }
    return [
      {
        title: "Pending reviews",
        value: summary.pending.toLocaleString(),
        description: `${summary.flagged.toLocaleString()} flagged, ${summary.autoHold.toLocaleString()} held`,
      },
      {
        title: "Variance exposure",
        value: `${summary.varianceExposure.toFixed(1)} pts`,
        description: "Weighted sum of variances",
      },
      {
        title: "Auto-hold invoices",
        value: summary.autoHold.toLocaleString(),
        description: summary.autoHold ? "Manual approval required" : "None",
      },
      {
        title: "Avg reviewer confidence",
        value:
          summary.averageConfidence != null
            ? `${summary.averageConfidence.toFixed(1)}%`
            : "—",
        description: "Based on open review tasks",
      },
    ];
  }, [data?.summary]);
  const rows = data?.tasks ?? [];
  return (
    <Card className="border">
      {" "}
      <CardHeader>
        {" "}
        <CardTitle className="text-base font-semibold">
          Invoice review queue
        </CardTitle>{" "}
        <CardDescription>
          Track flagged variances and route them for human approval.
        </CardDescription>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-6">
        {" "}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {" "}
          {summaryCards.map((card) => (
            <div key={card.title} className="rounded border bg-muted/40 p-4">
              {" "}
              <div className="text-xs font-medium text-muted-foreground">
                {card.title}
              </div>{" "}
              <div className="mt-2 text-2xl font-semibold">{card.value}</div>{" "}
              <div className="mt-1 text-xs text-muted-foreground">
                {card.description}
              </div>{" "}
            </div>
          ))}{" "}
        </div>{" "}
        <div className="rounded border">
          {" "}
          <div className="flex items-center justify-between border-b px-4 py-3 text-sm">
            {" "}
            <div className="font-medium text-muted-foreground">
              Pending tasks
            </div>{" "}
            <div className="text-xs text-muted-foreground">
              Updated {new Date().toLocaleTimeString()}
            </div>{" "}
          </div>{" "}
          <div className="max-h-[420px] overflow-auto">
            {" "}
            <Table>
              {" "}
              <TableHeader className="sticky top-0 bg-background">
                {" "}
                <TableRow>
                  {" "}
                  <TableHead className="w-[180px]">Created</TableHead>{" "}
                  <TableHead>Vendor</TableHead> <TableHead>Reason</TableHead>{" "}
                  <TableHead className="text-right">Variance</TableHead>{" "}
                  <TableHead className="text-right">Confidence</TableHead>{" "}
                  <TableHead className="w-[140px] text-right">
                    Actions
                  </TableHead>{" "}
                </TableRow>{" "}
              </TableHeader>{" "}
              <TableBody>
                {" "}
                {isLoading ? (
                  <TableRow>
                    {" "}
                    <TableCell
                      colSpan={6}
                      className="text-center text-sm text-muted-foreground"
                    >
                      {" "}
                      <div className="flex items-center justify-center gap-2 py-8">
                        Loading queue{" "}
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>{" "}
                    </TableCell>{" "}
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    {" "}
                    <TableCell
                      colSpan={6}
                      className="text-center text-sm text-destructive"
                    >
                      {" "}
                      {(error as Error)?.message ?? "Unable to load queue"}{" "}
                    </TableCell>{" "}
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    {" "}
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {" "}
                      No pending review tasks. Great job!{" "}
                    </TableCell>{" "}
                  </TableRow>
                ) : (
                  rows.map((task) => {
                    const varianceMagnitude = task.variances.reduce(
                      (max, entry) => {
                        const value =
                          entry.variancePct != null
                            ? Math.abs(entry.variancePct)
                            : 0;
                        return Math.max(max, value);
                      },
                      0,
                    );
                    return (
                      <TableRow key={task.id} className="align-top">
                        {" "}
                        <TableCell className="text-sm font-medium text-muted-foreground">
                          {" "}
                          {formatDistanceToNow(new Date(task.createdAt), {
                            addSuffix: true,
                          })}{" "}
                        </TableCell>{" "}
                        <TableCell className="text-sm">
                          {" "}
                          <div className="font-medium text-foreground">
                            {task.invoice?.vendor ?? "Unknown"}
                          </div>{" "}
                          <div className="text-xs text-muted-foreground">
                            Invoice {task.invoice?.id.slice(0, 8)}
                          </div>{" "}
                        </TableCell>{" "}
                        <TableCell className="text-sm text-muted-foreground">
                          {task.reason}
                        </TableCell>{" "}
                        <TableCell className="text-right text-sm font-semibold">
                          {" "}
                          {varianceMagnitude
                            ? `${varianceMagnitude.toFixed(2)}%`
                            : "—"}{" "}
                        </TableCell>{" "}
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {" "}
                          {task.confidence != null
                            ? `${task.confidence.toFixed(2)}%`
                            : "—"}{" "}
                        </TableCell>{" "}
                        <TableCell className="text-right">
                          {" "}
                          <div className="flex justify-end gap-2">
                            {" "}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelected(task)}
                            >
                              {" "}
                              Review{" "}
                            </Button>{" "}
                            <Button
                              size="sm"
                              onClick={() =>
                                resolveMutation.mutate({
                                  taskId: task.id,
                                  action: "approve",
                                  notes: "",
                                  feedback: null,
                                })
                              }
                              disabled={resolveMutation.isPending}
                            >
                              {" "}
                              {resolveMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Auto-clear"
                              )}{" "}
                            </Button>{" "}
                          </div>{" "}
                        </TableCell>{" "}
                      </TableRow>
                    );
                  })
                )}{" "}
              </TableBody>{" "}
            </Table>{" "}
          </div>{" "}
        </div>{" "}
      </CardContent>{" "}
      <TaskDetailDialog
        task={selected}
        onClose={() => setSelected(null)}
        onResolve={async ({ action, notes, feedback }) => {
          if (!selected) return;
          await resolveMutation.mutateAsync({
            taskId: selected.id,
            action,
            notes,
            feedback,
          });
        }}
      />{" "}
    </Card>
  );
}
