import type { WeeklyTotals } from "../../../../shared/payroll";
function csvEscape(x: string) {
  return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x;
}
function csv(rows: (string | number)[][]) {
  return rows
    .map((r) => r.map((x) => csvEscape(String(x ?? ""))).join(","))
    .join("\n");
}
function baseRows(data: WeeklyTotals) {
  const header = [
    "Emp ID",
    "First",
    "Last",
    "Title",
    "Reg Hrs",
    "OT Hrs",
    "DT Hrs",
    "Total Hrs",
    "Total $",
    "Currency",
  ];
  const rows = data.employees.map((e) => [
    e.emp_id,
    e.first_name,
    e.last_name,
    e.title || "",
    e.reg_hours.toFixed(2),
    e.ot_hours.toFixed(2),
    e.dt_hours.toFixed(2),
    e.total_hours.toFixed(2),
    e.total_pay.toFixed(2),
    data.currency,
  ]);
  return [header, ...rows];
}
export function toADP(data: WeeklyTotals): string {
  // ADP format: Company ID, Employee ID, Name, Pay Period End Date, Regular Hours, Overtime Hours, Gross Pay const header = ['Company ID', 'Employee ID', 'Last Name', 'First Name', 'Pay Period End Date', 'Regular Hours', 'Overtime Hours', 'Double Time Hours', 'Gross Pay', 'Currency Code']; const periodEnd = new Date(data.period.end); const dateStr = `${(periodEnd.getMonth()+1).toString().padStart(2,'0')}/${periodEnd.getDate().toString().padStart(2,'0')}/${periodEnd.getFullYear()}`; const rows = data.employees.map(e => [ 'DEMO-ORG', e.emp_id, e.last_name, e.first_name, dateStr, e.reg_hours.toFixed(2), e.ot_hours.toFixed(2), e.dt_hours.toFixed(2), e.total_pay.toFixed(2), data.currency ]); return csv([header, ...rows]);
}
export function toQuickBooks(data: WeeklyTotals): string {
  // QuickBooks Payroll format: Name, Class, Earnings Name, Hours, Rate, Amount const rows: (string|number)[][] = []; data.employees.forEach(e => { const baseRate = e.total_pay / e.total_hours; if (e.reg_hours > 0) { rows.push([ `${e.first_name} ${e.last_name}`, e.title || 'Employee', 'Regular Pay', e.reg_hours.toFixed(2), baseRate.toFixed(2), (e.reg_hours * baseRate).toFixed(2) ]); } if (e.ot_hours > 0) { rows.push([ `${e.first_name} ${e.last_name}`, e.title || 'Employee', 'Overtime', e.ot_hours.toFixed(2), (baseRate * 1.5).toFixed(2), (e.ot_hours * baseRate * 1.5).toFixed(2) ]); } if (e.dt_hours > 0) { rows.push([ `${e.first_name} ${e.last_name}`, e.title || 'Employee', 'Double Time', e.dt_hours.toFixed(2), (baseRate * 2).toFixed(2), (e.dt_hours * baseRate * 2).toFixed(2) ]); } }); const header = ['Employee Name', 'Class', 'Earning Type', 'Hours', 'Rate', 'Amount']; return csv([header, ...rows]);
}
export function toPaychex(data: WeeklyTotals): string {
  // Paychex format: Employee ID, Last Name, First Name, Department, Gross Pay, Regular Hours, OT Hours, DT Hours, Pay Period End Date const header = ['Employee ID', 'Last Name', 'First Name', 'Department', 'Regular Hours', 'OT Hours', 'DT Hours', 'Gross Pay', 'Currency']; const periodEnd = new Date(data.period.end); const dateStr = `${(periodEnd.getMonth()+1).toString().padStart(2,'0')}/${periodEnd.getDate().toString().padStart(2,'0')}/${periodEnd.getFullYear()}`; const rows = data.employees.map(e => [ e.emp_id, e.last_name, e.first_name, e.title || 'General', e.reg_hours.toFixed(2), e.ot_hours.toFixed(2), e.dt_hours.toFixed(2), e.total_pay.toFixed(2), data.currency ]); return csv([header, ...rows]);
}
export function toPaylocity(data: WeeklyTotals): string {
  // Paylocity format: Employee ID, First Name, Last Name, Regular Hours, Overtime Hours, Double Time Hours, Other Earnings, Net Pay const header = ['Employee ID', 'First Name', 'Last Name', 'Regular Hours', 'Overtime Hours', 'Double Time Hours', 'Gross Earnings', 'Currency']; const rows = data.employees.map(e => [ e.emp_id, e.first_name, e.last_name, e.reg_hours.toFixed(2), e.ot_hours.toFixed(2), e.dt_hours.toFixed(2), e.total_pay.toFixed(2), data.currency ]); return csv([header, ...rows]);
}
export function toGusto(data: WeeklyTotals): string {
  // Gusto format: Employee Email, Hours Worked (Regular), Hours Worked (Overtime), Bonus/Commission, Other Earnings const header = ['Employee Name', 'Employee ID', 'Regular Hours', 'Overtime Hours', 'Double Time Hours', 'Gross Pay', 'Currency']; const rows = data.employees.map(e => [ `${e.first_name} ${e.last_name}`, e.emp_id, e.reg_hours.toFixed(2), e.ot_hours.toFixed(2), e.dt_hours.toFixed(2), e.total_pay.toFixed(2), data.currency ]); return csv([header, ...rows]);
}
export function toDayforce(data: WeeklyTotals): string {
  // Dayforce format: Employee ID, Legal Name, Earning Code, Hours/Amount, Rate const rows: (string|number)[][] = []; const periodEnd = new Date(data.period.end); const dateStr = `${(periodEnd.getMonth()+1).toString().padStart(2,'0')}/${periodEnd.getDate().toString().padStart(2,'0')}/${periodEnd.getFullYear()}`; data.employees.forEach(e => { const baseRate = e.total_pay / e.total_hours; if (e.reg_hours > 0) { rows.push([ e.emp_id, `${e.first_name} ${e.last_name}`, 'REG', e.reg_hours.toFixed(2), baseRate.toFixed(2), dateStr ]); } if (e.ot_hours > 0) { rows.push([ e.emp_id, `${e.first_name} ${e.last_name}`, 'OT', e.ot_hours.toFixed(2), (baseRate * 1.5).toFixed(2), dateStr ]); } if (e.dt_hours > 0) { rows.push([ e.emp_id, `${e.first_name} ${e.last_name}`, 'DT', e.dt_hours.toFixed(2), (baseRate * 2).toFixed(2), dateStr ]); } }); const header = ['Employee ID', 'Legal Name', 'Earning Code', 'Hours', 'Rate', 'Pay Period End Date']; return csv([header, ...rows]);
}
export function toUKG(data: WeeklyTotals): string {
  // UKG (Kronos/Workforce Central) format: Employee ID, First Name, Last Name, Clock In, Clock Out, Regular Hours, OT Hours const header = ['Employee ID', 'First Name', 'Last Name', 'Regular Hours', 'Overtime Hours', 'Double Time Hours', 'Total Hours', 'Gross Pay', 'Currency']; const rows = data.employees.map(e => [ e.emp_id, e.first_name, e.last_name, e.reg_hours.toFixed(2), e.ot_hours.toFixed(2), e.dt_hours.toFixed(2), e.total_hours.toFixed(2), e.total_pay.toFixed(2), data.currency ]); return csv([header, ...rows]);
}
