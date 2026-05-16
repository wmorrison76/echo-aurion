import { DAYS, EmployeeRow, hoursForRange, weeklyHours } from "@/lib/schedule";
import { loadSettings } from "./settings";

interface Props {
  employees: EmployeeRow[];
}

function compute(employees: EmployeeRow[]) {
  const totalHours = employees.reduce((s,e)=> s + weeklyHours(e), 0);
  const settings = loadSettings();
  const otThreshold = settings.overtimeThreshold;
  const otHours = employees.reduce((s, e) => {
    const h = weeklyHours(e);
    return s + Math.max(0, h - otThreshold);
  }, 0);
  const rate = settings.hourlyDefaultRate;
  const tips = employees.reduce((s,e)=> s + (Object.values(e.shifts).reduce((t,c)=> t + Number(c.tip ?? 0), 0)), 0);
  const laborCost = employees.reduce((s, e) => {
    const base = (e.rate ?? rate) * weeklyHours(e);
    const weeklyOt = Math.max(0, weeklyHours(e) - otThreshold);
    const otCost = (e.rate ?? rate) * 1.5 * weeklyOt;
    return s + base + otCost;
  }, 0);
  const variance = laborCost - settings.weeklyBudget;
  const splh = totalHours > 0 ? settings.weeklySales / totalHours : 0;
  return { totalHours, otHours, laborCost, variance, budget: settings.weeklyBudget, tips, splh, sales: settings.weeklySales };
}

export default function LaborSummary({ employees }: Props) {
  const { totalHours, otHours, laborCost, variance, budget, tips, splh, sales } = compute(employees);
  const card = (title: string, value: string, extra?: string) => (
    <div className="rounded-lg bg-muted/40 p-4">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
      {extra && <div className="text-xs mt-1">{extra}</div>}
    </div>
  );
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-3">
      {card("Total Hours", `${totalHours.toFixed(2)}h`)}
      {card("OT Hours (weekly)", `${otHours.toFixed(2)}h`)}
      {card("Labor Cost", `$${laborCost.toFixed(2)}`)}
      {card("Tips", `$${tips.toFixed(2)}`)}
      {card("Sales", `$${sales.toFixed(2)}`)}
      {card(
        "SPLH",
        totalHours>0? `$${splh.toFixed(2)}`: "$0.00",
      )}
      {card(
        "Budget / Variance",
        `$${budget.toFixed(2)} • ${variance>=0?"+":""}$${variance.toFixed(2)}`,
        variance>=0 ? <span className="text-emerald-500">Under/On budget</span> as any : <span className="text-red-500">Over budget</span> as any
      )}
    </div>
  );
}
