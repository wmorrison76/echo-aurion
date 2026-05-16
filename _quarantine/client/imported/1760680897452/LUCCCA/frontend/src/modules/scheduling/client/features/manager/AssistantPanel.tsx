import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useMemo, useState } from "react";
import { EmployeeRow, weeklyHours, DayKey } from "@/lib/schedule";
import { getComplianceConfig, evaluateCompliance } from "@/lib/compliance";
import { Input } from "@/components/ui/input";

const HELP: Record<string,string> = {
  "export csv": "Toolbar > Export CSV. Generates vendor-agnostic CSV.",
  "copy week": "Toolbar > Copy Week dialog lets you duplicate from prev/next.",
  "missed punch": "Employee mobile > Missed Punch form sends approval request.",
  "overtime": "Schedule Checker and bottom bar show OT; reduce hours or redistribute shifts.",
  "forecast graph": "Tiny sparkline above the date. Click to open analytics.",
};

function suggestions(employees: EmployeeRow[]){
  const s: string[] = [];
  const cfg = getComplianceConfig();
  // OT risks
  for (const e of employees){
    const h = weeklyHours(e);
    if (h > cfg.overtimeThreshold){
      s.push(`${e.name}: ${h.toFixed(1)}h > ${cfg.overtimeThreshold}h. Suggest reduce by ${(h-cfg.overtimeThreshold).toFixed(1)}h or swap a shift.`);
    }
  }
  // Rest period issues
  const rep = evaluateCompliance("", employees, cfg);
  rep.issues.filter(i=>i.kind==="rest").forEach(i=> s.push(i.message));
  if (!s.length) s.push("No urgent issues. Consider optimizing low-utilization days.");
  return s;
}

export default function AssistantPanel({ employees }:{ employees: EmployeeRow[] }){
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const sugg = useMemo(()=> suggestions(employees), [employees]);
  const answer = useMemo(()=>{
    const k = Object.keys(HELP).find(k=> q.toLowerCase().includes(k));
    return k? HELP[k] : (q ? "No direct match. Try keywords like 'export csv', 'copy week', 'missed punch', 'overtime'." : "Ask how-to questions or click suggestions.");
  },[q]);

  useEffect(()=>{
    const fn = ()=> setOpen(true);
    window.addEventListener('shiftflow:open-assistant' as any, fn as any);
    return ()=> window.removeEventListener('shiftflow:open-assistant' as any, fn as any);
  },[]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Assistant</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Ask a question (e.g., 'export csv')" value={q} onChange={(e)=>setQ(e.target.value)} />
          <div className="text-sm">{answer}</div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Optimization suggestions</div>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {sugg.map((s,i)=> <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
