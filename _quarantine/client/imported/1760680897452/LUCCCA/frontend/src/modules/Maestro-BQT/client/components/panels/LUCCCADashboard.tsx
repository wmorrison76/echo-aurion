import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Package, Users, BarChart3, MessageSquare, FileText, Presentation } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useBEOStore } from '../../stores/beoStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useStaffStore } from '../../stores/staffStore';

const StatCard: React.FC<{ title: string; value: React.ReactNode; hint?: string; icon: React.ReactNode; to?: string; color?: 'blue'|'green'|'orange'|'purple' }>=({ title, value, hint, icon, to, color='blue' })=>{
  const bg = color==='blue' ? 'bg-blue-100 text-blue-700' : color==='green' ? 'bg-green-100 text-green-700' : color==='orange' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700';
  const body = (
    <Card className="glass-panel hover:glow-effect-light dark:hover:glow-effect-dark transition-all cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{title}</div>
            <div className="text-2xl font-bold text-primary">{value}</div>
            {hint && <div className="text-[11px] opacity-70">{hint}</div>}
          </div>
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', bg)}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to} className="block focus:outline-none">{body}</Link> : body;
};

export const LUCCCADashboard: React.FC = () => {
  const { events, beos } = useBEOStore();
  const invTotal = useInventoryStore(s=> s.onHandValueTotal());
  const employees = useStaffStore(s=> s.employees);

  const stats = React.useMemo(()=>{
    const today = new Date().toISOString().split('T')[0];
    const upcoming = events.filter(e=> e.date >= today);
    const unack = events.filter(e=> !e.acknowledged).length;
    const pipeline = upcoming.reduce((s,e)=> s + (typeof e.revenue==='number' ? e.revenue : (e.guestCount||0)*95), 0);
    const staff = employees.length || 0;
    return {
      upcoming: upcoming.length,
      beos: Object.keys(beos).length,
      pipeline,
      unack,
      staff,
    };
  }, [events, beos, employees.length]);

  const upcomingList = React.useMemo(()=>{
    const today = new Date().toISOString().split('T')[0];
    return events.filter(e=> e.date >= today).slice(0,5);
  }, [events]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Upcoming Events" value={stats.upcoming} hint={`${stats.unack} unacknowledged`} icon={<Calendar className="h-5 w-5" />} to="/calendar" color="blue" />
        <StatCard title="Active BEOs" value={stats.beos} hint="Documents in progress" icon={<FileText className="h-5 w-5" />} to="/beo-management/new" color="orange" />
        <StatCard title="Inventory Value" value={`$${invTotal.toLocaleString()}`} hint="Open Inventory" icon={<Package className="h-5 w-5" />} to="/inventory" color="green" />
        <StatCard title="Team On Roster" value={stats.staff} hint="Employees" icon={<Users className="h-5 w-5" />} to="/team-dashboard" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="glass-panel">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-primary">${'{'}stats.pipeline.toLocaleString(){'}'}</div>
            <div className="text-xs text-muted-foreground">Next 30 days (estimated)</div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2"><Presentation className="h-4 w-4" /> Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {upcomingList.map((e)=> (
                <Link key={e.id} to={e.beoId ? `/beo-management/${encodeURIComponent(e.beoId)}` : `/calendar?event=${encodeURIComponent(e.id)}`} className="flex items-center justify-between p-2 rounded-md border bg-background/50 hover:bg-accent">
                  <div>
                    <div className="text-sm font-medium">{e.title}</div>
                    <div className="text-xs text-muted-foreground">{e.room} • {e.date}</div>
                  </div>
                  <Badge variant={e.acknowledged ? 'outline': 'destructive'}>{e.acknowledged ? 'confirmed' : 'unack'}</Badge>
                </Link>
              ))}
              {upcomingList.length===0 && <div className="text-sm text-muted-foreground">No upcoming events.</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Activity</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-muted-foreground">Recent changes and notifications will appear here.</div>
          <div className="pt-2">
            <Link to="/calendar"><Button variant="outline" size="sm">Open Global Calendar</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LUCCCADashboard;
