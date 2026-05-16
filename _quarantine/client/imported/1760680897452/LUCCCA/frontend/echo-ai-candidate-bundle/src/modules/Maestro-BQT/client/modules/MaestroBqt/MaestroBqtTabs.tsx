import React from 'react';
import { motion } from 'framer-motion';
import { useMaestroBqtTabs } from './MaestroBqtTabsStore';
import { MaestroBqtDefaultRows } from './MaestroBqtTabsStore';
import type { MaestroBqtTabRow, MaestroBqtTab, UUID } from './MaestroBqtTabTypes';

const COLOR_PALETTE = ['#2563eb','#10b981','#a855f7','#f59e0b','#ef4444','#0ea5e9','#84cc16','#8b5cf6','#22c55e','#06b6d4'];

function shade(hex: string, amt: number){ try{ const h=hex?.replace('#','')||'64748b'; const num=parseInt(h,16); let r=(num>>16)+amt,g=((num>>8)&255)+amt,b=(num&255)+amt; r=Math.max(0,Math.min(255,r)); g=Math.max(0,Math.min(255,g)); b=Math.max(0,Math.min(255,b)); return `rgb(${r}, ${g}, ${b})`; }catch{return hex||'#64748b'} }

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = (h % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let [r1, g1, b1] = [0, 0, 0];
  if (0 <= hh && hh < 1) [r1, g1, b1] = [c, x, 0];
  else if (1 <= hh && hh < 2) [r1, g1, b1] = [x, c, 0];
  else if (2 <= hh && hh < 3) [r1, g1, b1] = [0, c, x];
  else if (3 <= hh && hh < 4) [r1, g1, b1] = [0, x, c];
  else if (4 <= hh && hh < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = l - c / 2;
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
}
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
}
function themePrimary(): string {
  try{
    const cs = getComputedStyle(document.documentElement);
    const vRaw = cs.getPropertyValue('--primary');
    const v = vRaw && vRaw.trim();
    if (v) {
      const m = v.match(/^([0-9.]+)\s+([0-9.]+)%\s+([0-9.]+)%$/);
      if (m) {
        const h = parseFloat(m[1]);
        const s = parseFloat(m[2]) / 100;
        const l = parseFloat(m[3]) / 100;
        const [r, g, b] = hslToRgb(h, s, l);
        return rgbToHex(r, g, b);
      }
      if (/^#|rgb|hsl/.test(v)) return v;
    }
  }catch{}
  const dark = document.documentElement.classList.contains('dark');
  return dark ? '#06b6d4' : '#0ea5e9';
}

function FileTab({ tab, active, index, onClick, onDragStart, onDragOver, onDrop }:{ tab:MaestroBqtTab; active:boolean; index:number; onClick:()=>void; onDragStart:(e:React.DragEvent)=>void; onDragOver:(e:React.DragEvent)=>void; onDrop:(e:React.DragEvent)=>void; }){
  const useColors = useMaestroBqtTabs(s=>s.usePerTabColors);
  const baseColor = useColors ? (tab.color || themePrimary()) : themePrimary();
  const base='relative select-none mb-0 text-sm cursor-pointer transition-all font-semibold text-white';
  const glow = active ? `0 6px 12px ${baseColor}66` : '0 2px 6px rgba(0,0,0,0.15)';
  return (
    <div className={`${base} ${active ? 'ring-2 ring-offset-0 ring-white/50 dark:ring-black/40' : ''}`} draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onClick={onClick}
         style={{
           backgroundImage:`linear-gradient(to bottom, ${shade(baseColor,30)}, ${shade(baseColor,-10)})`,
           borderStyle:'solid',
           borderWidth: 1,
           borderColor: shade(baseColor,-40),
           borderBottomWidth: active ? 0 : 1,
           clipPath:'polygon(0 100%, 0 10px, 12px 0, calc(100% - 16px) 0, 100% 12px, 100% 100%)',
           borderTopLeftRadius: 10,
           borderTopRightRadius: 10,
           padding:'6px 12px',
           marginLeft: index===0? 0 : -10,
           zIndex: 100 + index,
           marginBottom: -1,
           boxShadow: glow
         }}>
      <div className="flex items-center gap-2">
        <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]">{tab.title}</span>
      </div>
    </div>
  );
}

