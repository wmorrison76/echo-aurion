import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../..//components/ui/dialog';
import { Button } from '../..//components/ui/button';
import { useScheduleSettings, type ConditionalRule, type ConditionType } from './scheduleSettingsStore';

const TYPES: { value: ConditionType; label: string }[] = [
  { value: 'startBefore', label: 'Start before (HH:mm)' },
  { value: 'startAfter', label: 'Start after (HH:mm)' },
  { value: 'endAfter', label: 'End after (HH:mm)' },
  { value: 'durationGte', label: 'Duration ≥ hours' },
  { value: 'roleIs', label: 'Role equals' },
  { value: 'positionIncludes', label: 'Position contains' },
  { value: 'dayIs', label: 'Day of week (0=Sun..6=Sat)' },
  { value: 'unassigned', label: 'Unassigned shift' },
];

export const ConditionalFormattingDialog: React.FC<{ open:boolean; onOpenChange:(v:boolean)=>void }>=({ open, onOpenChange })=>{
  const { conditionalRules, addConditionalRule, updateConditionalRule, removeConditionalRule } = useScheduleSettings();
  const [newType, setNewType] = React.useState<ConditionType>('startBefore');
  const [newValue, setNewValue] = React.useState<string>('10:00');
  const [newColor, setNewColor] = React.useState<string>('#fde68a');
  const [newLabel, setNewLabel] = React.useState<string>('');

  const add=()=>{ addConditionalRule({ type:newType, value: newType==='durationGte'? Number(newValue)||0 : newValue, color: newColor, label: newLabel, enabled: true }); setNewLabel(''); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Conditional Formatting</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded border p-2">
            <div className="font-medium mb-1">Add rule</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-center">
              <select className="border rounded px-2 py-1" value={newType} onChange={e=> setNewType(e.target.value as ConditionType)}>
                {TYPES.map(t=> (<option key={t.value} value={t.value}>{t.label}</option>))}
              </select>
              <input className="border rounded px-2 py-1" value={newValue} onChange={e=> setNewValue(e.target.value)} placeholder="Value" />
              <input type="color" value={newColor} onChange={e=> setNewColor(e.target.value)} />
              <div className="flex items-center gap-2">
                <input className="border rounded px-2 py-1 flex-1" placeholder="Label (optional)" value={newLabel} onChange={e=> setNewLabel(e.target.value)} />
                <Button size="sm" onClick={add}>Add</Button>
              </div>
            </div>
          </div>
          <div>
            <div className="font-medium mb-1">Rules</div>
            <div className="space-y-2">
              {conditionalRules.length===0 && (<div className="text-xs text-muted-foreground">No rules yet.</div>)}
              {conditionalRules.map(r=> (
                <div key={r.id} className="flex items-center gap-2 border rounded p-2">
                  <input type="checkbox" checked={r.enabled!==false} onChange={e=> updateConditionalRule(r.id, { enabled: e.target.checked })} />
                  <div className="text-xs shrink-0 w-40">{TYPES.find(t=> t.value===r.type)?.label || r.type}</div>
                  <div className="text-xs">{String(r.value)}</div>
                  <input type="color" value={r.color} onChange={e=> updateConditionalRule(r.id, { color: e.target.value })} />
                  <input className="border rounded px-2 py-1 text-xs flex-1" value={r.label||''} onChange={e=> updateConditionalRule(r.id, { label: e.target.value })} placeholder="Label" />
                  <button className="text-xs underline" onClick={()=> removeConditionalRule(r.id)}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConditionalFormattingDialog;
