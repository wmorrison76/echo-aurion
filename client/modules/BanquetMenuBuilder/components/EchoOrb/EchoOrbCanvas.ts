/**
 * EchoOrbCanvas.ts
 * ----------------------------------------------------------------------------
 * Procedural canvas renderer for the Echo orb. Pure imperative — no React.
 * Owns the requestAnimationFrame loop, particle simulation, and gold neural
 * orb visualization. Aligned with William's existing Echo AI³ vision.
 *
 * Four states drive visual behavior:
 *   idle       — slow breathing, sparse particles
 *   listening  — pulse-locked to mic input (rms), wider radius, denser particles
 *   thinking   — orbital sweep, particles converge inward
 *   speaking   — bright outer halo, particles radiate outward
 *
 * Performance contract:
 *   - Single canvas, single rAF loop. No per-frame allocations.
 *   - Particle pool is preallocated; we recycle slots, never grow.
 *   - Skips frames when document.hidden (saves battery on bg tabs).
 *   - Renders at devicePixelRatio for crisp gold edges.
 *
 * Sizing:
 *   The host wrapper sets pixel dimensions. This renderer reads
 *   canvas.width/height in CSS pixels and applies DPR internally.
 * ----------------------------------------------------------------------------
 */

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface OrbRendererOptions {
  /** Mic RMS amplitude in [0..1], used by 'listening' state */
  micAmplitude?: number;
  /** Override gold tone — defaults to LUCCCA gold */
  goldHex?: string;
}

interface Particle {
  /** Polar coords from orb center */
  angle: number;
  radius: number;
  /** Drift */
  vAngle: number;
  vRadius: number;
  /** Visual */
  size: number;
  alpha: number;
  /** Lifetime in [0..1], 1 = freshly spawned */
  life: number;
  /** active flag — pool slots reuse this */
  active: boolean;
}

const PARTICLE_POOL_SIZE = 64;
const TWO_PI = Math.PI * 2;

