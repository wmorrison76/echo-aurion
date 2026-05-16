import React, { Suspense } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Environment,
  Grid,
  OrbitControls,
  TransformControls,
  Box,
  Cylinder,
  Sphere,
} from "@react-three/drei";

import Layout from "@/components/Layout";
import Toolbar, { ToolId } from "@/components/studio/Toolbar";
import PanelWindow from "@/components/studio/PanelWindow";
import AssistantPanel from "@/components/studio/AssistantPanel";
import EchoLayoutScene, { EchoLayoutObject } from "@/scenes/EchoLayoutScene";
import { useLayoutStorage } from "@/hooks/useLayoutStorage";
import { toast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import {
  Camera,
  Copy,
  Download,
  Eye,
  EyeOff,
  Grid3X3,
  Trash2,
} from "lucide-react";

type ObjType = "box" | "cylinder" | "sphere" | "floor";

interface Obj {
  id: string;
  type: ObjType;
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  width?: number; /* x dimension (ft) */
  height?: number; /* z dimension (ft) */
  diameter?: number; /* for round */
  url?: string; /* for floor image */
  sourceType?: string; /* original planner type */
  seats?: number;
  label?: string;
}

function useLocalStorage<T>(key: string, initial: T) {
  const [state, setState] = React.useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [key, state]);

  return [state, setState] as const;
}

function CaptureBridge({
  onReady,
}: {
  onReady: (api: { capture: () => string }) => void;
}) {
  const { gl, scene, camera } = useThree();
  React.useEffect(() => {
    onReady({
      capture: () => {
        gl.render(scene, camera);
        return (gl.domElement as HTMLCanvasElement).toDataURL("image/png");
      },
    });
  }, [gl, scene, camera, onReady]);
  return null;
}

function Chair({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <Box args={[0.6, 0.2, 0.6]} position={[0, 1.6, 0]}>
        <meshStandardMaterial color="#9ca3af" roughness={0.85} />
      </Box>
      <Box args={[0.6, 0.1, 0.1]} position={[0, 1.9, -0.25]}>
        <meshStandardMaterial color="#9ca3af" roughness={0.85} />
      </Box>
    </group>
  );
}

