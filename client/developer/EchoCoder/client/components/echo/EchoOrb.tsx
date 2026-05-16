import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "next-themes";

export const orbHostClass =
  "relative flex items-center justify-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_center,_rgba(12,18,32,0.88)_0%,_rgba(5,10,21,0.92)_55%,_rgba(2,6,14,0.72)_100%)] shadow-[0_0_32px_rgba(56,189,248,0.35)] backdrop-blur-sm";

export type EchoOrbProps = {
  points?: number;
  radius?: number;
  speed?: number;
  wobble?: number;
  colorA?: string;
  colorB?: string;
  compactness?: number;
  className?: string;
  bare?: boolean;
  // Rings
  showRings?: boolean;
  ringCount?: number;
  ringParticles?: number;
  ringSpeed?: number;
  ringColor?: string;
  ringRandomness?: number; // 0..1 extra desync and precession
  ringPalette?: string[];
  // Glow emitter
  glowParticles?: number;
  glowColor?: string;
  dirAzimuth?: number; // degrees 0..360
  dirElevation?: number; // degrees -90..90
  glowSpeed?: number;
  glowSize?: number;
  // Helix
  helix?: boolean;
  helixParticles?: number;
  helixRadius?: number;
  helixPitch?: number;
  helixSpeed?: number;
  helixColor?: string;
  // Waves pattern params
  waveCols?: number;
  waveRows?: number;
  waveAmp?: number;
  waveSpeed?: number;
  waveSpacing?: number;
  waveColor?: string;
  pattern?: "classic" | "waves" | "galaxy" | "fractal" | "tessellation";
  chaosAttractor?: "lorenz" | "rossler";
  chaosPoints?: number;
  chaosDt?: number;
  chaosSigma?: number;
  chaosRho?: number;
  chaosBeta?: number;
  chaosA?: number;
  chaosB?: number;
  chaosC?: number;
  chaosScale?: number;
  chaosSpeed?: number;
  chaosIntensity?: number;
  chaosColor?: string;
  tessellationType?: "hex" | "tri";
  tessellationCols?: number;
  tessellationRows?: number;
  tessellationScale?: number;
  tessellationDepth?: number;
  tessellationSpeed?: number;
  tessellationWarp?: number;
  tessellationColorA?: string;
  tessellationColorB?: string;
};

function PointsSphere({
  points = 6000,
  radius = 2.2,
  speed = 0.35,
  wobble = 0.25,
  colorA = "#14e0ff",
  colorB = "#ffe95c",
  compactness = 0.9,
}: EchoOrbProps) {
  const ref = useRef<THREE.Points>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(points * 3);
    const colors = new Float32Array(points * 3);
    const colA = new THREE.Color(colorA);
    const colB = new THREE.Color(colorB);
    for (let i = 0; i < points; i++) {
      const u = Math.random();
      const v = Math.random();
      const w = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * Math.pow(w, 1 - compactness);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      // Ensure values are finite
      positions[i * 3] = isFinite(x) ? x : 0;
      positions[i * 3 + 1] = isFinite(y) ? y : 0;
      positions[i * 3 + 2] = isFinite(z) ? z : 0;
      const t = i / points;
      const c = colA.clone().lerp(colB, t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    // Prevent bounding sphere computation issues
    g.computeBoundingBox();
    return g;
  }, [points, radius, colorA, colorB, compactness]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!ref.current) return;
    ref.current.rotation.x = t * speed * 0.5;
    ref.current.rotation.y = t * speed * 0.7;
    ref.current.rotation.z = t * speed * 0.3;
    const attr = ref.current.geometry.getAttribute("position");
    const pos = attr.array as Float32Array;
    for (let i = 0; i < pos.length; i += 3) {
      const nx = pos[i],
        ny = pos[i + 1],
        nz = pos[i + 2];
      const k = 1 + (wobble ?? 0) * 0.02 * Math.sin(0.7 * t + (nx + ny + nz));
      pos[i] = nx * k;
      pos[i + 1] = ny * k;
      pos[i + 2] = nz * k;
    }
    attr.needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial
        size={isDark ? 0.0015 : 0.002}
        sizeAttenuation={true}
        vertexColors
        transparent
        opacity={isDark ? 0.82 : 0.78}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        fog={false}
      />
    </points>
  );
}

