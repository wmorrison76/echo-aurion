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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RackGrid } from "./RackGrid";
import {
  Store,
  INVENTORY_LAYOUT_EVENT_NAME,
  QUICK_COUNT_EVENT_NAME,
  id,
} from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import type { Outlet } from "@shared/purchasing";
import type {
  InventoryItem,
  ParSuggestion,
  StorageArea,
  StorageRack,
  StorageBin,
} from "@shared/inventory";
const AREA_TYPES: { value: StorageArea["type"]; label: string }[] = [
  { value: "dry", label: "Dry storage" },
  { value: "cooler", label: "Walk-in cooler" },
  { value: "freezer", label: "Freezer" },
  { value: "cage", label: "Locked cage" },
  { value: "bar", label: "Bar" },
  { value: "custom", label: "Custom" },
];
const RACK_TYPES: { value: StorageRack["type"]; label: string }[] = [
  { value: "shelf", label: "Shelving" },
  { value: "rack", label: "Rack" },
  { value: "cage", label: "Cage" },
  { value: "freezer_basket", label: "Freezer basket" },
  { value: "custom", label: "Custom" },
];
const STORAGE_COLORS: Record<StorageArea["type"], string> = {
  dry: "border-amber-300/40 bg-amber-500/5",
  cooler: "border-sky-300/40 bg-sky-500/5",
  freezer: "border-primary/40 bg-primary/5",
  cage: "border-rose-300/40 bg-rose-500/5",
  bar: "border-purple-300/40 bg-purple-500/5",
  custom: "border-slate-300/40 bg-slate-500/5",
};
const UNASSIGNED_ITEM_VALUE = "__unassigned__";
function StorageDesignerComponent() {
  const { toast } = useToast();
  const [outlets, setOutlets] = useState<Outlet[]>(() => Store.listOutlets());
  const [selectedOutletId, setSelectedOutletId] = useState<string>(
    () => outlets[0]?.id ?? "",
  );
  const [version, setVersion] = useState(0);
  const [areaDraft, setAreaDraft] = useState("");
  const handleStoreError = (context: string, error: unknown) => {
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    logger.error(context, error);
    toast({
      title: "Storage update failed",
      description: `${context}: ${message}`,
      variant: "destructive",
    });
  };
  const runSafe = (context: string, fn: () => void) => {
    try {
      fn();
    } catch (error) {
      handleStoreError(context, error);
    }
  };
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
    const refreshInventories = () => setVersion((value) => value + 1);
    const handleWriteError = (event: Event) => {
      if (event instanceof CustomEvent) {
        const key = event.detail?.key as string | undefined;
        toast({
          title: "Storage sync issue",
          description: key
            ? `Could not persist changes for ${key}.`
            : "Could not persist latest storage changes.",
          variant: "destructive",
        });
      }
    };
    window.addEventListener(
      "echo:outlet:save",
      refreshOutlets as EventListener,
    );
    window.addEventListener(INVENTORY_LAYOUT_EVENT_NAME, refreshInventories);
    window.addEventListener(
      QUICK_COUNT_EVENT_NAME,
      refreshInventories as EventListener,
    );
    window.addEventListener(
      "echo:receipt:save",
      refreshInventories as EventListener,
    );
    window.addEventListener(
      "echo:count:save",
      refreshInventories as EventListener,
    );
    window.addEventListener(
      "echo:store:write-error",
      handleWriteError as EventListener,
    );
    return () => {
      window.removeEventListener(
        "echo:outlet:save",
        refreshOutlets as EventListener,
      );
      window.removeEventListener(
        INVENTORY_LAYOUT_EVENT_NAME,
        refreshInventories,
      );
      window.removeEventListener(
        QUICK_COUNT_EVENT_NAME,
        refreshInventories as EventListener,
      );
      window.removeEventListener(
        "echo:receipt:save",
        refreshInventories as EventListener,
      );
      window.removeEventListener(
        "echo:count:save",
        refreshInventories as EventListener,
      );
      window.removeEventListener(
        "echo:store:write-error",
        handleWriteError as EventListener,
      );
    };
  }, [selectedOutletId, toast]);
  const areas = useMemo(() => {
    if (!selectedOutletId) return [] as StorageArea[];
    return Store.listStorageAreas(selectedOutletId);
  }, [selectedOutletId, version]);
  const racksByArea = useMemo(() => {
    const racks = Store.listStorageRacks();
    return racks.reduce<Record<string, StorageRack[]>>((acc, rack) => {
      if (!acc[rack.areaId]) acc[rack.areaId] = [];
      acc[rack.areaId].push(rack);
      return acc;
    }, {});
  }, [version]);
  const binsByRack = useMemo(() => {
    const bins = Store.listStorageBins();
    return bins.reduce<Record<string, StorageBin[]>>((acc, bin) => {
      if (!acc[bin.rackId]) acc[bin.rackId] = [];
      acc[bin.rackId].push(bin);
      return acc;
    }, {});
  }, [version]);
  const inventoryItems = useMemo(() => Store.listItems(), [version]);
  const itemsByOutlet = useMemo(() => {
    return inventoryItems.reduce<
      Record<
        string,
        {
          id: string;
          name: string;
          gl?: string | null;
          departments?: string[];
        }[]
      >
    >((acc, item) => {
      if (!acc[item.outletId]) acc[item.outletId] = [];
      acc[item.outletId].push({
        id: item.id,
        name: item.name,
        gl: item.glCode ?? null,
        departments: item.departments ?? [],
      });
      return acc;
    }, {});
  }, [inventoryItems]);
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
  }, [selectedOutletId, version]);
  const handleAddArea = () => {
    if (!selectedOutletId) {
      toast({
        title: "Select an outlet",
        description: "Choose an outlet before creating storage areas.",
        variant: "destructive",
      });
      return;
    }
    runSafe("Unable to add storage area", () => {
      const name = areaDraft.trim() || "New Storage Area";
      Store.saveStorageArea({
        id: id(),
        outletId: selectedOutletId,
        name,
        type: "dry",
        description: null,
        tags: null,
      });
      setAreaDraft("");
      setVersion((value) => value + 1);
    });
  };
  const handleAreaFieldUpdate = (
    area: StorageArea,
    patch: Partial<StorageArea>,
  ) => {
    runSafe("Unable to update storage area", () => {
      Store.saveStorageArea({ ...area, ...patch });
      setVersion((value) => value + 1);
    });
  };
  const handleRemoveArea = (areaId: string) => {
    runSafe("Unable to remove storage area", () => {
      Store.removeStorageArea(areaId);
      setVersion((value) => value + 1);
    });
  };
  const handleAddRack = (areaId: string) => {
    runSafe("Unable to add rack", () => {
      Store.saveStorageRack({
        id: id(),
        areaId,
        name: "New Rack",
        type: "shelf",
        levels: 4,
        columns: 4,
        notes: null,
      });
      setVersion((value) => value + 1);
    });
  };
  const handleRackFieldUpdate = (
    rack: StorageRack,
    patch: Partial<StorageRack>,
  ) => {
    runSafe("Unable to update rack", () => {
      Store.saveStorageRack({ ...rack, ...patch });
      setVersion((value) => value + 1);
    });
  };
  const handleRemoveRack = (rackId: string) => {
    runSafe("Unable to remove rack", () => {
      Store.removeStorageRack(rackId);
      setVersion((value) => value + 1);
    });
  };
  const handleGenerateGrid = (
    rack: StorageRack,
    options?: { regenerate?: boolean },
  ) => {
    runSafe("Unable to regenerate rack grid", () => {
      Store.ensureRackGrid(rack.id, { regenerate: options?.regenerate });
      setVersion((value) => value + 1);
    });
  };
  const handleAddBin = (rack: StorageRack) => {
    runSafe("Unable to add bin", () => {
      const existing = binsByRack[rack.id] ?? [];
      const nextColumn = existing.length ? existing.length + 1 : 1;
      Store.saveStorageBin({
        id: id(),
        rackId: rack.id,
        level: 1,
        column: nextColumn,
        label: `Bin ${nextColumn}`,
        capacity: null,
        itemId: null,
        parQty: null,
        notes: null,
      });
      setVersion((value) => value + 1);
    });
  };
  const handleBinUpdate = (bin: StorageBin, patch: Partial<StorageBin>) => {
    runSafe("Unable to update bin", () => {
      if (
        patch.itemId !== undefined ||
        patch.parQty !== undefined ||
        patch.notes !== undefined
      ) {
        Store.assignBin(bin.id, {
          itemId: patch.itemId,
          parQty: patch.parQty,
          notes: patch.notes,
        });
      } else {
        Store.saveStorageBin({ ...bin, ...patch });
      }
      setVersion((value) => value + 1);
    });
  };
  const handleRemoveBin = (binId: string) => {
    runSafe("Unable to remove bin", () => {
      Store.removeStorageBin(binId);
      setVersion((value) => value + 1);
    });
  };
  const outletOptions = outlets.map((outlet) => ({
    value: outlet.id,
    label: outlet.name,
  }));
  const areaHasData = areas.length > 0;
  const selectValue = selectedOutletId || undefined;
  return (
    <Card className="border-2">
      {" "}
      <CardHeader className="border-b bg-muted/40">
        {" "}
        <CardTitle>Storage layout designer</CardTitle>{" "}
        <CardDescription>
          {" "}
          Model storerooms, coolers, cages, and shelving so counts and AI audits
          understand physical placement.{" "}
        </CardDescription>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-6 pt-6">
        {" "}
        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          {" "}
          <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
            {" "}
            <div className="space-y-2">
              {" "}
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Outlet
              </Label>{" "}
              <Select
                value={selectValue}
                onValueChange={(value) => setSelectedOutletId(value)}
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
            <Separator />{" "}
            <div className="space-y-2">
              {" "}
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                {" "}
                Add storage area{" "}
              </Label>{" "}
              <Input
                value={areaDraft}
                onChange={(event) => setAreaDraft(event.target.value)}
                placeholder="e.g., Main Dry Room"
              />{" "}
              <Button
                className="w-full"
                onClick={handleAddArea}
                disabled={!selectedOutletId}
              >
                {" "}
                Add area{" "}
              </Button>{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground">
              {" "}
              Areas feed shelf-to-sheet counts and AI forecasting. Include all
              rooms, cages, bars, and staging zones.{" "}
            </p>{" "}
          </div>{" "}
          <ScrollArea className="h-[620px] rounded-lg border">
            {" "}
            <div className="space-y-4 p-4">
              {" "}
              {!areaHasData && (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  {" "}
                  No storage areas yet. Add a location to begin mapping racks
                  and bins.{" "}
                </div>
              )}{" "}
              {areas.map((area) => {
                const racks = (racksByArea[area.id] ?? []).sort((a, b) =>
                  a.name.localeCompare(b.name),
                );
                return (
                  <div
                    key={area.id}
                    className={`space-y-4 rounded-xl border px-5 py-4 ${STORAGE_COLORS[area.type]}`}
                  >
                    {" "}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {" "}
                      <div className="flex flex-col gap-2">
                        {" "}
                        <Input
                          defaultValue={area.name}
                          onBlur={(event) => {
                            const value = event.target.value.trim();
                            if (value && value !== area.name)
                              handleAreaFieldUpdate(area, { name: value });
                          }}
                          className="h-9 max-w-sm text-base font-semibold"
                        />{" "}
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {" "}
                          <Select
                            value={area.type}
                            onValueChange={(value: StorageArea["type"]) =>
                              handleAreaFieldUpdate(area, { type: value })
                            }
                          >
                            {" "}
                            <SelectTrigger className="h-8 w-[160px] text-xs uppercase tracking-wide">
                              {" "}
                              <SelectValue placeholder="Type" />{" "}
                            </SelectTrigger>{" "}
                            <SelectContent>
                              {" "}
                              {AREA_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {" "}
                                  {type.label}{" "}
                                </SelectItem>
                              ))}{" "}
                            </SelectContent>{" "}
                          </Select>{" "}
                          <Badge variant="outline">
                            {racks.length} racks
                          </Badge>{" "}
                        </div>{" "}
                      </div>{" "}
                      <div className="flex flex-wrap gap-2">
                        {" "}
                        <Button
                          size="sm"
                          onClick={() => handleAddRack(area.id)}
                        >
                          {" "}
                          Add rack{" "}
                        </Button>{" "}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveArea(area.id)}
                        >
                          {" "}
                          Remove area{" "}
                        </Button>{" "}
                      </div>{" "}
                    </div>{" "}
                    <Textarea
                      defaultValue={area.description ?? ""}
                      placeholder="Describe the items typically stored here, temperature guidelines, etc."
                      className="min-h-[80px] text-sm"
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (
                          (value || area.description) &&
                          value !== (area.description ?? "")
                        ) {
                          handleAreaFieldUpdate(area, {
                            description: value || null,
                          });
                        }
                      }}
                    />{" "}
                    <div className="space-y-3">
                      {" "}
                      {racks.map((rack) => {
                        const bins = (binsByRack[rack.id] ?? []).sort(
                          (a, b) => {
                            if (a.level === b.level) return a.column - b.column;
                            return a.level - b.level;
                          },
                        );
                        const outletItems =
                          itemsByOutlet[selectedOutletId] ?? [];
                        return (
                          <div
                            key={rack.id}
                            className="rounded-lg border border-border bg-card p-4"
                          >
                            {" "}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              {" "}
                              <div className="flex flex-col gap-1">
                                {" "}
                                <Input
                                  defaultValue={rack.name}
                                  onBlur={(event) => {
                                    const value = event.target.value.trim();
                                    if (value && value !== rack.name)
                                      handleRackFieldUpdate(rack, {
                                        name: value,
                                      });
                                  }}
                                  className="h-8 max-w-xs text-sm font-semibold"
                                />{" "}
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  {" "}
                                  <Select
                                    value={rack.type}
                                    onValueChange={(
                                      value: StorageRack["type"],
                                    ) =>
                                      handleRackFieldUpdate(rack, {
                                        type: value,
                                      })
                                    }
                                  >
                                    {" "}
                                    <SelectTrigger className="h-8 w-[140px] text-xs uppercase tracking-wide">
                                      {" "}
                                      <SelectValue placeholder="Type" />{" "}
                                    </SelectTrigger>{" "}
                                    <SelectContent>
                                      {" "}
                                      {RACK_TYPES.map((type) => (
                                        <SelectItem
                                          key={type.value}
                                          value={type.value}
                                        >
                                          {" "}
                                          {type.label}{" "}
                                        </SelectItem>
                                      ))}{" "}
                                    </SelectContent>{" "}
                                  </Select>{" "}
                                  <div className="flex items-center gap-1">
                                    {" "}
                                    <span>Levels</span>{" "}
                                    <Input
                                      type="number"
                                      defaultValue={rack.levels}
                                      className="h-7 w-16 text-xs"
                                      min={1}
                                      max={20}
                                      onBlur={(event) => {
                                        const value = Number(
                                          event.target.value,
                                        );
                                        if (
                                          !Number.isNaN(value) &&
                                          value !== rack.levels
                                        ) {
                                          handleRackFieldUpdate(rack, {
                                            levels: value,
                                          });
                                        }
                                      }}
                                    />{" "}
                                  </div>{" "}
                                  <div className="flex items-center gap-1">
                                    {" "}
                                    <span>Columns</span>{" "}
                                    <Input
                                      type="number"
                                      defaultValue={rack.columns}
                                      className="h-7 w-16 text-xs"
                                      min={1}
                                      max={20}
                                      onBlur={(event) => {
                                        const value = Number(
                                          event.target.value,
                                        );
                                        if (
                                          !Number.isNaN(value) &&
                                          value !== rack.columns
                                        ) {
                                          handleRackFieldUpdate(rack, {
                                            columns: value,
                                          });
                                        }
                                      }}
                                    />{" "}
                                  </div>{" "}
                                </div>{" "}
                              </div>{" "}
                              <div className="flex flex-wrap gap-2">
                                {" "}
                                <Button
                                  size="sm"
                                  onClick={() => handleGenerateGrid(rack)}
                                >
                                  {" "}
                                  Fill grid{" "}
                                </Button>{" "}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleGenerateGrid(rack, {
                                      regenerate: true,
                                    })
                                  }
                                >
                                  {" "}
                                  Rebuild grid{" "}
                                </Button>{" "}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAddBin(rack)}
                                >
                                  {" "}
                                  Add bin{" "}
                                </Button>{" "}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveRack(rack.id)}
                                >
                                  {" "}
                                  Remove rack{" "}
                                </Button>{" "}
                              </div>{" "}
                            </div>{" "}
                            <Textarea
                              defaultValue={rack.notes ?? ""}
                              placeholder="Notes, compliance, or lock/access details for this rack."
                              className="min-h-[60px] text-xs"
                              onBlur={(event) => {
                                const value = event.target.value.trim();
                                if (
                                  (value || rack.notes) &&
                                  value !== (rack.notes ?? "")
                                ) {
                                  handleRackFieldUpdate(rack, {
                                    notes: value || null,
                                  });
                                }
                              }}
                            />{" "}
                            <div className="mt-3 rounded-lg border border-slate-800/50 bg-surface p-3">
                              {" "}
                              <RackGrid
                                rack={rack}
                                bins={bins}
                                itemsById={itemsById}
                                parSuggestions={suggestionMap}
                              />{" "}
                            </div>{" "}
                            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                              {" "}
                              {bins.map((bin) => {
                                const item = bin.itemId
                                  ? (itemsById.get(bin.itemId) ?? null)
                                  : null;
                                const glSuffix = item?.glCode
                                  ? item.glCode.slice(-4)
                                  : null;
                                const departments = Array.isArray(
                                  item?.departments,
                                )
                                  ? (item?.departments ?? [])
                                  : [];
                                const suggestion = bin.itemId
                                  ? (suggestionMap.get(bin.itemId) ?? null)
                                  : null;
                                return (
                                  <div
                                    key={bin.id}
                                    className="space-y-3 rounded-md border border-border bg-surface p-3 text-sm"
                                  >
                                    {" "}
                                    <div className="flex items-center justify-between gap-2">
                                      {" "}
                                      <Input
                                        defaultValue={bin.label}
                                        onBlur={(event) => {
                                          const value =
                                            event.target.value.trim();
                                          if (value && value !== bin.label)
                                            handleBinUpdate(bin, {
                                              label: value,
                                            });
                                        }}
                                        className="h-8 text-sm font-medium"
                                      />{" "}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2"
                                        onClick={() => handleRemoveBin(bin.id)}
                                      >
                                        {" "}
                                        Remove{" "}
                                      </Button>{" "}
                                    </div>{" "}
                                    <div className="flex flex-wrap items-center gap-2 text-[0.65rem] text-muted-foreground">
                                      {" "}
                                      {item ? (
                                        <>
                                          {" "}
                                          <Badge
                                            variant="outline"
                                            className="px-1 py-0"
                                          >
                                            {" "}
                                            {glSuffix
                                              ? `GL ${glSuffix}`
                                              : "GL —"}{" "}
                                          </Badge>{" "}
                                          <span className="font-medium text-slate-200">
                                            {item.name}
                                          </span>{" "}
                                        </>
                                      ) : (
                                        <span>Unassigned item</span>
                                      )}{" "}
                                      {suggestion ? (
                                        <Badge
                                          variant="secondary"
                                          className="px-1 py-0"
                                        >
                                          {" "}
                                          AI {suggestion.recommendedPar} (
                                          {suggestion.variancePct >= 0
                                            ? "+"
                                            : ""}{" "}
                                          {suggestion.variancePct}% ){" "}
                                        </Badge>
                                      ) : null}{" "}
                                    </div>{" "}
                                    {departments.length ? (
                                      <div className="text-[0.65rem] text-muted-foreground">
                                        {" "}
                                        Departments:{" "}
                                        {departments.join(",")}{" "}
                                      </div>
                                    ) : null}{" "}
                                    <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                      {" "}
                                      <div>
                                        {" "}
                                        <Label className="text-[0.65rem] uppercase tracking-wide">
                                          Level
                                        </Label>{" "}
                                        <Input
                                          type="number"
                                          defaultValue={bin.level}
                                          className="h-8"
                                          min={1}
                                          onBlur={(event) => {
                                            const value = Number(
                                              event.target.value,
                                            );
                                            if (
                                              !Number.isNaN(value) &&
                                              value !== bin.level
                                            ) {
                                              handleBinUpdate(bin, {
                                                level: value,
                                              });
                                            }
                                          }}
                                        />{" "}
                                      </div>{" "}
                                      <div>
                                        {" "}
                                        <Label className="text-[0.65rem] uppercase tracking-wide">
                                          Column
                                        </Label>{" "}
                                        <Input
                                          type="number"
                                          defaultValue={bin.column}
                                          className="h-8"
                                          min={1}
                                          onBlur={(event) => {
                                            const value = Number(
                                              event.target.value,
                                            );
                                            if (
                                              !Number.isNaN(value) &&
                                              value !== bin.column
                                            ) {
                                              handleBinUpdate(bin, {
                                                column: value,
                                              });
                                            }
                                          }}
                                        />{" "}
                                      </div>{" "}
                                    </div>{" "}
                                    <div className="space-y-2">
                                      {" "}
                                      <Label className="text-[0.65rem] uppercase tracking-wide">
                                        Assigned item
                                      </Label>{" "}
                                      <Select
                                        value={
                                          bin.itemId ?? UNASSIGNED_ITEM_VALUE
                                        }
                                        onValueChange={(value) =>
                                          handleBinUpdate(bin, {
                                            itemId:
                                              value === UNASSIGNED_ITEM_VALUE
                                                ? null
                                                : value,
                                          })
                                        }
                                      >
                                        {" "}
                                        <SelectTrigger className="h-8 text-left">
                                          {" "}
                                          <SelectValue placeholder="Unassigned" />{" "}
                                        </SelectTrigger>{" "}
                                        <SelectContent>
                                          {" "}
                                          <SelectItem
                                            value={UNASSIGNED_ITEM_VALUE}
                                          >
                                            Unassigned
                                          </SelectItem>{" "}
                                          {outletItems.map((candidate) => {
                                            const suffix = candidate.gl
                                              ? candidate.gl.slice(-4)
                                              : null;
                                            return (
                                              <SelectItem
                                                key={candidate.id}
                                                value={candidate.id}
                                              >
                                                {" "}
                                                {suffix
                                                  ? `GL ${suffix} · ${candidate.name}`
                                                  : candidate.name}{" "}
                                              </SelectItem>
                                            );
                                          })}{" "}
                                        </SelectContent>{" "}
                                      </Select>{" "}
                                    </div>{" "}
                                    <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                      {" "}
                                      <div>
                                        {" "}
                                        <Label className="text-[0.65rem] uppercase tracking-wide">
                                          Par qty
                                        </Label>{" "}
                                        <Input
                                          type="number"
                                          className="h-8"
                                          defaultValue={bin.parQty ?? ""}
                                          onBlur={(event) => {
                                            const value =
                                              event.target.value.trim();
                                            handleBinUpdate(bin, {
                                              parQty: value.length
                                                ? Number(value)
                                                : null,
                                            });
                                          }}
                                        />{" "}
                                      </div>{" "}
                                      <div>
                                        {" "}
                                        <Label className="text-[0.65rem] uppercase tracking-wide">
                                          Capacity
                                        </Label>{" "}
                                        <Input
                                          className="h-8"
                                          defaultValue={bin.capacity ?? ""}
                                          onBlur={(event) => {
                                            const value =
                                              event.target.value.trim();
                                            if (
                                              value !== (bin.capacity ?? "")
                                            ) {
                                              handleBinUpdate(bin, {
                                                capacity: value || null,
                                              });
                                            }
                                          }}
                                        />{" "}
                                      </div>{" "}
                                    </div>{" "}
                                    <Textarea
                                      defaultValue={bin.notes ?? ""}
                                      placeholder="Notes or security requirements"
                                      className="min-h-[60px] text-xs"
                                      onBlur={(event) => {
                                        const value = event.target.value.trim();
                                        handleBinUpdate(bin, {
                                          notes: value || null,
                                        });
                                      }}
                                    />{" "}
                                  </div>
                                );
                              })}{" "}
                              {!bins.length && (
                                <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                                  {" "}
                                  No bins configured yet. Use"Add bin" to map
                                  shelves left-to-right, top-to-bottom.{" "}
                                </div>
                              )}{" "}
                            </div>{" "}
                          </div>
                        );
                      })}{" "}
                      {!racks.length && (
                        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                          {" "}
                          No racks yet. Add shelving or cages to detail this
                          area.{" "}
                        </div>
                      )}{" "}
                    </div>{" "}
                  </div>
                );
              })}{" "}
            </div>{" "}
          </ScrollArea>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
export const StorageDesigner = memo(StorageDesignerComponent);
