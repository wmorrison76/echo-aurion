/**
 * CakeTierGeometry — shape-aware geometry factory for 7 tier shapes (iter153).
 *
 * Shapes:
 *  - round         · cylinderGeometry (with cutaway wedge support)
 *  - hex           · cylinderGeometry radialSegments=6
 *  - square        · boxGeometry
 *  - sheet         · boxGeometry stretched 1.6:1
 *  - heart         · extruded THREE.Shape cardioid
 *  - mad_hatter    · cylinderGeometry with top radius = radius × (1 - taper)
 *  - topsy_turvy   · custom cylinder with vertical sine wave
 *
 * Cutaway is supported for cylindrical shapes (round/hex/mad_hatter/topsy_turvy)
 * via thetaStart/thetaLength. Square/sheet/heart skip cutaway to keep geometry
 * predictable (designer would photograph cross-section externally anyway).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import type { Tier } from "./types";

export function tierGeometry(tier: Tier, cutaway: boolean): THREE.BufferGeometry {
  const shape = tier.shape || "round";
  const thetaStart = cutaway ? Math.PI * 0.25 : 0;
  const thetaLength = cutaway ? Math.PI * 1.5 : Math.PI * 2;
  const radialSeg = 64;

  switch (shape) {
    case "hex":
      return new THREE.CylinderGeometry(tier.radius, tier.radius, tier.height, 6, 1, false, thetaStart, thetaLength);

    case "square": {
      const s = tier.radius * 2;
      return new THREE.BoxGeometry(s, tier.height, s);
    }

    case "sheet": {
      const w = tier.radius * 2.4;
      const d = tier.radius * 1.5;
      return new THREE.BoxGeometry(w, tier.height, d);
    }

    case "heart": {
      // Classic heart shape — 4 bezier curves forming 2 humps + bottom point
      const hs = new THREE.Shape();
      const r = tier.radius;
      // Start at bottom-center tip pointing down
      hs.moveTo(0, -r * 0.9);
      // Right side: tip → right curve → right hump top → notch
      hs.bezierCurveTo(r * 0.95, -r * 0.55,  r * 1.25,  r * 0.0,  r * 0.7,   r * 0.55);
      hs.bezierCurveTo(r * 0.4,   r * 0.95,  r * 0.15,  r * 0.8,  0,          r * 0.4);
      // Left side: notch → left hump top → left curve → tip
      hs.bezierCurveTo(-r * 0.15, r * 0.8,  -r * 0.4,   r * 0.95, -r * 0.7,   r * 0.55);
      hs.bezierCurveTo(-r * 1.25, r * 0.0,  -r * 0.95, -r * 0.55, 0,         -r * 0.9);
      const geo = new THREE.ExtrudeGeometry(hs, {
        depth: tier.height,
        bevelEnabled: true,
        bevelThickness: 0.015,
        bevelSize: 0.015,
        bevelSegments: 3,
        curveSegments: 24,
      });
      // Extrude is along +Z; rotate X+90° so +Z maps to +Y (vertical)
      geo.rotateX(Math.PI / 2);
      // Center on Y=0 (extrusion now spans 0 to +height along -Y after rotate, so shift up)
      geo.translate(0, tier.height / 2, 0);
      return geo;
    }

    case "mad_hatter": {
      const topR = tier.radius * (1 - (tier.taper ?? 0.25));
      return new THREE.CylinderGeometry(topR, tier.radius, tier.height, radialSeg, 1, false, thetaStart, thetaLength);
    }

    case "topsy_turvy": {
      const geo = new THREE.CylinderGeometry(tier.radius, tier.radius, tier.height, radialSeg, 8, false, thetaStart, thetaLength);
      // Displace vertices in X/Z by a sin wave of Y
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const amp = (tier.wave && tier.wave > 0) ? tier.wave : 0.12;
      for (let i = 0; i < pos.count; i++) {
        const vy = pos.getY(i);
        const phase = (vy / tier.height + 0.5) * Math.PI * 2;
        const shift = Math.sin(phase * 1.5) * amp * tier.radius;
        pos.setX(i, pos.getX(i) + shift * 0.5);
        pos.setZ(i, pos.getZ(i) + Math.cos(phase * 1.5) * amp * tier.radius * 0.4);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      return geo;
    }

    case "round":
    default:
      return new THREE.CylinderGeometry(tier.radius, tier.radius, tier.height, radialSeg, 1, false, thetaStart, thetaLength);
  }
}

// Hook-style helper: memoises per-tier geometry for React render
export function useTierGeometry(tier: Tier, cutaway: boolean) {
  return useMemo(
    () => tierGeometry(tier, cutaway),
    // Re-build whenever any shape-affecting input changes
    [tier.shape, tier.radius, tier.height, tier.taper, tier.wave, cutaway]
  );
}

// Whether cross-section wedge can render for this shape
export function shapeSupportsCutaway(shape?: Tier["shape"]) {
  return shape === undefined || shape === "round" || shape === "hex" || shape === "mad_hatter" || shape === "topsy_turvy";
}

// Approximate top radius for stacking/topper positioning
export function approxTopRadius(tier: Tier): number {
  switch (tier.shape) {
    case "mad_hatter": return tier.radius * (1 - (tier.taper ?? 0.25));
    case "square": return tier.radius;
    case "sheet": return tier.radius * 1.2;
    case "heart": return tier.radius * 0.6;
    default: return tier.radius;
  }
}
