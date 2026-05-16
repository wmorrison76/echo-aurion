import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../..//components/ui/dialog';
import { Button } from '../..//components/ui/button';
import { useStaffStore, Employee } from '../../stores/staffStore';

export const PayRateDialog: React.FC<{ employee: Employee|null; onClose: ()=>void }>=({ employee, onClose })=>{
  const updateEmployee = useStaffStore(s=> s.updateEmployee);
  const [rate, setRate] = React.useState<number>(employee?.payRate || 20);
  const [title, setTitle] = React.useState<string>(employee?.cookTitle || '');
  React.useEffect(()=>{ if(employee){ setRate(employee.payRate || 20); setTitle(employee.cookTitle || ''); } }, [employee?.id]);
  if(!employee) return null;
  return (
    <Dialog open={!!employee} onOpenChange={(v)=> { if(!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Pay & Position — {employee.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Pay Rate ($/hr)</label>
            <input type="number" className="border rounded px-2 py-1" min={0} step={0.25} value={rate} onChange={e=> setRate(parseFloat(e.target.value||'0'))} />
            <label className="text-sm">Cook Position</label>
            <input className="border rounded px-2 py-1" value={title} onChange={e=> setTitle(e.target.value)} placeholder="Cook 1, Sous Chef, ..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={()=>{ updateEmployee(employee.id, { payRate: rate, cookTitle: title }); onClose(); }}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
