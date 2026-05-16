import React from "react";
import { Link } from "react-router-dom";

import { AppLayout } from "@/components/AppLayout";
import { AttachmentViewer } from "@/components/invoice/AttachmentViewer";
import { InvoiceUploader } from "@/components/invoice/InvoiceUploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

import type { InvoiceExtractionResult, ScannedInvoice } from "@shared/api";
import { Store, id } from "@/lib/store";

import { ChevronDown } from "lucide-react";

export default function InvoiceDrop() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [attachments, setAttachments] = React.useState<string[]>([]);
  const [attachmentsExpanded, setAttachmentsExpanded] = React.useState(true);
  const [lastResult, setLastResult] =
    React.useState<InvoiceExtractionResult | null>(null);
  const [scans, setScans] = React.useState(() => Store.listScans());

  const vendors = React.useMemo(() => Store.listVendors(), [scans]);

  const statusCounts = React.useMemo(() => {
    return {
      needs_review: scans.filter((scan) => scan.status === "needs_review")
        .length,
      hold: scans.filter((scan) => scan.status === "hold").length,
      rejected: scans.filter((scan) => scan.status === "rejected").length,
      approved: scans.filter((scan) => scan.status === "approved").length,
    } satisfies Record<
      "needs_review" | "hold" | "rejected" | "approved",
      number
    >;
  }, [scans]);

  const queueEntries = React.useMemo(
    () =>
      [
        {
          label: "Needs review",
          value: "needs_review",
          badgeVariant: "default" as const,
        },
        { label: "On hold", value: "hold", badgeVariant: "outline" as const },
        {
          label: "Rejected",
          value: "rejected",
          badgeVariant: "destructive" as const,
        },
        {
          label: "Approved",
          value: "approved",
          badgeVariant: "secondary" as const,
        },
      ] as const,
    [],
  );

  React.useEffect(() => {
    const handleScanSave = () => setScans(Store.listScans());
    window.addEventListener("echo:scan:save", handleScanSave as any);
    return () =>
      window.removeEventListener("echo:scan:save", handleScanSave as any);
  }, []);

  React.useEffect(() => {
    if (attachments.length && !attachmentsExpanded)
      setAttachmentsExpanded(true);
  }, [attachments, attachmentsExpanded]);

  const onEachExtracted = React.useCallback(
    (
      result: InvoiceExtractionResult,
      attachmentUrl?: string,
      dataUrl?: string,
    ) => {
      const vendorName = result.vendor || "Unknown Vendor";
      const vendorCodeMatch = result.vendorCodeMatch ?? null;
      const matchedOutletId =
        vendorCodeMatch?.outletId ?? result.suggestedOutletId ?? null;

      const scan: ScannedInvoice = {
        id: id(),
        result,
        attachments: dataUrl ? [dataUrl] : attachmentUrl ? [attachmentUrl] : [],
        vendorName,
        outletId: matchedOutletId,
        vendorCodeMatch,
        createdAt: new Date().toISOString(),
        createdBy: user?.name || null,
        status: "needs_review",
      };

      if (scan.attachments?.length) {
        Store.setScanAttachments(scan.id, scan.attachments);
      }

      const knownVendor = vendors.find(
        (vendor) => vendor.name.toLowerCase() === vendorName.toLowerCase(),
      );
      if (!knownVendor) {
        const newlyCreated = Store.ensureVendorByName(vendorName);
        try {
          window.dispatchEvent(
            new CustomEvent("echo:new_vendor", { detail: newlyCreated }),
          );
        } catch {
          /* ignore */
        }
      }

      Store.saveScan(scan);
      setScans(Store.listScans());

      toast({
        title: "Invoice queued",
        description: `${vendorName} • ${result.standardized.length} lines ready for review`,
      });
    },
    [toast, user?.name, vendors],
  );

  return (
    <AppLayout>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <Card className="border-2">
            <CardHeader className="space-y-1 p-5 pb-3">
              <CardTitle className="text-xl">Invoice Drop</CardTitle>
              <CardDescription>
                Upload PDF or image invoices. They will be queued for review and
                learning.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-5 pt-0">
              <InvoiceUploader
                onAttachments={(urls) => setAttachments(urls)}
                onExtracted={(result) => setLastResult(result)}
                onEachExtracted={onEachExtracted}
              />

              <div className="rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-medium text-foreground">
                    Attachments this session
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{attachments.length}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        setAttachmentsExpanded((expanded) => !expanded)
                      }
                      aria-expanded={attachmentsExpanded}
                      aria-label="Toggle attachments"
                    >
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          attachmentsExpanded ? "rotate-180" : "",
                        )}
                      />
                    </Button>
                  </div>
                </div>

                {attachmentsExpanded ? (
                  <div className="border-t px-3 pb-3">
                    {attachments.length ? (
                      <div className="mt-3 rounded-md border bg-background p-2">
                        <AttachmentViewer urls={attachments} />
                      </div>
                    ) : (
                      <div className="mt-3 flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                        Drop or upload a file above to preview the invoice.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  {scans.length} total scans in queue.
                </div>
                <Button asChild size="sm">
                  <Link to="/invoice-review">Review scanned invoices</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {lastResult ? (
            <Card className="border">
              <CardHeader className="px-5 pb-2 pt-5">
                <CardTitle className="text-lg">Last invoice snapshot</CardTitle>
                <CardDescription>
                  {lastResult.vendor || "Unknown Vendor"} •{" "}
                  {lastResult.invoiceNumber || "No invoice number"} •{" "}
                  {lastResult.standardized.length} lines
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 px-5 pb-5">
                <dl className="grid gap-2 text-sm">
                  <div className="grid grid-cols-[120px_1fr] gap-3">
                    <dt className="text-muted-foreground">Invoice Date</dt>
                    <dd>
                      {lastResult.date
                        ? new Date(lastResult.date).toLocaleDateString()
                        : "—"}
                    </dd>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-3">
                    <dt className="text-muted-foreground">Detected Vendor</dt>
                    <dd>{lastResult.vendor || "Unknown"}</dd>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-3">
                    <dt className="text-muted-foreground">
                      Low Confidence Lines
                    </dt>
                    <dd>
                      {
                        lastResult.rawItems.filter(
                          (item) => (item.confidence ?? 1) < 0.7,
                        ).length
                      }
                    </dd>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-3">
                    <dt className="text-muted-foreground">Total Pages</dt>
                    <dd>{lastResult.meta.pages}</dd>
                  </div>
                </dl>
                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  Corrections made during review will teach the scanner and
                  auto-apply to future invoices from the same vendor.
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="border">
            <CardHeader className="px-5 pb-2 pt-5">
              <CardTitle className="text-lg">Queue overview</CardTitle>
              <CardDescription>
                Track how many invoices need attention before approving.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5 text-sm">
              {queueEntries.map((entry) => (
                <Link
                  key={entry.value}
                  to={`/invoice-review?status=${entry.value}`}
                  className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={`View ${entry.label.toLowerCase()} invoices`}
                >
                  <span>{entry.label}</span>
                  <Badge variant={entry.badgeVariant}>
                    {statusCounts[entry.value]}
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border">
            <CardHeader className="px-5 pb-2 pt-5">
              <CardTitle className="text-lg">Next steps</CardTitle>
              <CardDescription>
                After uploading, head to the review workspace to approve and
                train the model.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5 text-sm text-muted-foreground">
              <p>
                Confirm vendor, header fields, and quantities on the review
                page. Edits are captured to improve future scans.
              </p>
              <p>
                Approving an invoice archives it, updates inventory, and keeps
                attachments for audit trail.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
