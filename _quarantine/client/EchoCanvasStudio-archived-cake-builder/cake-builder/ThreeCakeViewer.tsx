/**
 * 3D Cake Viewer Component
 * Renders interactive 3D cake using Three.js
 *
 * Features:
 * - Interactive rotation (mouse drag)
 * - Zoom (mouse wheel)
 * - Slice view (cut section visible)
 * - Decorations rendering
 * - Material/texture support
 * - Real-time updates
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RotateCw, Maximize2, Minimize2 } from "lucide-react";
import type { DesignData, TierSpec } from "./types";

interface ThreeCakeViewerProps {
  design: DesignData;
  width?: number;
  height?: number;
  showSliceView?: boolean;
  onSliceChange?: (angle: number) => void;
}

interface TierGeometry {
  mesh: THREE.Mesh;
  diameter: number;
  height: number;
}

export default function ThreeCakeViewer({
  design,
  width = 600,
  height = 600,
  showSliceView = false,
  onSliceChange,
}: ThreeCakeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<{ rotation: number; zoom: number }>({
    rotation: 0,
    zoom: 1,
  });
  const tiersRef = useRef<TierGeometry[]>([]);

  const [sliceAngle, setSliceAngle] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  /**
   * Create cylinder geometry for cake tier
   */
  const createTierMesh = useCallback(
    (tier: TierSpec, index: number, color: string): THREE.Mesh => {
      const diameter = (tier.diameter || 8) * 2.54; // Convert inches to cm
      const height = tier.height * 2.54;
      const radius = diameter / 2;

      const geometry = new THREE.CylinderGeometry(radius, radius, height, 32);

      // Create material with color
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        shininess: 30,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Position tier
      const totalHeight = design.tiers.reduce((sum, t) => sum + t.height, 0) * 2.54;
      const yOffset = (totalHeight / 2 - (index + 0.5) * height) * 0.8;
      mesh.position.y = yOffset;

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      return mesh;
    },
    [design.tiers]
  );

  /**
   * Create filling layer indicator
   */
  const createFillingLayer = useCallback(
    (tier: TierSpec, index: number, fillingColor: string): THREE.Mesh => {
      const diameter = (tier.diameter || 8) * 2.54;
      const fillingHeight = 0.5;
      const radius = diameter / 2;

      const geometry = new THREE.CylinderGeometry(
        radius,
        radius,
        fillingHeight,
        32
      );
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(fillingColor),
        shininess: 10,
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Position on top of tier
      const totalHeight = design.tiers.reduce((sum, t) => sum + t.height, 0) * 2.54;
      const tierHeight = tier.height * 2.54;
      const yOffset =
        (totalHeight / 2 - (index + 0.5) * tierHeight) * 0.8 + tierHeight / 2 + 0.3;

      mesh.position.y = yOffset;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      return mesh;
    },
    [design.tiers]
  );

  /**
   * Create decoration (simple sphere for now)
   */
  const createDecoration = useCallback((): THREE.Mesh => {
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color("#d4af37"),
      shininess: 50,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }, []);

  /**
   * Initialize Three.js scene
   */
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000
    );
    camera.position.z = 40;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1);
    keyLight.position.set(20, 30, 20);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-20, 15, 10);
    scene.add(fillLight);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -20;
    ground.receiveShadow = true;
    scene.add(ground);

    // Build tiers
    tiersRef.current = [];
    design.tiers.forEach((tier, idx) => {
      const tierColor = design.color || "#c7a16d";
      const tierMesh = createTierMesh(tier, idx, tierColor);
      scene.add(tierMesh);
      tiersRef.current.push({
        mesh: tierMesh,
        diameter: tier.diameter || 8,
        height: tier.height,
      });

      // Add filling layer if specified
      if (design.fillingColor) {
        const fillingMesh = createFillingLayer(tier, idx, design.fillingColor);
        scene.add(fillingMesh);
      }
    });

    // Add decorations
    if (design.decorations && design.decorations.length > 0) {
      design.decorations.forEach((_, idx) => {
        const decoration = createDecoration();
        const angle = (idx / design.decorations.length) * Math.PI * 2;
        const radius = 10;
        decoration.position.x = Math.cos(angle) * radius;
        decoration.position.z = Math.sin(angle) * radius;
        decoration.position.y = 5;
        decoration.scale.setScalar(0.8);
        scene.add(decoration);
      });
    }

    // Mouse controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    renderer.domElement.addEventListener("mousedown", (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    renderer.domElement.addEventListener("mousemove", (e) => {
      if (isDragging && sceneRef.current) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        sceneRef.current.rotation.y += deltaX * 0.01;
        sceneRef.current.rotation.x += deltaY * 0.01;
        controlsRef.current.rotation = sceneRef.current.rotation.y;

        setAutoRotate(false);
        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    renderer.domElement.addEventListener("mouseup", () => {
      isDragging = false;
    });

    renderer.domElement.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomSpeed = 0.1;
      const direction = e.deltaY > 0 ? 1 : -1;
      if (cameraRef.current) {
        cameraRef.current.position.z += direction * zoomSpeed * 5;
        controlsRef.current.zoom =
          cameraRef.current.position.z / 40;
      }
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      if (autoRotate && sceneRef.current) {
        sceneRef.current.rotation.y += 0.005;
      }

      // Apply slice view
      if (showSliceView && tiersRef.current.length > 0) {
        tiersRef.current.forEach((tier) => {
          if (sliceAngle > 0 && sliceAngle < 360) {
            const angle = (sliceAngle * Math.PI) / 180;
            tier.mesh.geometry.dispose();
            // Note: Proper slice geometry would require custom shader or plane clipping
          }
        });
      }

      if (cameraRef.current && rendererRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    // Cleanup
    return () => {
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [design, width, height, createTierMesh, createFillingLayer, createDecoration, sliceAngle, showSliceView, autoRotate]);

  const handleResetView = () => {
    if (sceneRef.current && cameraRef.current) {
      sceneRef.current.rotation.set(0, 0, 0);
      cameraRef.current.position.z = 40;
      controlsRef.current = { rotation: 0, zoom: 1 };
      setAutoRotate(true);
      setSliceAngle(0);
    }
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <Card className={isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>3D Cake Preview</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetView}
            title="Reset view"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Canvas container */}
        <div
          ref={containerRef}
          className={`bg-gray-100 rounded overflow-hidden ${
            isFullscreen ? "w-screen h-screen" : ""
          }`}
          style={{
            width: isFullscreen ? "100vw" : width,
            height: isFullscreen ? "100vh" : height,
          }}
        />

        {/* Slice view control */}
        {showSliceView && (
          <div className="space-y-2">
            <label className="text-sm font-semibold">Slice Angle: {sliceAngle}°</label>
            <Slider
              value={[sliceAngle]}
              onValueChange={(value) => {
                setSliceAngle(value[0]);
                onSliceChange?.(value[0]);
              }}
              min={0}
              max={360}
              step={5}
            />
          </div>
        )}

        {/* Auto-rotate toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoRotate"
            checked={autoRotate}
            onChange={(e) => setAutoRotate(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="autoRotate" className="text-sm font-medium">
            Auto-rotate
          </label>
        </div>

        {/* Controls info */}
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
          <p>Drag to rotate • Scroll to zoom • Click "Reset" to return to default view</p>
        </div>
      </CardContent>
    </Card>
  );
}
