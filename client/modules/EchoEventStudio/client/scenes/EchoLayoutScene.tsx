import React from "react";
import { Canvas } from "@react-three/fiber";
import {
  Grid,
  Html,
  OrbitControls,
  TransformControls,
} from "@react-three/drei";
import * as THREE from "three";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

import { announceLayout, announceSelection } from "@/hooks/useEchoLayoutBus";
import { EQUIPMENT, type EquipmentKey } from "@/lib/equipment";

import {
  createBanquetChair,
  createBuffetStation,
  createCocktailTable,
  createDanceFloor,
  createPodium,
  createRectTable,
  createRoundTable,
} from "./models";

export type LayoutObjectType =
  | "table_round"
  | "table_rect"
  | "buffet"
  | "cocktail"
  | "podium"
  | "dance_floor"
  | "station"
  | "equipment";

export interface EchoLayoutObject {
  id: string;
  type: LayoutObjectType;
  position: [number, number, number];
  rotation?: [number, number, number];
  seats?: number;
  zone?: string;
  glCode?: string;
  costCenter?: string;
  dimensions?: { width?: number; length?: number };
  size?: [number, number, number];
  meta?: { equipment?: EquipmentKey; color?: string };
}

export interface EchoLayoutSceneProps {
  roomWidth?: number;
  roomLength?: number;
  initialLayout?: EchoLayoutObject[];
  onSelectionChange?: (id: string | null) => void;
  onLayoutChange?: (layout: EchoLayoutObject[]) => void;
  aiParams?: {
    roomType?: string;
    covers?: number;
    flowPreference?: string;
    theme?: string;
  };
  onSave?: (layout: EchoLayoutObject[]) => Promise<void>;
  readOnly?: boolean;
  presenterLocked?: boolean;
  snap?: { grid?: boolean; angle?: boolean; object?: boolean };
  onApplyNumeric?: (patch: {
    x?: number;
    y?: number;
    z?: number;
    rx?: number;
    ry?: number;
    rz?: number;
  }) => void;
  onCreated?: (context: { camera: any; controls: any }) => void;
}

function summarizeLayout(layout: EchoLayoutObject[]) {
  return {
    tables: layout.filter(
      (o) => o.type === "table_round" || o.type === "table_rect",
    ).length,
    seats: layout.reduce((acc, o) => acc + (o.seats ?? 0), 0),
    buffets: layout.filter((o) => o.type === "buffet").length,
    objects: layout.length,
  };
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function modelFor(obj: EchoLayoutObject): THREE.Group {
  switch (obj.type) {
    case "table_round":
      return createRoundTable({ scale: 1 });
    case "table_rect":
      return createRectTable({ scale: 1, seats: obj.seats });
    case "buffet":
      return createBuffetStation({
        scale: 1,
        length: obj.dimensions?.length ?? 3,
      });
    case "cocktail":
      return createCocktailTable({ scale: 1 });
    case "podium":
      return createPodium({ scale: 1 });
    case "dance_floor":
      return createDanceFloor({
        scale: 1,
        width: obj.dimensions?.width ?? 4,
        length: obj.dimensions?.length ?? 4,
      });
    case "equipment":
    case "station": {
      if (obj.size) {
        const group = new THREE.Group();
        const geo = new THREE.BoxGeometry(
          obj.size[0],
          obj.size[1],
          obj.size[2],
        );
        const mat = new THREE.MeshStandardMaterial({
          color: obj.meta?.color ?? "#9aa6b2",
          metalness: 0.08,
          roughness: 0.7,
        });
        const box = new THREE.Mesh(geo, mat);
        box.castShadow = true;
        box.receiveShadow = true;
        group.add(box);
        return group;
      }
      return createBanquetChair({ scale: 1 });
    }
    default:
      return createBanquetChair({ scale: 1 });
  }
}

function ObjectMesh({
  obj,
  selected,
  onSelect,
  onUpdate,
  readOnly,
  presenterLocked,
}: {
  obj: EchoLayoutObject;
  selected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (
    id: string,
    pos: [number, number, number],
    rot: [number, number, number],
  ) => void;
  readOnly?: boolean;
  presenterLocked?: boolean;
}) {
  const groupRef = React.useRef<THREE.Group | null>(null);
  const [model, setModel] = React.useState<THREE.Group | null>(null);

  React.useEffect(() => {
    setModel(modelFor(obj));
  }, [obj]);

  const content = (
    <group
      ref={groupRef}
      position={obj.position as any}
      rotation={obj.rotation as any}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(obj.id);
      }}
    >
      {model ? <primitive object={model} /> : null}
    </group>
  );

  if (selected && !readOnly && !presenterLocked) {
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
  }

  return content;
}

