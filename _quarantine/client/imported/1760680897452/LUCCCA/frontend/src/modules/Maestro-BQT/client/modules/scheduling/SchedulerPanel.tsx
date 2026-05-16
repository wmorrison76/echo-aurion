import React from 'react';
import { SchedulerToolbar } from './Toolbar';
import { EmployeeWeekGrid } from './EmployeeWeekGrid';
import { useAttendanceStore } from './useAttendanceStore';
import { startOfWeek, toISODate, addDays } from './time';
import { estimateHeadcountForEvent, mergeRequirements } from './laborMath';
import { Badge } from '../..//components/ui/badge';
import { useBEOStore } from '../../stores/beoStore';
import { useStaffStore } from '../../stores/staffStore';
import { CopyWeekModal } from './CopyWeekModal';
import { useScheduleSettings } from './scheduleSettingsStore';
import { SchedulerSettingsDialog } from './SchedulerSettingsDialog';
import { PersonnelSheet } from './PersonnelSheet';
import { EmployeeInfoDialog } from './EmployeeInfoDialog';
import { PolicyDialog } from './PolicyDialog';
import { PositionAnalytics } from './PositionAnalytics';
import { ConditionalFormattingDialog } from './ConditionalFormattingDialog';
import { SendScheduleDialog } from './SendScheduleDialog';
import { SecurityDialog } from './SecurityDialog';

