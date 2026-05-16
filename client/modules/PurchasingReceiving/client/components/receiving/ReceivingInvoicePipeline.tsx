import React, { useState } from "react";
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
import { FileText, Loader2 } from "lucide-react";
import { useMultiOutlet } from "@/context/MultiOutletContext";
import { useAuth } from "@/context/AuthContext";
import { processReceivingInvoice } from "../../services/receiving-cogs-pipeline";

export default function ReceivingInvoicePipeline() {
  const { currentOutlet } = useMultiOutlet();
  const { user } = useAuth();
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceVendor, setInvoiceVendor] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [processingState, setProcessingState] = useState<
    "idle" | "processing" | "done" | "error"
  >("idle");
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [pipelineResult, setPipelineResult] = useState<any>(null);

  const handleRunPipeline = async () => {
    if (!invoiceFile) {
      setProcessingError("Select an invoice file to continue.");
      setProcessingState("error");
      return;
    }
    if (!user?.org_id) {
      setProcessingError("Missing organization ID.");
      setProcessingState("error");
      return;
    }
    setProcessingState("processing");
    setProcessingError(null);
    try {
      const result = await processReceivingInvoice({
        file: invoiceFile,
        organizationId: user.org_id,
        outletId: currentOutlet?.id || user.outlet || "default-outlet",
        invoiceId: invoiceNumber || undefined,
        invoiceNumber: invoiceNumber || undefined,
        vendorName: invoiceVendor || undefined,
        date: invoiceDate,
      });
      setPipelineResult(result);
      setProcessingState("done");
    } catch (error) {
      setProcessingError(
        error instanceof Error ? error.message : "Pipeline failed",
      );
      setProcessingState("error");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <FileText className="h-4 w-4" /> OCR → GL → COGS pipeline
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs text-slate-400">Vendor</label>
          <Input
            value={invoiceVendor}
            onChange={(e) => setInvoiceVendor(e.target.value)}
            placeholder="Vendor name"
            className="bg-slate-800 border-slate-600 mt-1 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">Invoice #</label>
          <Input
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="INV-0001"
            className="bg-slate-800 border-slate-600 mt-1 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">Invoice date</label>
          <Input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="bg-slate-800 border-slate-600 mt-1 text-sm"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
          className="bg-slate-800 border-slate-600 text-sm"
        />
        <Button
          onClick={handleRunPipeline}
          disabled={processingState === "processing"}
          className="h-9"
        >
          {processingState === "processing" ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing
            </>
          ) : (
            <>Run Pipeline</>
          )}
        </Button>
      </div>
      {processingError && (
        <Alert className="border-red-400/30 bg-red-500/5">
          <AlertDescription className="text-red-400 text-sm">
            {processingError}
          </AlertDescription>
        </Alert>
      )}
      {processingState === "done" && pipelineResult && (
        <div className="space-y-3">
          <Alert className="border-emerald-400/30 bg-emerald-500/5">
            <AlertDescription className="text-emerald-300 text-sm">
              Pipeline complete:{" "}
              {pipelineResult.automation?.summary?.matchedItems || 0}{" "}
              auto-matched,
              {pipelineResult.automation?.summary?.needsReview || 0} need
              review.
            </AlertDescription>
          </Alert>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">
                    Item
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">
                    Total
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">
                    GL
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">
                    Category
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pipelineResult.glAllocations || []).map((row: any) => (
                  <TableRow
                    key={`${row.lineItem.productName}-${row.glCode || "na"}`}
                    className="border-border"
                  >
                    <TableCell className="text-xs p-2">
                      {row.lineItem.productName}
                    </TableCell>
                    <TableCell className="text-xs p-2">
                      ${row.lineItem.totalCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs p-2">
                      {row.glCode || "Unmapped"}
                    </TableCell>
                    <TableCell className="text-xs p-2">
                      {row.lineItem?.standardized?.categories?.tier1 || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
