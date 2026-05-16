import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Download, Printer } from 'lucide-react';

type Item = { id:string; label:string; ok:boolean; notes:string };

type Section = { id:string; title:string; items: Item[] };

type InspectorState = { sections: Section[] };

function uid(){ try{ return crypto.randomUUID(); }catch{ return Math.random().toString(36).slice(2);} }
function persist(key:string, v:unknown){ try{ localStorage.setItem(key, JSON.stringify(v)); }catch{} }
function restore<T>(key:string, fb:T):T{ try{ const raw=localStorage.getItem(key); return raw? JSON.parse(raw) as T : fb; }catch{ return fb; } }

const defaultSections: Section[] = [
  { id: uid(), title: 'Food Storage', items: [
    { id: uid(), label: 'Cold holding ≤ 41°F', ok: false, notes:'' },
    { id: uid(), label: 'Hot holding ≥ 135°F', ok: false, notes:'' },
    { id: uid(), label: 'Dry storage off floor', ok: false, notes:'' },
  ]},
  { id: uid(), title: 'Sanitation', items: [
    { id: uid(), label: 'Dish and pot areas clean', ok: false, notes:'' },
    { id: uid(), label: 'Sanitizer concentration correct', ok: false, notes:'' },
  ]},
  { id: uid(), title: 'Hand Sinks', items: [
    { id: uid(), label: 'Trash can available', ok: false, notes:'' },
    { id: uid(), label: 'Soap dispenser filled', ok: false, notes:'' },
    { id: uid(), label: 'Paper towels stocked', ok: false, notes:'' },
    { id: uid(), label: 'Nothing blocking the sink', ok: false, notes:'' },
  ]},
  { id: uid(), title: 'Allergen Control', items: [
    { id: uid(), label: 'Allergen labeling accurate', ok: false, notes:'' },
    { id: uid(), label: 'Cross-contact prevented', ok: false, notes:'' },
  ]},
];

