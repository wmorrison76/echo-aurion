import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePhysicalInventoryInsights } from "@/hooks/use-physical-inventory-insights";
import { useToast } from "@/hooks/use-toast";
import { Store, id } from "@/lib/store";
import type {
  CountSession,
  InventoryItem,
  StandardCostInsight,
  StorageArea,
  StorageBin,
  StorageRack,
} from "@shared/inventory";
import type { Outlet } from "@shared/purchasing";
const ALL_OPTION = "__all__";
interface CountLineRow {
  item: InventoryItem;
  bin: StorageBin | null;
  rack: StorageRack | null;
  area: StorageArea | null;
}
const unitForItem = (item: InventoryItem) =>
  item.purchaseUnits[0]?.unit || item.standardUnit || "each";
const normalizeName = (value: string) => value.trim().toLowerCase();
const MIN_SPLIT_PACK = 2;
const MAX_SPLIT_PACK = 24;
const sanitizeNonNegative = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
};
const sanitizeWhole = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
};
const resolvePackSize = (
  rawSize?: number | null,
  label?: string | null,
): number | null => {
  let size: number | null = null;
  if (typeof rawSize === "number" && Number.isFinite(rawSize)) {
    size = Math.round(rawSize);
  }
  if ((!size || size < MIN_SPLIT_PACK || size > MAX_SPLIT_PACK) && label) {
    const ratioMatch = label.match(
      /(\d+(?:\.\d+)?)\s*(?:x|\/|by)\s*(\d+(?:\.\d+)?)/i,
    );
    if (ratioMatch) {
      const first = Number.parseFloat(ratioMatch[1]);
      const second = Number.parseFloat(ratioMatch[2]);
      if (Number.isFinite(first) && Number.isFinite(second)) {
        if (second <= 1.5) {
          size = Math.round(first);
        } else {
          const product = first * second;
          if (product >= MIN_SPLIT_PACK && product <= MAX_SPLIT_PACK) {
            size = Math.round(product);
          }
        }
      }
    } else {
      const singleMatch = label.match(/(\d+(?:\.\d+)?)/);
      if (!size && singleMatch) {
        const candidate = Math.round(Number.parseFloat(singleMatch[1]));
        if (candidate >= MIN_SPLIT_PACK && candidate <= MAX_SPLIT_PACK) {
          size = candidate;
        }
      }
    }
  }
  if (!size || size < MIN_SPLIT_PACK || size > MAX_SPLIT_PACK) {
    return null;
  }
  return size;
};
const computeSplitFromTotal = (total: number, packSize: number) => {
  const safe = sanitizeNonNegative(total);
  const cases = Math.floor(safe / packSize);
  const each = Math.max(Math.round(safe - cases * packSize), 0);
  return { cases, each };
};
export function PhysicalInventoryWorkspace() {
  const { toast } = useToast();
  const [outlets, setOutlets] = useState<Outlet[]>(() => Store.listOutlets());
  const [selectedOutletId, setSelectedOutletId] = useState<string>(
    () => outlets[0]?.id ?? "",
  );
  const [selectedAreaId, setSelectedAreaId] = useState<string>(ALL_OPTION);
  const [selectedRackId, setSelectedRackId] = useState<string>(ALL_OPTION);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [splitQuantities, setSplitQuantities] = useState<
    Record<string, { cases: number; each: number }>
  >({});
  const {
    standardCosts,
    status: insightsStatus,
    isLoading: insightsLoading,
    errorMessage: insightsError,
  } = usePhysicalInventoryInsights({
    outletId: selectedOutletId || undefined,
    days: 30,
  });
  const costByName = useMemo(() => {
    const map = new Map<string, StandardCostInsight>();
    for (const cost of standardCosts) {
      if (!cost.productName) continue;
      map.set(normalizeName(cost.productName), cost);
    }
    return map;
  }, [standardCosts]);
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }),
    [],
  );
  useEffect(() => {
    const refreshOutlets = () => {
      const next = Store.listOutlets();
      setOutlets(next);
      if (
        next.length &&
        !next.some((outlet) => outlet.id === selectedOutletId)
      ) {
        setSelectedOutletId(next[0].id);
        setSelectedAreaId(ALL_OPTION);
        setSelectedRackId(ALL_OPTION);
      }
      if (!next.length) {
        setSelectedOutletId("");
        setSelectedAreaId(ALL_OPTION);
        setSelectedRackId(ALL_OPTION);
      }
    };
    const refreshLayout = () => setRevision((value) => value + 1);
    window.addEventListener(
      "echo:outlet:save",
      refreshOutlets as EventListener,
    );
    window.addEventListener(
      "echo:inventory:layout",
      refreshLayout as EventListener,
    );
    window.addEventListener("echo:item:save", refreshLayout as EventListener);
    return () => {
      window.removeEventListener(
        "echo:outlet:save",
        refreshOutlets as EventListener,
      );
      window.removeEventListener(
        "echo:inventory:layout",
        refreshLayout as EventListener,
      );
      window.removeEventListener(
        "echo:item:save",
        refreshLayout as EventListener,
      );
    };
  }, [selectedOutletId]);
  const areas = useMemo(() => {
    if (!selectedOutletId) return [] as StorageArea[];
    return Store.listStorageAreas(selectedOutletId);
  }, [selectedOutletId, revision]);
  const racksByArea = useMemo(() => {
    const racks = Store.listStorageRacks();
    return racks.reduce<Record<string, StorageRack[]>>((acc, rack) => {
      const areaId = rack.areaId;
      if (!acc[areaId]) acc[areaId] = [];
      acc[areaId].push(rack);
      return acc;
    }, {});
  }, [revision]);
  const bins = useMemo(() => Store.listStorageBins(), [revision]);
  const binsByRack = useMemo(() => {
    return bins.reduce<Record<string, StorageBin[]>>((acc, bin) => {
      if (!acc[bin.rackId]) acc[bin.rackId] = [];
      acc[bin.rackId].push(bin);
      return acc;
    }, {});
  }, [bins]);
  const itemsById = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    for (const item of Store.listItems()) {
      if (item.outletId === selectedOutletId) {
        map.set(item.id, item);
      }
    }
    return map;
  }, [selectedOutletId, revision]);
  const assignedRows = useMemo<CountLineRow[]>(() => {
    const rows: CountLineRow[] = [];
    for (const area of areas) {
      const relevantRacks = racksByArea[area.id] ?? [];
      for (const rack of relevantRacks) {
        const rackBins = binsByRack[rack.id] ?? [];
        for (const bin of rackBins) {
          if (!bin.itemId) continue;
          const item = itemsById.get(bin.itemId);
          if (!item) continue;
          rows.push({ item, bin, rack, area });
        }
      }
    }
    return rows;
  }, [areas, racksByArea, binsByRack, itemsById]);
  const unassignedRows = useMemo<CountLineRow[]>(() => {
    const usedItemIds = new Set(assignedRows.map((row) => row.item.id));
    const rows: CountLineRow[] = [];
    for (const item of itemsById.values()) {
      if (usedItemIds.has(item.id)) continue;
      rows.push({ item, bin: null, rack: null, area: null });
    }
    return rows;
  }, [assignedRows, itemsById]);
  const filteredRows = useMemo(() => {
    const targetArea = selectedAreaId === ALL_OPTION ? null : selectedAreaId;
    const targetRack = selectedRackId === ALL_OPTION ? null : selectedRackId;
    const term = search.trim().toLowerCase();
    const pool = [...assignedRows, ...unassignedRows];
    return pool.filter((row) => {
      if (targetArea && row.area?.id !== targetArea) return false;
      if (targetRack && row.rack?.id !== targetRack) return false;
      if (!term) return true;
      const haystack = [
        row.item.name,
        row.item.glCode ?? "",
        row.bin?.label ?? "",
        row.area?.name ?? "",
      ]
        .join("")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [assignedRows, unassignedRows, selectedAreaId, selectedRackId, search]);
  useEffect(() => {
    const allowedIds = new Set(filteredRows.map((row) => row.item.id));
    setQuantities((prev) => {
      const next: Record<string, number> = {};
      for (const [key, value] of Object.entries(prev)) {
        if (allowedIds.has(key)) next[key] = value;
      }
      return next;
    });
    setSplitQuantities((prev) => {
      const next: Record<string, { cases: number; each: number }> = {};
      for (const [key, value] of Object.entries(prev)) {
        if (allowedIds.has(key)) next[key] = value;
      }
      return next;
    });
  }, [filteredRows]);
  const setTotalQuantity = (
    itemId: string,
    rawValue: number,
    packSize?: number | null,
  ) => {
    const value = sanitizeNonNegative(rawValue);
    setQuantities((prev) => ({ ...prev, [itemId]: value }));
    if (packSize && packSize >= MIN_SPLIT_PACK && packSize <= MAX_SPLIT_PACK) {
      const split = computeSplitFromTotal(value, packSize);
      setSplitQuantities((prev) => ({ ...prev, [itemId]: split }));
    } else {
      setSplitQuantities((prev) => {
        if (!prev[itemId]) return prev;
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    }
  };
  const handleSplitCasesChange = (
    itemId: string,
    rawValue: number,
    packSize: number,
  ) => {
    const cases = sanitizeWhole(rawValue);
    const remainder =
      splitQuantities[itemId] ??
      computeSplitFromTotal(quantities[itemId] ?? 0, packSize);
    const total = cases * packSize + remainder.each;
    setSplitQuantities((prev) => ({
      ...prev,
      [itemId]: { cases, each: remainder.each },
    }));
    setQuantities((prev) => ({ ...prev, [itemId]: total }));
  };
  const handleSplitEachChange = (
    itemId: string,
    rawValue: number,
    packSize: number,
  ) => {
    const units = sanitizeWhole(rawValue);
    const remainder =
      splitQuantities[itemId] ??
      computeSplitFromTotal(quantities[itemId] ?? 0, packSize);
    const additionalCases = Math.floor(units / packSize);
    const each = units % packSize;
    const cases = remainder.cases + additionalCases;
    const total = cases * packSize + each;
    setSplitQuantities((prev) => ({ ...prev, [itemId]: { cases, each } }));
    setQuantities((prev) => ({ ...prev, [itemId]: total }));
  };
  const handleReset = () => {
    setQuantities({});
    setSplitQuantities({});
    toast({
      title: "Counts cleared",
      description: "All entered quantities have been reset.",
    });
  };
  const handlePost = () => {
    if (!selectedOutletId) {
      toast({
        title: "Select outlet",
        description: "Choose an outlet before posting counts.",
        variant: "destructive",
      });
      return;
    }
    const payload = Object.entries(quantities)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([itemId, qty]) => {
        const item = itemsById.get(itemId);
        return {
          itemId,
          qty,
          unit: item ? unitForItem(item) : "each",
          location:
            assignedRows.find((row) => row.item.id === itemId)?.area?.name ??
            null,
          bin:
            assignedRows.find((row) => row.item.id === itemId)?.bin?.label ??
            null,
        };
      });
    if (!payload.length) {
      toast({
        title: "No counts",
        description: "Enter at least one quantity before posting.",
        variant: "destructive",
      });
      return;
    }
    const session: CountSession = {
      id: id(),
      outletId: selectedOutletId,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      lines: payload.map((line) => ({
        itemId: line.itemId,
        qty: line.qty,
        unit: line.unit,
        location: line.location,
        bin: line.bin,
      })),
    };
    Store.applyCountSession(session);
    setQuantities({});
    toast({
      title: "Counts posted",
      description: `Recorded ${payload.length} items for ${Store.listOutlets().find((o) => o.id === selectedOutletId)?.name ?? "Outlet"}.`,
    });
    setRevision((value) => value + 1);
  };
  const summary = Object.entries(quantities)
    .filter(([, qty]) => Number(qty) > 0)
    .map(([itemId, qty]) => ({ item: itemsById.get(itemId) ?? null, qty }));
  const outletOptions = outlets.map((outlet) => ({
    value: outlet.id,
    label: outlet.name,
  }));
  const areaOptions = [
    { value: ALL_OPTION, label: "All areas" },
    ...areas.map((area) => ({ value: area.id, label: area.name })),
  ];
  const rackOptions = useMemo(() => {
    if (selectedAreaId === ALL_OPTION) {
      const outletAreaIds = new Set(areas.map((area) => area.id));
      const racks = Store.listStorageRacks().filter((rack) =>
        outletAreaIds.has(rack.areaId),
      );
      return [
        { value: ALL_OPTION, label: "All racks" },
        ...racks.map((rack) => ({ value: rack.id, label: rack.name })),
      ];
    }
    const racks = racksByArea[selectedAreaId] ?? [];
    return [
      { value: ALL_OPTION, label: "All racks" },
      ...racks.map((rack) => ({ value: rack.id, label: rack.name })),
    ];
  }, [areas, selectedAreaId, racksByArea, revision]);
  return (
    <div className="space-y-6">
      {" "}
      <Card className="border-2">
        {" "}
        <CardContent className="space-y-4 p-6">
          {" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            Walk each area, enter on-hand quantities, and post a consolidated
            count session ready for variance analysis.{" "}
          </p>{" "}
          <p
            className={`text-xs ${insightsStatus === "degraded" ? "text-amber-400" : "text-muted-foreground"}`}
          >
            {" "}
            {insightsLoading
              ? "Refreshing cost data…"
              : insightsStatus === "degraded"
                ? `Cost insights offline${insightsError ? `: ${insightsError}` : ""}`
                : "Cost columns use latest standard purchases."}{" "}
          </p>{" "}
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            {" "}
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              {" "}
              <div className="space-y-2">
                {" "}
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Outlet
                </Label>{" "}
                <Select
                  value={selectedOutletId || undefined}
                  onValueChange={(value) => {
                    setSelectedOutletId(value);
                    setSelectedAreaId(ALL_OPTION);
                    setSelectedRackId(ALL_OPTION);
                  }}
                >
                  {" "}
                  <SelectTrigger>
                    {" "}
                    <SelectValue placeholder="Select outlet" />{" "}
                  </SelectTrigger>{" "}
                  <SelectContent>
                    {" "}
                    {outletOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {" "}
                        {option.label}{" "}
                      </SelectItem>
                    ))}{" "}
                  </SelectContent>{" "}
                </Select>{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Area
                </Label>{" "}
                <Select
                  value={selectedAreaId}
                  onValueChange={(value) => {
                    setSelectedAreaId(value);
                    setSelectedRackId(ALL_OPTION);
                  }}
                >
                  {" "}
                  <SelectTrigger>
                    {" "}
                    <SelectValue />{" "}
                  </SelectTrigger>{" "}
                  <SelectContent>
                    {" "}
                    {areaOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {" "}
                        {option.label}{" "}
                      </SelectItem>
                    ))}{" "}
                  </SelectContent>{" "}
                </Select>{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Rack
                </Label>{" "}
                <Select
                  value={selectedRackId}
                  onValueChange={setSelectedRackId}
                >
                  {" "}
                  <SelectTrigger>
                    {" "}
                    <SelectValue />{" "}
                  </SelectTrigger>{" "}
                  <SelectContent>
                    {" "}
                    {rackOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {" "}
                        {option.label}{" "}
                      </SelectItem>
                    ))}{" "}
                  </SelectContent>{" "}
                </Select>{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Search items
                </Label>{" "}
                <Input
                  placeholder="e.g., tomatoes"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Actions
                </Label>{" "}
                <div className="flex flex-wrap gap-2">
                  {" "}
                  <Button variant="outline" onClick={handleReset}>
                    Clear counts
                  </Button>{" "}
                  <Button onClick={handlePost}>Post counts</Button>{" "}
                </div>{" "}
              </div>{" "}
              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                {" "}
                Posting creates a dated count session for{" "}
                {Store.listOutlets().find((o) => o.id === selectedOutletId)
                  ?.name ?? "the outlet"}
                . Use shelf-to-sheet for layout prep, then record on this screen
                during the walk.{" "}
              </div>{" "}
            </div>{" "}
            <ScrollArea className="max-h-[520px] rounded-lg border">
              {" "}
              <Table>
                {" "}
                <TableHeader>
                  {" "}
                  <TableRow>
                    {" "}
                    <TableHead>Item</TableHead>{" "}
                    <TableHead className="w-[10ch] text-right">Unit</TableHead>{" "}
                    <TableHead className="w-[9ch] text-right">Cost</TableHead>{" "}
                    <TableHead className="w-[11ch] text-right">
                      Ext cost
                    </TableHead>{" "}
                    <TableHead className="hidden lg:table-cell">
                      Location
                    </TableHead>{" "}
                    <TableHead className="hidden xl:table-cell">Bin</TableHead>{" "}
                    <TableHead className="min-w-[150px] text-right">
                      Qty
                    </TableHead>{" "}
                  </TableRow>{" "}
                </TableHeader>{" "}
                <TableBody>
                  {" "}
                  {filteredRows.map(({ item, area, rack, bin }) => {
                    const value = quantities[item.id] ?? 0;
                    const locationLabel = area ? area.name : "Unassigned";
                    const rackLabel = rack ? rack.name : "—";
                    const normalizedItemName = normalizeName(item.name);
                    const costInsight = costByName.get(normalizedItemName);
                    const primaryUnit = unitForItem(item);
                    const packLabel =
                      costInsight?.packLabel ??
                      item.purchaseUnits[0]?.pack ??
                      null;
                    const resolvedPackSize = resolvePackSize(
                      costInsight?.packSize,
                      packLabel,
                    );
                    const unitCost =
                      costInsight?.costPerStandardUnit ??
                      item.purchaseUnits[0]?.lastUnitPrice ??
                      null;
                    const hasUnitCost =
                      typeof unitCost === "number" && Number.isFinite(unitCost);
                    const extendedCost = hasUnitCost ? unitCost * value : null;
                    const showExtendedCost =
                      typeof extendedCost === "number" &&
                      Number.isFinite(extendedCost) &&
                      value > 0;
                    const canSplitPack = typeof resolvedPackSize === "number";
                    const splitState = canSplitPack
                      ? (splitQuantities[item.id] ??
                        computeSplitFromTotal(
                          value,
                          resolvedPackSize as number,
                        ))
                      : null;
                    const casesValue = canSplitPack
                      ? (splitState?.cases ?? 0)
                      : 0;
                    const eachValue = canSplitPack
                      ? (splitState?.each ?? 0)
                      : 0;
                    return (
                      <TableRow key={item.id}>
                        {" "}
                        <TableCell>
                          {" "}
                          <div className="flex flex-col">
                            {" "}
                            <span className="font-medium text-slate-100">
                              {item.name}
                            </span>{" "}
                            <div className="flex flex-wrap gap-1 text-[0.65rem] text-muted-foreground">
                              {" "}
                              {item.glCode ? (
                                <Badge variant="outline">
                                  GL {item.glCode.slice(-4)}
                                </Badge>
                              ) : null}{" "}
                              <span>
                                {costInsight?.baseUnit ?? primaryUnit}
                              </span>{" "}
                            </div>{" "}
                          </div>{" "}
                        </TableCell>{" "}
                        <TableCell className="text-right">
                          {" "}
                          <div className="flex flex-col items-end text-sm leading-snug">
                            {" "}
                            <span>{primaryUnit}</span>{" "}
                            {packLabel ? (
                              <span className="text-[0.65rem] text-muted-foreground">
                                {packLabel}
                              </span>
                            ) : null}{" "}
                          </div>{" "}
                        </TableCell>{" "}
                        <TableCell className="text-right text-sm">
                          {" "}
                          {hasUnitCost
                            ? currencyFormatter.format(unitCost as number)
                            : "—"}{" "}
                        </TableCell>{" "}
                        <TableCell className="text-right text-sm">
                          {" "}
                          {showExtendedCost
                            ? currencyFormatter.format(extendedCost as number)
                            : "—"}{" "}
                        </TableCell>{" "}
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {locationLabel}
                        </TableCell>{" "}
                        <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                          {bin?.label ?? "—"}{" "}
                          {rackLabel !== "—" ? `(${rackLabel})` : ""}
                        </TableCell>{" "}
                        <TableCell className="align-top text-right">
                          {" "}
                          <div className="flex flex-col items-end gap-2">
                            {" "}
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={value}
                              onChange={(event) =>
                                setTotalQuantity(
                                  item.id,
                                  Number(event.target.value),
                                  resolvedPackSize,
                                )
                              }
                              className="h-9 w-[120px] text-right"
                            />{" "}
                            {canSplitPack && resolvedPackSize ? (
                              <div className="flex gap-3 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                                {" "}
                                <div className="flex flex-col items-end gap-1">
                                  {" "}
                                  <span>Cases</span>{" "}
                                  <Input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={casesValue}
                                    onChange={(event) =>
                                      handleSplitCasesChange(
                                        item.id,
                                        Number(event.target.value),
                                        resolvedPackSize,
                                      )
                                    }
                                    className="h-8 w-[72px] text-right"
                                  />{" "}
                                </div>{" "}
                                <div className="flex flex-col items-end gap-1">
                                  {" "}
                                  <span>Each</span>{" "}
                                  <Input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={eachValue}
                                    onChange={(event) =>
                                      handleSplitEachChange(
                                        item.id,
                                        Number(event.target.value),
                                        resolvedPackSize,
                                      )
                                    }
                                    className="h-8 w-[72px] text-right"
                                  />{" "}
                                </div>{" "}
                              </div>
                            ) : null}{" "}
                          </div>{" "}
                        </TableCell>{" "}
                      </TableRow>
                    );
                  })}{" "}
                  {!filteredRows.length && (
                    <TableRow>
                      {" "}
                      <TableCell
                        colSpan={7}
                        className="text-center text-sm text-muted-foreground"
                      >
                        {" "}
                        No items match the current filters.{" "}
                      </TableCell>{" "}
                    </TableRow>
                  )}{" "}
                </TableBody>{" "}
              </Table>{" "}
            </ScrollArea>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
      <Card className="border">
        {" "}
        <CardContent className="space-y-3 p-6">
          {" "}
          <div className="pb-3">
            {" "}
            <h2 className="text-base font-semibold">Review summary</h2>{" "}
            <p className="text-sm text-muted-foreground">
              Preview the lines that will post into the count session before
              confirming.
            </p>{" "}
          </div>{" "}
          {!summary.length && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {" "}
              No counts entered yet. Use the grid above to type quantities as
              you walk the outlet.{" "}
            </div>
          )}{" "}
          {!!summary.length && (
            <Table>
              {" "}
              <TableHeader>
                {" "}
                <TableRow>
                  {" "}
                  <TableHead>Item</TableHead>{" "}
                  <TableHead className="text-right">Qty</TableHead>{" "}
                </TableRow>{" "}
              </TableHeader>{" "}
              <TableBody>
                {" "}
                {summary.map(({ item, qty }) => (
                  <TableRow key={item?.id ?? String(qty)}>
                    {" "}
                    <TableCell>{item?.name ?? "Unknown"}</TableCell>{" "}
                    <TableCell className="text-right">{qty}</TableCell>{" "}
                  </TableRow>
                ))}{" "}
              </TableBody>{" "}
            </Table>
          )}{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
}
