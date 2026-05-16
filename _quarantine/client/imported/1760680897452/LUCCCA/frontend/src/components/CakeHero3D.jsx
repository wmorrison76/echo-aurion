// src/components/CakeHero3D.jsx
import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  OrbitControls,
  ContactShadows,
  AccumulativeShadows,
  RandomizedLight,
} from "@react-three/drei";
import * as THREE from "three";

/* ------------ tiny procedural roughness for frosting ------------- */
function useNoiseTexture(size = 256) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const img = g.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 205 + Math.random() * 40; // soft speckle
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3);
    return t;
  }, []);
}

/* ------------ sizing helpers ------------- */
// fallback pan from guests (round); world units ~= decimeters
function baseFromGuests(guests = 80, shape = "round") {
  if (shape === "sheet") {
    if (guests <= 30) return { w: 33, d: 23 }; // cm
    if (guests <= 60) return { w: 45, d: 30 };
    if (guests <= 120) return { w: 60, d: 40 };
    return { w: 75, d: 50 };
  }
  if (guests <= 30) return { dia: 15 };
  if (guests <= 60) return { dia: 20 };
  if (guests <= 100) return { dia: 25 };
  if (guests <= 160) return { dia: 30 };
  if (guests <= 220) return { dia: 35 };
  return { dia: 40 };
}

// map flavors → gentle color tints (icing or crumb)
function tintFromFlavor(flavor = "", fallback = "#f4efe6") {
  const f = (flavor || "").toLowerCase();
  if (f.includes("vanilla") || f.includes("white"))      return "#f4efe6";
  if (f.includes("buttercream") || f.includes("ivory"))  return "#f3efe4";
  if (f.includes("chocolate"))                            return "#d7b79b";
  if (f.includes("red velvet"))                           return "#d9a7a7";
  if (f.includes("lemon"))                                return "#ffe39f";
  if (f.includes("straw") || f.includes("rasp"))          return "#f3c8d6";
  if (f.includes("blue") || f.includes("berry"))          return "#cfe0ff";
  return fallback;
}

/* ------------ small rise-in animation ------------- */
function RiseIn({ delay = 0, from = -1, to = 0, children }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    const t = Math.max(0, clock.getElapsedTime() - delay);
    const k = Math.min(1, t / 0.55);
    const y = from + (to - from) * (1 - Math.pow(1 - k, 3));
    if (ref.current) ref.current.position.y = y;
  });
  return <group ref={ref} position-y={from}>{children}</group>;
}

/* ------------ Tier primitives (round/sheet) ------------- */
function SlabRound({ r, h, color, roughnessMap }) {
  return (
    <mesh castShadow receiveShadow>
      <cylinderGeometry args={[r, r, h, 96, 1, false]} />
      <meshPhysicalMaterial
        color={color}
        roughness={0.58}
        clearcoat={0.8}
        clearcoatRoughness={0.22}
        sheen={1}
        roughnessMap={roughnessMap}
      />
    </mesh>
  );
}

function SlabSheet({ w, d, h, color, roughnessMap }) {
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshPhysicalMaterial
        color={color}
        roughness={0.58}
        clearcoat={0.8}
        clearcoatRoughness={0.22}
        sheen={1}
        roughnessMap={roughnessMap}
      />
    </mesh>
  );
}