function RingsParticles({
  radius = 2.2,
  ringCount = 8,
  ringParticles = 900,
  ringSpeed = 0.6,
  ringColor,
  ringRandomness = 0.25,
  ringPalette,
}: {
  radius?: number;
  ringCount?: number;
  ringParticles?: number;
  ringSpeed?: number;
  ringColor?: string;
  ringRandomness?: number;
  ringPalette?: string[];
}) {
  const group = useRef<THREE.Group>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const palette =
    ringPalette && ringPalette.length > 0
      ? ringPalette
      : [
          "#1ee3ff",
          "#39f3ff",
          "#00b7ff",
          "#8fdcff",
          "#ffe95c",
          "#ffd94d",
          "#fff06b",
        ];
  const rand = (s: number) => {
    const x = Math.sin(s * 127.1) * 43758.5453;
    return x - Math.floor(x);
  };
  const rings = useMemo(() => {
    const arr: {
      geom: THREE.BufferGeometry;
      mat: THREE.PointsMaterial;
      quat: THREE.Quaternion;
      sign: number;
      speedMul: number;
      precessAxis: THREE.Vector3;
      precessSpeed: number;
      initSpin: number;
    }[] = [];
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let r = 0; r < ringCount; r++) {
      const g = new THREE.BufferGeometry();
      const P = new Float32Array(ringParticles * 3);
      for (let i = 0; i < ringParticles; i++) {
        const t = (i / ringParticles) * Math.PI * 2;
        const rad = radius * 0.9;
        P[i * 3] = Math.cos(t) * rad;
        P[i * 3 + 1] = 0;
        P[i * 3 + 2] = Math.sin(t) * rad;
      }
      g.setAttribute("position", new THREE.BufferAttribute(P, 3));
      const col = new THREE.Color(ringColor ?? palette[r % palette.length]);
      const m = new THREE.PointsMaterial({
        size: isDark ? 0.0012 : 0.0018,
        sizeAttenuation: true,
        color: col,
        transparent: true,
        opacity: isDark ? 0.8 : 0.76,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        fog: false,
      });
      const y = 1 - (r / Math.max(1, ringCount - 1)) * 2;
      const radiusXY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = ga * r;
      const n = new THREE.Vector3(
        Math.cos(theta) * radiusXY,
        y,
        Math.sin(theta) * radiusXY,
      ).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        n,
      );
      const sign = rand(r + 3) > 0.5 ? 1 : -1;
      const speedMul = 1 + ringRandomness * (rand(r + 7) * 0.8 - 0.4);
      const precessAxis = new THREE.Vector3(
        rand(r + 11) - 0.5,
        rand(r + 13) - 0.5,
        rand(r + 17) - 0.5,
      ).normalize();
      const precessSpeed = ringRandomness * (0.2 + rand(r + 19) * 0.6) * 0.4; // slow revolve
      const initSpin = rand(r + 23) * Math.PI * 2;
      arr.push({
        geom: g,
        mat: m,
        quat,
        sign,
        speedMul,
        precessAxis,
        precessSpeed,
        initSpin,
      });
    }
    return arr;
  }, [
    ringCount,
    ringParticles,
    radius,
    ringColor,
    ringRandomness,
    palette,
    isDark,
  ]);
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const baseStep = (920 / 180) * Math.PI * ringSpeed * delta;
    const t = clock.getElapsedTime();
    group.current.children.forEach((c, idx) => {
      const ring = rings[idx];
      if (!ring) return;
      const up = new THREE.Vector3(0, 1, 0)
        .applyQuaternion((c as any).quaternion)
        .normalize();
      const jitter =
        1 +
        ringRandomness *
          0.05 *
          Math.sin(t * (0.3 + idx * 0.07) + ring.initSpin);
      (c as any).rotateOnAxis(
        up,
        baseStep * ring.sign * ring.speedMul * jitter,
      );
      (c as any).rotateOnWorldAxis(ring.precessAxis, ring.precessSpeed * delta);
    });
  });
  return (
    <group ref={group}>
      {rings.map((r, i) => (
        <group key={i} quaternion={r.quat}>
          <group rotation={[0, r.initSpin, 0]}>
            <points>
              <primitive object={r.geom} attach="geometry" />
              <primitive object={r.mat} attach="material" />
            </points>
          </group>
        </group>
      ))}
    </group>
  );
}

