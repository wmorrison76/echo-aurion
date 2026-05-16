import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { createWaterMesh } from "../lib/waterPhysics";
export default function WaterSurfacePro({
  scene,
  renderer,
}: {
  scene: THREE.Scene;
  renderer?: THREE.WebGLRenderer;
}) {
  const waterRef = useRef<ReturnType<typeof createWaterMesh> | null>(null);
  useEffect(() => {
    const water = createWaterMesh({ size: 20, resolution: 200, reflect: true });
    water.position.set(0, 0, 0);
    scene.add(water);
    waterRef.current = water;
    if (renderer) water.setupReflection(renderer, scene);
    let mounted = true;
    let last = performance.now();
    const loop = () => {
      if (!mounted) return;
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      water.tick(dt, renderer, scene);
      requestAnimationFrame(loop);
    };
    loop();
    return () => {
      mounted = false;
      scene.remove(water);
    };
  }, [scene, renderer]);
  return null;
}
