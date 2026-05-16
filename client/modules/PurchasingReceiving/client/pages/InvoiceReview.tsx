import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { logger } from "@/lib/logger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceReviewWorkspace } from "@/components/invoice/InvoiceReviewWorkspace";
import { EchoAssistantPanel } from "@/components/invoice/EchoAssistantPanel";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Store, detectShortages, id } from "@/lib/store";
import { SettingsStore } from "@/lib/settings";
import { updatePurchaseOrderStatus } from "@/lib/orders";
import { standardize } from "@/lib/extract";
import type { PurchaseOrderVariance, Receipt } from "@shared/purchasing";
import type {
  ScannedInvoice,
  ScanStatus,
  StandardizedLineItem,
  InvoiceLineItemRaw,
} from "@shared/api";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { Link, useSearchParams } from "react-router-dom";
import { useDashboardOrderIntegration } from "../../integrations/dashboard-integration";
const statusFilters: { value: "all" | ScanStatus; label: string }[] = [
  { value: "needs_review", label: "Needs Review" },
  { value: "hold", label: "On Hold" },
  { value: "rejected", label: "Rejected" },
  { value: "approved", label: "Approved" },
  { value: "all", label: "All" },
];
const allowedStatusValues = statusFilters.map((filter) => filter.value);
const statusVariant = (status: ScanStatus) => {
  switch (status) {
    case "approved":
      return "default" as const;
    case "rejected":
      return "destructive" as const;
    case "hold":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
};
const normalizeScan = (scan: ScannedInvoice): ScannedInvoice => {
  const standardized = Array.isArray(scan.result.standardized)
    ? scan.result.standardized
    : [];
  const rawItems = Array.isArray(scan.result.rawItems)
    ? scan.result.rawItems
    : [];
  if (
    standardized === scan.result.standardized &&
    rawItems === scan.result.rawItems
  ) {
    return scan;
  }
  return { ...scan, result: { ...scan.result, standardized, rawItems } };
};
const getLineCount = (scan: ScannedInvoice): number => {
  const standardizedCount = Array.isArray(scan.result.standardized)
    ? scan.result.standardized.length
    : 0;
  if (standardizedCount > 0) {
    return standardizedCount;
  }
  return Array.isArray(scan.result.rawItems) ? scan.result.rawItems.length : 0;
};
const ensureStandardizedItems = (
  scan: ScannedInvoice,
): StandardizedLineItem[] => {
  if (
    Array.isArray(scan.result.standardized) &&
    scan.result.standardized.length
  ) {
    return scan.result.standardized;
  }
  if (!Array.isArray(scan.result.rawItems)) {
    return [];
  }
  const vendor = scan.vendorName || scan.result.vendor || "";
  const invoiceNumber =
    scan.result.invoiceNumber || scan.result.meta.filename || "";
  const dateCandidate = scan.result.date || scan.createdAt;
  const parsedDate = dateCandidate ? new Date(dateCandidate) : new Date();
  const dateISO = Number.isNaN(parsedDate.valueOf())
    ? new Date().toISOString()
    : parsedDate.toISOString();
  return scan.result.rawItems
    .map((entry) => standardize(entry as any, vendor, dateISO, invoiceNumber))
    .filter((item): item is StandardizedLineItem => Boolean(item));
};
export default function InvoiceReview() {
  const { toast } = useToast();
  const { publishInvoiceScanned, publishInventoryUpdated } =
    useDashboardOrderIntegration();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const readStatusFromParams = () => {
    const param = searchParams.get("status");
    return allowedStatusValues.includes(param as any)
      ? (param as "all" | ScanStatus)
      : "needs_review";
  };
  const [scans, setScans] = useState(Store.listScans());
  const [pos, setPos] = useState(Store.listPOs());
  const [poVariances, setPoVariances] = useState<PurchaseOrderVariance[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | ScanStatus>(() =>
    readStatusFromParams(),
  );
  const [echoOpen, setEchoOpen] = useState(false);
  const [outletNameByScan, setOutletNameByScan] = useState<
    Record<string, string>
  >({});
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const first =
      Store.listScans().find((scan) => scan.status !== "approved") ||
      Store.listScans()[0];
    return first?.id ?? null;
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const outlets = useMemo(() => Store.listOutlets(), [scans]);
  const vendors = useMemo(() => Store.listVendors(), [scans]);
  useEffect(() => {
    const handlePoSave = () => setPos(Store.listPOs());
    const handleScanSave = () => setScans(Store.listScans());
    const handleScanDelete = () => setScans(Store.listScans());
    window.addEventListener("echo:po:save", handlePoSave as any);
    window.addEventListener("echo:scan:save", handleScanSave as any);
    window.addEventListener("echo:scan:delete", handleScanDelete as any);
    return () => {
      window.removeEventListener("echo:po:save", handlePoSave as any);
      window.removeEventListener("echo:scan:save", handleScanSave as any);
      window.removeEventListener("echo:scan:delete", handleScanDelete as any);
    };
  }, []);
  useEffect(() => {
    if (Store.listScans().length > 0) return;
    const urls = [
      "https://cdn.builder.io/api/v1/image/assets%2F05ea9dd930f746e9a5b34d6195d4d49d%2Fcad4052a3f9740a882c92a9822d13d3c?format=webp&width=1200",
      "https://cdn.builder.io/api/v1/image/assets%2F05ea9dd930f746e9a5b34d6195d4d49d%2F6d822cf62d5a44049ccbcc910a2bac2a?format=webp&width=1200",
    ];
    const vendor = "Mr Greens";
    const dateISO = new Date("2025-08-30").toISOString();
    const invoiceNumber = "KP1590";
    const raw: InvoiceLineItemRaw[] = [
      {
        rawText: "BERRY BLACK 12 x 6 oz $57.50",
        productName: "Berry Black",
        quantity: 2,
        unit: "case",
        packSize: "12 x 6 oz",
        totalCost: 57.5,
        lineNumber: 1,
        confidence: 0.9,
      },
      {
        rawText: "BERRY RASPBERRY 12 x 6 oz $52.25",
        productName: "Berry Raspberry",
        quantity: 2,
        unit: "case",
        packSize: "12 x 6 oz",
        totalCost: 52.25,
        lineNumber: 2,
        confidence: 0.9,
      },
      {
        rawText: "BERRY STRAWBERRY 8 x 16 oz $48.50",
        productName: "Berry Strawberry",
        quantity: 2,
        unit: "case",
        packSize: "8 x 16 oz",
        totalCost: 48.5,
        lineNumber: 3,
        confidence: 0.9,
      },
      {
        rawText: "MANGO RIPE $25.50",
        productName: "Mango Ripe",
        quantity: 2,
        unit: "case",
        packSize: "12 x 8 oz",
        totalCost: 25.5,
        lineNumber: 4,
        confidence: 0.8,
      },
      {
        rawText: "MUSTARD WHL GRAIN CLOVIS 2/7.4# $8.41",
        productName: "Mustard Whl Grain Clovis",
        quantity: 1,
        unit: "case",
        packSize: "2 x 7.4 lb",
        totalCost: 8.41,
        lineNumber: 5,
        confidence: 0.8,
      },
      {
        rawText: "PINEAPPLE 8 CT $9.19",
        productName: "Pineapple 8 ct",
        quantity: 3,
        unit: "each",
        packSize: "8 x 1 each",
        totalCost: 9.19,
        lineNumber: 6,
        confidence: 0.7,
      },
      {
        rawText: "WATERMELON SEEDLESS 5 CT $28.25",
        productName: "Watermelon Seedless 5 ct",
        quantity: 1,
        unit: "each",
        packSize: "5 x 1 each",
        totalCost: 28.25,
        lineNumber: 7,
        confidence: 0.7,
      },
    ] as any;
    const standardized = raw
      .map((entry) => standardize(entry as any, vendor, dateISO, invoiceNumber))
      .filter(Boolean) as import("@shared/api").StandardizedLineItem[];
    const scan: ScannedInvoice = {
      id: id(),
      result: {
        meta: {
          filename: "MrGreens-KP1590.pdf",
          mimeType: "image/webp",
          pages: 2,
          processedAt: new Date().toISOString(),
        },
        vendor,
        invoiceNumber,
        date: dateISO,
        rawItems: raw as any,
        standardized,
        header: undefined,
      },
      attachments: urls,
      vendorName: vendor,
      outletId: null,
      createdAt: new Date().toISOString(),
      createdBy: user?.name || null,
      status: "needs_review",
    };
    Store.setScanAttachments(scan.id, urls);
    Store.saveScan(scan);
    setScans(Store.listScans());
  }, [user?.name]);
  useEffect(() => {
    const next = readStatusFromParams();
    if (next !== statusFilter) {
      setStatusFilter(next);
    }
  }, [searchParams, statusFilter]);
  useEffect(() => {
    setSelectedIds((prev) => {
      if (!prev.length) return prev;
      const existing = new Set(scans.map((scan) => scan.id));
      return prev.filter((id) => existing.has(id));
    });
  }, [scans]);
  useEffect(() => {
    if (!selectedIds.length) {
      setDeleteDialogOpen(false);
    }
  }, [selectedIds.length]);
  const sortedScans = useMemo(() => {
    return scans
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [scans]);
  const visibleScans = useMemo(() => {
    if (statusFilter === "all") return sortedScans;
    return sortedScans.filter((scan) => scan.status === statusFilter);
  }, [sortedScans, statusFilter]);
  useEffect(() => {
    if (!visibleScans.length) {
      setSelectedId(sortedScans[0]?.id ?? null);
      return;
    }
    if (!selectedId || !visibleScans.some((scan) => scan.id === selectedId)) {
      setSelectedId(visibleScans[0].id);
    }
  }, [visibleScans, selectedId, sortedScans]);
  const visibleIds = useMemo(
    () => visibleScans.map((scan) => scan.id),
    [visibleScans],
  );
  const selectionState = useMemo<CheckedState>(() => {
    if (!visibleIds.length) return false;
    const selectedCount = visibleIds.reduce(
      (count, id) => (selectedIds.includes(id) ? count + 1 : count),
      0,
    );
    if (selectedCount === 0) return false;
    if (selectedCount === visibleIds.length) return true;
    return "indeterminate";
  }, [selectedIds, visibleIds]);
  const hasSelections = selectedIds.length > 0;
  const activeIndex = visibleScans.findIndex((scan) => scan.id === selectedId);
  const selectedScan =
    activeIndex >= 0 ? visibleScans[activeIndex] : (visibleScans[0] ?? null);
  const positionLabel =
    activeIndex >= 0 ? `${activeIndex + 1} / ${visibleScans.length}` : "—";
  const normalizedSelectedScan = selectedScan
    ? normalizeScan(selectedScan)
    : null;
  const resolvedOutletName = normalizedSelectedScan
    ? outlets.find((outlet) => outlet.id === normalizedSelectedScan.outletId)
        ?.name ||
      normalizedSelectedScan.vendorCodeMatch?.outletName ||
      outletNameByScan[normalizedSelectedScan.id] ||
      ""
    : "";
  const ensureVendorId = (name: string) => Store.ensureVendorByName(name).id;
  const ensureOutletId = (name: string) => Store.ensureOutletByName(name).id;
  const postReceiptFromScan = async (
    scan: ScannedInvoice,
    stdItems: StandardizedLineItem[],
    outletName?: string,
  ) => {
    const vendorId = ensureVendorId(scan.vendorName);
    const fallbackOutletId =
      outlets[0]?.id || Store.ensureOutletByName("Main Kitchen").id;
    const outletId = outletName
      ? ensureOutletId(outletName)
      : scan.outletId || fallbackOutletId;
    const settings = SettingsStore.get();
    const po = pos.find((p) => p.vendorId === vendorId) || pos[0];
    const rec: Receipt & {
      createdBy: string;
      attachments: string[];
      approved?: boolean;
      outletId?: string | null;
    } = {
      id: id(),
      poId: po?.id || null,
      vendorId,
      invoiceNumber: stdItems[0]?.invoiceNumber || null,
      date: new Date().toISOString(),
      createdBy: user?.name || "",
      attachments: scan.attachments,
      outletId,
      lines: stdItems.map((item) => ({
        id: id(),
        productName: item.productName,
        qty: item.quantityPurchaseUnit.totalStandardUnits,
        unit: item.standardized.standardUnit,
        totalCost: item.totalCost,
        poItemId:
          po?.items.find((poItem) =>
            item.productName
              .toLowerCase()
              .includes(poItem.productName.toLowerCase()),
          )?.id || null,
        glCodeId: null,
      })),
      shortages: [],
      approved: settings.accountSetupMode ? true : undefined,
    };
    if (po) rec.shortages = detectShortages(po, rec);
    Store.saveReceipt(rec); // Publish invoice scanned event publishInvoiceScanned({ invoiceId: rec.id, vendor: scan.vendorName, outletId: outletId || undefined, lineItemCount: rec.lines.length, }); let totalValue = 0; rec.lines.forEach((line, idx) => { const pack = scan.result.rawItems?.[idx]?.packSize || null; Store.upsertItemFromReceipt( outletId || null, rec.vendorId || null, line, rec.id, rec.date, pack, ); totalValue += line.totalCost || 0; }); // Publish inventory updated event publishInventoryUpdated({ outletId: outletId ||"", itemCount: rec.lines.length, totalValue, }); const attachmentsForScan = scan.attachments?.length ? scan.attachments : Store.getScanAttachments(scan.id); for (const url of attachmentsForScan) { Store.saveImage({ id: id(), name: rec.invoiceNumber || scan.result.meta.filename, url, mimeType: scan.result.meta.mimeType, outletId, vendor: scan.vendorName, createdAt: new Date().toISOString(), }); } let varianceSummary: string | null = null; let reconciliationVariances: PurchaseOrderVariance[] = []; if (po) { const reconciliationInput = stdItems .map((item, idx) => { const raw = scan.result.rawItems?.[idx]; const qty = item.quantityPurchaseUnit.quantity || raw?.quantity || 0; const unit = item.quantityPurchaseUnit.unit || raw?.unit || item.standardized.standardUnit; const totalCost = item.totalCost ?? raw?.totalCost ?? 0; return { itemId: null, productName: item.productName || raw?.productName || raw?.rawText ||"Unknown", qty: qty || 0, unit: unit ||"ea", totalCost, unitPrice: qty ? totalCost / qty : undefined, }; }) .filter((line) => line.qty > 0 || line.totalCost > 0); const previousStatus = po.status; const { po: updatedPO, variances } = Store.applyInvoiceToPO( po.id, reconciliationInput, ); reconciliationVariances = variances; if (updatedPO) setPos(Store.listPOs()); if (updatedPO && updatedPO.status !== previousStatus) { try { await updatePurchaseOrderStatus(updatedPO.id, { status: updatedPO.status, eta: updatedPO.eta ?? updatedPO.expectedDate ?? null, }); } catch (error) { logger.error("Failed to sync PO status", error); } } if (variances.length) { varianceSummary = `${variances.length} variance${variances.length > 1 ?"s" :""} detected`; } } setPoVariances(reconciliationVariances); toast({ title:"Receipt posted", description: `${rec.lines.length} lines${rec.shortages.length ? ` • ${rec.shortages.length} shortages` :""}${varianceSummary ? ` • ${varianceSummary}` :""}`, }); scan.status ="approved"; scan.outletId = outletId; Store.saveScan(scan); setOutletNameByScan((prev) => ({ ...prev, [scan.id]: outletName || prev[scan.id] ||"", })); setScans(Store.listScans()); }; const updateScanStatus = (scan: ScannedInvoice, status: ScanStatus) => { scan.status = status; Store.saveScan(scan); setScans(Store.listScans()); }; const handleApprove = async (rawScan: ScannedInvoice, outletName: string) => { const scan = normalizeScan(rawScan); const standardizedItems = ensureStandardizedItems(scan); await postReceiptFromScan(scan, standardizedItems, outletName); }; const handleHold = (scan: ScannedInvoice) => updateScanStatus(scan,"hold"); const handleReject = (scan: ScannedInvoice) => updateScanStatus(scan,"rejected"); const handleChangeScan = (updated: ScannedInvoice) => { Store.saveScan(updated); setScans(Store.listScans()); }; const handleSetOutletName = (name: string) => { if (!selectedScan) return; setOutletNameByScan((prev) => ({ ...prev, [selectedScan.id]: name })); const normalized = name.trim(); if (!normalized) { const next: ScannedInvoice = { ...selectedScan, outletId: null, vendorCodeMatch: null, }; handleChangeScan(next); return; } const match = outlets.find( (outlet) => outlet.name.toLowerCase() === normalized.toLowerCase(), ); if (match) { const next: ScannedInvoice = { ...selectedScan, outletId: match.id, vendorCodeMatch: selectedScan.vendorCodeMatch?.outletId === match.id ? { ...selectedScan.vendorCodeMatch, outletName: match.name } : null, }; handleChangeScan(next); } }; const toggleSelection = (id: string, next: CheckedState) => { const shouldSelect = next === true || next ==="indeterminate"; setSelectedIds((prev) => { if (shouldSelect) { const nextSet = new Set(prev); nextSet.add(id); return Array.from(nextSet); } return prev.filter((entry) => entry !== id); }); }; const handleSelectAll = (next: CheckedState) => { const shouldSelect = next === true || next ==="indeterminate"; if (shouldSelect) { setSelectedIds((prev) => { const nextSet = new Set(prev); visibleIds.forEach((id) => nextSet.add(id)); return Array.from(nextSet); }); } else { const visibleSet = new Set(visibleIds); setSelectedIds((prev) => prev.filter((id) => !visibleSet.has(id))); } }; const deleteSelectedScans = () => { const count = selectedIds.length; if (!count) { setDeleteDialogOpen(false); return; } Store.deleteScans(selectedIds); const nextList = Store.listScans(); setScans(nextList); setSelectedIds([]); if (selectedId && !nextList.some((scan) => scan.id === selectedId)) { setSelectedId(nextList[0]?.id ?? null); } toast({ title:"Scans deleted", description: `${count} invoice${count === 1 ?"" :"s"} removed from the queue`, }); setDeleteDialogOpen(false); }; return ( <AppLayout> <div className="space-y-4"> <div className="rounded-lg border bg-card"> <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2"> <div> <div className="text-lg font-semibold leading-tight"> Scanned Invoices </div> <p className="text-xs text-muted-foreground"> Select an invoice to review and correct line items. </p> </div> <div className="flex flex-wrap items-center gap-2"> <div className="flex items-center gap-2 rounded-md border px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground"> <Checkbox id="select-visible-scans" checked={selectionState} onCheckedChange={handleSelectAll} aria-label="Select visible scans" /> <label htmlFor="select-visible-scans" className="cursor-pointer select-none" > Select visible </label> </div> <AlertDialog open={deleteDialogOpen} onOpenChange={(next) => { if (next && !hasSelections) return; setDeleteDialogOpen(next); }} > <AlertDialogTrigger asChild> <Button variant="destructive" size="sm" disabled={!hasSelections} > Delete selected </Button> </AlertDialogTrigger> <AlertDialogContent> <AlertDialogHeader> <AlertDialogTitle> Delete {selectedIds.length} scanned{""} {selectedIds.length === 1 ?"invoice" :"invoices"}? </AlertDialogTitle> <AlertDialogDescription> This action permanently removes the selected{""} {selectedIds.length === 1 ?"invoice" :"invoices"} and their attachments. This cannot be undone. </AlertDialogDescription> </AlertDialogHeader> <AlertDialogFooter> <AlertDialogCancel>Cancel</AlertDialogCancel> <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={deleteSelectedScans} > Delete </AlertDialogAction> </AlertDialogFooter> </AlertDialogContent> </AlertDialog> <Button size="sm" onClick={() => setEchoOpen(true)}> Ask Echo </Button> <Button asChild variant="outline" size="sm"> <Link to="/invoice-drop">Upload invoices</Link> </Button> </div> </div> <div className="px-3 pb-3"> <Tabs value={statusFilter} onValueChange={(value) => { const next = value as"all" | ScanStatus; setStatusFilter(next); const nextParams = new URLSearchParams(searchParams); if (next ==="needs_review") { nextParams.delete("status"); } else { nextParams.set("status", next); } setSearchParams(nextParams); }} > <TabsList className="mb-3"> {statusFilters.map((filter) => ( <TabsTrigger key={filter.value} value={filter.value}> {filter.label} </TabsTrigger> ))} </TabsList> <TabsContent value={statusFilter} className="m-0"> {visibleScans.length ? ( <div className="max-h-[420px] overflow-y-auto pr-1"> <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3"> {visibleScans.map((scan) => { const outletName = outlets.find((outlet) => outlet.id === scan.outletId) ?.name || scan.vendorCodeMatch?.outletName || outletNameByScan[scan.id] ||""; const isActive = selectedScan && scan.id === selectedScan.id; const isSelected = selectedIds.includes(scan.id); const createdAt = new Date(scan.createdAt); const formattedCreatedAt = Number.isNaN( createdAt.valueOf(), ) ? scan.createdAt : createdAt.toLocaleString(); const summaryText = `${formattedCreatedAt} – ${ scan.vendorName ||"Unknown Vendor" } – Outlet: ${outletName ||"—"}`; const lineCount = getLineCount(scan); const lineLabel = `${lineCount} ${lineCount === 1 ?"line" :"lines"}`; return ( <div key={scan.id} className="relative"> <button type="button" onClick={() => setSelectedId(scan.id)} className={cn("w-full rounded-md border pl-7 pr-2 py-1.5 text-left text-[11px] leading-tight transition-shadow sm:text-xs", isActive ?"border-primary shadow-[0_0_0_2px_rgba(59,130,246,0.4)]" :"hover:shadow", isSelected &&"border-destructive/70 shadow-[0_0_0_1px_rgba(239,68,68,0.45)]", )} > <div className="flex items-center gap-2"> <span className="truncate font-medium text-foreground"> {summaryText} </span> <span className="shrink-0 text-muted-foreground"> – </span> <Badge variant={statusVariant(scan.status)} className="shrink-0 capitalize" > {scan.status.replace("_","")} </Badge> <span className="ml-auto shrink-0 whitespace-nowrap text-[10px] uppercase tracking-wide text-muted-foreground"> {lineLabel} </span> </div> </button> <Checkbox checked={isSelected} onCheckedChange={(next) => toggleSelection(scan.id, next) } className="absolute left-2 top-2 h-4 w-4" onClick={(event) => event.stopPropagation()} aria-label={`Select invoice ${summaryText}`} /> </div> ); })} </div> </div> ) : ( <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground"> No invoices in this state yet. </div> )} </TabsContent> </Tabs> </div> </div> <InvoiceReviewWorkspace scan={normalizedSelectedScan} outletName={resolvedOutletName} hasPrev={activeIndex > 0} hasNext={activeIndex >= 0 && activeIndex < visibleScans.length - 1} positionLabel={positionLabel} onNavigate={(direction) => { if (!normalizedSelectedScan) return; const nextIndex = direction ==="prev" ? activeIndex - 1 : activeIndex + 1; if (nextIndex >= 0 && nextIndex < visibleScans.length) { setSelectedId(visibleScans[nextIndex].id); } }} onApprove={handleApprove} onHold={handleHold} onReject={handleReject} onChangeScan={handleChangeScan} setOutletName={handleSetOutletName} /> {poVariances.length > 0 && ( <div className="rounded-lg border"> <div className="border-b px-3 py-2.5"> <div className="text-sm font-semibold">Reconciliation Alerts</div> <p className="text-xs text-muted-foreground"> Compare expected vs received to resolve variances. </p> </div> <div className="max-h-[360px] overflow-auto"> <Table> <TableHeader> <TableRow> <TableHead>Product</TableHead> <TableHead>Expected Qty</TableHead> <TableHead>Received Qty</TableHead> <TableHead>Unit</TableHead> <TableHead>Expected Price</TableHead> <TableHead>Received Price</TableHead> <TableHead>Message</TableHead> </TableRow> </TableHeader> <TableBody> {poVariances.map((variance) => ( <TableRow key={`${variance.poId}-${variance.productName}-${variance.poItemId ??"none"}`} > <TableCell className="font-medium"> {variance.productName} </TableCell> <TableCell>{variance.expectedQty}</TableCell> <TableCell>{variance.receivedQty}</TableCell> <TableCell>{variance.unit}</TableCell> <TableCell>{variance.unitPriceExpected ??"—"}</TableCell> <TableCell>{variance.unitPriceReceived ??"—"}</TableCell> <TableCell>{variance.message}</TableCell> </TableRow> ))} </TableBody> </Table> </div> </div> )} </div> <EchoAssistantPanel open={echoOpen} onOpenChange={setEchoOpen} scan={selectedScan ?? null} outletName={resolvedOutletName} /> </AppLayout> );
  };
}
