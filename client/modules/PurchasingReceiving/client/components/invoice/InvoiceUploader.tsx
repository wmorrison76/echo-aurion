import React from "react";

import { AlertTriangle, Loader2, Scan, Upload } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { cn } from "@/lib/utils";
import { extractInvoiceText } from "@/lib/ocr";
import { extractInvoiceFromText } from "@/lib/extract";
import { ensureInvoiceHeader } from "@/lib/invoice";

import type {
  InvoiceExtractionResult,
  StandardizedLineItem,
} from "@shared/api";
import { type PropertyType } from "@/lib/gl_autotag";

interface Props {
  onStandardized?: (items: StandardizedLineItem[]) => void;
  onAttachments?: (urls: string[]) => void;
  onExtracted?: (result: InvoiceExtractionResult) => void;
  onEachExtracted?: (
    result: InvoiceExtractionResult,
    attachmentUrl?: string,
    dataUrl?: string,
  ) => void;
  propertyType?: PropertyType;
}

function normalizeResult(
  res: InvoiceExtractionResult,
): InvoiceExtractionResult {
  return { ...res, header: ensureInvoiceHeader(res.header) };
}

async function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

function combineResults(
  arr: InvoiceExtractionResult[],
): InvoiceExtractionResult {
  const normalized = arr.map(normalizeResult);
  const vendors = Array.from(
    new Set(normalized.map((a) => a.vendor).filter(Boolean)),
  );
  const headerSource = normalized[0]?.header;
  const documentType = normalized[0]?.documentType || "invoice";

  return {
    meta: {
      filename: `${normalized.length} files`,
      mimeType: "multiple",
      pages: normalized.reduce((s, a) => s + (a.meta.pages || 1), 0),
      processedAt: new Date().toISOString(),
    },
    vendor: vendors.length === 1 ? vendors[0] : "Multiple Vendors",
    invoiceNumber:
      normalized.length === 1 ? normalized[0].invoiceNumber : undefined,
    date:
      normalized.length === 1 ? normalized[0].date : new Date().toISOString(),
    documentType,
    rawItems: normalized.flatMap((a) => a.rawItems),
    standardized: normalized.flatMap((a) => a.standardized),
    header: ensureInvoiceHeader(headerSource),
  } as InvoiceExtractionResult;
}

export function InvoiceUploader({
  onStandardized,
  onAttachments,
  onExtracted,
  onEachExtracted,
  propertyType = "resort",
}: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const processFiles = React.useCallback(
    async (files: File[]) => {
      const list = files.filter(Boolean);
      if (!list.length) return;

      setError(null);
      setProcessing(true);
      setProgress(5);

      const results: InvoiceExtractionResult[] = [];
      const urls: string[] = [];

      try {
        for (let i = 0; i < list.length; i += 1) {
          const file = list[i];
          setProgress(Math.round(((i + 0.15) / list.length) * 100));

          let fileUrl: string | undefined;
          try {
            fileUrl = URL.createObjectURL(file);
            urls.push(fileUrl);
          } catch {
            /* ignore */
          }

          let dataUrl: string | undefined;
          try {
            dataUrl = await toDataUrl(file);
          } catch {
            /* ignore */
          }

          const { pages } = await extractInvoiceText(file);
          const fullText = pages.map((p) => p.text).join("\n");
          if (!fullText.trim())
            throw new Error(`No text extracted from ${file.name}`);

          const extracted = normalizeResult(
            extractInvoiceFromText(
              fullText,
              {
                filename: file.name,
                mimeType: file.type || "application/octet-stream",
                pages: pages.length,
              },
              propertyType,
            ),
          );

          results.push(extracted);
          onEachExtracted?.(extracted, fileUrl, dataUrl);
        }

        const combined = combineResults(results);
        setProgress(100);

        onStandardized?.(combined.standardized);
        onAttachments?.(urls);
        onExtracted?.(combined);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to process files");
      } finally {
        setProcessing(false);
        window.setTimeout(() => setProgress(0), 800);
      }
    },
    [onAttachments, onEachExtracted, onExtracted, onStandardized, propertyType],
  );

  const onDrop = React.useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragOver(false);
      if (event.dataTransfer.files && event.dataTransfer.files.length) {
        void processFiles(Array.from(event.dataTransfer.files));
      }
    },
    [processFiles],
  );

  const onChange = React.useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files.length) {
        void processFiles(Array.from(event.target.files));
      }
    },
    [processFiles],
  );

  return (
    <Card className="overflow-hidden border">
      <CardHeader className="space-y-1 p-4 pb-2">
        <CardTitle className="text-xl">Invoice Processing</CardTitle>
        <CardDescription>
          Upload PDFs or images to extract vendor + line items.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 p-4 pt-0">
        <div
          onDrop={onDrop}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
            setDragOver(true);
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragOver(false);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative flex min-h-[140px] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-5 text-center transition sm:p-6",
            dragOver ? "border-primary bg-primary/5" : "hover:border-primary",
          )}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {processing
              ? "Processing…"
              : "Drag & drop invoices here (PDF or images)"}
          </div>
          <div className="text-xs text-muted-foreground">
            You can select multiple files.
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
            <Button
              onClick={(event) => {
                event.stopPropagation();
                inputRef.current?.click();
              }}
              className="w-full sm:w-auto"
            >
              <Scan className="h-4 w-4 mr-2" />
              Choose files
            </Button>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="application/pdf,image/*"
            onChange={onChange}
            className="hidden"
          />
        </div>

        {processing ? (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Processing</div>
            <Progress value={progress} />
          </div>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <div className="font-semibold">Processing Error</div>
              <div className="mt-1 text-sm">{error}</div>
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
