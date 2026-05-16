import { useMemo } from 'react';
import { evaluateCompliance, getComplianceConfig } from '@/lib/compliance';
import type { EmployeeRow } from '@/lib/schedule';

export default function BottomCheckerBar({ weekStartISO, employees }:{ weekStartISO: string; employees: EmployeeRow[] }){
  const report = useMemo(()=> evaluateCompliance(weekStartISO, employees, getComplianceConfig()), [weekStartISO, employees]);
  const alerts = report.issues;
  const msg = alerts[0]?.message ?? 'All good';
  const costPerMin = 0;
  const coverage = 0;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container px-2 h-10 flex items-center justify-between text-sm">
        <div className="truncate">{alerts.length>0? `⚠️ ${msg}` : '✅ No compliance issues detected'}</div>
        <div className="flex items-center gap-4 text-muted-foreground">
          <div>💵 Cost/Min: {costPerMin.toFixed(2)}</div>
          <div>✅ Coverage: {coverage}%</div>
        </div>
      </div>
    </div>
  );
}
