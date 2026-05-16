import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Download, ChevronLeft, ChevronRight, CalendarDays, Settings, Users, Shield, Palette, Info, ClipboardList, Send, Copy } from "lucide-react";
import { appendAudit, evaluateCompliance, getComplianceConfig } from "@/lib/compliance";
import { useMemo, useState } from "react";
import { DayKey, DAYS, EmployeeRow, exportCSV, newEmployee, parseTimeRange } from "@/lib/schedule";
import { loadSettings, saveSettings, ScheduleSettings } from "./settings";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface Props {
  weekStartISO: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onPickDate: (iso: string) => void;
  employees: EmployeeRow[];
  onEmployeesChange: (next: EmployeeRow[]) => void;
}

export default function Toolbar({ weekStartISO, onPrev, onNext, onToday, onPickDate, employees, onEmployeesChange }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [personnelOpen, setPersonnelOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  const settings = useMemo(() => loadSettings(), [settingsOpen]);

  const download = () => {
    if (settings.securityRequireConfirmToExport && !confirm("Export CSV?")) return;
    const csv = exportCSV({ weekStartISO, employees });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `schedule_${weekStartISO}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const exportICS = (weekISO: string, employees: EmployeeRow[]) => {
    const start = new Date(weekISO);
    const dayDate = (i: number) => { const d = new Date(start); d.setDate(start.getDate()+i); return d; };
    const pad = (n:number)=> String(n).padStart(2,'0');
    const dt = (d: Date, t: string) => {
      const m = t ? t : "00:00";
      const [hh,mm] = (m.includes(":")? m : `${m}:00`).split(":");
      const dc = new Date(d); dc.setHours(Number(hh), Number(mm), 0, 0);
      const y = dc.getFullYear(); const mo = pad(dc.getMonth()+1); const da = pad(dc.getDate());
      const H = pad(dc.getHours()); const M = pad(dc.getMinutes());
      return `${y}${mo}${da}T${H}${M}00`;
    };
    let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ShiftFlow//EN\n";
    employees.forEach(e=>{
      for(let i=0;i<7;i++){
        const key = DAYS[i]; const c = e.shifts[key]; if(!(c.in && c.out)) continue;
        const d = dayDate(i);
        const uid = `${e.id}-${weekISO}-${i}`;
        ics += `BEGIN:VEVENT\nUID:${uid}\nSUMMARY:${e.name} (${c.position||e.role||"Shift"})\nDTSTART:${dt(d, c.in!)}\nDTEND:${dt(d, c.out!)}\nEND:VEVENT\n`;
      }
    });
    ics += "END:VCALENDAR\n";
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download=`schedule_${weekISO}.ics`; a.click(); URL.revokeObjectURL(url);
  };

  const autoSchedule = (_weekISO: string, employees: EmployeeRow[], onEmployeesChange: (e:EmployeeRow[])=>void) => {
    const fill = (e: EmployeeRow) => {
      const next = { ...e, shifts: { ...e.shifts } };
      const set = (k: DayKey) => { next.shifts[k] = { ...(next.shifts[k]||{} as any), in: "09:00", out: "17:00", value: "09:00-17:00", range: null, breakMin: 30, position: next.shifts[k]?.position || e.role || "" } as any; };
      ["Mon","Tue","Wed","Thu","Fri"].forEach((k)=> set(k as DayKey));
      return next;
    };
    onEmployeesChange(employees.map(fill));
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto" onWheel={(e)=>{ if(Math.abs(e.deltaY)>20){ (e.deltaY>0? onNext: onPrev)(); } }}>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev} aria-label="Prev week"><ChevronLeft/></Button>
        <Button variant="outline" size="sm" onClick={onToday}><CalendarDays className="mr-1"/>Today</Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNext} aria-label="Next week"><ChevronRight/></Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">{weekStartISO}</Button>
          </PopoverTrigger>
          <PopoverContent className="p-0">
            <Calendar mode="single" selected={new Date(weekStartISO)} onSelect={(d)=> d && onPickDate(d.toISOString().slice(0,10))} initialFocus />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center gap-1 ml-1">
        <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Copy className="mr-1"/>Copy Week</Button>
          </DialogTrigger>
          <CopyWeekDialog weekStartISO={weekStartISO} employees={employees} onEmployeesChange={onEmployeesChange} onClose={()=>setCopyOpen(false)}/>
        </Dialog>
        <Button variant="outline" size="sm" onClick={download}><Download className="mr-1"/>Export CSV</Button>
        <Button variant="outline" size="sm" onClick={()=>exportICS(weekStartISO, employees)}><Download className="mr-1"/>Export ICS</Button>
        <Button variant="outline" size="sm" onClick={()=>autoSchedule(weekStartISO, employees, onEmployeesChange)}><ClipboardList className="mr-1"/>Auto-Build</Button>
        <ScheduleCheckerDialog weekStartISO={weekStartISO} employees={employees} />
        <ImportDialog employees={employees} onEmployeesChange={onEmployeesChange} />
        <Dialog open={sendOpen} onOpenChange={(v)=>{ setSendOpen(v); if(v){ appendAudit(weekStartISO, { ts: Date.now(), type: 'publish', meta: {} }); localStorage.setItem(`shiftflow:publishedAt:${weekStartISO}`, String(Date.now())); } }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Send className="mr-1"/>Publish</Button>
          </DialogTrigger>
          <SendDialog weekStartISO={weekStartISO} employees={employees} />
        </Dialog>
        <a className="underline text-xs text-muted-foreground" href="#" onClick={(e)=>{e.preventDefault(); const s=`Schedule for week ${weekStartISO}`; const b=`Hi team, the schedule is ready.`; window.open(`mailto:?subject=${encodeURIComponent(s)}&body=${encodeURIComponent(b)}`,'_blank');}}>Send week to staff</a>
        <Dialog open={personnelOpen} onOpenChange={setPersonnelOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Users className="mr-1"/>Personnel</Button>
          </DialogTrigger>
          <PersonnelDialog employees={employees} onEmployeesChange={onEmployeesChange} />
        </Dialog>
        <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Info className="mr-1"/>Employee Info</Button>
          </DialogTrigger>
          <InfoDialog employees={employees} />
        </Dialog>
        <Dialog open={formatOpen} onOpenChange={setFormatOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Palette className="mr-1"/>Formatting</Button>
          </DialogTrigger>
          <FormattingDialog />
        </Dialog>
        <Dialog open={securityOpen} onOpenChange={setSecurityOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Shield className="mr-1"/>Security</Button>
          </DialogTrigger>
          <SecurityDialog />
        </Dialog>
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Settings className="mr-1"/>Policies</Button>
          </DialogTrigger>
          <SettingsDialog settings={settings} onSave={(s)=>{ saveSettings(s); }}/>
        </Dialog>
      </div>
    </div>
  );
}

function SettingsDialog({ settings, onSave }: { settings: ScheduleSettings; onSave: (s: ScheduleSettings)=>void }) {
  const [s, setS] = useState(settings);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Policies</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <label className="text-sm">Overtime threshold (h/week)
          <Input type="number" value={s.overtimeThreshold} onChange={(e)=>setS({...s, overtimeThreshold:Number(e.target.value)})}/>
        </label>
        <label className="text-sm">Default hourly rate ($)
          <Input type="number" value={s.hourlyDefaultRate} onChange={(e)=>setS({...s, hourlyDefaultRate:Number(e.target.value)})}/>
        </label>
        <label className="text-sm">Weekly budget ($)
          <Input type="number" value={s.weeklyBudget} onChange={(e)=>setS({...s, weeklyBudget:Number(e.target.value)})}/>
        </label>
        <label className="text-sm">Weekly sales ($)
          <Input type="number" value={s.weeklySales} onChange={(e)=>setS({...s, weeklySales:Number(e.target.value)})}/>
        </label>
      </div>
      <DialogFooter>
        <Button onClick={()=>onSave(s)}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function SecurityDialog() {
  const [s, setS] = useState(loadSettings());
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Security</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <label className="text-sm inline-flex items-center gap-2">
          <input type="checkbox" checked={s.securityRequireConfirmToExport} onChange={(e)=>{const ns={...s, securityRequireConfirmToExport:e.target.checked}; setS(ns); saveSettings(ns);}}/>
          Require confirm on export
        </label>
      </div>
    </DialogContent>
  );
}

function FormattingDialog() {
  const [s, setS] = useState(loadSettings());
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Formatting</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <label className="text-sm inline-flex items-center gap-2">
          <input type="checkbox" checked={s.timeFormat24h} onChange={(e)=>{const ns={...s, timeFormat24h:e.target.checked}; setS(ns); saveSettings(ns);}}/>
          Use 24-hour time
        </label>
        <label className="text-sm">Calendars
          <select className="ml-2 border rounded-md px-2 py-1" value={s.calendarSet as any}
            onChange={(e)=>{ const ns = { ...s, calendarSet: e.target.value as any }; setS(ns); saveSettings(ns); }}>
            <option value="none">None</option>
            <option value="federal">Federal</option>
            <option value="christian">Christian</option>
            <option value="jewish">Jewish</option>
            <option value="all">All</option>
          </select>
        </label>
        <label className="text-sm">Week starts on
          <select className="ml-2 border rounded-md px-2 py-1" value={s.startDay}
            onChange={(e)=>{ const ns = { ...s, startDay: Number(e.target.value) as any }; setS(ns); saveSettings(ns); }}>
            <option value={0}>Sunday</option>
            <option value={1}>Monday</option>
            <option value={2}>Tuesday</option>
            <option value={3}>Wednesday</option>
            <option value={4}>Thursday</option>
            <option value={5}>Friday</option>
            <option value={6}>Saturday</option>
          </select>
        </label>
      </div>
    </DialogContent>
  );
}

function InfoDialog({ employees }: { employees: EmployeeRow[] }) {
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Employee Info</DialogTitle></DialogHeader>
      <div className="grid gap-2 text-sm">
        {employees.map(e=> (
          <div key={e.id} className="flex items-center justify-between border rounded-md p-2">
            <div>
              <div className="font-medium">{e.name}</div>
              {e.role && <div className="text-muted-foreground">{e.role}</div>}
            </div>
            {typeof e.rate === 'number' && <div>${e.rate.toFixed(2)}/h</div>}
          </div>
        ))}
      </div>
    </DialogContent>
  );
}

function PersonnelDialog({ employees, onEmployeesChange }: { employees: EmployeeRow[]; onEmployeesChange: (e: EmployeeRow[])=>void }) {
  const [list, setList] = useState(employees);
  const update = (idx: number, patch: Partial<EmployeeRow>) => setList(prev => prev.map((e,i)=> i===idx? { ...e, ...patch }: e));
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Personnel</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        {list.map((e, i)=> (
          <div key={e.id} className="grid grid-cols-12 gap-2 items-center">
            <Input className="col-span-5" value={e.name} onChange={(ev)=>update(i, { name: ev.target.value })} />
            <Input className="col-span-4" placeholder="Role" value={e.role ?? ""} onChange={(ev)=>update(i, { role: ev.target.value })} />
            <Input className="col-span-2" type="number" placeholder="Rate" value={e.rate ?? "" as any} onChange={(ev)=>update(i, { rate: Number(ev.target.value) })} />
            <Button variant="destructive" onClick={()=> setList(prev => prev.filter((_,idx)=> idx!==i))}>Remove</Button>
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button onClick={()=> onEmployeesChange(list)}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function SendDialog({ weekStartISO, employees }: { weekStartISO: string; employees: EmployeeRow[] }) {
  const subject = `Schedule for week ${weekStartISO}`;
  const body = `Hi team,%0D%0A%0D%0AThe schedule for week ${weekStartISO} is ready.%0D%0APlease check the portal for details.`;
  const mailto = `mailto:?subject=${subject}&body=${body}`;
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Publish / Send</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">Use the button below to open your email client with a prefilled message.</p>
      <a href={mailto} className="underline text-primary" target="_blank" rel="noreferrer">Open email</a>
    </DialogContent>
  );
}

function CopyWeekDialog({ weekStartISO, employees, onEmployeesChange, onClose }: { weekStartISO: string; employees: EmployeeRow[]; onEmployeesChange: (e: EmployeeRow[])=>void; onClose: ()=>void }) {
  const [direction, setDirection] = useState<"prev"|"next">("prev");
  const copy = () => {
    const offset = direction === "prev" ? -7 : 7;
    const prevKey = `shiftflow:schedule:${offset}`;
    const newEmps = employees.map((e)=> ({
      ...e,
      shifts: { ...e.shifts }
    }));
    onEmployeesChange(newEmps);
    onClose();
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Copy Week</DialogTitle></DialogHeader>
      <div className="text-sm">Choose direction to copy shifts into this week.</div>
      <div className="flex gap-3 py-2">
        <label className="inline-flex items-center gap-2"><input type="radio" name="dir" checked={direction==='prev'} onChange={()=>setDirection('prev')}/>From Previous Week</label>
        <label className="inline-flex items-center gap-2"><input type="radio" name="dir" checked={direction==='next'} onChange={()=>setDirection('next')}/>From Next Week</label>
      </div>
      <DialogFooter>
        <Button onClick={copy}>Copy</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ScheduleCheckerDialog({ weekStartISO, employees }: { weekStartISO: string; employees: EmployeeRow[] }){
  const [open, setOpen] = useState(false);
  const baseline = (()=>{
    const out: string[] = [];
    employees.forEach(e=>{
      (DAYS as DayKey[]).forEach(d=>{
        const c = e.shifts[d];
        if (!c) return;
        const has = (c.in && c.out) || c.value;
        if (!has && (c.position||"").trim().length>0) out.push(`${e.name} ${d}: position without time`);
        if (c.in && c.out) {
          const r = parseTimeRange(`${c.in}-${c.out}`);
          if (r && (r.end - r.start) > 12*60) out.push(`${e.name} ${d}: shift exceeds 12h`);
        }
      });
    });
    return out;
  })();
  const s = loadSettings();
  const publishedAt = Number(localStorage.getItem(`shiftflow:publishedAt:${weekStartISO}`) || 0) || undefined;
  const cc = getComplianceConfig();
  const rep = evaluateCompliance(weekStartISO, employees, { predictiveNoticeDays: cc.predictiveNoticeDays, restPeriodHours: cc.restPeriodHours, maxConsecutiveDays: cc.maxConsecutiveDays, overtimeThreshold: s.overtimeThreshold }, publishedAt);
  const issues = [...baseline, ...rep.issues.map(i=> i.message)];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Schedule Checker</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Schedule Checker</DialogTitle></DialogHeader>
        {issues.length? (
          <ul className="list-disc pl-5 text-sm space-y-1">{issues.map((x,i)=>(<li key={i}>{x}</li>))}</ul>
        ): (
          <div className="text-sm text-emerald-500">No issues found for week {weekStartISO}.</div>
        )}
        <div className="text-xs text-muted-foreground mt-2">Overtime hours: {rep.overtimeHours.toFixed(2)} • Predictability pay hours: {rep.predictabilityPayHours.toFixed(2)}</div>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({ employees, onEmployeesChange }: { employees: EmployeeRow[]; onEmployeesChange: (e: EmployeeRow[])=>void }){
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const apply = () => {
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length) return;
    const header = lines.shift()!;
    const cols = header.split(/,|\t/).map(s=>s.trim());
    const idx: Record<string, number> = {};
    cols.forEach((c,i)=> idx[c.toLowerCase()] = i);
    const byName = new Map(employees.map(e=>[e.name.toLowerCase(), e] as const));
    const next = [...employees];
    for (const line of lines){
      if (!line.trim()) continue;
      const parts = line.split(/,|\t/);
      const name = parts[idx["employee"]] || parts[0];
      if (!name) continue;
      let row = byName.get(name.toLowerCase());
      if (!row) { row = newEmployee(name); next.push(row); byName.set(name.toLowerCase(), row); }
      (DAYS as DayKey[]).forEach((d)=>{
        const v = parts[idx[d] ?? -1] ?? "";
        if (!v) return;
        const r = parseTimeRange(v);
        row!.shifts[d] = { ...(row!.shifts[d]||{} as any), value: v, range: r, in: v.split(/-|to/)[0], out: v.split(/-|to/)[1] } as any;
      });
    }
    onEmployeesChange(next);
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Import</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Import CSV/TSV</DialogTitle></DialogHeader>
        <div className="text-xs text-muted-foreground">Header: Employee, Mon, Tue, Wed, Thu, Fri, Sat, Sun (times "09:00-17:00")</div>
        <textarea className="w-full h-40 border rounded-md p-2 text-sm" value={text} onChange={(e)=>setText(e.target.value)} />
        <DialogFooter>
          <Button onClick={apply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
