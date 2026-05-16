import React, { useEffect, useState } from 'react';
import { secureSend } from '../lib/secureTransfer';

interface Rec { id:string; ts:number; vendor:string; filename:string; bytes:number; sha256:string }

export default function GlowyDeskAuditPanel({ source = '/vault/audit.jsonl' }:{ source?: string }){
  const [rows, setRows] = useState<Rec[]>([]);

  useEffect(()=>{
    fetch(source).then(r=> r.text()).then(t=>{
      const lines = t.split(/\r?\n/).filter(Boolean);
      const parsed = lines.map(l=> { try { return JSON.parse(l) as Rec; } catch { return null; } }).filter(Boolean) as Rec[];
      setRows(parsed.reverse());
    }).catch(()=> setRows([]));
  }, [source]);

  async function resend(r: Rec){
    await secureSend(r.vendor, r.filename, new TextEncoder().encode('replay'), (rec)=>{
      console.log('re-sent', rec);
    });
  }

  return (
    <div className="rounded-md border bg-white p-3">
      <div className="font-semibold mb-2">Transfer Audit</div>
      <div className="max-h-64 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600"><th>When</th><th>Vendor</th><th>File</th><th>Bytes</th><th>Hash</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map(r=> (
              <tr key={r.id} className="border-t">
                <td>{new Date(r.ts).toLocaleString()}</td>
                <td>{r.vendor}</td>
                <td>{r.filename}</td>
                <td>{r.bytes}</td>
                <td className="font-mono text-[11px]">{r.sha256.slice(0,18)}…</td>
                <td className="text-right"><button className="border rounded px-2 py-1" onClick={()=> resend(r)}>Re-send</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