function RowBar({ row, idx, active }:{row:MaestroBqtTabRow; idx:number; active:{rowId?:UUID;tabId?:UUID}|null}){
  const moveTab=useMaestroBqtTabs(s=>s.moveTab); const setActive=useMaestroBqtTabs(s=>s.setActive);
  const tabs = Array.isArray((row as any)?.tabs) ? (row as any).tabs : ([] as MaestroBqtTab[]);
  const onDragStart=(i:number)=> (e:React.DragEvent)=>{ e.dataTransfer.setData('text/maestrobqt', JSON.stringify({ rowId: row.id, tabIndex: i })); };
  const onDragOver =(i:number)=> (e:React.DragEvent)=>{ if(e.dataTransfer.types.includes('text/maestrobqt')) e.preventDefault(); };
  const onDrop     =(i:number)=> (e:React.DragEvent)=>{ const d=e.dataTransfer.getData('text/maestrobqt'); if(!d)return; const {rowId:srcRowId,tabIndex}=JSON.parse(d); moveTab(srcRowId, tabIndex, row.id, i); };

  return (
    <div className="flex flex-wrap items-end px-2" onDragOver={(e)=>{ if(e.dataTransfer.types.includes('text/maestrobqt')) e.preventDefault(); }} onDrop={(e)=>{ const d=e.dataTransfer.getData('text/maestrobqt'); if(!d)return; const {rowId:srcRowId,tabIndex}=JSON.parse(d); moveTab(srcRowId, tabIndex, row.id, tabs.length); }}>
      {tabs
        .filter((t): t is MaestroBqtTab => !!t && typeof (t as any).title === 'string')
        .filter(t => !(t as any).hidden)
        .map((t,i)=>{ const isActive = active?.rowId===row.id && active?.tabId===t.id; return <FileTab key={t.id || String(i)} tab={t} index={i} active={!!isActive} onClick={()=> t?.id && setActive(row.id,t.id)} onDragStart={onDragStart(i)} onDragOver={onDragOver(i)} onDrop={onDrop(i)} />; })}
    </div>
  );
}

export interface MaestroBqtTabsProps { maxRows?: 1|2|3; initial?: { rows?: MaestroBqtTabRow[] }; onUndock?: (state:any)=>void; onDock?:(state:any)=>void; actions?: { openRoute?:(path:string)=>void; openPanel?:(id:string,props?:any)=>void; openLink?:(url:string)=>void; }; }

