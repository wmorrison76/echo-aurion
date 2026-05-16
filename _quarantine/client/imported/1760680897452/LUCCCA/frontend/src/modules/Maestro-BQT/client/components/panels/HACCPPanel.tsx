import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Download, Printer, Plus, Trash2, CheckCircle2 } from 'lucide-react';

type Hazard = { id: string; step: string; hazard: string; ccp: boolean; criticalLimit: string };
type LogEntry = { id: string; ccp: string; value: string; status: 'PASS'|'FAIL'; action: string; by: string; at: string };

type HACCPState = { hazards: Hazard[]; logs: LogEntry[] };

function uid(){ try{ return crypto.randomUUID(); }catch{ return Math.random().toString(36).slice(2);} }

function persist(key: string, value: unknown){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch{} }
function restore<T>(key: string, fallback: T): T { try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; }catch{ return fallback; } }

export const HACCPPanel: React.FC = () => {
  const [state, setState] = React.useState<HACCPState>(()=> restore('haccp:state', { hazards: [], logs: [] }));
  React.useEffect(()=>{ persist('haccp:state', state); }, [state]);

  const addHazard = ()=> setState(s=> ({ ...s, hazards: [...s.hazards, { id: uid(), step:'', hazard:'', ccp:false, criticalLimit:'' }] }));
  const removeHazard = (id:string)=> setState(s=> ({ ...s, hazards: s.hazards.filter(h=> h.id!==id) }));
  const addLog = ()=> setState(s=> ({ ...s, logs: [{ id: uid(), ccp:'', value:'', status:'PASS', action:'', by:'', at: new Date().toISOString() }, ...s.logs ] }));
  const removeLog = (id:string)=> setState(s=> ({ ...s, logs: s.logs.filter(l=> l.id!==id) }));

  const exportCSV = ()=>{
    const lines = [
      'Section,Step/CCP,Hazard/Value,CCP,Critical Limit,Status,Action,By,At',
      ...state.hazards.map(h=> `Hazard,${q(h.step)},${q(h.hazard)},${h.ccp?'Yes':'No'},${q(h.criticalLimit)},,,,`),
      ...state.logs.map(l=> `Log,${q(l.ccp)},${q(l.value)},,,${l.status},${q(l.action)},${q(l.by)},${l.at}`)
    ];
    downloadText('haccp.csv', lines.join('\n'));
  };
  const printDoc = ()=>{ const w = window.open('','_blank'); if(!w) return; w.document.write(`<pre>${escapeHtml(JSON.stringify(state,null,2))}</pre>`); w.document.close(); w.focus(); w.print(); };

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>HACCP Program</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-2"/>Export CSV</Button>
            <Button variant="outline" size="sm" onClick={printDoc}><Printer className="h-4 w-4 mr-2"/>Print</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Hazard Analysis & CCPs</div>
            <Button size="sm" onClick={addHazard}><Plus className="h-4 w-4 mr-2"/>Add Hazard</Button>
          </div>
          <ScrollArea className="max-h-[320px]">
            <div className="space-y-2">
              {state.hazards.map(h=> (
                <div key={h.id} className="grid grid-cols-12 gap-2 items-center border rounded p-2 bg-background/50">
                  <Input className="col-span-3" placeholder="Process Step" value={h.step} onChange={e=> updateHazard(h.id,{ step:e.target.value })} />
                  <Input className="col-span-4" placeholder="Hazard" value={h.hazard} onChange={e=> updateHazard(h.id,{ hazard:e.target.value })} />
                  <div className="col-span-1 flex items-center gap-2"><Checkbox checked={h.ccp} onCheckedChange={v=> updateHazard(h.id,{ ccp: !!v })} /> <span className="text-xs">CCP</span></div>
                  <Input className="col-span-3" placeholder="Critical Limit" value={h.criticalLimit} onChange={e=> updateHazard(h.id,{ criticalLimit:e.target.value })} />
                  <Button size="icon" variant="ghost" onClick={()=> removeHazard(h.id)}><Trash2 className="h-4 w-4"/></Button>
                </div>
              ))}
              {state.hazards.length===0 && (
                <div className="text-xs text-muted-foreground">No hazards yet. Add your process steps, hazards, and identify CCPs with critical limits.</div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Monitoring Logs</div>
            <Button size="sm" onClick={addLog}><Plus className="h-4 w-4 mr-2"/>Add Entry</Button>
          </div>
          <ScrollArea className="max-h-[360px]">
            <div className="space-y-2">
              {state.logs.map(l=> (
                <div key={l.id} className="grid grid-cols-12 gap-2 items-center border rounded p-2 bg-background/50">
                  <Input className="col-span-3" placeholder="CCP (e.g., Cook Chicken)" value={l.ccp} onChange={e=> updateLog(l.id,{ ccp:e.target.value })} />
                  <Input className="col-span-2" placeholder="Value (e.g., 165°F)" value={l.value} onChange={e=> updateLog(l.id,{ value:e.target.value })} />
                  <select className="col-span-2 border rounded px-2 py-2 bg-white/80 dark:bg-black/40" value={l.status} onChange={e=> updateLog(l.id,{ status:e.target.value as any })}>
                    <option value="PASS">PASS</option>
                    <option value="FAIL">FAIL</option>
                  </select>
                  <Input className="col-span-3" placeholder="Corrective Action" value={l.action} onChange={e=> updateLog(l.id,{ action:e.target.value })} />
                  <Input className="col-span-1" placeholder="By" value={l.by} onChange={e=> updateLog(l.id,{ by:e.target.value })} />
                  <Input className="col-span-1" placeholder="At" value={formatAt(l.at)} onChange={e=> updateLog(l.id,{ at:new Date(e.target.value).toISOString() })} />
                  <div className="col-span-12 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">{l.status==='PASS' ? <span className="text-green-600 inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Meets critical limit</span> : <span className="text-red-600">Non-conformance recorded</span>} • {new Date(l.at).toLocaleString()}</div>
                    <Button size="icon" variant="ghost" onClick={()=> removeLog(l.id)}><Trash2 className="h-4 w-4"/></Button>
                  </div>
                </div>
              ))}
              {state.logs.length===0 && (
                <div className="text-xs text-muted-foreground">No monitoring logs yet. Capture CCP checks with timestamp, user, and action.</div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );

  function updateHazard(id:string, patch: Partial<Hazard>){ setState(s=> ({ ...s, hazards: s.hazards.map(h=> h.id===id ? { ...h, ...patch } : h) })); }
  function updateLog(id:string, patch: Partial<LogEntry>){ setState(s=> ({ ...s, logs: s.logs.map(l=> l.id===id ? { ...l, ...patch } : l) })); }
};

function q(s:string){ return '"'+(s||'').replace(/"/g,'""')+'"'; }
function downloadText(name:string, text:string){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'text/csv'})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 1000); }
function escapeHtml(s:string){ return s.replace(/[&<>]/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;'} as any)[c]); }
function formatAt(iso:string){ try{ const d=new Date(iso); return d.toISOString().slice(0,16); }catch{ return ''; } }

export default HACCPPanel;
