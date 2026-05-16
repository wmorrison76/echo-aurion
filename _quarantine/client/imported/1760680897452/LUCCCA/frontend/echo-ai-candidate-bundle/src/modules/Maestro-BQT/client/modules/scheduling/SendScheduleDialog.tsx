import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../..//components/ui/dialog';
import { Button } from '../..//components/ui/button';
import { useAttendanceStore } from './useAttendanceStore';
import { useStaffStore } from '../../stores/staffStore';
import { addDays, toISODate, startOfWeek } from './time';

function formatWeekText(weekIso: string, emp: { id:string; name:string }, shifts: any[]): string{
  const byDay: Record<string, {start?:string; end?:string; role?:string}[]> = {};
  shifts.forEach(s=>{ if(!byDay[s.date]) byDay[s.date]=[]; byDay[s.date].push({ start:s.start, end:s.end, role: s.role }); });
  const days = Array.from({length:7},(_,i)=> toISODate(addDays(new Date(weekIso+'T00:00:00'), i)));
  const lines: string[] = [];
  lines.push(`Schedule for ${emp.name} (Week of ${weekIso})`);
  days.forEach(d=>{ const items=byDay[d]||[]; if(items.length===0) lines.push(`${d}: —`); else items.forEach(it=> lines.push(`${d}: ${it.start} - ${it.end} • ${it.role}`)); });
  lines.push('Notes: This summary excludes costs and totals.');
  return lines.join('\n');
}

export const SendScheduleDialog: React.FC<{ open:boolean; onOpenChange:(v:boolean)=>void; week?: Date }>=({ open, onOpenChange, week })=>{
  const base = week || new Date();
  const weekStart = startOfWeek(base);
  const weekIso = toISODate(weekStart);
  const { shifts } = useAttendanceStore();
  const { employees } = useStaffStore();
  const weekShifts = shifts.filter(s=> s.date>=weekIso && s.date<=toISODate(addDays(weekStart,6)));

  const sendMail=(empId:string)=>{
    const emp = employees.find(e=> e.id===empId); if(!emp) return;
    const my = weekShifts.filter(s=> s.employeeId===empId);
    const body = encodeURIComponent(formatWeekText(weekIso, emp, my));
    const to = encodeURIComponent(emp.email||'');
    window.location.href = `mailto:${to}?subject=${encodeURIComponent('Your Schedule')}&body=${body}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Send Schedule to Staff</DialogTitle>
        </DialogHeader>
        <div className="text-xs text-muted-foreground mb-2">No totals or money are included.</div>
        <div className="max-h-[60vh] overflow-auto divide-y rounded border">
          {employees.map(emp=>{
            const my = weekShifts.filter(s=> s.employeeId===emp.id);
            const txt = formatWeekText(weekIso, emp, my);
            return (
              <div key={emp.id} className="p-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{emp.name}</div>
                  <div className="text-xs opacity-70">{emp.email||'no email' } • {emp.phone||''}</div>
                </div>
                <pre className="mt-1 p-2 text-xs bg-muted rounded max-h-32 overflow-auto whitespace-pre-wrap">{txt}</pre>
                <div className="flex gap-2 mt-1">
                  <Button size="sm" variant="outline" onClick={()=> navigator.clipboard.writeText(txt)}>Copy</Button>
                  <Button size="sm" onClick={()=> sendMail(emp.id)} disabled={!emp.email}>Email</Button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-xs mt-2">For SMS/WhatsApp/Slack automation, connect Zapier MCP and we can wire this to your channels.</div>
      </DialogContent>
    </Dialog>
  );
};
