import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedStorage } from './hooks/useDebouncedStorage';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Maximize2, Minimize2, Move, RefreshCw } from 'lucide-react';
import ErrorBoundary from '../ui/ErrorBoundary';

export type PanelLayout = {
  id: string;
  x: number; // px
  y: number; // px
  w: number; // px
  h: number; // px
  z?: number; // stacking order
  collapsed?: boolean;
};

export type PanelConfig = {
  id: string;
  render: () => React.ReactNode;
  default: Omit<PanelLayout, 'id'>;
  minW?: number;
  minH?: number;
};

function usePersistentLayout(defaults: PanelConfig[], storageKey: string, resetToken?: number) {
  const [layout, setLayout] = useState<PanelLayout[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: PanelLayout[] = JSON.parse(raw);
        const ids = new Set(defaults.map(d => d.id));
        const filtered = parsed.filter(p => ids.has(p.id));
        const missing = defaults.filter(d => !filtered.some(p => p.id === d.id)).map((d, i) => ({ id: d.id, z: filtered.length + i + 1, ...d.default }));
        return [...filtered, ...missing];
      }
    } catch {}
    return defaults.map((d, i) => ({ id: d.id, z: i + 1, ...d.default }));
  });

  const saveLayout = useDebouncedStorage<PanelLayout[]>(storageKey, 250);
  useEffect(() => { saveLayout(layout); }, [layout, saveLayout]);

  useEffect(() => {
    if (resetToken !== undefined) {
      setLayout(defaults.map((d, i) => ({ id: d.id, z: i + 1, ...d.default })));
      try { localStorage.removeItem(storageKey); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken, storageKey]);

  return [layout, setLayout] as const;
}

const PanelContent: React.FC<{ render: () => React.ReactNode }> = React.memo(({ render }) => {
  return <>{render()}</>;
});
PanelContent.displayName = 'PanelContent';

export const DraggableDashboard: React.FC<{
  panels: PanelConfig[];
  height?: number; // canvas height in px (desktop)
  resetToken?: number;
  storageKey?: string;
}> = ({ panels, height = 1400, resetToken, storageKey = 'dashboard:layout:v1' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const nodeMapRef = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const refCallbacksRef = useRef<Map<string, (el: HTMLDivElement | null) => void>>(new Map());
  const getRefCallback = useCallback((id: string) => {
    let fn = refCallbacksRef.current.get(id);
    if (!fn) {
      fn = (el: HTMLDivElement | null) => { nodeMapRef.current.set(id, el); };
      refCallbacksRef.current.set(id, fn);
    }
    return fn;
  }, []);
  const getNode = useCallback((id: string) => nodeMapRef.current.get(id) || null, []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{ id: string; dx: number; dy: number; startX: number; startY: number } | null>(null);
  const [resizeState, setResizeState] = useState<{ id: string; startX: number; startY: number; startW: number; startH: number } | null>(null);

  const [layout, setLayout] = usePersistentLayout(panels, storageKey, resetToken);

  useEffect(() => {
    setLayout(prev => {
      const idSet = new Set(panels.map(p => p.id));
      const filtered = prev.filter(p => idSet.has(p.id));
      const maxZ = filtered.reduce((m, p) => Math.max(m, p.z || 1), 0);
      const missing = panels
        .filter(pc => !filtered.some(p => p.id === pc.id))
        .map((pc, i) => ({ id: pc.id, z: maxZ + i + 1, ...pc.default }));
      const next = [...filtered, ...missing];
      if (next.length === prev.length && next.every((p, i) => {
        const q = prev[i];
        return p.id === q.id && p.x === q.x && p.y === q.y && p.w === q.w && p.h === q.h && (p.z||1) === (q.z||1) && !!p.collapsed === !!q.collapsed;
      })) return prev;
      return next;
    });
  }, [panels, setLayout]);

  const confById = useMemo(() => {
    const map = new Map<string, { minW: number; minH: number }>();
    for (const pc of panels) {
      map.set(pc.id, { minW: pc.minW ?? 260, minH: pc.minH ?? 140 });
    }
    return map;
  }, [panels]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    const id = requestAnimationFrame(onResize);
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', onResize); };
  }, []);

  const bounds = useMemo(() => {
    const el = containerRef.current;
    if (!el) return { w: 0, h: 0 };
    const rect = el.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }, [height]);

  const bringToFront = (id: string) => {
    setLayout(prev => {
      const maxZ = prev.reduce((m, p) => Math.max(m, p.z || 1), 1);
      const me = prev.find(p => p.id === id);
      if (!me) return prev;
      const curZ = me.z || 1;
      if (curZ >= maxZ) return prev;
      const nextZ = maxZ + 1;
      return prev.map(p => (p.id === id ? { ...p, z: nextZ } : p));
    });
  };

  const startDrag = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragState?.id === id) return;
    const panel = layout.find(p => p.id === id);
    if (!panel) return;
    if (activeId !== id) setActiveId(id);
    bringToFront(id);
    setDragState({ id, dx: panel.x, dy: panel.y, startX: e.clientX, startY: e.clientY });
    const el = getNode(id);
    if (el) { el.style.willChange = 'transform'; }
  };

  const startResize = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (resizeState?.id === id) return;
    const panel = layout.find(p => p.id === id);
    if (!panel) return;
    if (activeId !== id) setActiveId(id);
    bringToFront(id);
    setResizeState({ id, startX: e.clientX, startY: e.clientY, startW: panel.w, startH: panel.h });
    const el = getNode(id);
    if (el) { el.style.willChange = 'width, height'; }
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragState) {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        const tx = Math.max(0 - dragState.dx, Math.min((bounds.w || Infinity) - 100 - dragState.dx, dx));
        const ty = Math.max(0 - dragState.dy, Math.min((height) - 60 - dragState.dy, dy));
        const el = getNode(dragState.id);
        if (el) el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      }
      if (resizeState) {
        const rx = e.clientX - resizeState.startX;
        const ry = e.clientY - resizeState.startY;
        const conf = confById.get(resizeState.id);
        const minW = conf?.minW ?? 260;
        const minH = conf?.minH ?? 140;
        const nw = Math.max(minW, resizeState.startW + rx);
        const nh = Math.max(minH, resizeState.startH + ry);
        const cw = Math.min(nw, bounds.w);
        const ch = Math.min(nh, height);
        const el = getNode(resizeState.id);
        if (el) { el.style.width = `${cw}px`; el.style.height = `${ch}px`; }
      }
    };
    const onUp = () => {
      if (dragState) {
        const el = getNode(dragState.id);
        // parse current translate values
        let tx = 0, ty = 0;
        if (el && el.style.transform.startsWith('translate3d(')) {
          const parts = el.style.transform.slice('translate3d('.length).split(',');
          tx = parseFloat(parts[0] || '0') || 0;
          ty = parseFloat(parts[1] || '0') || 0;
        }
        if (el) { el.style.transform = ''; el.style.willChange = ''; }
        const nx = Math.max(0, Math.min((bounds.w || Infinity) - 100, dragState.dx + tx));
        const ny = Math.max(0, Math.min((height) - 60, dragState.dy + ty));
        setLayout(prev => prev.map(p => p.id === dragState.id ? { ...p, x: nx, y: ny } : p));
      }
      if (resizeState) {
        const el = getNode(resizeState.id);
        const w = el ? parseFloat(el.style.width || '0') : undefined;
        const h = el ? parseFloat(el.style.height || '0') : undefined;
        if (el) { el.style.width = ''; el.style.height = ''; el.style.willChange = ''; }
        if (w || h) {
          setLayout(prev => prev.map(p => p.id === resizeState.id ? { ...p, w: w ?? p.w, h: h ?? p.h } : p));
        }
      }
      setDragState(null);
      setResizeState(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragState, resizeState, bounds.w, height, confById, getNode, setLayout]);

  const toggleCollapse = useCallback((id: string) => {
    setLayout(prev => prev.map(p => {
      if (p.id !== id) return p;
      const next = !p.collapsed;
      if (p.collapsed === next) return p;
      return { ...p, collapsed: next };
    }));
  }, []);

  const resetAll = useCallback(() => {
    const next = panels.map((d, i) => ({ id: d.id, z: i + 1, ...d.default }));
    setLayout(prev => {
      const same = prev.length === next.length && prev.every((p, i) => {
        const q = next[i];
        return p.id === q.id && p.x === q.x && p.y === q.y && p.w === q.w && p.h === q.h && p.z === q.z && !!p.collapsed === !!q.collapsed;
      });
      return same ? prev : next;
    });
    try { localStorage.removeItem(storageKey); } catch {}
  }, [panels, setLayout, storageKey]);

  if (isMobile) {
    // Fallback: simple stacked layout on small screens
    return (
      <div className="space-y-6">
        {panels.map(p => (
          <div key={p.id} className="relative">
            <div className="rounded-xl border bg-white dark:bg-neutral-900 shadow-lg">
              <div className="p-2 border-b flex items-center justify-between">
                <div className="text-sm font-medium">{p.id}</div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleCollapse(p.id)}>
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3">{p.render()}</div>
            </div>
          </div>
        ))}
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={resetAll}>
            <RefreshCw className="h-4 w-4 mr-2" /> Reset Layout
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full dashboard-canvas rounded-2xl p-2 md:p-3" style={{ height }}>
      {layout.map(p => {
        const conf = panels.find(pc => pc.id === p.id);
        if(!conf) return null;
        return (
          <div
            key={p.id}
            className={cn(
              'absolute rounded-xl border bg-white dark:bg-neutral-900 text-card-foreground',
              'border-black/10 dark:border-white/10 shadow-xl hover:shadow-2xl transition-shadow',
              'glass-panel',
              activeId === p.id && 'ring-2 ring-primary/40 shadow-2xl'
            )}
            style={{ left: p.x, top: p.y, width: p.w, height: p.h, zIndex: p.z || 1 }}
            ref={getRefCallback(p.id)}
          >
            <div
              className={cn(
                'cursor-grab active:cursor-grabbing select-none',
                'flex items-center justify-between px-3 py-2 border-b border-black/5 dark:border-white/5 bg-background/60 rounded-t-xl'
              )}
              onMouseDown={(e) => startDrag(e, p.id)}
            >
              <div className={cn('text-xs font-medium flex items-center gap-2')}>
                <Move className="h-3.5 w-3.5 opacity-60" />
                <span className="truncate max-w-[240px]">{p.id}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleCollapse(p.id)}>
                  {p.collapsed ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div
              className={cn("p-3 overflow-auto no-scrollbar transition-all", p.collapsed && "pointer-events-none opacity-0")}
              style={{ height: Math.max((p.h ?? 0) - 44, 0) }}
              aria-hidden={p.collapsed}
            >
              <ErrorBoundary fallback={(reset, error)=> (
                <div className="rounded border p-3 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">Panel '{p.id}' failed</div>
                      <div className="text-xs opacity-80 break-all">{error?.message}</div>
                    </div>
                    <button onClick={reset} className="text-xs rounded border px-2 py-1 bg-white dark:bg-slate-900">Reload</button>
                  </div>
                </div>
              )}>
                <PanelContent render={conf.render} />
              </ErrorBoundary>
            </div>
            <div
              className={cn("absolute right-1.5 bottom-1.5 h-4 w-4", p.collapsed ? "pointer-events-none opacity-0" : "cursor-nwse-resize")}
              onMouseDown={(e) => startResize(e, p.id)}
              title="Drag to resize"
            >
              <div className="h-full w-full border-r-2 border-b-2 border-muted-foreground/60 rounded-sm bg-gradient-to-br from-transparent to-muted/30" />
            </div>
          </div>
        );
      })}
      {/* Focus outline */}
      {activeId && (
        <div className="pointer-events-none absolute inset-0" />
      )}
    </div>
  );
};
