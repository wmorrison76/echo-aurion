/**
 * Enhanced Maestro Banquets Dashboard
 * 
 * Redesigned content-only component for use within DashboardLayout
 * Features: Glass panels, metrics, activity feed, Apple-style design
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ChefHat, Calendar, Users, Package,
  BarChart3, Bell, Clock, ClipboardList, MessageCircle, Settings, Presentation,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';
import { useBEOStore } from '../../stores/beoStore';
import { useStaffStore } from '../../stores/staffStore';
import { useInventoryStore } from '../../stores/inventoryStore';

interface DeliveryItem {
  id: string;
  vendor: string;
  eta: string;
  cases: number;
  amount: number;
}


interface EnhancedMaestroDashboardProps {
  eventId?: string;
  embed?: boolean;
}

// Dashboard Metrics Cards (dynamic from store)
const DashboardMetrics: React.FC = () => {
  const { events, beos } = useBEOStore();
  const employees = useStaffStore(s=> s.employees);
  const totalInventory = useInventoryStore(s=> s.onHandValueTotal());
  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const inTwoDays = new Date(today.getTime()+2*24*60*60*1000);

    const upcoming = events.filter(e => e.date >= todayStr);
    const revenue = upcoming.reduce((s, e) => s + (typeof e.revenue === 'number' ? e.revenue : (e.guestCount||0) * 95), 0);
    // Utilization: estimate staff hours needed over next 7 days vs available
    const next7 = events.filter(e => {
      const d=new Date(e.date).getTime();
      return d >= today.getTime() && d <= today.getTime()+7*24*60*60*1000;
    });
    const neededHours = next7.reduce((sum,e)=> sum + Math.max(2, Math.round((e.guestCount||0)*0.05)), 0); // heuristic
    const staffCount = employees.length || 10;
    const availableHours = staffCount * 8 * Math.max(1, Math.min(7, next7.length ? 7 : 1));
    const utilization = Math.max(0, Math.min(100, Math.round((neededHours/Math.max(1,availableHours))*100)));
    const affecting = events.filter(e=> {
      const d = new Date(e.date+'T00:00:00').getTime();
      return d>=today.getTime() && d<=inTwoDays.getTime() && !e.acknowledged;
    }).length;
    const activeBeoCount = Object.keys(beos).length;
    return { upcoming: upcoming.length, revenue, utilization, affecting, activeBeoCount };
  }, [events, beos, employees]);

  const estFoodCost = Math.round(stats.revenue * 0.32);

  const metrics = [
    { title: 'Revenue Pipeline', value: `$${stats.revenue.toLocaleString()}`, change: 'Next 30 days', trend: 'up', color: 'green', href:'/revenue' },
    { title: 'Current Inventory', value: `$${totalInventory.toLocaleString()}`, change: 'On-hand value', trend: 'neutral', color: 'blue', href:'/inventory' },
    { title: 'Active BEOs', value: String(stats.activeBeoCount), change: `New affecting schedule: ${stats.affecting}`, trend: 'neutral', color: 'orange', href:'/beo-management/new' },
    { title: 'Team Utilization', value: `${stats.utilization}%`, change: 'Projected', trend: 'up', color: 'purple', href:'/team-dashboard' },
    { title: 'Estimated Food Cost', value: `$${estFoodCost.toLocaleString()}`, change: 'Based on 32% est.', trend: 'down', color: 'red', href:'/revenue' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {metrics.map((metric, index) => (
        <Link key={index} to={metric.href} className="block focus:outline-none" tabIndex={0}>
          <Card className="glass-panel hover:glow-effect-light dark:hover:glow-effect-dark transition-all duration-300 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                  <p className="text-3xl font-bold text-primary">{metric.value}</p>
                  <p className={cn(
                    "text-sm",
                    metric.trend === 'up' ? 'text-green-600' :
                    metric.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
                  )}>
                    {metric.change}
                  </p>
                </div>
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center",
                  metric.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                  metric.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                  metric.color === 'green' ? 'bg-green-100 text-green-600' :
                  'bg-purple-100 text-purple-600'
                )}>
                  <BarChart3 className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

// Inventory snapshot and deliveries
const InventorySnapshot: React.FC = () => {
  const total = useInventoryStore(s=> s.onHandValueTotal());
  const byCat = useInventoryStore(s=> s.byCategory());
  const vols = useInventoryStore(s=> s.volumeBreakdownByUnit());
  const topCats = Object.entries(byCat).sort((a,b)=> (b[1] as number) - (a[1] as number)).slice(0,3);
  const topUnits = Object.entries(vols).slice(0,3);
  return (
    <Link to="/inventory" className="block focus:outline-none" tabIndex={0}>
      <Card className="glass-panel hover:glow-effect-light dark:hover:glow-effect-dark transition-colors cursor-pointer">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Current Inventory Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-primary">${total.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">Top categories: {topCats.map(([c,v])=> `${c} $${(v as number).toLocaleString()}`).join(' • ')}</div>
              <div className="text-xs text-muted-foreground">Volumes: {topUnits.map(([u,q])=> `${q} ${u}`).join(' • ')}</div>
            </div>
            <div className="text-sm font-medium text-primary">Open Inventory</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

const UpcomingDeliveries: React.FC = () => {
  const deliveries: DeliveryItem[] = [
    { id: 'del-1', vendor: 'Premium Meats Co.', eta: new Date(Date.now()+24*60*60*1000).toISOString(), cases: 12, amount: 680 },
    { id: 'del-2', vendor: 'Ocean Fresh Seafood', eta: new Date(Date.now()+2*24*60*60*1000).toISOString(), cases: 9, amount: 560 },
    { id: 'del-3', vendor: 'Pacific Produce', eta: new Date(Date.now()+3*24*60*60*1000).toISOString(), cases: 18, amount: 520 },
  ];
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Incoming Deliveries
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deliveries.map(d => (
            <Link key={d.id} to="/ordering" className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-accent cursor-pointer">
              <div>
                <div className="font-medium">{d.vendor}</div>
                <div className="text-xs text-muted-foreground">ETA {new Date(d.eta).toLocaleDateString()} • {d.cases} cases</div>
              </div>
              <Badge variant="outline">${d.amount.toLocaleString()}</Badge>
            </Link>
          ))}
          {deliveries.length === 0 && (
            <div className="text-sm text-muted-foreground">No deliveries scheduled.</div>
          )}
          <div className="pt-2">
            <Link to="/ordering">
              <Button variant="outline" size="sm">Open Ordering & Invoices</Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Live Activity Feed
const LiveActivityFeed: React.FC = () => {
  const { events } = useBEOStore();
  const recent = useMemo(() => events.slice(0, 4).map((e, i) => ({
    id: `recent-${e.id || i}`,
    title: e.title,
    description: `${e.room} • ${e.time}`,
    time: 'recent',
    urgent: !e.acknowledged,
    link: e.beoId ? `/beo-management/${encodeURIComponent(e.beoId)}` : `/calendar?event=${encodeURIComponent(e.id)}`
  })), [events]);

  const activities = [
    ...recent,
    {
      id: 'static-1',
      title: 'New BEO Created',
      description: 'Smith Wedding Reception - 150 guests',
      time: '5 minutes ago',
      urgent: true,
      link: '/beo-management/new'
    },
    {
      id: 'static-2',
      title: 'Low Inventory Alert',
      description: 'Premium wine selection running low',
      time: '12 minutes ago',
      urgent: false,
      link: '/inventory'
    },
    {
      id: 'static-3',
      title: 'Staff Schedule Updated',
      description: 'Weekend coverage confirmed',
      time: '30 minutes ago',
      urgent: false,
      link: '/team-dashboard'
    },
    {
      id: 'static-4',
      title: 'Client Feedback Received',
      description: '5-star review from Johnson Anniversary',
      time: '1 hour ago',
      urgent: false,
      link: '/chat'
    }
  ];

  return (
    <Card className="glass-panel">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Live Activity Feed
          <Badge variant="destructive" className="ml-auto">
            {recent.filter(a => a.urgent).length} New
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-4">
            {activities.map((activity) => (
              <Link key={activity.id} to={activity.link} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={cn(
                  'w-2 h-2 rounded-full mt-2',
                  activity.urgent ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{activity.title}</p>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                </div>
                {activity.urgent && (
                  <Badge variant="destructive" className="text-xs">Urgent</Badge>
                )}
              </Link>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Today Schedule + AI Insights (replaces Quick Actions)
import { useAttendanceStore } from '../../modules/scheduling/useAttendanceStore';
import { toISODate, addDays, startOfWeek } from '../../modules/scheduling/time';

const TodaySchedulePanel: React.FC = () => {
  const { shifts, weekOf } = useAttendanceStore();
  const employees = useStaffStore(s=> s.employees);
  const todayIso = toISODate(new Date());
  const todays = useMemo(()=> shifts.filter(s=> s.date===todayIso).sort((a,b)=> (a.start||'').localeCompare(b.start||'')), [shifts, todayIso]);
  const who = todays.map(s=> ({ id:s.id, name: s.employeeName||'Unassigned', start: s.start, end: s.end, leave: s.leaveType, otRisk:false, employeeId: s.employeeId }));
  // OT risk (weekly >38h)
  const weekStartIso = weekOf || toISODate(startOfWeek(new Date()));
  const weekEndIso = toISODate(addDays(new Date(weekStartIso+'T00:00:00'),6));
  const hoursFor=(s:any)=> s.start&&s.end? ((parseInt(s.end.slice(0,2))*60+parseInt(s.end.slice(3))) - (parseInt(s.start.slice(0,2))*60+parseInt(s.start.slice(3))))/60 : 0;
  const hoursByEmp = useMemo(()=>{
    const map = new Map<string, number>();
    shifts.filter(s=> s.date>=weekStartIso && s.date<=weekEndIso && s.employeeId).forEach(s=>{ map.set(s.employeeId!, (map.get(s.employeeId!)||0) + hoursFor(s)); });
    return map;
  }, [shifts, weekStartIso, weekEndIso]);
  const list = who.map(w=> ({ ...w, otRisk: !!(w.employeeId && (hoursByEmp.get(w.employeeId)||0) > 38) }));

  const insights = useMemo(()=>{
    const callouts = todays.filter(s=> s.leaveType==='SICK' || s.leaveType==='PTO').length;
    const ot = Array.from(hoursByEmp.entries()).filter(([,h])=> h>38).length;
    return `${list.length} scheduled today • ${callouts} call-outs • ${ot} OT risk`;
  }, [list.length, todays.length, hoursByEmp]);

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" /> Who's Scheduled Today
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground mb-2">AI insights: {insights}</div>
        <div className="space-y-2">
          {list.map((p)=> (
            <div key={p.id} className={cn('flex items-center justify-between p-2 rounded border bg-background/50', p.leave && 'opacity-70')}
                 title={p.leave? `Leave: ${p.leave}`: undefined}>
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', p.leave? 'bg-yellow-500' : p.otRisk? 'bg-red-500' : 'bg-green-500')} />
                <div className="font-medium text-sm">{p.name}</div>
              </div>
              <div className="text-xs">{p.start || '--:--'} – {p.end || '--:--'}</div>
            </div>
          ))}
          {list.length===0 && <div className="text-sm text-muted-foreground">No one scheduled today.</div>}
        </div>
      </CardContent>
    </Card>
  );
};

// Command strip of primary destinations
const CommandStrip: React.FC = () => {
  const links = [
    { to: '/', label: 'Overview Dashboard', icon: Presentation },
    { to: '/calendar', label: 'Event Calendar', icon: Calendar, badge: 'Active' },
    { to: '/kitchen', label: 'Chef Kitchen View', icon: ChefHat, badge: 'Live' },
    { to: '/production', label: 'Production Lists', icon: ClipboardList, badge: 'Today' },
    { to: '/menu-analytics', label: 'Menu Analytics', icon: BarChart3, badge: 'Live' },
    { to: '/beo-management/new', label: 'BEO Documents', icon: Presentation, badge: 'New' },
    { to: '/timeline', label: 'Event Timeline', icon: Clock, badge: 'Live' },
    { to: '/team-dashboard', label: 'Staff Assignment', icon: Users },
    { to: '/personal-calendar', label: 'Personal Calendar', icon: Calendar },
    { to: '/inventory', label: 'Inventory Tracking', icon: Package, badge: 'Low Stock' },
    { to: '/chat', label: 'Team Communication', icon: MessageCircle, badge: '5' },
    { to: '/whiteboard', label: 'Training Hub', icon: Presentation },
    { to: '/settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <div className="border-t border-border/50 bg-background/70 backdrop-blur rounded-xl p-3 pill-box">
      <div className="flex items-center gap-2 flex-wrap">
        {links.map((l, i) => (
          <Link key={l.label} to={l.to} className="group">
            <Button variant="ghost" size="sm" className="rounded-full px-3 h-8 pill-box">
              <l.icon className="h-4 w-4 mr-2" />
              <span className="whitespace-nowrap">{l.label}</span>
              {l.badge && <Badge variant="outline" className="ml-2 text-xs">{l.badge}</Badge>}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
};

// Main Enhanced Dashboard Component with draggable/resizable/collapsible panels
import { DraggableDashboard, type PanelConfig } from './DraggableDashboard';
import ErrorBoundary from '../ui/ErrorBoundary';
import { ChefForecastPanel } from './ChefForecastPanel';

export const EnhancedMaestroDashboard: React.FC<EnhancedMaestroDashboardProps & { resetToken?: number }> = ({ eventId, resetToken, embed }) => {
  const [localReset, setLocalReset] = React.useState(0);

  if (embed) {
    return (
      <div className="space-y-6">
        <DashboardMetrics />
      </div>
    );
  }

  const panels: PanelConfig[] = React.useMemo(() => [
    {
      id: 'Metrics Overview',
      render: () => <DashboardMetrics />,
      default: { x: 0, y: 0, w: 1120, h: 220 },
      minW: 320,
      minH: 160,
    },
    {
      id: 'Live Activity Feed',
      render: () => <LiveActivityFeed />,
      default: { x: 0, y: 240, w: 720, h: 420 },
      minW: 360,
      minH: 220,
    },
    {
      id: "Today's Schedule",
      render: () => <TodaySchedulePanel />,
      default: { x: 740, y: 240, w: 360, h: 420 },
      minW: 300,
      minH: 200,
    },
    {
      id: 'Inventory Value',
      render: () => <InventorySnapshot />,
      default: { x: 0, y: 680, w: 540, h: 220 },
      minW: 320,
      minH: 160,
    },
    {
      id: 'Incoming Deliveries',
      render: () => <UpcomingDeliveries />,
      default: { x: 560, y: 680, w: 540, h: 220 },
      minW: 320,
      minH: 160,
    },
    {
      id: 'Chef Forecast',
      render: () => <ChefForecastPanel />,
      default: { x: 0, y: 920, w: 720, h: 260 },
      minW: 360,
      minH: 180,
    },
    {
      id: 'Upcoming Events',
      render: () => (
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UpcomingEventsList />
          </CardContent>
        </Card>
      ),
      default: { x: 0, y: 920, w: 540, h: 260 },
      minW: 360,
      minH: 200,
    },
    {
      id: 'Team Status',
      render: () => <TeamStatusPanel />,
      default: { x: 560, y: 920, w: 540, h: 260 },
      minW: 360,
      minH: 200,
    },
  ], []);

  return (
    <div className="space-y-6">
      <ErrorBoundary onReset={()=>{ try{ localStorage.removeItem('dashboard:layout:v1'); }catch{} setLocalReset(v=> v+1); }}>
        <DraggableDashboard panels={panels} height={1400} resetToken={(resetToken ?? 0) + localReset} storageKey="dashboard:layout:v1" />
      </ErrorBoundary>
    </div>
  );
};

const UpcomingEventsList: React.FC = () => {
  const { events } = useBEOStore();
  const today = new Date().toISOString().split('T')[0];
  const upcoming = useMemo(() => events.filter(e => e.date >= today).slice(0,5), [events, today]);
  return (
    <div className="space-y-3">
      {upcoming.map((e) => (
        <Link key={e.id} to={`/calendar?event=${encodeURIComponent(e.id)}`} className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-accent cursor-pointer">
          <div>
            <p className="font-medium">{e.title}</p>
            <p className="text-sm text-muted-foreground">{e.guestCount} guests • {e.room}</p>
          </div>
          <Badge variant={e.acknowledged ? 'outline' : 'destructive'}>
            {e.acknowledged ? 'confirmed' : 'unack'}
          </Badge>
        </Link>
      ))}
      {upcoming.length === 0 && (
        <div className="text-sm text-muted-foreground">No upcoming events.</div>
      )}
    </div>
  );
};

const TeamStatusPanel: React.FC = () => {
  const team = [
    { name: 'Chef Johnson', role: 'Head Chef', status: 'active', shift: 'Morning' },
    { name: 'Sarah Wilson', role: 'Sous Chef', status: 'active', shift: 'Evening' },
    { name: 'Mike Chen', role: 'Prep Cook', status: 'break', shift: 'Morning' },
    { name: 'Lisa Garcia', role: 'Pastry Chef', status: 'active', shift: 'All Day' }
  ];
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {team.map((member, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className={cn(
                'w-3 h-3 rounded-full',
                member.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
              )} />
              <div className="flex-1">
                <p className="font-medium text-sm">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.role} • {member.shift}</p>
              </div>
              <Badge variant="outline" className="text-xs">{member.status}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedMaestroDashboard;
