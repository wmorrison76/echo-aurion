import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../..//components/ui/dialog';
import { Button } from '../..//components/ui/button';
import { useScheduleSettings } from './scheduleSettingsStore';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export const SchedulerSettingsDialog: React.FC<{ open:boolean; onOpenChange:(v:boolean)=>void }>=({ open, onOpenChange })=>{
  const { startDay, hourFormat, weeklyLaborBudget, unionRules, logoUrl, setStartDay, setHourFormat, setWeeklyLaborBudget, setUnionRules, setLogoUrl } = useScheduleSettings();
  const [tmpDay, setTmpDay] = React.useState(startDay);
  const [tmpFmt, setTmpFmt] = React.useState(hourFormat);
  React.useEffect(()=>{ setTmpDay(startDay); setTmpFmt(hourFormat); }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scheduler Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 items-center">
            <label className="text-sm">Week starts on</label>
            <select className="border rounded px-2 py-1" value={tmpDay} onChange={e=> setTmpDay(parseInt(e.target.value,10))}>
              {DAYS.map((d,i)=> (<option key={i} value={i}>{d}</option>))}
            </select>
            <label className="text-sm">Time format</label>
            <select className="border rounded px-2 py-1" value={tmpFmt} onChange={e=> setTmpFmt(e.target.value as any)}>
              <option value="12">12-hour</option>
              <option value="24">24-hour</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 items-center">
            <label className="text-sm">Weekly Labor Budget ($)</label>
            <input type="number" className="border rounded px-2 py-1" value={weeklyLaborBudget||0} onChange={e=> setWeeklyLaborBudget(parseFloat(e.target.value||'0'))} />
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Logo</div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <label className="text-sm">Logo URL</label>
              <input type="url" className="border rounded px-2 py-1" placeholder="https://..." value={logoUrl||''} onChange={e=> setLogoUrl(e.target.value||undefined)} />
              <label className="text-sm">Upload image</label>
              <input type="file" accept="image/*" onChange={e=>{ const file=e.currentTarget.files?.[0]; if(!file) return; const fr=new FileReader(); fr.onload=()=> setLogoUrl(String(fr.result||'')); fr.readAsDataURL(file); }} />
              <div className="col-span-2">
                {logoUrl? (
                  <div className="flex items-center gap-2">
                    <img src={logoUrl} alt="logo preview" className="h-12 w-auto border rounded bg-white" />
                    <button className="text-xs underline" onClick={()=> setLogoUrl(undefined)}>Remove</button>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No logo set</div>
                )}
              </div>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Union/Compliance Rules</div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <label className="text-sm">Union rules enabled</label>
              <input type="checkbox" className="h-4 w-4" checked={unionRules.enabled} onChange={e=> setUnionRules({ enabled: e.target.checked })} />
              <label className="text-sm">OT after (hrs)</label>
              <input type="number" className="border rounded px-2 py-1" min={0} step={0.5} value={unionRules.overtimeAfterHours} onChange={e=> setUnionRules({ overtimeAfterHours: parseFloat(e.target.value||'0') })} />
              <label className="text-sm">Double-time after (hrs)</label>
              <input type="number" className="border rounded px-2 py-1" min={0} step={0.5} value={unionRules.doubletimeAfterHours} onChange={e=> setUnionRules({ doubletimeAfterHours: parseFloat(e.target.value||'0') })} />
              <label className="text-sm">Min turnaround (hrs)</label>
              <input type="number" className="border rounded px-2 py-1" min={0} step={0.5} value={unionRules.minTurnaroundHours} onChange={e=> setUnionRules({ minTurnaroundHours: parseFloat(e.target.value||'0') })} />
              <label className="text-sm">Max days per week</label>
              <input type="number" className="border rounded px-2 py-1" min={1} step={1} value={unionRules.maxDaysPerWeek} onChange={e=> setUnionRules({ maxDaysPerWeek: parseInt(e.target.value||'0',10) })} />
              <label className="text-sm">Meal break every (hrs)</label>
              <input type="number" className="border rounded px-2 py-1" min={0} step={0.5} value={unionRules.mealBreakEveryHours} onChange={e=> setUnionRules({ mealBreakEveryHours: parseFloat(e.target.value||'0') })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={()=> onOpenChange(false)}>Close</Button>
            <Button onClick={()=> { setStartDay(tmpDay); setHourFormat(tmpFmt); onOpenChange(false); }}>Apply</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
