import React, { useMemo, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { useInventoryStore } from '../stores/inventoryStore';
import { ArrowLeftRight, Search } from 'lucide-react';

export default function Transfers() {
  const { tx, items, areas, departments, monthsRange, transfersByMonth } = useInventoryStore() as any;
  const [month, setMonth] = useState<string>('all');
  const [direction, setDirection] = useState<'all' | 'in' | 'out'>('all');
  const [q, setQ] = useState('');

  const months = ['all', ...monthsRange()];

  const filtered = useMemo(() => {
    let list = transfersByMonth(month) as any[];
    if (direction !== 'all') {
      list = list.filter(t => (direction === 'in' ? t.type === 'transfer_in' : t.type === 'transfer_out'));
    }
    if (q.trim()) {
      const qi = q.toLowerCase();
      list = list.filter(t => {
        const item = items.find((i:any)=>i.id===t.itemId);
        const srcA = areas.find((a:any)=>a.id===t.sourceAreaId)?.name || '';
        const dstA = areas.find((a:any)=>a.id===t.destAreaId)?.name || '';
        const srcD = departments?.find((d:any)=>d.id===t.sourceDepartmentId)?.name || '';
        const dstD = departments?.find((d:any)=>d.id===t.destDepartmentId)?.name || '';
        return [item?.name, srcA, dstA, srcD, dstD, t.note].some(v => String(v||'').toLowerCase().includes(qi));
      });
    }
    return list.sort((a,b)=> new Date(b.date).getTime()-new Date(a.date).getTime());
  }, [month, direction, q, tx, items, areas, departments]);

  return (
    <DashboardLayout title="Transfer Log" subtitle="Search transfers by month, area or department">
      <Card className="mb-4">
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><ArrowLeftRight className="h-5 w-5" /> Filters</CardTitle></CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <div className="text-xs mb-1">Month</div>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {months.map(m => (<SelectItem key={m} value={m}>{m==='all'? 'All' : m}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs mb-1">Direction</div>
            <Select value={direction} onValueChange={(v)=>setDirection(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="in">Transfer In</SelectItem>
                <SelectItem value="out">Transfer Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs mb-1">Search</div>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Item, area, department, note..." value={q} onChange={(e)=>setQ(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle>Results ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((t:any) => {
              const item = items.find((i:any)=>i.id===t.itemId);
              const src = t.sourceAreaId ? areas.find((a:any)=>a.id===t.sourceAreaId)?.name : departments?.find((d:any)=>d.id===t.sourceDepartmentId)?.name;
              const dst = t.destAreaId ? areas.find((a:any)=>a.id===t.destAreaId)?.name : departments?.find((d:any)=>d.id===t.destDepartmentId)?.name;
              return (
                <div key={t.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{item?.name || t.itemId} • {t.quantity}</div>
                    <div className="text-xs text-muted-foreground">{new Date(t.date).toLocaleString()} • {t.type.replace('_',' ')} • {src || '—'} ➜ {dst || '—'}</div>
                    {t.note && <div className="text-xs text-muted-foreground">Note: {t.note}</div>}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-6 text-center text-muted-foreground">No transfers match.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
