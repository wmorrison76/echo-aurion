import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { Store } from "@/modules/PurchasingReceiving/client/lib/store";
import type { StorageArea, StorageRack } from "@shared/inventory";

const AREA_COLORS: Record<string, string> = {
  dry: "#fef3c7",
  cooler: "#bae6fd",
  freezer: "#dbeafe",
  cage: "#fecaca",
  bar: "#ddd6fe",
  custom: "#e2e8f0",
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

function AreaMesh({
  area,
  racks,
}: {
  area: StorageArea;
  racks: StorageRack[];
}) {
  const layout = area.layout ?? defaultAreaLayout();
  const centerX = layout.x + layout.width / 2;
  const centerZ = layout.y + layout.depth / 2;
  const floorColor = AREA_COLORS[area.type] ?? AREA_COLORS.custom;

  return (
    <group position={[centerX, 0, centerZ]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[layout.width, layout.depth]} />
        <meshStandardMaterial color={floorColor} />
      </mesh>
      <Html position={[0, 0.05, 0]}>
        <div className="text-xs font-semibold text-slate-700 bg-white/80 px-2 py-1 rounded">
          {area.name}
        </div>
      </Html>
      {racks.map((rack) => {
        const rackLayout = rack.layout ?? defaultRackLayout();
        const rackX = rackLayout.x - layout.width / 2 + rackLayout.width / 2;
        const rackZ = rackLayout.y - layout.depth / 2 + rackLayout.depth / 2;
        const rackY = rackLayout.height / 2;
        return (
          <group key={rack.id} position={[rackX, rackY, rackZ]}>
            <mesh>
              <boxGeometry
                args={[rackLayout.width, rackLayout.height, rackLayout.depth]}
              />
              <meshStandardMaterial color="#34d399" />
            </mesh>
            <Html position={[0, rackLayout.height / 2 + 0.05, 0]}>
              <div className="text-[10px] bg-white/80 px-1 rounded">
                {rack.name}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

export default function StorageWalkthrough3D({
  outletId,
}: {
  outletId: string;
}) {
  const areas = useMemo(() => {
    if (!outletId) return [];
    try {
      return Store.listStorageAreas(outletId) || [];
    } catch {
      return [];
    }
  }, [outletId]);
  const racksByArea = useMemo(() => {
    try {
      const racks = Store.listStorageRacks() || [];
      return racks.reduce<Record<string, StorageRack[]>>((acc, rack) => {
        if (rack?.areaId) {
          if (!acc[rack.areaId]) acc[rack.areaId] = [];
          acc[rack.areaId].push(rack);
        }
        return acc;
      }, {});
    } catch {
      return {};
    }
  }, [outletId]);

  if (!areas.length) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No storage areas yet. Use the designer to create rooms and racks.
      </div>
    );
  }

  return (
    <div className="h-[640px] w-full rounded-lg border">
      <Canvas camera={{ position: [10, 10, 10], fov: 55 }}>
        <ambientLight intensity={0.6} />
        <directionalLight intensity={0.8} position={[5, 10, 5]} />
        <Suspense fallback={null}>
          {areas.map((area) => (
            <AreaMesh
              key={area.id}
              area={area}
              racks={racksByArea[area.id] ?? []}
            />
          ))}
        </Suspense>
        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  );
}
