import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Store,
  INVENTORY_LAYOUT_EVENT_NAME,
  id,
} from "@/modules/PurchasingReceiving/client/lib/store";
import type {
  InventoryItem,
  StorageArea,
  StorageRack,
  StorageBin,
} from "@shared/inventory";
import { getQRCodeImageUrl } from "@/modules/Culinary/client/lib/qr-code-generator";

const SCALE = 50; // px per meter
const MEASURE_KEY = (outletId: string) => `storage:measurements:${outletId}`;

type LayoutEntity =
  | { type: "area"; data: StorageArea }
  | { type: "rack"; data: StorageRack };

type Measurement = {
  id: string;
  start: [number, number];
  end: [number, number];
};

const defaultAreaLayout = () => ({
  x: 0,
  y: 0,
  width: 8,
  depth: 6,
  rotation: 0,
});
const defaultRackLayout = () => ({
  x: 0.5,
  y: 0.5,
  width: 1.2,
  depth: 0.6,
  height: 2,
  rotation: 0,
});

export default function StorageBlueprint({ outletId }: { outletId: string }) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<LayoutEntity | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [measureMode, setMeasureMode] = useState(false);
  const [measureStart, setMeasureStart] = useState<[number, number] | null>(
    null,
  );
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [dragging, setDragging] = useState<{
    id: string;
    type: "area" | "rack";
    offset: [number, number];
  } | null>(null);

  const areas = useMemo(() => {
    return Store.listStorageAreas(outletId);
  }, [outletId, version]);

  const racks = useMemo(() => Store.listStorageRacks(), [version]);
  const racksByArea = useMemo(() => {
    return racks.reduce<Record<string, StorageRack[]>>((acc, rack) => {
      if (!acc[rack.areaId]) acc[rack.areaId] = [];
      acc[rack.areaId].push(rack);
      return acc;
    }, {});
  }, [racks]);

  const binsByRack = useMemo(() => {
    const bins = Store.listStorageBins();
    return bins.reduce<Record<string, StorageBin[]>>((acc, bin) => {
      if (!acc[bin.rackId]) acc[bin.rackId] = [];
      acc[bin.rackId].push(bin);
      return acc;
    }, {});
  }, [version]);

  const itemsById = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    Store.listItems().forEach((item) => map.set(item.id, item));
    return map;
  }, [version]);

  useEffect(() => {
    const handleLayoutUpdate = () => setVersion((v) => v + 1);
    window.addEventListener(
      INVENTORY_LAYOUT_EVENT_NAME,
      handleLayoutUpdate as EventListener,
    );
    return () =>
      window.removeEventListener(
        INVENTORY_LAYOUT_EVENT_NAME,
        handleLayoutUpdate as EventListener,
      );
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(MEASURE_KEY(outletId));
    if (raw) {
      try {
        setMeasurements(JSON.parse(raw));
      } catch {
        setMeasurements([]);
      }
    } else {
      setMeasurements([]);
    }
  }, [outletId]);

  useEffect(() => {
    localStorage.setItem(MEASURE_KEY(outletId), JSON.stringify(measurements));
  }, [measurements, outletId]);

  useEffect(() => {
    areas.forEach((area) => {
      if (!area.layout) {
        Store.saveStorageArea({ ...area, layout: defaultAreaLayout() });
      }
    });
    racks.forEach((rack) => {
      if (!rack.layout) {
        Store.saveStorageRack({ ...rack, layout: defaultRackLayout() });
      }
    });
  }, [areas, racks]);

  const toCanvas = (value: number) => value * SCALE;
  const fromCanvas = (value: number) => value / SCALE;

  const updateAreaLayout = (
    area: StorageArea,
    patch: Partial<StorageArea["layout"]>,
  ) => {
    const layout = area.layout ?? defaultAreaLayout();
    Store.saveStorageArea({ ...area, layout: { ...layout, ...patch } });
    setVersion((v) => v + 1);
  };

  const updateRackLayout = (
    rack: StorageRack,
    patch: Partial<StorageRack["layout"]>,
  ) => {
    const layout = rack.layout ?? defaultRackLayout();
    Store.saveStorageRack({ ...rack, layout: { ...layout, ...patch } });
    setVersion((v) => v + 1);
  };

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    entity: LayoutEntity,
  ) => {
    event.stopPropagation();
    if (measureMode) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const layout =
      entity.type === "area"
        ? (entity.data.layout ?? defaultAreaLayout())
        : (entity.data.layout ?? defaultRackLayout());
    const offsetX = event.clientX - rect.left - toCanvas(layout.x);
    const offsetY = event.clientY - rect.top - toCanvas(layout.y);
    setDragging({
      id: entity.data.id,
      type: entity.type,
      offset: [offsetX, offsetY],
    });
    setSelected(entity);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = fromCanvas(event.clientX - rect.left - dragging.offset[0]);
    const y = fromCanvas(event.clientY - rect.top - dragging.offset[1]);
    const snappedX = snapToGrid ? Math.round(x * 2) / 2 : x;
    const snappedY = snapToGrid ? Math.round(y * 2) / 2 : y;

    if (dragging.type === "area") {
      const area = areas.find((a) => a.id === dragging.id);
      if (area) updateAreaLayout(area, { x: snappedX, y: snappedY });
    }
    if (dragging.type === "rack") {
      const rack = racks.find((r) => r.id === dragging.id);
      if (rack) updateRackLayout(rack, { x: snappedX, y: snappedY });
    }
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!measureMode) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (!measureStart) {
      setMeasureStart([x, y]);
      return;
    }
    const next: Measurement = {
      id: id(),
      start: measureStart,
      end: [x, y],
    };
    setMeasurements((prev) => [next, ...prev]);
    setMeasureStart(null);
  };

  const handlePrintLabels = useCallback(() => {
    if (!selected || selected.type !== "rack") {
      toast({
        title: "Select a rack",
        description: "Pick a rack to print bin labels.",
        variant: "destructive",
      });
      return;
    }
    const rack = selected.data;
    const bins = (binsByRack[rack.id] ?? []).sort((a, b) => {
      if (a.level === b.level) return a.column - b.column;
      return a.level - b.level;
    });
    const area = areas.find((a) => a.id === rack.areaId);
    const outlet = Store.listOutlets().find((o) => o.id === outletId);
    const labelHtml = bins
      .map((bin) => {
        const item = bin.itemId ? itemsById.get(bin.itemId) : null;
        const payload = {
          outletId,
          outletName: outlet?.name ?? "",
          areaId: area?.id ?? "",
          areaName: area?.name ?? "",
          rackId: rack.id,
          rackName: rack.name,
          binId: bin.id,
          binLabel: bin.label,
          itemName: item?.name ?? "",
        };
        const qrUrl = getQRCodeImageUrl(JSON.stringify(payload), 160);
        return `
          <div style="border:1px solid #111;padding:12px;margin:8px;width:240px;display:inline-block;font-family:Arial,sans-serif;">
            <div style="font-size:12px;font-weight:bold;">${outlet?.name ?? "Outlet"}</div>
            <div style="font-size:11px;margin-top:4px;">${area?.name ?? "Area"} · ${rack.name}</div>
            <div style="font-size:14px;font-weight:bold;margin-top:6px;">${bin.label}</div>
            <div style="font-size:11px;color:#444;margin-top:4px;">${item?.name ?? "Unassigned"}</div>
            <div style="margin-top:8px;text-align:center;">
              <img src="${qrUrl}" width="120" height="120" />
            </div>
          </div>
        `;
      })
      .join("");

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Bin Labels</title>
        </head>
        <body>${labelHtml}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }, [areas, binsByRack, itemsById, outletId, selected, toast]);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="p-4 space-y-4">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Layout tools
          </Label>
          <div className="mt-2 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Snap to 0.5m grid</Label>
              <Switch checked={snapToGrid} onCheckedChange={setSnapToGrid} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Measure mode</Label>
              <Switch checked={measureMode} onCheckedChange={setMeasureMode} />
            </div>
            <Button variant="outline" onClick={() => setMeasurements([])}>
              Clear measurements
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Selection
          </Label>
          {selected ? (
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-semibold capitalize">{selected.type}</div>
                <div className="text-muted-foreground">
                  {selected.data.name}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">X (m)</Label>
                  <Input
                    type="number"
                    value={(selected.data.layout?.x ?? 0).toString()}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (selected.type === "area") {
                        updateAreaLayout(selected.data, { x: value });
                      } else {
                        updateRackLayout(selected.data, { x: value });
                      }
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Y (m)</Label>
                  <Input
                    type="number"
                    value={(selected.data.layout?.y ?? 0).toString()}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (selected.type === "area") {
                        updateAreaLayout(selected.data, { y: value });
                      } else {
                        updateRackLayout(selected.data, { y: value });
                      }
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Width (m)</Label>
                  <Input
                    type="number"
                    value={(selected.data.layout?.width ?? 1).toString()}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (selected.type === "area") {
                        updateAreaLayout(selected.data, { width: value });
                      } else {
                        updateRackLayout(selected.data, { width: value });
                      }
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Depth (m)</Label>
                  <Input
                    type="number"
                    value={(selected.data.layout?.depth ?? 1).toString()}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (selected.type === "area") {
                        updateAreaLayout(selected.data, { depth: value });
                      } else {
                        updateRackLayout(selected.data, { depth: value });
                      }
                    }}
                  />
                </div>
                {selected.type === "rack" && (
                  <div className="col-span-2">
                    <Label className="text-xs">Height (m)</Label>
                    <Input
                      type="number"
                      value={(selected.data.layout?.height ?? 1).toString()}
                      onChange={(event) => {
                        updateRackLayout(selected.data, {
                          height: Number(event.target.value),
                        });
                      }}
                    />
                  </div>
                )}
              </div>
              {selected.type === "rack" && (
                <Button onClick={handlePrintLabels}>Print bin labels</Button>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Click a storage area or rack to edit layout.
            </div>
          )}
        </div>
      </Card>

      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          Blueprint view · 1m = {SCALE}px
        </div>
        <div
          ref={canvasRef}
          className="relative h-[620px] w-full bg-slate-50"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleCanvasClick}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(148,163,184,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.2) 1px, transparent 1px)",
              backgroundSize: `${SCALE / 2}px ${SCALE / 2}px`,
            }}
          />
          {areas.map((area) => {
            const layout = area.layout ?? defaultAreaLayout();
            return (
              <div
                key={area.id}
                className="absolute border-2 border-blue-300 bg-blue-200/30 text-xs"
                style={{
                  left: toCanvas(layout.x),
                  top: toCanvas(layout.y),
                  width: toCanvas(layout.width),
                  height: toCanvas(layout.depth),
                }}
                onPointerDown={(event) =>
                  handlePointerDown(event, { type: "area", data: area })
                }
              >
                <div className="px-1 py-0.5 font-semibold text-blue-900">
                  {area.name}
                </div>
                {(racksByArea[area.id] ?? []).map((rack) => {
                  const rackLayout = rack.layout ?? defaultRackLayout();
                  return (
                    <div
                      key={rack.id}
                      className="absolute border border-emerald-500 bg-emerald-200/60 text-[10px]"
                      style={{
                        left: toCanvas(rackLayout.x),
                        top: toCanvas(rackLayout.y),
                        width: toCanvas(rackLayout.width),
                        height: toCanvas(rackLayout.depth),
                      }}
                      onPointerDown={(event) =>
                        handlePointerDown(event, { type: "rack", data: rack })
                      }
                    >
                      <span className="px-1">{rack.name}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {measurements.map((line) => {
            const length =
              Math.hypot(
                line.end[0] - line.start[0],
                line.end[1] - line.start[1],
              ) / SCALE;
            const labelX = (line.start[0] + line.end[0]) / 2;
            const labelY = (line.start[1] + line.end[1]) / 2;
            return (
              <div key={line.id}>
                <svg className="absolute inset-0 pointer-events-none">
                  <line
                    x1={line.start[0]}
                    y1={line.start[1]}
                    x2={line.end[0]}
                    y2={line.end[1]}
                    stroke="#ef4444"
                    strokeWidth={2}
                  />
                </svg>
                <div
                  className="absolute text-[10px] bg-white/90 px-1 rounded"
                  style={{ left: labelX, top: labelY }}
                >
                  {length.toFixed(2)}m
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
