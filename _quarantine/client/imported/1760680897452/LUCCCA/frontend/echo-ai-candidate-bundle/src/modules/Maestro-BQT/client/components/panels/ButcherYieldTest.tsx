import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useButcherStore, type MeatCategory } from '../../stores/butcherStore';
import { useInventoryStore } from '../../stores/inventoryStore';

function clamp01(n: number){ return Math.max(0.0001, Math.min(1, n)); }

export const ButcherYieldTest: React.FC = () => {
  const addManualCut = useButcherStore(s=>s.addManualCut);
  const departments = useInventoryStore(s=>s.departments);

  const [name, setName] = useState('Beef Tenderloin');
  const [category, setCategory] = useState<MeatCategory>('beef');
  const [rawLb, setRawLb] = useState<number>(10);
  const [finishedLb, setFinishedLb] = useState<number>(8);
  const [yieldPct, setYieldPct] = useState<number>(80); // percent
  const [beoId, setBeoId] = useState('');
  const [outletId, setOutletId] = useState<string>(departments.find(d=> d.kind==='outlet')?.id || '');
  const [serviceDate, setServiceDate] = useState<string>(()=> new Date().toISOString().slice(0,10));
  const [serviceTime, setServiceTime] = useState<string>('18:00');
  const [deliverBy, setDeliverBy] = useState<string>('Butcher Runner');

  // Auto compute: if any two change, compute the third. We'll base on last edited.
  const [lastEdited, setLastEdited] = useState<'raw'|'finished'|'yield'>('yield');

  const computed = useMemo(()=>{
    let raw = rawLb; let fin = finishedLb; let y = clamp01((yieldPct||0)/100);
    if (lastEdited === 'raw') {
      fin = Number((raw * y).toFixed(2));
    } else if (lastEdited === 'finished') {
      raw = y > 0 ? Number((fin / y).toFixed(2)) : raw;
    } else if (lastEdited === 'yield') {
      if (raw > 0) fin = Number((raw * y).toFixed(2));
      else if (fin > 0) raw = Number((fin / y).toFixed(2));
    }
    const pct = raw > 0 ? (fin / raw) * 100 : yieldPct;
    return { raw: raw || 0, fin: fin || 0, pct: Number(pct.toFixed(2)) };
  }, [rawLb, finishedLb, yieldPct, lastEdited]);

  const saveOverride = ()=>{
    try{
      const raw = localStorage.getItem('butcher.yield.overrides');
      const map = raw ? JSON.parse(raw) : {};
      map[name] = clamp01(computed.fin / Math.max(0.0001, computed.raw));
      localStorage.setItem('butcher.yield.overrides', JSON.stringify(map));
    }catch{}
  };

  const addToOrders = ()=>{
    const id = addManualCut({
      id: `cut-man-${Date.now()}`,
      beoId: beoId || 'manual',
      eventDate: serviceDate,
      outletId,
      menuItemId: 'manual',
      recipeId: undefined,
      proteinName: name,
      category,
      cut: `${name}`,
      rawWeightLb: computed.raw,
      finishedWeightLb: computed.fin,
      leadDays: 0,
      dueDate: serviceDate,
      serviceTime,
      deliverBy,
      status: 'queued'
    });
    return id;
  };

  const print = ()=>{
    const win = window.open('', '_blank');
    if(!win) return;
    const outletName = departments.find(d=> d.id===outletId)?.name || '-';
    const html = `<!doctype html><html><head><title>Yield Test</title><style>body{font-family:ui-sans-serif,system-ui;-webkit-print-color-adjust:exact}h1{font-size:18px;margin:0 0 8px}table{width:100%;border-collapse:collapse}td{padding:6px;font-size:12px;border-bottom:1px solid #ddd}</style></head><body>
      <h1>Butcher Yield Test</h1>
      <table>
        <tr><td>Item</td><td>${name}</td></tr>
        <tr><td>Category</td><td>${category}</td></tr>
        <tr><td>Raw</td><td>${computed.raw.toFixed(2)} lb</td></tr>
        <tr><td>Finished</td><td>${computed.fin.toFixed(2)} lb</td></tr>
        <tr><td>Yield</td><td>${computed.pct.toFixed(1)}%</td></tr>
        <tr><td>Outlet</td><td>${outletName}</td></tr>
        <tr><td>Service</td><td>${serviceDate} ${serviceTime}</td></tr>
        <tr><td>Deliver By</td><td>${deliverBy}</td></tr>
        <tr><td>BEO/REO</td><td>${beoId || '-'}</td></tr>
      </table>
      <script>window.addEventListener('load',()=>{window.print(); setTimeout(()=>window.close(), 500);});</script>
    </body></html>`;
    win.document.write(html);
    win.document.close();
  };

  return (
    <Card className="border">
      <CardHeader>
        <CardTitle className="text-base">Full Yield Test (Meat & Seafood)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <div className="text-xs mb-1">Item</div>
            <Input value={name} onChange={(e)=> setName(e.target.value)} />
          </div>
          <div>
            <div className="text-xs mb-1">Category</div>
            <Select value={category} onValueChange={(v)=> setCategory(v as MeatCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beef">Beef</SelectItem>
                <SelectItem value="pork">Pork</SelectItem>
                <SelectItem value="lamb">Lamb</SelectItem>
                <SelectItem value="poultry">Poultry</SelectItem>
                <SelectItem value="seafood">Seafood</SelectItem>
                <SelectItem value="game">Game</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs mb-1">Raw (lb)</div>
            <Input type="number" min={0} step={0.01} value={rawLb}
              onChange={(e)=>{ setRawLb(Number(e.target.value)); setLastEdited('raw'); }} />
          </div>
          <div>
            <div className="text-xs mb-1">Finished (lb)</div>
            <Input type="number" min={0} step={0.01} value={finishedLb}
              onChange={(e)=>{ setFinishedLb(Number(e.target.value)); setLastEdited('finished'); }} />
          </div>
          <div>
            <div className="text-xs mb-1">Yield (%)</div>
            <Input type="number" min={1} max={100} step={0.1} value={yieldPct}
              onChange={(e)=>{ setYieldPct(Number(e.target.value)); setLastEdited('yield'); }} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <div className="text-xs mb-1">Outlet</div>
            <Select value={outletId} onValueChange={setOutletId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {departments.filter(d=>d.kind==='outlet').map(d=> (
                  <SelectItem value={d.id} key={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs mb-1">Service Date</div>
            <Input type="date" value={serviceDate} onChange={(e)=> setServiceDate(e.target.value)} />
          </div>
          <div>
            <div className="text-xs mb-1">Service Time</div>
            <Input type="time" value={serviceTime} onChange={(e)=> setServiceTime(e.target.value)} />
          </div>
          <div>
            <div className="text-xs mb-1">Deliver By</div>
            <Select value={deliverBy} onValueChange={setDeliverBy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Butcher Runner">Butcher Runner</SelectItem>
                <SelectItem value="Stewarding">Stewarding</SelectItem>
                <SelectItem value="Banquets Runner">Banquets Runner</SelectItem>
                <SelectItem value="Kitchen Porter">Kitchen Porter</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs mb-1">BEO/REO</div>
            <Input value={beoId} onChange={(e)=> setBeoId(e.target.value)} placeholder="beo-123 or reo-456" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline">Computed Yield: {computed.pct.toFixed(1)}%</Badge>
          <Badge variant="secondary">Raw Needed: {computed.raw.toFixed(2)} lb</Badge>
          <Badge>Finished: {computed.fin.toFixed(2)} lb</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={addToOrders}>Add To Orders</Button>
          <Button variant="outline" onClick={saveOverride}>Save Yield Override</Button>
          <Button variant="outline" onClick={print}>Print Test</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ButcherYieldTest;
