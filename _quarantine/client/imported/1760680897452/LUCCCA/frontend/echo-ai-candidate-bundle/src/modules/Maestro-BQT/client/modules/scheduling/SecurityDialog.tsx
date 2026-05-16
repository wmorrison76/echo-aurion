import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../..//components/ui/dialog';
import { Button } from '../..//components/ui/button';
import { useSecurityStore } from '../../stores/securityStore';
import { useStaffStore } from '../../stores/staffStore';

export const SecurityDialog: React.FC<{ open:boolean; onOpenChange:(v:boolean)=>void }>=({ open, onOpenChange })=>{
  const { encryptionEnabled, hasKey, setEncryptionEnabled, setPassphrase, clearPassphrase } = useSecurityStore();
  const [pass, setPass] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const onEnable=async()=>{
    if(!pass || pass!==confirm) return alert('Passphrases must match');
    setBusy(true);
    try{ await setPassphrase(pass); setEncryptionEnabled(true); } finally { setBusy(false); }
  };
  const onUnlock=async()=>{ if(!pass) return; setBusy(true); try{ await setPassphrase(pass); } finally { setBusy(false); } };
  const onLock=()=>{ clearPassphrase(); };

  const [status, setStatus] = React.useState<string>('');
  const encryptNow=async()=>{
    try{
      setBusy(true); setStatus('Encrypting employees...');
      const s = useStaffStore.getState();
      // trigger persist which uses secure save when enabled
      localStorage.setItem('staff:db:v1:employees', JSON.stringify(s.employees));
      // persist() in staffStore subscribes and will also secure-save; just force call
      (useStaffStore as any).setState({ employees: [...s.employees] });
      setStatus('Done');
    }finally{ setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Security & Privacy</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="rounded border p-2">
            <div className="font-medium mb-1">Encryption at Rest</div>
            <p className="text-xs text-muted-foreground">Personal info (phone, email) is encrypted with AES‑256‑GCM in your browser storage using a passphrase-derived key. Keep your passphrase safe—losing it means encrypted data cannot be recovered.</p>
            <div className="mt-2 grid grid-cols-2 gap-2 items-center">
              <label className="text-sm">Enabled</label>
              <div>{encryptionEnabled? 'Yes' : 'No'}</div>
              {!encryptionEnabled && (
                <><label className="text-sm">Set passphrase</label><input type="password" className="border rounded px-2 py-1" value={pass} onChange={e=> setPass(e.target.value)} /></>
              )}
              {!encryptionEnabled && (<><label className="text-sm">Confirm passphrase</label><input type="password" className="border rounded px-2 py-1" value={confirm} onChange={e=> setConfirm(e.target.value)} /></>)}
            </div>
            <div className="flex gap-2 mt-2">
              {!encryptionEnabled && (<Button size="sm" onClick={onEnable} disabled={busy}>Enable & Encrypt</Button>)}
              {encryptionEnabled && !hasKey && (
                <>
                  <input type="password" className="border rounded px-2 py-1 text-sm" placeholder="Enter passphrase to unlock" value={pass} onChange={e=> setPass(e.target.value)} />
                  <Button size="sm" onClick={onUnlock} disabled={busy}>Unlock</Button>
                </>
              )}
              {encryptionEnabled && hasKey && (<Button size="sm" variant="outline" onClick={onLock}>Lock</Button>)}
              {encryptionEnabled && hasKey && (<Button size="sm" onClick={encryptNow} disabled={busy}>Re-encrypt now</Button>)}
            </div>
            {status && (<div className="text-xs mt-1">{status}</div>)}
          </div>
          <div className="rounded border p-2">
            <div className="font-medium mb-1">Data Handling</div>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>No employee money or totals are shared in staff messages.</li>
              <li>PII is masked in UI when locked.</li>
              <li>Use Zapier integration for secure outbound messaging if needed. (Connect via MCP)</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
