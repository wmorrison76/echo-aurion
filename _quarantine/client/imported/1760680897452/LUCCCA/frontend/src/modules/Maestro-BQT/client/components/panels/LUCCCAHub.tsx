import React from 'react';
import ErrorBoundary from '../ui/ErrorBoundary';
import { DraggableDashboard, type PanelConfig } from './DraggableDashboard';
import { EnhancedMaestroDashboard } from './EnhancedMaestroDashboard';
import { ProductionOrderingPanel } from './ProductionOrderingPanel';
import { PrepSheetsPanel } from './PrepSheetsPanel';
import { TodaysOutletPrepPanel } from './TodaysOutletPrepPanel';
import { FinancePnlPanel } from './FinancePnlPanel';
import { HACCPPanel } from './HACCPPanel';
import { SectionPlannerPanel } from './SectionPlannerPanel';
import { CaptainConsolePanel } from './CaptainConsolePanel';
import { MenuRecipePanel } from './MenuRecipePanel';
import { BeveragePlannerPanel } from './BeveragePlannerPanel';
import { useBEOStore } from '../../stores/beoStore';
import { Link } from 'react-router-dom';
import { useAttendanceStore } from '../../modules/scheduling/useAttendanceStore';
import { toISODate, addDays, startOfWeek } from '../../modules/scheduling/time';
import { useStaffStore } from '../../stores/staffStore';

export const LUCCCAHub: React.FC<{ resetToken?: number }> = ({ resetToken }) => {
  const UpcomingEventsList: React.FC = () => {
    const { events } = useBEOStore();
    const today = new Date().toISOString().split('T')[0];
    const list = React.useMemo(() => events.filter((e: any) => e.date >= today).slice(0,5), [events, today]);
    return (
      <div className="space-y-3">
        {list.map((e: any) => (
          <Link key={e.id} to={`/calendar?event=${encodeURIComponent(e.id)}`} className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-accent cursor-pointer">
            <div>
              <p className="font-medium">{e.title}</p>
              <p className="text-sm text-muted-foreground">{e.guestCount} guests • {e.room}</p>
            </div>
            <span className="text-xs rounded border px-2 py-1">{e.acknowledged ? 'confirmed' : 'unack'}</span>
          </Link>
        ))}
        {list.length === 0 && <div className="text-sm text-muted-foreground">No upcoming events.</div>}
      </div>
    );
  };

  const ScheduleUpdates: React.FC = () => {
    const { shifts, weekOf } = useAttendanceStore();
    const employees = useStaffStore((s:any)=> s.employees);
    const todayIso = toISODate(new Date());
    const todays = React.useMemo(()=> shifts.filter((s:any)=> s.date===todayIso).sort((a:any,b:any)=> (a.start||'').localeCompare(b.start||'')), [shifts, todayIso]);
    const weekStartIso = weekOf || toISODate(startOfWeek(new Date()));
    const weekEndIso = toISODate(addDays(new Date(weekStartIso+'T00:00:00'),6));
    const hoursFor=(s:any)=> s.start&&s.end? ((parseInt(s.end.slice(0,2))*60+parseInt(s.end.slice(3))) - (parseInt(s.start.slice(0,2))*60+parseInt(s.start.slice(3))))/60 : 0;
    const hoursByEmp = React.useMemo(()=>{
      const map = new Map<string, number>();
      shifts.filter((s:any)=> s.date>=weekStartIso && s.date<=weekEndIso && s.employeeId).forEach((s:any)=>{ map.set(s.employeeId!, (map.get(s.employeeId!)||0) + hoursFor(s)); });
      return map;
    }, [shifts, weekStartIso, weekEndIso]);
    const list = todays.map((w:any)=> ({ ...w, otRisk: !!(w.employeeId && (hoursByEmp.get(w.employeeId)||0) > 38) }));
    const callouts = todays.filter((s:any)=> s.leaveType==='SICK' || s.leaveType==='PTO').length;
    const ot = Array.from(hoursByEmp.entries()).filter(([,h])=> h>38).length;
    const insight = `${list.length} scheduled • ${callouts} call-outs • ${ot} OT risk`;
    return (
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">AI insights: {insight}</div>
        {list.map((p:any)=> (
          <div key={p.id} className={`flex items-center justify-between p-2 rounded border bg-background/50 ${p.leave? 'opacity-70':''}`} title={p.leave? `Leave: ${p.leave}`: undefined}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${p.leave? 'bg-yellow-500' : p.otRisk? 'bg-red-500' : 'bg-green-500'}`} />
              <div className="font-medium text-sm">{p.employeeName||'Unassigned'}</div>
            </div>
            <div className="text-xs">{p.start || '--:--'} – {p.end || '--:--'}</div>
          </div>
        ))}
        {list.length===0 && <div className="text-sm text-muted-foreground">No one scheduled today.</div>}
      </div>
    );
  };

  const panels: PanelConfig[] = React.useMemo(() => [
    { id: 'Metrics Overview', render: () => <EnhancedMaestroDashboard embed />, default: { x: 0, y: 0, w: 1120, h: 240 }, minW: 360, minH: 180 },
    { id: 'Upcoming Events', render: () => <UpcomingEventsList />, default: { x: 0, y: 260, w: 720, h: 420 }, minW: 360, minH: 240 },
    { id: 'Schedule Updates', render: () => <ScheduleUpdates />, default: { x: 740, y: 260, w: 520, h: 420 }, minW: 360, minH: 260 },
    { id: 'Production Lists', render: () => <TodaysOutletPrepPanel />, default: { x: 0, y: 700, w: 520, h: 360 }, minW: 360, minH: 260 },
    { id: 'BQT Prep Sheets', render: () => <PrepSheetsPanel />, default: { x: 540, y: 700, w: 360, h: 360 }, minW: 320, minH: 240 },
    { id: 'Ordering / Invoices', render: () => <ProductionOrderingPanel />, default: { x: 920, y: 700, w: 340, h: 360 }, minW: 320, minH: 240 },
    { id: 'Finance P&L', render: () => <FinancePnlPanel />, default: { x: 540, y: 1080, w: 360, h: 320 }, minW: 320, minH: 240 },
    { id: 'HACCP', render: () => <HACCPPanel />, default: { x: 920, y: 1080, w: 340, h: 320 }, minW: 320, minH: 240 },
    { id: 'Section Planner', render: () => <SectionPlannerPanel />, default: { x: 0, y: 1420, w: 520, h: 300 }, minW: 360, minH: 220 },
    { id: 'Captain Console', render: () => <CaptainConsolePanel />, default: { x: 540, y: 1420, w: 360, h: 300 }, minW: 360, minH: 220 },
    { id: 'Menu / Recipes', render: () => <MenuRecipePanel />, default: { x: 920, y: 1420, w: 340, h: 300 }, minW: 320, minH: 220 },
    { id: 'Beverage Planner', render: () => <BeveragePlannerPanel />, default: { x: 0, y: 1740, w: 520, h: 260 }, minW: 360, minH: 200 },
  ], []);

  return (
    <ErrorBoundary onReset={()=>{ try{ localStorage.removeItem('dashboard:layout:v2'); }catch{} }}>
      <DraggableDashboard panels={panels} height={1800} storageKey="dashboard:layout:v2" resetToken={resetToken} />
    </ErrorBoundary>
  );
};

export default LUCCCAHub;
