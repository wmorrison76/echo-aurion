import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const EchoIntegrationPanel: React.FC<{ isVisible: boolean; onClose:()=>void }>=({ isVisible, onClose })=>{
  if(!isVisible) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <Card className="max-w-lg w-full" onClick={(e)=> e.stopPropagation()}>
        <CardHeader className="flex items-center justify-between">
          <div className="text-lg font-semibold">Echo CRM</div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Integration settings will appear here.</div>
        </CardContent>
      </Card>
    </div>
  );
};
