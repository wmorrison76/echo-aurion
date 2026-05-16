import React, { useMemo } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useBEOStore } from '../stores/beoStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Calendar, Package, FileText, ShoppingCart } from 'lucide-react';

function withinDays(dateStr: string, days: number){
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000*60*60*24);
  return diff >= 0 && diff <= days;
}

export default function Ordering(){
  const { events, beos } = useBEOStore();
  const upcoming = useMemo(()=> events
    .filter(e=> withinDays(e.date, 60))
    .sort((a,b)=> a.date.localeCompare(b.date)), [events]);

  const forecastFor = (beoId?: string)=>{
    const beo = beoId? beos[beoId] : undefined;
    if(!beo) return [] as { name:string; qty:number; unit:string }[];
    const lines: { name:string; qty:number; unit:string }[] = [];
    for(const mi of (beo.menu.items||[])){
      const r = mi.recipe;
      if(!r) continue;
      const buffer = 1.04; // 4% over guaranteed
      const basePortions = (mi.quantity || beo.event.guaranteed || 0);
      const factor = (basePortions * buffer) / Math.max(1, r.yield);
      for(const ing of (r.ingredients||[])){
        const qty = (ing.amount||0) * factor;
        lines.push({ name: ing.name, qty: Number(qty.toFixed(2)), unit: ing.unit });
      }
    }
    return lines;
  };

  return (
    <DashboardLayout title="Ordering & Invoices" subtitle="Forecast upcoming needs and create POs">
      <div className="space-y-4">
        {upcoming.map(ev=>{
          const lines = forecastFor(ev.beoId).slice(0,8);
          return (
            <Card key={ev.id} className="border">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Calendar className="h-4 w-4"/>{ev.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{ev.date}</Badge>
                    <Badge variant={ev.acknowledged? 'outline':'destructive'}>{ev.acknowledged? 'confirmed':'unack'}</Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lines.length>0 ? (
                  <div className="space-y-2">
                    {lines.map((l,i)=> (
                      <div key={i} className="flex items-center justify-between text-sm border rounded p-2">
                        <div className="flex items-center gap-2"><Package className="h-4 w-4"/>{l.name}</div>
                        <div>{l.qty} {l.unit}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No forecast available. Link a BEO with recipes to generate ordering guidance.</div>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <Button variant="outline"><FileText className="h-4 w-4 mr-2"/>Generate PO</Button>
                  <Button><ShoppingCart className="h-4 w-4 mr-2"/>Order with Vendor</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {upcoming.length===0 && (
          <div className="text-sm text-muted-foreground">No events within the next 60 days.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
