import React from 'react';
import { StickyNote, Lock, Unlock, X } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

function useLocalState<T>(key: string, initial: T) {
  const [state, setState] = React.useState<T>(() => {
    try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw) as T; } catch {}
    return initial;
  });
  React.useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }, [key, state]);
  return [state, setState] as const;
}

export const StickyNoteToggle: React.FC<{ storageKey?: string }>=({ storageKey })=>{
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  const key = storageKey ?? `sticky:${path}:visible`;
  const [visible, setVisible] = useLocalState<boolean>(key, false);
  return (
    <Button variant="outline" size="sm" onClick={()=> setVisible(v=> !v)} aria-label="Toggle Sticky Note">
      <StickyNote className="h-4 w-4" />
    </Button>
  );
};

export const StickyNoteWidget: React.FC<{ id?: string }>=({ id })=>{
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  const base = `sticky:${id || path}`;
  const [visible, setVisible] = useLocalState<boolean>(`${base}:visible`, false);
  const [locked, setLocked] = useLocalState<boolean>(`${base}:locked`, false);
  const [text, setText] = useLocalState<string>(`${base}:text`, '');
  const [pos, setPos] = useLocalState<{x:number;y:number}>(`${base}:pos`, { x: 24, y: 120 });
  const ref = React.useRef<HTMLDivElement|null>(null);

  React.useEffect(()=>{
    const el = ref.current; if(!el) return;
    const onPointerDown = (e: PointerEvent)=>{
      if(locked) return; if(!(e.target as HTMLElement).closest('[data-grab]')) return;
      e.preventDefault();
      const startX = e.clientX; const startY = e.clientY; const start = { ...pos };
      const onMove = (ev: PointerEvent)=>{
        const nx = Math.max(0, start.x + (ev.clientX - startX));
        const ny = Math.max(0, start.y + (ev.clientY - startY));
        setPos({ x: nx, y: ny });
      };
      const onUp = ()=>{ window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
    el.addEventListener('pointerdown', onPointerDown);
    return ()=>{ el.removeEventListener('pointerdown', onPointerDown); };
  }, [locked, pos, setPos]);

  if(!visible) return null;
  return (
    <div ref={ref} className="fixed z-[9998]" style={{ left: pos.x, top: pos.y }}>
      <div className={cn('w-64 rounded-md shadow-xl border', 'bg-yellow-100 text-slate-900')}>
        <div data-grab className="cursor-move flex items-center justify-between px-2 py-1 border-b border-black/10">
          <div className="text-xs font-semibold">Sticky Note</div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=> setLocked(v=> !v)} aria-label={locked? 'Unlock':'Lock'}>
              {locked ? <Lock className="h-3.5 w-3.5"/> : <Unlock className="h-3.5 w-3.5"/>}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=> setVisible(false)} aria-label="Close">
              <X className="h-3.5 w-3.5"/>
            </Button>
          </div>
        </div>
        <textarea
          className={cn('w-full min-h-[140px] p-2 text-sm outline-none bg-transparent resize-none')}
          placeholder="Type here..."
          value={text}
          onChange={e=> setText(e.target.value)}
          readOnly={locked}
        />
      </div>
    </div>
  );
};

export default StickyNoteWidget;
