/**
 * Three.js Cake Viewer with AI-Generated Textures
 * Enhanced version of ThreeCakeViewer that supports applying generated layer images as textures
 * Provides real-time adjustment of layer properties
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RotateCw, Maximize2, Minimize2, Layers } from "lucide-react";
import type { DesignData, TierSpec } from "./types";
import type { CakeLayer } from "@/shared/types";
import {
  createTierMaterial,
  createFrostingMaterial,
  createFillingMaterial,
  loadTexture,
  createCircularUVAttribute,
  createCylindricalUVAttribute,
  clearTextureCache,
} from "@/lib/three-cake-texture-loader";

interface ThreeCakeViewerWithTexturesProps {
  design: DesignData;
  approvedLayers?: CakeLayer[];
  width?: number;
  height?: number;
  showSliceView?: boolean;
  onSliceChange?: (angle: number) => void;
  onTextureApplied?: (tierIndex: number, type: string) => void;
}

interface TierGeometry {
  mesh: THREE.Mesh;
  topGeometry: THREE.BufferGeometry;
  sideGeometry: THREE.BufferGeometry;
  diameter: number;
  height: number;
  tierIndex: number;
}

interface LayerProperties {
  thickness: number; // 0-2x multiplier
  frostingDepth: number; // 0-2x multiplier
  opacity: number; // 0-100
}

export default function ThreeCakeViewerWithTextures({
  design,
  approvedLayers = [],
  width = 600,
  height = 600,
  showSliceView = false,
  onSliceChange,
  onTextureApplied,
}: ThreeCakeViewerWithTexturesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<{ rotation: number; zoom: number }>({
    rotation: 0,
    zoom: 1,
  });
  const tiersRef = useRef<TierGeometry[]>([]);
  const frostingLayersRef = useRef<THREE.Mesh[]>([]);
  const fillingLayersRef = useRef<THREE.Mesh[]>([]);

  const [sliceAngle, setSliceAngle] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [layerProperties, setLayerProperties] = useState<LayerProperties[]>(
    design.tiers.map(() => ({
      thickness: 1,
      frostingDepth: 1,
      opacity: 100,
    })),
  );

  /**
   * Find approved layer image for specific tier and type
   */
  const getLayerImage = useCallback(
    (
      tierIndex: number,
      type: "tier" | "frosting" | "filling",
    ): string | undefined => {
      const layer = approvedLayers.find(
        (l) => l.type === type && l.metadata?.tierIndex === tierIndex,
      );
      return layer?.imageUrl;
    },
    [approvedLayers],
  );

  /**
   * Create tier geometry with texture support
   */
  const createTierMesh = useCallback(
    async (
      tier: TierSpec,
      index: number,
      color: string,
    ): Promise<THREE.Mesh> => {
      const diameter = (tier.diameter || 8) * 2.54;
      const baseHeight = tier.height * 2.54;
      const adjustedHeight =
        baseHeight * (layerProperties[index]?.thickness || 1);
      const radius = diameter / 2;

      // Create geometry with separate materials for top and sides
      const topGeometry = new THREE.CircleGeometry(radius, 32);
      const sideGeometry = new THREE.CylinderGeometry(
        radius,
        radius,
        adjustedHeight,
        32,
      );

      // Get texture images
      const tierImageUrl = getLayerImage(index, "tier");
      const frostingImageUrl = getLayerImage(index, "frosting");

      // Create materials with textures
      let topMaterial: THREE.Material;
      let sideMaterial: THREE.Material;

      if (tierImageUrl) {
        // Apply top texture with circular UV mapping
        createCircularUVAttribute(topGeometry);
        const topTexture = await loadTexture(tierImageUrl);
        topMaterial = new THREE.MeshPhongMaterial({
          map: topTexture,
          shininess: 20,
          side: THREE.FrontSide,
        });
      } else {
        topMaterial = new THREE.MeshPhongMaterial({
          color: new THREE.Color(color),
          shininess: 20,
          side: THREE.FrontSide,
        });
      }

      if (frostingImageUrl) {
        // Apply frosting texture to sides with cylindrical mapping
        createCylindricalUVAttribute(sideGeometry);
        const frostingTexture = await loadTexture(frostingImageUrl);
        sideMaterial = new THREE.MeshPhongMaterial({
          map: frostingTexture,
          shininess: 30,
          side: THREE.FrontSide,
        });
      } else {
        sideMaterial = new THREE.MeshPhongMaterial({
          color: new THREE.Color(color),
          shininess: 20,
          side: THREE.FrontSide,
        });
      }

      // Create combined mesh with both geometries
      const group = new THREE.Group();

      // Top circle
      const topMesh = new THREE.Mesh(topGeometry, topMaterial);
      topMesh.position.y = adjustedHeight / 2;
      topMesh.rotation.x = 0;
      group.add(topMesh);

      // Sides cylinder
      const sideMesh = new THREE.Mesh(sideGeometry, sideMaterial);
      group.add(sideMesh);

      // Position group - stack tiers from bottom to top
      // Calculate cumulative height up to this tier
      let cumulativeHeight = 0;
      for (let i = index + 1; i < design.tiers.length; i++) {
        cumulativeHeight += design.tiers[i].height * 2.54 * (layerProperties[i]?.thickness || 1);
      }

      // Position from bottom: bottom tier starts at lowest point
      const yOffset = -cumulativeHeight - adjustedHeight / 2;
      group.position.y = yOffset;

      group.castShadow = true;
      group.receiveShadow = true;

      // Store references
      const tierGeometry: TierGeometry = {
        mesh: group as any,
        topGeometry,
        sideGeometry,
        diameter: tier.diameter || 8,
        height: tier.height,
        tierIndex: index,
      };

      onTextureApplied?.(index, "tier");

      return group as any;
    },
    [
      design.tiers,
      approvedLayers,
      layerProperties,
      getLayerImage,
      onTextureApplied,
    ],
  );

  /**
   * Create frosting layer with texture
   */
  const createFrostingLayer = useCallback(
    async (tier: TierSpec, index: number): Promise<THREE.Mesh | null> => {
      const frostingImageUrl = getLayerImage(index, "frosting");
      if (!frostingImageUrl) {
        // Frosting rendered as separate material on sides
        return null;
      }

      const diameter = (tier.diameter || 8) * 2.54;
      const frostingHeight = 0.5 * (layerProperties[index]?.frostingDepth || 1);
      const radius = diameter / 2;

      const geometry = new THREE.CylinderGeometry(
        radius,
        radius,
        frostingHeight,
        32,
      );
      createCylindricalUVAttribute(geometry);

      const material = await createFrostingMaterial(
        frostingImageUrl,
        "buttercream",
        "#ffffff",
      );

      const mesh = new THREE.Mesh(geometry, material);

      // Position on top of tier - align with tier positioning
      const tierHeight =
        tier.height * 2.54 * (layerProperties[index]?.thickness || 1);

      // Calculate cumulative height up to this tier (same as tier positioning)
      let cumulativeHeight = 0;
      for (let i = index + 1; i < design.tiers.length; i++) {
        cumulativeHeight += design.tiers[i].height * 2.54 * (layerProperties[i]?.thickness || 1);
      }

      // Frosting sits on top of the tier
      const yOffset = -cumulativeHeight + tierHeight / 2 + 0.3;
      mesh.position.y = yOffset;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      onTextureApplied?.(index, "frosting");

      return mesh;
    },
    [
      design.tiers,
      approvedLayers,
      layerProperties,
      getLayerImage,
      onTextureApplied,
    ],
  );

  /**
   * Create filling layer with texture
   */
  const createFillingLayer = useCallback(
    async (tier: TierSpec, index: number): Promise<THREE.Mesh | null> => {
      const fillingImageUrl = getLayerImage(index, "filling");

      const diameter = (tier.diameter || 8) * 2.54;
      const fillingHeight = 0.3;
      const radius = diameter / 2;

      const geometry = new THREE.CylinderGeometry(
        radius * 0.95,
        radius * 0.95,
        fillingHeight,
        32,
      );

      let material: THREE.Material;
      if (fillingImageUrl) {
        createCylindricalUVAttribute(geometry);
        material = await createFillingMaterial(fillingImageUrl, "#c41e3a");
      } else {
        material = new THREE.MeshPhongMaterial({
          color: new THREE.Color("#c41e3a"),
          shininess: 10,
        });
      }

      const mesh = new THREE.Mesh(geometry, material);

      // Position between tiers - align with tier positioning
      const tierHeight =
        tier.height * 2.54 * (layerProperties[index]?.thickness || 1);

      // Calculate cumulative height up to this tier (same as tier positioning)
      let cumulativeHeight = 0;
      for (let i = index + 1; i < design.tiers.length; i++) {
        cumulativeHeight += design.tiers[i].height * 2.54 * (layerProperties[i]?.thickness || 1);
      }

      // Filling sits on top of the tier
      const yOffset = -cumulativeHeight + tierHeight / 2 + 0.3;
      mesh.position.y = yOffset;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (fillingImageUrl) {
        onTextureApplied?.(index, "filling");
      }

      return mesh;
    },
    [
      design.tiers,
      approvedLayers,
      layerProperties,
      getLayerImage,
      onTextureApplied,
    ],
  );

  /**
   * Initialize Three.js scene with textures
   */
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 40;
    cameraRef.current = camera;

    // Renderer setup with high quality settings
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      precision: "highp",
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    renderer.shadowMap.autoUpdate = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Professional food photography lighting
    // Soft ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Main key light - bright, positioned high and front
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(25, 35, 25);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 4096;
    keyLight.shadow.mapSize.height = 4096;
    keyLight.shadow.camera.far = 100;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    // Fill light - softer, from opposite side to reduce shadows
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-20, 20, 15);
    scene.add(fillLight);

    // Rim/back light - subtle highlight from behind
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 15, -30);
    scene.add(rimLight);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -20;
    ground.receiveShadow = true;
    scene.add(ground);

    // Build tiers with textures
    (async () => {
      tiersRef.current = [];
      frostingLayersRef.current = [];
      fillingLayersRef.current = [];

      for (let idx = 0; idx < design.tiers.length; idx++) {
        const tier = design.tiers[idx];
        const tierColor = design.color || "#c7a16d";

        try {
          const tierMesh = await createTierMesh(tier, idx, tierColor);
          scene.add(tierMesh);

          tiersRef.current.push({
            mesh: tierMesh,
            topGeometry: new THREE.BufferGeometry(),
            sideGeometry: new THREE.BufferGeometry(),
            diameter: tier.diameter || 8,
            height: tier.height,
            tierIndex: idx,
          });

          // Add frosting layer
          const frostingMesh = await createFrostingLayer(tier, idx);
          if (frostingMesh) {
            scene.add(frostingMesh);
            frostingLayersRef.current.push(frostingMesh);
          }

          // Add filling layer
          const fillingMesh = await createFillingLayer(tier, idx);
          if (fillingMesh) {
            scene.add(fillingMesh);
            fillingLayersRef.current.push(fillingMesh);
          }
        } catch (error) {
          console.error(`Failed to create tier ${idx}:`, error);
        }
      }
    })();

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
        controlsRef.current.zoom = cameraRef.current.position.z / 40;
      }
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      if (autoRotate && sceneRef.current) {
        sceneRef.current.rotation.y += 0.005;
      }

      if (cameraRef.current && rendererRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    // Cleanup
    return () => {
      if (
        containerRef.current &&
        renderer.domElement.parentNode === containerRef.current
      ) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      clearTextureCache();
    };
  }, [
    design,
    width,
    height,
    createTierMesh,
    createFrostingLayer,
    createFillingLayer,
    autoRotate,
  ]);

  const handleResetView = () => {
    if (sceneRef.current && cameraRef.current) {
      sceneRef.current.rotation.set(0, 0, 0);
      cameraRef.current.position.z = 40;
      controlsRef.current = { rotation: 0, zoom: 1 };
      setAutoRotate(true);
      setSliceAngle(0);
    }
  };

  const handleLayerPropertyChange = (
    tierIndex: number,
    property: keyof LayerProperties,
    value: number,
  ) => {
    setLayerProperties((prev) => {
      const updated = [...prev];
      updated[tierIndex] = { ...updated[tierIndex], [property]: value };
      return updated;
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          <CardTitle>3D Cake Preview with Textures</CardTitle>
        </div>
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
            onClick={() => setIsFullscreen(!isFullscreen)}
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
          className={`bg-gray-100 rounded overflow-hidden ${isFullscreen ? "w-screen h-screen" : ""}`}
          style={{ width: `${width}px`, height: `${height}px` }}
        />

        {/* Layer adjustment controls */}
        {design.tiers.length > 0 && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Layer Properties</h3>
            {design.tiers.map((_, tierIndex) => (
              <div key={tierIndex} className="space-y-3 p-3 bg-gray-50 rounded">
                <h4 className="text-xs font-semibold text-gray-600">
                  Tier {tierIndex + 1}
                </h4>

                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Cake Thickness:{" "}
                    {(layerProperties[tierIndex]?.thickness || 1).toFixed(1)}x
                  </label>
                  <Slider
                    value={[layerProperties[tierIndex]?.thickness || 1]}
                    min={0.5}
                    max={2}
                    step={0.1}
                    onValueChange={(value) =>
                      handleLayerPropertyChange(
                        tierIndex,
                        "thickness",
                        value[0],
                      )
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Frosting Depth:{" "}
                    {(layerProperties[tierIndex]?.frostingDepth || 1).toFixed(
                      1,
                    )}
                    x
                  </label>
                  <Slider
                    value={[layerProperties[tierIndex]?.frostingDepth || 1]}
                    min={0.5}
                    max={2}
                    step={0.1}
                    onValueChange={(value) =>
                      handleLayerPropertyChange(
                        tierIndex,
                        "frostingDepth",
                        value[0],
                      )
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Opacity: {layerProperties[tierIndex]?.opacity || 100}%
                  </label>
                  <Slider
                    value={[layerProperties[tierIndex]?.opacity || 100]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) =>
                      handleLayerPropertyChange(tierIndex, "opacity", value[0])
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info: Approved layers */}
        {approvedLayers.length > 0 && (
          <div className="text-xs text-gray-600 p-3 bg-blue-50 rounded">
            <span className="font-semibold">
              ✓ {approvedLayers.length} approved layer images applied
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
