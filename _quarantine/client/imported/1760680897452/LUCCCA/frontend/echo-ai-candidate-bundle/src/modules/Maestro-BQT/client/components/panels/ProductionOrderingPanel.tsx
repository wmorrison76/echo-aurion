import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { calculateRawFromFinished, BASE_YIELD_CATALOG, mergeYieldCatalog, type YieldCatalog, type QtyUnit } from '../../services/yield-calculator';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useSearchParams } from 'react-router-dom';

interface OrderLine {
  id: string;
  outletId: string;
  itemId: string; // yield item
  prepKey: string;
  finishedQty: number;
  finishedUnit: QtyUnit;
  needByTime?: string;
  deliverBy?: string;
  prepDate: string; // YYYY-MM-DD
  result?: ReturnType<typeof calculateRawFromFinished>;
  invItemId?: string; // inventory item used for costing
}

export const ProductionOrderingPanel: React.FC<{ extraCatalog?: YieldCatalog }>=({ extraCatalog })=>{
  const [searchParams] = useSearchParams();
  const departments = useInventoryStore(s=>s.departments);
  const items = useInventoryStore(s=>s.items);

  // Quick-connect: outlets can deep-link by passing ?connect=<departmentId>
  // Example: /production?connect=dept-rest to auto-select Restaurant without additional coding
  const quickConnectOutlet = searchParams.get('connect') || '';

  const catalog = useMemo(()=> mergeYieldCatalog(BASE_YIELD_CATALOG, extraCatalog), [extraCatalog]);
  const [outletId, setOutletId] = useState<string>(quickConnectOutlet || (departments.find(d=>d.kind==='outlet')?.id || ''));
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [printDate, setPrintDate] = useState<string>(()=> new Date().toISOString().slice(0,10));

  const last48hPurchases = useMemo(()=>{
    const cutoff = Date.now() - 48*60*60*1000;
    return useInventoryStore.getState().tx
      .filter(t=> t.type==='purchase' && new Date(t.date).getTime()>=cutoff)
      .map(t=> ({ id: t.id, item: items.find(i=>i.id===t.itemId)?.name || t.itemId, qty: t.quantity, unitCost: t.unitCost }));
  }, [items]);

  const arrivingToday = useMemo(()=>{
    return lines.filter(l=> l.prepDate===printDate).map(l=> ({ outlet: l.outletId, item: catalog[l.itemId].name, needBy: l.needByTime||'' }));
  }, [lines, printDate, catalog]);

  useEffect(()=>{
    if (quickConnectOutlet && departments.some(d=>d.id===quickConnectOutlet)) {
      setOutletId(quickConnectOutlet);
    }
  }, [quickConnectOutlet, departments]);

  const addLine = ()=>{
    const id = `line-${Date.now()}`;
    setLines(l=>[...l, { id, outletId, itemId: 'cabbage', prepKey: 'shaved_1_8', finishedQty: 1, finishedUnit: 'gallon', prepDate: printDate, needByTime: '10:00', deliverBy: '' }]);
  };

  const recalc = (line: OrderLine): OrderLine => {
    const result = calculateRawFromFinished(catalog, {
      itemId: line.itemId,
      prepKey: line.prepKey,
      finishedQty: Number(line.finishedQty) || 0,
      finishedUnit: line.finishedUnit
    });
    // Try to find inventory item by name contains catalog item name
    const inv = items.find(i => i.name.toLowerCase().includes(catalog[line.itemId].name.split(',')[0].toLowerCase()))
    return { ...line, result, invItemId: inv?.id };
  };

  const costEstimate = (line: OrderLine): number => {
    const invItem = items.find(i => i.id === line.invItemId);
    if (!invItem || !line.result) return 0;
    // Assume inventory item in pounds for produce for now
    const costPerLb = invItem.unit === 'lb' ? invItem.unitCost : invItem.unit === 'kg' ? invItem.unitCost / 2.20462 : invItem.unitCost;
    return Number((costPerLb * line.result.rawWeightLb).toFixed(2));
  };

  const totalCost = lines.reduce((s, ln)=> s + costEstimate(ln), 0);

  const printLines = ()=>{
    const win = window.open('', '_blank');
    if (!win) return;
    const outletName = (id?: string)=> departments.find(d=> d.id===id)?.name || '-';
    const html = `<!doctype html><html><head><title>Production Orders ${printDate}</title>
      <style>body{font-family:ui-sans-serif,system-ui,-apple-system;}h1{font-size:18px;margin:0 0 8px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ccc;padding:6px;font-size:12px;text-align:left}thead{background:#f4f4f4}</style>
    </head><body>
      <h1>Production Orders — ${printDate}</h1>
      <table><thead><tr><th>Outlet</th><th>Item / Prep</th><th>Finished</th><th>Raw (lb)</th><th>Need By</th><th>Deliver By</th></tr></thead><tbody>
      ${lines.map(ln=>{
        const rec = recalc(ln);
        const finished = `${ln.finishedQty} ${ln.finishedUnit}`;
        return `<tr><td>${outletName(ln.outletId)}</td><td>${catalog[ln.itemId].name} — ${(catalog[ln.itemId].preps[ln.prepKey]||{}).name||ln.prepKey}</td><td>${finished}</td><td>${rec.result?.rawWeightLb.toFixed(2)||''}</td><td>${ln.prepDate} ${ln.needByTime||''}</td><td>${ln.deliverBy||''}</td></tr>`;
      }).join('')}
      </tbody></table>
      <script>window.addEventListener('load',()=>{window.print(); setTimeout(()=>window.close(), 500);});</script>
    </body></html>`;
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="space-y-4">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Ordering / Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="border p-3">
              <div className="text-sm font-medium mb-2">Received in last 48 hours</div>
              <div className="space-y-1 max-h-40 overflow-auto">
                {last48hPurchases.map(p=> (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div>{p.item}</div>
                    <div className="text-muted-foreground">+{p.qty}</div>
                  </div>
                ))}
                {last48hPurchases.length===0 && <div className="text-xs text-muted-foreground">No recent receipts.</div>}
              </div>
            </Card>
            <Card className="border p-3">
              <div className="text-sm font-medium mb-2">Arriving Today</div>
              <div className="space-y-1 max-h-40 overflow-auto">
                {arrivingToday.map((r,i)=> (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>{r.item}</div>
                    <div className="text-muted-foreground">{r.needBy}</div>
                  </div>
                ))}
                {arrivingToday.length===0 && <div className="text-xs text-muted-foreground">Nothing scheduled for today.</div>}
              </div>
            </Card>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <div className="text-xs mb-1">Print Date</div>
              <Input type="date" value={printDate} onChange={(e)=>{
                setPrintDate(e.target.value);
                setLines(ls=> ls.map(l=> ({ ...l, prepDate: e.target.value })));
              }} />
            </div>
            <div className="min-w-[220px]">
              <div className="text-xs mb-1">Outlet</div>
              <Select value={outletId} onValueChange={setOutletId}>
                <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select outlet"/></SelectTrigger>
                <SelectContent>
                  {departments.filter(d=>d.kind==='outlet').map(d=> (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addLine}>Add Item</Button>
            <div className="ml-auto text-sm flex items-center gap-2">
              <Badge variant="outline">Lines: {lines.length}</Badge>
              <Badge variant="secondary">Est. Total ${totalCost.toFixed(2)}</Badge>
              <Button onClick={printLines}>Print</Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            {lines.map((line, idx)=> {
              const item = catalog[line.itemId];
              const computed = recalc(line);
              return (
                <Card key={line.id} className="border p-3">
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
                    <div>
                      <div className="text-xs mb-1">Item</div>
                      <Select value={line.itemId} onValueChange={(v)=> setLines(ls=> ls.map(l => l.id===line.id? { ...l, itemId: v }: l))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.values(catalog).map(it => (
                            <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-xs mb-1">Preparation</div>
                      <Select value={line.prepKey} onValueChange={(v)=> setLines(ls=> ls.map(l => l.id===line.id? { ...l, prepKey: v }: l))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(item.preps).map(([key, prep]) => (
                            <SelectItem key={key} value={key}>{prep.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-xs mb-1">Finished Qty</div>
                      <Input type="number" min={0} step="0.1" value={line.finishedQty}
                        onChange={(e)=> setLines(ls=> ls.map(l => l.id===line.id? { ...l, finishedQty: Number(e.target.value) }: l))} />
                    </div>
                    <div>
                      <div className="text-xs mb-1">Unit</div>
                      <Select value={line.finishedUnit} onValueChange={(v)=> setLines(ls=> ls.map(l => l.id===line.id? { ...l, finishedUnit: v as QtyUnit }: l))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(['gallon','qt','lb','kg','oz'] as QtyUnit[]).map(u => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-xs mb-1">Need By</div>
                      <div className="flex gap-2">
                        <Input type="date" value={line.prepDate} onChange={(e)=> setLines(ls=> ls.map(l => l.id===line.id? { ...l, prepDate: e.target.value }: l))} />
                        <Input type="time" value={line.needByTime||''} onChange={(e)=> setLines(ls=> ls.map(l => l.id===line.id? { ...l, needByTime: e.target.value }: l))} />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs mb-1">Deliver By</div>
                      <Select value={line.deliverBy||''} onValueChange={(v)=> setLines(ls=> ls.map(l => l.id===line.id? { ...l, deliverBy: v }: l))}>
                        <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Production Runner">Production Runner</SelectItem>
                          <SelectItem value="Stewarding">Stewarding</SelectItem>
                          <SelectItem value="Banquets Runner">Banquets Runner</SelectItem>
                          <SelectItem value="Kitchen Porter">Kitchen Porter</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-xs mb-1">Results</div>
                      <div className="text-sm p-2 rounded border bg-background/50">
                        <div>Raw: {computed.result?.rawWeightLb.toFixed(2)} lb ({computed.result?.rawQtyByUnit.qty} {computed.result?.rawQtyByUnit.unit})</div>
                        <div className="text-muted-foreground text-xs">Finished: {computed.result?.finishedWeightLb.toFixed(2)} lb</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-muted-foreground">Inventory match: {computed.invItemId ? items.find(i=>i.id===computed.invItemId)?.name : 'None'}</div>
                    <div className="text-sm font-medium">Est. Cost ${costEstimate(computed).toFixed(2)}</div>
                  </div>
                </Card>
              );
            })}
            {lines.length === 0 && (
              <div className="text-sm text-muted-foreground">Add items to build an order. Use yields to back into raw purchase quantities and costs.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProductionOrderingPanel;
