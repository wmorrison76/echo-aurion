import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useInventoryStore } from '../../stores/inventoryStore';
import type { Category, InventoryItem, StorageArea } from '../../stores/inventoryStore';

interface RowState { selected: boolean; qty: number; }

interface Props {
  defaultDestAreaId?: string | null;
}

const categories: { value: Category; label: string }[] = [
  { value: 'protein', label: 'Protein' },
  { value: 'seafood', label: 'Seafood' },
  { value: 'produce', label: 'Produce' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'dry_goods', label: 'Dry Goods' },
  { value: 'beverage', label: 'Beverage' },
  { value: 'disposable', label: 'Disposable' },
  { value: 'other', label: 'Other' },
];

const StoreroomPullPanel: React.FC<Props> = ({ defaultDestAreaId }) => {
  const { items, areas, recordTx } = useInventoryStore();
  const [category, setCategory] = useState<Category>('protein');
  const [destAreaId, setDestAreaId] = useState<string>(defaultDestAreaId || '');
  const [rows, setRows] = useState<Record<string, RowState>>({});

  const filtered = useMemo(() => items.filter(i => i.category === category), [items, category]);

  const setRow = (id: string, next: Partial<RowState>) => setRows((r) => ({ ...r, [id]: { selected: false, qty: 1, ...(r[id] || {}), ...next } }));

  const onPull = () => {
    if (!destAreaId) return;
    for (const it of filtered) {
      const row = rows[it.id];
      if (!row?.selected || !row.qty || row.qty <= 0) continue;
      recordTx({ itemId: it.id, type: 'transfer_in', quantity: row.qty, date: new Date().toISOString(), note: 'Storeroom Pull', destAreaId });
    }
    setRows({});
  };

  return (
    <Card>
      <CardHeader className="border-b"><CardTitle>Storeroom Pull</CardTitle></CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-xs mb-1">Category</div>
            <Select value={category} onValueChange={(v)=>setCategory(v as Category)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs mb-1">Destination Area</div>
            <Select value={destAreaId} onValueChange={setDestAreaId}>
              <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
              <SelectContent>
                {areas.map((a: StorageArea) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end"><Button className="w-full" onClick={onPull} disabled={!destAreaId}>Pull Selected</Button></div>
        </div>
        <div className="text-xs text-muted-foreground">Select items to pull from storeroom by category.</div>
        <div className="border rounded-md divide-y">
          {filtered.map((it) => {
            const r = rows[it.id] || { selected: false, qty: 1 };
            return (
              <div key={it.id} className="p-3 flex items-center justify-between">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={r.selected} onChange={(e)=>setRow(it.id, { selected: e.target.checked })} />
                  <div>
                    <div className="font-medium">{it.name}</div>
                    <div className="text-xs text-muted-foreground">{it.unit} • ${it.unitCost.toLocaleString()}</div>
                  </div>
                </label>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">Qty</div>
                  <Input type="number" className="w-24" min={0} step="0.01" value={r.qty} onChange={(e)=>setRow(it.id, { qty: Number(e.target.value) })} />
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-6 text-center text-muted-foreground">No items in this category.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StoreroomPullPanel;
