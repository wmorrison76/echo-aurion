/**
 * Staff Assignment - Maestro Banquets (Org Chart)
 */
import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';
import { Users, UserPlus, Trash2 } from 'lucide-react';
import { useStaffStore, type Employee } from '../stores/staffStore';

const TEAMS = ['Garde Manger','Hot Line','Pastry','Butcher','Banquets','Stewarding'] as const;

function todayKey(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

export default function TeamDashboard() {
  const { employees, assignments, addEmployee, updateEmployee, removeEmployee, assignToEvent, removeAssignment, setQuery, query } = useStaffStore();
  const [activeDate, setActiveDate] = useState(todayKey());
  const [newName, setNewName] = useState('');

  useEffect(()=>{
    // Seed with core staff if empty
    if(employees.length===0){
      const base: Omit<Employee,'id'|'createdAt'|'updatedAt'>[] = [
        { name:'Chef Johnson', level:7, roles:['Hot Line','Leadership'], skills:['lead','grill','sauce'] },
        { name:'Maria Lopez', level:6, roles:['Garde Manger'], skills:['salads','cold apps'] },
        { name:'Priya Nair', level:6, roles:['Pastry'], skills:['pastry','dessert'] },
        { name:'Alan Chen', level:5, roles:['Banquets'], skills:['banquet-plating'] },
        { name:'Bob', level:4, roles:['Garde Manger'], skills:['utility','runner'] },
      ] as any;
      base.forEach(b=>{
        const id = useStaffStore.getState().addEmployee(b.name);
        updateEmployee(id, { level: b.level as any, roles: b.roles, skills: b.skills });
      });
      // Place Bob temporarily in Garde Manger today
      const bob = useStaffStore.getState().employees.find(e=> e.name==='Bob');
      if(bob) assignToEvent(bob.id, activeDate, 'Garde Manger', 'Temp assist');
    }
  },[]);

  const byTeam = useMemo(()=>{
    const map: Record<string, { emp: Employee; assignId: string }[]> = {};
    for(const t of TEAMS) map[t]=[];
    const todays = assignments.filter(a=> a.eventId===activeDate);
    todays.forEach(a=>{
      const emp = employees.find(e=> e.id===a.employeeId);
      if(emp) (map[a.role] ||= []).push({ emp, assignId: a.id });
    });
    return map;
  }, [assignments, employees, activeDate]);

  const filteredEmployees = useMemo(()=>{
    const set = new Set(assignments.filter(a=> a.eventId===activeDate).map(a=> a.employeeId));
    return employees.filter(e=> !set.has(e.id) && (!query || e.name.toLowerCase().includes(query.toLowerCase())));
  }, [employees, assignments, activeDate, query]);

  return (
    <DashboardLayout title="Staff Assignment" subtitle="Org chart with temporary assignment support">
      <div className="space-y-4">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Team Org Chart</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <div className="text-xs mb-1">Date</div>
                <Input type="date" value={activeDate} onChange={(e)=> setActiveDate(e.target.value)} />
              </div>
              <div className="flex-1 min-w-[240px]">
                <div className="text-xs mb-1">Add Temporary Staff</div>
                <div className="flex items-center gap-2">
                  <Input value={newName} onChange={(e)=> setNewName(e.target.value)} placeholder="Name (e.g., Bob)" />
                  <Button onClick={()=>{ if(!newName.trim()) return; const id = addEmployee(newName.trim()); assignToEvent(id, activeDate, 'Garde Manger', 'Temp'); setNewName(''); }}>Add</Button>
                </div>
              </div>
              <div className="min-w-[240px]">
                <div className="text-xs mb-1">Find Staff</div>
                <Input placeholder="Search by name" value={query} onChange={(e)=> setQuery(e.target.value)} />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEAMS.map(team=> (
                <Card key={team} className="border">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{team}</span>
                      <Badge variant="outline">{byTeam[team].length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {byTeam[team].map(({emp, assignId})=> (
                      <div key={assignId} className="flex items-center justify-between rounded border p-2 bg-background/50">
                        <div>
                          <div className="font-medium">{emp.name}</div>
                          <div className="text-xs text-muted-foreground">Lvl {emp.level} • {emp.skills.slice(0,3).join(', ')}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={()=> removeAssignment(assignId)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                    {byTeam[team].length===0 && (
                      <div className="text-sm text-muted-foreground">No one assigned</div>
                    )}

                    {/* Add existing staff to team */}
                    {filteredEmployees.length>0 && (
                      <div className="flex items-center gap-2">
                        <select className="border rounded px-2 py-1 flex-1 bg-background" onChange={(e)=>{ const id=e.target.value; if(!id) return; assignToEvent(id, activeDate, team, 'Assigned'); e.currentTarget.selectedIndex=0; }}>
                          <option value="">Add existing…</option>
                          {filteredEmployees.map(e=> (<option key={e.id} value={e.id}>{e.name}</option>))}
                        </select>
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b"><CardTitle className="text-base">All Staff</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
            {employees.map(e=> (
              <div key={e.id} className="flex items-center justify-between rounded border p-2">
                <div>
                  <div className="font-medium">{e.name}</div>
                  <div className="text-xs text-muted-foreground">Lvl {e.level} • Roles: {e.roles.join(', ')||'—'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={()=> updateEmployee(e.id, { roles:[...new Set([...e.roles,'Garde Manger'])] })}>+ GM</Button>
                  <Button size="sm" variant="ghost" onClick={()=> removeEmployee(e.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
            {employees.length===0 && <div className="text-sm text-muted-foreground">No staff yet</div>}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
