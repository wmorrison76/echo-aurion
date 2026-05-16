/**
 * MobileScheduler.jsx
 * Touch-oriented schedule grid with day slider and drag handles.
 * No external UI libs; minimal Tailwind-compatible classes.
 */
import React, { useMemo, useRef, useState } from "react";
import { useScheduleStore } from "../hooks/useScheduleStore.js";
import * as T from "../utils/time.js";

function EmpRow({ emp, dayStart }){
  const { state, updateShift } = useScheduleStore();
  const rowRef = useRef(null);
  const shifts = useMemo(()=> state.shifts.filter(s=> s.empId===emp.id), [state.shifts, emp.id]);

  const onDrag = (e, shift) => {
    const row = rowRef.current;
    if (!row) return;
    const rect = row.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const hours = Math.max(0, Math.min(24, pct * 24));
    const start = dayStart + hours * T.HOUR;
    const [s,eMs] = T.clampRange(start, start + 8*T.HOUR);
    updateShift({ ...shift, start:s, end:eMs });
  };

  return (
    <div ref={rowRef} className="relative h-14 border-b border-white/10">
      <div className="absolute left-2 top-1 text-xs opacity-80">{emp.name}</div>
      {shifts.map(shift=>{
        const left = ((shift.start - dayStart) / T.DAY) * 100;
        const width = Math.max(6, ((shift.end - shift.start)/T.DAY) * 100);
        return (
          <div key={shift.id}
            className="absolute top-6 h-6 rounded-lg bg-white/10 flex items-center px-2 text-xs"
            style={{ left:`${left}%`, width:`${width}%` }}
            onMouseDown={(e)=>{ e.preventDefault(); const move = (ev)=>onDrag(ev, shift); const up = ()=>{window.removeEventListener("mousemove",move); window.removeEventListener("mouseup",up);}; window.addEventListener("mousemove",move); window.addEventListener("mouseup",up);}}
          >
            {new Date(shift.start).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}
            &nbsp;–&nbsp;
            {new Date(shift.end).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}
          </div>
        );
      })}
    </div>
  );
}

export default function MobileScheduler({ seed }){
  const { state, addEmployee, addShift, seed:seedStore } = useScheduleStore();
  const [dayStart, setDayStart] = useState(()=> {
    const d = new Date(); d.setHours(0,0,0,0); return d.getTime();
  });

  // seed once
  React.useEffect(()=>{ if (seed) seedStore(seed); }, [seed]);

  const hours = useMemo(()=> Array.from({length:25},(_,i)=> new Date(dayStart + i*T.HOUR)), [dayStart]);

  return (
    <div className="mobile-scheduler rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-3 flex items-center justify-between bg-white/5">
        <div className="text-sm font-medium">Mobile Scheduler</div>
        <div className="flex gap-2 items-center text-xs">
          <button onClick={()=>setDayStart(s=>s - T.DAY)} className="px-2 py-1 rounded bg-white/10">Prev</button>
          <button onClick={()=>setDayStart(s=>s + T.DAY)} className="px-2 py-1 rounded bg-white/10">Next</button>
        </div>
      </div>

      <div className="grid grid-cols-[120px_1fr]">
        <div className="bg-white/3 text-[10px] p-2">
          {state.employees.map(emp => <div key={emp.id} className="h-14 flex items-center">{emp.name}</div>)}
        </div>
        <div className="relative">
          <div className="grid grid-cols-24 text-[10px] h-8 bg-white/5">
            {hours.slice(0,24).map((h,i)=>(<div key={i} className="border-r border-white/10 flex items-center justify-center">{h.getHours()}</div>))}
          </div>
          <div>
            {state.employees.map(emp => <EmpRow key={emp.id} emp={emp} dayStart={dayStart} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
