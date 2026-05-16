import React, { useEffect, useRef, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  TransformControls,
  Grid,
  Html,
} from "@react-three/drei";
import * as THREE from "three";
import type { Database } from "../types/database";
type LayoutItem = Database["public"]["Tables"]["layout_items"]["Row"];
type Room = Database["public"]["Tables"]["rooms"]["Row"];
interface DiningRoom3DViewProps {
  room: Room | null;
  items: LayoutItem[];
  selectedIds: Set<string>;
  onItemSelect: (id: string) => void;
  onItemMove: (id: string, x: number, y: number, z: number) => void;
  readOnly?: boolean;
}
function RoomBox({ room }: { room: Room }) {
  const groupRef = useRef<THREE.Group>(null);
  const [wallsVisible, setWallsVisible] = useState(true);
  const width = room.width_ft || 50;
  const depth = room.depth_ft || 50;
  const height = room.height_ft || 12;
  const ftToMeter = 0.3048;
  return (
    <group ref={groupRef}>
      {" "}
      {/* Floor */}{" "}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        {" "}
        <planeGeometry args={[width * ftToMeter, depth * ftToMeter]} />{" "}
        <meshStandardMaterial color="#e8e8e8" side={THREE.DoubleSide} />{" "}
      </mesh>{" "}
      {/* Walls */}{" "}
      {wallsVisible && (
        <>
          {" "}
          {/* North wall */}{" "}
          <mesh
            position={[0, height * ftToMeter * 0.5, -depth * ftToMeter * 0.5]}
            castShadow
          >
            {" "}
            <boxGeometry
              args={[width * ftToMeter, height * ftToMeter, 0.1]}
            />{" "}
            <meshStandardMaterial color="#d0d0d0" />{" "}
          </mesh>{" "}
          {/* South wall */}{" "}
          <mesh
            position={[0, height * ftToMeter * 0.5, depth * ftToMeter * 0.5]}
            castShadow
          >
            {" "}
            <boxGeometry
              args={[width * ftToMeter, height * ftToMeter, 0.1]}
            />{" "}
            <meshStandardMaterial color="#d0d0d0" />{" "}
          </mesh>{" "}
          {/* East wall */}{" "}
          <mesh
            position={[width * ftToMeter * 0.5, height * ftToMeter * 0.5, 0]}
            castShadow
          >
            {" "}
            <boxGeometry
              args={[0.1, height * ftToMeter, depth * ftToMeter]}
            />{" "}
            <meshStandardMaterial color="#d0d0d0" />{" "}
          </mesh>{" "}
          {/* West wall */}{" "}
          <mesh
            position={[-width * ftToMeter * 0.5, height * ftToMeter * 0.5, 0]}
            castShadow
          >
            {" "}
            <boxGeometry
              args={[0.1, height * ftToMeter, depth * ftToMeter]}
            />{" "}
            <meshStandardMaterial color="#d0d0d0" />{" "}
          </mesh>{" "}
        </>
      )}{" "}
    </group>
  );
}
function Item3D({
  item,
  isSelected,
  onSelect,
  onMove,
  readOnly,
}: {
  item: LayoutItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number, z: number) => void;
  readOnly?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const controlsRef = useRef(null);
  const ftToMeter = 0.3048;
  const width = (item.width_ft || 3) * ftToMeter;
  const depth = (item.depth_ft || 3) * ftToMeter;
  const height = 0.9 * ftToMeter;
  const x = item.x_ft * ftToMeter;
  const y = height * 0.5;
  const z = item.y_ft * ftToMeter;
  const getColor = () => {
    if (item.color) return item.color;
    const typeColors: { [key: string]: string } = {
      round60: "#f59e0b",
      round72: "#f59e0b",
      rect8x30: "#8b5cf6",
      banquet: "#ec4899",
      booth: "#06b6d4",
      bar: "#ef4444",
      barstool: "#6366f1",
      twotop: "#10b981",
      fourtop: "#10b981",
      chair: "#64748b",
      stage: "#f97316",
      dancefloor: "#a855f7",
    };
    return typeColors[item.item_type] || "#3b82f6";
  };
  return (
    <TransformControls
      ref={controlsRef}
      mode="translate"
      onObjectChange={() => {
        if (!readOnly && groupRef.current) {
          const pos = groupRef.current.position;
          onMove(item.id, pos.x / ftToMeter, pos.z / ftToMeter, pos.y);
        }
      }}
      enabled={!readOnly}
    >
      {" "}
      <group
        ref={groupRef}
        position={[x, y, z]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(item.id);
        }}
      >
        {" "}
        <mesh ref={meshRef} castShadow receiveShadow>
          {" "}
          <boxGeometry args={[width, height, depth]} />{" "}
          <meshStandardMaterial
            color={getColor()}
            opacity={isSelected ? 0.9 : 0.7}
            transparent
            wireframe={false}
          />{" "}
        </mesh>{" "}
        {/* Selection outline */}{" "}
        {isSelected && (
          <lineSegments>
            {" "}
            <edgesGeometry
              attach="geometry"
              args={[new THREE.BoxGeometry(width, height, depth)]}
            />{" "}
            <lineBasicMaterial
              attach="material"
              color="#3b82f6"
              linewidth={2}
            />{" "}
          </lineSegments>
        )}{" "}
        {/* Label */}{" "}
        <Html
          position={[0, height * 0.6, 0]}
          scale={0.001}
          distanceFactor={1000}
        >
          {" "}
          <div className="px-2 py-1 bg-black/50 text-white text-xs rounded whitespace-nowrap pointer-events-none">
            {" "}
            {item.label || item.item_type}{" "}
            {item.seats ? ` (${item.seats} seats)` : ""}{" "}
          </div>{" "}
        </Html>{" "}
      </group>{" "}
    </TransformControls>
  );
}
function SceneContent({
  room,
  items,
  selectedIds,
  onItemSelect,
  onItemMove,
  readOnly,
}: Omit<DiningRoom3DViewProps, "room"> & { room: Room }) {
  const { camera } = useThree();
  useEffect(() => {
    if (room) {
      const width = room.width_ft || 50;
      const depth = room.depth_ft || 50;
      const ftToMeter = 0.3048;
      const maxDim = Math.max(width, depth) * ftToMeter;
      camera.position.set(maxDim * 0.6, maxDim * 0.5, maxDim * 0.6);
      camera.lookAt(0, 0, 0);
    }
  }, [room, camera]);
  return (
    <>
      {" "}
      <ambientLight intensity={0.6} />{" "}
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />{" "}
      <pointLight position={[-10, 10, -10]} intensity={0.4} />{" "}
      <Grid
        args={[100, 100]}
        cellSize={1}
        cellColor="#e0e0e0"
        sectionSize={10}
      />{" "}
      <RoomBox room={room} />{" "}
      {items.map((item) => (
        <Item3D
          key={item.id}
          item={item}
          isSelected={selectedIds.has(item.id)}
          onSelect={onItemSelect}
          onMove={onItemMove}
          readOnly={readOnly}
        />
      ))}{" "}
      <OrbitControls makeDefault />{" "}
    </>
  );
}
export function DiningRoom3DView({
  room,
  items,
  selectedIds,
  onItemSelect,
  onItemMove,
  readOnly,
}: DiningRoom3DViewProps) {
  if (!room) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
        {" "}
        Select a room to view in 3D{" "}
      </div>
    );
  }
  return (
    <Canvas
      style={{ width: "100%", height: "100%" }}
      camera={{ position: [15, 12, 15], near: 0.1, far: 1000 }}
      shadows
    >
      {" "}
      <color attach="background" args={["#f5f5f5"]} />{" "}
      <Suspense fallback={null}>
        {" "}
        <SceneContent
          room={room}
          items={items}
          selectedIds={selectedIds}
          onItemSelect={onItemSelect}
          onItemMove={onItemMove}
          readOnly={readOnly}
        />{" "}
      </Suspense>{" "}
    </Canvas>
  );
}
