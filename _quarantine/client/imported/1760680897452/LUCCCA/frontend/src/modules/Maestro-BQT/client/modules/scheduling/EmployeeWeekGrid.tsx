import React from 'react';
import { startOfWeek, addDays, toISODate, fmtDay, minutes } from './time';
import { useAttendanceStore } from './useAttendanceStore';
import { useStaffStore } from '../../stores/staffStore';
import { useBEOStore } from '../../stores/beoStore';
import { usePositionsStore } from './positionsStore';
import { Badge } from '../..//components/ui/badge';
import { GripVertical } from 'lucide-react';
import { PayRateDialog } from './PayRateDialog';
import { FuzzyTimeInput } from './FuzzyTimeInput';
import { useScheduleSettings, type RowItem, type ConditionalRule } from './scheduleSettingsStore';

export const EmployeeWeekGrid: React.FC<{ baseDate?: Date }>=({ baseDate })=>{
  const refDate = baseDate || new Date();
  const weekStart = startOfWeek(refDate);
  const weekIso = toISODate(weekStart);
  const days = React.useMemo(()=> Array.from({length:7}, (_,i)=> addDays(weekStart,i)), [refDate.getTime()]);
  const dayIso = (d: Date)=> toISODate(d);
  const { shifts, addShift, updateShift } = useAttendanceStore();
  const { employees } = useStaffStore();
  const { events } = useBEOStore();
  const { positions } = usePositionsStore();
  const { rowItems, setRowItems, addSeparator, updateSeparator, moveRow, setSeparatorColor, conditionalRules } = useScheduleSettings();

  const eventsByDate = React.useMemo(()=>{
    const map = new Map<string, { titles: string[]; covers: number }>();
    days.forEach(d=> { const iso=dayIso(d); const todays = events.filter(e=> e.date===iso); const titles=todays.map(e=> e.title); const covers=todays.reduce((acc,e)=> acc + (e.guestCount || (e as any).guests || 0), 0); map.set(iso, { titles, covers }); });
    return map;
  }, [events, weekIso]);

  // Keep row ordering synced with current employees while preserving separators
  React.useEffect(()=>{
    const empIds = new Set(employees.map(e=> e.id));
    const kept: RowItem[] = rowItems.filter(it=> it.type==='emp'? empIds.has(it.id) : true);
    const existingEmpIds = new Set(kept.filter(it=> it.type==='emp').map(it=> (it as any).id));
    const toAppend: RowItem[] = employees.filter(e=> !existingEmpIds.has(e.id)).map(e=> ({ type:'emp', id: e.id } as RowItem));
    const next = [...kept, ...toAppend];
    if(next.length !== rowItems.length || next.some((it,i)=> JSON.stringify(it)!==JSON.stringify(rowItems[i]))) setRowItems(next);
  }, [employees, rowItems.length]);

  // Totals are only computed when needed (when the totals column is visible)
  const scrollRef = React.useRef<HTMLDivElement|null>(null);
  const totalsHeaderRef = React.useRef<HTMLTableCellElement|null>(null);
  const [totalsActive, setTotalsActive] = React.useState(false);
  React.useEffect(()=>{
    const root = scrollRef.current;
    const target = totalsHeaderRef.current;
    if(!root || !target) return;
    const io = new IntersectionObserver((entries)=>{
      if(entries.some(e=> e.isIntersecting)) setTotalsActive(true);
    }, { root, threshold: 0.1 });
    io.observe(target);
    return ()=> io.disconnect();
  }, []);

  function ensureShift(empId: string, dateIso: string){
    let s = shifts.find(x=> x.employeeId===empId && x.date===dateIso);
    if(!s){ const id = addShift({ date: dateIso, start: '09:00', end: '17:00', role: 'shift', employeeId: empId, employeeName: employees.find(e=> e.id===empId)?.name || '', source:'manual', positions: [] }); s = { ...(useAttendanceStore.getState().shifts.find(z=> z.id===id)!) };
    }
    return s;
  }

  const onTimeChange=(empId:string, dateIso:string, kind:'start'|'end', value:string)=>{
    const s = shifts.find(x=> x.employeeId===empId && x.date===dateIso);
    if(!s){ addShift({ date: dateIso, start: kind==='start'? value : '09:00', end: kind==='end'? value : '17:00', role: 'shift', employeeId: empId, employeeName: employees.find(e=> e.id===empId)?.name || '', source:'manual', positions: [] }); return; }
    updateShift(s.id, { [kind]: value } as any);
  };

  const onPositionsChange=(empId:string, dateIso:string, newList: string[])=>{
    const s = ensureShift(empId, dateIso);
    updateShift(s.id, { positions: newList });
  };

  const hoursFor=(s?: { start?:string; end?:string })=> s?.start && s?.end ? Math.max(0, (minutes(s.end)-minutes(s.start))/60) : 0;

  function cellColorFor(s: any, d: Date): string | undefined {
    if(s?.color) return s.color;
    for(const r of conditionalRules){
      if(r.enabled===false) continue;
      if(matchesRule(r, s, d)) return r.color;
    }
    return undefined;
  }

  function matchesRule(r: ConditionalRule, s: any, d: Date): boolean {
    if(!s) return r.type==='unassigned';
    switch(r.type){
      case 'unassigned': return !s.employeeId;
      case 'startBefore': return !!s.start && minutes(s.start) < toMinutes(r.value);
      case 'startAfter': return !!s.start && minutes(s.start) > toMinutes(r.value);
      case 'endAfter': return !!s.end && minutes(s.end) > toMinutes(r.value);
      case 'durationGte': return hoursFor(s) >= Number(r.value||0);
      case 'roleIs': return (s.role||'').toLowerCase() === String(r.value||'').toLowerCase();
      case 'positionIncludes': return (s.positions||[]).some((p:string)=> p.toLowerCase().includes(String(r.value||'').toLowerCase()));
      case 'dayIs': return d.getDay()===Number(r.value||0);
      default: return false;
    }
  }

  function toMinutes(v: any){ if(typeof v==='number') return v*60; const [h,m]=String(v).split(':').map((x:string)=> parseInt(x||'0',10)); return h*60+(m||0); }

  const shiftWarnings=(empId:string, d: Date)=>{
    const emp = employees.find(e=> e.id===empId);
    const iso=dayIso(d);
    const s = shifts.find(x=> x.employeeId===empId && x.date===iso);
    if(!emp || !s) return [] as string[];
    const notes: string[] = [];
    const dow = d.getDay();
    if((emp.cannotWorkDays||[]).includes(dow)) notes.push('Pref: day off');
    if(emp.preferLeaveBy && s.end && minutes(s.end) > minutes(emp.preferLeaveBy)) notes.push(`Pref: leave by ${emp.preferLeaveBy}`);
    if(emp.preferStartAfter && s.start && minutes(s.start) < minutes(emp.preferStartAfter)) notes.push(`Pref: start after ${emp.preferStartAfter}`);
    if(emp.amOnly && s.start && minutes(s.start)>=12*60) notes.push('Pref: AM only');
    if(emp.amOnly && s.end && minutes(s.end)>12*60) notes.push('Pref: AM only');
    if(emp.pmOnly && s.start && minutes(s.start)<12*60) notes.push('Pref: PM only');
    return notes;
  };

  const totalsByDay = React.useMemo(()=>{
    if(!totalsActive) return new Map<string, { hours:number; dollars:number; ot:number; pto:number; sick:number }>();
    const map = new Map<string, { hours:number; dollars:number; ot:number; pto:number; sick:number }>();
    days.forEach(d=>{ const iso=dayIso(d); let hours=0, dollars=0, ot=0, pto=0, sick=0;
      employees.forEach(emp=>{ const s = shifts.find(x=> x.employeeId===emp.id && x.date===iso); const h = hoursFor(s); hours += h; const rate = emp.payRate || 0; dollars += h * rate; if(h>8) ot += (h-8); if(s?.leaveType==='PTO') pto += h; if(s?.leaveType==='SICK') sick += h; });
      map.set(iso, { hours, dollars, ot, pto, sick });
    });
    return map;
  }, [totalsActive, shifts, employees, weekIso]);

  const weeklyTotalsByEmp = React.useMemo(()=>{
    if(!totalsActive) return employees.map(emp=> ({ empId: emp.id, hours: 0, weeklyOT: 0, pto: 0, sick: 0, dollars: 0 }));
    return employees.map(emp=>{
      const weekShifts = shifts.filter(s=> s.employeeId===emp.id && s.date>=dayIso(days[0]) && s.date<=dayIso(days[6]));
      const hours = weekShifts.reduce((acc,s)=> acc + hoursFor(s), 0);
      const weeklyOT = Math.max(0, hours - 40);
      const pto = weekShifts.filter(s=> s.leaveType==='PTO').reduce((a,s)=> a+hoursFor(s),0);
      const sick = weekShifts.filter(s=> s.leaveType==='SICK').reduce((a,s)=> a+hoursFor(s),0);
      const rate = emp.payRate || 0;
      const dollars = hours*rate + weeklyOT*rate*0.5; // time-and-a-half premium
      return { empId: emp.id, hours, weeklyOT, pto, sick, dollars };
    });
  }, [totalsActive, shifts, employees, weekIso]);

  const [payTarget, setPayTarget] = React.useState<string|null>(null);
  const targetEmp = payTarget ? employees.find(e=> e.id===payTarget) || null : null;

  // Selection & clipboard for copy/paste between cells when titles match
  const [selected, setSelected] = React.useState<{ empId:string; date:string }|null>(null);
  const [clipboard, setClipboard] = React.useState<{ start:string; end:string; positions:string[]; titleKey:string }|null>(null);
  const titleKeyFor=(empId:string)=>{ const emp=employees.find(e=> e.id===empId); return (emp?.cookTitle || `COOK ${emp?.level}` || '').toString().toUpperCase().trim(); };
  const doCopy=()=>{ if(!selected) return; const s = shifts.find(x=> x.employeeId===selected.empId && x.date===selected.date); if(!s||!s.start||!s.end) return; setClipboard({ start:s.start, end:s.end, positions:[...(s.positions||[])], titleKey: titleKeyFor(selected.empId) }); };
  const doPaste=()=>{ if(!selected || !clipboard) return; const targetTitle = titleKeyFor(selected.empId); if(targetTitle!==clipboard.titleKey) return; const sh = ensureShift(selected.empId, selected.date); updateShift(sh.id, { start: clipboard.start, end: clipboard.end, positions: [...clipboard.positions] }); };

  return (
    <div className="scheduler-wrap" tabIndex={0} onKeyDown={(e)=>{ if((e.ctrlKey||e.metaKey) && (e.key==='c'||e.key==='C')){ e.preventDefault(); doCopy(); } if((e.ctrlKey||e.metaKey) && (e.key==='v'||e.key==='V')){ e.preventDefault(); doPaste(); } }}>
      <div className="overflow-x-auto overflow-y-hidden" ref={scrollRef}>
        <div className="flex justify-end mb-1 pr-1">
          <button className="text-[10px] underline opacity-70 hover:opacity-100" onClick={()=> addSeparator('')}>+ add separator</button>
        </div>
        <table className="min-w-full border-separate" style={{ borderSpacing: '2px' }}>
          <thead>
            <tr>
              <th className="border border-black px-0.5 py-0.5 bg-blue-50 text-left shadow-sm dark:bg-gradient-to-b dark:from-[#0b2b5e] dark:to-[#0a1e3d] dark:text-blue-100 dark:shadow-[0_0_6px_rgba(255,255,255,0.25)]">Employee</th>
              {days.map(d=> { const iso=dayIso(d); const meta=eventsByDate.get(iso)!; return (
                <th key={iso} className="border border-black px-0.5 py-0.5 bg-blue-50 text-center leading-tight shadow-sm dark:bg-gradient-to-b dark:from-[#0b2b5e] dark:to-[#0a1e3d] dark:text-blue-100 dark:shadow-[0_0_6px_rgba(255,255,255,0.25)]">
                  <div className="text-[11px] text-muted-foreground truncate">{meta.titles.join(' • ') || '—'}</div>
                  <div className="text-[11px]">{(meta.covers || 0)} covers</div>
                  <div className="text-xs font-medium">{fmtDay(d)}</div>
                </th>
              );})}
              <th ref={totalsHeaderRef} className="border border-black px-2 py-1 bg-blue-50 text-left shadow-sm dark:bg-gradient-to-b dark:from-[#0b2b5e] dark:to-[#0a1e3d] dark:text-blue-100 dark:shadow-[0_0_6px_rgba(255,255,255,0.25)]">Week Totals</th>
            </tr>
          </thead>
          <tbody>
            {rowItems.map((it, idx)=>{
              if(it.type==='sep'){
                const colSpan = 1 + days.length + 1; // employee + days + totals
                return (
                  <tr key={it.id} className="align-top cursor-move" draggable onDragStart={(e)=> e.dataTransfer.setData('text/x-row', String(idx))} onDragOver={(e)=> e.preventDefault()} onDrop={(e)=>{ const from=Number(e.dataTransfer.getData('text/x-row')); if(!Number.isNaN(from) && from!==idx) moveRow(from, idx); }}>
                    <td className="border border-black px-2 py-1" colSpan={colSpan} style={{ background: (it as any).color || '#e2e8f0' }}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs">Section</span>
                        <input className="flex-1 px-2 py-1 text-xs border rounded text-black" placeholder="Add note or section label" defaultValue={(it as any).label} onBlur={(e)=> updateSeparator(it.id, e.currentTarget.value)} />
                        <label className="text-xs">Color</label>
                        <input type="color" value={(it as any).color || '#e2e8f0'} onChange={e=> setSeparatorColor(it.id, e.currentTarget.value)} />
                      </div>
                    </td>
                  </tr>
                );
              }
              const emp = employees.find(e=> e.id===it.id)!;
              const agg=weeklyTotalsByEmp.find(x=> x.empId===emp.id) || { empId: emp.id, hours: 0, weeklyOT: 0, pto: 0, sick: 0, dollars: 0 };
              return (
                <tr key={emp.id} className="align-top cursor-move" draggable onDragStart={(e)=> e.dataTransfer.setData('text/x-row', String(idx))} onDragOver={(e)=> e.preventDefault()} onDrop={(e)=>{ const from=Number(e.dataTransfer.getData('text/x-row')); if(!Number.isNaN(from) && from!==idx) moveRow(from, idx); }}>
                  <td className="border border-black px-0.5 py-0.5 min-w-[96px] bg-slate-50 shadow-sm dark:bg-transparent dark:shadow-[0_0_6px_rgba(255,255,255,0.25)]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold truncate">{emp.name.toUpperCase().split(' ')[0]} {emp.name.toUpperCase().split(' ')[1]?.[0] || ''}</div>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{emp.cookTitle || `COOK ${emp.level}`}</div>
                  </td>
                  {days.map(d=> { const iso=dayIso(d); const s = shifts.find(x=> x.employeeId===emp.id && x.date===iso); const warns = shiftWarnings(emp.id, d); const isSelected = selected?.empId===emp.id && selected?.date===iso; const canPaste = !!clipboard && titleKeyFor(emp.id)===clipboard.titleKey; return (
                  <td key={iso} className={`relative border border-black px-0.5 py-0.5 align-top shadow-sm ${warns.length? 'ring-1 ring-red-500' : ''} ${isSelected? 'ring-2 ring-blue-500': ''}`} title={warns.join('\n')} onClick={()=> setSelected({ empId: emp.id, date: iso })} style={{ background: cellColorFor(s, d) || (typeof document!=='undefined' && document.documentElement.classList.contains('dark')? 'transparent' : '#f8fafc') }}>
                    {warns.length>0 && (<span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />)}
                    {isSelected && (
                      <div className="absolute right-0.5 -top-2 flex gap-1">
                        <button className="text-[10px] px-1 py-0.5 rounded border bg-white/80" onClick={(e)=>{ e.stopPropagation(); doCopy(); }}>Copy</button>
                        <button className={`text-[10px] px-1 py-0.5 rounded border ${canPaste? 'bg-white/80' : 'bg-gray-200 cursor-not-allowed'}`} disabled={!canPaste} onClick={(e)=>{ e.stopPropagation(); doPaste(); }}>Paste</button>
                        <label className="text-[10px] px-1 py-0.5 rounded border bg-white/80 cursor-pointer">
                          Color
                          <input type="color" className="hidden" onChange={(e)=>{ e.stopPropagation(); const sh = ensureShift(emp.id, iso); updateShift(sh.id, { color: e.currentTarget.value }); }} />
                        </label>
                        {s?.color && (<button className="text-[10px] px-1 py-0.5 rounded border bg-white/80" onClick={(e)=>{ e.stopPropagation(); if(s) updateShift(s.id, { color: undefined }); }}>Clear</button>)}
                      </div>
                    )}
                    <div className="grid gap-y-1" style={{ gridTemplateColumns: '5rem .75rem 5rem' }}>
                      <FuzzyTimeInput value={s?.start || ''} onChange={(v)=> onTimeChange(emp.id, iso, 'start', v)} />
                      <span className="text-[11px] opacity-70 text-center">→</span>
                      <FuzzyTimeInput value={s?.end || ''} onChange={(v)=> onTimeChange(emp.id, iso, 'end', v)} />
                      {s && (<button className={`text-[10px] ml-1 px-1 py-0.5 rounded border ${s.swapRequested? 'bg-yellow-500/20 border-yellow-500':'opacity-60 hover:opacity-100'}`} onClick={()=> updateShift(s.id, { swapRequested: !s.swapRequested })}>⇄ swap</button>)}
                      <input list={`positions-${iso}`} className="border rounded px-1.5 py-0.5 text-xs col-span-3 w-full text-black dark:text-black placeholder:text-black/60" placeholder="Add job position" onKeyDown={e=>{
                        if(e.key==='Enter'){
                          const v = (e.target as HTMLInputElement).value.trim(); if(!v) return; onPositionsChange(emp.id, iso, Array.from(new Set([...(s?.positions||[]), v]))); (e.target as HTMLInputElement).value='';
                        }
                      }} />
                      <datalist id={`positions-${iso}`}>
                          {positions.map(p=> (<option key={p} value={p} />))}
                        </datalist>
                        <div className="flex flex-wrap gap-1 mt-0.5 col-span-3"
                             onDragOver={(e)=> e.preventDefault()}
                             onDrop={(e)=>{ const d=e.dataTransfer.getData('text/x-pos'); if(!d) return; try{ const { index:from }=JSON.parse(d); const sh=ensureShift(emp.id, iso); const arr=[...(sh.positions||[])]; if(from<0||from>=arr.length) return; const [m]=arr.splice(from,1); arr.push(m); updateShift(sh.id, { positions: arr }); }catch{} }}>
                          {(s?.positions||[]).map((p,i)=> (
                            <span key={p}
                                  className="relative text-[10px] pl-3 pr-1 py-0.5 rounded border border-black bg-background/50 cursor-grab active:cursor-grabbing select-none text-black dark:text-black"
                                  draggable
                                  onDragStart={(e)=>{ e.dataTransfer.setData('text/x-pos', JSON.stringify({ index: i })); }}
                                  onDragOver={(e)=> e.preventDefault()}
                                  onDrop={(e)=>{ e.preventDefault(); e.stopPropagation(); const d=e.dataTransfer.getData('text/x-pos'); if(!d) return; try{ const { index:from }=JSON.parse(d); if(from===i) return; const sh=ensureShift(emp.id, iso); const arr=[...(sh.positions||[])]; const [m]=arr.splice(from,1); const to = from < i ? i-1 : i; arr.splice(Math.max(0,Math.min(arr.length, to)), 0, m); updateShift(sh.id, { positions: arr }); }catch{} }}>
                              <span className="absolute left-0.5 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none"><GripVertical className="h-3 w-3"/></span>
                              <span>{p}</span>
                              <button className="ml-1 text-[10px] opacity-60 hover:opacity-100" onClick={()=> onPositionsChange(emp.id, iso, (s?.positions||[]).filter(x=> x!==p))}>×</button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                  );})}
                  <td className="border border-black px-2 py-1 text-xs align-top bg-slate-100 shadow-sm dark:bg-muted/20 dark:shadow-[0_0_6px_rgba(255,255,255,0.25)]">
                  <div className="flex items-center justify-between"><span className="font-semibold">{agg.hours.toFixed(2)} Hrs</span><span /></div>
                  <div className="flex items-center justify-between"><span>OT</span><span className="font-semibold">{agg.weeklyOT.toFixed(2)}h</span></div>
                  {agg.pto>0 && (<div className="flex items-center justify-between"><span>PTO</span><span className="font-semibold">{agg.pto.toFixed(2)}h</span></div>)}
                  {agg.sick>0 && (<div className="flex items-center justify-between"><span>Sick</span><span className="font-semibold">{agg.sick.toFixed(2)}h</span></div>)}
                  <div className="flex items-center justify-between"><span className="font-semibold">Total ${agg.dollars.toFixed(2)}</span><span /></div>
                </td>
                </tr>
              );
            })}
            {/* Totals Row */}
            <tr>
              <td className="border border-black px-2 py-1 bg-blue-50 font-medium shadow-sm dark:bg-gradient-to-b dark:from-[#0b2b5e] dark:to-[#0a1e3d] dark:text-blue-100 dark:shadow-[0_0_6px_rgba(255,255,255,0.25)]">Daily Totals</td>
              {days.map(d=> { const iso=dayIso(d); const t = totalsByDay.get(iso) || { hours: 0, dollars: 0, ot: 0, pto: 0, sick: 0 }; return (
                <td key={iso} className="border border-black px-2 py-1 bg-slate-50 text-xs shadow-sm dark:bg-muted/10 dark:shadow-[0_0_6px_rgba(255,255,255,0.25)]">
                  <div className="flex items-center justify-between"><span className="font-semibold">{t.hours.toFixed(2)} Hrs</span><span /></div>
                  <div className="flex items-center justify-between"><span className="font-semibold">Total ${t.dollars.toFixed(2)}</span><span /></div>
                  <div className="flex items-center justify-between"><span>OT</span><span className="font-semibold">{t.ot.toFixed(2)}h</span></div>
                  {t.pto>0 && (<div className="flex items-center justify-between"><span>PTO</span><span className="font-semibold">{t.pto.toFixed(2)}h</span></div>)}
                  {t.sick>0 && (<div className="flex items-center justify-between"><span>Sick</span><span className="font-semibold">{t.sick.toFixed(2)}h</span></div>)}
                </td>
              );})}
              <td className="border border-black px-2 py-1 bg-slate-100 text-xs shadow-sm dark:bg-muted/20 dark:shadow-[0_0_6px_rgba(255,255,255,0.25)]"></td>
            </tr>
          </tbody>
        </table>
      </div>
      <PayRateDialog employee={targetEmp} onClose={()=> setPayTarget(null)} />
    </div>
  );
};

export default EmployeeWeekGrid;
