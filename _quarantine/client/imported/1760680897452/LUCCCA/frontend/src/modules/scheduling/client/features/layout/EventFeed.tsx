import { useEffect, useState } from "react";

interface Row { ts:number; type?:string; actor?:string; message?:string; data?:Record<string,unknown> }

export default function EventFeed({ source = "/vault/audit.jsonl" }:{ source?: string }){
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(()=>{
    fetch(source).then(r=>r.text()).then(t=>{
      const out: Row[] = [];
      t.split(/\r?\n/).forEach(l=>{ try{ const j = JSON.parse(l); if(j && (j.type || j.message)) out.push(j); }catch{} });
      setRows(out.reverse());
    }).catch(()=> setRows([]));
  },[source]);
  return (
    <div className="rounded-md border bg-white p-3">
      <div className="font-semibold mb-2">Events</div>
      <div className="max-h-48 overflow-auto text-sm">
        <ul className="space-y-1">
          {rows.map((r,i)=> (
            <li key={i} className="border-b last:border-0 pb-1"><span className="text-xs text-gray-500">{new Date(r.ts).toLocaleString()}</span> — <span className="font-medium">{r.type||"event"}</span> {r.actor? `• ${r.actor}`: ""} — {r.message}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
