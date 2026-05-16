import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { useRequisitionStore } from '../../stores/requisitionStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useRecipeStore } from '../../stores/recipeStore';

export const RequisitionPanel: React.FC = () => {
  const { requisitions, create, addItem } = useRequisitionStore();
  const depts = useInventoryStore(s=> s.departments.filter(d=> d.kind==='outlet'));
  const items = useInventoryStore(s=> s.items);
  const recipes = useRecipeStore(s=> s.recipes);

  const [deptId, setDeptId] = React.useState(depts[0]?.id||'');
  const [dueAt, setDueAt] = React.useState(new Date(Date.now()+24*60*60*1000).toISOString().slice(0,16));

  const [itemId, setItemId] = React.useState(items[0]?.id||'');
  const [qty, setQty] = React.useState(1);
  const [unit, setUnit] = React.useState(items[0]?.unit||'each');

  const [recipeId, setRecipeId] = React.useState<string>('');
  const [recipeQty, setRecipeQty] = React.useState(1);

  React.useEffect(()=>{
    if (!deptId && depts.length) {
      const first = depts[0]?.id;
      if (first) setDeptId(first);
    }
  },[depts.length, deptId]);
  React.useEffect(()=>{
    if (!itemId && items.length) {
      const first = items[0];
      if (first) { setItemId(first.id); setUnit(first.unit); }
    }
  },[items.length, itemId]);

  function onCreate(){ if(!deptId || !dueAt) return; create({ outletId: deptId, outletName: depts.find(d=>d.id===deptId)?.name, dueAt: new Date(dueAt).toISOString(), items: [] }); }
  function onAddItem(){ const reqId = requisitions[0]?.id; if(!reqId) return; if(!itemId) return; const it = items.find(i=> i.id===itemId)!; addItem(reqId, { name: it.name, unit, qty, inventoryItemId: itemId }); }
  function onAddRecipe(){ const reqId = requisitions[0]?.id; if(!reqId || !recipeId) return; addItem(reqId, { name: recipes[recipeId]?.name || recipeId, unit: 'batch', qty: recipeQty, recipeId }); }

  return (
    <Card className="glass-panel">
      <CardHeader><CardTitle>Internal Requisitions</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border rounded p-3 space-y-2">
            <div className="font-medium text-sm">Create Requisition</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
              <div>
                <div className="text-xs mb-1">Outlet</div>
                <Select value={deptId} onValueChange={setDeptId}>
                  <SelectTrigger><SelectValue placeholder="Select outlet"/></SelectTrigger>
                  <SelectContent>
                    {depts.map(d=> <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs mb-1">Due</div>
                <Input type="datetime-local" value={dueAt} onChange={e=> setDueAt(e.target.value)} />
              </div>
              <Button onClick={onCreate}>Create</Button>
            </div>
            <div className="text-xs text-muted-foreground">Latest requisition appears at the top. Add items below.</div>
          </div>

          <div className="border rounded p-3 space-y-2">
            <div className="font-medium text-sm">Add Inventory Item</div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
              <div className="md:col-span-2">
                <div className="text-xs mb-1">Item</div>
                <Select value={itemId} onValueChange={(v)=>{ setItemId(v); const it=items.find(i=>i.id===v); if(it) setUnit(it.unit);} }>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {items.map(i=> <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs mb-1">Qty</div>
                <Input type="number" min={0} step={0.1} value={qty} onChange={e=> setQty(Number(e.target.value))} />
              </div>
              <div>
                <div className="text-xs mb-1">Unit</div>
                <Input value={unit} onChange={e=> setUnit(e.target.value)} />
              </div>
              <Button onClick={onAddItem}>Add</Button>
            </div>
          </div>

          <div className="border rounded p-3 space-y-2">
            <div className="font-medium text-sm">Add Finished Product (Recipe)</div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
              <div className="md:col-span-2">
                <div className="text-xs mb-1">Recipe</div>
                <Select value={recipeId} onValueChange={setRecipeId}>
                  <SelectTrigger><SelectValue placeholder="Select recipe"/></SelectTrigger>
                  <SelectContent>
                    {Object.values(recipes).map(r=> <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs mb-1">Qty (batches/servings)</div>
                <Input type="number" min={1} step={1} value={recipeQty} onChange={e=> setRecipeQty(Number(e.target.value))} />
              </div>
              <div className="md:col-span-2 text-xs text-muted-foreground">Expands to raw ingredients for purchasing and prep planning.</div>
              <Button onClick={onAddRecipe}>Add</Button>
            </div>
          </div>

          <div className="border rounded p-3 space-y-2 lg:col-span-2">
            <div className="font-medium text-sm">Open Requisitions</div>
            <div className="space-y-2 max-h-[40vh] overflow-auto">
              {requisitions.map(r=> (
                <div key={r.id} className="p-2 border rounded">
                  <div className="text-sm font-medium">{r.outletName||r.outletId} • Due {new Date(r.dueAt).toLocaleString()} • {r.status}</div>
                  <div className="text-xs text-muted-foreground">Items: {r.items.length}</div>
                </div>
              ))}
              {requisitions.length===0 && <div className="text-sm text-muted-foreground">No requisitions yet.</div>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RequisitionPanel;
