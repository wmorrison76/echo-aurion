import React from 'react';
import { startOfWeek, addDays, toISODate, fmtDay } from './time';
import { useAttendanceStore } from './useAttendanceStore';
import { Button } from '../..//components/ui/button';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const WeekGrid: React.FC<{ baseDate?: Date }>=({ baseDate })=>{
  const refDate = baseDate || new Date();
  const weekStart = startOfWeek(refDate);
  const days = React.useMemo(()=> Array.from({length:7}, (_,i)=> addDays(weekStart,i)), [refDate.getTime()]);
  const isoWeek = toISODate(weekStart);
  const { shifts, addShift, removeShift } = useAttendanceStore();

  const byDay = React.useMemo(()=>{
    return days.map(d=> ({ date: toISODate(d), items: shifts.filter(s=> s.date===toISODate(d)) }));
  }, [shifts, isoWeek]);

  return (
    <div className="scheduler-wrap">
      <div className="grid grid-cols-8 border rounded overflow-hidden">
        <div className="bg-muted/40 border-r p-2 text-xs">Time</div>
        {days.map(d=> (
          <div key={d.toISOString()} className="bg-muted/40 border-r p-2 text-xs text-center">{fmtDay(d)}</div>
        ))}
        {HOURS.map(h=> (
          <React.Fragment key={h}>
            <div className="border-t px-2 py-3 text-xs text-right bg-muted/10">{String(h).padStart(2,'0')}:00</div>
            {days.map(d=> (
              <div key={d.toISOString()+h} className="grid-backdrop border-t relative h-14">
                <button className="absolute top-1 right-1 text-[10px] underline opacity-60 hover:opacity-100" onClick={()=> addShift({ date: toISODate(d), start: `${String(h).padStart(2,'0')}:00`, end: `${String(Math.min(h+2,23)).padStart(2,'0')}:00`, role: 'prep' })}>+ add</button>
                <div className="absolute inset-0 p-1 space-y-1 overflow-auto">
                  {byDay.find(x=> x.date===toISODate(d))?.items
                    .filter(s=> Number(s.start.slice(0,2))===h)
                    .map(s=> (
                      <div key={s.id} className="rounded border bg-white/70 dark:bg-slate-900/60 px-2 py-1 text-xs shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate font-medium">{s.employeeName || s.role}</div>
                          <button className="text-[10px] underline opacity-60 hover:opacity-100" onClick={()=> removeShift(s.id)}>remove</button>
                        </div>
                        <div className="text-[10px] opacity-70">{s.start} - {s.end}</div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default WeekGrid;
