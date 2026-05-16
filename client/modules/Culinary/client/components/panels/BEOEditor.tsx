import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const BEOEditor: React.FC<{ eventId?: string|null; beoId?: string|null; mode: 'edit'|'create'; onClose:()=>void; onSave:()=>void; }>=({eventId, beoId, mode, onClose, onSave})=>{
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">BEO {mode==='edit'? 'Editor':'Creator'}</div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>Event: {eventId||'—'}</div>
        <div>BEO Id: {beoId||'—'}</div>
        <Button onClick={onSave}>Save</Button>
      </CardContent>
    </Card>
  );
};
