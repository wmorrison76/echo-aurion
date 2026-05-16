import React, { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import { Color, RepeatWrapping } from "three";
import { DesignData } from "./types";

interface ThreeCakeProps {
  design: DesignData;
  width?: number;
  height?: number;
}

const WHITE_TEXTURE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBg2cXxwAAAABJRU5ErkJggg==";

function CakeTiers({ design }: { design: DesignData }) {
  const hasGraphic = Boolean(design.graphicWrap?.url);
  const textureUrl = design.graphicWrap?.url || WHITE_TEXTURE;
  const texture = useTexture(textureUrl);

  useMemo(() => {
    if (!hasGraphic) return;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.needsUpdate = true;
  }, [hasGraphic, texture]);

  const tiers = design.tiers.length
    ? design.tiers
    : [{ diameter: 8, height: 4 }];
  const unitScale = 0.15;

  let currentHeight = 0;
  return (
    <group>
      {tiers.map((tier, index) => {
        const height = (tier.height || 4) * unitScale;
        const diameter = (tier.diameter || 8) * unitScale;
        const radius = diameter / 2;
        const y = currentHeight + height / 2;
        currentHeight += height + 0.02;

        const materialProps = {
          color: new Color(design.color || "#d4a373"),
          roughness: 0.6,
          metalness: 0.05,
          ...(hasGraphic
            ? {
                map: texture,
                transparent: true,
                opacity: design.graphicWrap?.opacity ?? 0.85,
              }
            : {}),
        };

        if (design.shape === "square" || design.shape === "sheet") {
          const width = (tier.width || tier.diameter || 8) * unitScale;
          const depth = (tier.depth || tier.diameter || 8) * unitScale;
          return (
            <mesh key={`tier-${index}`} position={[0, y, 0]}>
              <boxGeometry args={[width, height, depth]} />
              {/* @ts-expect-error - three material props */}
              <meshStandardMaterial {...materialProps} />
            </mesh>
          );
        }

        return (
          <mesh key={`tier-${index}`} position={[0, y, 0]}>
            <cylinderGeometry args={[radius, radius, height, 64, 1, true]} />
            {/* @ts-expect-error - three material props */}
            <meshStandardMaterial {...materialProps} />
            <mesh position={[0, height / 2, 0]}>
              <circleGeometry args={[radius, 64]} />
              {/* @ts-expect-error - three material props */}
              <meshStandardMaterial {...materialProps} />
            </mesh>
            <mesh position={[0, -height / 2, 0]} rotation={[Math.PI, 0, 0]}>
              <circleGeometry args={[radius, 64]} />
              {/* @ts-expect-error - three material props */}
              <meshStandardMaterial {...materialProps} />
            </mesh>
          </mesh>
        );
      })}
    </group>
  );
}

export default function ThreeCake({
  design,
  width = 400,
  height = 400,
}: ThreeCakeProps) {
  const background = useMemo(() => {
    switch (design.studioBg) {
      case "black":
        return "#0a0a0a";
      case "peach":
        return "#f7d5c2";
      case "soft":
        return "#f1f1f1";
      case "gradient":
        return "#f4f6ff";
      case "white":
      default:
        return "#ffffff";
    }
  }, [design.studioBg]);

  return (
    <div
      style={{ width, height }}
      className="border rounded-lg overflow-hidden bg-white"
    >
      <Canvas
        camera={{ position: [0, 1.4, 2.4], fov: 40 }}
        style={{ background }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 3, 2]} intensity={0.8} />
        <pointLight position={[-2, 2, -2]} intensity={0.3} />
        <Suspense fallback={null}>
          <CakeTiers design={design} />
        </Suspense>
        <OrbitControls enablePan={false} enableZoom={true} />
      </Canvas>
    </div>
  );
}
