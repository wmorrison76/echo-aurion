/**
 * Production Management Page - Maestro Banquets
 * Dedicated production scheduling and list management interface
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { ProductionListManager } from '../components/panels/ProductionListManager';
import { PrepSheetsPanel } from '../components/panels/PrepSheetsPanel';
import { SchedulerPanel } from '../modules/scheduling';
import { ProductionOrderingPanel } from '../components/panels/ProductionOrderingPanel';
import { DraggableDashboard, type PanelConfig } from '../components/panels/DraggableDashboard';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import {
  ClipboardList, Calendar, Clock, Package,
  TrendingUp, AlertTriangle, CheckCircle, Users,
  BarChart3, Timer, Target, Layers, Grid,
  List, Eye, Settings, Download, Upload, RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { cn } from '../lib/utils';
import { useStaffStore } from '../stores/staffStore';
import { useBEOStore } from '../stores/beoStore';

function AnalyticsWorkforce(){
  const { employees, assignments, query, setQuery, addEmployee, updateEmployee, removeEmployee, assignToEvent, removeAssignment } = useStaffStore();
  const { events } = useBEOStore();
  const [selectedId, setSelectedId] = useState<string | null>(employees[0]?.id || null);
  const [role, setRole] = useState('prep');
  const [eventId, setEventId] = useState<string | null>(null);
  const filtered = React.useMemo(()=>{
    const q=query.toLowerCase().trim();
    if(!q) return employees;
    return employees.filter(e=> [e.name, ...e.roles, ...e.skills, e.notes].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [employees, query]);
  const selected = employees.find(e=> e.id===selectedId) || null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-3">
        <div className="flex items-center gap-2">
          <input className="border rounded px-3 py-2 w-full" placeholder="Search roster" value={query} onChange={e=> setQuery(e.target.value)} />
          <Button onClick={()=>{ const name=prompt('Employee name'); if(!name) return; const id=addEmployee(name); setSelectedId(id); }}>Add</Button>
        </div>
        <div className="border rounded-md divide-y max-h-[520px] overflow-auto">
          {filtered.map(e=> (
            <button key={e.id} className={cn('w-full text-left p-3 hover:bg-muted/50', selectedId===e.id && 'bg-primary/10')} onClick={()=> setSelectedId(e.id)}>
              <div className="flex items-center justify-between">
                <div className="font-medium">{e.name}</div>
                <Badge variant="outline">Cook {e.level}</Badge>
              </div>
              <div className="text-xs text-muted-foreground truncate">{e.roles.join(', ') || 'No roles'} • {e.skills.join(', ') || 'No skills'}</div>
            </button>
          ))}
          {filtered.length===0 && <div className="p-3 text-sm text-muted-foreground">No matching employees</div>}
        </div>
      </div>
      <div className="lg:col-span-2 space-y-6">
        {selected ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-3">
              <div className="font-semibold mb-2">Profile</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <label className="opacity-70">Name</label>
                <input className="border rounded px-2 py-1" value={selected.name} onChange={e=> updateEmployee(selected.id, { name: e.target.value })} />
                <label className="opacity-70">Cook Level</label>
                <select className="border rounded px-2 py-1" value={selected.level} onChange={e=> updateEmployee(selected.id, { level: Number(e.target.value) as any })}>
                  {[1,2,3,4,5,6,7].map(n=> <option key={n} value={n}>Level {n}</option>)}
                </select>
                <label className="opacity-70">Roles</label>
                <input className="border rounded px-2 py-1" value={selected.roles.join(', ')} onChange={e=> updateEmployee(selected.id, { roles: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} />
                <label className="opacity-70">Skills</label>
                <input className="border rounded px-2 py-1" value={selected.skills.join(', ')} onChange={e=> updateEmployee(selected.id, { skills: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} />
                <label className="opacity-70">Dislikes</label>
                <input className="border rounded px-2 py-1" value={(selected.dislikes||[]).join(', ')} onChange={e=> updateEmployee(selected.id, { dislikes: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} />
                <label className="opacity-70">Visible Tattoos</label>
                <input type="checkbox" checked={!!selected.visibleTattoos} onChange={e=> updateEmployee(selected.id, { visibleTattoos: e.target.checked })} />
                <label className="opacity-70">Notes</label>
                <textarea className="border rounded px-2 py-1 col-span-1 md:col-span-1" value={selected.notes||''} onChange={e=> updateEmployee(selected.id, { notes: e.target.value })} />
              </div>
              <div className="pt-2 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Adjust sensitive notes via Notes</div>
                <Button variant="destructive" size="sm" onClick={()=>{ if(confirm('Remove employee?')){ removeEmployee(selected.id); setSelectedId(null);} }}>Remove</Button>
              </div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="font-semibold mb-2">Assign to Event/BEO</div>
              <div className="grid grid-cols-2 gap-2 text-sm items-center">
                <label className="opacity-70">Event</label>
                <select className="border rounded px-2 py-1" value={eventId || ''} onChange={e=> setEventId(e.target.value)}>
                  <option value="" disabled>Select event</option>
                  {events.map(ev=> <option key={ev.id} value={ev.id}>{ev.title} • {ev.date}</option>)}
                </select>
                <label className="opacity-70">Role</label>
                <input className="border rounded px-2 py-1" value={role} onChange={e=> setRole(e.target.value)} />
              </div>
              <div className="pt-2 flex items-center gap-2">
                <Button size="sm" onClick={()=>{
                  const target = eventId || events[0]?.id; if(!target) return;
                  assignToEvent(selected.id, target, role);
                }}>Assign</Button>
              </div>
              <div className="mt-3">
                <div className="font-medium text-sm mb-1">Recent Assignments</div>
                <div className="max-h-40 overflow-auto divide-y rounded border">
                  {assignments.filter(a=> a.employeeId===selected.id).map(a=> (
                    <div key={a.id} className="p-2 text-sm flex items-center justify-between">
                      <div>
                        <div className="font-medium">{events.find(e=> e.id===a.eventId)?.title || a.eventId}</div>
                        <div className="text-xs text-muted-foreground">{a.role} • {new Date(a.date).toLocaleString()}</div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={()=> removeAssignment(a.id)}>Remove</Button>
                    </div>
                  ))}
                  {assignments.filter(a=> a.employeeId===selected.id).length===0 && (
                    <div className="p-2 text-xs text-muted-foreground">No assignments yet</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Select an employee to manage details</div>
        )}
      </div>
    </div>
  );
}

import type { Employee } from '../stores/staffStore';
import type { CalendarEvent } from '../stores/beoStore';
function AssignMiniForm({ employees, events, onAssign, defaultDate }:{ employees: Employee[]; events: CalendarEvent[]; onAssign:(employeeId:string,eventId:string,role:string)=>void; defaultDate:string; }){
  const [empId, setEmpId] = React.useState(employees[0]?.id || '');
  const [eventId, setEventId] = React.useState(events[0]?.id || '');
  const [role, setRole] = React.useState('prep');
  React.useEffect(()=>{ if(!empId && employees.length) setEmpId(employees[0].id); },[employees, empId]);
  React.useEffect(()=>{ if(!eventId && events.length) setEventId(events[0].id); },[events, eventId]);
  return (
    <div className="flex items-center gap-1">
      <select className="border rounded px-1 py-0.5 text-xs" value={empId} onChange={(e)=> setEmpId(e.target.value)}>
        {employees.map(e=> (<option key={e.id} value={e.id}>{e.name}</option>))}
      </select>
      <select className="border rounded px-1 py-0.5 text-xs" value={eventId} onChange={(e)=> setEventId(e.target.value)}>
        {events.map(e=> (<option key={e.id} value={e.id}>{new Date(e.date).toLocaleDateString()} — {e.title}</option>))}
      </select>
      <select className="border rounded px-1 py-0.5 text-xs" value={role} onChange={(e)=> setRole(e.target.value)}>
        <option value="garde-manger">Garde Manger</option>
        <option value="hot-line">Hot Line</option>
        <option value="butcher">Butcher</option>
        <option value="saucier">Saucier</option>
        <option value="prep">Prep</option>
      </select>
      <Button size="sm" variant="outline" onClick={()=> onAssign(empId, eventId, role)}>Assign</Button>
    </div>
  );
}

export default function ProductionManagement() {
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  const queryView = new URLSearchParams(search || '').get('view') as 'dashboard'|'lists'|'analytics'|'schedule'|null;
  const [viewMode, setViewMode] = useState<'dashboard' | 'lists' | 'analytics' | 'schedule'>(queryView || 'dashboard');
  const [layoutStyle, setLayoutStyle] = useState<'grid' | 'timeline' | 'kanban'>('grid');

  React.useEffect(() => {
    const next = (queryView || 'dashboard') as 'dashboard' | 'lists' | 'analytics' | 'schedule';
    if (next !== viewMode) setViewMode(next);
  }, [queryView]);

  const productionStats = [
    { label: 'Active Lists', value: '8', trend: '+2', color: 'blue' },
    { label: 'Items Pending', value: '124', trend: '-15', color: 'orange' },
    { label: 'Completed Today', value: '89', trend: '+23', color: 'green' },
    { label: 'Staff Assigned', value: '16', trend: '+4', color: 'purple' },
  ];

  const { events } = useBEOStore();
  const nextEventDate = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const upcoming = events.filter(e=> e.date >= today).sort((a,b)=> a.date.localeCompare(b.date));
    return upcoming[0] ? new Date(upcoming[0].date + 'T00:00:00') : new Date();
  }, [events]);

  const dashboardPanels: PanelConfig[] = React.useMemo(() => [
    {
      id: "Today's Schedule",
      render: () => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Breakfast Service</span>
                <span className="text-green-600 font-medium">Completed</span>
              </div>
              <div className="h-2 bg-muted rounded" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Lunch Prep</span>
                <span className="text-blue-600 font-medium">In Progress (75%)</span>
              </div>
              <div className="h-2 bg-muted rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Active Production Lists</h4>
            <div className="space-y-2">
              {[
                { name: 'Wedding Reception - Johnson', items: 45, status: 'In Progress', time: '2:30 PM' },
                { name: 'Corporate Lunch - TechCorp', items: 28, status: 'Prep Phase', time: '11:00 AM' },
                { name: 'Birthday Party - Smith', items: 15, status: 'Ready', time: '6:00 PM' },
              ].map((list, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-background/50">
                  <div>
                    <div className="font-medium text-sm">{list.name}</div>
                    <div className="text-xs text-muted-foreground">{list.items} items • {list.time}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded border">
                    {list.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
      default: { x: 0, y: 0, w: 720, h: 420 },
      minW: 360,
      minH: 240,
    },
    {
      id: 'Quick Actions',
      render: () => (
        <div className="space-y-3">
          <Button className="w-full justify-start" variant="outline">
            <ClipboardList className="h-4 w-4 mr-2" />
            Generate New List
          </Button>
          <Button className="w-full justify-start" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export All Lists
          </Button>
          <Button className="w-full justify-start" variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import Schedule
          </Button>
          <Button className="w-full justify-start" variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configure Templates
          </Button>
        </div>
      ),
      default: { x: 740, y: 0, w: 320, h: 260 },
      minW: 280,
      minH: 200,
    },
    {
      id: 'Alerts',
      render: () => (
        <div className="space-y-3">
          <div className="flex items-start gap-2 p-2 rounded border-l-4 border-orange-400 bg-orange-50/30">
            <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <div className="font-medium">Inventory Low</div>
              <div className="text-muted-foreground">Salmon fillets running low for tonight's event</div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 rounded border-l-4 border-blue-400 bg-blue-50/30">
            <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <div className="font-medium">Schedule Update</div>
              <div className="text-muted-foreground">Johnson wedding moved to 6:30 PM</div>
            </div>
          </div>
        </div>
      ),
      default: { x: 740, y: 280, w: 320, h: 220 },
      minW: 280,
      minH: 180,
    },
    {
      id: 'Ordering & Yields',
      render: () => (
        <div className="p-1">
          <ProductionOrderingPanel />
        </div>
      ),
      default: { x: 0, y: 440, w: 1060, h: 420 },
      minW: 480,
      minH: 260,
    },
    {
      id: 'Production Manager',
      render: () => (
        <div className="p-1">
          <ProductionListManager selectedDate={nextEventDate} />
        </div>
      ),
      default: { x: 0, y: 880, w: 1060, h: 420 },
      minW: 480,
      minH: 260,
    },
    {
      id: 'Prep Sheets',
      render: () => (
        <div className="p-1">
          <PrepSheetsPanel date={nextEventDate} />
        </div>
      ),
      default: { x: 0, y: 1320, w: 1060, h: 380 },
      minW: 480,
      minH: 240,
    },
  ], [nextEventDate]);

  const viewControls = (
    <div className="flex items-center gap-3">
      <div className="flex border rounded-lg shadow-sm bg-background">
        <Button
          variant={viewMode === 'dashboard' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => navigate(`${pathname}`)}
          className="rounded-r-none border-r"
        >
          <BarChart3 className="h-4 w-4 mr-1" />
          Dashboard
        </Button>
        <Button
          variant={viewMode === 'lists' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => navigate(`${pathname}?view=lists`)}
          className="rounded-none border-r"
        >
          <ClipboardList className="h-4 w-4 mr-1" />
          Lists
        </Button>
        <Button
          variant={viewMode === 'schedule' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => navigate(`${pathname}?view=schedule`)}
          className="rounded-none border-r"
        >
          <Calendar className="h-4 w-4 mr-1" />
          Schedule
        </Button>
        <Button
          variant={viewMode === 'analytics' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => navigate(`${pathname}?view=analytics`)}
          className="rounded-l-none"
        >
          <TrendingUp className="h-4 w-4 mr-1" />
          Analytics
        </Button>
      </div>

      {viewMode === 'lists' && (
        <div className="flex border rounded-lg shadow-sm bg-background">
          <Button
            variant={layoutStyle === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setLayoutStyle('grid')}
            className="rounded-r-none border-r"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={layoutStyle === 'timeline' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setLayoutStyle('timeline')}
            className="rounded-none border-r"
          >
            <Timer className="h-4 w-4" />
          </Button>
          <Button
            variant={layoutStyle === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setLayoutStyle('kanban')}
            className="rounded-l-none"
          >
            <Layers className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Button variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Sync
      </Button>
    </div>
  );

  const { employees, assignments, assignToEvent } = useStaffStore();

  const [dashReset, setDashReset] = useState(0);

  return (
    <DashboardLayout
      title="Operations Orchestrator"
      subtitle="Background orchestration connecting schedules, lists, inventory, labor, and analytics"
      actions={viewControls}
    >
      <div className="space-y-6">

        {/* Main Content Based on View Mode */}
        {viewMode === 'dashboard' && (
          <ErrorBoundary onReset={()=>{ try{ localStorage.removeItem('production:layout:v1'); }catch{} setDashReset(v=> v+1); }}>
            <DraggableDashboard panels={dashboardPanels} height={1400} storageKey="production:layout:v1" resetToken={dashReset} />
          </ErrorBoundary>
        )}

        {viewMode === 'schedule' && (
          <Card className="glass-panel h-full shadow-lg -mx-4 md:-mx-6">
            <CardHeader className="border-b p-2">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="text-sm">Weekly Schedule</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {/* Existing table-based scheduler commented out during integration */}
              {/*
              <div className="overflow-auto rounded border"> ... legacy table removed for new SchedulerPanel ... </div>
              */}
              <div className="mt-1">
                {/* Integrated LUCCCA-style scheduler (inline, no inner frame) */}
                <SchedulerPanel date={nextEventDate} />
              </div>
            </CardContent>
          </Card>
        )}

        {viewMode === 'lists' && (
          <Card className="glass-panel h-full shadow-xl border-2 border-blue-500/30">
            <CardHeader className="bg-gradient-to-r from-blue-500/15 via-blue-500/10 to-transparent border-b-2 border-blue-500/20">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <ClipboardList className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-blue-700">Production Lists Management</h2>
                  <p className="text-sm text-muted-foreground">Automated generation and real-time tracking</p>
                </div>
                <Badge variant="default" className="ml-auto bg-blue-600 animate-pulse">
                  <Eye className="h-3 w-3 mr-1" />
                  {layoutStyle.charAt(0).toUpperCase() + layoutStyle.slice(1)} View
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 h-full">
              <ProductionListManager selectedDate={nextEventDate} />
            </CardContent>
          </Card>
        )}

        {viewMode === 'analytics' && (
          <Card className="glass-panel h-full shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-500/10 to-transparent border-b">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Production Analytics & Workforce
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4"/> Prep Efficiency</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-sm">Today's completion rate</div>
                    <div className="text-2xl font-bold">82%</div>
                    <div className="text-xs text-muted-foreground">Based on production list progress</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Timer className="h-4 w-4"/> Station Bottlenecks</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-sm">Top bottleneck</div>
                    <div className="text-2xl font-bold">Hot Kitchen</div>
                    <div className="text-xs text-muted-foreground">Load ≥ 75% for 2 items</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4"/> Cart Flow</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-sm">Items en route</div>
                    <div className="text-2xl font-bold">5</div>
                    <div className="text-xs text-muted-foreground">Trackable in Cart Tracker tab</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4"/> Client Preferences</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-sm">Sensitivity flags</div>
                    <div className="text-2xl font-bold">2</div>
                    <div className="text-xs text-muted-foreground">Visible tattoo policies noted</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4"/> QA Flags</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-sm">Issues to review</div>
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-xs text-muted-foreground">No blocking risks detected</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4"/> Scheduling</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-sm">Assignments today</div>
                    <div className="text-2xl font-bold">16</div>
                    <div className="text-xs text-muted-foreground">See Workforce below</div>
                  </CardContent>
                </Card>
              </div>
              <AnalyticsWorkforce />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
