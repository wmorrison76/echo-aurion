import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../..//components/ui/sheet';
import { useStaffStore } from '../../stores/staffStore';
import { useAttendanceStore } from './useAttendanceStore';
import { toISODate } from './time';

export const PersonnelSheet: React.FC<{ open:boolean; onOpenChange:(v:boolean)=>void; weekDates: string[] }>=({ open, onOpenChange, weekDates })=>{
  const { employees, addEmployee } = useStaffStore();
  const { addShift, shifts } = useAttendanceStore();
  const [name, setName] = React.useState('');
  const [q, setQ] = React.useState('');
  const [maxHours, setMaxHours] = React.useState<number>(40);
  const weekFrom = weekDates[0]; const weekTo = weekDates[weekDates.length-1];
  const hoursFor=(s:{start?:string;end?:string})=> s.start&&s.end? (parseInt(s.end.slice(0,2))*60+parseInt(s.end.slice(3)) - (parseInt(s.start.slice(0,2))*60+parseInt(s.start.slice(3))))/60 : 0;
  const hoursByEmp = React.useMemo(()=>{
    const map = new Map<string, number>();
    employees.forEach(e=> map.set(e.id,0));
    shifts.filter(s=> s.date>=weekFrom && s.date<=weekTo).forEach(s=>{ if(!s.employeeId) return; map.set(s.employeeId, (map.get(s.employeeId)||0)+hoursFor(s)); });
    return map;
  }, [employees, shifts, weekFrom, weekTo]);
  const filtered = React.useMemo(()=>{
    return employees
      .filter(e=> e.name.toLowerCase().includes(q.toLowerCase()))
      .filter(e=> (hoursByEmp.get(e.id)||0) <= maxHours)
      .sort((a,b)=> (hoursByEmp.get(a.id)||0) - (hoursByEmp.get(b.id)||0));
  }, [employees, q, maxHours, hoursByEmp]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[460px]">
        <SheetHeader>
          <SheetTitle>Personnel</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <input className="border rounded px-2 py-1 flex-1" placeholder="Add employee (Name)" value={name} onChange={e=> setName(e.target.value)} />
            <button className="border rounded px-2" onClick={()=> { if(!name.trim()) return; addEmployee(name.trim()); setName(''); }}>Add</button>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <input className="border rounded px-2 py-1 flex-1" placeholder="Search employees" value={q} onChange={e=> setQ(e.target.value)} />
            <label>Max hrs this week</label>
            <input type="number" className="border rounded px-2 py-1 w-20" min={0} step={1} value={maxHours} onChange={e=> setMaxHours(parseFloat(e.target.value||'0'))} />
          </div>
          <div className="max-h-[60vh] overflow-auto divide-y rounded border">
            {filtered.map(emp=> (
              <div key={emp.id} className="p-2 text-sm">
                <div className="flex items-center justify-between gap-2 sticky top-0 z-10 py-1 bg-background dark:bg-slate-900">
                  <div className="font-semibold truncate">{emp.name.toUpperCase()}</div>
                  <div className="text-xs opacity-70">${emp.payRate?.toFixed(2) || '0.00'}/hr</div>
                </div>
                <div className="text-[11px] opacity-70 truncate">{emp.cookTitle || `Cook ${emp.level}`}</div>
                <div className="text-[11px]">This week: {(hoursByEmp.get(emp.id)||0).toFixed(2)} Hrs</div>
                <div className="mt-2 flex items-center gap-2">
                  <select className="border rounded px-2 py-1 text-xs">
                    {weekDates.map(d=> (<option key={d} value={d}>{d}</option>))}
                  </select>
                  <input className="border rounded px-2 py-1 text-xs w-24" placeholder="Start (e.g. 9:00)" />
                  <input className="border rounded px-2 py-1 text-xs w-24" placeholder="End (e.g. 17:00)" />
                  <button className="border rounded px-2 py-1 text-xs" onClick={(e)=>{
                    const row = (e.currentTarget.parentElement as HTMLElement);
                    const date = (row.querySelector('select') as HTMLSelectElement).value;
                    const start = (row.querySelectorAll('input')[0] as HTMLInputElement).value || '09:00';
                    const end = (row.querySelectorAll('input')[1] as HTMLInputElement).value || '17:00';
                    addShift({ date, start, end, role: 'shift', employeeId: emp.id, employeeName: emp.name, source:'manual' });
                  }}>Add Shift</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PersonnelSheet;
