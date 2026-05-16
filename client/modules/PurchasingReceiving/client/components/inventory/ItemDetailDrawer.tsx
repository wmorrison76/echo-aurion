import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Store } from "@/lib/store";
import type { InventoryItem, PurchaseUnit } from "@shared/inventory";
import { classifyItem } from "@shared/taxonomy";
import {
  normalizeUnit,
  toOunces,
} from "@shared/api"; /* MCP integration note: - ReceiptRows should be fetched by item id with server-side joins (items ↔ receipts ↔ vendors) in Neon. - For recalls, expose endpoint returning all outlets and dates for this item across org.
 */
interface ItemDetailDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: InventoryItem | null;
  onLaunchConversions?: (item: InventoryItem) => void;
}
const DEPARTMENT_OPTIONS = [
  "Hot Line",
  "Cold Prep",
  "Pastry",
  "Banquets",
  "Bar",
  "Room Service",
  "Retail",
];
type PackAnalysis = {
  display: string;
  totalOunces: number | null;
  eachCount: number | null;
  baseUnit: string | null;
  packQuantity: number | null;
  innerQuantity: number | null;
};
interface PackRow {
  key: string;
  vendor: string;
  packSummary: string;
  notes: string | null;
  recipeUnitsLabel: string;
  eachCountLabel: string;
  costPerRecipeLabel: string;
  costPerEachLabel: string;
  analysis: PackAnalysis;
  purchaseUnit: PurchaseUnit;
}
export function ItemDetailDrawer({
  open,
  onOpenChange,
  item,
  onLaunchConversions,
}: ItemDetailDrawerProps) {
  const receipts = useMemo(() => Store.listReceipts(), [open, item?.id]);
  const vendors = useMemo(() => Store.listVendors(), [open]);
  const [conversionQty, setConversionQty] = useState(1);
  const [conversionUnit, setConversionUnit] = useState("oz");
  const [selectedPurchaseIndex, setSelectedPurchaseIndex] = useState(0);
  const [departments, setDepartments] = useState<string[]>([]);
  useEffect(() => {
    setDepartments(item?.departments ?? []);
    setSelectedPurchaseIndex(0);
  }, [item?.id, open]);
  useEffect(() => {
    const purchaseUnit =
      item?.purchaseUnits[selectedPurchaseIndex] ?? item?.purchaseUnits[0];
    if (!purchaseUnit) {
      setConversionQty(1);
      setConversionUnit("oz");
      return;
    }
    const analysis = analysePack(purchaseUnit);
    if (analysis.totalOunces != null) {
      setConversionQty(Number(analysis.totalOunces));
      setConversionUnit("oz");
    } else if (analysis.eachCount != null) {
      setConversionQty(Number(analysis.eachCount));
      setConversionUnit("each");
    } else {
      setConversionQty(1);
      setConversionUnit("oz");
    }
  }, [item, open, selectedPurchaseIndex]);
  const conversionSummary = useMemo(() => {
    const normalizedUnit = (conversionUnit || "oz").toLowerCase();
    if (!conversionQty || conversionQty < 0) {
      return {
        ounces: null,
        pounds: null,
        grams: null,
        milliliters: null,
        liters: null,
      };
    }
    if (normalizedUnit === "each") {
      return {
        ounces: null,
        pounds: null,
        grams: null,
        milliliters: null,
        liters: null,
      };
    }
    const ounces = toOunces(conversionQty, normalizedUnit);
    return {
      ounces,
      pounds: ounces / 16,
      grams: ounces * 28.3495,
      milliliters: ounces * 29.5735,
      liters: (ounces * 29.5735) / 1000,
    };
  }, [conversionQty, conversionUnit]);
  const packRows = useMemo<PackRow[]>(() => {
    if (!item) return [];
    return item.purchaseUnits.map((pu, idx) => {
      const vendorName =
        vendors.find((v) => v.id === pu.vendorId)?.name || "Unknown Vendor";
      const analysis = analysePack(pu);
      return {
        key: `${item.id}-${idx}`,
        vendor: vendorName,
        packSummary: `${pu.unit}${analysis.display ? ` • ${analysis.display}` : ""}`,
        notes: buildPackNotes(analysis),
        recipeUnitsLabel:
          analysis.totalOunces != null
            ? `${formatNumber(analysis.totalOunces)} oz`
            : "—",
        eachCountLabel:
          analysis.eachCount != null ? formatNumber(analysis.eachCount) : "—",
        costPerRecipeLabel: formatCurrency(
          pu.lastUnitPrice != null && analysis.totalOunces
            ? pu.lastUnitPrice / analysis.totalOunces
            : null,
        ),
        costPerEachLabel: formatCurrency(
          pu.lastUnitPrice != null && analysis.eachCount
            ? pu.lastUnitPrice / analysis.eachCount
            : null,
        ),
        analysis,
        purchaseUnit: pu,
      };
    });
  }, [item, vendors]);
  const activePack = packRows[selectedPurchaseIndex] ?? packRows[0] ?? null;
  const receiptRows = useMemo(() => {
    if (!item)
      return [] as {
        id: string;
        date: string;
        vendorName: string;
        productName: string;
        qty: number;
        unit: string;
        totalCost: number;
      }[];
    const rows: {
      id: string;
      date: string;
      vendorName: string;
      productName: string;
      qty: number;
      unit: string;
      totalCost: number;
    }[] = [];
    for (const r of receipts) {
      for (const l of r.lines) {
        if (l.productName.toLowerCase() === item.name.toLowerCase()) {
          const vendorName =
            vendors.find((v) => v.id === r.vendorId)?.name || "Unknown Vendor";
          rows.push({
            id: r.id,
            date: r.date,
            vendorName,
            productName: l.productName,
            qty: l.qty,
            unit: l.unit,
            totalCost: l.totalCost,
          });
        }
      }
    }
    rows.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return rows;
  }, [receipts, vendors, item]);
  const toggleDepartment = (dept: string, isChecked: boolean) => {
    if (!item) return;
    const next = isChecked
      ? Array.from(new Set([...departments, dept]))
      : departments.filter((entry) => entry !== dept);
    setDepartments(next);
    Store.saveItem({ ...item, departments: next });
  };
  if (!item) return null;
  const lastPU = item.purchaseUnits[0];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {" "}
      <DialogContent className="max-w-[520px] sm:left-auto sm:right-6 sm:top-1/2 sm:h-[90vh] sm:max-h-[90vh] sm:max-w-[420px] sm:translate-x-0 sm:translate-y-[-50%] sm:overflow-y-auto sm:rounded-3xl sm:p-8">
        {" "}
        <DialogHeader>
          {" "}
          <div className="flex items-start justify-between gap-3">
            {" "}
            <DialogTitle>
              {" "}
              {item.name}
              {""}{" "}
              <span className="ml-2 align-middle text-xs text-muted-foreground">
                {" "}
                Outlet:{" "}
                {Store.listOutlets().find((o) => o.id === item.outletId)
                  ?.name || item.outletId}{" "}
              </span>{" "}
            </DialogTitle>{" "}
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("open-panel", {
                      detail: {
                        id: "culinary",
                        itemId: item.id,
                        itemName: item.name,
                      },
                    }),
                  )
                }
                title="View recipes using this ingredient"
              >
                Open in Culinary
              </Button>
              {onLaunchConversions && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onLaunchConversions(item)}
                >
                  Conversions Tool
                </Button>
              )}
            </div>{" "}
          </div>{" "}
        </DialogHeader>{" "}
        <Tabs defaultValue="overview">
          {" "}
          <TabsList>
            {" "}
            <TabsTrigger value="overview">Overview</TabsTrigger>{" "}
            <TabsTrigger value="purchases">Purchases</TabsTrigger>{" "}
            <TabsTrigger value="history">History</TabsTrigger>{" "}
            <TabsTrigger value="classification">Classification</TabsTrigger>{" "}
            <TabsTrigger value="conversions">Recipe Units</TabsTrigger>{" "}
            <TabsTrigger value="storage">Storage</TabsTrigger>{" "}
            <TabsTrigger value="recall">Recall</TabsTrigger>{" "}
          </TabsList>{" "}
          <TabsContent value="overview">
            {" "}
            <div className="space-y-4">
              {" "}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {" "}
                <div className="rounded-md border p-3">
                  {" "}
                  <div className="text-sm text-muted-foreground">
                    Last Received
                  </div>{" "}
                  <div className="text-lg font-medium">
                    {" "}
                    {item.lastReceiptDate
                      ? new Date(item.lastReceiptDate).toLocaleDateString()
                      : "—"}{" "}
                  </div>{" "}
                </div>{" "}
                <div className="rounded-md border p-3">
                  {" "}
                  <div className="text-sm text-muted-foreground">
                    Primary Vendor
                  </div>{" "}
                  <div className="text-lg font-medium">
                    {" "}
                    {lastPU
                      ? vendors.find((v) => v.id === lastPU.vendorId)?.name ||
                        "Unknown"
                      : "—"}{" "}
                  </div>{" "}
                </div>{" "}
                <div className="rounded-md border p-3">
                  {" "}
                  <div className="text-sm text-muted-foreground">
                    Last Unit Price
                  </div>{" "}
                  <div className="text-lg font-medium">
                    {" "}
                    {lastPU?.lastUnitPrice != null
                      ? `$${Number(lastPU.lastUnitPrice).toFixed(2)}`
                      : "—"}{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              <div className="rounded-md border p-3">
                {" "}
                <div className="text-sm text-muted-foreground">
                  Departments Using
                </div>{" "}
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {" "}
                  {DEPARTMENT_OPTIONS.map((dept) => (
                    <label
                      key={dept}
                      className="flex items-center gap-2 text-sm"
                    >
                      {" "}
                      <Checkbox
                        checked={departments.includes(dept)}
                        onCheckedChange={(checked) =>
                          toggleDepartment(dept, checked === true)
                        }
                      />{" "}
                      <span>{dept}</span>{" "}
                    </label>
                  ))}{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </TabsContent>{" "}
          <TabsContent value="purchases">
            {" "}
            <div className="rounded-lg border">
              {" "}
              <Table>
                {" "}
                <TableHeader>
                  {" "}
                  <TableRow>
                    {" "}
                    <TableHead>Vendor</TableHead> <TableHead>Unit</TableHead>{" "}
                    <TableHead>Pack</TableHead> <TableHead>SKU</TableHead>{" "}
                    <TableHead className="w-[16ch] text-right">
                      Last Unit Price
                    </TableHead>{" "}
                  </TableRow>{" "}
                </TableHeader>{" "}
                <TableBody>
                  {" "}
                  {item.purchaseUnits.map((pu, idx) => (
                    <TableRow key={idx}>
                      {" "}
                      <TableCell>
                        {vendors.find((v) => v.id === pu.vendorId)?.name ||
                          "Unknown"}
                      </TableCell>{" "}
                      <TableCell>{pu.unit}</TableCell>{" "}
                      <TableCell>{pu.pack || "—"}</TableCell>{" "}
                      <TableCell className="font-mono text-xs">
                        {pu.sku || "—"}
                      </TableCell>{" "}
                      <TableCell className="text-right">
                        {" "}
                        {pu.lastUnitPrice != null
                          ? `$${Number(pu.lastUnitPrice).toFixed(2)}`
                          : "—"}{" "}
                      </TableCell>{" "}
                    </TableRow>
                  ))}{" "}
                  {!item.purchaseUnits.length && (
                    <TableRow>
                      {" "}
                      <TableCell
                        colSpan={5}
                        className="text-center text-sm text-muted-foreground"
                      >
                        {" "}
                        No vendor purchase units yet.{" "}
                      </TableCell>{" "}
                    </TableRow>
                  )}{" "}
                </TableBody>{" "}
              </Table>{" "}
            </div>{" "}
          </TabsContent>{" "}
          <TabsContent value="classification">
            {" "}
            {(() => {
              const c = classifyItem(item.name);
              return (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {" "}
                  <div className="rounded-md border p-3">
                    {" "}
                    <div className="text-sm text-muted-foreground">
                      Tier 1
                    </div>{" "}
                    <div className="text-lg font-medium">
                      {c.categories.tier1}
                    </div>{" "}
                  </div>{" "}
                  <div className="rounded-md border p-3">
                    {" "}
                    <div className="text-sm text-muted-foreground">
                      Tier 2
                    </div>{" "}
                    <div className="text-lg font-medium">
                      {c.categories.tier2 || "—"}
                    </div>{" "}
                  </div>{" "}
                  <div className="rounded-md border p-3">
                    {" "}
                    <div className="text-sm text-muted-foreground">
                      Tier 3
                    </div>{" "}
                    <div className="text-lg font-medium">
                      {c.categories.tier3 || "—"}
                    </div>{" "}
                  </div>{" "}
                  <div className="rounded-md border p-3">
                    {" "}
                    <div className="text-sm text-muted-foreground">
                      Standard Unit
                    </div>{" "}
                    <div className="text-lg font-medium">
                      {c.standardUnit}
                    </div>{" "}
                  </div>{" "}
                </div>
              );
            })()}{" "}
          </TabsContent>{" "}
          <TabsContent value="conversions">
            {" "}
            <div className="space-y-4">
              {" "}
              <div className="rounded-lg border p-3">
                {" "}
                <div className="flex flex-col gap-2">
                  {" "}
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Purchase option
                  </div>{" "}
                  {packRows.length ? (
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={String(selectedPurchaseIndex)}
                      onChange={(event) =>
                        setSelectedPurchaseIndex(Number(event.target.value))
                      }
                    >
                      {" "}
                      {packRows.map((row, idx) => (
                        <option key={row.key} value={idx}>
                          {" "}
                          {row.vendor} — {row.packSummary}{" "}
                        </option>
                      ))}{" "}
                    </select>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No purchase units recorded yet.
                    </p>
                  )}{" "}
                </div>{" "}
                {activePack && (
                  <div className="mt-3 space-y-3 rounded-md border bg-background/70 p-3">
                    {" "}
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Selected pack
                    </div>{" "}
                    <div className="text-sm font-semibold">
                      {activePack.vendor}
                    </div>{" "}
                    <div className="text-sm font-medium">
                      {activePack.packSummary}
                    </div>{" "}
                    {activePack.notes && (
                      <div className="text-xs text-muted-foreground">
                        {activePack.notes}
                      </div>
                    )}{" "}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {" "}
                      <div>
                        {" "}
                        <div className="text-xs text-muted-foreground">
                          Recipe Units (oz)
                        </div>{" "}
                        <div className="font-semibold">
                          {activePack.recipeUnitsLabel}
                        </div>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <div className="text-xs text-muted-foreground">
                          Each Count
                        </div>{" "}
                        <div className="font-semibold">
                          {activePack.eachCountLabel}
                        </div>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <div className="text-xs text-muted-foreground">
                          Cost / Recipe Unit
                        </div>{" "}
                        <div className="font-semibold">
                          {activePack.costPerRecipeLabel}
                        </div>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <div className="text-xs text-muted-foreground">
                          Cost / Each
                        </div>{" "}
                        <div className="font-semibold">
                          {activePack.costPerEachLabel}
                        </div>{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>
                )}{" "}
              </div>{" "}
              <div className="rounded-lg border p-3">
                {" "}
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Quick Calculator
                </div>{" "}
                <div className="mt-3 flex gap-2">
                  {" "}
                  <input
                    className="w-28 rounded border bg-background px-2 py-2 text-sm"
                    type="number"
                    step="0.01"
                    value={conversionQty}
                    onChange={(e) =>
                      setConversionQty(Number(e.target.value) || 0)
                    }
                  />{" "}
                  <select
                    className="w-32 rounded border bg-background px-2 py-2 text-sm"
                    value={conversionUnit}
                    onChange={(e) => setConversionUnit(e.target.value)}
                  >
                    {" "}
                    <option value="oz">oz</option>{" "}
                    <option value="lb">lb</option> <option value="g">g</option>{" "}
                    <option value="kg">kg</option>{" "}
                    <option value="ml">ml</option> <option value="l">l</option>{" "}
                    <option value="each">each</option>{" "}
                  </select>{" "}
                </div>{" "}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {" "}
                  <ConversionTile
                    label="US oz"
                    value={conversionSummary.ounces}
                    precision={2}
                  />{" "}
                  <ConversionTile
                    label="Pounds"
                    value={conversionSummary.pounds}
                    precision={3}
                  />{" "}
                  <ConversionTile
                    label="Grams"
                    value={conversionSummary.grams}
                    precision={1}
                  />{" "}
                  <ConversionTile
                    label="Milliliters"
                    value={conversionSummary.milliliters}
                    precision={1}
                  />{" "}
                  <ConversionTile
                    label="Liters"
                    value={conversionSummary.liters}
                    precision={3}
                  />{" "}
                </div>{" "}
                <div className="mt-3 text-[0.7rem] text-muted-foreground">
                  {" "}
                  Use this to break vendor packs into recipe-ready units or bar
                  specs.{" "}
                </div>{" "}
              </div>{" "}
              {packRows.length ? (
                <div className="rounded-lg border">
                  {" "}
                  <Table>
                    {" "}
                    <TableHeader>
                      {" "}
                      <TableRow>
                        {" "}
                        <TableHead>Vendor</TableHead>{" "}
                        <TableHead>Pack &amp; Unit</TableHead>{" "}
                        <TableHead>Recipe Units (oz)</TableHead>{" "}
                        <TableHead>Each Count</TableHead>{" "}
                        <TableHead className="text-right">
                          Cost / Recipe Unit
                        </TableHead>{" "}
                        <TableHead className="text-right">
                          Cost / Each
                        </TableHead>{" "}
                      </TableRow>{" "}
                    </TableHeader>{" "}
                    <TableBody>
                      {" "}
                      {packRows.map((row) => (
                        <TableRow key={row.key}>
                          {" "}
                          <TableCell>{row.vendor}</TableCell>{" "}
                          <TableCell>
                            {" "}
                            <div className="text-sm font-medium">
                              {row.packSummary}
                            </div>{" "}
                            {row.notes && (
                              <div className="text-xs text-muted-foreground">
                                {row.notes}
                              </div>
                            )}{" "}
                          </TableCell>{" "}
                          <TableCell>{row.recipeUnitsLabel}</TableCell>{" "}
                          <TableCell>{row.eachCountLabel}</TableCell>{" "}
                          <TableCell className="text-right">
                            {row.costPerRecipeLabel}
                          </TableCell>{" "}
                          <TableCell className="text-right">
                            {row.costPerEachLabel}
                          </TableCell>{" "}
                        </TableRow>
                      ))}{" "}
                    </TableBody>{" "}
                  </Table>{" "}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {" "}
                  Add vendor purchase units to unlock pack breakdowns and
                  conversions.{" "}
                </div>
              )}{" "}
            </div>{" "}
          </TabsContent>{" "}
          <TabsContent value="storage">
            {" "}
            <div className="rounded-lg border">
              {" "}
              <Table>
                {" "}
                <TableHeader>
                  {" "}
                  <TableRow>
                    {" "}
                    <TableHead>Storage</TableHead>{" "}
                    <TableHead>Bin</TableHead>{" "}
                  </TableRow>{" "}
                </TableHeader>{" "}
                <TableBody>
                  {" "}
                  {item.storage.map((s, idx) => (
                    <TableRow key={idx}>
                      {" "}
                      <TableCell>{s.name}</TableCell>{" "}
                      <TableCell>{s.bin || "—"}</TableCell>{" "}
                    </TableRow>
                  ))}{" "}
                  {!item.storage.length && (
                    <TableRow>
                      {" "}
                      <TableCell
                        colSpan={2}
                        className="text-center text-sm text-muted-foreground"
                      >
                        {" "}
                        No storage locations recorded.{" "}
                      </TableCell>{" "}
                    </TableRow>
                  )}{" "}
                </TableBody>{" "}
              </Table>{" "}
            </div>{" "}
          </TabsContent>{" "}
          <TabsContent value="history">
            {" "}
            <div className="rounded-lg border">
              {" "}
              <Table>
                {" "}
                <TableHeader>
                  {" "}
                  <TableRow>
                    {" "}
                    <TableHead>Date</TableHead> <TableHead>Vendor</TableHead>{" "}
                    <TableHead>Qty</TableHead>{" "}
                    <TableHead className="w-[16ch] text-right">
                      Unit Price
                    </TableHead>{" "}
                    <TableHead className="w-[16ch] text-right">
                      Total Cost
                    </TableHead>{" "}
                  </TableRow>{" "}
                </TableHeader>{" "}
                <TableBody>
                  {" "}
                  {receiptRows.map((r) => {
                    const unitPrice = r.qty ? r.totalCost / r.qty : 0;
                    return (
                      <TableRow key={r.id + r.date}>
                        {" "}
                        <TableCell>
                          {new Date(r.date).toLocaleDateString()}
                        </TableCell>{" "}
                        <TableCell>{r.vendorName}</TableCell>{" "}
                        <TableCell>
                          {" "}
                          {r.qty} {r.unit}{" "}
                        </TableCell>{" "}
                        <TableCell className="text-right">
                          ${unitPrice.toFixed(4)}
                        </TableCell>{" "}
                        <TableCell className="text-right">
                          ${r.totalCost.toFixed(2)}
                        </TableCell>{" "}
                      </TableRow>
                    );
                  })}{" "}
                  {!receiptRows.length && (
                    <TableRow>
                      {" "}
                      <TableCell
                        colSpan={5}
                        className="text-center text-sm text-muted-foreground"
                      >
                        {" "}
                        No receipts.{" "}
                      </TableCell>{" "}
                    </TableRow>
                  )}{" "}
                </TableBody>{" "}
              </Table>{" "}
            </div>{" "}
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {" "}
              <Badge variant="secondary">Traceable</Badge>{" "}
              <span>
                Lifecycle is reconstructed from receipts and counts.
              </span>{" "}
            </div>{" "}
          </TabsContent>{" "}
          <TabsContent value="recall">
            {" "}
            <div className="rounded-lg border">
              {" "}
              <Table>
                {" "}
                <TableHeader>
                  {" "}
                  <TableRow>
                    {" "}
                    <TableHead>Outlet</TableHead> <TableHead>Date</TableHead>{" "}
                    <TableHead>Vendor</TableHead>{" "}
                    <TableHead>Qty</TableHead>{" "}
                  </TableRow>{" "}
                </TableHeader>{" "}
                <TableBody>
                  {" "}
                  {(() => {
                    const allReceipts = Store.listReceipts();
                    const allVendors = Store.listVendors();
                    const allOutlets = Store.listOutlets();
                    const rows: {
                      outlet: string;
                      date: string;
                      vendor: string;
                      qty: number;
                      unit: string;
                    }[] = [];
                    for (const r of allReceipts) {
                      for (const l of r.lines) {
                        if (
                          l.productName.toLowerCase() ===
                          item.name.toLowerCase()
                        ) {
                          const outletName =
                            allOutlets.find((o) => o.id === (r as any).outletId)
                              ?.name || "Unknown Outlet";
                          const vendorName =
                            allVendors.find((v) => v.id === r.vendorId)?.name ||
                            "Unknown Vendor";
                          rows.push({
                            outlet: outletName,
                            date: r.date,
                            vendor: vendorName,
                            qty: l.qty,
                            unit: l.unit,
                          });
                        }
                      }
                    }
                    rows.sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime(),
                    );
                    return rows.map((row, idx) => (
                      <TableRow key={`${row.outlet}-${row.date}-${idx}`}>
                        {" "}
                        <TableCell>{row.outlet}</TableCell>{" "}
                        <TableCell>
                          {new Date(row.date).toLocaleDateString()}
                        </TableCell>{" "}
                        <TableCell>{row.vendor}</TableCell>{" "}
                        <TableCell>
                          {" "}
                          {row.qty} {row.unit}{" "}
                        </TableCell>{" "}
                      </TableRow>
                    ));
                  })()}{" "}
                </TableBody>{" "}
              </Table>{" "}
            </div>{" "}
            <div className="mt-2 text-xs text-muted-foreground">
              {" "}
              Use this list to identify where affected product was received
              across the estate.{" "}
            </div>{" "}
          </TabsContent>{" "}
        </Tabs>{" "}
      </DialogContent>{" "}
    </Dialog>
  );
}
function ConversionTile({
  label,
  value,
  precision,
}: {
  label: string;
  value: number | null;
  precision: number;
}) {
  return (
    <div className="rounded-md border p-3">
      {" "}
      <div className="text-xs text-muted-foreground">{label}</div>{" "}
      <div className="text-lg font-medium">
        {value == null || Number.isNaN(value) ? "—" : value.toFixed(precision)}
      </div>{" "}
    </div>
  );
}
function analysePack(unit: PurchaseUnit): PackAnalysis {
  const baseUnit = normalizeUnit(unit.unit);
  const pack = unit.pack?.trim() ?? "";
  if (!pack) {
    return {
      display: "",
      totalOunces: baseUnit === "each" ? null : toOunces(1, baseUnit),
      eachCount: baseUnit === "each" ? 1 : null,
      baseUnit,
      packQuantity: 1,
      innerQuantity: 1,
    };
  }
  const multiMatch = pack.match(
    /^(\d+(?:\.\d+)?)\s*(?:x|\/|\*)\s*(\d+(?:\.\d+)?)\s*([a-z#]+)$/i,
  );
  if (multiMatch) {
    const outer = Number(multiMatch[1]);
    const inner = Number(multiMatch[2]);
    const token = normalizeUnit(multiMatch[3]);
    const totalInner = outer * inner;
    return {
      display: pack,
      totalOunces: token === "each" ? null : toOunces(totalInner, token),
      eachCount: token === "each" ? totalInner : null,
      baseUnit: token,
      packQuantity: outer,
      innerQuantity: inner,
    };
  }
  const countMatch = pack.match(/^(\d+(?:\.\d+)?)\s*(ct|count|each|ea)$/i);
  if (countMatch) {
    const qty = Number(countMatch[1]);
    return {
      display: pack,
      totalOunces: null,
      eachCount: qty,
      baseUnit: "each",
      packQuantity: 1,
      innerQuantity: qty,
    };
  }
  const weightMatch = pack.match(/^(\d+(?:\.\d+)?)\s*([a-z#0-9]+)$/i);
  if (weightMatch) {
    const qty = Number(weightMatch[1]);
    const token = normalizeUnit(weightMatch[2]);
    return {
      display: pack,
      totalOunces: token === "each" ? null : toOunces(qty, token),
      eachCount: token === "each" ? qty : null,
      baseUnit: token,
      packQuantity: 1,
      innerQuantity: qty,
    };
  }
  return {
    display: pack,
    totalOunces: baseUnit === "each" ? null : toOunces(1, baseUnit),
    eachCount: baseUnit === "each" ? 1 : null,
    baseUnit,
    packQuantity: null,
    innerQuantity: null,
  };
}
function buildPackNotes(analysis: PackAnalysis): string | null {
  if (analysis.eachCount && analysis.totalOunces) {
    return `${formatNumber(analysis.eachCount)} each ≈ ${formatNumber(analysis.totalOunces)} oz total`;
  }
  if (analysis.eachCount) {
    return `${formatNumber(analysis.eachCount)} each`;
  }
  if (analysis.totalOunces) {
    return `${formatNumber(analysis.totalOunces)} oz`;
  }
  return null;
}
function formatNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value))
    return "—";
  const formatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: value >= 100 ? 1 : 3,
  });
  return formatter.format(value);
}
function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value))
    return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(value);
}
