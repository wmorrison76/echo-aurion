import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useBEOStore } from '../stores/beoStore';
import { DollarSign, Calendar as CalIcon, Zap } from 'lucide-react';

function within30(dateStr: string){
  const d = new Date(dateStr).getTime();
  const now = Date.now();
  const in30 = now + 30*24*60*60*1000;
  return d >= now && d <= in30;
}

export default function Revenue(){
  const { events } = useBEOStore();

  const { stages, totals } = useMemo(()=>{
    const stageOrder = ['lead','proposal','pending','confirmed','execution','closed'] as const;
    const map: Record<string, { id:string; title:string; revenue:number; date:string; status:string; isEcho:boolean }[]> = {};
    for(const s of stageOrder) map[s]=[];
    for(const ev of events){
      const s = (ev.status as string) || 'lead';
      if(!within30(ev.date)) continue;
      const list = map[s] || (map[s]=[]);
      const rev = typeof ev.revenue === 'number' ? ev.revenue : (ev.guestCount||0)*95;
      list.push({ id: ev.id, title: ev.title, revenue: rev, date: ev.date, status: s, isEcho: !!ev.isFromEchoCrm });
    }
    const totals = Object.fromEntries(Object.entries(map).map(([k,v])=>[k, v.reduce((sum,i)=> sum + (i.revenue||0), 0)]));
    return { stages: map, totals };
  }, [events]);

  const stageMeta: Record<string,{ label:string; color:string }>= {
    lead:{ label:'Leads', color:'bg-slate-100 dark:bg-slate-800' },
    proposal:{ label:'Proposals', color:'bg-blue-100/60 dark:bg-blue-900/30' },
    pending:{ label:'Pending', color:'bg-amber-100/70 dark:bg-amber-900/30' },
    confirmed:{ label:'Confirmed', color:'bg-green-100/70 dark:bg-green-900/30' },
    execution:{ label:'Execution', color:'bg-purple-100/70 dark:bg-purple-900/30' },
    closed:{ label:'Closed', color:'bg-slate-100/70 dark:bg-slate-900/30' },
  };

  const stageKeys = ['lead','proposal','pending','confirmed','execution','closed'];

  return (
    <DashboardLayout title="Revenue Pipeline" subtitle="30‑day pipeline connected to Global Calendar and Echo CRM">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Pipeline Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {stageKeys.map(stage=> (
                <div key={stage} className={`rounded-xl border p-3 shadow-[0_6px_0_#00000011] ${stageMeta[stage].color}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm">{stageMeta[stage].label}</div>
                    <Badge variant="outline">${(totals[stage]||0).toLocaleString()}</Badge>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-auto">
                    {stages[stage].map(it=> (
                      <Link key={it.id} to={`/calendar?event=${encodeURIComponent(it.id)}`} className="block rounded border bg-background/60 hover:bg-accent p-2 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="truncate">{it.title}</div>
                          <div className="flex items-center gap-1">
                            {it.isEcho && <Zap className="h-3 w-3 text-blue-600" />}
                            <Badge variant="outline" className="text-[10px]">{new Date(it.date).toLocaleDateString()}</Badge>
                          </div>
                        </div>
                        {it.revenue>0 && <div className="text-xs text-muted-foreground">${it.revenue.toLocaleString()}</div>}
                      </Link>
                    ))}
                    {stages[stage].length===0 && (
                      <div className="text-xs text-muted-foreground">No items</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
              <CalIcon className="h-3 w-3" /> Click any card to open in Global Calendar. <Zap className="h-3 w-3 text-blue-600" /> marks Echo CRM prospects.
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
