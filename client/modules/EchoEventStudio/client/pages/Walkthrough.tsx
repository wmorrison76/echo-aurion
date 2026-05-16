import React, { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Canvas } from "@react-three/fiber";
import { FirstPersonControls, OrbitControls, Stats } from "@react-three/drei";
import { useParams } from "react-router-dom";
import type { Item } from "@/pages/Planner";
import * as THREE from "three";
import { decodeSharePayloadFromHash } from "@/utils/shareLink";
import { Button } from "@/components/ui/button";
function Table3D({ item, highlight }: { item: Item; highlight?: boolean }) {
  const isRound = item.type.startsWith("round") || item.type === "cocktail30";
  const color = highlight ? "#22c55e" : item.color || "#8b5cf6";
  const height = 0.75; // meters const radius = (item.width * 0.3048) / 2; // ft->m const w = item.width * 0.3048; const h = item.height * 0.3048; return isRound ? ( <mesh rotation={[-Math.PI / 2, 0, 0]} position={[item.x * 0.3048, 0, item.y * 0.3048]} > <cylinderGeometry args={[radius, radius, height, 24]} /> <meshStandardMaterial color={color} opacity={0.6} transparent /> </mesh> ) : ( <mesh position={[item.x * 0.3048, height / 2, item.y * 0.3048]} rotation={[0, (item.rotation * Math.PI) / 180, 0]} > <boxGeometry args={[w, height, h]} /> <meshStandardMaterial color={color} opacity={0.6} transparent /> </mesh> );
}
function Chair3D({ item }: { item: Item }) {
  const size = 0.5;
  return (
    <mesh position={[item.x * 0.3048, size / 2, item.y * 0.3048]}>
      {" "}
      <boxGeometry args={[size, size, size]} />{" "}
      <meshStandardMaterial color="#111827" />{" "}
    </mesh>
  );
}
export default function Walkthrough() {
  const [mode, setMode] = useState<"orbit" | "fps">("orbit");
  const [theme, setTheme] = useState<"apple" | "tron">("apple");
  const [data, setData] = useState<any | null>(null);
  useEffect(() => {
    const hashData = decodeSharePayloadFromHash(location.hash);
    if (hashData) {
      setData(hashData);
      return;
    }
    const m = location.pathname.match(/\/walkthrough\/?([^?#/]+)/);
    const sceneId = m?.[1];
    if (sceneId) {
      fetch(`/api/scenes/${sceneId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j) setData(j);
        });
    }
  }, []);
  const items: Item[] = useMemo(() => data?.items ?? [], [data]);
  const seatCount = useMemo(
    () =>
      items.reduce((n, i) => n + (i.type === "chair" ? 1 : i.seats || 0), 0),
    [items],
  );
  const hi = useMemo(() => new URLSearchParams(location.search).get("hi"), []);
  const cam = data?.camera ?? {
    position: [6, 6, 6],
    target: [0, 0, 0],
    fov: 50,
  };
  return (
    <Layout>
      {" "}
      <div className="h-[calc(100vh-4rem)] relative">
        {" "}
        <Canvas shadows camera={{ position: cam.position, fov: cam.fov }}>
          {" "}
          <ambientLight intensity={theme === "apple" ? 0.6 : 0.3} />{" "}
          <directionalLight
            position={[5, 10, 5]}
            intensity={theme === "apple" ? 0.8 : 1.2}
            castShadow
            color={theme === "apple" ? "#ffffff" : "#67e8f9"}
          />{" "}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            {" "}
            <planeGeometry args={[100, 100]} />{" "}
            <meshStandardMaterial
              color={theme === "apple" ? "#f3f4f6" : "#0f172a"}
            />{" "}
          </mesh>{" "}
          {items.map((it) =>
            it.type === "chair" ? (
              <Chair3D key={it.id} item={it} />
            ) : (
              <Table3D key={it.id} item={it} highlight={hi === it.id} />
            ),
          )}{" "}
          {mode === "orbit" ? (
            <OrbitControls
              makeDefault
              target={
                new THREE.Vector3(...(cam.target as [number, number, number]))
              }
            />
          ) : (
            <FirstPersonControls lookSpeed={0.06} movementSpeed={5} />
          )}{" "}
          <Stats />{" "}
        </Canvas>{" "}
        <div className="absolute top-2 left-2 bg-background/80 backdrop-blur border rounded-md px-2 py-1 text-xs space-x-2 flex items-center">
          {" "}
          <span className="font-medium">
            {" "}
            {data?.meta?.eventName || "Walkthrough"}{" "}
          </span>{" "}
          <span>
            {" "}
            • {new Date(data?.meta?.ts || Date.now()).toLocaleString()}{" "}
          </span>{" "}
          <span>• Seats: {seatCount}</span>{" "}
        </div>{" "}
        <div className="absolute top-2 right-2 flex gap-2">
          {" "}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setMode((m) => (m === "orbit" ? "fps" : "orbit"))}
          >
            {" "}
            {mode === "orbit" ? "First Person" : "Orbit"}{" "}
          </Button>{" "}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setTheme((t) => (t === "apple" ? "tron" : "apple"))}
          >
            {" "}
            {theme === "apple" ? "TRON" : "Apple"}{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
    </Layout>
  );
}