function ObjectMesh({
  obj,
  selected,
  onSelect,
  onUpdate,
}: {
  obj: Obj;
  selected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (
    id: string,
    pos: [number, number, number],
    rot: [number, number, number],
  ) => void;
}) {
  const groupRef = React.useRef<any>(null);

  const baseClick = (e: any) => {
    e.stopPropagation();
    onSelect(obj.id);
  };

  const isCocktail = String(obj.sourceType || "").includes("cocktail");

  const wrapTransform = (content: React.ReactNode) => {
    if (!selected) return content;
    return (
      <TransformControls
        mode="translate"
        onChange={() => {
          const g = groupRef.current;
          if (!g) return;
          const p = g.position;
          const r = g.rotation;
          onUpdate(obj.id, [p.x, p.y, p.z], [r.x, r.y, r.z]);
        }}
      >
        {content}
      </TransformControls>
    );
  };

  if (obj.type === "box") {
    const w = obj.width ?? 4;
    const d = obj.height ?? 4;
    const topThickness = 0.12;
    const topY = (isCocktail ? 3.5 : 2.5) + topThickness / 2;
    const legH = topY - 0.02;
    const legR = 0.08;
    const legOffset = 0.3;

    const chairs: JSX.Element[] = [];
    if ((obj.seats ?? 0) > 0) {
      const perSide = Math.ceil((obj.seats ?? 0) / 2);
      for (let i = 0; i < perSide; i++) {
        const t = (i + 1) / (perSide + 1);
        const x = -w / 2 + t * w;
        chairs.push(
          <Chair key={`c-top-${i}`} position={[x, 0, -d / 2 - 0.5]} />,
        );
        chairs.push(
          <Chair key={`c-bot-${i}`} position={[x, 0, d / 2 + 0.5]} />,
        );
      }
    }

    const content = (
      <group
        onClick={baseClick}
        ref={groupRef}
        position={obj.position}
        rotation={obj.rotation}
      >
        <Box position={[0, topY, 0]} args={[w, topThickness, d]}>
          <meshStandardMaterial
            color={obj.color || "#e5e7eb"}
            roughness={0.9}
            metalness={0.05}
          />
        </Box>
        <Cylinder
          position={[-w / 2 + legOffset, legH / 2, -d / 2 + legOffset]}
          args={[legR, legR, legH, 12]}
        >
          <meshStandardMaterial color="#4b5563" roughness={0.8} />
        </Cylinder>
        <Cylinder
          position={[w / 2 - legOffset, legH / 2, -d / 2 + legOffset]}
          args={[legR, legR, legH, 12]}
        >
          <meshStandardMaterial color="#4b5563" roughness={0.8} />
        </Cylinder>
        <Cylinder
          position={[-w / 2 + legOffset, legH / 2, d / 2 - legOffset]}
          args={[legR, legR, legH, 12]}
        >
          <meshStandardMaterial color="#4b5563" roughness={0.8} />
        </Cylinder>
        <Cylinder
          position={[w / 2 - legOffset, legH / 2, d / 2 - legOffset]}
          args={[legR, legR, legH, 12]}
        >
          <meshStandardMaterial color="#4b5563" roughness={0.8} />
        </Cylinder>
        <group>{chairs}</group>
      </group>
    );
    return wrapTransform(content);
  }

  if (obj.type === "cylinder") {
    const r = (obj.diameter ?? obj.width ?? 5) / 2;
    const topThickness = 0.12;
    const topY = (isCocktail ? 3.5 : 2.5) + topThickness / 2;
    const postH = topY - 0.02;
    const postR = isCocktail ? 0.12 : 0.08;
    const chairs: JSX.Element[] = [];

    const count = obj.seats ?? 0;
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * (r + 0.7);
        const z = Math.sin(angle) * (r + 0.7);
        chairs.push(<Chair key={`c-${i}`} position={[x, 0, z]} />);
      }
    }

    const content = (
      <group
        onClick={baseClick}
        ref={groupRef}
        position={obj.position}
        rotation={obj.rotation}
      >
        <Cylinder position={[0, topY, 0]} args={[r, r, topThickness, 48]}>
          <meshStandardMaterial
            color={obj.color || "#e5e7eb"}
            roughness={0.9}
            metalness={0.05}
          />
        </Cylinder>
        <Cylinder position={[0, postH / 2, 0]} args={[postR, postR, postH, 16]}>
          <meshStandardMaterial color="#4b5563" roughness={0.8} />
        </Cylinder>
        <group>{chairs}</group>
      </group>
    );
    return wrapTransform(content);
  }

  if (obj.type === "sphere") {
    const content = (
      <group
        onClick={baseClick}
        ref={groupRef}
        position={obj.position}
        rotation={obj.rotation}
      >
        <Sphere args={[0.8]}>
          <meshStandardMaterial color={obj.color || "#10b981"} />
        </Sphere>
      </group>
    );
    return wrapTransform(content);
  }

  if (obj.type === "floor") {
    const w = obj.width ?? 12;
    const h = obj.height ?? 10;
    return (
      <group
        onClick={baseClick}
        position={obj.position}
        rotation={obj.rotation}
      >
        <Box args={[w, 0.05, h]}>
          <meshStandardMaterial color="#9ca3af" opacity={0.15} transparent />
        </Box>
      </group>
    );
  }

  return null;
}

