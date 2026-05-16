import React, { useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { CAMERA_PRESETS, applyCameraPreset } from "@/lib/camera";
export type ViewPreset = "top" | "front" | "right" | "persp";
export interface ViewCubeOverlayProps {
  onView?: (preset: ViewPreset) => void;
}
export function ViewCubeOverlay({ onView }: ViewCubeOverlayProps) {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null!);
  const setView = (preset: ViewPreset) => {
    if (onView) {
      onView(preset);
    } else {
      const preset_data = CAMERA_PRESETS[preset];
      applyCameraPreset({ camera, controls: null }, preset_data);
    }
  };
  const views = [
    { label: "Top", preset: "top" as ViewPreset },
    { label: "Front", preset: "front" as ViewPreset },
    { label: "Right", preset: "right" as ViewPreset },
    { label: "Persp", preset: "persp" as ViewPreset },
  ];
  return (
    <group position={[-3.5, 3.5, -3.5]} ref={group}>
      {" "}
      {views.map((view, i) => {
        const positions: Record<number, [number, number, number]> = {
          0: [0, 0.8, 0],
          1: [0, -0.8, 0],
          2: [0.8, 0, 0],
          3: [-0.8, 0, 0],
        };
        const pos = positions[i] || [0, 0, 0];
        return (
          <mesh
            key={view.preset}
            position={pos}
            onPointerDown={(e) => {
              e.stopPropagation();
              setView(view.preset);
            }}
          >
            {" "}
            <boxGeometry args={[0.45, 0.45, 0.45]} />{" "}
            <meshStandardMaterial color="#9aa6b2" />{" "}
            <Html
              center
              className="text-[10px] font-medium pointer-events-none"
            >
              {" "}
              {view.label}{" "}
            </Html>{" "}
          </mesh>
        );
      })}{" "}
    </group>
  );
}
