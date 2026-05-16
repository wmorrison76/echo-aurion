import React, { useCallback, useEffect, useMemo } from "react";
import { addDays, format } from "date-fns";
import { Download, Factory, RefreshCcw, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePageToolbar } from "@/context/PageToolbarContext";
import { useTranslation } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { READY_MADE_ITEMS } from "@/data/readyMadeItems";
import { SUPPLIER_CATALOG, SUPPLIERS } from "@/data/suppliers";
import { formatCurrency } from "@/pages/sections/saas/shared";
import LineChecklistPanel from "./components/LineChecklistPanel";

const toolbarButtonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 shadow-sm transition hover:bg-white dark:border-[#c8a97e]/30 dark:bg-slate-900/60 dark:text-[#c8a97e]/80 dark:hover:bg-slate-900";

type CatalogRow = {
  supplierId: string;
  supplierName: string;
  sku: string;
  ingredientName: string;
  packDisplay: string;
  pricePerPack: number;
  currency: string;
  unitPrice: number | null;
  minOrderValue: number;
  leadTimeDays: number;
  reliability: number | null;
  sustainability: number | null;
};

type ReceivingRow = {
  id: string;
  supplierId: string;
  supplierName: string;
  itemName: string;
  expectedDate: Date;
  leadTimeDays: number;
  standardBatch: string;
  estimatedCost: number | null;
  currency: string;
  portionSize: number;
  portionUnit: string;
  portions: number;
  estimatedPortionCost: number | null;
};

type SupplierSpendRow = {
  supplierId: string;
  supplierName: string;
  queueValue: number;
  pipelineValue: number;
  avgLeadTime: number;
  reliability: number | null;
  sustainability: number | null;
  catalogCount: number;
  receivingCount: number;
};

const PurchasingReceivingWorkspace: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { setToolbar, resetToolbar } = usePageToolbar();
  const unknownSupplierLabel = t("purchRec.unknownSupplier", "Unknown Supplier");

  const supplierIndex = useMemo(() => {
    const map = new Map<string, (typeof SUPPLIERS)[number]>();
    for (const supplier of SUPPLIERS) {
      map.set(supplier.id, supplier);
    }
    return map;
  }, []);

  const catalogRows = useMemo<CatalogRow[]>(() => {
    return SUPPLIER_CATALOG.map((item) => {
      const supplier = supplierIndex.get(item.supplierId);
      const packSize = item.packSize > 0 ? item.packSize : null;
      const unitPrice = packSize ? item.pricePerPack / packSize : null;
      return {
        supplierId: item.supplierId,
        supplierName: supplier?.name ?? unknownSupplierLabel,
        sku: item.sku,
        ingredientName: item.ingredientName,
        packDisplay: `${item.packSize} ${item.packUnit}`,
        pricePerPack: item.pricePerPack,
        currency: item.currency,
        unitPrice,
        minOrderValue: item.pricePerPack * item.minOrderPacks,
        leadTimeDays: item.leadTimeDays,
        reliability: supplier?.reliability ?? null,
        sustainability: supplier?.sustainabilityScore ?? null,
      } satisfies CatalogRow;
    }).sort((a, b) => a.leadTimeDays - b.leadTimeDays || a.supplierName.localeCompare(b.supplierName));
  }, [supplierIndex, unknownSupplierLabel]);

  const receivingRows = useMemo<ReceivingRow[]>(() => {
    const catalogBySupplier = new Map<string, typeof SUPPLIER_CATALOG>();
    for (const item of SUPPLIER_CATALOG) {
      const existing = catalogBySupplier.get(item.supplierId);
      if (existing) {
        existing.push(item);
      } else {
        catalogBySupplier.set(item.supplierId, [item]);
      }
    }

    return READY_MADE_ITEMS.map((item) => {
      const supplier = supplierIndex.get(item.supplierId);
      const catalog = catalogBySupplier.get(item.supplierId) ?? [];
      const normalizedUnit = item.standardBatchUnit.toLowerCase();
      const directMatch = catalog.find((entry) => entry.packUnit.toLowerCase() === normalizedUnit);
      const computeCostFromEntry = (entry: (typeof SUPPLIER_CATALOG)[number]) => {
        if (entry.packSize <= 0) return null;
        return (item.standardBatchQty / entry.packSize) * entry.pricePerPack;
      };
      let estimatedCost: number | null = null;
      if (directMatch) {
        estimatedCost = computeCostFromEntry(directMatch);
      } else if (catalog.length) {
        const unitPrices = catalog
          .map((entry) => (entry.packSize > 0 ? entry.pricePerPack / entry.packSize : null))
          .filter((value): value is number => value != null && Number.isFinite(value));
        if (unitPrices.length) {
          const avgUnitPrice = unitPrices.reduce((sum, value) => sum + value, 0) / unitPrices.length;
          estimatedCost = avgUnitPrice * item.standardBatchQty;
        }
      }
      const currency = (directMatch ?? catalog[0])?.currency ?? "USD";
      const portions = Math.max(item.defaultPortions, 1);
      const estimatedPortionCost = estimatedCost != null ? estimatedCost / portions : null;
      return {
        id: item.id,
        supplierId: item.supplierId,
        supplierName: supplier?.name ?? unknownSupplierLabel,
        itemName: item.name,
        expectedDate: addDays(new Date(), item.leadTimeDays),
        leadTimeDays: item.leadTimeDays,
        standardBatch: `${item.standardBatchQty} ${item.standardBatchUnit}`,
        estimatedCost,
        currency,
        portionSize: item.portionSize,
        portionUnit: item.portionUnit,
        portions,
        estimatedPortionCost,
      } satisfies ReceivingRow;
    }).sort((a, b) => a.expectedDate.getTime() - b.expectedDate.getTime());
  }, [supplierIndex, unknownSupplierLabel]);

  const supplierSpend = useMemo<SupplierSpendRow[]>(() => {
    const map = new Map<string, SupplierSpendRow>();

    const ensureRow = (supplierId: string) => {
      let row = map.get(supplierId);
      if (!row) {
        const supplier = supplierIndex.get(supplierId);
        row = {
          supplierId,
          supplierName: supplier?.name ?? unknownSupplierLabel,
          queueValue: 0,
          pipelineValue: 0,
          avgLeadTime: 0,
          reliability: supplier?.reliability ?? null,
          sustainability: supplier?.sustainabilityScore ?? null,
          catalogCount: 0,
          receivingCount: 0,
        } satisfies SupplierSpendRow;
        map.set(supplierId, row);
      }
      return row;
    };

    for (const row of catalogRows) {
      const target = ensureRow(row.supplierId);
      target.queueValue += row.minOrderValue;
      target.avgLeadTime += row.leadTimeDays;
      target.catalogCount += 1;
    }

    for (const row of receivingRows) {
      const target = ensureRow(row.supplierId);
      if (row.estimatedCost != null) {
        target.pipelineValue += row.estimatedCost;
      }
      target.receivingCount += 1;
    }

    return Array.from(map.values())
      .map((row) => {
        const denominator = row.catalogCount || 1;
        return {
          ...row,
          avgLeadTime: row.avgLeadTime / denominator,
        };
      })
      .sort((a, b) => b.queueValue + b.pipelineValue - (a.queueValue + a.pipelineValue));
  }, [catalogRows, receivingRows, supplierIndex, unknownSupplierLabel]);

  const summary = useMemo(() => {
    const uniqueSuppliers = new Set(catalogRows.map((row) => row.supplierId));
    const totalMinOrderValue = catalogRows.reduce((sum, row) => sum + row.minOrderValue, 0);
    const inboundValue = receivingRows.reduce(
      (sum, row) => sum + (row.estimatedCost ?? 0),
      0,
    );
    const leadTimeAccumulator = catalogRows.reduce(
      (sum, row) => sum + row.leadTimeDays,
      0,
    );
    const avgLeadTime = catalogRows.length
      ? leadTimeAccumulator / catalogRows.length
      : 0;
    const reliabilityValues = catalogRows
      .map((row) => row.reliability)
      .filter((value): value is number => typeof value === "number");
    const avgReliability = reliabilityValues.length
      ? reliabilityValues.reduce((sum, value) => sum + value, 0) / reliabilityValues.length
      : 0;
    return {
      uniqueSuppliers: uniqueSuppliers.size,
      totalMinOrderValue,
      inboundValue,
      totalSkus: catalogRows.length,
      avgLeadTime,
      avgReliability,
    };
  }, [catalogRows, receivingRows]);

  const handleRefreshPricing = useCallback(() => {
    toast({
      title: t("purchRec.toast.refreshTitle", "Pricing refreshed"),
      description: t(
        "purchRec.toast.refresh",
        "Supplier catalog costs recalculated against live pack data.",
      ),
    });
  }, [t, toast]);

  const handleExportOrders = useCallback(() => {
    const totalSuppliers = supplierSpend.length;
    const exportValue = supplierSpend.reduce(
      (sum, row) => sum + row.queueValue + row.pipelineValue,
      0,
    );
    const exportValueFormatted = formatCurrency(exportValue, "USD");
    toast({
      title: t("purchRec.toast.exportTitle", "Export queued"),
      description: t(
        "purchRec.toast.export",
        "{count} supplier packets totaling {value} ready for download.",
        { count: totalSuppliers, value: exportValueFormatted },
      ),
    });
  }, [supplierSpend, t, toast]);

  useEffect(() => {
    setToolbar({
      title: t("nav.purchasingReceiving", "Purch/Rec"),
      items: [
        {
          id: "refresh-pricing",
          label: t("purchRec.toolbar.refresh", "Refresh Pricing"),
          ariaLabel: t("purchRec.toolbar.refresh", "Refresh Pricing"),
          title: t("purchRec.toolbar.refresh", "Refresh Pricing"),
          icon: RefreshCcw,
          onClick: handleRefreshPricing,
          className: toolbarButtonClass,
        },
        {
          id: "export-orders",
          label: t("purchRec.toolbar.export", "Export Orders"),
          ariaLabel: t("purchRec.toolbar.export", "Export Orders"),
          title: t("purchRec.toolbar.export", "Export Orders"),
          icon: Download,
          onClick: handleExportOrders,
          className: toolbarButtonClass,
        },
      ],
    });
    return () => {
      resetToolbar();
    };
  }, [handleExportOrders, handleRefreshPricing, resetToolbar, setToolbar, t]);

  const metricCards = useMemo(() => {
    const reliabilityPercent = Math.round(summary.avgReliability * 100);
    return [
      {
        label: t("purchRec.summary.suppliers", "Active Suppliers"),
        value: summary.uniqueSuppliers.toLocaleString(),
        detail: t(
          "purchRec.summary.suppliersDetail",
          "{count} catalog SKUs",
          { count: summary.totalSkus.toLocaleString() },
        ),
      },
      {
        label: t("purchRec.summary.queue", "Queued Spend"),
        value: formatCurrency(summary.totalMinOrderValue, "USD"),
        detail: t(
          "purchRec.summary.queueDetail",
          "Minimum commitments awaiting release",
        ),
      },
      {
        label: t("purchRec.summary.inbound", "Inbound Value"),
        value: formatCurrency(summary.inboundValue, "USD"),
        detail: t(
          "purchRec.summary.inboundDetail",
          "Receiving batches priced and scheduled",
        ),
      },
      {
        label: t("purchRec.summary.lead", "Avg Lead Time"),
        value: t(
          "purchRec.summary.leadValue",
          "{days} days",
          { days: Number.isFinite(summary.avgLeadTime) ? summary.avgLeadTime.toFixed(1) : "0" },
        ),
        detail: t(
          "purchRec.summary.leadDetail",
          "Reliability {percent}%",
          { percent: reliabilityPercent },
        ),
      },
    ];
  }, [summary, t]);

  return (
    <div className="container mx-auto space-y-4 px-3 py-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <Card key={card.label} className="backdrop-blur">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-[#c8a97e]/60">
                {card.label}
              </CardDescription>
              <CardTitle className="text-2xl font-semibold text-slate-800 dark:text-white/80">
                {card.value}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-slate-500 dark:text-[#c8a97e]/80/80">
              {card.detail}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card className="backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Factory className="h-5 w-5" aria-hidden />
              {t("purchRec.card.queue", "Purchase Queue")}
            </CardTitle>
            <CardDescription>
              {t(
                "purchRec.card.queueDescription",
                "Prioritized supplier line items with calculated pack economics.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="max-h-[420px] pr-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("purchRec.table.supplier", "Supplier")}</TableHead>
                    <TableHead>{t("purchRec.table.sku", "SKU")}</TableHead>
                    <TableHead>{t("purchRec.table.item", "Item")}</TableHead>
                    <TableHead>{t("purchRec.table.packPrice", "Pack / Price")}</TableHead>
                    <TableHead className="text-right">
                      {t("purchRec.table.minRelease", "Min Release")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("purchRec.table.lead", "Lead")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalogRows.map((row) => {
                    const badgeVariant =
                      row.minOrderValue > 500
                        ? "destructive"
                        : row.minOrderValue > 250
                          ? "secondary"
                          : "outline";
                    return (
                      <TableRow key={row.sku}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{row.supplierName}</span>
                            <span className="text-xs text-muted-foreground">
                              {t(
                                "purchRec.table.reliabilityScore",
                                "Reliability {score}",
                                { score: (row.reliability ?? 0).toFixed(2) },
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[11px] uppercase">
                            {row.sku}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{row.ingredientName}</span>
                            {row.unitPrice != null ? (
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(row.unitPrice, row.currency)}{" "}
                                {t("purchRec.table.unitSuffix", "/ unit")}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{row.packDisplay}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(row.pricePerPack, row.currency)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={badgeVariant} className="justify-end gap-1 font-semibold">
                            {formatCurrency(row.minOrderValue, row.currency)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span>
                              {t("purchRec.table.leadValue", "{days} d", {
                                days: row.leadTimeDays,
                              })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {t("purchRec.table.sustain", "Sustain {percent}%", {
                                percent: Math.round((row.sustainability ?? 0) * 100),
                              })}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <RefreshCcw className="h-5 w-5" aria-hidden />
              {t("purchRec.card.coverage", "Supplier Coverage")}
            </CardTitle>
            <CardDescription>
              {t(
                "purchRec.card.coverageDescription",
                "Spend concentration, reliability, and inbound confirmations by partner.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {supplierSpend.map((row) => {
              const totalValue = row.queueValue + row.pipelineValue;
              return (
                <div
                  key={row.supplierId}
                  className="rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm dark:border-[#c8a97e]/30 dark:bg-slate-900/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-white/80">
                        {row.supplierName}
                      </div>
                      <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                        {t(
                          "purchRec.coverage.badge",
                          "{skus} skus · {inbound} inbound",
                          {
                            skus: row.catalogCount,
                            inbound: row.receivingCount,
                          },
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono text-[11px] uppercase">
                      {t(
                        "purchRec.coverage.onTime",
                        "{percent}% on-time",
                        { percent: Math.round((row.reliability ?? 0) * 100) },
                      )}
                    </Badge>
                  </div>
                  <Separator className="my-2" />
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>{t("purchRec.coverage.queue", "Queued")}</span>
                      <span className="font-medium text-slate-700 dark:text-white/80">
                        {formatCurrency(row.queueValue, "USD")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>{t("purchRec.coverage.inbound", "Inbound")}</span>
                      <span className="font-medium text-slate-700 dark:text-white/80">
                        {formatCurrency(row.pipelineValue, "USD")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>{t("purchRec.coverage.avgLead", "Avg lead")}</span>
                      <span className="font-medium text-slate-700 dark:text-white/80">
                        {t(
                          "purchRec.summary.leadValue",
                          "{days} days",
                          { days: row.avgLeadTime.toFixed(1) },
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>{t("purchRec.coverage.totalExposure", "Total exposure")}</span>
                      <span className="font-semibold text-slate-800 dark:text-amber-50">
                        {formatCurrency(totalValue, "USD")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <LineChecklistPanel />

      <Card className="backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Truck className="h-5 w-5" aria-hidden />
            {t("purchRec.card.receiving", "Receiving Timeline")}
          </CardTitle>
          <CardDescription>
            {t(
              "purchRec.card.receivingDescription",
              "Scheduled ready-made items with projected landed cost per portion.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {receivingRows.map((row) => (
              <div
                key={row.id}
                className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm transition hover:shadow-md dark:border-[#c8a97e]/30 dark:bg-slate-900/60"
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  <span>{format(row.expectedDate, "MMM d")}</span>
                  <span>
                    {t("purchRec.timeline.lead", "{days} day lead", {
                      days: row.leadTimeDays,
                    })}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-slate-800 dark:text-white/80">
                  {row.itemName}
                </h3>
                <div className="mt-1 text-sm text-muted-foreground">
                  {row.supplierName}
                </div>
                <Separator className="my-3" />
                <dl className="grid gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <dt>{t("purchRec.timeline.batch", "Batch")}</dt>
                    <dd className="font-medium text-slate-700 dark:text-white/80">
                      {row.standardBatch}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>{t("purchRec.timeline.cost", "Estimated cost")}</dt>
                    <dd className="font-medium text-slate-700 dark:text-white/80">
                      {row.estimatedCost != null
                        ? formatCurrency(row.estimatedCost, row.currency)
                        : t("purchRec.timeline.sync", "Sync pricing")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>{t("purchRec.timeline.portionCost", "Portion cost")}</dt>
                    <dd className="font-medium text-slate-700 dark:text-white/80">
                      {row.estimatedPortionCost != null
                        ? formatCurrency(row.estimatedPortionCost, row.currency)
                        : t("purchRec.timeline.pending", "Pending")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>{t("purchRec.timeline.portionSize", "Portion size")}</dt>
                    <dd className="font-medium text-slate-700 dark:text-white/80">
                      {row.portionSize} {row.portionUnit}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchasingReceivingWorkspace;
