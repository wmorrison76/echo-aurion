import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel } from '../ui/select';
import { Label } from '../ui/label';
import { useInventoryStore } from '../../stores/inventoryStore';
import type { InventoryItem, StorageArea, TxType } from '../../stores/inventoryStore';

interface TxDialogProps {
  item: InventoryItem;
  trigger: React.ReactNode;
}

export const TxDialog: React.FC<TxDialogProps> = ({ item, trigger }) => {
  const { areas, departments, recordTx } = useInventoryStore() as any;
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TxType>('purchase');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 16)); // yyyy-MM-ddTHH:mm
  const [sourceAreaId, setSourceAreaId] = useState<string>('');
  const [destAreaId, setDestAreaId] = useState<string>('');
  const [sourceDeptId, setSourceDeptId] = useState<string>('');
  const [destDeptId, setDestDeptId] = useState<string>('');

  const needsSource = type === 'transfer_in';
  const needsDest = type === 'transfer_out';
  const needsUnitCost = type === 'purchase';

  const setMixedValue = (value: string, which: 'source' | 'dest') => {
    if (value.startsWith('area:')) {
      const id = value.slice(5);
      if (which === 'source') { setSourceAreaId(id); setSourceDeptId(''); }
      else { setDestAreaId(id); setDestDeptId(''); }
    } else if (value.startsWith('dept:')) {
      const id = value.slice(5);
      if (which === 'source') { setSourceDeptId(id); setSourceAreaId(''); }
      else { setDestDeptId(id); setDestAreaId(''); }
    }
  };

  const onSubmit = () => {
    if (!quantity || quantity <= 0) return;
    const payload: any = {
      itemId: item.id,
      type,
      quantity,
      date: new Date(date).toISOString(),
      note: note || undefined,
    };
    if (needsUnitCost && unitCost !== '') payload.unitCost = Number(unitCost);
    if (needsSource) {
      if (sourceAreaId) payload.sourceAreaId = sourceAreaId; else if (sourceDeptId) payload.sourceDepartmentId = sourceDeptId;
    }
    if (needsDest) {
      if (destAreaId) payload.destAreaId = destAreaId; else if (destDeptId) payload.destDepartmentId = destDeptId;
    }
    recordTx(payload);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Record Transaction</DialogTitle>
          <DialogDescription className="text-sm">
            {item.name} • {item.category.replace('_',' ')} • {item.unit}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1 block">Type</Label>
            <Select value={type} onValueChange={(v)=>setType(v as TxType)}>
              <SelectTrigger className="bg-white dark:bg-slate-900"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="transfer_in">Transfer In</SelectItem>
                <SelectItem value="transfer_out">Transfer Out</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block">Quantity</Label>
            <Input className="bg-white dark:bg-slate-900" type="number" min={0} step="0.01" value={quantity} onChange={(e)=>setQuantity(Number(e.target.value))} />
          </div>
          {needsUnitCost && (
            <div>
              <Label className="mb-1 block">Unit Cost</Label>
              <Input className="bg-white dark:bg-slate-900" type="number" min={0} step="0.01" value={unitCost} onChange={(e)=>setUnitCost(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
          )}
          <div>
            <Label className="mb-1 block">Date</Label>
            <Input className="bg-white dark:bg-slate-900" type="datetime-local" value={date} onChange={(e)=>setDate(e.target.value)} />
          </div>
          {needsSource && (
            <div>
              <Label className="mb-1 block">Source</Label>
              <Select onValueChange={(v)=>setMixedValue(v,'source')}>
                <SelectTrigger className="bg-white dark:bg-slate-900"><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  <SelectLabel>Areas</SelectLabel>
                  {areas.map((a: StorageArea) => (
                    <SelectItem key={a.id} value={`area:${a.id}`}>{a.name}</SelectItem>
                  ))}
                  <SelectLabel>Departments</SelectLabel>
                  {departments?.map((d: any) => (
                    <SelectItem key={d.id} value={`dept:${d.id}`}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {needsDest && (
            <div>
              <Label className="mb-1 block">Destination</Label>
              <Select onValueChange={(v)=>setMixedValue(v,'dest')}>
                <SelectTrigger className="bg-white dark:bg-slate-900"><SelectValue placeholder="Select destination" /></SelectTrigger>
                <SelectContent>
                  <SelectLabel>Areas</SelectLabel>
                  {areas.map((a: StorageArea) => (
                    <SelectItem key={a.id} value={`area:${a.id}`}>{a.name}</SelectItem>
                  ))}
                  <SelectLabel>Departments</SelectLabel>
                  {departments?.map((d: any) => (
                    <SelectItem key={d.id} value={`dept:${d.id}`}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="md:col-span-2">
            <Label className="mb-1 block">Note</Label>
            <Input className="bg-white dark:bg-slate-900" value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TxDialog;