export default function Studio() {
  const [mode, setMode] = React.useState<"classic" | "dining">("classic");
  const [tool, setTool] = React.useState<ToolId>("move");
  const [showGrid, setShowGrid] = React.useState(true);

  const [objects, setObjects] = useLocalStorage<Obj[]>("studio.objects", [
    { id: "a", type: "box", position: [-2, 1, 0], color: "#3b82f6" },
    { id: "b", type: "cylinder", position: [2, 1, 0], color: "#ef4444" },
    { id: "c", type: "sphere", position: [0, 1, 2], color: "#10b981" },
  ]);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [panels, setPanels] = React.useState<Record<string, boolean>>({});

  const [layoutSaveName, setLayoutSaveName] = React.useState("");
  const [roomWidth, setRoomWidth] = React.useState(24);
  const [roomLength, setRoomLength] = React.useState(36);
  const [diningLayout, setDiningLayout] = React.useState<EchoLayoutObject[]>(
    [],
  );

  const captureApi = React.useRef<{ capture: () => string } | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const importJsonRef = React.useRef<HTMLInputElement | null>(null);

  const layoutStorage = useLayoutStorage();

  const selected = React.useMemo(
    () => objects.find((o) => o.id === selectedId) || null,
    [objects, selectedId],
  );

  const addObject = React.useCallback(
    (type: ObjType) => {
      const id = Math.random().toString(36).slice(2, 9);
      const base: Obj = {
        id,
        type,
        position: [Math.random() * 4 - 2, 1, Math.random() * 4 - 2],
      };
      setObjects((o) => [...o, base]);
    },
    [setObjects],
  );

  const duplicateSelected = React.useCallback(() => {
    if (!selected) return;
    const id = Math.random().toString(36).slice(2, 9);
    const clone: Obj = {
      ...selected,
      id,
      position: [
        selected.position[0] + 0.5,
        selected.position[1],
        selected.position[2] + 0.5,
      ],
    };
    setObjects((o) => [...o, clone]);
    setSelectedId(id);
  }, [selected, setObjects]);

  const deleteSelected = React.useCallback(() => {
    if (!selectedId) return;
    setObjects((o) => o.filter((x) => x.id !== selectedId));
    setSelectedId(null);
  }, [selectedId, setObjects]);

  const clearAll = React.useCallback(() => {
    setObjects([]);
    setSelectedId(null);
  }, [setObjects]);

  const exportJSON = React.useCallback(() => {
    const data = JSON.stringify({ objects }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "echoeventstudio-scene.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: "Scene exported" });
  }, [objects]);

  const renderPNG = React.useCallback(() => {
    if (!captureApi.current) return;
    const url = captureApi.current.capture();
    const a = document.createElement("a");
    a.href = url;
    a.download = "render.png";
    a.click();
    toast({ title: "Render saved" });
  }, []);

  const importFloor = React.useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      const id = Math.random().toString(36).slice(2, 9);
      setObjects((o) => [
        ...o,
        {
          id,
          type: "floor",
          position: [0, 0.025, 0],
          width: 12,
          height: 10,
          url,
        },
      ]);
      toast({ title: "Floor plan added" });
    },
    [setObjects],
  );

  React.useEffect(() => {
    const should = localStorage.getItem("planner.autoload") === "1";
    if (!should) return;
    try {
      const raw = localStorage.getItem("planner.last");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.items)) {
        const mapped: Obj[] = data.items.slice(0, 400).map((it: any) => {
          const id = Math.random().toString(36).slice(2, 9);
          const rotY = ((Number(it.rotation) || 0) * Math.PI) / 180;
          const common = {
            id,
            position: [Number(it.x) || 0, 0, Number(it.y) || 0] as [
              number,
              number,
              number,
            ],
            rotation: [0, rotY, 0] as [number, number, number],
            color: "#9ca3af",
            sourceType: String(it.type || ""),
            seats: typeof it.seats === "number" ? it.seats : 0,
            label: it.label ? String(it.label) : undefined,
          };
          const t = String(it.type || "");
          if (t.startsWith("round") || t.startsWith("cocktail")) {
            return {
              ...common,
              type: "cylinder" as const,
              diameter: Number(it.width || it.height || 5),
            };
          }
          return {
            ...common,
            type: "box" as const,
            width: Number(it.width || 4),
            height: Number(it.height || 4),
          };
        });
        setObjects(mapped);
        toast({ title: "Loaded layout from Planner" });
      }
    } catch {
      /* ignore */
    } finally {
      localStorage.removeItem("planner.autoload");
    }
  }, [setObjects]);

  return (
    <Layout>
      {/* Title bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="h-12 w-full border-b border-border/60 bg-card/80 backdrop-blur-xl flex items-center justify-between px-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-tight">
              EchoEventStudio
            </span>
            <div className="flex gap-1 ml-4 border-l border-border/40 pl-4">
              <Button
                size="sm"
                variant={mode === "classic" ? "default" : "ghost"}
                onClick={() => setMode("classic")}
              >
                Classic
              </Button>
              <Button
                size="sm"
                variant={mode === "dining" ? "default" : "ghost"}
                onClick={() => setMode("dining")}
              >
                Dining Layout
              </Button>
            </div>

            <Menubar className="bg-transparent border-none shadow-none p-0 ml-2">
              <MenubarMenu>
                <MenubarTrigger>File</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem onClick={clearAll}>New</MenubarItem>
                  <MenubarItem onClick={() => fileRef.current?.click()}>
                    Import Floor Plan
                  </MenubarItem>
                  <MenubarItem onClick={() => importJsonRef.current?.click()}>
                    Import Scene (JSON)
                  </MenubarItem>
                  <MenubarItem
                    onClick={() => {
                      const raw = localStorage.getItem("planner.last");
                      if (!raw) {
                        toast({
                          title: "No planner layout found",
                          variant: "destructive",
                        });
                        return;
                      }
                      try {
                        const data = JSON.parse(raw);
                        if (!Array.isArray(data.items)) return;
                        const mapped: Obj[] = data.items
                          .slice(0, 400)
                          .map((it: any) => {
                            const id = Math.random().toString(36).slice(2, 9);
                            const rotY =
                              ((Number(it.rotation) || 0) * Math.PI) / 180;
                            const common = {
                              id,
                              position: [
                                Number(it.x) || 0,
                                0,
                                Number(it.y) || 0,
                              ] as [number, number, number],
                              rotation: [0, rotY, 0] as [
                                number,
                                number,
                                number,
                              ],
                              color: "#9ca3af",
                              sourceType: String(it.type || ""),
                              seats:
                                typeof it.seats === "number" ? it.seats : 0,
                              label: it.label ? String(it.label) : undefined,
                            };
                            const t = String(it.type || "");
                            if (
                              t.startsWith("round") ||
                              t.startsWith("cocktail")
                            ) {
                              return {
                                ...common,
                                type: "cylinder" as const,
                                diameter: Number(it.width || it.height || 5),
                              };
                            }
                            return {
                              ...common,
                              type: "box" as const,
                              width: Number(it.width || 4),
                              height: Number(it.height || 4),
                            };
                          });
                        setObjects(mapped);
                        toast({ title: "Loaded from Planner" });
                      } catch (e: any) {
                        toast({
                          title: e?.message || "Failed to load from Planner",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Load from Planner
                  </MenubarItem>
                  <MenubarItem onClick={exportJSON}>Export JSON</MenubarItem>
                  <MenubarItem onClick={renderPNG}>Export PNG</MenubarItem>
                </MenubarContent>
              </MenubarMenu>

              <MenubarMenu>
                <MenubarTrigger>Edit</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem onClick={duplicateSelected}>
                    Duplicate
                  </MenubarItem>
                  <MenubarItem onClick={deleteSelected}>Delete</MenubarItem>
                  <MenubarItem onClick={clearAll}>Clear All</MenubarItem>
                </MenubarContent>
              </MenubarMenu>

              <MenubarMenu>
                <MenubarTrigger>View</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem onClick={() => setShowGrid((v) => !v)}>
                    {showGrid ? "Hide Grid" : "Show Grid"}
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>

              <MenubarMenu>
                <MenubarTrigger>Panels</MenubarTrigger>
                <MenubarContent>
                  {[
                    { id: "objects", name: "Objects" },
                    { id: "layers", name: "Layers" },
                    { id: "properties", name: "Properties" },
                    { id: "assistant", name: "AI Assistant" },
                  ].map((p) => (
                    <MenubarItem
                      key={p.id}
                      onClick={() => setPanels((s) => ({ ...s, [p.id]: true }))}
                    >
                      Open {p.name}
                    </MenubarItem>
                  ))}
                </MenubarContent>
              </MenubarMenu>
            </Menubar>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGrid((v) => !v)}
            >
              {showGrid ? (
                <EyeOff className="h-4 w-4 mr-1" />
              ) : (
                <Eye className="h-4 w-4 mr-1" />
              )}
              Grid
            </Button>
            <Button variant="outline" size="sm" onClick={renderPNG}>
              <Camera className="h-4 w-4 mr-1" /> Render
            </Button>
            <Button size="sm" onClick={exportJSON}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importFloor(f);
          e.currentTarget.value = "";
        }}
      />
      <input
        ref={importJsonRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            const text = await f.text();
            const data = JSON.parse(text);
            if (Array.isArray(data.objects)) setObjects(data.objects);
            toast({ title: "Scene loaded" });
          } catch (err: any) {
            toast({
              title: err?.message || "Failed to load scene",
              variant: "destructive",
            });
          } finally {
            e.currentTarget.value = "";
          }
        }}
      />

      <div className="relative h-[calc(100vh-3rem)] w-full mt-12">
        {mode === "classic" ? (
          <>
            <Canvas
              camera={{ position: [8, 8, 8], fov: 50 }}
              className="w-full h-full"
            >
              <Suspense fallback={null}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />

                {showGrid ? (
                  <Grid
                    position={[0, -0.01, 0]}
                    args={[40, 40]}
                    cellSize={1}
                    cellThickness={0.5}
                    cellColor={"#6b7280"}
                    sectionSize={5}
                    sectionThickness={1}
                    sectionColor={"#374151"}
                    fadeDistance={60}
                    fadeStrength={1}
                    infiniteGrid
                  />
                ) : null}

                {objects.map((obj) => (
                  <ObjectMesh
                    key={obj.id}
                    obj={obj}
                    selected={obj.id === selectedId}
                    onSelect={setSelectedId}
                    onUpdate={(id, pos, rot) =>
                      setObjects((o) =>
                        o.map((x) =>
                          x.id === id
                            ? { ...x, position: pos, rotation: rot }
                            : x,
                        ),
                      )
                    }
                  />
                ))}

                <Environment preset="studio" />
                <OrbitControls enablePan enableZoom enableRotate makeDefault />
                <CaptureBridge onReady={(api) => (captureApi.current = api)} />
              </Suspense>
            </Canvas>
            <Toolbar value={tool} onChange={setTool} />
          </>
        ) : (
          <div className="absolute inset-0">
            <div className="absolute top-4 left-4 z-10 rounded-lg border bg-card/80 backdrop-blur p-3 w-[320px] space-y-2">
              <div className="text-sm font-semibold">Dining Layout</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Room Width (ft)</Label>
                  <Input
                    className="h-8"
                    type="number"
                    value={roomWidth}
                    onChange={(e) => setRoomWidth(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Room Length (ft)</Label>
                  <Input
                    className="h-8"
                    type="number"
                    value={roomLength}
                    onChange={(e) => setRoomLength(Number(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Save name</Label>
                <Input
                  className="h-8"
                  value={layoutSaveName}
                  onChange={(e) => setLayoutSaveName(e.target.value)}
                  placeholder="e.g. Ballroom A"
                />
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={async () => {
                  if (!layoutSaveName) {
                    toast({
                      title: "Enter a name for the layout",
                      variant: "destructive",
                    });
                    return;
                  }
                  await layoutStorage.saveLayout(
                    layoutSaveName,
                    roomWidth,
                    roomLength,
                    diningLayout,
                  );
                  toast({ title: "Layout saved" });
                }}
              >
                Save Layout
              </Button>
            </div>

            <EchoLayoutScene
              roomWidth={roomWidth}
              roomLength={roomLength}
              initialLayout={diningLayout}
              onLayoutChange={setDiningLayout}
              onSave={async (layout) => {
                if (!layoutSaveName) {
                  toast({
                    title: "Enter a name for the layout",
                    variant: "destructive",
                  });
                  return;
                }
                await layoutStorage.saveLayout(
                  layoutSaveName,
                  roomWidth,
                  roomLength,
                  layout,
                );
              }}
              aiParams={{
                roomType: "banquet",
                covers: Math.floor((roomWidth * roomLength) / 4),
              }}
            />
          </div>
        )}
      </div>

      {/* Floating Panels */}
      {panels.objects ? (
        <PanelWindow
          id="objects"
          title="Objects"
          initial={{ x: 84, y: 160 }}
          onClose={(id) => setPanels((s) => ({ ...s, [id]: false }))}
        >
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className="h-20"
              onClick={() => addObject("box")}
            >
              Box
            </Button>
            <Button
              variant="outline"
              className="h-20"
              onClick={() => addObject("cylinder")}
            >
              Cylinder
            </Button>
            <Button
              variant="outline"
              className="h-20"
              onClick={() => addObject("sphere")}
            >
              Sphere
            </Button>
          </div>
          <Separator className="my-3" />
          <div className="text-xs text-muted-foreground">
            Click to add to scene
          </div>
        </PanelWindow>
      ) : null}

      {panels.layers ? (
        <PanelWindow
          id="layers"
          title="Layers"
          initial={{ x: 84, y: 400 }}
          onClose={(id) => setPanels((s) => ({ ...s, [id]: false }))}
        >
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowGrid((v) => !v)}
              >
                <Grid3X3 className="h-4 w-4 mr-1" />
                {showGrid ? "Hide Grid" : "Show Grid"}
              </Button>
              <Badge variant="outline">{objects.length} objects</Badge>
            </div>
          </div>
        </PanelWindow>
      ) : null}

      {panels.properties && selected ? (
        <PanelWindow
          id="properties"
          title="Properties"
          initial={{ x: 440, y: 160 }}
          onClose={(id) => setPanels((s) => ({ ...s, [id]: false }))}
        >
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <Label className="text-xs">Type</Label>
              <div className="mt-1">{selected.type}</div>
            </div>
            <div>
              <Label className="text-xs">Color</Label>
              <Input
                type="color"
                defaultValue={selected.color || "#3b82f6"}
                onChange={(e) =>
                  setObjects((o) =>
                    o.map((obj) =>
                      obj.id === selected.id
                        ? { ...obj, color: e.target.value }
                        : obj,
                    ),
                  )
                }
              />
            </div>
            <div className="col-span-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={duplicateSelected}>
                <Copy className="h-4 w-4 mr-1" /> Duplicate
              </Button>
              <Button size="sm" variant="outline" onClick={deleteSelected}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </div>
          </div>
        </PanelWindow>
      ) : null}

      {panels.assistant ? (
        <PanelWindow
          id="assistant"
          title="AI Assistant"
          initial={{ x: 780, y: 160, w: 360 }}
          onClose={(id) => setPanels((s) => ({ ...s, [id]: false }))}
        >
          <AssistantPanel
            objects={objects}
            onAction={(key) => {
              if (key === "import-floor") fileRef.current?.click();
              else if (key === "add-seed") {
                addObject("box");
                addObject("sphere");
                addObject("cylinder");
              } else if (key === "toggle-grid") setShowGrid((v) => !v);
            }}
          />
        </PanelWindow>
      ) : null}
    </Layout>
  );
}
