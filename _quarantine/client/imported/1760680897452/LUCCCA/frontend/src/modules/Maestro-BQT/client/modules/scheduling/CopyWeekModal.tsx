import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../..//components/ui/dialog';
import { Button } from '../..//components/ui/button';

export const CopyWeekModal: React.FC<{ open: boolean; onOpenChange:(v:boolean)=>void; onConfirm:(offset:number)=>void; }>=({ open, onOpenChange, onConfirm })=>{
  const [offset, setOffset] = React.useState(1);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy Week</DialogTitle>
          <DialogDescription>Duplicate all shifts from this week to another week offset.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="text-sm">Weeks forward/back</label>
          <input type="number" className="border rounded px-2 py-1 w-24" value={offset} onChange={e=> setOffset(parseInt(e.target.value||'0',10))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=> onOpenChange(false)}>Cancel</Button>
            <Button onClick={()=> onConfirm(offset)}>Copy</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CopyWeekModal;
