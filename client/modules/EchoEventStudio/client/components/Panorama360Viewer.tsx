import React, { useEffect, useRef, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
interface Panorama360ViewerProps {
  isOpen: boolean;
  onClose: () => void;
  sceneContent?: React.ReactNode;
  title?: string;
  fullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
}
function PanoramaCamera() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  useFrame(() => {
    if (controlsRef.current) {
      camera.position.copy(controlsRef.current.object.position);
    }
  });
  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      autoRotate
      autoRotateSpeed={2}
    />
  );
}
export function Panorama360Viewer({
  isOpen,
  onClose,
  sceneContent,
  title = "360° Panorama View",
  fullscreen = false,
  onFullscreenChange,
}: Panorama360ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(fullscreen);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const handleFullscreen = () => {
    const newState = !isFullscreen;
    setIsFullscreen(newState);
    onFullscreenChange?.(newState);
  };
  if (!isOpen) return null;
  return (
    <div
      className={cn(
        "fixed z-50 bg-black/95 flex flex-col",
        isFullscreen
          ? "inset-0"
          : "inset-4 rounded-lg border border-border shadow-2xl",
      )}
    >
      {" "}
      {/* Header */}{" "}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        {" "}
        <h3 className="text-lg font-semibold text-white">{title}</h3>{" "}
        <div className="flex items-center gap-2">
          {" "}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-background"
            onClick={handleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {" "}
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}{" "}
          </Button>{" "}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-background"
            onClick={onClose}
            title="Close"
          >
            {" "}
            <X className="w-5 h-5" />{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
      {/* Canvas Container */}{" "}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {" "}
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 2, 0], fov: 75 }}
          className="absolute inset-0"
        >
          {" "}
          {/* Lighting */} <ambientLight intensity={0.8} />{" "}
          <directionalLight position={[10, 15, 8]} castShadow intensity={1} />{" "}
          {/* Environment for realistic reflections */}{" "}
          <Environment preset="sunset" /> {/* Scene Content */}{" "}
          {sceneContent || <DefaultSceneContent />} {/* 360 Camera Controls */}{" "}
          <PanoramaCamera />{" "}
        </Canvas>{" "}
        {/* Instructions Overlay */}{" "}
        <div className="absolute bottom-4 left-4 right-4 text-xs text-gray-300 pointer-events-none">
          {" "}
          <div className="space-y-1">
            {" "}
            <p>💡 Drag to rotate • Scroll to zoom • Hold Shift to pan</p>{" "}
            <p>
              This is your 360° walkthrough view - explore the entire layout
            </p>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
function DefaultSceneContent() {
  return (
    <>
      {" "}
      {/* Floor */}{" "}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        {" "}
        <planeGeometry args={[20, 20]} />{" "}
        <meshStandardMaterial color="#f5f5f0" roughness={0.9} />{" "}
      </mesh>{" "}
      {/* Walls to create room ambiance */} {/* Back wall */}{" "}
      <mesh position={[0, 3, -10]} receiveShadow>
        {" "}
        <boxGeometry args={[20, 6, 0.1]} />{" "}
        <meshStandardMaterial color="#e8e8e8" roughness={0.7} />{" "}
      </mesh>{" "}
      {/* Left wall */}{" "}
      <mesh position={[-10, 3, 0]} receiveShadow>
        {" "}
        <boxGeometry args={[0.1, 6, 20]} />{" "}
        <meshStandardMaterial color="#f0f0f0" roughness={0.7} />{" "}
      </mesh>{" "}
      {/* Right wall */}{" "}
      <mesh position={[10, 3, 0]} receiveShadow>
        {" "}
        <boxGeometry args={[0.1, 6, 20]} />{" "}
        <meshStandardMaterial color="#f0f0f0" roughness={0.7} />{" "}
      </mesh>{" "}
      {/* Sample table for context */}{" "}
      <group position={[0, 0, 0]}>
        {" "}
        <mesh position={[0, 0.9, 0]} receiveShadow>
          {" "}
          <cylinderGeometry args={[1.6, 1.6, 0.08, 32]} />{" "}
          <meshStandardMaterial
            color="#d4af87"
            roughness={0.6}
            metalness={0.05}
          />{" "}
        </mesh>{" "}
        <mesh position={[0, 0.42, 0]} castShadow>
          {" "}
          <cylinderGeometry args={[0.12, 0.16, 0.85, 32]} />{" "}
          <meshStandardMaterial
            color="#4a4a4a"
            roughness={0.8}
            metalness={0.1}
          />{" "}
        </mesh>{" "}
      </group>{" "}
      {/* Ceiling with subtle pattern */}{" "}
      <mesh position={[0, 6, 0]} receiveShadow>
        {" "}
        <planeGeometry args={[20, 20]} />{" "}
        <meshStandardMaterial color="#f9f9f9" roughness={0.9} />{" "}
      </mesh>{" "}
    </>
  );
}