function CenterGlowEmitter({
  count = 600,
  color = "#ffe95c",
  speed = 1.4,
  azimuth = 0,
  elevation = 0,
  omni = false,
  maxRadius = 3.0,
  particleSize = 0.035,
}: {
  count?: number;
  color?: string;
  speed?: number;
  azimuth?: number;
  elevation?: number;
  omni?: boolean;
  maxRadius?: number;
  particleSize?: number;
}) {
  const safeCount = Math.max(0, Math.floor(Number.isFinite(count) ? count! : 0));
  const safeSpeed = Number.isFinite(speed) ? speed! : 0;
  const safeParticleSize = Math.max(0, Number.isFinite(particleSize) ? particleSize! : 0);
  if (safeCount <= 0 || safeParticleSize <= 0) {
    return null;
  }
  const pts = useRef<THREE.Points>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const dir = useMemo(() => {
    const az = (azimuth * Math.PI) / 180;
    const el = (elevation * Math.PI) / 180;
    return new THREE.Vector3(
      Math.cos(el) * Math.cos(az),
      Math.sin(el),
      Math.cos(el) * Math.sin(az),
    ).normalize();
  }, [azimuth, elevation]);
  const data = useMemo(() => {
    const pos = new Float32Array(safeCount * 3);
    const vel = new Float32Array(safeCount * 3);
    const life = new Float32Array(safeCount);
    for (let i = 0; i < safeCount; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;
      let base: THREE.Vector3;
      if (omni) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        base = new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta),
        );
      } else {
        base = dir.clone();
      }
      const jitter = new THREE.Vector3(
        (Math.random() - 0.5) * 0.35,
        (Math.random() - 0.5) * 0.35,
        (Math.random() - 0.5) * 0.35,
      );
      const v3 = base.multiplyScalar(0.8 + Math.random() * 1.4).add(jitter);
      vel[i * 3] = v3.x;
      vel[i * 3 + 1] = v3.y;
      vel[i * 3 + 2] = v3.z;
      life[i] = Math.random();
    }
    return { pos, vel, life };
  }, [safeCount, dir, omni]);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(data.pos, 3));
    // Prevent bounding sphere computation issues
    g.computeBoundingBox();
    return g;
  }, [data.pos]);
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: isDark ? safeParticleSize * 0.15 : safeParticleSize * 0.22,
        sizeAttenuation: true,
        color,
        transparent: true,
        opacity: 0.77,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        fog: false,
      }),
    [color, safeParticleSize, isDark],
  );
  useFrame((_, delta) => {
    if (!pts.current) return;
    const { pos, vel, life } = data;
    const maxR2 = maxRadius * maxRadius;
    for (let i = 0; i < life.length; i++) {
      life[i] += delta * safeSpeed * 0.5;
      pos[i * 3] += vel[i * 3] * delta * safeSpeed;
      pos[i * 3 + 1] += vel[i * 3 + 1] * delta * safeSpeed;
      pos[i * 3 + 2] += vel[i * 3 + 2] * delta * safeSpeed;
      const r2 =
        pos[i * 3] * pos[i * 3] +
        pos[i * 3 + 1] * pos[i * 3 + 1] +
        pos[i * 3 + 2] * pos[i * 3 + 2];
      if (r2 > maxR2 || life[i] > 3.2) {
        pos[i * 3] = 0;
        pos[i * 3 + 1] = 0;
        pos[i * 3 + 2] = 0;
        const jitter = new THREE.Vector3(
          (Math.random() - 0.5) * 0.35,
          (Math.random() - 0.5) * 0.35,
          (Math.random() - 0.5) * 0.35,
        );
        let base: THREE.Vector3;
        if (omni) {
          const u = Math.random();
          const v0 = Math.random();
          const th = 2 * Math.PI * u;
          const ph = Math.acos(2 * v0 - 1);
          base = new THREE.Vector3(
            Math.sin(ph) * Math.cos(th),
            Math.cos(ph),
            Math.sin(ph) * Math.sin(th),
          );
        } else {
          base = dir.clone();
        }
        const v3 = base.multiplyScalar(1.2 + Math.random() * 1.6).add(jitter);
        vel[i * 3] = v3.x;
        vel[i * 3 + 1] = v3.y;
        vel[i * 3 + 2] = v3.z;
        life[i] = 0;
      }
    }
    (
      pts.current.geometry.getAttribute("position") as THREE.BufferAttribute
    ).needsUpdate = true;
  });
  return <points ref={pts} geometry={geom} material={mat} />;
}

