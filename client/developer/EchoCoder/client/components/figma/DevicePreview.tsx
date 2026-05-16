import { useMemo, useState } from "react";
import { canvasEngine } from "@/services/CanvasEngine";
import { interactionEngine } from "@/services/InteractionEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MonitorSmartphone, Smartphone, Tablet, Monitor, Play } from "lucide-react";

const devicePresets = {
  phone: { label: "Phone", width: 375, height: 812, icon: Smartphone },
  tablet: { label: "Tablet", width: 820, height: 1180, icon: Tablet },
  desktop: { label: "Desktop", width: 1440, height: 1024, icon: Monitor },
} as const;

type DeviceKey = keyof typeof devicePresets;

export default function DevicePreview() {
  const [device, setDevice] = useState<DeviceKey>("phone");
  const canvasState = canvasEngine.getState();
  const prototypeData = interactionEngine.getPrototypeData();

  const selectedElements = useMemo(() => {
    return canvasState.elements.filter((element) => canvasState.selectedIds.includes(element.id));
  }, [canvasState.elements, canvasState.selectedIds]);

  const preset = devicePresets[device];
  const DeviceIcon = preset.icon;

  const scale = useMemo(() => {
    const maxWidth = 380;
    return Math.min(1, maxWidth / preset.width);
  }, [preset.width]);

  return (
    <Card className="border border-primary/20 bg-background/75 backdrop-blur h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MonitorSmartphone className="w-4 h-4" />
          Device Preview
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(devicePresets) as DeviceKey[]).map((key) => {
            const presetItem = devicePresets[key];
            const isActive = device === key;
            const Icon = presetItem.icon;
            return (
              <Button
                key={key}
                size="sm"
                variant={isActive ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => setDevice(key)}
              >
                <Icon className="w-3.5 h-3.5 mr-2" />
                {presetItem.label}
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-[10px]">{preset.width} × {preset.height}</Badge>
          <span>{selectedElements.length} selected element(s)</span>
          <span>{prototypeData.interactions.length} interactions</span>
        </div>

        <div className="flex-1 overflow-hidden grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="flex items-center justify-center overflow-hidden rounded-lg border border-primary/10 bg-gradient-to-b from-background to-secondary/10 p-4">
            <div
              className="relative rounded-[2rem] border border-primary/15 bg-slate-950 shadow-2xl overflow-hidden"
              style={{ width: preset.width * scale, height: preset.height * scale, transformOrigin: "top center" }}
            >
              <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-slate-900 px-4 py-2 text-[10px] text-slate-300">
                <span>Prototype Preview</span>
                <span>{preset.label}</span>
              </div>

              <div className="absolute inset-0 pt-8 p-4 text-slate-100">
                {selectedElements.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center text-xs text-slate-400">
                    Select an element in the canvas to preview its details here.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {selectedElements.map((element) => (
                      <div key={element.id} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{element.name}</p>
                            <p className="text-[11px] text-slate-400">{element.type}</p>
                          </div>
                          <Badge variant="outline" className="border-white/20 text-[10px] text-slate-200">
                            {Math.round(element.bounds.width)} × {Math.round(element.bounds.height)}
                          </Badge>
                        </div>
                        <div className="mt-3 rounded-lg border border-dashed border-white/15 bg-black/20 p-3 text-[11px] text-slate-300">
                          Position: {Math.round(element.bounds.x)}, {Math.round(element.bounds.y)}
                          <br />
                          Opacity: {Math.round(element.opacity * 100)}%
                          <br />
                          Rotation: {Math.round(element.rotation)}°
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Card className="border-primary/10 bg-background/70 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <Play className="w-3.5 h-3.5" />
                Prototype Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[560px] pr-4">
                <div className="space-y-3 text-xs">
                  <div className="rounded-md border border-primary/10 p-3 space-y-1">
                    <p className="font-semibold">Selected Screen</p>
                    <p className="text-muted-foreground">
                      {selectedElements.length > 0
                        ? selectedElements.map((element) => element.name).join(", ")
                        : "Nothing selected"}
                    </p>
                  </div>

                  <div className="rounded-md border border-primary/10 p-3 space-y-1">
                    <p className="font-semibold">Device Metrics</p>
                    <p className="text-muted-foreground">Viewport: {preset.width} × {preset.height}</p>
                    <p className="text-muted-foreground">Scale: {Math.round(scale * 100)}%</p>
                  </div>

                  <div className="rounded-md border border-primary/10 p-3 space-y-1">
                    <p className="font-semibold">Prototype Data</p>
                    <p className="text-muted-foreground">{prototypeData.interactions.length} active interactions</p>
                    <p className="text-muted-foreground">{prototypeData.animations.length} animation sequences</p>
                    <p className="text-muted-foreground">{prototypeData.flows.length} recorded flows</p>
                  </div>

                  <div className="rounded-md border border-primary/10 p-3 space-y-2">
                    <p className="font-semibold">Preview Notes</p>
                    <p className="text-muted-foreground">
                      Use the interaction form to define what happens when users tap, hover, or scroll.
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
