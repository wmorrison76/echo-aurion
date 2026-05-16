import React from 'react';
import { MaestroBqtTabs } from './MaestroBqtTabs';
import { MaestroBqtDefaultRows } from './MaestroBqtTabsStore';

export const MaestroBqtConnectPanel: React.FC = () => {
  const [icsUrl, setIcsUrl] = React.useState('');
  const connectGraph = ()=> window.dispatchEvent(new CustomEvent('maestrobqt:connect-graph'));
  const connectCaldav= ()=> window.dispatchEvent(new CustomEvent('maestrobqt:connect-caldav'));
  const saveWebcal  = ()=> window.dispatchEvent(new CustomEvent('maestrobqt:set-webcal', { detail:{ url: icsUrl } }));
  return (
    <div className="space-y-4 text-sm">
      <div className="font-semibold">Phone/Outlook Sync</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border p-3"><div className="font-medium mb-1">Microsoft 365 (Graph)</div><p className="opacity-70">Connect to sync your schedule to Outlook.</p><button className="mt-2 text-xs underline" onClick={connectGraph}>Connect Microsoft 365</button></div>
        <div className="rounded-xl border p-3"><div className="font-medium mb-1">CalDAV</div><p className="opacity-70">Connect to iCloud or other CalDAV providers.</p><button className="mt-2 text-xs underline" onClick={connectCaldav}>Connect CalDAV</button></div>
      </div>
      <div className="rounded-xl border p-3"><div className="font-medium mb-1">webcal (.ics) feed</div><p className="opacity-70">Paste your server URL for read-only subscription.</p><div className="flex gap-2 items-center mt-2"><input className="border rounded px-2 py-1 w-full" placeholder="https://your-domain.com/api/personal-calendar.ics" value={icsUrl} onChange={(e)=>setIcsUrl(e.target.value)} /><button className="text-xs underline" onClick={saveWebcal}>Save</button></div></div>
    </div>
  );
};

export const MaestroBqtTabsPanel: React.FC<{ initialRows?: any; maxRows?:1|2|3; }> = ({ initialRows, maxRows=3 })=> (
  <div className="rounded-2xl shadow-xl border border-black/10 bg-white/70 dark:bg-black/40 backdrop-blur p-3 w-full">
    <MaestroBqtTabs maxRows={maxRows} initial={{ rows: initialRows ?? MaestroBqtDefaultRows }} />
  </div>
);

// Optional global registry for external panel loaders
if (typeof window !== 'undefined') {
  (window as any).__MaestroBqtPanels = { ...(window as any).__MaestroBqtPanels, MaestroBqtConnectPanel, MaestroBqtTabsPanel };
}

export default MaestroBqtConnectPanel;