export class EchoOrbCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rafId: number | null = null;
  private state: OrbState = 'idle';
  private options: OrbRendererOptions;
  private particles: Particle[] = [];
  private startedAt = 0;
  private lastFrameAt = 0;
  /** Smoothed mic amplitude — avoids jitter */
  private smoothedAmp = 0;

  constructor(canvas: HTMLCanvasElement, options: OrbRendererOptions = {}) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('[EchoOrbCanvas] 2D context unavailable');
    }
    this.canvas = canvas;
    this.ctx = ctx;
    this.options = options;
    this.initParticlePool();
  }

  // ----- Public API -----

  start(): void {
    if (this.rafId !== null) return;
    this.startedAt = performance.now();
    this.lastFrameAt = this.startedAt;
    this.loop(this.startedAt);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  setState(state: OrbState): void {
    if (state === this.state) return;
    this.state = state;
    // Inject a burst of particles on transitions to make state changes
    // feel responsive, not gradual.
    this.spawnBurst(state === 'speaking' ? 12 : 6);
  }

  setOptions(options: Partial<OrbRendererOptions>): void {
    this.options = { ...this.options, ...options };
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  destroy(): void {
    this.stop();
    this.particles = [];
  }

  // ----- Loop -----

  private loop = (now: number): void => {
    if (typeof document !== 'undefined' && document.hidden) {
      // Skip rendering work while tab is hidden. Re-resume on next visible frame.
      this.rafId = requestAnimationFrame(this.loop);
      return;
    }
    const dt = Math.min((now - this.lastFrameAt) / 1000, 0.064); // cap to ~15fps min
    this.lastFrameAt = now;

    this.update(dt, now);
    this.render(now);

    this.rafId = requestAnimationFrame(this.loop);
  };

  // ----- Update -----

  private update(dt: number, now: number): void {
    // Smooth mic amplitude
    const targetAmp =
      this.state === 'listening' ? Math.max(0, Math.min(1, this.options.micAmplitude ?? 0)) : 0;
    this.smoothedAmp = lerp(this.smoothedAmp, targetAmp, 1 - Math.exp(-dt * 12));

    // Particle drift
    for (const p of this.particles) {
      if (!p.active) continue;
      p.angle += p.vAngle * dt;
      p.radius += p.vRadius * dt;
      p.life -= dt * 0.4;

      // State-specific behaviors
      switch (this.state) {
        case 'idle':
          p.vRadius += (0 - p.vRadius) * dt * 0.5; // settle
          break;
        case 'listening':
          // Particles bob outward with the amplitude
          p.vRadius += this.smoothedAmp * 8 * dt;
          break;
        case 'thinking':
          // Inward spiral
          p.vRadius -= 4 * dt;
          p.vAngle += 0.6 * dt;
          break;
        case 'speaking':
          // Radiate outward
          p.vRadius += 18 * dt;
          break;
      }

      if (p.life <= 0 || p.radius < 4 || p.radius > 90) {
        p.active = false;
      }
    }

    // Spawn maintenance — keep an active count appropriate to state
    const targetCount = {
      idle: 8,
      listening: 24,
      thinking: 18,
      speaking: 32,
    }[this.state];
    const activeCount = this.particles.reduce((n, p) => n + (p.active ? 1 : 0), 0);
    if (activeCount < targetCount) {
      this.spawnOne();
    }
  }

  // ----- Render -----

  private render(now: number): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;

    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const baseRadius = Math.min(w, h) * 0.32;

    const t = (now - this.startedAt) / 1000;
    const breath = 1 + Math.sin(t * 1.2) * 0.04;
    const stateRadius =
      this.state === 'listening'
        ? baseRadius * (1 + this.smoothedAmp * 0.18)
        : this.state === 'speaking'
          ? baseRadius * (1 + Math.sin(t * 6) * 0.06)
          : this.state === 'thinking'
            ? baseRadius * (1 + Math.sin(t * 2.4) * 0.03)
            : baseRadius * breath;

    const gold = this.options.goldHex ?? '#c9a961';
    const goldBright = '#e0c280';

    // ----- Outer glow halo -----
    const haloRadius = stateRadius * 1.9;
    const haloGrad = ctx.createRadialGradient(cx, cy, stateRadius * 0.6, cx, cy, haloRadius);
    haloGrad.addColorStop(0, hexToRgba(gold, this.haloAlpha()));
    haloGrad.addColorStop(1, hexToRgba(gold, 0));
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, haloRadius, 0, TWO_PI);
    ctx.fill();

    // ----- Particles (under the orb body for depth) -----
    for (const p of this.particles) {
      if (!p.active) continue;
      const px = cx + Math.cos(p.angle) * p.radius;
      const py = cy + Math.sin(p.angle) * p.radius;
      ctx.fillStyle = hexToRgba(goldBright, p.alpha * Math.max(0, p.life));
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, TWO_PI);
      ctx.fill();
    }

    // ----- Orb body — radial gold gradient -----
    const bodyGrad = ctx.createRadialGradient(
      cx - stateRadius * 0.25,
      cy - stateRadius * 0.25,
      stateRadius * 0.1,
      cx,
      cy,
      stateRadius,
    );
    bodyGrad.addColorStop(0, hexToRgba(goldBright, 0.95));
    bodyGrad.addColorStop(0.5, hexToRgba(gold, 0.85));
    bodyGrad.addColorStop(1, hexToRgba('#8a7544', 0.95));

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, stateRadius, 0, TWO_PI);
    ctx.fill();

    // ----- Inner neural lines (sparse arcs to suggest activity) -----
    if (this.state === 'thinking' || this.state === 'speaking') {
      ctx.strokeStyle = hexToRgba('#15171b', 0.35);
      ctx.lineWidth = 1;
      const arcs = 3;
      for (let i = 0; i < arcs; i++) {
        const phase = (t * (this.state === 'thinking' ? 0.8 : 1.6)) + i * 0.7;
        ctx.beginPath();
        ctx.arc(
          cx,
          cy,
          stateRadius * (0.55 + i * 0.15),
          phase,
          phase + 1.6,
        );
        ctx.stroke();
      }
    }

    // ----- Specular highlight -----
    const specGrad = ctx.createRadialGradient(
      cx - stateRadius * 0.35,
      cy - stateRadius * 0.45,
      0,
      cx - stateRadius * 0.35,
      cy - stateRadius * 0.45,
      stateRadius * 0.6,
    );
    specGrad.addColorStop(0, 'rgba(255, 245, 220, 0.55)');
    specGrad.addColorStop(1, 'rgba(255, 245, 220, 0)');
    ctx.fillStyle = specGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, stateRadius, 0, TWO_PI);
    ctx.fill();
  }

  // ----- Particle pool -----

  private initParticlePool(): void {
    this.particles = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      angle: 0,
      radius: 0,
      vAngle: 0,
      vRadius: 0,
      size: 0,
      alpha: 0,
      life: 0,
      active: false,
    }));
    // Seed a small idle population so first frame isn't bare
    for (let i = 0; i < 6; i++) this.spawnOne();
  }

  private spawnOne(): void {
    const slot = this.particles.find((p) => !p.active);
    if (!slot) return;

    const rect = this.canvas.getBoundingClientRect();
    const baseRadius = Math.min(rect.width, rect.height) * 0.32;

    slot.angle = Math.random() * TWO_PI;
    slot.radius = baseRadius * (0.95 + Math.random() * 0.4);
    slot.vAngle = (Math.random() - 0.5) * 0.4;
    slot.vRadius = (Math.random() - 0.5) * 4;
    slot.size = 0.8 + Math.random() * 1.6;
    slot.alpha = 0.4 + Math.random() * 0.4;
    slot.life = 1;
    slot.active = true;
  }

  private spawnBurst(n: number): void {
    for (let i = 0; i < n; i++) this.spawnOne();
  }

  private haloAlpha(): number {
    switch (this.state) {
      case 'idle':
        return 0.08;
      case 'listening':
        return 0.12 + this.smoothedAmp * 0.18;
      case 'thinking':
        return 0.14;
      case 'speaking':
        return 0.22;
    }
  }
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
