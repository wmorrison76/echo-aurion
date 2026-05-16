import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useCartStore } from '../../stores/cartStore';
import { useBEOStore } from '../../stores/beoStore';
import { CheckCircle, Truck, ChefHat, Flame, ShoppingCart, Utensils } from 'lucide-react';

const StageButton: React.FC<{ label: string; onClick: () => void; active?: boolean }>=({ label, onClick, active })=> (
  <Button size="sm" variant={active? 'default' : 'outline'} onClick={onClick}>{label}</Button>
);

export const CartTrackerPanel: React.FC<{ filterBeoId?: string }> = ({ filterBeoId }) => {
  const racks = useCartStore(s=> s.racks);
  const updateStage = useCartStore(s=> s.updateItemStage);
  const moveRackStatus = useCartStore(s=> s.moveRackStatus);
  const { events } = useBEOStore();

  const filtered = React.useMemo(()=> filterBeoId ? racks.filter(r=> r.beoId===filterBeoId) : racks, [racks, filterBeoId]);

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" /> Cart Tracker
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filtered.length===0 && (
          <div className="text-sm text-muted-foreground">No carts yet. As butcher completes protein prep and attaches a BEO, items will appear here for receiving and staging.</div>
        )}
        <div className="space-y-4">
          {filtered.map(rack=>{
            const ev = events.find(e=> e.beoId === rack.beoId);
            return (
              <div key={rack.id} className="rounded border p-3 bg-background/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{ev?.title || rack.beoId} • Rack {rack.rackNumber}</div>
                    <div className="text-xs text-muted-foreground">Course C{rack.course} • {ev?.date} • {ev?.room}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{rack.status}</Badge>
                    <StageButton label="Stage" onClick={()=> moveRackStatus(rack.id, 'staged')} active={rack.status==='staged'} />
                    <StageButton label="Prep" onClick={()=> moveRackStatus(rack.id, 'prep')} active={rack.status==='prep'} />
                    <StageButton label="Ready" onClick={()=> moveRackStatus(rack.id, 'ready')} active={rack.status==='ready'} />
                    <StageButton label="Service" onClick={()=> moveRackStatus(rack.id, 'service')} active={rack.status==='service'} />
                    <StageButton label="Complete" onClick={()=> moveRackStatus(rack.id, 'complete')} active={rack.status==='complete'} />
                  </div>
                </div>
                <Separator className="my-2" />
                <div className="space-y-2">
                  {rack.items.map(item=> (
                    <div key={item.id} className="flex items-center justify-between rounded border p-2">
                      <div>
                        <div className="font-medium text-sm">{item.name} <span className="text-xs text-muted-foreground">{item.quantityDesc}</span></div>
                        <div className="text-[11px] text-muted-foreground">Stage: {item.stage}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StageButton label="Received" onClick={()=> updateStage(rack.id, item.id, 'received')} active={item.stage==='received'} />
                        <StageButton label="Seasoned" onClick={()=> updateStage(rack.id, item.id, 'seasoned')} active={item.stage==='seasoned'} />
                        <StageButton label="Seared" onClick={()=> updateStage(rack.id, item.id, 'seared')} active={item.stage==='seared'} />
                        <StageButton label="On Cart" onClick={()=> updateStage(rack.id, item.id, 'on_cart')} active={item.stage==='on_cart'} />
                        <StageButton label="Plated" onClick={()=> updateStage(rack.id, item.id, 'plated')} active={item.stage==='plated'} />
                      </div>
                    </div>
                  ))}
                  {rack.items.length===0 && <div className="text-xs text-muted-foreground">No items on this rack yet.</div>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default CartTrackerPanel;
