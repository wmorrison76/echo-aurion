import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../..//components/ui/dialog';
import { Button } from '../..//components/ui/button';
import { FuzzyTimeInput } from './FuzzyTimeInput';
import { useStaffStore, Employee } from '../../stores/staffStore';
import { useSecurityStore } from '../../stores/securityStore';

export const EmployeeInfoDialog: React.FC<{ open:boolean; onOpenChange:(v:boolean)=>void }>=({ open, onOpenChange })=>{
  const { employees, updateEmployee } = useStaffStore();
  const [empId, setEmpId] = React.useState<string>('');
  React.useEffect(()=>{ if(open && employees.length && !empId) setEmpId(employees[0].id); }, [open, employees.length]);
  const emp = employees.find(e=> e.id===empId) || null;
  const { encryptionEnabled, hasKey } = useSecurityStore();

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [employeeNumber, setEmployeeNumber] = React.useState('');
  const [hireDate, setHireDate] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [payRate, setPayRate] = React.useState(0);
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [jobCodeInput, setJobCodeInput] = React.useState('');
  const [jobCodes, setJobCodes] = React.useState<string[]>([]);
  const [cannotWorkDays, setCannotWorkDays] = React.useState<number[]>([]);
  const [preferLeaveBy, setPreferLeaveBy] = React.useState<string>('');
  const [preferStartAfter, setPreferStartAfter] = React.useState<string>('');
  const [amOnly, setAmOnly] = React.useState(false);
  const [pmOnly, setPmOnly] = React.useState(false);

  React.useEffect(()=>{
    if(emp){
      setFirstName(emp.firstName || emp.name.split(' ')[0] || '');
      setLastName(emp.lastName || emp.name.split(' ').slice(1).join(' '));
      setEmployeeNumber(emp.employeeNumber || '');
      setHireDate(emp.hireDate || '');
      setTitle(emp.cookTitle || '');
      setPayRate(emp.payRate || 0);
      setJobCodes(emp.jobCodes || []);
      setPhone(emp.phone || '');
      setEmail(emp.email || '');
      setCannotWorkDays(emp.cannotWorkDays || []);
      setPreferLeaveBy(emp.preferLeaveBy || '');
      setPreferStartAfter(emp.preferStartAfter || '');
      setAmOnly(!!emp.amOnly);
      setPmOnly(!!emp.pmOnly);
    }
  }, [emp?.id]);

  const addJobCode=()=>{ const v=jobCodeInput.trim(); if(!v) return; setJobCodes(arr=> Array.from(new Set([...arr, v]))); setJobCodeInput(''); };
  const removeJobCode=(v:string)=> setJobCodes(arr=> arr.filter(x=> x!==v));

  const onSave=()=>{
    if(!emp) return;
    const name = `${firstName} ${lastName}`.trim();
    updateEmployee(emp.id, { name, firstName, lastName, employeeNumber, hireDate, cookTitle: title, payRate, jobCodes, phone, email, cannotWorkDays, preferLeaveBy: preferLeaveBy||undefined, preferStartAfter: preferStartAfter||undefined, amOnly, pmOnly });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Employee Info</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 items-center">
            <label className="text-sm col-span-1">Select Employee</label>
            <select className="border rounded px-2 py-1" value={empId} onChange={e=> setEmpId(e.target.value)}>
              {employees.map(e=> (<option key={e.id} value={e.id}>{e.name}</option>))}
            </select>
            <label className="text-sm">First Name</label>
            <input className="border rounded px-2 py-1" value={firstName} onChange={e=> setFirstName(e.target.value)} />
            <label className="text-sm">Last Name</label>
            <input className="border rounded px-2 py-1" value={lastName} onChange={e=> setLastName(e.target.value)} />
            <label className="text-sm">Hire Date</label>
            <input type="date" className="border rounded px-2 py-1" value={hireDate} onChange={e=> setHireDate(e.target.value)} />
            <label className="text-sm">Employee #</label>
            <input className="border rounded px-2 py-1" value={employeeNumber} onChange={e=> setEmployeeNumber(e.target.value)} />
            <label className="text-sm">Title</label>
            <input className="border rounded px-2 py-1" value={title} onChange={e=> setTitle(e.target.value)} placeholder="Cook 4, Sous Chef, ..." />
            <label className="text-sm">Pay Rate ($/hr)</label>
            <input type="number" className="border rounded px-2 py-1" min={0} step={0.25} value={payRate} onChange={e=> setPayRate(parseFloat(e.target.value||'0'))} />
            <label className="text-sm">Phone</label>
            <input className="border rounded px-2 py-1" value={encryptionEnabled && !hasKey ? '••••••• (locked)' : phone} onChange={e=> setPhone(e.target.value)} placeholder="(555) 555-5555" disabled={encryptionEnabled && !hasKey} />
            <label className="text-sm">Email</label>
            <input type="email" className="border rounded px-2 py-1" value={encryptionEnabled && !hasKey ? '•••••••@•••' : email} onChange={e=> setEmail(e.target.value)} placeholder="name@example.com" disabled={encryptionEnabled && !hasKey} />
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Job Codes</div>
            <div className="flex items-center gap-2 mb-2">
              <input className="border rounded px-2 py-1 text-sm" placeholder="Add code" value={jobCodeInput} onChange={e=> setJobCodeInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addJobCode(); } }} />
              <Button size="sm" variant="outline" onClick={addJobCode}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {jobCodes.map(code=> (
                <span key={code} className="text-[11px] px-2 py-0.5 rounded border bg-background/50">
                  {code}
                  <button className="ml-1 text-[10px] opacity-60 hover:opacity-100" onClick={()=> removeJobCode(code)}>×</button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Scheduling Preferences (soft)</div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <label className="text-sm">Days Off</label>
              <div className="flex flex-wrap gap-1">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,idx)=> (
                  <button key={d} type="button" className={`px-2 py-0.5 rounded border text-xs ${cannotWorkDays.includes(idx)?'bg-red-500/10 border-red-500':'bg-background'}`} onClick={()=> setCannotWorkDays(prev=> prev.includes(idx)? prev.filter(x=> x!==idx) : [...prev, idx])}>{d}</button>
                ))}
              </div>
              <label className="text-sm">Prefer start after</label>
              <div><FuzzyTimeInput value={preferStartAfter} onChange={setPreferStartAfter} showSuggestions /></div>
              <label className="text-sm">Prefer leave by</label>
              <div><FuzzyTimeInput value={preferLeaveBy} onChange={setPreferLeaveBy} showSuggestions /></div>
              <label className="text-sm">AM only</label>
              <input type="checkbox" className="h-4 w-4" checked={amOnly} onChange={e=> setAmOnly(e.target.checked)} />
              <label className="text-sm">PM only</label>
              <input type="checkbox" className="h-4 w-4" checked={pmOnly} onChange={e=> setPmOnly(e.target.checked)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={()=> onOpenChange(false)}>Cancel</Button>
            <Button onClick={onSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeInfoDialog;
