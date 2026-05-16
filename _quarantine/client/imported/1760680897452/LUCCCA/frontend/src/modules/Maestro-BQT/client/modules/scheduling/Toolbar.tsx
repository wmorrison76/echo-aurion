import React from 'react';
import { Button } from '../..//components/ui/button';
import { Download, Upload, RefreshCw, Copy, Wand2, ShieldCheck } from 'lucide-react';

export const SchedulerToolbar: React.FC<{ onAutoBuild: ()=>void; onCopyWeek: ()=>void; onValidate: ()=>void; onExport: ()=>void; onImport?: ()=>void; published?: boolean; onTogglePublish?: ()=>void; }>=({ onAutoBuild, onCopyWeek, onValidate, onExport, onImport, published, onTogglePublish })=>{
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" onClick={onAutoBuild}><Wand2 className="h-4 w-4 mr-1"/>Auto-Build</Button>
      <Button variant="outline" size="sm" onClick={onCopyWeek}><Copy className="h-4 w-4 mr-1"/>Copy Week</Button>
      <Button variant="outline" size="sm" onClick={onValidate}><ShieldCheck className="h-4 w-4 mr-1"/>Schedule Checker</Button>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onExport}><Download className="h-4 w-4 mr-1"/>Export CSV</Button>
        <Button variant="outline" size="sm" onClick={onImport}><Upload className="h-4 w-4 mr-1"/>Import</Button>
        <Button size="sm" variant={published? 'default':'outline'} onClick={onTogglePublish}><RefreshCw className="h-4 w-4 mr-1"/>{published? 'Unpublish':'Publish'}</Button>
      </div>
    </div>
  );
};

export default SchedulerToolbar;
