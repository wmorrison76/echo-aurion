import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { loadSettings, saveSettings } from "./settings";
import { getComplianceConfig, saveComplianceConfig } from "@/lib/compliance";

function Section({ title, children }: { title: string; children: React.ReactNode }){
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

export default function TopMenu(){
  const [open, setOpen] = useState<string|null>(null);
  const s0 = loadSettings();
  const c0 = getComplianceConfig();
  const [s, setS] = useState(s0);
  const [c, setC] = useState(c0);

  return (
    <div className="flex items-center gap-1 overflow-x-auto text-xs">
      {[
        {key:'legal', label:'Legal & Compliance'},
        {key:'union', label:'Union Agreements'},
        {key:'employee', label:'Employee Rights'},
        {key:'analytics', label:'Analytics'},
        {key:'financial', label:'Financial'},
        {key:'timeoff', label:'Time-off'},
        {key:'attendance', label:'Attendance'},
        {key:'reliability', label:'Reliability'},
      ].map(it=> (
        <Dialog key={it.key} open={open===it.key} onOpenChange={(v)=> setOpen(v? it.key: null)}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">{it.label}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{it.label}</DialogTitle></DialogHeader>
            {it.key==='legal' && (
              <div className="grid gap-3 text-sm">
                <Section title="Predictive Scheduling">
                  <label className="inline-flex items-center gap-2">Notice days
                    <Input type="number" value={c.predictiveNoticeDays} onChange={(e)=> setC({...c, predictiveNoticeDays: Number(e.target.value)})}/>
                  </label>
                </Section>
                <Section title="Rest & Overtime">
                  <label className="inline-flex items-center gap-2">Rest period (hours)
                    <Input type="number" value={c.restPeriodHours} onChange={(e)=> setC({...c, restPeriodHours: Number(e.target.value)})}/>
                  </label>
                  <label className="inline-flex items-center gap-2">Max consecutive days
                    <Input type="number" value={c.maxConsecutiveDays} onChange={(e)=> setC({...c, maxConsecutiveDays: Number(e.target.value)})}/>
                  </label>
                  <label className="inline-flex items-center gap-2">Weekly OT threshold (h)
                    <Input type="number" value={s.overtimeThreshold} onChange={(e)=> setS({...s, overtimeThreshold: Number(e.target.value)})}/>
                  </label>
                </Section>
                <div className="flex justify-end"><Button onClick={()=>{ saveComplianceConfig(c); saveSettings(s); setOpen(null); }}>Save</Button></div>
              </div>
            )}
            {it.key==='union' && (
              <div className="text-sm">
                <p>Configure seniority bidding and overtime equalization policies. Settings are saved locally and can be referenced by scheduling engines.</p>
                <div className="mt-3 grid gap-2">
                  <label className="inline-flex items-center gap-2"><input type="checkbox" onChange={(e)=> localStorage.setItem('shiftflow:union:seniority', String(e.target.checked))}/> Enable seniority prioritization</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" onChange={(e)=> localStorage.setItem('shiftflow:union:otEqualize', String(e.target.checked))}/> Overtime equalization tracking</label>
                </div>
              </div>
            )}
            {it.key==='employee' && (
              <div className="text-sm grid gap-2">
                <label className="inline-flex items-center gap-2"><input type="checkbox" onChange={(e)=> localStorage.setItem('shiftflow:employee:swap', String(e.target.checked))}/> Allow shift swaps (with approval)</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" onChange={(e)=> localStorage.setItem('shiftflow:employee:availability', String(e.target.checked))}/> Enable availability preferences</label>
              </div>
            )}
            {it.key==='analytics' && (
              <div className="text-sm grid gap-2">
                <label className="inline-flex items-center gap-2"><input type="checkbox" onChange={(e)=> localStorage.setItem('shiftflow:analytics:sales', String(e.target.checked))}/> Integrate sales for demand forecasting</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" onChange={(e)=> localStorage.setItem('shiftflow:analytics:splh', String(e.target.checked))}/> Show SPLH metrics</label>
              </div>
            )}
            {it.key==='financial' && (
              <div className="grid gap-2 text-sm">
                <label className="inline-flex items-center gap-2">Weekly budget ($)
                  <Input type="number" value={s.weeklyBudget} onChange={(e)=> setS({...s, weeklyBudget: Number(e.target.value)})}/>
                </label>
                <label className="inline-flex items-center gap-2">Weekly sales ($)
                  <Input type="number" value={s.weeklySales} onChange={(e)=> setS({...s, weeklySales: Number(e.target.value)})}/>
                </label>
                <div className="flex justify-end"><Button onClick={()=>{ saveSettings(s); setOpen(null); }}>Save</Button></div>
              </div>
            )}
            {it.key==='timeoff' && (
              <div className="text-sm grid gap-2">
                <label className="inline-flex items-center gap-2">PTO accrual (hrs/pay period)
                  <Input type="number" onChange={(e)=> localStorage.setItem('shiftflow:pto:accrual', e.target.value)} />
                </label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" onChange={(e)=> localStorage.setItem('shiftflow:pto:blackout', String(e.target.checked))}/> Enable blackout dates</label>
              </div>
            )}
            {it.key==='attendance' && (
              <div className="text-sm grid gap-2">
                <label className="inline-flex items-center gap-2"><input type="checkbox" onChange={(e)=> localStorage.setItem('shiftflow:att:geofence', String(e.target.checked))}/> Require geofence on clock-in</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" onChange={(e)=> localStorage.setItem('shiftflow:att:realtime', String(e.target.checked))}/> Real-time monitoring</label>
              </div>
            )}
            {it.key==='reliability' && (
              <div className="text-sm grid gap-2">
                <label className="inline-flex items-center gap-2"><input type="checkbox" onChange={(e)=> localStorage.setItem('shiftflow:sys:realtime', String(e.target.checked))}/> Instant updates</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" onChange={(e)=> localStorage.setItem('shiftflow:sys:permissions', String(e.target.checked))}/> Enforce role-based permissions</label>
              </div>
            )}
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}
