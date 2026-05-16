import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ClipboardList, Download, Printer } from 'lucide-react';
import { useBEOStore } from '../../stores/beoStore';
import { generateDivisionSheets, estimatePrepEfficiencyForDate } from '../../services/prep-sheets';

export const PrepSheetsPanel: React.FC<{ date?: Date }> = ({ date }) => {
  const { events, beos } = useBEOStore();
  const dateStr = useMemo(() => (date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : new Date().toISOString().split('T')[0]), [date]);
  const nextDateStr = useMemo(() => {
    const d = date ? new Date(date) : new Date();
    const n = new Date(d.getTime() + 24*60*60*1000);
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
  }, [date]);
  const dates = [dateStr, nextDateStr];

  const eventsByDate = useMemo(()=> {
    const m = new Map<string, typeof events>();
    for (const ds of dates) m.set(ds, events.filter(e => e.date === ds && !!e.beoId));
    return m;
  }, [events, dates[0], dates[1]] as any);

  const sheetsByDate = useMemo(() => {
    const map = new Map<string, ReturnType<typeof generateDivisionSheets>>();
    for(const ds of dates){
      const todays = eventsByDate.get(ds) || [];
      const sheets = todays.flatMap(ev => {
        const b = ev.beoId ? beos[ev.beoId] : undefined; if (!b) return [] as ReturnType<typeof generateDivisionSheets>;
        const copy = { ...b, event: { ...b.event, date: ev.date } } as any;
        return generateDivisionSheets(copy);
      });
      map.set(ds, sheets);
    }
    return map;
  }, [eventsByDate, beos, dates[0], dates[1]] as any);

  const sheets = useMemo(()=> (sheetsByDate.get(dateStr) || []) as any, [sheetsByDate, dateStr]);

  const efficiencyToday = useMemo(() => estimatePrepEfficiencyForDate(events, beos as any, dateStr), [events, beos, dateStr]);
  const efficiencyNext  = useMemo(() => estimatePrepEfficiencyForDate(events, beos as any, nextDateStr), [events, beos, nextDateStr]);

  const groupedByDate: Record<string, Record<string, typeof sheets>> = {} as any;
  for(const ds of dates){
    const sh: any = sheetsByDate.get(ds) || [];
    const g: any = {};
    for (const s of sh) { if(!g[s.division]) g[s.division] = []; g[s.division].push(s); }
    groupedByDate[ds] = g;
  }

  const onPrint = () => { try { window.print(); } catch {} };

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5"/> BQT Prep Sheets <Badge variant="outline" className="ml-2 text-xs">{dateStr} & {nextDateStr}</Badge> <Badge className="ml-auto">Eff {efficiencyToday.score}% / {efficiencyNext.score}%</Badge>
        <div className="ml-2 flex items-center gap-2"><Button size="sm" variant="outline" onClick={onPrint}><Printer className="h-4 w-4 mr-1"/>Print</Button><Button size="sm" variant="outline"><Download className="h-4 w-4 mr-1"/>Export</Button></div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6">
          {dates.map(ds => (
            <div key={ds} className="space-y-3">
              <div className="text-sm font-semibold">{ds === dateStr ? 'Today' : 'Next Day'} • {ds}</div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Object.entries(groupedByDate[ds] || {}).map(([division, parts]) => (
                  <div key={division} className="rounded border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold capitalize">{division.replace('_',' ')}</div>
                      <Badge variant="outline" className="text-xs">{(parts as any).reduce((s:any,p:any)=> s + p.totalMinutes, 0)} min</Badge>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-auto">
                      {(parts as any).flatMap((p:any) => p.tasks).map((t:any, i:number) => (
                        <div key={`${division}-${t.menuItemId||i}`} className="rounded border p-2 bg-background/50">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm truncate">{t.title}</div>
                            <Badge variant="outline" className="text-[10px]">{t.estMinutes} min</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">Qty {t.quantity}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {((sheetsByDate.get(ds)||[]).length===0) && (
                  <div className="text-sm text-muted-foreground">No linked BEOs for this day.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PrepSheetsPanel;
