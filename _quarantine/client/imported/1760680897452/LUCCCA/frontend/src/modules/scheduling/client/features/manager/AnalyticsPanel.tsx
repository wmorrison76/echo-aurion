import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import LaborSummary from "@/features/standalone/LaborSummary";
import { EmployeeRow, DAYS, weeklyHours, DayKey } from "@/lib/schedule";
import { loadSettings } from "@/features/standalone/settings";
import { useEffect, useMemo, useState } from "react";

export default function AnalyticsPanel({ employees }:{ employees: EmployeeRow[] }){
  const [open, setOpen] = useState(false);
  
  useEffect(()=>{
    const fn = ()=> setOpen(true);
    window.addEventListener('shiftflow:open-analytics' as any, fn as any);
    return ()=> window.removeEventListener('shiftflow:open-analytics' as any, fn as any);
  },[]);

  const analytics = useMemo(() => {
    const settings = loadSettings();
    
    // Employee metrics
    const employeeMetrics = employees.map(emp => {
      const hours = weeklyHours(emp);
      const rate = emp.rate ?? settings.hourlyDefaultRate;
      const isOvertime = hours > settings.overtimeThreshold;
      const otHours = Math.max(0, hours - settings.overtimeThreshold);
      const baseCost = rate * hours;
      const otCost = rate * 1.5 * otHours;
      const totalCost = baseCost + otCost;
      
      return {
        name: emp.name,
        role: emp.role || 'Staff',
        hours,
        rate,
        cost: totalCost,
        isOvertime,
        otHours,
      };
    });

    // Daily breakdown
    const dailyBreakdown = DAYS.map(day => {
      const dayEmployees = employees.filter(e => {
        const shift = e.shifts[day as DayKey];
        return shift && (shift.in || shift.value);
      });
      
      let totalHours = 0;
      let totalCost = 0;
      
      dayEmployees.forEach(emp => {
        const shift = emp.shifts[day as DayKey];
        const rate = emp.rate ?? settings.hourlyDefaultRate;
        
        // Parse hours from shift
        const inStr = shift.in || shift.value?.split('-')[0];
        const outStr = shift.out || shift.value?.split('-')[1];
        const breakMin = shift.breakMin || 0;
        
        // Simplified time parsing
        const parseTime = (t?: string) => {
          if (!t) return null;
          const match = t.trim().match(/(\d{1,2})(?::(\d{2}))?/);
          if (!match) return null;
          let h = parseInt(match[1]);
          const m = match[2] ? parseInt(match[2]) : 0;
          if (t.toLowerCase().includes('p') && h < 12) h += 12;
          if (t.toLowerCase().includes('a') && h === 12) h = 0;
          return h * 60 + m;
        };
        
        const inMin = parseTime(inStr);
        const outMin = parseTime(outStr);
        
        if (inMin !== null && outMin !== null) {
          let workMin = outMin >= inMin ? outMin - inMin : (24 * 60 - inMin) + outMin;
          workMin = Math.max(0, workMin - breakMin);
          const hours = workMin / 60;
          totalHours += hours;
          totalCost += rate * hours;
        }
      });
      
      return {
        day,
        employees: dayEmployees.length,
        hours: totalHours,
        cost: totalCost,
      };
    });

    // Role breakdown
    const roleBreakdown: Record<string, { count: number; hours: number; cost: number }> = {};
    employeeMetrics.forEach(emp => {
      const role = emp.role;
      if (!roleBreakdown[role]) {
        roleBreakdown[role] = { count: 0, hours: 0, cost: 0 };
      }
      roleBreakdown[role].count++;
      roleBreakdown[role].hours += emp.hours;
      roleBreakdown[role].cost += emp.cost;
    });

    return {
      employeeMetrics,
      dailyBreakdown,
      roleBreakdown,
    };
  }, [employees]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Analytics</Button>
      </DialogTrigger>
      <DialogContent className="w-[96vw] max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader><DialogTitle>Analytics & Reporting</DialogTitle></DialogHeader>
        
        <div className="grid gap-6">
          {/* Summary Cards */}
          <section>
            <h3 className="font-semibold mb-3">Summary</h3>
            <LaborSummary employees={employees} />
          </section>

          {/* Employee Breakdown */}
          <section>
            <h3 className="font-semibold mb-3">Employee Hours & Costs</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Name</th>
                    <th className="text-left">Role</th>
                    <th className="text-right">Hours</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">OT Hours</th>
                    <th className="text-right">Cost</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.employeeMetrics.map((emp) => (
                    <tr key={emp.name} className="border-b hover:bg-muted/50">
                      <td className="py-2">{emp.name}</td>
                      <td className="text-muted-foreground">{emp.role}</td>
                      <td className="text-right">{emp.hours.toFixed(2)}h</td>
                      <td className="text-right">${emp.rate.toFixed(2)}/hr</td>
                      <td className="text-right">{emp.otHours.toFixed(2)}h</td>
                      <td className="text-right font-medium">${emp.cost.toFixed(2)}</td>
                      <td className="text-center">
                        {emp.isOvertime ? (
                          <span className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">OT</span>
                        ) : (
                          <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Regular</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Daily Breakdown */}
          <section>
            <h3 className="font-semibold mb-3">Daily Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Day</th>
                    <th className="text-right">Staff Scheduled</th>
                    <th className="text-right">Total Hours</th>
                    <th className="text-right">Daily Labor Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.dailyBreakdown.map((day) => (
                    <tr key={day.day} className="border-b hover:bg-muted/50">
                      <td className="py-2">{day.day}</td>
                      <td className="text-right">{day.employees}</td>
                      <td className="text-right">{day.hours.toFixed(2)}h</td>
                      <td className="text-right font-medium">${day.cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Role Breakdown */}
          <section>
            <h3 className="font-semibold mb-3">By Role/Position</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Role</th>
                    <th className="text-right">Staff Count</th>
                    <th className="text-right">Total Hours</th>
                    <th className="text-right">Total Cost</th>
                    <th className="text-right">Avg Cost/Person</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(analytics.roleBreakdown).map(([role, data]) => (
                    <tr key={role} className="border-b hover:bg-muted/50">
                      <td className="py-2">{role}</td>
                      <td className="text-right">{data.count}</td>
                      <td className="text-right">{data.hours.toFixed(2)}h</td>
                      <td className="text-right font-medium">${data.cost.toFixed(2)}</td>
                      <td className="text-right">${(data.cost / data.count).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Key Metrics */}
          <section>
            <h3 className="font-semibold mb-3">Key Performance Indicators</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(() => {
                const totalEmps = analytics.employeeMetrics.length;
                const overtimeEmps = analytics.employeeMetrics.filter(e => e.isOvertime).length;
                const avgHours = totalEmps > 0 
                  ? analytics.employeeMetrics.reduce((s, e) => s + e.hours, 0) / totalEmps 
                  : 0;
                const avgCost = totalEmps > 0 
                  ? analytics.employeeMetrics.reduce((s, e) => s + e.cost, 0) / totalEmps 
                  : 0;
                const totalHours = analytics.employeeMetrics.reduce((s, e) => s + e.hours, 0);
                const totalCost = analytics.employeeMetrics.reduce((s, e) => s + e.cost, 0);
                
                const kpis = [
                  { label: 'Total Employees', value: totalEmps },
                  { label: 'On Overtime', value: `${overtimeEmps} (${totalEmps > 0 ? ((overtimeEmps / totalEmps) * 100).toFixed(0) : 0}%)` },
                  { label: 'Avg Hours/Employee', value: avgHours.toFixed(2) + 'h' },
                  { label: 'Avg Cost/Employee', value: '$' + avgCost.toFixed(2) },
                  { label: 'Total Weekly Hours', value: totalHours.toFixed(2) + 'h' },
                  { label: 'Total Weekly Cost', value: '$' + totalCost.toFixed(2) },
                ];

                return kpis.map(kpi => (
                  <div key={kpi.label} className="bg-muted/40 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">{kpi.label}</div>
                    <div className="text-lg font-semibold">{kpi.value}</div>
                  </div>
                ));
              })()}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
