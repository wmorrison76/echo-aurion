import { EmployeeRow, DayKey } from "@/lib/schedule";
import TinySparkline from "@/components/charts/TinySparkline";
import { useMemo } from "react";

export default function ForecastSparkline({ employees }:{ employees: EmployeeRow[] }){
  const totalsByDay = useMemo(()=>{
    const sums = Array(7).fill(0);
    for(let i=0;i<7;i++){
      const day = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i] as DayKey;
      sums[i] = employees.reduce((s,e)=>{ const c=e.shifts[day]; const toMin=(t:string)=>{ const m=t.match(/(\d{1,2})(?::(\d{2}))?\s*(a|p)?/i); if(!m) return null; let h=+m[1]; const mm=+(m[2]||0); const ap=(m[3]||"").toLowerCase(); if(ap==='p'&&h<12) h+=12; if(ap==='a'&&h===12) h=0; return h*60+mm; }; if(c?.in&&c?.out){ const a=toMin(c.in), b=toMin(c.out); if(a!=null&&b!=null){ const mins=(b>=a? b-a : b+24*60-a) - (Number(c.breakMin||0)); return s + Math.max(0, mins/60); } } return s; },0);
    }
    return sums;
  },[employees]);
  const forecast = useMemo(()=> totalsByDay.map((v,i)=> Math.max(0, v * (i<5? 1.05:0.9))), [totalsByDay]);
  return <button aria-label="Open analytics" onClick={()=> window.dispatchEvent(new CustomEvent('shiftflow:open-analytics'))} className="-mb-1 ml-1 inline-block"><TinySparkline a={forecast} b={totalsByDay} width={110} height={22}/></button>;
}
