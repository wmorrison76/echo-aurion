import { useMemo } from "react";
import { canvasEngine, type CanvasElement } from "@/services/CanvasEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Settings, Type, Palette, Zap, Eye } from "lucide-react";

interface InspectorPanelProps {
  selectedIds: string[];
}

export default function InspectorPanel({ selectedIds }: InspectorPanelProps) {
  const state = canvasEngine.getState();
  const selectedElements = useMemo(
    () => state.elements.filter((el) => selectedIds.includes(el.id)),
    [selectedIds, state.elements],
  );

  if (selectedElements.length === 0) {
    return (
      <Card className="border border-primary/20 bg-background/75 backdrop-blur h-full flex items-center justify-center">
        <CardContent className="text-center space-y-2 py-8">
          <Settings className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Select an element to inspect
          </p>
        </CardContent>
      </Card>
    );
  }

  const first = selectedElements[0];
  const multiple = selectedElements.length > 1;

  const handleUpdate = (updates: Partial<CanvasElement>) => {
    selectedIds.forEach((id) => {
      canvasEngine.updateElement(id, updates);
    });
  };

  return (
    <Card className="border border-primary/20 bg-background/75 backdrop-blur h-full overflow-y-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings className="w-4 h-4" />
          {multiple ? `${selectedIds.length} Items` : first.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        <Tabs defaultValue="design" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="design" className="text-xs">
              Design
            </TabsTrigger>
            <TabsTrigger value="content" className="text-xs">
              Content
            </TabsTrigger>
            <TabsTrigger value="effects" className="text-xs">
              Effects
            </TabsTrigger>
          </TabsList>

          {/* Design Tab */}
          <TabsContent value="design" className="space-y-4">
            {/* Position & Size */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                Position & Size
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">X</Label>
                  <Input
                    type="number"
                    value={Math.round(first.bounds.x)}
                    onChange={(e) =>
                      handleUpdate({
                        bounds: {
                          ...first.bounds,
                          x: parseInt(e.target.value),
                        },
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Y</Label>
                  <Input
                    type="number"
                    value={Math.round(first.bounds.y)}
                    onChange={(e) =>
                      handleUpdate({
                        bounds: {
                          ...first.bounds,
                          y: parseInt(e.target.value),
                        },
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">W</Label>
                  <Input
                    type="number"
                    value={Math.round(first.bounds.width)}
                    onChange={(e) =>
                      handleUpdate({
                        bounds: {
                          ...first.bounds,
                          width: parseInt(e.target.value),
                        },
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">H</Label>
                  <Input
                    type="number"
                    value={Math.round(first.bounds.height)}
                    onChange={(e) =>
                      handleUpdate({
                        bounds: {
                          ...first.bounds,
                          height: parseInt(e.target.value),
                        },
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Rotation */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">Rotation</Label>
                <span className="text-xs text-muted-foreground">
                  {first.rotation}°
                </span>
              </div>
              <Slider
                value={[first.rotation]}
                onValueChange={(value) => handleUpdate({ rotation: value[0] })}
                min={0}
                max={360}
                step={1}
                className="w-full"
              />
            </div>

            <Separator />

            {/* Opacity */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">Opacity</Label>
                <span className="text-xs text-muted-foreground">
                  {Math.round(first.opacity * 100)}%
                </span>
              </div>
              <Slider
                value={[first.opacity]}
                onValueChange={(value) => handleUpdate({ opacity: value[0] })}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>

            <Separator />

            {/* Blend Mode */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Blend Mode</Label>
              <Select
                value={first.blendMode}
                onValueChange={(value: any) =>
                  handleUpdate({ blendMode: value })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="multiply">Multiply</SelectItem>
                  <SelectItem value="screen">Screen</SelectItem>
                  <SelectItem value="overlay">Overlay</SelectItem>
                  <SelectItem value="lighten">Lighten</SelectItem>
                  <SelectItem value="darken">Darken</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Fill */}
            {first.fill && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-2">
                  <Palette className="w-3 h-3" />
                  Fill
                </Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={first.fill.color || "#000000"}
                    onChange={(e) =>
                      handleUpdate({
                        fill: { ...first.fill!, color: e.target.value },
                      })
                    }
                    className="w-10 h-8 rounded cursor-pointer border border-primary/20"
                  />
                  <div className="flex-1 space-y-1">
                    <Slider
                      value={[(first.fill.opacity || 1) * 100]}
                      onValueChange={(value) =>
                        handleUpdate({
                          fill: { ...first.fill!, opacity: value[0] / 100 },
                        })
                      }
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stroke */}
            {first.stroke && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Stroke</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={first.stroke.color}
                      onChange={(e) =>
                        handleUpdate({
                          stroke: { ...first.stroke!, color: e.target.value },
                        })
                      }
                      className="w-10 h-8 rounded cursor-pointer border border-primary/20"
                    />
                    <Input
                      type="number"
                      value={first.stroke.width}
                      onChange={(e) =>
                        handleUpdate({
                          stroke: {
                            ...first.stroke!,
                            width: parseInt(e.target.value),
                          },
                        })
                      }
                      className="h-8 text-xs w-16"
                      min={0}
                      max={20}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Border Radius */}
            {first.type === "rectangle" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Border Radius</Label>
                  <Input
                    type="number"
                    value={first.borderRadius || 0}
                    onChange={(e) =>
                      handleUpdate({ borderRadius: parseInt(e.target.value) })
                    }
                    className="h-8 text-xs"
                    min={0}
                  />
                </div>
              </>
            )}
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            {first.type === "text" ? (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Text</Label>
                  <textarea
                    value={first.textContent || ""}
                    onChange={(e) =>
                      handleUpdate({ textContent: e.target.value })
                    }
                    className="w-full h-20 p-2 text-xs border border-primary/20 rounded bg-secondary/50 resize-none"
                  />
                </div>

                {first.textStyle && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold flex items-center gap-2">
                        <Type className="w-3 h-3" />
                        Typography
                      </Label>
                      <Select
                        value={first.textStyle.fontFamily}
                        onValueChange={(value) =>
                          handleUpdate({
                            textStyle: {
                              ...first.textStyle!,
                              fontFamily: value,
                            },
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Inter, sans-serif">
                            Inter
                          </SelectItem>
                          <SelectItem value="Georgia, serif">
                            Georgia
                          </SelectItem>
                          <SelectItem value="Courier, monospace">
                            Courier
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Size</Label>
                          <Input
                            type="number"
                            value={first.textStyle.fontSize}
                            onChange={(e) =>
                              handleUpdate({
                                textStyle: {
                                  ...first.textStyle!,
                                  fontSize: parseInt(e.target.value),
                                },
                              })
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Weight</Label>
                          <Select
                            value={first.textStyle.fontWeight}
                            onValueChange={(value: any) =>
                              handleUpdate({
                                textStyle: {
                                  ...first.textStyle!,
                                  fontWeight: value,
                                },
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="300">Light</SelectItem>
                              <SelectItem value="400">Regular</SelectItem>
                              <SelectItem value="600">Semibold</SelectItem>
                              <SelectItem value="bold">Bold</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Color</Label>
                        <input
                          type="color"
                          value={first.textStyle.color}
                          onChange={(e) =>
                            handleUpdate({
                              textStyle: {
                                ...first.textStyle!,
                                color: e.target.value,
                              },
                            })
                          }
                          className="w-full h-8 rounded cursor-pointer border border-primary/20"
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                Select a text element to edit content
              </p>
            )}
          </TabsContent>

          {/* Effects Tab */}
          <TabsContent value="effects" className="space-y-4">
            {first.shadow && first.shadow.length > 0 ? (
              <div className="space-y-3">
                {first.shadow.map((shadow, idx) => (
                  <div
                    key={idx}
                    className="p-2 border border-primary/20 rounded space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-semibold">
                        Shadow {idx + 1}
                      </Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const newShadows = first.shadow!.filter(
                            (_, i) => i !== idx,
                          );
                          handleUpdate({ shadow: newShadows });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Input
                        type="number"
                        placeholder="X"
                        defaultValue={shadow.x}
                      />
                      <Input
                        type="number"
                        placeholder="Y"
                        defaultValue={shadow.y}
                      />
                      <Input
                        type="number"
                        placeholder="Blur"
                        defaultValue={shadow.blur}
                      />
                      <Input type="color" defaultValue={shadow.color} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                No effects applied
              </p>
            )}
            <Button className="w-full" size="sm" variant="outline">
              Add Shadow
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
