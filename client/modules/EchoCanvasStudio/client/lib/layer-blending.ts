/**
 * Layer Blending Modes
 * Implements various blending modes for proper layer composition
 */

import * as THREE from "three";

export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "softLight"
  | "hardLight"
  | "colorDodge"
  | "colorBurn"
  | "darken"
  | "lighten"
  | "difference"
  | "exclusion"
  | "add"
  | "subtract";

/**
 * Apply blend mode to material
 */
export function applyBlendMode(
  material: THREE.Material,
  blendMode: BlendMode,
): void {
  if (!(material instanceof THREE.MeshPhongMaterial)) return;

  switch (blendMode) {
    case "normal":
      material.blending = THREE.NormalBlending;
      material.transparent = false;
      break;

    case "multiply":
      material.blending = THREE.MultiplyBlending;
      material.transparent = true;
      break;

    case "screen":
      material.blending = THREE.ScreenBlending;
      material.transparent = true;
      break;

    case "add":
      material.blending = THREE.AdditiveBlending;
      material.transparent = true;
      break;

    case "subtract":
      material.blending = THREE.SubtractiveBlending;
      material.transparent = true;
      break;

    case "overlay":
      // Custom overlay blending
      material.blending = THREE.CustomBlending;
      material.blendSrc = THREE.SrcAlphaFactor;
      material.blendDst = THREE.OneMinusSrcAlphaFactor;
      material.blendEquation = THREE.AddEquation;
      material.transparent = true;
      break;

    case "softLight":
      material.blending = THREE.CustomBlending;
      material.blendSrc = THREE.SrcAlphaFactor;
      material.blendDst = THREE.DstAlphaFactor;
      material.transparent = true;
      break;

    case "hardLight":
      material.blending = THREE.CustomBlending;
      material.blendSrc = THREE.SrcColorFactor;
      material.blendDst = THREE.DstColorFactor;
      material.transparent = true;
      break;

    case "colorDodge":
      material.blending = THREE.CustomBlending;
      material.blendSrc = THREE.OneFactor;
      material.blendDst = THREE.OneFactor;
      material.blendEquation = THREE.AddEquation;
      material.transparent = true;
      break;

    case "colorBurn":
      material.blending = THREE.CustomBlending;
      material.blendSrc = THREE.ZeroFactor;
      material.blendDst = THREE.OneMinusSrcColorFactor;
      material.transparent = true;
      break;

    case "darken":
      material.blending = THREE.MultiplyBlending;
      material.transparent = true;
      break;

    case "lighten":
      material.blending = THREE.ScreenBlending;
      material.transparent = true;
      break;

    case "difference":
      material.blending = THREE.CustomBlending;
      material.blendEquation = THREE.SubtractEquation;
      material.blendSrc = THREE.OneFactor;
      material.blendDst = THREE.OneFactor;
      material.transparent = true;
      break;

    case "exclusion":
      material.blending = THREE.CustomBlending;
      material.blendSrc = THREE.SrcAlphaFactor;
      material.blendDst = THREE.OneMinusSrcAlphaFactor;
      material.transparent = true;
      break;
  }

  material.needsUpdate = true;
}

/**
 * Get all available blend modes
 */
export function getBlendModes(): Array<{
  value: BlendMode;
  label: string;
  description: string;
}> {
  return [
    { value: "normal", label: "Normal", description: "Standard blending" },
    { value: "multiply", label: "Multiply", description: "Darkens with layer" },
    { value: "screen", label: "Screen", description: "Lightens with layer" },
    {
      value: "overlay",
      label: "Overlay",
      description: "Mix of multiply and screen",
    },
    {
      value: "softLight",
      label: "Soft Light",
      description: "Subtle overlay effect",
    },
    {
      value: "hardLight",
      label: "Hard Light",
      description: "Strong overlay effect",
    },
    {
      value: "colorDodge",
      label: "Color Dodge",
      description: "Brightens highlights",
    },
    {
      value: "colorBurn",
      label: "Color Burn",
      description: "Darkens shadows",
    },
    { value: "darken", label: "Darken", description: "Shows darker pixels" },
    { value: "lighten", label: "Lighten", description: "Shows lighter pixels" },
    { value: "difference", label: "Difference", description: "Inverts colors" },
    {
      value: "exclusion",
      label: "Exclusion",
      description: "Like difference but lower contrast",
    },
    { value: "add", label: "Add", description: "Additive blending" },
    {
      value: "subtract",
      label: "Subtract",
      description: "Subtractive blending",
    },
  ];
}