function DoubleHelix({
  count = 1200,
  radius = 0.8,
  pitch = 0.4,
  speed = 1.0,
  color = "#f05eff",
}: {
  count?: number;
  radius?: number;
  pitch?: number;
  speed?: number;
  color?: string;
}) {
  const pts = useRef<THREE.Points>(null);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );
    return g;
  }, [count]);
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.0018,
        sizeAttenuation: true,
        color,
        transparent: true,
        opacity: 0.77,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        fog: false,
      }),
    [color],
  );
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed;
    const arr = geom.getAttribute("position").array as Float32Array;
    const half = Math.floor(count / 2);
    for (let i = 0; i < half; i++) {
      const a = t + (i / half) * Math.PI * 4;
      const y = ((i / half - 0.5) * 2 * radius) / pitch;
      arr[i * 3] = Math.cos(a) * radius;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = Math.sin(a) * radius;
      const j = half + i;
      const b = t + Math.PI + (i / half) * Math.PI * 4;
      arr[j * 3] = Math.cos(b) * radius;
      arr[j * 3 + 1] = y;
      arr[j * 3 + 2] = Math.sin(b) * radius;
    }
    (geom.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
  });
  return <points ref={pts} geometry={geom} material={mat} />;
}

type StrangeAttractorFieldProps = {
  type?: "lorenz" | "rossler";
  points?: number;
  dt?: number;
  sigma?: number;
  rho?: number;
  beta?: number;
  a?: number;
  b?: number;
  c?: number;
  scale?: number;
  speed?: number;
  colorA?: string;
  colorB?: string;
  accentColor?: string;
  intensity?: number;
};

function StrangeAttractorField({
  type = "lorenz",
  points = 18000,
  dt = 0.008,
  sigma = 10,
  rho = 28,
  beta = 8 / 3,
  a = 0.2,
  b = 0.2,
  c = 5.7,
  scale = 0.085,
  speed = 0.7,
  colorA = "#14e0ff",
  colorB = "#ffe95c",
  accentColor = "#f7c8ff",
  intensity = 0.3,
}: StrangeAttractorFieldProps) {
  const ref = useRef<THREE.Points>(null);
  const drawRef = useRef(0);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const data = useMemo(() => {
    const safePoints = Math.max(1000, Math.floor(points));
    const safeDt = Math.max(0.0001, dt);
    const safeScale = isFinite(scale) && scale !== 0 ? scale : 1;
    const pos = new Float32Array(safePoints * 3);
    const cols = new Float32Array(safePoints * 3);
    const colA = new THREE.Color(colorA);
    const colB = new THREE.Color(colorB);
    const colAccent = new THREE.Color(accentColor);
    const gradR = colB.r - colA.r;
    const gradG = colB.g - colA.g;
    const gradB = colB.b - colA.b;
    let x = 0.12;
    let y = 0.04;
    let z = 0.02;
    for (let i = 0; i < safePoints; i++) {
      if (type === "rossler") {
        const dx = -y - z;
        const dy = x + a * y;
        const dz = b + z * (x - c);
        x += dx * safeDt;
        y += dy * safeDt;
        z += dz * safeDt;
      } else {
        const dx = sigma * (y - x);
        const dy = x * (rho - z) - y;
        const dz = x * y - beta * z;
        x += dx * safeDt;
        y += dy * safeDt;
        z += dz * safeDt;
      }
      const idx = i * 3;
      // Clamp values to prevent NaN in bounding sphere calculation
      pos[idx] = Math.max(-1000, Math.min(1000, x * safeScale)) || 0;
      pos[idx + 1] = Math.max(-1000, Math.min(1000, y * safeScale)) || 0;
      pos[idx + 2] = Math.max(-1000, Math.min(1000, z * safeScale)) || 0;
      const t = i / safePoints;
      let r = colA.r + gradR * t;
      let g = colA.g + gradG * t;
      let bCol = colA.b + gradB * t;
      if (t > 0.82) {
        const blend = Math.min(1, (t - 0.82) / 0.18);
        r = r * (1 - blend) + colAccent.r * blend;
        g = g * (1 - blend) + colAccent.g * blend;
        bCol = bCol * (1 - blend) + colAccent.b * blend;
      }
      cols[idx] = r;
      cols[idx + 1] = g;
      cols[idx + 2] = bCol;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    // Prevent automatic bounding sphere computation issues
    geometry.computeBoundingBox();
    return {
      geometry,
      base: pos.slice(0),
      count: safePoints,
    };
  }, [points, dt, sigma, rho, beta, a, b, c, scale, colorA, colorB, accentColor, type]);
  useEffect(() => () => data.geometry.dispose(), [data.geometry]);
  const basePositionsRef = useRef<Float32Array>(data.base);
  useEffect(() => {
    basePositionsRef.current = data.base;
    drawRef.current = 0;
  }, [data.base]);
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const geometry = data.geometry;
    const t = clock.getElapsedTime();
    ref.current.rotation.y = t * speed * 0.35;
    ref.current.rotation.x = Math.sin(t * speed * 0.22) * 0.38;
    ref.current.rotation.z = Math.cos(t * speed * 0.18) * 0.28;
    drawRef.current = Math.min(data.count, drawRef.current + delta * data.count * 0.45);
    geometry.setDrawRange(0, Math.max(1200, Math.floor(drawRef.current)));
    const chaos = Math.max(0, intensity);
    if (chaos > 0.0001) {
      const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const base = basePositionsRef.current;
      const nudge = chaos * 0.22;
      for (let i = 0; i < arr.length; i += 3) {
        const phase = t * speed * 0.6 + (i / 3) * 0.0021;
        arr[i] = base[i] + Math.sin(phase * 1.7) * nudge;
        arr[i + 1] = base[i + 1] + Math.cos(phase * 1.5) * nudge;
        arr[i + 2] = base[i + 2] + Math.sin(phase * 1.3) * nudge;
      }
      attr.needsUpdate = true;
    }
  });
  return (
    <points ref={ref} geometry={data.geometry}>
      <pointsMaterial
        size={isDark ? 0.0016 : 0.0022}
        sizeAttenuation={true}
        vertexColors
        transparent
        opacity={isDark ? 0.81 : 0.77}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        fog={false}
      />
    </points>
  );
}