export default function EchoLayoutScene({
  roomWidth = 24,
  roomLength = 36,
  initialLayout,
  onSelectionChange,
  onLayoutChange,
  aiParams,
  onSave,
  readOnly = false,
  presenterLocked = false,
}: EchoLayoutSceneProps) {
  const [objects, setObjects] = React.useState<EchoLayoutObject[]>(
    () =>
      initialLayout ?? [
        {
          id: makeId("table_round"),
          type: "table_round",
          position: [0, 0.4, 0],
          rotation: [0, 0, 0],
          seats: aiParams?.covers
            ? Math.min(10, Math.max(6, Math.round(aiParams.covers / 20)))
            : 8,
          glCode: "4000-FOH",
          costCenter: "DiningRoom",
        },
      ],
  );
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const stats = React.useMemo(() => summarizeLayout(objects), [objects]);

  React.useEffect(() => {
    onSelectionChange?.(selectedId);
    announceSelection(selectedId);
  }, [onSelectionChange, selectedId]);

  React.useEffect(() => {
    onLayoutChange?.(objects);
    announceLayout(objects);
  }, [objects, onLayoutChange]);

  const handleUpdateObject = React.useCallback(
    (
      id: string,
      pos: [number, number, number],
      rot: [number, number, number],
    ) => {
      setObjects((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, position: pos, rotation: rot } : o,
        ),
      );
    },
    [],
  );

  const addEquipment = React.useCallback((key: EquipmentKey) => {
    const spec = EQUIPMENT[key];
    const newObj: EchoLayoutObject = {
      id: makeId(key),
      type: "equipment",
      position: [0, spec.size[1] / 2, 0],
      rotation: [0, 0, 0],
      size: spec.size,
      glCode: spec.glCode,
      costCenter: spec.costCenter,
      meta: { equipment: key, color: spec.color },
    };
    setObjects((prev) => [...prev, newObj]);
    toast({ title: `Placed ${spec.name}` });
  }, []);

  const handleSave = React.useCallback(async () => {
    if (!onSave) {
      toast({ title: "No save handler provided" });
      return;
    }
    setSaving(true);
    try {
      await onSave(objects);
      toast({ title: "Layout saved successfully" });
    } catch (err) {
      toast({
        title: "Error saving layout",
        description: err instanceof Error ? err.message : "Failed to save",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [objects, onSave]);

  const resetLayout = React.useCallback(() => {
    setObjects(initialLayout ?? []);
    setSelectedId(null);
  }, [initialLayout]);

  return (
    <div className="relative w-full h-full bg-background">
      <div className="pointer-events-auto absolute right-4 top-4 z-50 flex flex-col gap-2">
        <Card className="backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Room Layout</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="secondary">{stats.tables} tables</Badge>
            <Badge variant="secondary">{stats.seats} seats</Badge>
            <Badge variant="secondary">{stats.buffets} buffets</Badge>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setObjects((prev) => [
                ...prev,
                {
                  id: makeId("table_round"),
                  type: "table_round",
                  position: [0, 0.4, 0],
                  rotation: [0, 0, 0],
                  seats: 8,
                  glCode: "4000-FOH",
                  costCenter: "DiningRoom",
                },
              ])
            }
          >
            Add Round Table
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setObjects((prev) => [
                ...prev,
                {
                  id: makeId("buffet"),
                  type: "buffet",
                  position: [2, 0.9, 2],
                  rotation: [0, 0, 0],
                  glCode: "4010-BUFFET",
                  costCenter: "Operations",
                  dimensions: { length: 3 },
                },
              ])
            }
          >
            Add Buffet
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => addEquipment("uplighting" as EquipmentKey)}
          >
            Place Uplighting
          </Button>

          {onSave ? (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={resetLayout}>
            Reset
          </Button>
        </div>
      </div>

      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        camera={{
          fov: 45,
          position: [roomWidth / 2, roomWidth, roomLength / 2 + 5],
        }}
        className="absolute inset-0"
      >
        <React.Suspense fallback={<Html center>Loading…</Html>}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 15, 8]} castShadow intensity={0.7} />

          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[roomWidth, roomLength]} />
            <meshStandardMaterial color="#1a1d22" roughness={1} metalness={0} />
          </mesh>

          <Grid
            args={[roomWidth, roomLength]}
            cellSize={1}
            cellThickness={0.3}
            sectionSize={4}
            sectionThickness={0.6}
            fadeDistance={60}
            fadeStrength={1}
            infiniteGrid={false}
            position={[0, 0.01, 0]}
          />

          {objects.map((obj) => (
            <ObjectMesh
              key={obj.id}
              obj={obj}
              selected={selectedId === obj.id}
              onSelect={setSelectedId}
              onUpdate={handleUpdateObject}
              readOnly={readOnly}
              presenterLocked={presenterLocked}
            />
          ))}

          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.08}
            minDistance={4}
            maxDistance={80}
          />
        </React.Suspense>
      </Canvas>
    </div>
  );
}
