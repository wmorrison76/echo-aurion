import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { PurchaseOrder, Receipt } from "@shared/purchasing";
import { AppLayout } from "@/components/AppLayout";
import { RoleGuard } from "@/context/AuthContext";
import { FinancePermissionsPanel } from "@/components/finance/FinancePermissionsPanel";
import { InventoryGovernancePanel } from "@/components/finance/InventoryGovernancePanel";
import { InvoiceVarianceDashboard } from "@/components/finance/InvoiceVarianceDashboard";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store } from "@/lib/store";
import { cn } from "@/lib/utils";
const VARIANCE_THRESHOLD_PCT = 5;
const SLA_HOURS = 24;
const filterOptions = [
  { id: "all", label: "All pending" },
  { id: "flagged", label: "Variance > 5%" },
  { id: "overdue", label: "Over 24h" },
] as const;
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const percent = (value: number) => {
  if (!isFinite(value)) return "—";
  const formatted = value.toFixed(1);
  return `${value >= 0 ? "+" : ""}${formatted}%`;
};
const ageLabel = (dateIso: string, now: number) => {
  const diffMs = Math.max(0, now - new Date(dateIso).getTime());
  const diffHours = diffMs / 3_600_000;
  if (diffHours < 1) {
    const minutes = Math.max(1, Math.floor(diffMs / 60_000));
    return `${minutes}m ago`;
  }
  if (diffHours < 24) {
    return `${Math.floor(diffHours)}h ago`;
  }
  const days = Math.floor(diffHours / 24);
  return `${days}d ago`;
};
type QueueFilter = (typeof filterOptions)[number]["id"];
type EnrichedReceipt = {
  receipt: Receipt & { approved?: boolean };
  vendorName: string;
  poNumber: string | null;
  lines: number;
  expectedCost: number;
  actualCost: number;
  varianceCost: number;
  variancePct: number;
  isFlagged: boolean;
  isOverdue: boolean;
  ageHours: number;
  ageLabel: string;
};
export default function Finance() {
  const [receipts, setReceipts] = useState(() => Store.listReceipts());
  const [vendors, setVendors] = useState(() => Store.listVendors());
  const [purchaseOrders, setPurchaseOrders] = useState(() => Store.listPOs());
  const [filter, setFilter] = useState<QueueFilter>("all");
  useEffect(() => {
    const refreshReceipts = () => setReceipts(Store.listReceipts());
    const refreshVendors = () => setVendors(Store.listVendors());
    const refreshPOs = () => setPurchaseOrders(Store.listPOs());
    window.addEventListener("echo:receipt:save", refreshReceipts as any);
    window.addEventListener("echo:vendor:save", refreshVendors as any);
    window.addEventListener("echo:po:save", refreshPOs as any);
    return () => {
      window.removeEventListener("echo:receipt:save", refreshReceipts as any);
      window.removeEventListener("echo:vendor:save", refreshVendors as any);
      window.removeEventListener("echo:po:save", refreshPOs as any);
    };
  }, []);
  const vendorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const vendor of vendors) {
      map.set(vendor.id, vendor.name);
    }
    return map;
  }, [vendors]);
  const poMap = useMemo(() => {
    const map = new Map<string, PurchaseOrder>();
    for (const po of purchaseOrders) {
      map.set(po.id, po);
    }
    return map;
  }, [purchaseOrders]);
  const computeVariance = useCallback(
    (receipt: Receipt) => {
      const po = receipt.poId ? poMap.get(receipt.poId) : null;
      let expectedCost = 0;
      let actualCost = 0;
      if (po) {
        for (const item of po.items) {
          const expected = (item.unitPrice ?? 0) * item.qty;
          if (expected) expectedCost += expected;
        }
      }
      for (const line of receipt.lines) {
        actualCost += line.totalCost;
      }
      const varianceCost = actualCost - expectedCost;
      const variancePct =
        expectedCost > 0 ? (varianceCost / expectedCost) * 100 : 0;
      const now = Date.now();
      const ageMs = Math.max(0, now - new Date(receipt.date).getTime());
      const ageHours = ageMs / 3_600_000;
      return {
        vendorName:
          (receipt.vendorId && vendorMap.get(receipt.vendorId)) ||
          (po?.vendorId && vendorMap.get(po.vendorId)) ||
          "Unassigned vendor",
        poNumber: po?.number ?? null,
        expectedCost,
        actualCost,
        varianceCost,
        variancePct,
        ageHours,
        ageLabel: ageLabel(receipt.date, now),
        isOverdue: ageHours >= SLA_HOURS,
        isFlagged: Math.abs(variancePct) > VARIANCE_THRESHOLD_PCT,
      };
    },
    [poMap, vendorMap],
  );
  const pendingReceipts = useMemo(
    () => receipts.filter((receipt) => (receipt as any).approved !== true),
    [receipts],
  );
  const enrichedRows = useMemo<EnrichedReceipt[]>(() => {
    return pendingReceipts.map((receipt) => {
      const variance = computeVariance(receipt);
      return {
        receipt: receipt as Receipt & { approved?: boolean },
        vendorName: variance.vendorName,
        poNumber: variance.poNumber,
        lines: receipt.lines.length,
        expectedCost: variance.expectedCost,
        actualCost: variance.actualCost,
        varianceCost: variance.varianceCost,
        variancePct: variance.variancePct,
        isFlagged: variance.isFlagged,
        isOverdue: variance.isOverdue,
        ageHours: variance.ageHours,
        ageLabel: variance.ageLabel,
      };
    });
  }, [computeVariance, pendingReceipts]);
  const flaggedRows = useMemo(
    () => enrichedRows.filter((row) => row.isFlagged),
    [enrichedRows],
  );
  const overdueRows = useMemo(
    () => enrichedRows.filter((row) => row.isOverdue),
    [enrichedRows],
  );
  const counts = useMemo(
    () =>
      ({
        all: enrichedRows.length,
        flagged: flaggedRows.length,
        overdue: overdueRows.length,
      }) satisfies Record<QueueFilter, number>,
    [enrichedRows.length, flaggedRows.length, overdueRows.length],
  );
  const filteredRows = useMemo(() => {
    if (filter === "flagged") return flaggedRows;
    if (filter === "overdue") return overdueRows;
    return enrichedRows;
  }, [enrichedRows, flaggedRows, filter, overdueRows]);
  const totalVariance = useMemo(
    () => enrichedRows.reduce((acc, row) => acc + row.varianceCost, 0),
    [enrichedRows],
  );
  const avgVariancePct = useMemo(() => {
    if (!enrichedRows.length) return 0;
    const sum = enrichedRows.reduce((acc, row) => acc + row.variancePct, 0);
    return sum / enrichedRows.length;
  }, [enrichedRows]);
  const worstOverdue = useMemo(() => {
    if (!overdueRows.length) return "All within SLA";
    const oldest = overdueRows.reduce((prev, row) =>
      row.ageHours > prev.ageHours ? row : prev,
    );
    return `${oldest.ageLabel.replace(" ago", "")} open`;
  }, [overdueRows]);
  const handleApprove = useCallback(
    (id: string) => {
      const receipt = receipts.find((entry) => entry.id === id);
      if (!receipt) return;
      const updated = { ...(receipt as any), approved: true } as Receipt & {
        approved: boolean;
      };
      Store.saveReceipt(updated);
      setReceipts(Store.listReceipts());
    },
    [receipts],
  );
  const summaryCards = useMemo(
    () => [
      {
        title: "Pending approvals",
        value: counts.all.toLocaleString(),
        description: counts.all
          ? `${counts.flagged.toLocaleString()} flagged, ${counts.overdue.toLocaleString()} overdue`
          : "All invoices are approved",
      },
      {
        title: "Total variance",
        value: currency.format(totalVariance),
        description: `Avg ${percent(avgVariancePct)} vs expected cost`,
      },
      {
        title: "Overdue invoices",
        value: counts.overdue.toLocaleString(),
        description: counts.overdue ? worstOverdue : "All within 24h SLA",
      },
      {
        title: "Flagged threshold",
        value: counts.flagged.toLocaleString(),
        description: `Variance threshold ${VARIANCE_THRESHOLD_PCT}%`,
      },
    ],
    [
      avgVariancePct,
      counts.all,
      counts.flagged,
      counts.overdue,
      totalVariance,
      worstOverdue,
    ],
  );
  return (
    <AppLayout>
      {" "}
      <RoleGuard roles={["Admin", "Manager", "Finance"]}>
        {" "}
        <div className="space-y-6">
          {" "}
          <div>
            {" "}
            <h1 className="text-2xl font-semibold tracking-tight">
              Finance Control
            </h1>{" "}
            <p className="text-sm text-muted-foreground">
              {" "}
              Review invoice variances, clear approvals, and monitor SLA health
              before closing the period.{" "}
            </p>{" "}
          </div>{" "}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {" "}
            {summaryCards.map((card) => (
              <Card key={card.title} className="border">
                {" "}
                <CardHeader className="pb-2">
                  {" "}
                  <CardTitle className="text-base font-medium text-muted-foreground">
                    {" "}
                    {card.title}{" "}
                  </CardTitle>{" "}
                </CardHeader>{" "}
                <CardContent className="space-y-1">
                  {" "}
                  <div className="text-2xl font-semibold tracking-tight">
                    {" "}
                    {card.value}{" "}
                  </div>{" "}
                  <p className="text-xs text-muted-foreground">
                    {card.description}
                  </p>{" "}
                </CardContent>{" "}
              </Card>
            ))}{" "}
          </div>{" "}
          <div className="grid gap-6 xl:grid-cols-[7fr_5fr]">
            {" "}
            <div className="space-y-6">
              {" "}
              <Card className="border-2">
                {" "}
                <CardHeader className="flex flex-col gap-2 border-b bg-muted/40 py-4">
                  {" "}
                  <div className="flex flex-col gap-1">
                    {" "}
                    <CardTitle>Approval queue</CardTitle>{" "}
                    <CardDescription>
                      {" "}
                      Invoices older than 24 hours require attention. Filter by
                      variance threshold or SLA breaches to prioritize.{" "}
                    </CardDescription>{" "}
                  </div>{" "}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {" "}
                    {filterOptions.map((option) => (
                      <Button
                        key={option.id}
                        size="sm"
                        variant={filter === option.id ? "default" : "outline"}
                        className={cn(
                          "h-8 rounded-full border",
                          filter === option.id
                            ? "border-primary shadow-sm"
                            : "bg-background",
                        )}
                        onClick={() => setFilter(option.id)}
                      >
                        {" "}
                        {option.label}{" "}
                        <Badge
                          variant={
                            filter === option.id ? "secondary" : "outline"
                          }
                          className="ml-2"
                        >
                          {" "}
                          {counts[option.id].toLocaleString()}{" "}
                        </Badge>{" "}
                      </Button>
                    ))}{" "}
                  </div>{" "}
                </CardHeader>{" "}
                <CardContent className="p-0">
                  {" "}
                  <div className="max-h-[520px] overflow-auto">
                    {" "}
                    <Table>
                      {" "}
                      <TableHeader className="sticky top-0 z-10 bg-background">
                        {" "}
                        <TableRow>
                          {" "}
                          <TableHead className="w-[160px]">
                            Received
                          </TableHead>{" "}
                          <TableHead>Vendor</TableHead>{" "}
                          <TableHead>Invoice #</TableHead>{" "}
                          <TableHead className="text-right">Lines</TableHead>{" "}
                          <TableHead className="text-right">Expected</TableHead>{" "}
                          <TableHead className="text-right">Actual</TableHead>{" "}
                          <TableHead className="text-right">Variance</TableHead>{" "}
                          <TableHead className="w-[120px] text-right">
                            SLA
                          </TableHead>{" "}
                          <TableHead className="w-[120px] text-right"></TableHead>{" "}
                        </TableRow>{" "}
                      </TableHeader>{" "}
                      <TableBody>
                        {" "}
                        {filteredRows.map((row) => {
                          const { receipt } = row;
                          const slaVariant:
                            | "destructive"
                            | "secondary"
                            | "outline" = row.isOverdue
                            ? "destructive"
                            : row.ageHours >= SLA_HOURS * 0.75
                              ? "secondary"
                              : "outline";
                          return (
                            <TableRow key={receipt.id} className="align-top">
                              {" "}
                              <TableCell className="text-sm font-medium">
                                {" "}
                                {new Date(receipt.date).toLocaleString()}{" "}
                              </TableCell>{" "}
                              <TableCell className="text-sm">
                                {" "}
                                <div className="flex flex-col">
                                  {" "}
                                  <span className="font-medium">
                                    {row.vendorName}
                                  </span>{" "}
                                  {row.poNumber && (
                                    <span className="text-xs text-muted-foreground">
                                      {" "}
                                      PO #{row.poNumber}{" "}
                                    </span>
                                  )}{" "}
                                </div>{" "}
                              </TableCell>{" "}
                              <TableCell className="text-sm">
                                {" "}
                                {receipt.invoiceNumber || "—"}{" "}
                              </TableCell>{" "}
                              <TableCell className="text-right text-sm">
                                {" "}
                                {row.lines}{" "}
                              </TableCell>{" "}
                              <TableCell className="text-right text-sm">
                                {" "}
                                {currency.format(row.expectedCost)}{" "}
                              </TableCell>{" "}
                              <TableCell className="text-right text-sm">
                                {" "}
                                {currency.format(row.actualCost)}{" "}
                              </TableCell>{" "}
                              <TableCell
                                className={cn(
                                  "text-right text-sm font-medium",
                                  row.isFlagged ? "text-red-600" : "",
                                )}
                              >
                                {" "}
                                {currency.format(row.varianceCost)} ·{" "}
                                {percent(row.variancePct)}{" "}
                              </TableCell>{" "}
                              <TableCell className="text-right">
                                {" "}
                                <Badge variant={slaVariant}>
                                  {row.ageLabel}
                                </Badge>{" "}
                              </TableCell>{" "}
                              <TableCell className="text-right">
                                {" "}
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(receipt.id)}
                                >
                                  {" "}
                                  Approve{" "}
                                </Button>{" "}
                              </TableCell>{" "}
                            </TableRow>
                          );
                        })}{" "}
                        {!filteredRows.length && (
                          <TableRow>
                            {" "}
                            <TableCell
                              colSpan={9}
                              className="h-32 text-center text-sm text-muted-foreground"
                            >
                              {" "}
                              {counts.all
                                ? "No invoices match the selected filter."
                                : "No approvals needed."}{" "}
                            </TableCell>{" "}
                          </TableRow>
                        )}{" "}
                      </TableBody>{" "}
                    </Table>{" "}
                  </div>{" "}
                </CardContent>{" "}
              </Card>{" "}
            </div>{" "}
            <div className="space-y-6">
              {" "}
              <InvoiceVarianceDashboard /> <FinancePermissionsPanel />{" "}
              <InventoryGovernancePanel />{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </RoleGuard>{" "}
    </AppLayout>
  );
}
