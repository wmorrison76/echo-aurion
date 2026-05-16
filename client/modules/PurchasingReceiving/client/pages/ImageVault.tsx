import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { AttachmentViewer } from "@/components/invoice/AttachmentViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Store } from "@/lib/store";
import type {
  InvoiceLineItemRaw,
  ScanStatus,
  ScannedInvoice,
  StandardizedLineItem,
} from "@shared/api";
type FilteredEntry = { scan: ScannedInvoice; outletName: string };
const normalize = (value: string) => value.trim().toLowerCase();
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
const getAttachmentUrls = (scan: ScannedInvoice): string[] => {
  const fromScan = Array.isArray(scan.attachments) ? scan.attachments : [];
  const cached = Store.getScanAttachments(scan.id) || [];
  const dedup = new Set<string>([...fromScan, ...cached]);
  return Array.from(dedup).filter(Boolean);
};
const DEFAULT_FILTERS: FilterState = { vendor: "", outlet: "", item: "" };
export default function ImageVault() {
  const [scans, setScans] = useState(Store.listScans());
  const [outlets, setOutlets] = useState(Store.listOutlets());
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  useEffect(() => {
    const handleScanSave = () => setScans(Store.listScans());
    const handleOutletSave = () => setOutlets(Store.listOutlets());
    window.addEventListener("echo:scan:save", handleScanSave as any);
    window.addEventListener("echo:outlet:save", handleOutletSave as any);
    return () => {
      window.removeEventListener("echo:scan:save", handleScanSave as any);
      window.removeEventListener("echo:outlet:save", handleOutletSave as any);
    };
  }, []);
  const outletNameById = useMemo(() => {
    const map = new Map<string, string>();
    outlets.forEach((outlet) => map.set(outlet.id, outlet.name));
    return map;
  }, [outlets]);
  const approvedScans = useMemo(
    () => scans.filter((scan) => scan.status === "approved"),
    [scans],
  );
  const filteredScans = useMemo<FilteredEntry[]>(() => {
    const vendorFilter = normalize(filters.vendor);
    const outletFilter = normalize(filters.outlet);
    const itemFilter = normalize(filters.item);
    return [...approvedScans]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .reduce<FilteredEntry[]>((acc, scan) => {
        const outletName =
          (scan.outletId && outletNameById.get(scan.outletId)) ||
          scan.vendorCodeMatch?.outletName ||
          "";
        if (
          vendorFilter &&
          !(scan.vendorName || "").toLowerCase().includes(vendorFilter)
        ) {
          return acc;
        }
        if (outletFilter && !outletName.toLowerCase().includes(outletFilter)) {
          return acc;
        }
        if (itemFilter) {
          const standardizedMatches = (scan.result.standardized || []).some(
            (item) => {
              const haystack = [
                item.productName,
                item.standardized?.standardizedName,
              ]
                .filter(Boolean)
                .join("")
                .toLowerCase();
              return haystack.includes(itemFilter);
            },
          );
          const rawMatches = (scan.result.rawItems || []).some((raw) => {
            const haystack = [
              raw.productName,
              raw.rawText,
              raw.category,
              raw.glCode,
            ]
              .filter(Boolean)
              .join("")
              .toLowerCase();
            return haystack.includes(itemFilter);
          });
          if (!standardizedMatches && !rawMatches) {
            return acc;
          }
        }
        acc.push({ scan, outletName });
        return acc;
      }, []);
  }, [approvedScans, filters, outletNameById]);
  const selectedEntryFromFiltered = useMemo(
    () =>
      filteredScans.find((entry) => entry.scan.id === selectedScanId) ?? null,
    [filteredScans, selectedScanId],
  );
  const selectedEntryFallback = useMemo(() => {
    if (!selectedScanId) {
      return null;
    }
    const scan = approvedScans.find((entry) => entry.id === selectedScanId);
    if (!scan) {
      return null;
    }
    const outletName =
      (scan.outletId && outletNameById.get(scan.outletId)) ||
      scan.vendorCodeMatch?.outletName ||
      "";
    return { scan, outletName } satisfies FilteredEntry;
  }, [approvedScans, outletNameById, selectedScanId]);
  const activeEntry = selectedEntryFromFiltered ?? selectedEntryFallback;
  const selectedScan = activeEntry?.scan ?? null;
  const selectedOutletName = activeEntry?.outletName ?? "";
  const attachmentUrls = useMemo(
    () => (selectedScan ? getAttachmentUrls(selectedScan) : []),
    [selectedScan],
  );
  const standardizedItems = selectedScan?.result.standardized ?? [];
  const rawItems = selectedScan?.result.rawItems ?? [];
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }),
    [],
  );
  const hasActiveFilters =
    Boolean(filters.vendor.trim()) ||
    Boolean(filters.outlet.trim()) ||
    Boolean(filters.item.trim());
  const handleFilterChange = useCallback(
    (field: keyof FilterState) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFilters((previous) => ({ ...previous, [field]: value }));
    },
    [],
  );
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);
  const handleOpenDialog = useCallback((scan: ScannedInvoice) => {
    setSelectedScanId(scan.id);
    setDialogOpen(true);
  }, []);
  const handleDialogChange = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedScanId(null);
    }
  }, []);
  return (
    <AppLayout>
      {" "}
      <div className="space-y-5">
        {" "}
        <div className="space-y-1.5">
          {" "}
          <h1 className="text-2xl font-semibold tracking-tight">
            Image Vault
          </h1>{" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            Browse accepted invoice scans and quickly find historical
            attachments by searching vendor, outlet, or line items.{" "}
          </p>{" "}
        </div>{" "}
        <div className="rounded-lg border bg-muted/10 p-4">
          {" "}
          <div className="grid gap-3 md:grid-cols-3">
            {" "}
            <Input
              value={filters.vendor}
              onChange={handleFilterChange("vendor")}
              placeholder="Search vendor"
              aria-label="Search by vendor"
            />{" "}
            <Input
              value={filters.outlet}
              onChange={handleFilterChange("outlet")}
              placeholder="Search outlet"
              aria-label="Search by outlet"
            />{" "}
            <Input
              value={filters.item}
              onChange={handleFilterChange("item")}
              placeholder="Search items"
              aria-label="Search by item"
            />{" "}
          </div>{" "}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {" "}
            <span>
              {" "}
              {filteredScans.length}
              {""} {filteredScans.length === 1 ? "invoice" : "invoices"}{" "}
              matched{" "}
            </span>{" "}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
            >
              {" "}
              Clear filters{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
        <div className="rounded-lg border bg-card">
          {" "}
          <ScrollArea className="max-h-[520px]">
            {" "}
            <div className="min-w-[780px]">
              {" "}
              <Table>
                {" "}
                <TableHeader>
                  {" "}
                  <TableRow>
                    {" "}
                    <TableHead className="w-48 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {" "}
                      Date / Time{" "}
                    </TableHead>{" "}
                    <TableHead className="min-w-[160px] text-[11px] uppercase tracking-wide text-muted-foreground">
                      {" "}
                      Vendor{" "}
                    </TableHead>{" "}
                    <TableHead className="min-w-[140px] text-[11px] uppercase tracking-wide text-muted-foreground">
                      {" "}
                      Outlet{" "}
                    </TableHead>{" "}
                    <TableHead className="w-32 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {" "}
                      Invoice #{" "}
                    </TableHead>{" "}
                    <TableHead className="w-28 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {" "}
                      Lines{" "}
                    </TableHead>{" "}
                    <TableHead className="w-48 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {" "}
                      Status{" "}
                    </TableHead>{" "}
                    <TableHead className="w-28 text-[11px] uppercase tracking-wide text-muted-foreground text-right">
                      {" "}
                      Actions{" "}
                    </TableHead>{" "}
                  </TableRow>{" "}
                </TableHeader>{" "}
                <TableBody>
                  {" "}
                  {filteredScans.length === 0 ? (
                    <TableRow>
                      {" "}
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        {" "}
                        No invoices match these filters yet.{" "}
                      </TableCell>{" "}
                    </TableRow>
                  ) : (
                    filteredScans.map(({ scan, outletName }) => {
                      const createdAt = new Date(scan.createdAt);
                      const formattedCreatedAt = Number.isNaN(
                        createdAt.valueOf(),
                      )
                        ? scan.createdAt
                        : createdAt.toLocaleString();
                      const standardizedCount = scan.result.standardized.length;
                      const rawCount = scan.result.rawItems.length;
                      const lineCount =
                        standardizedCount > 0 ? standardizedCount : rawCount;
                      const lineLabel = `${lineCount} ${lineCount === 1 ? "line" : "lines"}`;
                      const attachmentsCount = getAttachmentUrls(scan).length;
                      const statusLabel = scan.status.replace("_", "");
                      return (
                        <TableRow
                          key={scan.id}
                          className={
                            scan.id === selectedScanId
                              ? "bg-muted/40"
                              : undefined
                          }
                        >
                          {" "}
                          <TableCell className="whitespace-nowrap text-[11px] text-muted-foreground">
                            {" "}
                            {formattedCreatedAt}{" "}
                          </TableCell>{" "}
                          <TableCell className="min-w-[160px] font-medium text-sm text-foreground">
                            {" "}
                            {scan.vendorName}{" "}
                          </TableCell>{" "}
                          <TableCell className="min-w-[140px] text-xs text-muted-foreground">
                            {" "}
                            {outletName || "—"}{" "}
                          </TableCell>{" "}
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {" "}
                            {scan.result.invoiceNumber || "—"}{" "}
                          </TableCell>{" "}
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {" "}
                            {lineLabel}{" "}
                          </TableCell>{" "}
                          <TableCell>
                            {" "}
                            <div className="flex items-center gap-2">
                              {" "}
                              <Badge
                                variant={statusVariant(scan.status)}
                                className="capitalize"
                              >
                                {" "}
                                {statusLabel}{" "}
                              </Badge>{" "}
                              <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                                {" "}
                                {attachmentsCount}
                                {""}{" "}
                                {attachmentsCount === 1
                                  ? "asset"
                                  : "assets"}{" "}
                              </span>{" "}
                            </div>{" "}
                          </TableCell>{" "}
                          <TableCell className="text-right">
                            {" "}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenDialog(scan)}
                            >
                              {" "}
                              View{" "}
                            </Button>{" "}
                          </TableCell>{" "}
                        </TableRow>
                      );
                    })
                  )}{" "}
                </TableBody>{" "}
              </Table>{" "}
            </div>{" "}
          </ScrollArea>{" "}
        </div>{" "}
        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          {" "}
          <DialogContent className="max-w-5xl space-y-5">
            {" "}
            <DialogHeader>
              {" "}
              <DialogTitle>
                {" "}
                {selectedScan?.vendorName ?? "Invoice details"}{" "}
              </DialogTitle>{" "}
              <DialogDescription>
                {" "}
                {selectedScan
                  ? `${new Date(selectedScan.createdAt).toLocaleString()} • Invoice #${selectedScan.result.invoiceNumber || "—"} • ${selectedOutletName || "Outlet —"}`
                  : "Review attachments and captured items."}{" "}
              </DialogDescription>{" "}
            </DialogHeader>{" "}
            {selectedScan ? (
              <div className="space-y-6">
                {" "}
                <div>
                  {" "}
                  <div className="flex items-center justify-between">
                    {" "}
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {" "}
                      Attachments{" "}
                    </h3>{" "}
                    <span className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                      {" "}
                      {attachmentUrls.length}
                      {""}{" "}
                      {attachmentUrls.length === 1 ? "asset" : "assets"}{" "}
                    </span>{" "}
                  </div>{" "}
                  {attachmentUrls.length ? (
                    <div className="mt-2 rounded-md border bg-background p-2">
                      {" "}
                      <AttachmentViewer urls={attachmentUrls} />{" "}
                    </div>
                  ) : (
                    <div className="mt-2 rounded-md border border-dashed px-3 py-6 text-sm text-muted-foreground">
                      {" "}
                      No attachments stored for this invoice.{" "}
                    </div>
                  )}{" "}
                </div>{" "}
                {standardizedItems.length ? (
                  <div className="space-y-2">
                    {" "}
                    <div className="flex items-center justify-between">
                      {" "}
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {" "}
                        Standardized items{" "}
                      </h3>{" "}
                      <span className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                        {" "}
                        {standardizedItems.length}
                        {""}{" "}
                        {standardizedItems.length === 1 ? "line" : "lines"}{" "}
                      </span>{" "}
                    </div>{" "}
                    <div className="max-h-[240px] overflow-hidden rounded-md border">
                      {" "}
                      <ScrollArea className="h-[240px]">
                        {" "}
                        <Table>
                          {" "}
                          <TableHeader>
                            {" "}
                            <TableRow>
                              {" "}
                              <TableHead className="min-w-[220px] text-xs uppercase tracking-wide text-muted-foreground">
                                {" "}
                                Item{" "}
                              </TableHead>{" "}
                              <TableHead className="w-40 text-xs uppercase tracking-wide text-muted-foreground">
                                {" "}
                                Quantity{" "}
                              </TableHead>{" "}
                              <TableHead className="w-32 text-xs uppercase tracking-wide text-muted-foreground">
                                {" "}
                                Total{" "}
                              </TableHead>{" "}
                            </TableRow>{" "}
                          </TableHeader>{" "}
                          <TableBody>
                            {" "}
                            {standardizedItems.map(
                              (item: StandardizedLineItem, index) => (
                                <TableRow key={`${item.productName}-${index}`}>
                                  {" "}
                                  <TableCell>
                                    {" "}
                                    <div className="font-medium text-sm text-foreground">
                                      {" "}
                                      {item.productName}{" "}
                                    </div>{" "}
                                    {item.standardized?.standardizedName ? (
                                      <div className="text-xs text-muted-foreground">
                                        {" "}
                                        {
                                          item.standardized.standardizedName
                                        }{" "}
                                      </div>
                                    ) : null}{" "}
                                  </TableCell>{" "}
                                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                    {" "}
                                    {item.quantityPurchaseUnit.quantity}
                                    {""} {item.quantityPurchaseUnit.unit}{" "}
                                  </TableCell>{" "}
                                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                    {" "}
                                    {currencyFormatter.format(
                                      item.totalCost,
                                    )}{" "}
                                  </TableCell>{" "}
                                </TableRow>
                              ),
                            )}{" "}
                          </TableBody>{" "}
                        </Table>{" "}
                      </ScrollArea>{" "}
                    </div>{" "}
                  </div>
                ) : null}{" "}
                {rawItems.length ? (
                  <div className="space-y-2">
                    {" "}
                    <div className="flex items-center justify-between">
                      {" "}
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {" "}
                        Raw captured lines{" "}
                      </h3>{" "}
                      <span className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                        {" "}
                        {rawItems.length}
                        {""} {rawItems.length === 1 ? "line" : "lines"}{" "}
                      </span>{" "}
                    </div>{" "}
                    <div className="max-h-[240px] overflow-hidden rounded-md border">
                      {" "}
                      <ScrollArea className="h-[240px]">
                        {" "}
                        <Table>
                          {" "}
                          <TableHeader>
                            {" "}
                            <TableRow>
                              {" "}
                              <TableHead className="min-w-[220px] text-xs uppercase tracking-wide text-muted-foreground">
                                {" "}
                                Description{" "}
                              </TableHead>{" "}
                              <TableHead className="w-40 text-xs uppercase tracking-wide text-muted-foreground">
                                {" "}
                                Quantity{" "}
                              </TableHead>{" "}
                              <TableHead className="w-32 text-xs uppercase tracking-wide text-muted-foreground">
                                {" "}
                                Total{" "}
                              </TableHead>{" "}
                            </TableRow>{" "}
                          </TableHeader>{" "}
                          <TableBody>
                            {" "}
                            {rawItems.map((item: InvoiceLineItemRaw, index) => (
                              <TableRow key={`${item.rawText}-${index}`}>
                                {" "}
                                <TableCell>
                                  {" "}
                                  <div className="font-medium text-sm text-foreground">
                                    {" "}
                                    {item.productName ||
                                      item.rawText ||
                                      `Line ${index + 1}`}{" "}
                                  </div>{" "}
                                  {item.rawText ? (
                                    <div className="text-xs text-muted-foreground">
                                      {" "}
                                      {item.rawText}{" "}
                                    </div>
                                  ) : null}{" "}
                                </TableCell>{" "}
                                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                  {" "}
                                  {item.quantity ?? "—"} {item.unit ?? ""}{" "}
                                </TableCell>{" "}
                                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                  {" "}
                                  {typeof item.totalCost === "number"
                                    ? currencyFormatter.format(item.totalCost)
                                    : "—"}{" "}
                                </TableCell>{" "}
                              </TableRow>
                            ))}{" "}
                          </TableBody>{" "}
                        </Table>{" "}
                      </ScrollArea>{" "}
                    </div>{" "}
                  </div>
                ) : null}{" "}
                {!standardizedItems.length && !rawItems.length ? (
                  <div className="rounded-md border border-dashed px-3 py-6 text-sm text-muted-foreground">
                    {" "}
                    No line items captured for this invoice.{" "}
                  </div>
                ) : null}{" "}
              </div>
            ) : null}{" "}
          </DialogContent>{" "}
        </Dialog>{" "}
      </div>{" "}
    </AppLayout>
  );
}
