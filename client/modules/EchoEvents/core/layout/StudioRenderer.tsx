import React, { useEffect, useRef } from "react";
import * as THREE from "three";
export interface StudioRendererProps {
  onReady?: (
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
  ) => void;
  height?: number;
  className?: string;
}
export function StudioRenderer({
  onReady,
  height = 500,
  className,
}: StudioRendererProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }
    const scene = new THREE.Scene();
    scene.background = null;
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(4, 4, 6);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);
    const ambient = new THREE.AmbientLight("#ffffff", 0.6);
    const key = new THREE.DirectionalLight("#ffffff", 0.8);
    key.position.set(5, 10, 7);
    key.castShadow = true;
    scene.add(ambient);
    scene.add(key);
    onReady?.(scene, camera, renderer);
    let animationFrameId = 0;
    const renderLoop = () => {
      animationFrameId = requestAnimationFrame(renderLoop);
      renderer.render(scene, camera);
    };
    renderLoop();
    const handleResize = () => {
      if (!mount) {
        return;
      }
      const width = mount.clientWidth || 800;
      const adjustedHeight = mount.clientHeight || height;
      renderer.setSize(width, adjustedHeight);
      camera.aspect = width / adjustedHeight;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mount);
    handleResize();
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss?.();
      }
      rendererRef.current = null;
      mount.removeChild(renderer.domElement);
    };
  }, [onReady, height]);
  return (
    <div
      ref={mountRef}
      className={className}
      style={{ width: "100%", height }}
    />
  );
}
export default StudioRenderer;
