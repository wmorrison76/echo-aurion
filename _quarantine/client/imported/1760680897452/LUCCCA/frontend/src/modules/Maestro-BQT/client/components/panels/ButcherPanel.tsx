import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { useBEOStore } from '../../stores/beoStore';
import { useButcherStore } from '../../stores/butcherStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { ButcherYieldTest } from './ButcherYieldTest';
import { useCartStore } from '../../stores/cartStore';
import { Link } from 'react-router-dom';

function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

export const ButcherPanel: React.FC = ()=>{
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const events = useBEOStore(s=>s.events);
  const loadEvents = useBEOStore(s=>s.loadEvents);
  const beos = useBEOStore(s=>s.beos);
  const computed = useBEOStore(s=>s.computed);
  const regenerateFromAll = useButcherStore(s=>s.regenerateFromAll);
  const upcomingForDate = useButcherStore(s=>s.upcomingForDate);
  const orders = useButcherStore(s=>s.orders);
  const updateStatus = useButcherStore(s=>s.updateStatus);
  const updateCut = useButcherStore(s=>s.updateCut);
  const recordTransfer = useButcherStore(s=>s.recordTransfer);
  const departments = useInventoryStore(s=>s.departments);
  const items = useInventoryStore(s=>s.items);

  useEffect(()=>{ if(!events.length) loadEvents(); }, []);
  useEffect(()=>{ regenerateFromAll(); }, [JSON.stringify(events), JSON.stringify(beos)]);

  const forDay = upcomingForDate(selectedDate);

  const proteinItems = useMemo(()=> items.filter(i=> i.category==='protein' || i.category==='seafood'), [items]);

  const printOrders = (list = forDay)=>{
    const win = window.open('', '_blank');
    if (!win) return;
    const outletName = (id?: string)=> departments.find(d=> d.id===id)?.name || '-';
    const html = `<!doctype html><html><head><title>Butcher Orders ${selectedDate}</title>
      <style>
        body{font-family:ui-sans-serif,system-ui,-apple-system;}
        h1{font-size:18px;margin:0 0 8px}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th,td{border:1px solid #ccc;padding:6px;font-size:12px;text-align:left}
        thead{background:#f4f4f4}
      </style>
    </head><body>
      <h1>Butcher Orders — ${selectedDate}</h1>
      <table>
        <thead><tr><th>Outlet</th><th>Item / Cut</th><th>Raw (lb)</th><th>Finished (lb)</th><th>Prep By</th><th>Deliver By</th><th>BEO</th></tr></thead>
        <tbody>
          ${list.map(c=> `<tr>
            <td>${outletName(c.outletId)}</td>
            <td>${c.proteinName} — ${c.cut}</td>
            <td>${c.rawWeightLb.toFixed(2)}</td>
            <td>${c.finishedWeightLb.toFixed(2)}</td>
            <td>${c.dueDate} ${c.serviceTime||''}</td>
            <td>${c.deliverBy||''}</td>
            <td>${c.beoId}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <script>window.addEventListener('load',()=>{window.print(); setTimeout(()=>window.close(), 500);});</script>
    </body></html>`;
    win.document.write(html);
    win.document.close();
  };

  const [yieldOpen, setYieldOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');

  const saveYieldOverride = (name: string, value: number) => {
    try {
      const raw = localStorage.getItem('butcher.yield.overrides');
      const map = raw ? JSON.parse(raw) : {};
      map[name] = value;
      localStorage.setItem('butcher.yield.overrides', JSON.stringify(map));
    } catch {}
  };

  return (
    <div className="space-y-4">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Butchery Operations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <div className="text-xs mb-1">Prep Date</div>
              <Input type="date" value={selectedDate} onChange={(e)=> setSelectedDate(e.target.value)} />
            </div>
            <Button variant="outline" onClick={()=> regenerateFromAll()}>Refresh From BEOs</Button>
            <Button onClick={()=> printOrders()} className="ml-1">Print</Button>
            <Button variant="outline" onClick={()=> setYieldOpen(v=>!v)}>Yield Details</Button>
            <Button variant="outline" onClick={()=> setImportOpen(true)}>Import Yields</Button>
            <div className="ml-auto text-sm">
              <Badge variant="outline">Orders: {orders.length}</Badge>
              <Badge className="ml-2" variant="secondary">For {selectedDate}: {forDay.length}</Badge>
            </div>
          </div>

          <Separator />

          {yieldOpen && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border">
                <CardHeader><CardTitle className="text-base">Yield Details</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-2">Adjust assumed trim yields per item. Saved locally and used for future calculations.</div>
                  <div className="space-y-2 max-h-[36vh] overflow-auto">
                    {forDay.map(c => {
                      const current = Number((c.finishedWeightLb / Math.max(0.01, c.rawWeightLb)).toFixed(2));
                      return (
                        <div key={c.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center border rounded p-2">
                          <div className="md:col-span-2">
                            <div className="font-medium text-sm">{c.proteinName}</div>
                            <div className="text-xs text-muted-foreground">{c.cut}</div>
                          </div>
                          <div>
                            <div className="text-[11px] text-muted-foreground">Finished</div>
                            <div className="text-sm">{c.finishedWeightLb} lb</div>
                          </div>
                          <div>
                            <div className="text-[11px] text-muted-foreground">Raw</div>
                            <div className="text-sm">{c.rawWeightLb} lb</div>
                          </div>
                          <div>
                            <div className="text-[11px] text-muted-foreground">Yield</div>
                            <div className="text-sm">{(current * 100).toFixed(0)}%</div>
                          </div>
                          <div>
                            <div className="text-[11px] text-muted-foreground">Set Override</div>
                            <div className="flex items-center gap-1">
                              <Input type="number" min={1} max={100} step={1} placeholder="%"
                                onBlur={(e)=>{
                                  const pct = Math.max(1, Math.min(100, Number(e.target.value||0)));
                                  const yieldFrac = pct/100;
                                  saveYieldOverride(c.proteinName, yieldFrac);
                                  const newRaw = c.finishedWeightLb / yieldFrac;
                                  updateCut(c.id, { rawWeightLb: Number(newRaw.toFixed(2)) });
                                }} />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {forDay.length===0 && <div className="text-sm text-muted-foreground">No items for selected date.</div>}
                  </div>
                </CardContent>
              </Card>

              {/* Full Yield Test Calculator */}
              <ButcherYieldTest />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border">
              <CardHeader><CardTitle className="text-base">Daily Prep List</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[48vh] overflow-auto">
                  {forDay.map(cut => (
                    <div key={cut.id} className="rounded border p-2 bg-background/50">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{cut.proteinName}</div>
                        <Badge variant={cut.status==='ready'?'default': cut.status==='in_prep'?'secondary':'outline'}>{cut.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{cut.cut}</div>
                      <div className="grid grid-cols-3 gap-2 text-sm mt-2">
                        <div><span className="text-xs text-muted-foreground">Raw</span><div>{cut.rawWeightLb} lb</div></div>
                        <div><span className="text-xs text-muted-foreground">Finished</span><div>{cut.finishedWeightLb} lb</div></div>
                        <div><span className="text-xs text-muted-foreground">Prep By</span><div>{cut.dueDate} {cut.serviceTime}</div></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm">
                        <div>
                          <span className="text-xs text-muted-foreground">Outlet</span>
                          <div>{departments.find(d=>d.id===cut.outletId)?.name || '-'}</div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Deliver By</span>
                          <Select value={cut.deliverBy || ''} onValueChange={(v)=> updateCut(cut.id, { deliverBy: v })}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                          <span className="text-xs text-muted-foreground">BEO</span>
                          <div>{cut.beoId}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={()=> updateStatus(cut.id, 'in_prep')}>Start</Button>
                        <Button size="sm" onClick={()=> updateStatus(cut.id, 'ready')}>Mark Ready</Button>
                        <SendToCartButton cut={cut} />
                      </div>
                    </div>
                  ))}
                  {forDay.length===0 && (
                    <div className="text-sm text-muted-foreground">No prep items for the selected date.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border">
              <CardHeader><CardTitle className="text-base">Transfer / Chargeback</CardTitle></CardHeader>
              <CardContent>
                <TransferForm proteinItems={proteinItems} departments={departments.filter(d=>d.kind==='outlet')} onSubmit={(p)=>{
                  const id = recordTransfer({ ...p, date: new Date().toISOString() });
                  return id;
                }} />
              </CardContent>
            </Card>
          </div>

          <Separator />

          <Card className="border">
            <CardHeader><CardTitle className="text-base">Upcoming BEOs</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[40vh] overflow-auto">
                {events.filter(e=> e.beoId).map(e=> (
                  <Link key={e.id} to={`/beo-management/${encodeURIComponent(e.beoId!)}`} className="rounded border p-2 bg-background/50 hover:bg-accent cursor-pointer block">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{e.title}</div>
                      <Badge variant="outline">{e.date}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">Room: {e.room} • Guests: {e.guestCount}</div>
                  </Link>
                ))}
                {events.filter(e=> e.beoId).length===0 && (
                  <div className="text-sm text-muted-foreground">No linked BEOs yet.</div>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Import Dialog */}
          {importOpen && (
            <div className="border rounded p-3">
              <div className="text-sm font-medium mb-1">Import Yields (JSON)</div>
              <div className="text-xs text-muted-foreground mb-2">Paste a JSON object mapping item names to yield fractions (0-1), e.g., {`{"Beef Tenderloin":0.82}`}</div>
              <textarea className="w-full border rounded p-2 text-sm h-28" value={importText} onChange={(e)=> setImportText(e.target.value)} />
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" onClick={()=>{ try { const obj = JSON.parse(importText||'{}'); const raw = localStorage.getItem('butcher.yield.overrides'); const map = raw ? JSON.parse(raw) : {}; Object.assign(map, obj); localStorage.setItem('butcher.yield.overrides', JSON.stringify(map)); setImportOpen(false); } catch { alert('Invalid JSON'); } }}>Save</Button>
                <Button size="sm" variant="outline" onClick={()=> setImportOpen(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import type { InventoryItem, Department } from '../../stores/inventoryStore';
const TransferForm: React.FC<{
  proteinItems: InventoryItem[];
  departments: Department[];
  onSubmit: (p:{ itemId: string; quantity: number; destDepartmentId: string; note?: string; date?: string }) => string;
}> = ({ proteinItems, departments, onSubmit }) => {
  const [itemId, setItemId] = useState(proteinItems[0]?.id || '');
  const [qty, setQty] = useState<number>(1);
  const [dest, setDest] = useState<string>(departments[0]?.id || '');
  const [note, setNote] = useState('');

  useEffect(()=>{
    if (!itemId && proteinItems.length) setItemId(proteinItems[0].id);
    if (!dest && departments.length) setDest(departments[0].id);
  }, [proteinItems, departments]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="text-xs mb-1">Item</div>
          <Select value={itemId} onValueChange={setItemId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {proteinItems.map(i=> (
                <SelectItem key={i.id} value={i.id}>{i.name} (${i.unitCost}/{i.unit})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-xs mb-1">Quantity</div>
          <Input type="number" min={0} step={0.1} value={qty} onChange={(e)=> setQty(Number(e.target.value))} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="text-xs mb-1">Charge Outlet</div>
          <Select value={dest} onValueChange={setDest}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {departments.map(d=> (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-xs mb-1">Note</div>
          <Input value={note} onChange={(e)=> setNote(e.target.value)} placeholder="e.g., Smith Wedding BEO-001" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Est. Cost will be calculated in Inventory based on unit cost and quantity.</div>
        <Button onClick={()=> onSubmit({ itemId, quantity: qty, destDepartmentId: dest, note })}>Record Transfer</Button>
      </div>
    </div>
  );
};

const SendToCartButton: React.FC<{ cut: import('../../stores/butcherStore').CutRequirement }> = ({ cut }) => {
  const importFromButcher = useCartStore(s=> s.importFromButcher);
  const onSend = ()=>{
    if(!cut.beoId){ alert('No BEO linked. Attach a BEO number before sending to Cart Tracker.'); return; }
    importFromButcher({ proteinName: cut.proteinName, finishedWeightLb: cut.finishedWeightLb, beoId: cut.beoId, courseGuess: 3 });
  };
  return (
    <Button size="sm" variant="secondary" onClick={onSend}>
      Send to Cart Tracker
    </Button>
  );
};

export default ButcherPanel;
