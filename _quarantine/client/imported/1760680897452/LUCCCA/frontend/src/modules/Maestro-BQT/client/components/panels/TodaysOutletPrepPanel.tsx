import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Printer } from 'lucide-react';
import { useBEOStore } from '../../stores/beoStore';
import { generateDivisionSheets } from '../../services/prep-sheets';

function todayISO(){ return new Date().toISOString().split('T')[0]; }

export const TodaysOutletPrepPanel: React.FC = () => {
  const { events, beos } = useBEOStore();
  const dateStr = React.useMemo(()=> todayISO(), []);
  const todays = React.useMemo(()=> events.filter(e=> e.date===dateStr && !!e.beoId), [events, dateStr]);

  const tasks = React.useMemo(()=>{
    const out: { division: string; title: string; qty: number; est: number }[] = [];
    for(const ev of todays){
      const b = ev.beoId ? beos[ev.beoId] : undefined; if(!b) continue;
      const bCopy:any = { ...b, event: { ...(b as any).event, date: ev.date } };
      const sheets = generateDivisionSheets(bCopy);
      for(const s of sheets){ for(const t of s.tasks){ out.push({ division: s.division, title: t.title, qty: t.quantity, est: t.estMinutes }); } }
    }
    return out;
  }, [todays, beos]);

  const grouped = React.useMemo(()=>{
    const g = new Map<string, { title: string; qty: number; est: number }[]>();
    for(const t of tasks){ const k = t.division; if(!g.has(k)) g.set(k, []); g.get(k)!.push({ title: t.title, qty: t.qty, est: t.est }); }
    return g;
  }, [tasks]);

  const onPrint = ()=>{
    try{
      const w = window.open('', '_blank'); if(!w) return;
      const html = `<!doctype html><html><head><title>Todays Outlet Prep ${dateStr}</title>
        <style>body{font-family:ui-sans-serif,system-ui;-webkit-print-color-adjust:exact;margin:16px}h1{font-size:18px;margin:0 0 8px}
        h2{font-size:14px;margin:12px 0 6px}table{width:100%;border-collapse:collapse;margin-top:6px}
        th,td{border:1px solid #ccc;padding:6px;font-size:12px;text-align:left}thead{background:#f4f4f4}</style>
      </head><body>
        <h1>Today's Outlet Prep — ${dateStr}</h1>
        ${Array.from(grouped.entries()).map(([div, rows])=>`<h2>${div.replace('_',' ')}</h2>
          <table><thead><tr><th>Item</th><th>Qty</th><th>Est. Minutes</th></tr></thead><tbody>
            ${rows.map(r=>`<tr><td>${r.title}</td><td>${r.qty}</td><td>${r.est}</td></tr>`).join('')}
          </tbody></table>`).join('')}
        <script>window.addEventListener('load',()=>{window.print(); setTimeout(()=>window.close(), 500);});</script>
      </body></html>`;
      w.document.write(html); w.document.close();
    }catch{}
  };

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Today's Outlet Prep Lists
          <Badge variant="outline" className="ml-2 text-xs">{dateStr}</Badge>
          <Button size="sm" variant="outline" className="ml-auto" onClick={onPrint}><Printer className="h-4 w-4 mr-1"/>Print</Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from(grouped.entries()).map(([division, rows])=> (
            <div key={division} className="rounded border p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold capitalize">{division.replace('_',' ')}</div>
                <Badge variant="outline" className="text-xs">{rows.reduce((s,r)=> s + r.est, 0)} min</Badge>
              </div>
              <div className="space-y-2 max-h-64 overflow-auto">
                {rows.map((r, i)=> (
                  <div key={`${division}-${i}`} className="rounded border p-2 bg-background/50">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm truncate">{r.title}</div>
                      <Badge variant="outline" className="text-[10px]">{r.est} min</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">Qty {r.qty}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {tasks.length===0 && (
            <div className="text-sm text-muted-foreground">No linked BEOs for today.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TodaysOutletPrepPanel;
