import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../..//components/ui/dialog';

export const PolicyDialog: React.FC<{ open:boolean; onOpenChange:(v:boolean)=>void }>=({ open, onOpenChange })=>{
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Legal, Compliance, and Access Policies</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>Schedules and forecasts are advisory. Final hours, pay, and compliance are governed by property policies, union contracts (where applicable), and local law.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Union rules (if enabled) are applied as warnings only. Configure thresholds in Scheduler Settings.</li>
            <li>Meal/rest breaks, overtime, double-time, minimum turnaround, and maximum days/week are checked for alerts.</li>
            <li>Personal preferences (availability, start-after, leave-by) do not restrict scheduling and are surfaced as notices.</li>
            <li>Publishing a schedule persists a read-only snapshot for audit purposes.</li>
            <li>Access is role-based within your property; managers can publish/approve, staff can request swaps and availability.</li>
          </ul>
          <p>For questions or to update policies, contact HR or your property administrator.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
