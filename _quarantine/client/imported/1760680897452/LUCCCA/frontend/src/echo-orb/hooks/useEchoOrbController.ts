import { useRef, useImperativeHandle, useState } from 'react';

export type Mode = 'idle'|'listening'|'thinking'|'speaking';

export interface EchoOrbHandle {
  setMode(m: Mode): void;
  pulse(intensity?: number): void;
  sparkle(count?: number): void;
  ingestEvent(kind: 'question'|'answer'|'error'|'ping'): void;
  setEnergy(v: number): void; // 0..1
}

export function useEchoOrbController() {
  const ref = useRef<EchoOrbHandle|null>(null);
  return ref;
}

// Internal bridge so component can expose methods without re-export cycles
export function useBindEchoOrbHandle(expose: (h: EchoOrbHandle) => void) {
  const modeRef = useRef<Mode>('idle');
  const [energy, setEnergyState] = useState(0.3);
  const listeners: Record<string, Function[]> = { sparkle: [], pulse: [] };

  const api: EchoOrbHandle = {
    setMode(m) { modeRef.current = m; },
    pulse(intensity = 1) { listeners.pulse.forEach(fn => fn(intensity)); },
    sparkle(count = 24) { listeners.sparkle.forEach(fn => fn(count)); },
    ingestEvent(kind) {
      if (kind === 'question') { modeRef.current = 'listening'; listeners.sparkle.forEach(fn => fn(42)); }
      else if (kind === 'answer') { modeRef.current = 'speaking'; }
      else if (kind === 'error')  { modeRef.current = 'thinking'; }
      else { modeRef.current = 'idle'; }
    },
    setEnergy(v) { const c = Math.max(0, Math.min(1, v)); setEnergyState(c); }
  };

  useImperativeHandle({ current: null } as any, () => api);
  expose(api);

  const on = (evt: 'sparkle'|'pulse', fn: Function) => {
    listeners[evt].push(fn);
    return () => { const a = listeners[evt]; const i = a.indexOf(fn); if (i>=0) a.splice(i,1); };
  };

  return { get mode(){ return modeRef.current; }, energy, on };
}
