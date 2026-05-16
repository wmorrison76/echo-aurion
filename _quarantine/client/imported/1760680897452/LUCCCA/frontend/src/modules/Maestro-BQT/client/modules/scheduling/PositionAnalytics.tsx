import React from 'react';
import { useAttendanceStore } from './useAttendanceStore';
import { useBEOStore } from '../../stores/beoStore';
import { useScheduleSettings } from './scheduleSettingsStore';
import { toISODate, addDays } from './time';

function hours(start?:string,end?:string){
  if(!start||!end) return 0;
  const [sh,sm]=start.split(':').map(Number), [eh,em]=end.split(':').map(Number);
  return Math.max(0, ((eh*60+em)-(sh*60+sm))/60);
}

export const PositionAnalytics: React.FC<{ baseDate?: Date }>=({ baseDate })=>{
  const { shifts, weekOf } = useAttendanceStore();
  const { events } = useBEOStore();
  const { startDay } = useScheduleSettings();
  const ref = baseDate || new Date();
  const weekStart = (()=>{ const d=new Date(ref); const dow=d.getDay(); const diff = startDay - dow + (startDay<=dow?0: -7); d.setDate(d.getDate()+diff); d.setHours(0,0,0,0); return d; })();
  const fromIso = toISODate(weekStart);
  const toIso = toISODate(addDays(weekStart,6));

  const evById = React.useMemo(()=>{ const m=new Map<string, any>(); events.forEach(e=> m.set(e.id, e)); return m; }, [events]);

  type Row = { eventId:string; eventTitle:string; date:string; position:string; hours:number; staff:number; guests:number };
  const rows: Row[] = React.useMemo(()=>{
    const map = new Map<string, { hours:number; staff:Set<string>; meta:{title:string;date:string;guests:number} }>();
    shifts.filter(s=> s.date>=fromIso && s.date<=toIso).forEach(s=>{
      const h = hours(s.start, s.end);
      const evId = s.eventId || 'none';
      const ev = evById.get(evId);
      const meta = { title: ev?.title || (evId==='none'?'(No Event)':`Event ${evId}`), date: s.date, guests: ev?.guestCount || 0 };
      const positions = (s.positions && s.positions.length>0)? s.positions : [s.role || 'shift'];
      const per = h / Math.max(1, positions.length);
      positions.forEach(p=>{
        const key = `${evId}|${s.date}|${p.toLowerCase()}`;
        const agg = map.get(key) || { hours:0, staff:new Set<string>(), meta };
        agg.hours += per;
        if(s.employeeId) agg.staff.add(s.employeeId);
        map.set(key, agg);
      });
    });
    return Array.from(map.entries()).map(([key, v])=>{
      const [eventId] = key.split('|');
      const position = key.split('|')[2];
      return { eventId, eventTitle: v.meta.title, date: v.meta.date, position, hours: Number(v.hours.toFixed(2)), staff: v.staff.size, guests: v.meta.guests } as Row;
    }).sort((a,b)=> a.date.localeCompare(b.date) || a.eventTitle.localeCompare(b.eventTitle) || a.position.localeCompare(b.position));
  }, [shifts, fromIso, toIso, evById]);

  const exportCsv=()=>{
    const header = ['eventId','eventTitle','date','position','hours','staff','guests'];
    const body = rows.map(r=> [r.eventId,r.eventTitle,r.date,r.position,r.hours,r.staff,r.guests]);
    const csv = [header, ...body].map(r=> r.map(x=> `"${String(x).replace(/\"/g,'"')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`position_analytics_${fromIso}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if(rows.length===0) return null;

  return (
    <div className="mt-3 rounded border bg-background/60 shadow-sm">
      <div className="flex items-center justify-between px-2 py-1 border-b">
        <div className="text-sm font-medium">Position Analytics (per event)</div>
        <button className="underline text-xs" onClick={exportCsv}>Export CSV</button>
      </div>
      <div className="overflow-auto max-h-80">
        <table className="min-w-full text-xs border-separate" style={{ borderSpacing:'2px' }}>
          <thead>
            <tr>
              <th className="border border-black bg-blue-50 px-2 py-1 text-left">Event</th>
              <th className="border border-black bg-blue-50 px-2 py-1 text-left">Date</th>
              <th className="border border-black bg-blue-50 px-2 py-1 text-left">Position</th>
              <th className="border border-black bg-blue-50 px-2 py-1 text-right">Hours</th>
              <th className="border border-black bg-blue-50 px-2 py-1 text-right">Staff</th>
              <th className="border border-black bg-blue-50 px-2 py-1 text-right">Guests</th>
              <th className="border border-black bg-blue-50 px-2 py-1 text-right">Hrs/100 guests</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>{
              const per100 = r.guests>0? (r.hours/(r.guests/100)) : 0;
              return (
                <tr key={i}>
                  <td className="border border-black bg-slate-50 px-2 py-1">{r.eventTitle}</td>
                  <td className="border border-black bg-slate-50 px-2 py-1">{r.date}</td>
                  <td className="border border-black bg-slate-50 px-2 py-1 capitalize">{r.position.replace(/_/g,' ')}</td>
                  <td className="border border-black bg-slate-50 px-2 py-1 text-right">{r.hours.toFixed(2)}</td>
                  <td className="border border-black bg-slate-50 px-2 py-1 text-right">{r.staff}</td>
                  <td className="border border-black bg-slate-50 px-2 py-1 text-right">{r.guests}</td>
                  <td className="border border-black bg-slate-50 px-2 py-1 text-right">{per100.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PositionAnalytics;
