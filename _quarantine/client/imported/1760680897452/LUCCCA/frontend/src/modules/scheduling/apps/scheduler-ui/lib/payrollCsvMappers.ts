import type { WeeklyTotals, EmployeeWeeklyTotal } from "../../../types/payroll";

function csvEscape(x: string){ return /[",\n]/.test(x) ? '"'+x.replace(/"/g,'""')+'"' : x; }
function csv(rows: (string|number)[][]){ return rows.map(r=> r.map(x=> csvEscape(String(x ?? ''))).join(',')).join('\n'); }

import type { WeeklyTotals } from '@shared/payroll';

function baseRows(data: WeeklyTotals){
  const header = [
    'Emp ID','First','Last','Title','Reg Hrs','OT Hrs','DT Hrs','Total Hrs','Total $','Currency'
  ];
  const rows = data.employees.map(e=> [e.emp_id,e.first_name,e.last_name,e.title||'',e.reg_hours.toFixed(2),e.ot_hours.toFixed(2),e.dt_hours.toFixed(2),e.total_hours.toFixed(2),e.total_pay.toFixed(2),data.currency]);
  return [header, ...rows];
}

export function toADP(data: WeeklyTotals){ return csv(baseRows(data)); }
export function toQuickBooks(data: WeeklyTotals){ return csv(baseRows(data)); }
export function toPaychex(data: WeeklyTotals){ return csv(baseRows(data)); }
export function toPaylocity(data: WeeklyTotals){ return csv(baseRows(data)); }
export function toGusto(data: WeeklyTotals){ return csv(baseRows(data)); }
export function toDayforce(data: WeeklyTotals){ return csv(baseRows(data)); }
export function toUKG(data: WeeklyTotals){ return csv(baseRows(data)); }
