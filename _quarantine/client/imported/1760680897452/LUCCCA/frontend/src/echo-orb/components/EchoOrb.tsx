import React, { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import '../styles/echo-orb.css';
import { ParticleSystem, Quality, RenderStyle } from '../core/ParticleSystem';
import { useBindEchoOrbHandle, EchoOrbHandle } from '../hooks/useEchoOrbController';

export interface EchoOrbProps {
  size?: number;
  quality?: Quality;
  seed?: number;
  className?: string;
  renderStyle?: RenderStyle; // 'dots'|'tendrils'|'hybrid'
}

export const EchoOrb = forwardRef<EchoOrbHandle, EchoOrbProps>(function EchoOrb(props, ref) {
  const { size = 240, quality='high', seed = 1337, className, renderStyle='hybrid' } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { mode, energy, on } = useBindEchoOrbHandle(h => { (ref as any).current = h; });

  const systemRef = useRef<ParticleSystem | null>(null);
  const lastTs = useRef(0);
  const counts: Record<Quality, number> = { low: 350, medium: 650, high: 1100 };

  useLayoutEffect(() => {
    const canvas = canvasRef.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    const ctx = (canvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D);
    ctx.setTransform(dpr,0,0,dpr,0,0);

    systemRef.current = new ParticleSystem({
      radius: size * 0.42,
      count: counts[quality],
      quality,
      energy: 0.3,
      paletteIndex: Math.floor(Math.random()*3),
      seed,
      renderStyle,
    });
    systemRef.current.setCenter(size/2, size/2);
    lastTs.current = performance.now();
  }, [size, quality, seed, renderStyle]);

  useEffect(() => {
    const offA = on('sparkle', (n: number) => systemRef.current?.sparkle(n));
    const offB = on('pulse', (intensity: number) => {
      const e = Math.max(0, Math.min(1, 0.25 + intensity*0.5));
      systemRef.current?.setEnergy(e);
      setTimeout(() => systemRef.current?.setEnergy(0.3), 380);
    });
    return () => { offA(); offB(); };
  }, [on]);

  useEffect(() => {
    let raf = 0;
    const canvas = canvasRef.current!;
    const ctx = (canvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D);
    const loop = (t: number) => {
      const dt = Math.min(0.033, (t - lastTs.current) / 1000);
      lastTs.current = t;

      // Transparent trail fade: gradually erase previous frame (no white/black fill).
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.10)';    // fade strength (larger = shorter trails)
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw glow using additive blend
      ctx.globalCompositeOperation = 'lighter';
      systemRef.current!.tick(dt, mode);
      systemRef.current!.draw(ctx);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  useEffect(() => { systemRef.current?.setEnergy(energy); }, [energy]);

  return (
    <div className={`echo-orb-wrap ${className??""}`} style={{ width: size, height: size }}>
      {/* hide the CSS glow ring for compact overlay; the particles carry the look */}
      {/* <div className="echo-orb-glow" aria-hidden /> */}
      <canvas ref={canvasRef} className="echo-orb-canvas" />
    </div>
  );
});