type TessellationFieldProps = {
  type?: "hex" | "tri";
  cols?: number;
  rows?: number;
  scale?: number;
  depth?: number;
  speed?: number;
  warp?: number;
  colorA?: string;
  colorB?: string;
};

function TessellationField({
  type = "hex",
  cols = 72,
  rows = 48,
  scale = 0.24,
  depth = 0.45,
  speed = 0.85,
  warp = 0.55,
  colorA = "#14e0ff",
  colorB = "#ffe95c",
}: TessellationFieldProps) {
  const ref = useRef<THREE.Points>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const data = useMemo(() => {
    const safeCols = Math.max(4, Math.floor(cols));
    const safeRows = Math.max(4, Math.floor(rows));
    const count = safeCols * safeRows;
    const safeScale = isFinite(scale) && scale > 0 ? scale : 1;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colA = new THREE.Color(colorA);
    const colB = new THREE.Color(colorB);
    const gradR = colB.r - colA.r;
    const gradG = colB.g - colA.g;
    const gradB = colB.b - colA.b;
    const halfCols = (safeCols - 1) * 0.5;
    const halfRows = (safeRows - 1) * 0.5;
    const triHeight = Math.sqrt(3) * 0.5 * safeScale;
    let ptr = 0;
    for (let row = 0; row < safeRows; row++) {
      for (let col = 0; col < safeCols; col++) {
        const idx = row * safeCols + col;
        let px = 0;
        let pz = 0;
        if (type === "tri") {
          const offset = row % 2 === 0 ? 0 : safeScale * 0.5;
          px = (col - halfCols) * safeScale + offset;
          pz = (row - halfRows) * triHeight * 0.96;
        } else {
          const offset = row % 2 === 0 ? 0 : safeScale * 0.5;
          px = (col - halfCols) * safeScale + offset;
          pz = (row - halfRows) * safeScale * 0.86;
        }
        // Clamp values to prevent NaN in bounding sphere calculation
        positions[ptr] = Math.max(-1000, Math.min(1000, px)) || 0;
        positions[ptr + 1] = 0;
        positions[ptr + 2] = Math.max(-1000, Math.min(1000, pz)) || 0;
        const mix = (Math.sin(col * 0.65 + row * 0.5) + 1) * 0.5;
        const r = colA.r + gradR * mix;
        const g = colA.g + gradG * mix;
        const bCol = colA.b + gradB * mix;
        colors[ptr] = r;
        colors[ptr + 1] = g;
        colors[ptr + 2] = bCol;
        ptr += 3;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    // Prevent automatic bounding sphere computation issues
    geometry.computeBoundingBox();
    return {
      geometry,
      base: positions.slice(0),
      cols: safeCols,
      rows: safeRows,
    };
  }, [cols, rows, scale, colorA, colorB, type]);
  useEffect(() => () => data.geometry.dispose(), [data.geometry]);
  const basePositionsRef = useRef<Float32Array>(data.base);
  useEffect(() => {
    basePositionsRef.current = data.base;
  }, [data.base]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const geometry = data.geometry;
    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const base = basePositionsRef.current;
    const t = clock.getElapsedTime() * speed;
    for (let i = 0; i < arr.length; i += 3) {
      const idx = i / 3;
      const col = idx % data.cols;
      const row = Math.floor(idx / data.cols);
      const phase = col * 0.42 + row * 0.57;
      const wave = Math.sin(phase + t) + Math.cos((phase + t) * warp);
      arr[i] = base[i] + Math.sin(phase * 0.25 + t * 0.35) * depth * 0.16;
      arr[i + 1] = wave * depth * 0.5;
      arr[i + 2] = base[i + 2] + Math.cos(phase * 0.31 + t * 0.28) * depth * 0.16;
    }
    attr.needsUpdate = true;
    ref.current.rotation.y = t * 0.15;
    ref.current.rotation.x = Math.sin(t * 0.12) * 0.12;
  });
  return (
    <points ref={ref} geometry={data.geometry}>
      <pointsMaterial
        size={isDark ? 0.002 : 0.0026}
        sizeAttenuation={true}
        vertexColors
        transparent
        opacity={isDark ? 0.8 : 0.76}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        fog={false}
      />
    </points>
  );
}

function WaveField({
  cols = 120,
  rows = 80,
  amp = 0.5,
  speed = 0.8,
  spacing = 0.08,
  color = "#39f3ff",
}: { cols?: number; rows?: number; amp?: number; speed?: number; spacing?: number; color?: string; }){
  const ref = useRef<THREE.Points>(null);
  const geom = useMemo(()=>{
    const g = new THREE.BufferGeometry();
    const safeCols = Math.max(1, Math.floor(cols));
    const safeRows = Math.max(1, Math.floor(rows));
    const safeSpacing = Math.max(0.001, spacing);
    const count = safeCols * safeRows;
    const pos = new Float32Array(count*3);
    let k=0; const w=(safeCols-1)*safeSpacing*0.5; const h=(safeRows-1)*safeSpacing*0.5;
    for(let j=0;j<safeRows;j++){
      for(let i=0;i<safeCols;i++){
        pos[k++]= i*safeSpacing - w; // x
        pos[k++]= 0;                  // y
        pos[k++]= j*safeSpacing - h; // z
      }
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos,3));
    // Compute bounding box to avoid NaN issues
    g.computeBoundingBox();
    return g;
  },[cols,rows,spacing]);
  const mat = useMemo(()=> new THREE.PointsMaterial({ size: 0.002, sizeAttenuation: true, color, transparent:true, opacity:0.78, blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false, fog:false }),[color]);
  useFrame(({clock})=>{
    if(!ref.current) return;
    const t = clock.getElapsedTime()*speed;
    const attr = ref.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const safeCols = Math.max(1, Math.floor(cols));
    const safeRows = Math.max(1, Math.floor(rows));
    const safeSpacing = Math.max(0.001, spacing);
    let k=0; for(let j=0;j<safeRows;j++){
      for(let i=0;i<safeCols;i++){
        const x = i*safeSpacing; const z = j*safeSpacing;
        const yVal = Math.sin(x*0.4 + t) * Math.cos(z*0.35 + t*0.7) * amp;
        arr[k+1] = isFinite(yVal) ? yVal : 0; // Ensure y is finite
        k+=3;
      }
    }
    attr.needsUpdate = true;
  });
  return <points ref={ref} geometry={geom} material={mat}/>;
}

