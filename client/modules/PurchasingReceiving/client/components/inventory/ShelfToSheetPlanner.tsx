import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RackGrid } from "./RackGrid";
import {
  Store,
  INVENTORY_LAYOUT_EVENT_NAME,
  QUICK_COUNT_EVENT_NAME,
} from "@/lib/store";
import type { Outlet } from "@shared/purchasing";
import type {
  InventoryItem,
  ParSuggestion,
  StorageArea,
  StorageBin,
  StorageRack,
} from "@shared/inventory";
const STORAGE_LABELS: Record<StorageArea["type"], string> = {
  dry: "Dry storage",
  cooler: "Walk-in cooler",
  freezer: "Freezer",
  cage: "Locked cage",
  bar: "Bar",
  custom: "Custom",
};
export function ShelfToSheetPlanner() {
  const [outlets, setOutlets] = useState<Outlet[]>(() => Store.listOutlets());
  const [selectedOutletId, setSelectedOutletId] = useState<string>(
    () => outlets[0]?.id ?? "",
  );
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refreshOutlets = () => {
      const next = Store.listOutlets();
      setOutlets(next);
      if (
        next.length &&
        !next.some((outlet) => outlet.id === selectedOutletId)
      ) {
        setSelectedOutletId(next[0].id);
      }
      if (!next.length) {
        setSelectedOutletId("");
      }
    };
    const refreshLayout = () => setRevision((value) => value + 1);
    window.addEventListener(
      "echo:outlet:save",
      refreshOutlets as EventListener,
    );
    window.addEventListener(
      INVENTORY_LAYOUT_EVENT_NAME,
      refreshLayout as EventListener,
    );
    window.addEventListener(
      QUICK_COUNT_EVENT_NAME,
      refreshLayout as EventListener,
    );
    window.addEventListener(
      "echo:receipt:save",
      refreshLayout as EventListener,
    );
    window.addEventListener("echo:count:save", refreshLayout as EventListener);
    return () => {
      window.removeEventListener(
        "echo:outlet:save",
        refreshOutlets as EventListener,
      );
      window.removeEventListener(
        INVENTORY_LAYOUT_EVENT_NAME,
        refreshLayout as EventListener,
      );
      window.removeEventListener(
        QUICK_COUNT_EVENT_NAME,
        refreshLayout as EventListener,
      );
      window.removeEventListener(
        "echo:receipt:save",
        refreshLayout as EventListener,
      );
      window.removeEventListener(
        "echo:count:save",
        refreshLayout as EventListener,
      );
    };
  }, [selectedOutletId]);
  const areas = useMemo(
    () => (selectedOutletId ? Store.listStorageAreas(selectedOutletId) : []),
    [selectedOutletId, revision],
  );
  const racksByArea = useMemo(() => {
    const racks = Store.listStorageRacks();
    return racks.reduce<Record<string, StorageRack[]>>((acc, rack) => {
      if (!acc[rack.areaId]) acc[rack.areaId] = [];
      acc[rack.areaId].push(rack);
      return acc;
    }, {});
  }, [revision]);
  const binsByRack = useMemo(() => {
    const bins = Store.listStorageBins();
    return bins.reduce<Record<string, StorageBin[]>>((acc, bin) => {
      if (!acc[bin.rackId]) acc[bin.rackId] = [];
      acc[bin.rackId].push(bin);
      return acc;
    }, {});
  }, [revision]);
  const inventoryItems = useMemo(() => Store.listItems(), [revision]);
  const itemsById = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    for (const item of inventoryItems) {
      map.set(item.id, item);
    }
    return map;
  }, [inventoryItems]);
  const suggestionMap = useMemo(() => {
    if (!selectedOutletId) return new Map<string, ParSuggestion>();
    const suggestions = Store.getParSuggestions(selectedOutletId);
    return new Map<string, ParSuggestion>(
      suggestions.map((entry) => [entry.itemId, entry]),
    );
  }, [selectedOutletId, revision]);
  const countsByOutlet = useMemo(() => {
    const counts = Store.listCounts();
    return counts.reduce<
      Record<string, { lastCompleted?: string | null; total: number }>
    >((acc, session) => {
      if (!acc[session.outletId]) {
        acc[session.outletId] = {
          lastCompleted: session.completedAt ?? session.startedAt,
          total: 0,
        };
      }
      acc[session.outletId].total += 1;
      const timestamp = session.completedAt ?? session.startedAt;
      if (timestamp) {
        const current = acc[session.outletId].lastCompleted;
        if (
          !current ||
          new Date(timestamp).getTime() > new Date(current).getTime()
        ) {
          acc[session.outletId].lastCompleted = timestamp;
        }
      }
      return acc;
    }, {});
  }, [revision]);
  const outletSummary = countsByOutlet[selectedOutletId] ?? {
    lastCompleted: null,
    total: 0,
  };
  const statistics = useMemo(() => {
    let rackCount = 0;
    let binCount = 0;
    let assignedCount = 0;
    let flagged = 0;
    for (const area of areas) {
      const racks = racksByArea[area.id] ?? [];
      rackCount += racks.length;
      for (const rack of racks) {
        const bins = (binsByRack[rack.id] ?? []).filter(Boolean);
        binCount += bins.length;
        for (const bin of bins) {
          if (bin.itemId) assignedCount += 1;
          const suggestion = bin.itemId
            ? (suggestionMap.get(bin.itemId) ?? null)
            : null;
          if (suggestion && Math.abs(suggestion.variancePct) >= 10)
            flagged += 1;
        }
      }
    }
    return { rackCount, binCount, assignedCount, flagged };
  }, [areas, binsByRack, racksByArea, suggestionMap]);
  const outletOptions = outlets.map((outlet) => ({
    value: outlet.id,
    label: outlet.name,
  }));
  const outletSelectValue = selectedOutletId || undefined;
  const handleGenerateGrid = (
    rack: StorageRack,
    options?: { regenerate?: boolean },
  ) => {
    Store.ensureRackGrid(rack.id, { regenerate: options?.regenerate });
    setRevision((value) => value + 1);
  };
  const handleExport = () => {
    if (!selectedOutletId) return;
    const rows: string[][] = [
      [
        "area",
        "area_type",
        "rack",
        "level",
        "column",
        "bin_label",
        "item_name",
        "gl_code",
        "par_qty",
        "ai_recommended_par",
        "ai_variance_pct",
        "departments",
        "notes",
      ],
    ];
    for (const area of areas) {
      const racks = (racksByArea[area.id] ?? []).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      for (const rack of racks) {
        const bins = (binsByRack[rack.id] ?? []).sort((a, b) => {
          if (a.level === b.level) return a.column - b.column;
          return a.level - b.level;
        });
        for (const bin of bins) {
          const item = bin.itemId ? (itemsById.get(bin.itemId) ?? null) : null;
          const suggestion = bin.itemId
            ? (suggestionMap.get(bin.itemId) ?? null)
            : null;
          rows.push([
            area.name,
            STORAGE_LABELS[area.type],
            rack.name,
            String(bin.level),
            String(bin.column),
            bin.label,
            item?.name ?? "",
            item?.glCode ?? "",
            bin.parQty != null ? String(bin.parQty) : "",
            suggestion ? String(suggestion.recommendedPar) : "",
            suggestion ? String(suggestion.variancePct) : "",
            item?.departments?.join(";") ?? "",
            bin.notes ?? "",
          ]);
        }
      }
    }
    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `shelf-to-sheet-${selectedOutletId}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-6">
      {" "}
      <Card className="border-2">
        {" "}
        <CardHeader className="border-b bg-muted/40">
          {" "}
          <CardTitle>Shelf-to-sheet inventory</CardTitle>{" "}
          <CardDescription>
            {" "}
            Trace physical locations for every SKU. Export counts, review AI
            flags, and hand teams a layout they can follow shelf by shelf.{" "}
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-4 pt-6">
          {" "}
          <div className="flex flex-wrap items-center gap-3">
            {" "}
            <div className="space-y-1">
              {" "}
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Outlet
              </Label>{" "}
              <Select
                value={outletSelectValue}
                onValueChange={(value) => setSelectedOutletId(value)}
              >
                {" "}
                <SelectTrigger className="w-[220px]">
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
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!areas.length || !selectedOutletId}
            >
              {" "}
              Export shelf-to-sheet CSV{" "}
            </Button>{" "}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {" "}
              <Badge variant="outline">{statistics.rackCount} racks</Badge>{" "}
              <Badge variant="outline">{statistics.binCount} bins</Badge>{" "}
              <Badge variant="outline">
                {statistics.assignedCount} assigned
              </Badge>{" "}
              <Badge variant={statistics.flagged ? "destructive" : "secondary"}>
                {" "}
                {statistics.flagged} AI flags{" "}
              </Badge>{" "}
              <Badge variant="secondary">
                {" "}
                Counts: {outletSummary.total} • Last:{" "}
                {outletSummary.lastCompleted
                  ? new Date(outletSummary.lastCompleted).toLocaleString()
                  : "—"}{" "}
              </Badge>{" "}
            </div>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
      <ScrollArea className="h-[660px] rounded-lg border">
        {" "}
        <div className="space-y-4 p-4">
          {" "}
          {!areas.length && (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              {" "}
              No storage layout yet. Use the storage designer to add rooms,
              racks, and bins.{" "}
            </div>
          )}{" "}
          {areas.map((area) => {
            const racks = (racksByArea[area.id] ?? []).sort((a, b) =>
              a.name.localeCompare(b.name),
            );
            return (
              <Card key={area.id} className="border border-border bg-card">
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle className="text-lg">
                    {" "}
                    {area.name}{" "}
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({STORAGE_LABELS[area.type]})
                    </span>{" "}
                  </CardTitle>{" "}
                  {area.description ? (
                    <CardDescription>{area.description}</CardDescription>
                  ) : null}{" "}
                </CardHeader>{" "}
                <CardContent className="space-y-3">
                  {" "}
                  {!racks.length && (
                    <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      {" "}
                      No racks assigned. Add shelving or cages to map this
                      area.{" "}
                    </div>
                  )}{" "}
                  {racks.map((rack) => {
                    const bins = (binsByRack[rack.id] ?? []).sort((a, b) => {
                      if (a.level === b.level) return a.column - b.column;
                      return a.level - b.level;
                    });
                    return (
                      <div
                        key={rack.id}
                        className="space-y-3 rounded-lg border border-slate-800/60 bg-surface p-4"
                      >
                        {" "}
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                          {" "}
                          <div>
                            {" "}
                            <div className="text-sm font-semibold text-slate-100">
                              {rack.name}
                            </div>{" "}
                            <div>
                              {" "}
                              {rack.levels} levels • {rack.columns} columns •{" "}
                              {bins.length} bins{" "}
                            </div>{" "}
                          </div>{" "}
                          <div className="flex flex-wrap items-center gap-2">
                            {" "}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateGrid(rack)}
                            >
                              {" "}
                              Fill grid{" "}
                            </Button>{" "}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleGenerateGrid(rack, { regenerate: true })
                              }
                            >
                              {" "}
                              Rebuild grid{" "}
                            </Button>{" "}
                            {rack.notes ? (
                              <Badge variant="outline">{rack.notes}</Badge>
                            ) : null}{" "}
                          </div>{" "}
                        </div>{" "}
                        <RackGrid
                          rack={rack}
                          bins={bins}
                          itemsById={itemsById}
                          parSuggestions={suggestionMap}
                          compact
                        />{" "}
                      </div>
                    );
                  })}{" "}
                </CardContent>{" "}
              </Card>
            );
          })}{" "}
        </div>{" "}
      </ScrollArea>{" "}
    </div>
  );
}
