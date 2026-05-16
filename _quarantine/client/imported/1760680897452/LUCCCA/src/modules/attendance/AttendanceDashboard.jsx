import React, { useMemo, useState } from "react";
import { loadPunches } from "./attendanceStore";
import { parseTimeHM } from "../../../frontend/src/modules/scheduling/utils";

function gauge(value, min, max){
  const pct = Math.max(0, Math.min(1, (value-min)/(max-min||1)));
  const angle = -120 + pct * 240;
  return (
    <svg width="180" height="120" viewBox="0 0 180 120">
      <path d="M10,110 A80,80 0 1,1 170,110" fill="none" stroke="#e5e7eb" strokeWidth="16"/>
      <line x1="90" y1="110" x2={90+70*Math.cos(angle*Math.PI/180)} y2={110+70*Math.sin(angle*Math.PI/180)} stroke="#111827" strokeWidth="4" />
    </svg>
  );
}

export default function AttendanceDashboard({ employees, weekStartISO }) {
  const [punches] = useState(loadPunches());
  // Simple KPIs per 1000 shifts (demo)
  const metrics = useMemo(() => {
    let shifts=0, abs=0, tardy=0, missed=0, noBreak=0, longBreak=0;
    // In real use, compare to schedule for that day (start time vs IN)
    Object.values(punches).forEach(byEmp => {
      Object.values(byEmp).forEach(rec=>{
        const p = rec.punches||[];
        if (!p.length) { missed++; return; }
        shifts++;
        // tardy: first IN after 15 minutes from scheduled (placeholder logic—wire to schedule start)
        const firstIn = p.find(x=>x.in)?.in;
        if (firstIn && parseTimeHM(firstIn) > parseTimeHM("00:15")) tardy++;
      });
    });
    return { shifts, abs, tardy, missed, noBreak, longBreak };
  }, [punches]);

  return (
    <div style={{padding:10}}>
      <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:16}}>
        <div><div className="small">Absenteeism</div>{gauge(metrics.abs,0,10)}</div>
        <div><div className="small">Tardiness</div>{gauge(metrics.tardy,0,50)}</div>
        <div><div className="small">Missed Punches</div>{gauge(metrics.missed,0,50)}</div>
        <div><div className="small">Attendance Points</div>{gauge(metrics.tardy+metrics.missed,0,100)}</div>
      </div>
    </div>
  );
}