export default function EchoOrb({
  className,
  bare = false,
  showRings = true,
  ringCount = 8,
  ringParticles = 900,
  ringSpeed = 0.6,
  ringColor,
  ringRandomness = 0.35,
  ringPalette,
  glowParticles = 1200,
  glowColor = "#ffe95c",
  dirAzimuth = 0,
  dirElevation = 0,
  glowSpeed = 1.4,
  glowSize = 0.035,
  helix = true,
  helixParticles = 1200,
  helixRadius = 0.9,
  helixPitch = 0.5,
  helixSpeed = 1.0,
  helixColor = "#f05eff",
  omniGlow = true,
  pattern = "classic",
  chaosAttractor = "lorenz",
  chaosPoints = 18000,
  chaosDt = 0.008,
  chaosSigma = 10,
  chaosRho = 28,
  chaosBeta = 8 / 3,
  chaosA = 0.2,
  chaosB = 0.2,
  chaosC = 5.7,
  chaosScale = 0.085,
  chaosSpeed = 0.7,
  chaosIntensity = 0.3,
  chaosColor = "#f7c8ff",
  tessellationType = "hex",
  tessellationCols = 72,
  tessellationRows = 48,
  tessellationScale = 0.24,
  tessellationDepth = 0.45,
  tessellationSpeed = 0.85,
  tessellationWarp = 0.55,
  tessellationColorA,
  tessellationColorB,
  ...props
}: EchoOrbProps & { omniGlow?: boolean }) {
  const radius = props.radius ?? 2.2;
  const {
    waveCols = 120,
    waveRows = 80,
    waveAmp = 0.5,
    waveSpeed: wSpeed = 0.8,
    waveSpacing = 0.08,
    waveColor = "#39f3ff",
  } = props as EchoOrbProps;
  const baseColorA = props.colorA ?? "#14e0ff";
  const baseColorB = props.colorB ?? "#ffe95c";
  const tessColorA = tessellationColorA ?? baseColorA;
  const tessColorB = tessellationColorB ?? baseColorB;
  const ringsVisible =
    showRings && pattern !== "waves" && pattern !== "tessellation";
  const glowVisible = pattern !== "tessellation";
  const frameCls = bare ? "" : `${orbHostClass} `;
  const sizeCls = bare ? "" : "h-64 md:h-80 w-full ";
  const composed = [sizeCls, frameCls, className].filter(Boolean).join(" ");
  return (
    <div className={composed}>
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
        <ambientLight intensity={0.5} />
        {pattern === "classic" && <PointsSphere {...props} />}
        {pattern === "waves" && (
          <WaveField
            cols={waveCols}
            rows={waveRows}
            amp={waveAmp}
            speed={wSpeed}
            spacing={waveSpacing}
            color={waveColor}
          />
        )}
        {pattern === "galaxy" && (
          <PointsSphere
            {...props}
            glowParticles={1800}
            compactness={0.75}
          />
        )}
        {pattern === "fractal" && (
          <StrangeAttractorField
            type={chaosAttractor}
            points={chaosPoints}
            dt={chaosDt}
            sigma={chaosSigma}
            rho={chaosRho}
            beta={chaosBeta}
            a={chaosA}
            b={chaosB}
            c={chaosC}
            scale={chaosScale}
            speed={chaosSpeed}
            colorA={baseColorA}
            colorB={baseColorB}
            accentColor={chaosColor}
            intensity={chaosIntensity}
          />
        )}
        {pattern === "tessellation" && (
          <TessellationField
            type={tessellationType}
            cols={tessellationCols}
            rows={tessellationRows}
            scale={tessellationScale}
            depth={tessellationDepth}
            speed={tessellationSpeed}
            warp={tessellationWarp}
            colorA={tessColorA}
            colorB={tessColorB}
          />
        )}
        {ringsVisible && (
          <RingsParticles
            radius={radius}
            ringCount={ringCount}
            ringParticles={ringParticles}
            ringSpeed={ringSpeed}
            ringColor={ringColor}
            ringRandomness={ringRandomness}
            ringPalette={ringPalette}
          />
        )}
        {glowVisible && (
          <CenterGlowEmitter
            count={glowParticles}
            color={glowColor}
            speed={glowSpeed}
            azimuth={dirAzimuth}
            elevation={dirElevation}
            omni={omniGlow}
            maxRadius={radius * 0.95}
            particleSize={glowSize}
          />
        )}
        {pattern === "classic" && helix && (
          <DoubleHelix
            count={helixParticles}
            radius={helixRadius}
            pitch={helixPitch}
            speed={helixSpeed}
            color={helixColor}
          />
        )}
      </Canvas>
    </div>
  );
}