export const MaestroBqtTabs: React.FC<MaestroBqtTabsProps> = ({ maxRows=3, initial, onUndock, onDock, actions })=>{
  const init=useMaestroBqtTabs(s=>s.init); const rows=useMaestroBqtTabs(s=>s.rows); const active=useMaestroBqtTabs(s=>s.active); const setActive=useMaestroBqtTabs(s=>s.setActive);
  const updateTab=useMaestroBqtTabs(s=>s.updateTab); const removeTab=useMaestroBqtTabs(s=>s.removeTab); const moveTab=useMaestroBqtTabs(s=>s.moveTab);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const settingsBtnRef = React.useRef<HTMLButtonElement>(null);
  const hydrated = useMaestroBqtTabs(s=> (s as any).hydrated ?? true);
  React.useEffect(()=>{ if(!hydrated) return; if(!rows.length){ init({ rows: initial?.rows ?? MaestroBqtDefaultRows }); } }, [hydrated]);
  const visible = rows.slice(0, Math.max(1, Math.min(maxRows,3)));

  function trigger(tab:MaestroBqtTab){
    if(tab.kind==='ROUTE' && actions?.openRoute){
      const path = typeof tab.payload === 'string' ? tab.payload : '';
      const normalized = (path === '/beo-management' || path === '/beo-management/') ? '/beo-management/new' : path;
      actions.openRoute(normalized);
    }
    if(tab.kind==='PANEL' && actions?.openPanel) actions.openPanel(tab.payload?.id ?? 'UnknownPanel', tab.payload?.props ?? {});
    if(tab.kind==='LINK'  && actions?.openLink)  actions.openLink(tab.payload);
  }
  React.useEffect(()=>{ const row = rows.find(r=> r.id===active?.rowId); const tab = row?.tabs.find(t=> t.id===active?.tabId); if(tab) trigger(tab); }, [active?.rowId, active?.tabId]);

  React.useEffect(()=>{
    if(!hydrated) return;
    if(!active && rows.length){
      const currentPath = (typeof window !== 'undefined' ? (window.location.hash?.slice(1) || window.location.pathname || '/') : '/');
      const normalizedCurrent = (currentPath === '/beo-management' || currentPath === '/beo-management/') ? '/beo-management/new' : currentPath;
      const rowMatch = rows.find(r => (r.tabs || []).some(t => t.kind === 'ROUTE' && t.payload === normalizedCurrent));
      const tabMatch = rowMatch?.tabs.find(t => t.kind === 'ROUTE' && t.payload === normalizedCurrent);
      if (rowMatch && tabMatch) { setActive(rowMatch.id, tabMatch.id); return; }
      if (normalizedCurrent !== '/') { return; }
      const dashRow = rows.find(r=> r.tabs.some(t=>t.title==='Dashboard'));
      const dashTab = dashRow?.tabs.find(t=>t.title==='Dashboard');
      if(dashRow && dashTab){ setActive(dashRow.id, dashTab.id); }
      else { const r0=rows[0]; const t0=r0.tabs[0]; if(r0 && t0) setActive(r0.id, t0.id); }
    }
  }, [hydrated, rows.length, active]);

  const handleUndock=()=>{ const state={rows,active}; try { const undocked = JSON.parse(localStorage.getItem('maestroBqt.undocked')||'[]'); const row = rows.find(r=> r.id===active?.rowId); const tab = row?.tabs.find(t=> t.id===active?.tabId); if(tab){ undocked.unshift({ title: tab.title, kind: tab.kind, payload: tab.payload, color: tab.color, ts: Date.now() }); localStorage.setItem('maestroBqt.undocked', JSON.stringify(undocked.slice(0,50))); } } catch{} if(onUndock) onUndock(state); else window.dispatchEvent(new CustomEvent('maestrobqt:undock', { detail: state })); };
  const handleDock  =()=>{ const state={rows,active};
    // Restore full default tab set when docking
    try { init({ rows: MaestroBqtDefaultRows });
      setTimeout(()=>{
        try{
          const s = useMaestroBqtTabs.getState();
          const dashRow = s.rows.find(r=> (r.tabs||[]).some(t=> t.title==='Dashboard'));
          const dashTab = dashRow?.tabs.find(t=> t.title==='Dashboard');
          if(dashRow && dashTab) s.setActive(dashRow.id, dashTab.id);
        }catch{}
      }, 0);
    } catch {}
    if(onDock)   onDock(state);   else window.dispatchEvent(new CustomEvent('maestrobqt:dock',   { detail: state })); };

  const activeRow = rows.find(r=> r.id===active?.rowId) || rows[0];
  const activeTab = activeRow?.tabs.find(t=> t.id===active?.tabId) || activeRow?.tabs[0];
  const allTabs = React.useMemo(() => {
    try {
      if (!Array.isArray(rows)) return [] as MaestroBqtTab[];
      return rows.flatMap(r => Array.isArray((r as any).tabs) ? (r as any).tabs : []);
    } catch { return [] as MaestroBqtTab[]; }
  }, [rows]);
  const settingsCatalog: MaestroBqtTab[] = React.useMemo(() => {
    try {
      const defaults: MaestroBqtTab[] = (Array.isArray(MaestroBqtDefaultRows) ? MaestroBqtDefaultRows : []).flatMap(r => (r as any)?.tabs || []);
      const existingTitles = new Set((allTabs || []).map(t => (t as any)?.title || ''));
      return defaults.filter(t => t && t.title && !existingTitles.has(t.title));
    } catch { return []; }
  }, [allTabs]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="text-sm font-semibold opacity-70">Workbench</div>
        <div className="flex items-center gap-2">
          <button className="text-xs underline" onClick={handleUndock}>undock</button>
          <button className="text-xs underline" onClick={handleDock}>dock</button>
        </div>
      </div>
      <div className="relative">
        {visible.map((row,i)=>(
          <motion.div key={row.id} initial={{y:6*i, opacity:0}} animate={{y:6*i, opacity:1}} className="relative z-10" style={{marginTop: i===0?0:-8}}>
            <RowBar row={row} idx={i} active={active??null} />
          </motion.div>
        ))}
        <div className="h-0 border-b border-black/20" style={{ marginTop: -1 }} />
      </div>

      {settingsOpen && (
        <div className="absolute right-3 mt-1 z-50 w-[560px] rounded-lg border bg-white dark:bg-neutral-900 shadow-2xl p-3">
          <div className="text-sm font-semibold mb-2">Tabs — Settings</div>
          <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
            <div className="flex items-center gap-2">
              <label className="text-xs">Use per-tab colors</label>
              <input type="checkbox" checked={useMaestroBqtTabs.getState().usePerTabColors} onChange={(e)=> useMaestroBqtTabs.getState().setUsePerTabColors(e.target.checked)} />
            </div>
            {(rows || []).map((r)=> (
              <div key={r.id} className="rounded-md border p-2">
                <div className="text-xs font-semibold opacity-70 mb-2">{r.name}</div>
                <div className="space-y-2">
                  {(r.tabs || []).map((t, idx)=> (
                    <div key={t.id} className="flex items-center justify-between gap-2 rounded-md border bg-background/40 px-2 py-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{t.title}</div>
                        <div className="text-[10px] opacity-60">id: {t.title.toLowerCase().replace(/\s+/g,'-')}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs opacity-70">Color</span>
                        <button className="h-5 w-8 rounded border" style={{ background: t.color || '#64748b' }} onClick={()=>{
                          const i = Math.max(0, COLOR_PALETTE.indexOf(t.color || ''));
                          const next = COLOR_PALETTE[(i+1)%COLOR_PALETTE.length];
                          updateTab(r.id, t.id, { color: next });
                        }} />
                        <span className="text-xs opacity-70 ml-2">Row</span>
                        <select className="border rounded px-2 py-1 bg-white/80 dark:bg-black/40" value={r.id}
                                onChange={(e)=>{ const dstId=e.target.value as UUID; const srcIndex = idx; const dstRow = rows.find(rr=> rr.id===dstId)!; const dstIndex = dstRow.tabs.length; moveTab(r.id, srcIndex, dstId, dstIndex); }}>
                          {rows.map(rr=> (<option key={rr.id} value={rr.id}>{rr.name}</option>))}
                        </select>
                        <select className="border rounded px-2 py-1 bg-white/80 dark:bg-black/40" defaultValue="back"
                                onChange={(e)=>{ const place=e.target.value; const srcIndex = (r.tabs || []).findIndex(x=>x.id===t.id); const dstIndex = place==='front'? 0 : Math.max(0, (r.tabs || []).length-1); moveTab(r.id, srcIndex, r.id, dstIndex); }}>
                          <option value="front">Front</option>
                          <option value="back">Back</option>
                        </select>
                        <button className="text-xs text-red-600 underline" onClick={()=> removeTab(r.id, t.id)}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button className="text-xs underline" onClick={()=> setSettingsOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