export const SchedulerPanel: React.FC<{ date?: Date }>=({ date })=>{
  const baseDate = date || new Date();
  const { startDay, weeklyLaborBudget, unionRules, logoUrl } = useScheduleSettings();
  const week = (()=>{ const d=new Date(baseDate); const dow=d.getDay(); const diff = startDay - dow + (startDay<=dow?0: -7); d.setDate(d.getDate()+diff); d.setHours(0,0,0,0); return d; })();
  const weekIso = toISODate(week);
  const { events } = useBEOStore();
  const { employees } = useStaffStore();
  const { shifts, setWeekOf, addShift, publishWeek, isPublished, weekNotes, setWeekNote } = useAttendanceStore();
  const [copyOpen, setCopyOpen] = React.useState(false);
  const [checker, setChecker] = React.useState<{ ok:boolean; details: string[] }>({ ok: true, details: [] });
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [peopleOpen, setPeopleOpen] = React.useState(false);
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [policyOpen, setPolicyOpen] = React.useState(false);
  const [formatOpen, setFormatOpen] = React.useState(false);
  const [sendOpen, setSendOpen] = React.useState(false);
  const [securityOpen, setSecurityOpen] = React.useState(false);

  React.useEffect(()=> { setWeekOf(weekIso); }, [weekIso]);

  const autoBuild = ()=>{
    const weekEvents = events.filter(e=> e.date >= weekIso && e.date <= toISODate(addDays(week,6)));
    const reqs = weekEvents.flatMap(ev=> estimateHeadcountForEvent(ev));
    // naive assign: create placeholder shifts for required headcount, 6h per shift
    reqs.forEach(r=> {
      const currentForRole = shifts.filter(s=> s.date===r.date && s.role===r.role).length;
      const needed = Math.max(0, r.required - currentForRole);
      for(let i=0;i<needed;i++){
        addShift({ date: r.date, start: '14:00', end: '20:00', role: r.role, eventId: r.eventId, source:'auto' });
      }
    });
  };

  const validate = ()=>{
    const weekEvents = events.filter(e=> e.date >= weekIso && e.date <= toISODate(addDays(week,6)));
    const reqs = weekEvents.flatMap(ev=> estimateHeadcountForEvent(ev));
    const needMap = mergeRequirements(reqs);
    const issues: string[] = [];
    Object.entries(needMap).forEach(([key, required])=>{
      const [date, role] = key.split('|');
      const scheduled = shifts.filter(s=> s.date===date && s.role===role).length;
      if(scheduled < required) issues.push(`${date} • ${role.replace('_',' ')} short by ${required - scheduled}`);
    });
    setChecker({ ok: issues.length===0, details: issues });
  };

  const exportCsv = ()=>{
    const rows = [['date','start','end','role','employee'] as string[]].concat(shifts.map(s=> [s.date,s.start,s.end,s.role,s.employeeName||'']));
    const csv = rows.map(r=> r.map(v=> `"${String(v).replace(/\"/g,'"')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`schedule_${weekIso}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const copyWeek = (offset:number)=>{
    const target = new Date(week); target.setDate(target.getDate() + offset*7);
    const toIso = toISODate(startOfWeek(target));
    // reuse store copy via clear+copy would be destructive; for now we append via store.copyWeek
    // implemented in store as copyWeek(from,to)
    (useAttendanceStore.getState() as any).copyWeek(weekIso, toIso);
    setCopyOpen(false);
  };

  // KPI metrics
  const weekDates = Array.from({length:7},(_,i)=> toISODate(addDays(week,i)));
  const eventsThisWeek = events.filter(e=> e.date>=weekIso && e.date<=toISODate(addDays(week,6))).length;
  const todayIso = toISODate(new Date());
  const completedToday = shifts.filter(s=> s.date===todayIso && s.end <= new Date().toTimeString().slice(0,5)).length;
  const staffAssigned = new Set(shifts.filter(s=> s.date>=weekIso && s.date<=toISODate(addDays(week,6)) && s.employeeId).map(s=> s.employeeId!)).size;
  // shortage (pending)
  const reqs = events.filter(e=> e.date>=weekIso && e.date<=toISODate(addDays(week,6))).flatMap(ev=> estimateHeadcountForEvent(ev));
  const needMap = mergeRequirements(reqs);
  const pending = Object.entries(needMap).reduce((acc,[key,req])=>{ const [date, role]=key.split('|'); const scheduled=shifts.filter(s=> s.date===date && s.role===role).length; return acc + Math.max(0, req - scheduled); },0);
  // labor cost
  const { employees: emps } = useStaffStore();
  const hoursFor=(s:{start:string;end:string})=> { const [sh,sm]=s.start.split(':').map(Number), [eh,em]=s.end.split(':').map(Number); return Math.max(0, ((eh*60+em)-(sh*60+sm))/60); };
  const weekShifts = shifts.filter(s=> s.date>=weekIso && s.date<=toISODate(addDays(week,6)));
  const totalHours = weekShifts.reduce((a,s)=> a + (s.start && s.end? hoursFor(s as any):0), 0);
  const totalCost = weekShifts.reduce((a,s)=> { const rate = emps.find(e=> e.id===s.employeeId)?.payRate || 0; return a + (s.start && s.end? hoursFor(s as any)*rate:0); }, 0);
  const weeklyOt = React.useMemo(()=>{
    const byEmp = new Map<string, number>();
    weekShifts.forEach(s=>{ if(!(s.start&&s.end&&s.employeeId)) return; const h=hoursFor(s as any); byEmp.set(s.employeeId!, (byEmp.get(s.employeeId!)||0) + h); });
    let ot=0; byEmp.forEach(h=> { ot += Math.max(0, h - 40); });
    return ot;
  }, [weekShifts.length]);
  const budget = weeklyLaborBudget || 0;
  const variance = totalCost - budget;
  const published = isPublished(weekIso);

  // Compliance checks: union rules where enabled and general checks
  const complianceIssues = React.useMemo(()=>{
    const details: string[] = [];
    emps.forEach(emp=>{
      const empShifts = weekShifts.filter(s=> s.employeeId===emp.id).sort((a,b)=> a.date.localeCompare(b.date));
      let daysWorked=0; let prevEnd: {date:string; minutes:number}|null=null;
      empShifts.forEach(s=>{
        if(s.start && s.end){
          const [sh,sm]=s.start.split(':').map(Number), [eh,em]=s.end.split(':').map(Number);
          const dur = ((eh*60+em)-(sh*60+sm))/60;
          const otThresh = unionRules.enabled? unionRules.overtimeAfterHours : 12;
          const dtThresh = unionRules.enabled? unionRules.doubletimeAfterHours : 14;
          if(dur>dtThresh) details.push(`${emp.name} >${dtThresh}h on ${s.date}`);
          if(unionRules.enabled && dur>otThresh) details.push(`${emp.name} OT >${otThresh}h on ${s.date}`);
          const endMin = eh*60+em;
          const minTurn = (unionRules.enabled? unionRules.minTurnaroundHours : 8) * 60;
          if(prevEnd && (sh*60+sm) - prevEnd.minutes < minTurn) details.push(`${emp.name} turnaround < ${minTurn/60}h on ${s.date}`);
          if(unionRules.enabled && unionRules.mealBreakEveryHours>0 && dur > unionRules.mealBreakEveryHours) details.push(`${emp.name} needs meal/rest break by ${unionRules.mealBreakEveryHours}h`);
          prevEnd = { date: s.date, minutes: endMin };
          daysWorked++;
        }
      });
      const maxDays = unionRules.enabled? unionRules.maxDaysPerWeek : 6;
      if(daysWorked>maxDays) details.push(`${emp.name} scheduled >${maxDays} days`);
    });
    return details;
  }, [weekShifts.length, emps.length]);

  const togglePublish=()=> publishWeek(weekIso, !published);

  return (
    <div className="space-y-2">
      {/* Logo and Week Header */}
      <div className="text-center space-y-1">
        {logoUrl && (
          <div className="flex justify-center">
            <img src={logoUrl} alt="property logo" className="h-12 md:h-16 w-auto mx-auto" />
          </div>
        )}
        <div className="text-xs opacity-80">Week of {toISODate(week)} – {toISODate(addDays(week,6))}</div>
      </div>

      {/* Toolbar & quick actions */}
      <div className="flex items-center gap-2 text-xs">
        <div className="ml-auto flex items-center gap-3">
          <button className="underline" onClick={()=> setPeopleOpen(true)}>Personnel</button>
          <button className="underline" onClick={()=> setInfoOpen(true)}>Employee Info</button>
          <button className="underline" onClick={()=> setSettingsOpen(true)}>Positions</button>
          <button className="underline" onClick={()=> setFormatOpen(true)}>Formatting</button>
          <button className="underline" onClick={()=> setSecurityOpen(true)}>Security</button>
          <button className="underline" onClick={()=> setPolicyOpen(true)}>Policies</button>
          {checker.ok? <Badge className="ml-1">OK</Badge> : <Badge variant="destructive" className="ml-1">Issues</Badge>}
        </div>
      </div>
      <div className="-mt-1">
        <div className="flex items-center gap-2">
          <SchedulerToolbar onAutoBuild={autoBuild} onCopyWeek={()=> setCopyOpen(true)} onValidate={validate} onExport={exportCsv} published={published} onTogglePublish={togglePublish} />
          <button className="ml-2 text-xs underline" onClick={()=> setSendOpen(true)}>Send week to staff</button>
        </div>
      </div>

      {/* Chef Notes */}
      <div className="rounded border bg-background/60 p-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="font-medium">Notes</div>
          <div className="opacity-70">Shown on print</div>
        </div>
        <textarea
          className="mt-1 w-full border rounded px-2 py-1 text-sm min-h-[56px]"
          placeholder="Reminders, holidays, break policy, etc."
          defaultValue={weekNotes[weekIso]||''}
          onBlur={(e)=> setWeekNote(weekIso, e.currentTarget.value)}
        />
      </div>

      {/* Overall Totals vs Budget */}
      <div className="rounded border bg-background/60 p-2 text-xs">
        <div className="font-medium mb-1">Labor Summary (week)</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded border bg-slate-50 p-2 dark:bg-muted/20">
            <div className="text-[11px] opacity-70">Total Hours</div>
            <div className="text-sm font-semibold">{totalHours.toFixed(2)} Hrs</div>
          </div>
          <div className="rounded border bg-slate-50 p-2 dark:bg-muted/20">
            <div className="text-[11px] opacity-70">OT Hours (weekly)</div>
            <div className="text-sm font-semibold">{weeklyOt.toFixed(2)} h</div>
          </div>
          <div className="rounded border bg-slate-50 p-2 dark:bg-muted/20">
            <div className="text-[11px] opacity-70">Labor Cost</div>
            <div className="text-sm font-semibold">${totalCost.toFixed(2)}</div>
          </div>
          <div className="rounded border bg-slate-50 p-2 dark:bg-muted/20">
            <div className="text-[11px] opacity-70">Budget / Variance</div>
            <div className="text-sm font-semibold">${budget.toFixed(2)} • <span className={`${variance>0? 'text-red-600':'text-green-600'}`}>{variance>0? '+':''}${variance.toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      {complianceIssues.length>0 && (
        <div className="rounded border bg-amber-500/10 p-2 text-xs">
          <div className="font-medium mb-1">Compliance Warnings</div>
          <ul className="list-disc pl-5 space-y-1">
            {complianceIssues.map((d,i)=> (<li key={i}>{d}</li>))}
          </ul>
        </div>
      )}

      {/* Swap requests queue */}
      {weekShifts.some(s=> s.swapRequested) && (
        <div className="rounded border bg-background/60 p-2 text-xs">
          <div className="font-medium mb-1">Swap Requests</div>
          <div className="space-y-1">
            {weekShifts.filter(s=> s.swapRequested).map(s=> (
              <div key={s.id} className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{s.date}</span> • {s.start}-{s.end} • {s.role} • {s.employeeName||'Unassigned'}
                </div>
                <div className="flex items-center gap-2">
                  <button className="underline text-green-600" onClick={()=> (useAttendanceStore.getState().updateShift(s.id, { swapRequested:false, notes: (s.notes? s.notes+'; ':'') + 'swap approved' }))}>Approve</button>
                  <button className="underline text-red-600" onClick={()=> (useAttendanceStore.getState().updateShift(s.id, { swapRequested:false, notes: (s.notes? s.notes+'; ':'') + 'swap denied' }))}>Deny</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <EmployeeWeekGrid baseDate={week} />
      <PositionAnalytics baseDate={week} />
      {!checker.ok && (
        <div className="rounded border bg-destructive/10 p-2 text-sm">
          <div className="font-medium mb-1">Schedule Checker Issues</div>
          <ul className="list-disc pl-5 space-y-1">
            {checker.details.map((d,i)=> (<li key={i}>{d}</li>))}
          </ul>
        </div>
      )}
      <CopyWeekModal open={copyOpen} onOpenChange={setCopyOpen} onConfirm={copyWeek} />
      <SchedulerSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <PersonnelSheet open={peopleOpen} onOpenChange={setPeopleOpen} weekDates={Array.from({length:7},(_,i)=> toISODate(addDays(week,i)))} />
      <EmployeeInfoDialog open={infoOpen} onOpenChange={setInfoOpen} />
      <PolicyDialog open={policyOpen} onOpenChange={setPolicyOpen} />
      <ConditionalFormattingDialog open={formatOpen} onOpenChange={setFormatOpen} />
      <SendScheduleDialog open={sendOpen} onOpenChange={setSendOpen} week={week} />
      <SecurityDialog open={securityOpen} onOpenChange={setSecurityOpen} />
    </div>
  );
};

export default SchedulerPanel;
