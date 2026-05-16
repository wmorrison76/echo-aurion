import React, { Suspense, useMemo } from "react";
import Layout from "@/components/Layout";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Stats } from "@react-three/drei";
import { useSearchParams } from "react-router-dom";
import type { Item } from "@/pages/Planner";
import * as THREE from "three";
function deserialize(str: string | null): { items: Item[] } | null {
  if (!str) return null;
  try {
    const raw = JSON.parse(str);
    return { items: Array.isArray(raw.items) ? raw.items : [] };
  } catch {
    return null;
  }
}
function Table3D({ item }: { item: Item }) {
  const isRound = item.type.startsWith("round") || item.type === "cocktail30";
  const color = item.color || "#8b5cf6";
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
export default function StudioWalk() {
  const [sp] = useSearchParams();
  const id = sp.get("layoutId");
  const panoKey = sp.get("panoKey");
  const state = useMemo(() => {
    if (id)
      return (
        deserialize(localStorage.getItem(`layout-${id}`)) ||
        deserialize(localStorage.getItem("planner-lite-state"))
      );
    return deserialize(localStorage.getItem("planner-lite-state"));
  }, [id]);
  const items = state?.items || [];
  function Skybox() {
    const { scene } = useThree();
    const key = panoKey;
    if (!key) return null;
    const url = localStorage.getItem(`pano-${key}`);
    if (!url) return null;
    const tex = new THREE.TextureLoader().load(url, (t) => {
      t.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = t;
    });
    return null;
  }
  return (
    <Layout>
      {" "}
      <div className="h-[calc(100vh-4rem)]">
        {" "}
        <Canvas shadows camera={{ position: [6, 6, 6], fov: 50 }}>
          {" "}
          <Skybox /> <ambientLight intensity={0.6} />{" "}
          <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />{" "}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            {" "}
            <planeGeometry args={[100, 100]} />{" "}
            <meshStandardMaterial color="#f3f4f6" />{" "}
          </mesh>{" "}
          {items.map((it) =>
            it.type === "chair" ? (
              <Chair3D key={it.id} item={it} />
            ) : (
              <Table3D key={it.id} item={it} />
            ),
          )}{" "}
          <OrbitControls makeDefault /> <Stats />{" "}
        </Canvas>{" "}
      </div>{" "}
    </Layout>
  );
}
