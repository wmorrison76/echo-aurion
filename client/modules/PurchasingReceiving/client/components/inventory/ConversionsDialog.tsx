import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { SettingsStore } from "@/lib/settings";
import { Store } from "@/lib/store";
import { RoleGuard, useAuth } from "@/context/AuthContext";
import type { InventoryItem, PurchaseUnit } from "@shared/inventory";
import { normalizeUnit, toOunces } from "@shared/api";
interface ConversionsDialogProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  outletId: string;
  initialItemId?: string | null;
}
interface PackAnalysis {
  display: string;
  totalOunces: number | null;
  eachCount: number | null;
  baseUnit: string | null;
  packQuantity: number | null;
  innerQuantity: number | null;
}
const TARGET_UNITS: Array<{ unit: string; label: string }> = [
  { unit: "oz", label: "US oz" },
  { unit: "lb", label: "Pounds" },
  { unit: "g", label: "Grams" },
  { unit: "kg", label: "Kilograms" },
  { unit: "ml", label: "Milliliters" },
  { unit: "l", label: "Liters" },
];
export function ConversionsDialog({
  open,
  onOpenChange,
  outletId,
  initialItemId,
}: ConversionsDialogProps) {
  const { hasRole } = useAuth();
  const canManageRules = hasRole("Admin", "Manager");
  const [itemRevision, setItemRevision] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [conversionVersion, setConversionVersion] = useState(0);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [calcQuantity, setCalcQuantity] = useState(1);
  const [calcUnit, setCalcUnit] = useState("lb");
  const [formFrom, setFormFrom] = useState("case");
  const [formTo, setFormTo] = useState("each");
  const [formFactor, setFormFactor] = useState(1);
  useEffect(() => {
    if (open && initialItemId) {
      setSelectedItemId(initialItemId);
    }
  }, [open, initialItemId]);
  useEffect(() => {
    if (!open) {
      setSelectorOpen(false);
    }
  }, [open]);
  useEffect(() => {
    const refresh = () => setItemRevision((v) => v + 1);
    window.addEventListener("echo:item:save", refresh as any);
    window.addEventListener("echo:item:bulk-update", refresh as any);
    window.addEventListener("echo:receipt:save", refresh as any);
    window.addEventListener("echo:outlet:save", refresh as any);
    return () => {
      window.removeEventListener("echo:item:save", refresh as any);
      window.removeEventListener("echo:item:bulk-update", refresh as any);
      window.removeEventListener("echo:receipt:save", refresh as any);
      window.removeEventListener("echo:outlet:save", refresh as any);
    };
  }, []);
  const items = useMemo(
    () => Store.listItems().filter((item) => item.outletId === outletId),
    [itemRevision, outletId, open],
  );
  useEffect(() => {
    if (!open) return;
    if (selectedItemId && items.some((item) => item.id === selectedItemId))
      return;
    setSelectedItemId(items[0]?.id ?? null);
  }, [items, open, selectedItemId]);
  const vendors = useMemo(() => Store.listVendors(), [itemRevision, open]);
  const vendorName = useCallback(
    (vendorId: string | null | undefined) => {
      if (!vendorId) return "—";
      const vendor = vendors.find((v) => v.id === vendorId);
      return vendor ? vendor.name : "—";
    },
    [vendors],
  );
  const outlets = useMemo(() => Store.listOutlets(), [itemRevision, open]);
  const outletName = useCallback(
    (id: string | null | undefined) =>
      outlets.find((outlet) => outlet.id === id)?.name ?? "—",
    [outlets],
  );
  const receipts = useMemo(() => Store.listReceipts(), [itemRevision, open]);
  const conversions = useMemo(
    () => SettingsStore.get().conversions,
    [conversionVersion, open],
  );
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );
  const calculatorResults = useMemo(() => {
    const normalizedUnit = normalizeUnit(calcUnit);
    if (!calcQuantity || calcQuantity < 0) {
      return TARGET_UNITS.map(({ unit, label }) => ({
        unit,
        label,
        value: null,
      }));
    }
    if (normalizedUnit === "each") {
      return TARGET_UNITS.map(({ unit, label }) => ({
        unit,
        label,
        value: unit === "oz" ? null : null,
      }));
    }
    const baseOunces = toOunces(calcQuantity, normalizedUnit);
    return TARGET_UNITS.map(({ unit, label }) => ({
      unit,
      label,
      value: convertFromOunces(baseOunces, unit),
    }));
  }, [calcQuantity, calcUnit, conversionVersion]);
  const packRows = useMemo<
    Array<{ key: string } & ReturnType<typeof describePurchaseUnit>>
  >(() => {
    if (!selectedItem) return [];
    return selectedItem.purchaseUnits.map((unit, index) => ({
      key: `${selectedItem.id}-${index}`,
      ...describePurchaseUnit(
        unit,
        vendorName(unit.vendorId),
        conversionVersion,
      ),
    }));
  }, [selectedItem, vendorName, conversionVersion]);
  const historyRows = useMemo(() => {
    if (!selectedItem)
      return [] as {
        id: string;
        date: string;
        vendor: string;
        qty: number;
        unit: string;
        totalCost: number;
      }[];
    const rows: {
      id: string;
      date: string;
      vendor: string;
      qty: number;
      unit: string;
      totalCost: number;
    }[] = [];
    for (const receipt of receipts) {
      for (const line of receipt.lines) {
        if (
          line.productName.toLowerCase() === selectedItem.name.toLowerCase()
        ) {
          rows.push({
            id: receipt.id,
            date: receipt.date,
            vendor: vendorName(receipt.vendorId),
            qty: line.qty,
            unit: line.unit,
            totalCost: line.totalCost,
          });
        }
      }
    }
    rows.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return rows;
  }, [receipts, selectedItem, vendorName]);
  const saveRule = useCallback(() => {
    const normalizedFrom = normalizeUnit(formFrom);
    const normalizedTo = normalizeUnit(formTo);
    if (
      !normalizedFrom ||
      !normalizedTo ||
      !formFactor ||
      Number.isNaN(formFactor)
    ) {
      return;
    }
    SettingsStore.upsertConversion({
      from: normalizedFrom,
      to: normalizedTo,
      factor: formFactor,
    });
    setConversionVersion((v) => v + 1);
  }, [formFactor, formFrom, formTo]);
  const removeRule = useCallback((from: string, to: string) => {
    SettingsStore.removeConversion({ from, to, factor: 1 });
    setConversionVersion((v) => v + 1);
  }, []);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {" "}
      <DialogContent className="max-w-6xl">
        {" "}
        <DialogHeader>
          {" "}
          <DialogTitle>Conversions &amp; Pack Breakdown</DialogTitle>{" "}
          <DialogDescription>
            {" "}
            Break down vendor packs, calculate recipe-ready units, and review
            the item&apos;s purchase, storage, and department context without
            leaving Inventory.{" "}
          </DialogDescription>{" "}
        </DialogHeader>{" "}
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {" "}
          <div className="space-y-4">
            {" "}
            <section className="rounded-lg border p-4">
              {" "}
              <header className="mb-3 space-y-1">
                {" "}
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Quick Calculator
                </h3>{" "}
                <p className="text-xs text-muted-foreground">
                  Enter a quantity and unit to see common conversions. Custom
                  rules apply automatically.
                </p>{" "}
              </header>{" "}
              <div className="flex gap-2">
                {" "}
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={calcQuantity}
                  onChange={(event) =>
                    setCalcQuantity(Number(event.target.value) || 0)
                  }
                />{" "}
                <Input
                  value={calcUnit}
                  onChange={(event) => setCalcUnit(event.target.value)}
                  placeholder="Unit"
                  className="w-32"
                />{" "}
              </div>{" "}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {" "}
                {calculatorResults.map(({ unit, label, value }) => (
                  <div key={unit} className="rounded-md border p-3">
                    {" "}
                    <div className="text-xs text-muted-foreground">
                      {label}
                    </div>{" "}
                    <div className="text-lg font-semibold">
                      {value == null ? "—" : formatNumber(value)}
                    </div>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
              <p className="mt-3 text-[0.7rem] text-muted-foreground">
                {" "}
                Conversions route through US ounces as the hub unit. Add rules
                below for specialty packs (bags, sleeves, each to weight,
                etc.).{" "}
              </p>{" "}
            </section>{" "}
            <RoleGuard roles={["Admin", "Manager"]}>
              {" "}
              <section className="rounded-lg border p-4">
                {" "}
                <header className="mb-3 space-y-1">
                  {" "}
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Manage Conversion Rules
                  </h3>{" "}
                  <p className="text-xs text-muted-foreground">
                    Rules override defaults and power the calculator plus pack
                    breakdowns.
                  </p>{" "}
                </header>{" "}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                  {" "}
                  <Input
                    value={formFrom}
                    onChange={(event) => setFormFrom(event.target.value)}
                    placeholder="From unit"
                  />{" "}
                  <Input
                    value={formTo}
                    onChange={(event) => setFormTo(event.target.value)}
                    placeholder="To unit"
                  />{" "}
                  <Input
                    type="number"
                    step="0.01"
                    value={formFactor}
                    onChange={(event) =>
                      setFormFactor(Number(event.target.value) || 0)
                    }
                    placeholder="Factor"
                  />{" "}
                  <Button onClick={saveRule}>Save</Button>{" "}
                </div>{" "}
                <div className="mt-4 rounded-md border">
                  {" "}
                  <Table>
                    {" "}
                    <TableHeader>
                      {" "}
                      <TableRow>
                        {" "}
                        <TableHead>From</TableHead> <TableHead>To</TableHead>{" "}
                        <TableHead className="text-right">Factor</TableHead>{" "}
                        <TableHead></TableHead>{" "}
                      </TableRow>{" "}
                    </TableHeader>{" "}
                    <TableBody>
                      {" "}
                      {conversions.map((rule) => (
                        <TableRow key={`${rule.from}-${rule.to}`}>
                          {" "}
                          <TableCell className="uppercase">
                            {rule.from}
                          </TableCell>{" "}
                          <TableCell className="uppercase">{rule.to}</TableCell>{" "}
                          <TableCell className="text-right">
                            {formatNumber(rule.factor)}
                          </TableCell>{" "}
                          <TableCell className="text-right">
                            {" "}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRule(rule.from, rule.to)}
                            >
                              {" "}
                              Remove{" "}
                            </Button>{" "}
                          </TableCell>{" "}
                        </TableRow>
                      ))}{" "}
                      {!conversions.length && (
                        <TableRow>
                          {" "}
                          <TableCell
                            colSpan={4}
                            className="text-center text-sm text-muted-foreground"
                          >
                            {" "}
                            No custom rules yet.{" "}
                          </TableCell>{" "}
                        </TableRow>
                      )}{" "}
                    </TableBody>{" "}
                  </Table>{" "}
                </div>{" "}
              </section>{" "}
            </RoleGuard>{" "}
            {!canManageRules && (
              <p className="text-[0.7rem] text-muted-foreground">
                {" "}
                Conversion rules are view-only for your role. Ask an Admin or
                Manager to add new factors.{" "}
              </p>
            )}{" "}
          </div>{" "}
          <div className="space-y-4">
            {" "}
            <section className="rounded-lg border p-4">
              {" "}
              <div className="flex flex-wrap items-start justify-between gap-3">
                {" "}
                <div>
                  {" "}
                  <h3 className="text-base font-semibold">
                    {selectedItem ? selectedItem.name : "Select an item"}
                  </h3>{" "}
                  <p className="text-xs text-muted-foreground">
                    {" "}
                    Outlet:{" "}
                    {selectedItem
                      ? outletName(selectedItem.outletId)
                      : outletName(outletId)}{" "}
                  </p>{" "}
                </div>{" "}
                {items.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectorOpen(true)}
                  >
                    {" "}
                    {selectedItem ? "Change Item" : "Choose Item"}{" "}
                  </Button>
                )}{" "}
              </div>{" "}
              {selectedItem ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {" "}
                  <InfoTile
                    label="Primary Vendor"
                    value={primaryVendorLabel(selectedItem)}
                  />{" "}
                  <InfoTile
                    label="Last Received"
                    value={formatDate(selectedItem.lastReceiptDate)}
                  />{" "}
                  <InfoTile label="GL" value={formatGL(selectedItem)} />{" "}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No inventory items for this outlet yet.
                </p>
              )}{" "}
              {selectedItem?.categories && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {" "}
                  <Badge variant="secondary">
                    {selectedItem.categories.tier1}
                  </Badge>{" "}
                  {selectedItem.categories.tier2 && (
                    <Badge variant="outline">
                      {selectedItem.categories.tier2}
                    </Badge>
                  )}{" "}
                  {selectedItem.categories.tier3 && (
                    <Badge variant="outline">
                      {selectedItem.categories.tier3}
                    </Badge>
                  )}{" "}
                </div>
              )}{" "}
            </section>{" "}
            <section className="rounded-lg border p-4">
              {" "}
              <header className="mb-3 space-y-1">
                {" "}
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Pack Breakdown
                </h4>{" "}
                <p className="text-xs text-muted-foreground">
                  Approximate recipe-ready units per purchase option plus cost
                  per base.
                </p>{" "}
              </header>{" "}
              <div className="rounded-md border">
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
                    {!packRows.length && (
                      <TableRow>
                        {" "}
                        <TableCell
                          colSpan={6}
                          className="text-center text-sm text-muted-foreground"
                        >
                          {" "}
                          No purchase units recorded for this item yet.{" "}
                        </TableCell>{" "}
                      </TableRow>
                    )}{" "}
                  </TableBody>{" "}
                </Table>{" "}
              </div>{" "}
            </section>{" "}
            <section className="rounded-lg border p-4">
              {" "}
              <header className="mb-3 space-y-1">
                {" "}
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Purchase History
                </h4>{" "}
                <p className="text-xs text-muted-foreground">
                  Recent receipts with cost transparency.
                </p>{" "}
              </header>{" "}
              <div className="rounded-md border">
                {" "}
                <Table>
                  {" "}
                  <TableHeader>
                    {" "}
                    <TableRow>
                      {" "}
                      <TableHead>Date</TableHead> <TableHead>Vendor</TableHead>{" "}
                      <TableHead>Qty</TableHead>{" "}
                      <TableHead className="text-right">Unit Price</TableHead>{" "}
                      <TableHead className="text-right">
                        Total Cost
                      </TableHead>{" "}
                    </TableRow>{" "}
                  </TableHeader>{" "}
                  <TableBody>
                    {" "}
                    {historyRows.map((row) => (
                      <TableRow key={`${row.id}-${row.date}`}>
                        {" "}
                        <TableCell>{formatDate(row.date)}</TableCell>{" "}
                        <TableCell>{row.vendor}</TableCell>{" "}
                        <TableCell>{`${formatNumber(row.qty)} ${row.unit}`}</TableCell>{" "}
                        <TableCell className="text-right">
                          {formatCurrency(
                            row.qty ? row.totalCost / row.qty : null,
                          )}
                        </TableCell>{" "}
                        <TableCell className="text-right">
                          {formatCurrency(row.totalCost)}
                        </TableCell>{" "}
                      </TableRow>
                    ))}{" "}
                    {!historyRows.length && (
                      <TableRow>
                        {" "}
                        <TableCell
                          colSpan={5}
                          className="text-center text-sm text-muted-foreground"
                        >
                          {" "}
                          No purchase history yet. Scanned invoices will
                          populate this view.{" "}
                        </TableCell>{" "}
                      </TableRow>
                    )}{" "}
                  </TableBody>{" "}
                </Table>{" "}
              </div>{" "}
            </section>{" "}
            <section className="rounded-lg border p-4">
              {" "}
              <header className="mb-3 space-y-1">
                {" "}
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Storage &amp; Department Access
                </h4>{" "}
                <p className="text-xs text-muted-foreground">
                  Where the item lives today and which teams rely on it.
                </p>{" "}
              </header>{" "}
              <div className="grid gap-3 sm:grid-cols-2">
                {" "}
                <div className="rounded-md border p-3">
                  {" "}
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Storage Locations
                  </div>{" "}
                  <div className="mt-2 space-y-1 text-sm">
                    {" "}
                    {selectedItem?.storage.length ? (
                      selectedItem.storage.map((location, index) => (
                        <div
                          key={`${location.outletId}-${location.name}-${index}`}
                        >
                          {" "}
                          <span className="font-medium">
                            {location.name}
                          </span>{" "}
                          {location.bin && (
                            <span className="text-muted-foreground">
                              {" "}
                              — Bin {location.bin}
                            </span>
                          )}{" "}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No storage locations recorded.
                      </p>
                    )}{" "}
                  </div>{" "}
                </div>{" "}
                <div className="rounded-md border p-3">
                  {" "}
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Department Context
                  </div>{" "}
                  <div className="mt-2 space-y-1 text-sm">
                    {" "}
                    {selectedItem?.categories ? (
                      <>
                        {" "}
                        <div>
                          Tier 1:{" "}
                          <span className="font-medium">
                            {selectedItem.categories.tier1}
                          </span>
                        </div>{" "}
                        <div>
                          Tier 2:{" "}
                          <span className="font-medium">
                            {selectedItem.categories.tier2 ?? "—"}
                          </span>
                        </div>{" "}
                        <div>
                          Tier 3:{" "}
                          <span className="font-medium">
                            {selectedItem.categories.tier3 ?? "—"}
                          </span>
                        </div>{" "}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No classification data yet.
                      </p>
                    )}{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
            </section>{" "}
          </div>{" "}
        </div>{" "}
        <CommandDialog open={selectorOpen} onOpenChange={setSelectorOpen}>
          {" "}
          <CommandInput placeholder="Search inventory items..." />{" "}
          <CommandList>
            {" "}
            <CommandEmpty>No matching items.</CommandEmpty>{" "}
            <CommandGroup heading="Items">
              {" "}
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={() => {
                    setSelectedItemId(item.id);
                    setSelectorOpen(false);
                  }}
                >
                  {" "}
                  <div>
                    {" "}
                    <div className="font-medium">{item.name}</div>{" "}
                    <div className="text-xs text-muted-foreground">
                      {vendorName(item.purchaseUnits[0]?.vendorId)}
                    </div>{" "}
                  </div>{" "}
                </CommandItem>
              ))}{" "}
            </CommandGroup>{" "}
          </CommandList>{" "}
        </CommandDialog>{" "}
      </DialogContent>{" "}
    </Dialog>
  );
}
function describePurchaseUnit(
  unit: PurchaseUnit,
  vendor: string,
  conversionVersion: number,
) {
  const analysis = analysePack(unit, conversionVersion);
  const recipeUnitsLabel =
    analysis.totalOunces != null
      ? `${formatNumber(analysis.totalOunces)} oz`
      : "—";
  const eachCountLabel =
    analysis.eachCount != null ? formatNumber(analysis.eachCount) : "—";
  const costPerRecipeLabel = formatCurrency(
    unit.lastUnitPrice != null && analysis.totalOunces
      ? unit.lastUnitPrice / analysis.totalOunces
      : null,
  );
  const costPerEachLabel = formatCurrency(
    unit.lastUnitPrice != null && analysis.eachCount
      ? unit.lastUnitPrice / analysis.eachCount
      : null,
  );
  const packSummary = `${unit.unit}${analysis.display ? ` • ${analysis.display}` : ""}`;
  const notes = buildPackNotes(analysis);
  return {
    vendor,
    packSummary,
    recipeUnitsLabel,
    eachCountLabel,
    costPerRecipeLabel,
    costPerEachLabel,
    notes,
  };
}
function analysePack(
  unit: PurchaseUnit,
  _conversionVersion: number,
): PackAnalysis {
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
function convertFromOunces(ounces: number, targetUnit: string) {
  switch (targetUnit) {
    case "oz":
      return ounces;
    case "lb":
      return ounces / 16;
    case "g":
      return ounces * 28.3495;
    case "kg":
      return (ounces * 28.3495) / 1000;
    case "ml":
      return ounces * 29.5735;
    case "l":
      return (ounces * 29.5735) / 1000;
    default:
      return null;
  }
}
function formatNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  if (!Number.isFinite(value)) return "—";
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
function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}
function formatGL(item: InventoryItem | null) {
  if (!item) return "—";
  if (item.glCode && item.glName) return `${item.glCode} • ${item.glName}`;
  return item.glCode ?? item.glName ?? "—";
}
function primaryVendorLabel(item: InventoryItem | null) {
  if (!item) return "—";
  const unit = item.purchaseUnits[0];
  if (!unit) return "—";
  const vendorId = unit.vendorId;
  if (!vendorId) return "—";
  const vendor = Store.listVendors().find((v) => v.id === vendorId);
  return vendor ? vendor.name : "—";
}
function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      {" "}
      <div className="text-xs text-muted-foreground">{label}</div>{" "}
      <div className="text-sm font-semibold">{value}</div>{" "}
    </div>
  );
}
