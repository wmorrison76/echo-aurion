import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type StaffAssignment = { id: string; employeeId: string; eventId: string; role: string; date: string; notes?: string };
export type Employee = {
  id: string;
  name: string;
  level: 1|2|3|4|5|6|7; // Cook level
  roles: string[]; // stations/roles
  skills: string[]; // tags like 'sauces','grill','banquet-plating'
  dislikes?: string[];
  visibleTattoos?: boolean;
  notes?: string;
  history: { tag: string; count: number }[]; // recipe/skill history tags
  payRate?: number; // hourly
  cookTitle?: string; // Sous, Jr Sous, etc
  // Extended employee info
  firstName?: string;
  lastName?: string;
  hireDate?: string; // ISO date
  employeeNumber?: string;
  phone?: string;
  email?: string;
  jobCodes?: string[];
  // Soft scheduling preferences (non-blocking alerts)
  cannotWorkDays?: number[]; // 0=Sun..6=Sat
  preferLeaveBy?: string; // 'HH:MM' 24h
  preferStartAfter?: string; // 'HH:MM' 24h
  amOnly?: boolean;
  pmOnly?: boolean;
  createdAt: string;
  updatedAt: string;
};

function uid(){ try{ return crypto.randomUUID(); }catch{ return Math.random().toString(36).slice(2);} }

interface StaffStore {
  employees: Employee[];
  assignments: StaffAssignment[];
  query: string;
  setQuery: (q:string)=> void;
  addEmployee: (name: string) => string;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;
  assignToEvent: (employeeId: string, eventId: string, role: string, notes?: string) => string;
  removeAssignment: (id: string) => void;
}

const STORAGE_KEY = 'staff:db:v1';

// lazy import to avoid circular
async function saveEmployeesSecure(employees: Employee[]){
  try{
    const { useSecurityStore } = await import('./securityStore');
    const sec = useSecurityStore.getState();
    if(sec.encryptionEnabled && sec.hasKey){
      const payload = await sec.encryptString(JSON.stringify(employees));
      localStorage.setItem('secure:employees', payload);
      localStorage.removeItem(STORAGE_KEY+':employees');
      return;
    }
  }catch{}
  try{ localStorage.setItem(STORAGE_KEY+':employees', JSON.stringify(employees)); }catch{}
}

async function loadEmployeesSecure(): Promise<Employee[]|null>{
  try{
    const payload = localStorage.getItem('secure:employees');
    if(!payload) return null;
    const { useSecurityStore } = await import('./securityStore');
    const sec = useSecurityStore.getState(); if(!sec.hasKey) return [];
    const json = await sec.decryptString(payload);
    return JSON.parse(json) as Employee[];
  }catch{ return null; }
}

export const useStaffStore = create<StaffStore>()(devtools((set,get)=>({
  employees: (()=>{ try{ const raw=localStorage.getItem(STORAGE_KEY+':employees'); return raw? JSON.parse(raw) as Employee[] : []; }catch{ return []; } })(),
  assignments: (()=>{ try{ const raw=localStorage.getItem(STORAGE_KEY+':assignments'); return raw? JSON.parse(raw) as StaffAssignment[] : []; }catch{ return []; } })(),
  query: '',
  setQuery: (q)=> set({ query:q }),
  addEmployee: (name)=>{ const now=new Date().toISOString(); const [fn, ...rest] = name.split(' '); const ln = rest.join(' ');
    const emp: Employee={ id: uid(), name, firstName: fn, lastName: ln, level: 4, roles: [], skills: [], history: [], payRate: 20, cookTitle: 'Cook 4', jobCodes: [], cannotWorkDays: [], phone: '', email: '', createdAt: now, updatedAt: now };
    set(s=>({ employees:[emp, ...s.employees] })); persist(); return emp.id; },
  updateEmployee: (id, patch)=> set(s=>({ employees: s.employees.map(e=> e.id===id? { ...e, ...patch, updatedAt: new Date().toISOString() } : e) })),
  removeEmployee: (id)=> set(s=>({ employees: s.employees.filter(e=> e.id!==id), assignments: s.assignments.filter(a=> a.employeeId!==id) })),
  assignToEvent: (employeeId, eventId, role, notes)=>{ const a: StaffAssignment={ id: uid(), employeeId, eventId, role, date: new Date().toISOString(), notes }; set(s=>({ assignments:[a, ...s.assignments] })); persist(); return a.id; },
  removeAssignment: (id)=> set(s=>({ assignments: s.assignments.filter(a=> a.id!==id) })),
})));

// async persist writes
function persist(){
  try{ const s=useStaffStore.getState(); localStorage.setItem(STORAGE_KEY+':assignments', JSON.stringify(s.assignments)); }catch{}
  saveEmployeesSecure(useStaffStore.getState().employees);
}

useStaffStore.subscribe((s, prev)=>{ if(s.employees!==prev.employees || s.assignments!==prev.assignments) persist(); });

// On load, try to hydrate from secure storage after unlock
(async ()=>{
  const secure = await loadEmployeesSecure();
  if(Array.isArray(secure)) useStaffStore.setState({ employees: secure });
})();

export default useStaffStore;
