import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { chefInsightsForToday, estimateOutletTraffic } from '../../services/demand-forecast';
import { useSignalsStore } from '../../stores/signalsStore';

export const ChefForecastPanel: React.FC = () => {
  const today = new Date().toISOString().slice(0,10);
  const insights = chefInsightsForToday(today);
  const traffic = React.useMemo(()=> estimateOutletTraffic(today), [today]);
  const setOccupancy = useSignalsStore(s=> s.setOccupancy);

  const peaks = React.useMemo(()=> {
    const grouped = traffic.reduce((acc, w)=>{ const hr=new Date(w.from).getHours(); acc[hr]=(acc[hr]||0)+w.expectedGuests; return acc; }, {} as Record<number, number>);
    return Object.entries(grouped).sort((a,b)=> b[1]-a[1]).slice(0,3);
  }, [traffic]);

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Chef Forecast & Guidance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">Top peak windows today (by hour): {peaks.map(([h,v])=> `${h}:00 (${v})`).join(' • ') || 'n/a'}</div>
          <div className="space-y-2">
            {insights.map((t,i)=> (
              <div key={i} className="text-sm p-2 rounded border bg-background/50">{t}</div>
            ))}
            {insights.length===0 && <div className="text-sm text-muted-foreground">No suggestions yet.</div>}
          </div>
          <div className="pt-2 flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={()=> setOccupancy(Math.round(400+Math.random()*200))}>Adjust Occupancy</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChefForecastPanel;
