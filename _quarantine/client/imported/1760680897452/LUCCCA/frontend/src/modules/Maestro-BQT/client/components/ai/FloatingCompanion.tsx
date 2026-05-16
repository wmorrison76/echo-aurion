import React from 'react';
import { MessageSquare, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAttendanceStore } from '../../modules/scheduling/useAttendanceStore';
import { useBEOStore } from '../../stores/beoStore';
import { estimateHeadcountForEvent, mergeRequirements } from '../../modules/scheduling/laborMath';
import { toISODate, addDays, startOfWeek } from '../../modules/scheduling/time';

interface Msg{ role:'user'|'assistant'; text:string; ts:number }

function insightsForPath(pathname:string){
  if(pathname.startsWith('/production')) return 'You are in Production. I can help with schedules, prep times, and coverage.';
  if(pathname.startsWith('/inventory')) return 'You are in Inventory. I can help highlight low stock items and prep needs.';
  if(pathname.startsWith('/calendar')) return 'You are in Calendar. I can summarize guest counts and staffing by date.';
  return 'How can I help? Ask about staffing, prep, or scheduling.';
}

function scheduleInsights(){
  try{
    const { events } = useBEOStore.getState();
    const { weekOf, shifts } = useAttendanceStore.getState();
    const weekStart = weekOf || toISODate(startOfWeek(new Date()));
    const weekEnd = toISODate(addDays(new Date(weekStart+'T00:00:00'),6));
    const weekEvents = events.filter(e=> e.date>=weekStart && e.date<=weekEnd);
    const reqs = weekEvents.flatMap(ev=> estimateHeadcountForEvent(ev));
    const need = mergeRequirements(reqs);
    const gaps: string[] = [];
    Object.entries(need).forEach(([key, required])=>{
      const [date, role] = key.split('|');
      const scheduled = shifts.filter(s=> s.date===date && s.role===role).length;
      const diff = required - scheduled;
      if(diff>0) gaps.push(`${date} ${role.replace('_',' ')} short ${diff}`);
    });
    const totalGuests = weekEvents.reduce((a,e)=> a + (e.guestCount || (e as any).guests || 0), 0);
    const prepHours = (totalGuests * 0.12).toFixed(1); // heuristic 0.12h/guest (7.2min)
    let out = `Week ${weekStart}–${weekEnd}. Guests: ${totalGuests}. Est prep: ${prepHours} hrs.`;
    if(gaps.length) out += ` Coverage gaps: ${gaps.slice(0,6).join('; ')}.`;
    else out += ' Coverage looks good.';
    const otByEmp = new Map<string,number>();
    shifts.filter(s=> s.date>=weekStart && s.date<=weekEnd).forEach(s=>{ if(!(s.start&&s.end&&s.employeeId)) return; const [sh,sm]=s.start.split(':').map(Number); const [eh,em]=s.end.split(':').map(Number); const h=Math.max(0, ((eh*60+em)-(sh*60+sm))/60); otByEmp.set(s.employeeId!, (otByEmp.get(s.employeeId!)||0)+h); });
    const atRisk = Array.from(otByEmp.entries()).filter(([,h])=> h>38).map(([id,h])=> `${useAttendanceStore.getState().shifts.find(s=> s.employeeId===id)?.employeeName||'emp'} ${h.toFixed(1)}h`);
    if(atRisk.length) out += ` OT risk: ${atRisk.slice(0,4).join(', ')}.`;
    return out;
  }catch{ return 'I can analyze schedule coverage, OT risk, and prep time if data is available.'; }
}

function generateReply(input:string, path:string){
  const q = input.trim().toLowerCase();
  if(path.includes('production') || q.includes('schedule') || q.includes('staff')){
    return scheduleInsights();
  }
  return insightsForPath(path);
}

export const FloatingCompanion: React.FC = ()=>{
  const { pathname } = useLocation();
  const [open, setOpen] = React.useState(false);
  const [msgs, setMsgs] = React.useState<Msg[]>([{ role:'assistant', text: insightsForPath(pathname), ts: Date.now() }]);
  const [input, setInput] = React.useState('');
  const typingRef = React.useRef<number|undefined>(undefined);

  React.useEffect(()=>{ setMsgs([{ role:'assistant', text: insightsForPath(pathname), ts: Date.now() }]); }, [pathname]);

  const onChange=(v:string)=>{
    setInput(v);
    if(typingRef.current) window.clearTimeout(typingRef.current);
    typingRef.current = window.setTimeout(()=>{
      if(!v.trim()) return;
      const user: Msg = { role:'user', text:v.trim(), ts: Date.now() };
      const reply: Msg = { role:'assistant', text: generateReply(v, pathname), ts: Date.now() };
      setMsgs(m=> [...m, user, reply]);
      setInput('');
    }, 700);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[10000]">
      {!open && (
        <button className="rounded-full h-12 w-12 bg-primary text-white shadow-lg flex items-center justify-center" aria-label="Open assistant" onClick={()=> setOpen(true)}>
          <MessageSquare className="h-6 w-6" />
        </button>
      )}
      {open && (
        <div className="w-80 sm:w-96 bg-background border rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="text-sm font-medium">Maestro Companion</div>
            <button className="text-xs opacity-70 hover:opacity-100" onClick={()=> setOpen(false)}><X className="h-4 w-4"/></button>
          </div>
          <div className="h-64 overflow-auto p-2 space-y-2 text-sm">
            {msgs.map((m,i)=> (
              <div key={i} className={`px-2 py-1 rounded ${m.role==='assistant'? 'bg-muted' : 'bg-primary text-primary-foreground ml-auto w-fit'}`}>{m.text}</div>
            ))}
          </div>
          <div className="p-2 border-t">
            <input autoFocus value={input} onChange={e=> onChange(e.target.value)} placeholder="Ask about coverage, prep, etc..." className="w-full border rounded px-2 py-1 text-sm" />
            <div className="text-[10px] opacity-60 mt-1">Auto-sends when you pause typing</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingCompanion;
