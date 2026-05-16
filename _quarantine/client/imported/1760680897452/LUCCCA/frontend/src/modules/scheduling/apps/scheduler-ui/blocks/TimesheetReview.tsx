import React, { useEffect, useMemo, useState } from 'react';
import type { WeeklyTotals } from '@shared/payroll';

export default function TimesheetReview({ apiUrl = '/api/payroll/weekly_totals', currency = 'USD' }:{ apiUrl?: string; currency?: string }){
  const [data, setData] = useState<WeeklyTotals | null>(null);
  const [cur, setCur] = useState<string>(currency);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(()=>{
    setLoading(true); setError(null);
    fetch(`${apiUrl}?currency=${encodeURIComponent(cur)}`)
      .then(r=> r.ok? r.json(): Promise.reject(new Error(`${r.status}`)))
      .then(setData)
      .catch(e=> setError(String(e?.message||e)))
      .finally(()=> setLoading(false));
  }, [apiUrl, cur]);

  const summary = useMemo(()=>{
    if (!data) return { reg:0, ot:0, dt:0, pay:0 };
    return data.employees.reduce((s,e)=> ({ reg: s.reg+e.reg_hours, ot: s.ot+e.ot_hours, dt: s.dt+e.dt_hours, pay: s.pay+(e.total_pay) }), { reg:0, ot:0, dt:0, pay:0 } as any);
  }, [data]);

  function exportVendor(vendor: string){
    const u = `${apiUrl}?vendor=${encodeURIComponent(vendor)}&currency=${encodeURIComponent(cur)}`;
    window.open(u, '_blank');
  }

  if (loading) return <div>Loading…</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!data) return null;

  return (
    <div className="rounded-md border bg-white p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Timesheet Review</div>
        <div className="flex items-center gap-2 text-sm">
          <label>Currency</label>
          <select value={cur} onChange={e=> setCur(e.target.value)} className="border rounded px-2 py-1">
            {['USD','CAD','GBP','EUR'].map(c=> (<option key={c} value={c}>{c}</option>))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th>Employee</th><th>Title</th><th className="text-right">Reg</th><th className="text-right">OT</th><th className="text-right">DT</th><th className="text-right">Total</th><th className="text-right">Total $</th>
            </tr>
          </thead>
          <tbody>
            {data.employees.map(e=> (
              <tr key={e.emp_id} className="border-t">
                <td>{e.first_name} {e.last_name}</td>
                <td>{e.title||''}</td>
                <td className="text-right">{e.reg_hours.toFixed(2)}</td>
                <td className="text-right">{e.ot_hours.toFixed(2)}</td>
                <td className="text-right">{e.dt_hours.toFixed(2)}</td>
                <td className="text-right">{e.total_hours.toFixed(2)}</td>
                <td className="text-right">{e.total_pay.toFixed(2)} {data.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t pt-2">
        <div className="text-sm text-gray-700">Reg {summary.reg.toFixed(2)} | OT {summary.ot.toFixed(2)} | DT {summary.dt.toFixed(2)} | Total {(summary.reg+summary.ot+summary.dt).toFixed(2)} | {data.currency} {summary.pay.toFixed(2)}</div>
        <div className="flex gap-2">
          {['adp','quickbooks','paychex','paylocity','gusto','dayforce','ukg'].map(v=> (
            <button key={v} className="border rounded px-2 py-1 text-sm" onClick={()=> exportVendor(v)}>{v.toUpperCase()}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