/* ------------ Main component ------------- */
export default function CakeHero3D({
  layers = [],             // bottom → top; each { type: 'cake'|'filling', heightIn, flavor, icing }
  guests = 80,
  shape = "round",         // "round" | "sheet"
  occasion = "Preview",
  unitsPerInch = 0.55,     // scene height units per real inch
  animateAssembly = true,
  showTopPiping = true,
}) {
  // micro-roughness for frosting look
  const noise = useNoiseTexture();

  // Base footprint (convert cm → ~dm world)
  const base = baseFromGuests(guests, shape);
  const r =
    shape === "round"
      ? ((base.dia || 25) / 10) * 0.9       // radius (~dm), a little inset to leave plate margin
      : null;
  const w =
    shape === "sheet" ? ((base.w || 45) / 10) * 0.9 : null;
  const d =
    shape === "sheet" ? ((base.d || 30) / 10) * 0.9 : null;

  // Build placed slabs from incoming layers using heightIn
  const placed = useMemo(() => {
    let y = 0;
    const out = [];
    const rows = layers.filter(l => l.type === "cake" || l.type === "filling");
    rows.forEach((L, i) => {
      const hIn = (typeof L.heightIn === "number" ? L.heightIn : (L.type === "cake" ? 1.0 : 0.25));
      const h = Math.max(0.04, hIn * unitsPerInch);
      const color =
        L.type === "filling"
          ? tintFromFlavor(L.flavor || L.icing || "filling", "#fff4ea")
          : tintFromFlavor(L.icing || L.flavor || "cake", "#f4efe6");

      const item = {
        kind: L.type, // 'cake' | 'filling'
        y: y + h / 2,
        h,
        color,
        delay: i * 0.18,
      };
      out.push(item);
      y += h;
    });
    return { list: out, totalH: y };
  }, [layers, unitsPerInch]);

  const centerOffset = placed.totalH / 2;           // to vertically center in camera
  const plateY = -centerOffset - 0.28;

  return (
    <div className="w-full h-full">
      <Canvas shadows camera={{ position: [3.8, 2.9, 5.7], fov: 42 }}>
        <color attach="background" args={["#0f172a"]} />
        <ambientLight intensity={0.6} />

        {/* soft global shadowing */}
        <AccumulativeShadows temporal frames={80} alphaTest={0.85} scale={10} position={[0, plateY + 0.35, 0]}>
          <RandomizedLight amount={8} radius={4} intensity={1.2} ambient={0.6} position={[2, 5, 2]} />
        </AccumulativeShadows>

        {/* plate / board */}
        {shape === "round" ? (
          <mesh position={[0, plateY, 0]} receiveShadow>
            <cylinderGeometry args={[((base.dia || 25) / 10) * 1.35, ((base.dia || 25) / 10) * 1.35, 0.22, 64]} />
            <meshStandardMaterial color="#bcc2cc" metalness={0.12} roughness={0.42} />
          </mesh>
        ) : (
          <mesh position={[0, plateY, 0]} receiveShadow>
            <boxGeometry args={[((base.w || 45) / 10) * 1.35, 0.22, ((base.d || 30) / 10) * 1.35]} />
            <meshStandardMaterial color="#bcc2cc" metalness={0.12} roughness={0.42} />
          </mesh>
        )}

        {/* stack all slabs into a single tier */}
        {placed.list.map((p, i) => {
          const posY = p.y - centerOffset;
          const content =
            shape === "sheet" ? (
              <SlabSheet w={w} d={d} h={p.h} color={p.color} roughnessMap={noise} />
            ) : (
              <SlabRound r={r} h={p.h} color={p.color} roughnessMap={noise} />
            );

          return animateAssembly ? (
            <RiseIn key={i} delay={p.delay} from={-centerOffset - 1.0} to={posY}>
              {content}
            </RiseIn>
          ) : (
            <group key={i} position-y={posY}>
              {content}
            </group>
          );
        })}

        {/* optional soft top piping ring */}
        {showTopPiping && placed.list.length > 0 && shape === "round" && (
          <mesh position={[0, placed.list.at(-1).y - centerOffset + placed.list.at(-1).h / 2 + 0.02, 0]} castShadow>
            <torusGeometry args={[r * 0.92, 0.04, 24, 96]} />
            <meshPhysicalMaterial color={tintFromFlavor("buttercream-ivory")} roughness={0.5} clearcoat={0.75} />
          </mesh>
        )}

        <ContactShadows opacity={0.5} blur={2.5} far={6} resolution={1024} position={[0, plateY, 0]} />
        <Environment preset="studio" />
        <OrbitControls enablePan={false} minPolarAngle={0.9} maxPolarAngle={1.4} />
      </Canvas>

      <div className="mt-2 text-center">
        <div className="font-medium">{occasion} Preview</div>
        <div className="text-xs opacity-70">
          {layers.length} steps • ~{guests} guests • {shape === "sheet" ? "Sheet" : "Round"}
        </div>
      </div>
    </div>
  );
}
