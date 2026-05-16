import React, { useMemo, useState } from "react";
import { loadPunches, recordPunch, savePunches } from "./attendanceStore";
import { parseTimeHM } from "../../../frontend/src/modules/scheduling/utils";

export default function AttendancePanel({ employees }) {
  const [punches, setPunches] = useState(loadPunches());
  const [dayISO, setDayISO] = useState(() => new Date().toISOString().slice(0,10));
  
  const mailSchedule = (emp) => {
  const row = weekSchedule[emp.id] || [];
  const lines = Array.from({length:7}).map((_,i)=>{
    const s = row[i] || {};
    const d = days[i].toLocaleDateString();
    return `${d}: ${s.start||"--"} - ${s.end||"--"}  ${s.position||emp.position||""} ${s.leave?`(${s.leave})`:""}`;
  }).join("%0D%0A");
  const subject = encodeURIComponent(`Your Schedule • week of ${new Date(weekStartDate).toLocaleDateString()}`);
  const body = encodeURIComponent(`Hi ${emp.name||""},%0D%0A%0D%0AHere is your schedule:%0D%0A%0D%0A${lines}%0D%0A%0D%0A— Scheduler`);
  const to = emp.email || ""; // add an email field on your employee rows if you want
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
};
const mailSchedule = (emp) => {
  const row = weekSchedule[emp.id] || [];
  const lines = Array.from({length:7}).map((_,i)=>{
    const s = row[i] || {};
    const d = days[i].toLocaleDateString();
    return `${d}: ${s.start||"--"} - ${s.end||"--"}  ${s.position||emp.position||""} ${s.leave?`(${s.leave})`:""}`;
  }).join("%0D%0A");
  const subject = encodeURIComponent(`Your Schedule • week of ${new Date(weekStartDate).toLocaleDateString()}`);
  const body = encodeURIComponent(`Hi ${emp.name||""},%0D%0A%0D%0AHere is your schedule:%0D%0A%0D%0A${lines}%0D%0A%0D%0A— Scheduler`);
  const to = emp.email || ""; // add an email field on your employee rows if you want
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
};

  const listed = useMemo(() => {
    return employees.filter(e=>e.active).map(e => ({
      id: e.id, name: e.name || "(unnamed)", position: e.position || "",
      rec: punches?.[dayISO]?.[e.id] || { punches: [] }
    }));
  }, [employees, punches, dayISO]);

  const punchIn = (empId, inHM) => setPunches(recordPunch({ empId, dateISO: dayISO, inHM, outHM: null }));
  const punchOut = (empId, outHM) => setPunches(recordPunch({ empId, dateISO: dayISO, inHM: null, outHM }));

  return (
    <div style={{padding:10}}>
      <div style={{display:"flex", gap:8, alignItems:"center"}}>
        <strong>Attendance</strong>
        <input type="date" value={dayISO} onChange={e=>setDayISO(e.target.value)} />
        <button className="btn" onClick={()=>{ savePunches(punches); alert("Saved."); }}>Save</button>
      </div>
      <table className="forte-table" style={{marginTop:8}}>
        <thead>
          <tr><th>Employee</th><th>Position</th><th>Punches</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {listed.map(r=>(
            <tr key={r.id}>
              <td><strong>{r.name}</strong></td>
              <td>{r.position}</td>
              <td className="small">{(r.rec.punches||[]).map((p,i)=><div key={i}>IN {p.in||"—"} / OUT {p.out||"—"}</div>)}</td>
              <td style={{display:"flex", gap:6}}>
                <input placeholder="HH:MM" style={{width:80}} id={`in-${r.id}`} />
                <button className="btn" onClick={()=> punchIn(r.id, document.getElementById(`in-${r.id}`).value)}>In</button>
                <input placeholder="HH:MM" style={{width:80}} id={`out-${r.id}`} />
                <button className="btn" onClick={()=> punchOut(r.id, document.getElementById(`out-${r.id}`).value)}>Out</button>
              <button className="btn" onClick={()=>mailSchedule(emp)}>Email</button>
            <button className="btn" onClick={()=>mailSchedule(emp)}>Email</button>

              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