/**
 * Layer blending configuration
 */
export interface LayerBlendingConfig {
  tierIndex: number;
  blendMode: BlendMode;
  opacity: number; // 0-1
  visible: boolean;
}

/**
 * Apply color adjustment to material
 */
export function adjustMaterialColor(
  material: THREE.MeshPhongMaterial,
  color: THREE.Color,
  intensity: number,
): void {
  material.color.lerp(color, intensity);
  material.needsUpdate = true;
}

/**
 * Apply opacity to material
 */
export function setMaterialOpacity(
  material: THREE.MeshPhongMaterial,
  opacity: number,
): void {
  material.opacity = Math.max(0, Math.min(1, opacity));
  material.transparent = opacity < 1;
  material.needsUpdate = true;
}

/**
 * Create a blended material from two materials
 */
export function createBlendedMaterial(
  material1: THREE.MeshPhongMaterial,
  material2: THREE.MeshPhongMaterial,
  blendMode: BlendMode,
  blendFactor: number = 0.5,
): THREE.MeshPhongMaterial {
  const blended = material1.clone() as THREE.MeshPhongMaterial;

  // Apply color blending
  const color1 = material1.color.clone();
  const color2 = material2.color.clone();

  const blendedColor = color1.lerp(color2, blendFactor);
  blended.color.copy(blendedColor);

  // Apply blend mode
  applyBlendMode(blended, blendMode);

  // Adjust opacity
  const avgOpacity = (material1.opacity + material2.opacity) / 2;
  setMaterialOpacity(blended, avgOpacity);

  return blended;
}

/**
 * Create frosting layer with proper blending
 */
export function createFrostingMaterialWithBlending(
  baseColor: string,
  blendMode: BlendMode = "normal",
  opacity: number = 0.8,
  texture?: THREE.Texture,
): THREE.MeshPhongMaterial {
  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color(baseColor),
    shininess: 30,
    side: THREE.FrontSide,
  });

  if (texture) {
    material.map = texture;
  }

  applyBlendMode(material, blendMode);
  setMaterialOpacity(material, opacity);

  return material;
}

/**
 * Create cake tier material with proper blending
 */
export function createTierMaterialWithBlending(
  baseColor: string,
  blendMode: BlendMode = "normal",
  opacity: number = 1,
  texture?: THREE.Texture,
): THREE.MeshPhongMaterial {
  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color(baseColor),
    shininess: 20,
    side: THREE.FrontSide,
  });

  if (texture) {
    material.map = texture;
  }

  applyBlendMode(material, blendMode);
  setMaterialOpacity(material, opacity);

  return material;
}

/**
 * Create filling layer material with proper blending
 */
export function createFillingMaterialWithBlending(
  baseColor: string,
  blendMode: BlendMode = "multiply",
  opacity: number = 0.7,
  texture?: THREE.Texture,
): THREE.MeshPhongMaterial {
  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color(baseColor),
    shininess: 15,
    side: THREE.DoubleSide,
  });

  if (texture) {
    material.map = texture;
  }

  applyBlendMode(material, blendMode);
  setMaterialOpacity(material, opacity);

  return material;
}

/**
 * Get recommended blend mode for layer type
 */
export function getRecommendedBlendMode(
  layerType: "tier" | "frosting" | "filling",
): BlendMode {
  switch (layerType) {
    case "tier":
      return "normal";
    case "frosting":
      return "overlay";
    case "filling":
      return "multiply";
    default:
      return "normal";
  }
}