export const PreHealthInspectorChecklistPanel: React.FC = () => {
  const [state, setState] = React.useState<InspectorState>(()=> restore('preinspector:state', { sections: defaultSections }));
  const [newSectionTitle, setNewSectionTitle] = React.useState('');
  const [scanText, setScanText] = React.useState('');
  const [uploads, setUploads] = React.useState<{ id:string; name:string; date:string; text?:string }[]>(()=> restore('preinspector:uploads', []));
  React.useEffect(()=>{ persist('preinspector:state', state); }, [state]);
  React.useEffect(()=>{ persist('preinspector:uploads', uploads); }, [uploads]);

  const score = React.useMemo(()=>{
    const total = state.sections.reduce((s,sec)=> s+sec.items.length, 0);
    const ok = state.sections.reduce((s,sec)=> s+sec.items.filter(i=>i.ok).length, 0);
    return total? Math.round((ok/total)*100): 0;
  }, [state]);

  const exportCSV = ()=>{
    const lines = ['Section,Item,OK,Notes'];
    state.sections.forEach(sec=> sec.items.forEach(i=> lines.push(`${q(sec.title)},${q(i.label)},${i.ok?'Yes':'No'},${q(i.notes)}`)));
    downloadText('pre-inspection.csv', lines.join('\n'));
  };
  const printDoc = ()=>{ const w=window.open('','_blank'); if(!w) return; const html = `<!doctype html><html><head><title>Pre-Inspection Checklist</title><style>body{font-family:ui-sans-serif,system-ui;-webkit-print-color-adjust:exact}h1{font-size:18px}h2{font-size:14px;margin:10px 0}table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #ccc;padding:6px;font-size:12px;text-align:left}</style></head><body><h1>Pre-Inspection Checklist</h1>${state.sections.map(sec=>`<h2>${sec.title}</h2><table><thead><tr><th>Check</th><th>OK</th><th>Notes</th></tr></thead><tbody>${sec.items.map(i=>`<tr><td>${i.label}</td><td>${i.ok?'Yes':'No'}</td><td>${i.notes||''}</td></tr>`).join('')}</tbody></table>`).join('')}</body></html>`; w.document.write(html); w.document.close(); w.focus(); w.print(); };

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pre Health Inspector Checklist</span>
          <div className="flex items-center gap-2">
            <span className="text-sm">Score: {score}%</span>
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-2"/>Export CSV</Button>
            <Button variant="outline" size="sm" onClick={printDoc}><Printer className="h-4 w-4 mr-2"/>Print</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Editable sections */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <div className="text-xs mb-1">New Section</div>
              <Input value={newSectionTitle} onChange={(e)=> setNewSectionTitle(e.target.value)} placeholder="e.g., Walk-in Cooler" />
            </div>
            <Button onClick={()=>{ if(!newSectionTitle.trim()) return; setState(s=> ({ sections: [{ id: uid(), title: newSectionTitle.trim(), items: [] }, ...s.sections] })); setNewSectionTitle(''); }}>Add Section</Button>
          </div>

          <ScrollArea className="max-h-[600px] pr-2">
            <div className="space-y-4">
              {state.sections.map(sec=> (
                <div key={sec.id} className="border rounded-lg p-3 bg-background/50">
                  <div className="flex items-center justify-between mb-2">
                    <Input value={sec.title} onChange={(e)=> updateSection(sec.id,{ title:e.target.value })} className="font-medium" />
                    <Button variant="ghost" size="sm" onClick={()=> removeSection(sec.id)}>Remove</Button>
                  </div>
                  <div className="space-y-2">
                    {sec.items.map(it=> (
                      <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-7 flex items-center gap-2">
                          <Checkbox checked={it.ok} onCheckedChange={v=> updateItem(sec.id,it.id,{ ok: !!v })} />
                          <Input value={it.label} onChange={(e)=> updateItem(sec.id,it.id,{ label:e.target.value })} />
                        </div>
                        <Textarea className="col-span-4" placeholder="Notes / corrective action" value={it.notes} onChange={e=> updateItem(sec.id,it.id,{ notes:e.target.value })} />
                        <Button variant="ghost" size="sm" onClick={()=> removeItem(sec.id,it.id)}>Remove</Button>
                      </div>
                    ))}
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-7">
                        <Input placeholder="Add checklist item" onKeyDown={(e)=>{ if(e.key==='Enter'){ const v=(e.target as HTMLInputElement).value.trim(); if(v){ addItem(sec.id, v); (e.target as HTMLInputElement).value=''; } } }} />
                      </div>
                      <div className="col-span-5 text-xs text-muted-foreground">Press Enter to add</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Scan/import past inspections */}
          <div className="border rounded-lg p-3">
            <div className="font-medium mb-2">Import Previous Inspection</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
              <Input type="file" accept=".txt,.pdf,.md,.rtf,.doc,.docx,image/*" onChange={(e)=>{
                const f=e.target.files?.[0]; if(!f) return; const id=uid(); setUploads(u=> [{ id, name:f.name, date:new Date().toISOString(), text: undefined }, ...u]);
              }} />
              <Input placeholder="Paste extracted text or notes from inspection" value={scanText} onChange={(e)=> setScanText(e.target.value)} />
              <Button onClick={()=> applyScan(scanText)}>Update Checklist</Button>
            </div>
            {uploads.length>0 && (
              <div className="text-xs text-muted-foreground mt-2">Saved uploads: {uploads.length}. Use search in your browser to find past items.</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  function addItem(secId:string, label:string){ setState(s=> ({ sections: s.sections.map(sec=> sec.id===secId ? { ...sec, items: [{ id: uid(), label, ok:false, notes:'' }, ...sec.items] } : sec) })); }
  function removeItem(secId:string, itemId:string){ setState(s=> ({ sections: s.sections.map(sec=> sec.id===secId ? { ...sec, items: sec.items.filter(i=> i.id!==itemId) } : sec) })); }
  function updateItem(secId:string, itemId:string, patch: Partial<Item>){ setState(s=> ({ sections: s.sections.map(sec=> sec.id===secId ? { ...sec, items: sec.items.map(it=> it.id===itemId ? { ...it, ...patch } : it) } : sec) })); }
  function updateSection(secId:string, patch: Partial<Section>){ setState(s=> ({ sections: s.sections.map(sec=> sec.id===secId ? { ...sec, ...patch } : sec) })); }
  function removeSection(secId:string){ setState(s=> ({ sections: s.sections.filter(sec=> sec.id!==secId) })); }
  function applyScan(text:string){
    const t=(text||'').toLowerCase(); if(!t) return;
    const hints: { section:string; item:string }[] = [];
    const rules: { re:RegExp; section:string; item:string }[] = [
      { re:/(hand\s*sink|handsink).*trash/, section:'Hand Sinks', item:'Trash can available' },
      { re:/(hand\s*sink|handsink).*soap/, section:'Hand Sinks', item:'Soap dispenser filled' },
      { re:/(hand\s*sink|handsink).*towel/, section:'Hand Sinks', item:'Paper towels stocked' },
      { re:/blocking\s+the\s+sink|obstructed\s+sink/, section:'Hand Sinks', item:'Nothing blocking the sink' },
      { re:/cold\s+hold(ing)?\s*(>|≥|at)?\s*41/, section:'Food Storage', item:'Cold holding ≤ 41°F' },
      { re:/hot\s+hold(ing)?\s*(<|≤|below)?\s*135/, section:'Food Storage', item:'Hot holding ≥ 135°F' },
      { re:/allergen|label/i, section:'Allergen Control', item:'Allergen labeling accurate' },
    ];
    for(const r of rules){ if(r.re.test(t)) hints.push({ section:r.section, item:r.item }); }
    if(hints.length===0){ alert('No actionable items detected. You can still add items manually.'); return; }
    setState(s=> ({ sections: hints.reduce((acc, h)=>{
      const sec = acc.find(x=> x.title===h.section) || (acc.push({ id: uid(), title:h.section, items:[] }), acc[acc.length-1]);
      const exists = sec.items.some(i=> i.label===h.item);
      if(!exists) sec.items.unshift({ id: uid(), label:h.item, ok:false, notes:'Imported from inspection' });
      return acc;
    }, [...s.sections]) }));
  }
};

function q(s:string){ return '"'+(s||'').replace(/"/g,'""')+'"'; }
function downloadText(name:string, text:string){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'text/csv'})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 1000); }
function escapeHtml(s:string){ return s.replace(/[&<>]/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;'} as any)[c]); }

export default PreHealthInspectorChecklistPanel;
