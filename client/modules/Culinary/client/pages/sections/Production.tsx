import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppData } from "@/context/AppDataContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash, Users, CalendarClock, ClipboardList, ChefHat, Printer, Check, RotateCcw } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { GlobalCalendar } from "@/components/panels/GlobalCalendar";
import type { CalendarEvent } from "@/stores/beoStore";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CornerBrand from "@/components/CornerBrand";

function readLS<T>(key: string, fallback: T): T { try{ const raw = localStorage.getItem(key); return raw? JSON.parse(raw) as T : fallback; } catch { return fallback; } }
function writeLS<T>(key: string, val: T){ try{ localStorage.setItem(key, JSON.stringify(val)); } catch {} }
const LS_ROLES = "production.roles.v1";
const LS_STAFF = "production.staff.v1";
const LS_OUTLETS = "production.outlets.v1";
const LS_ORDERS = "production.orders.v1";
const LS_ORDERS_TRASH = "production.orders.trash.v1";
const LS_LOGS = "production.logs.v1";
const LS_TASKS = "production.tasks.v1";
const LS_INV_RAW = "production.inventory.raw.v1";
const LS_INV_FIN = "production.inventory.finished.v1";
const LS_SESSION_USER = "production.session.user.v1";

function uid(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }

export type Role = { id: string; name: string };
export type Staff = { id: string; name: string; roleId?: string; pinHash?: string };
export type Outlet = { id: string; name: string; type: "Outlet"|"Banquets"|"Custom Cakes"; orderCutoff?: string; open?: string; close?: string; guide?: { item: string; defaultQty: number; unit: string; recurring?: boolean; days?: number[]; times?: string }[] };
export type RawItem = { id: string; code?: string; name: string; unit: string; onHand: number; par: number; unitCost?: number; vendor?: string; brand?: string; reordered?: boolean; location?: string; category?: string; storageAreaId?: string; shelf?: string; bin?: string };
export type FinishedItem = { id: string; code?: string; name: string; unit: string; onHand: number; par: number; unitCost?: number; vendor?: string; brand?: string; reordered?: boolean; recipeId?: string; location?: string; category?: string; storageAreaId?: string; shelf?: string; bin?: string };

export type OrderLine = { id: string; item: string; qty: number; unit: string; finishedItemId?: string; recipeId?: string };
export type Order = { id: string; outletId: string; dueISO: string; notes?: string; lines: OrderLine[]; createdAt: number; changedAt?: number };
export type DeletedOrder = Order & { deletedAt: number; deletedById?: string; deletedByName?: string; deleteReason?: string };

export type Task = {
  id: string;
  dateISO: string;
  start: string;
  end: string;
  outletId?: string;
  orderId?: string;
  title: string;
  roleId?: string;
  staffId?: string;
  recipeId?: string;
  qty?: number;
  unit?: string;
  color?: string;
  category?: 'production' | 'housekeeping' | 'delivery' | 'other';
  pullFromFinished?: { finishedItemId: string; qty: number }[];
  useRaw?: { rawItemId: string; qty: number }[];
  done?: boolean;
  invAccounted?: boolean;
  timePending?: boolean;
  pendingOriginalDateISO?: string;
  pendingOriginalStart?: string;
  pendingOriginalEnd?: string;
  laneBias?: number;
};

async function sha256Hex(text: string){
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b=> b.toString(16).padStart(2,'0')).join('');
}

export default function ProductionSection(){
  const { t } = useTranslation();
  const { recipes } = useAppData();

  const [roles, setRoles] = useState<Role[]>(()=> readLS(LS_ROLES, [ { id: uid(), name: "Baker" }, { id: uid(), name: "Chocolates & Confections" } ]));
  const [staff, setStaff] = useState<Staff[]>(()=> readLS(LS_STAFF, [ { id: uid(), name: "Mike", roleId: undefined } ]));
  const [outlets, setOutlets] = useState<Outlet[]>(()=> readLS(LS_OUTLETS, [ { id: uid(), name: "Banquets", type: "Banquets", orderCutoff:"14:00" }, { id: uid(), name: "Cafe", type: "Outlet", orderCutoff:"12:00" } , { id: uid(), name: "Custom Cakes", type: "Custom Cakes", orderCutoff:"10:00" } ]));
  const [orders, setOrders] = useState<Order[]>(()=> readLS(LS_ORDERS, []));
  const [ordersTrash, setOrdersTrash] = useState<DeletedOrder[]>(()=> readLS(LS_ORDERS_TRASH, []));
  const [logs, setLogs] = useState<{ id:string; ts:number; kind:string; message:string; actorId?:string; actorName?:string }[]>(()=> readLS(LS_LOGS, []));
  const [tasks, setTasks] = useState<Task[]>(()=> readLS(LS_TASKS, []));
  const [raw, setRaw] = useState<RawItem[]>(()=> readLS(LS_INV_RAW, [ { id: uid(), name: "Flour", unit: "kg", onHand: 50, par: 30, location:"Row A • Shelf 1 • Bin 1" }, { id: uid(), name: "Chocolate", unit: "kg", onHand: 20, par: 10, location:"Row B • Shelf 2 • Bin 3" } ]));
  const [fin, setFin] = useState<FinishedItem[]>(()=> readLS(LS_INV_FIN, [ { id: uid(), name: "Croissant", unit: "pcs", onHand: 80, par: 120, location:"Freezer 1 • Rack 2 • Tray A" }, { id: uid(), name: "Chocolate Bonbons", unit: "pcs", onHand: 120, par: 150, location:"Freezer 2 • Rack 1 • Tray C" } ]));

  const [date, setDate] = useState<string>(()=> new Date().toISOString().slice(0,10));

  const [currentUserId, setCurrentUserId] = useState<string | null>(()=> readLS(LS_SESSION_USER, null));
  const currentUser = useMemo(()=> staff.find(s=> s.id===currentUserId) || null, [staff, currentUserId]);

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskDraft, setTaskDraft] = useState<Task | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [prepOpen, setPrepOpen] = useState(false);
  const [prepStart, setPrepStart] = useState<string>(()=> date);
  const [prepEnd, setPrepEnd] = useState<string>(()=> date);
  const [selectedOutletIds, setSelectedOutletIds] = useState<string[]>(()=> []);
  const [enabledGroups, setEnabledGroups] = useState<Record<string, boolean>>({});

  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; orderId?: string }>(()=>({ open:false, x:0, y:0 }));
  const [guideOutlet, setGuideOutlet] = useState<Outlet | null>(null);
  const [guideStart, setGuideStart] = useState<string>(()=> date);
  const [guideUntil, setGuideUntil] = useState<string>(()=> date);

  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderEditingId, setOrderEditingId] = useState<string | null>(null);
  const [orderDraft, setOrderDraft] = useState<{ id:string; outletId:string; date:string; time:string; notes:string; lines: OrderLine[] } | null>(null);

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickDraft, setQuickDraft] = useState<{ outletId:string; date:string; time:string; lines: { id:string; item:string; qty:number; unit:string; finishedItemId?:string }[] } | null>(null);
  const [quickRecurring, setQuickRecurring] = useState(false);
  const [quickDays, setQuickDays] = useState<number[]>([]); // 0=Sun..6=Sat
  const [quickUntil, setQuickUntil] = useState<string>(()=> date);

  const [multiAssignOpen, setMultiAssignOpen] = useState(false);
  const [multiAssignOrderId, setMultiAssignOrderId] = useState<string | null>(null);
  const [multiAssign, setMultiAssign] = useState<string[]>([]);


  const [confirmDelOpen, setConfirmDelOpen] = useState(false);
  const [pendingDeleteOrderId, setPendingDeleteOrderId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteError, setDeleteError] = useState("");


  const calRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; type: 'move'|'resize'; startY: number; startX: number; startMin: number; endMin: number } | null>(null);

  useEffect(()=> writeLS(LS_ROLES, roles), [roles]);
  useEffect(()=> writeLS(LS_STAFF, staff), [staff]);
  useEffect(()=> writeLS(LS_OUTLETS, outlets), [outlets]);
  useEffect(()=> writeLS(LS_ORDERS, orders), [orders]);
  useEffect(()=> writeLS(LS_ORDERS_TRASH, ordersTrash), [ordersTrash]);
  useEffect(()=> writeLS(LS_LOGS, logs), [logs]);
  useEffect(()=> writeLS(LS_TASKS, tasks), [tasks]);
  useEffect(()=> writeLS(LS_INV_RAW, raw), [raw]);
  useEffect(()=> writeLS(LS_INV_FIN, fin), [fin]);
  useEffect(()=> writeLS(LS_SESSION_USER, currentUserId), [currentUserId]);

  useEffect(()=>{
    const now = Date.now();
    setOrdersTrash(prev=> prev.filter(x=> now - x.deletedAt < 7*24*3600*1000));
    setLogs(prev=> prev.filter(l=> now - l.ts < 30*24*3600*1000));
  }, []);

  const dayTasks = useMemo(()=> tasks.filter(t=> t.dateISO===date).sort((a,b)=> a.start.localeCompare(b.start)), [tasks, date]);

  const rolesById = useMemo(()=> Object.fromEntries(roles.map(r=>[r.id,r])), [roles]);
  const staffById = useMemo(()=> Object.fromEntries(staff.map(s=>[s.id,s])), [staff]);
  const outletsById = useMemo(()=> Object.fromEntries(outlets.map(o=>[o.id,o])), [outlets]);

  function addRole(){ const name = prompt("New duty/role name", "Bread Baker"); if(!name) return; setRoles(prev=> [...prev, { id: uid(), name }]); }
  function addStaff(){ const name = prompt("Staff name", "Mike"); if(!name) return; const rid = roles[0]?.id; setStaff(prev=> [...prev, { id: uid(), name, roleId: rid }]); }
  function addOutlet(){ const name = prompt("Outlet name", "Outlet A"); if(!name) return; const type = (prompt("Type: Outlet / Banquets / Custom Cakes", "Outlet") as Outlet["type"]) || "Outlet"; const cutoff = prompt("Order cutoff (HH:mm)", "14:00") || "14:00"; setOutlets(prev=> [...prev, { id: uid(), name, type, orderCutoff: cutoff }]); }

  function addOrderQuick(o: Partial<Order>){
    const id = uid();
    const outletId = o.outletId || outlets[0]?.id!;
    const dueISO = o.dueISO || new Date().toISOString();
    const lines: OrderLine[] = o.lines && o.lines.length? o.lines : [ { id: uid(), item: "Croissant", qty: 50, unit: "pcs", finishedItemId: fin[0]?.id } ];
    const next: Order = { id, outletId, dueISO, lines, notes: o.notes||"", createdAt: Date.now() };
    setOrders(prev=> [next, ...prev]);
    setLogs(prev=> [{ id: uid(), ts: Date.now(), kind:'order', message:`Order ${id} created for ${outletsById[outletId]?.name}`, actorId: currentUser?.id, actorName: currentUser?.name }, ...prev]);
    autoPlanFromOrder(next);
  }

  function hhmmToMin(s: string){ const [h,m] = s.split(":").map(n=>parseInt(n)); return h*60 + (m||0); }
  function minToHHMM(n: number){ const h = Math.floor(n/60), m = n%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; }

  function roleColor(id?: string){
    if(!id) return "";
    const i = Math.abs(id.split("").reduce((a,c)=> a + c.charCodeAt(0), 0));
    const palette = ["#38bdf8","#a78bfa","#34d399","#f59e0b","#f472b6","#22d3ee","#fb7185"];
    return palette[i % palette.length];
  }
  function categoryColor(cat?: Task['category']){
    switch(cat){
      case 'housekeeping': return '#22d3ee';
      case 'delivery': return '#34d399';
      default: return '#94a3b8';
    }
  }
  function taskBgColor(t: Task){
    return t.color || roleColor(t.roleId) || categoryColor(t.category);
  }
  function orderStatus(o: Order){
    const due = new Date(o.dueISO);
    const cutoff = outletsById[o.outletId]?.orderCutoff || "12:00";
    const cutoffMin = hhmmToMin(cutoff);
    const madeAtMin = hhmmToMin(`${new Date(o.createdAt).getHours().toString().padStart(2,'0')}:${new Date(o.createdAt).getMinutes().toString().padStart(2,'0')}`);
    const sameDay = due.toISOString().slice(0,10) === new Date(o.createdAt).toISOString().slice(0,10);
    if(o.changedAt && Date.now() - o.changedAt < 24*3600*1000) return "change" as const;
    if(sameDay && madeAtMin > cutoffMin) return "late" as const;
    return "normal" as const;
  }

  function localDateString(d: Date){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function localTimeHHMM(d: Date){
    const h = String(d.getHours()).padStart(2,'0');
    const m = String(d.getMinutes()).padStart(2,'0');
    return `${h}:${m}`;
  }
  function mapOrderStatusToEventStatus(s: 'normal'|'late'|'change'): CalendarEvent['status']{
    switch(s){
      case 'late': return 'pending';
      case 'change': return 'in_prep';
      default: return 'confirmed';
    }
  }

  const combinedEvents = useMemo<CalendarEvent[]>(()=>{
    const orderEvents: CalendarEvent[] = orders.map(o=>{
      const dt = new Date(o.dueISO);
      return {
        id: `order-${o.id}`,
        title: `${outletsById[o.outletId]?.name || 'Outlet'} — Order`,
        date: localDateString(dt),
        time: localTimeHHMM(dt),
        room: outletsById[o.outletId]?.name || 'Outlet',
        guestCount: o.lines.reduce((sum,l)=> sum + (Number(l.qty)||0), 0),
        status: mapOrderStatusToEventStatus(orderStatus(o)),
        priority: 'medium',
        acknowledged: true,
        clientName: outletsById[o.outletId]?.name || undefined,
      };
    });
    const taskEvents: CalendarEvent[] = tasks.map(t=> ({
      id: `task-${t.id}`,
      title: t.title,
      date: t.dateISO,
      time: `${t.start} - ${t.end}`,
      room: t.outletId? (outletsById[t.outletId]?.name || 'Outlet') : '—',
      guestCount: Number(t.qty||0),
      status: t.done? 'confirmed' : 'pending',
      priority: t.category==='production'? 'medium' : 'low',
      acknowledged: true,
      clientName: undefined,
    }));
    return [...orderEvents, ...taskEvents];
  }, [orders, tasks, outletsById]);

  function openTaskDialog(seed?: Partial<Task>){
    const draft: Task = {
      id: seed?.id || uid(), title: seed?.title || "",
      dateISO: seed?.dateISO || date,
      start: seed?.start || "06:00",
      end: seed?.end || "08:00",
      outletId: seed?.outletId || outlets[0]?.id,
      roleId: seed?.roleId,
      staffId: seed?.staffId,
      qty: seed?.qty,
      unit: seed?.unit,
      orderId: seed?.orderId,
      color: seed?.color,
      category: seed?.category || 'production',
      done: seed?.done,
    };
    setEditingId(seed?.id || null);
    setTaskDraft(draft); setTaskDialogOpen(true);
  }
  function saveTask(){ if(!taskDraft) return; setTasks(prev=> editingId? prev.map(x=> x.id===editingId? taskDraft: x) : [...prev, taskDraft]); setTaskDialogOpen(false); setTaskDraft(null); setEditingId(null); }

  function autoPlanFromOrder(order: Order, opts?: { roleId?: string; staffId?: string }){
    const day = order.dueISO.slice(0,10);
    const newTasks: Task[] = [];
    const finMap = new Map(fin.map(x=>[x.id, {...x}]));

    for(const line of order.lines){
      let allocated = 0;
      if(line.finishedItemId && finMap.has(line.finishedItemId)){
        const it = finMap.get(line.finishedItemId)!;
        const use = Math.min(it.onHand, line.qty);
        if(use>0){
          allocated = use;
          it.onHand -= use;
          newTasks.push({
            id: uid(), dateISO: day, start: "06:00", end: "06:15", outletId: order.outletId, orderId: order.id,
            title: `Pull ${use} ${line.unit} ${it.name} from freezer`, roleId: opts?.roleId || roles.find(r=>/baker/i.test(r.name))?.id, qty: use, unit: line.unit,
            pullFromFinished: [{ finishedItemId: it.id, qty: use }], color: orderStatus(order)==='late'? '#ef4444' : orderStatus(order)==='change'? '#f59e0b' : roleColor(opts?.roleId),
          });
        }
      }
      const remaining = Math.max(0, line.qty - allocated);
      if(remaining>0){
        const rid = opts?.roleId || roles.find(r=>/chocolate|confection|baker/i.test(r.name))?.id;
        newTasks.push({
          id: uid(), dateISO: day, start: "06:30", end: "10:30", outletId: order.outletId, orderId: order.id, title: `Produce ${remaining} ${line.unit} ${line.item}`,
          roleId: rid, staffId: opts?.staffId, recipeId: line.recipeId, qty: remaining, unit: line.unit, color: orderStatus(order)==='late'? '#ef4444' : orderStatus(order)==='change'? '#f59e0b' : roleColor(rid),
        });
      }
    }
    if(newTasks.length) setTasks(prev=> [...prev, ...newTasks]);
    const finUpdated = fin.map(fx=> finMap.get(fx.id) || fx);
    setFin(finUpdated);
  }

  function deleteTask(id: string){ setTasks(prev=> prev.filter(t=> t.id!==id)); }

  function toggleTaskDone(id: string, checked: boolean){
    setTasks(prev=>{
      const t = prev.find(x=> x.id===id);
      if(!t) return prev;
      if(checked && !t.invAccounted){
        if(t.pullFromFinished){ setFin(cur=> cur.map(f=>{ const used = t.pullFromFinished!.find(p=> p.finishedItemId===f.id)?.qty||0; return used? { ...f, onHand: Math.max(0, (f.onHand||0) - used) } : f; })); }
        if(t.useRaw){ setRaw(cur=> cur.map(r=>{ const used = t.useRaw!.find(u=> u.rawItemId===r.id)?.qty||0; return used? { ...r, onHand: Math.max(0, (r.onHand||0) - used) } : r; })); }
        if(t.recipeId && t.qty){ setFin(cur=>{ const idx = cur.findIndex(f=> f.recipeId===t.recipeId); if(idx>=0){ const c=[...cur]; c[idx]={...c[idx], onHand:(c[idx].onHand||0)+ (t.qty||0)}; return c; } return cur; }); }
      }
      if(!checked && t.invAccounted){
        if(t.pullFromFinished){ setFin(cur=> cur.map(f=>{ const used = t.pullFromFinished!.find(p=> p.finishedItemId===f.id)?.qty||0; return used? { ...f, onHand: (f.onHand||0) + used } : f; })); }
        if(t.useRaw){ setRaw(cur=> cur.map(r=>{ const used = t.useRaw!.find(u=> u.rawItemId===r.id)?.qty||0; return used? { ...r, onHand: (r.onHand||0) + used } : r; })); }
        if(t.recipeId && t.qty){ setFin(cur=>{ const idx = cur.findIndex(f=> f.recipeId===t.recipeId); if(idx>=0){ const c=[...cur]; c[idx]={...c[idx], onHand: Math.max(0,(c[idx].onHand||0)- (t.qty||0))}; return c; } return cur; }); }
      }
      return prev.map(x=> x.id===id? { ...x, done: checked, invAccounted: checked? true : false } : x);
    });
  }

  type CommissaryOrderDTO = { outletId: string; dueISO: string; lines: { item: string; qty: number; unit: string; finishedItemId?: string; recipeId?: string }[]; notes?: string };
  (window as any).importCommissaryOrder = (dto: CommissaryOrderDTO) => {
    const next: Order = { id: uid(), outletId: dto.outletId, dueISO: dto.dueISO, lines: dto.lines.map(l=> ({ id: uid(), ...l })), notes: dto.notes||"", createdAt: Date.now() };
    setOrders(prev=> [next, ...prev]);
    autoPlanFromOrder(next);
  };


  const prepGroups = useMemo(()=>{
    const groups: Record<string, Task[]> = {};
    for(const t of dayTasks){ const key = `${outletsById[t.outletId||'']?.name||'Outlet'} • ${rolesById[t.roleId||'']?.name||'Unassigned'}`; (groups[key] ||= []).push(t); }
    return groups;
  }, [dayTasks, rolesById, outletsById]);

  const prepGroupsModal = useMemo(()=>{
    const start = (prepStart||date);
    const end = (prepEnd||date);
    const inRange = (d:string)=> d>=start && d<=end;
    const selected = selectedOutletIds.length? new Set(selectedOutletIds) : new Set(outlets.map(o=> o.id));
    const groups: Record<string, Task[]> = {};
    for(const t of tasks){ if(!inRange(t.dateISO)) continue; if(t.outletId && !selected.has(t.outletId)) continue; const key = `${outletsById[t.outletId||'']?.name||'Outlet'} • ${rolesById[t.roleId||'']?.name||'Unassigned'}`; (groups[key] ||= []).push(t); }
    return groups;
  }, [tasks, prepStart, prepEnd, selectedOutletIds, rolesById, outletsById, outlets, date]);

  const closeMenu = () => setMenu({ open:false, x:0, y:0 });
  const onOrderContext = (e: React.MouseEvent, id: string) => { e.preventDefault(); setMenu({ open:true, x:e.clientX, y:e.clientY, orderId:id }); };

  function openQuick(){
    const today = date;
    const first = outlets[0];
    const lines = first?.guide?.length ? first.guide.filter(g=> g.item).map(g=> ({ id: uid(), item: g.item, qty: g.defaultQty||0, unit: g.unit||'pcs' })) : [ { id: uid(), item: '', qty: 0, unit: 'pcs' } ];
    setQuickDraft({ outletId: first?.id || '', date: today, time: '06:00', lines });
    setQuickRecurring(false); setQuickDays([]); setQuickUntil(today);
    setQuickOpen(true);
  }
  function onQuickItemChange(idx:number, val:string){
    const m = fin.find(f=> f.name.toLowerCase()===val.toLowerCase());
    setQuickDraft(prev=> prev? { ...prev, lines: prev.lines.map((x,i)=> i===idx? { ...x, item: val, finishedItemId: m?.id, unit: x.unit || m?.unit || 'pcs' } : x) } : prev);
  }
  function saveQuick(){
    if(!quickDraft) return;
    const baseLines = quickDraft.lines.filter(l=> l.item && l.qty>0).map(l=> ({ id: uid(), item: l.item, qty: l.qty, unit: l.unit, finishedItemId: l.finishedItemId }));
    if(!baseLines.length) { setQuickOpen(false); setQuickDraft(null); return; }
    if(!quickRecurring){
      const dueISO = new Date(`${quickDraft.date}T${quickDraft.time}:00`).toISOString();
      addOrderQuick({ outletId: quickDraft.outletId, dueISO, lines: baseLines });
    } else {
      const start = new Date(`${quickDraft.date}T00:00:00`);
      const until = new Date(`${quickUntil}T23:59:59`);
      for(let d = new Date(start); d <= until; d.setDate(d.getDate()+1)){
        const dow = d.getDay();
        if(quickDays.length && !quickDays.includes(dow)) continue;
        const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
        const dateStr = `${y}-${m}-${day}`;
        const dueISO = new Date(`${dateStr}T${quickDraft.time}:00`).toISOString();
        addOrderQuick({ outletId: quickDraft.outletId, dueISO, lines: baseLines.map(x=> ({...x, id: uid()})) });
      }
    }
    setQuickOpen(false); setQuickDraft(null);
  }

  function openOrderDialog(o: Order){
    const dt = new Date(o.dueISO);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset()*60000);
    const date = local.toISOString().slice(0,10);
    const time = `${String(local.getHours()).padStart(2,'0')}:${String(local.getMinutes()).padStart(2,'0')}`;
    setOrders(prev=> prev.map(x=> x.id===o.id? { ...x, changedAt: Date.now() }: x));
    setOrderEditingId(o.id);
    setOrderDraft({ id:o.id, outletId:o.outletId, date, time, notes:o.notes||'', lines: o.lines.map(l=> ({...l})) });
    setOrderDialogOpen(true);
  }
  function saveOrder(){
    if(!orderDraft) return;
    const dueISO = new Date(`${orderDraft.date}T${orderDraft.time}:00`).toISOString();
    setOrders(prev=> prev.map(x=> x.id===orderEditingId? { ...x, outletId: orderDraft.outletId, dueISO, notes: orderDraft.notes, lines: orderDraft.lines, changedAt: Date.now() } : x));
    setLogs(prev=> [{ id: uid(), ts: Date.now(), kind:'order', message:`Order ${orderDraft.id} changed`, actorId: currentUser?.id, actorName: currentUser?.name }, ...prev]);
    setOrderDialogOpen(false); setOrderDraft(null); setOrderEditingId(null);
  }

  // Drag/move/resize
  const pxPerMin = 0.8; // 48px per hour vertically
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);
  useEffect(()=>{ const el = timelineRef.current; if(!el) return; const ro = new ResizeObserver(()=> setTimelineWidth(el.clientWidth)); ro.observe(el); setTimelineWidth(el.clientWidth); return ()=> ro.disconnect(); },[]);
  const pxPerMinX = useMemo(()=> timelineWidth>0 ? timelineWidth/(24*60) : 2, [timelineWidth]);
  function startDrag(e: React.PointerEvent, t: Task, mode: 'move'|'resize'){
    const startMin = hhmmToMin(t.start), endMin = hhmmToMin(t.end);
    dragRef.current = { id: t.id, type: mode, startY: e.clientY, startX: e.clientX, startMin, endMin } as any;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    window.addEventListener('pointermove', onDrag as any, { passive:false } as any);
    window.addEventListener('pointerup', endDrag as any, { once:true } as any);
  }
  function onDrag(e: PointerEvent){
    const s = dragRef.current as any; if(!s) return;
    const dy = e.clientY - s.startY;
    const dminY = Math.round(dy/pxPerMin/15)*15;
    setTasks(prev=> prev.map(x=>{
      if(x.id!==s.id) return x;
      let start = s.startMin, end = s.endMin;
      if(s.type==='move'){
        start += dminY;
        end += dminY;
      } else {
        end = Math.max(start+15, s.endMin + dminY);
      }
      start = Math.max(0,start);
      end = Math.min(24*60, end);
      const next = { ...x, start:minToHHMM(start), end:minToHHMM(end) } as Task;
      if(!x.timePending){
        next.timePending = true;
        next.pendingOriginalDateISO = x.dateISO;
        next.pendingOriginalStart = minToHHMM(s.startMin);
        next.pendingOriginalEnd = minToHHMM(s.endMin);
      }
      return next;
    }));
  }
  function endDrag(e: PointerEvent){
    window.removeEventListener('pointermove', onDrag as any);
    const s = dragRef.current as any;
    if(s){
      const dx = e.clientX - s.startX;
      const step = Math.max(1, Math.round((timelineWidth||1)/3));
      const dLane = Math.round(dx/step);
      if(dLane!==0){ setTasks(prev=> prev.map(x=> x.id===s.id? { ...x, laneBias: Math.max(-9, Math.min(9, (x.laneBias||0)+dLane)) } : x)); }
    }
    dragRef.current=null;
  }
  useEffect(()=>()=>{ window.removeEventListener('pointermove', onDrag as any); },[]);

  // Orders map and line counts
  const ordersById = useMemo(()=> Object.fromEntries(orders.map(o=> [o.id, o])), [orders]);
  const orderLinesCount = useMemo(()=> { const m: Record<string, number> = {}; for(const o of orders){ m[o.id]=o.lines.length; } return m; }, [orders]);

  // Overlap groups and lanes (fit-content width, show overflow indicator when >3)
  const overlapGroups = useMemo(()=>{
    const arr = dayTasks.map(t=> ({ t, s: hhmmToMin(t.start), e: hhmmToMin(t.end) })).sort((a,b)=> a.s - b.s || a.e - b.e);
    const groups: { id:number; items: { t:Task; s:number; e:number }[] }[] = [];
    let gid = 0; let active: { s:number; e:number }[] = [];
    for(const it of arr){
      active = active.filter(a=> a.e > it.s);
      if(active.length===0){ groups.push({ id: gid++, items: [] }); }
      groups[groups.length-1].items.push(it);
      active.push({ s: it.s, e: it.e });
    }
    const laneMap = new Map<string, { lane:number; lanesTotal:number; groupId:number }>();
    for(const g of groups){
      const laneEnds:number[] = [];
      const items = [...g.items].sort((a,b)=> a.s - b.s || ((a.t.laneBias||0) - (b.t.laneBias||0)) || a.e - b.e);
      for(const {t,s,e} of items){
        let lane = laneEnds.findIndex(end=> end <= s);
        if(lane===-1){ lane = laneEnds.length; laneEnds.push(e); } else { laneEnds[lane]=e; }
        laneMap.set(t.id, { lane, lanesTotal: laneEnds.length, groupId: g.id });
      }
      for(const {t} of items){ const info = laneMap.get(t.id); if(info) info.lanesTotal = laneEnds.length; }
    }
    return { groups, laneMap } as const;
  }, [dayTasks]);
  const laneInfo = overlapGroups.laneMap;

  // Trash badge color
  const trashCount = ordersTrash.length;
  const trashColor = trashCount===0? '#94a3b8' : '#ef4444';
  const [overflowGroupId, setOverflowGroupId] = useState<number|null>(null);

  function confirmTimeChange(id: string){
    setTasks(prev=> prev.map(t=> t.id===id? { ...t, timePending:false, pendingOriginalDateISO: undefined, pendingOriginalStart: undefined, pendingOriginalEnd: undefined } : t));
  }
  function revertTimeChange(id: string){
    setTasks(prev=> prev.map(t=> t.id===id? { ...t, dateISO: t.pendingOriginalDateISO||t.dateISO, start: t.pendingOriginalStart||t.start, end: t.pendingOriginalEnd||t.end, timePending:false, pendingOriginalDateISO: undefined, pendingOriginalStart: undefined, pendingOriginalEnd: undefined } : t));
  }

  function openDeleteOrderFlow(orderId: string){
    setPendingDeleteOrderId(orderId);
    setDeleteReason("");
    setDeleteError("");
    setConfirmDelOpen(true);
  }

  async function performDeleteOrder(){
    if(!pendingDeleteOrderId) return;
    const o = orders.find(x=> x.id===pendingDeleteOrderId);
    if(!o){ setConfirmDelOpen(false); setPendingDeleteOrderId(null); return; }
    setOrders(prev=> prev.filter(x=> x.id!==o.id));
    setOrdersTrash(prev=> [{ ...o, deletedAt: Date.now(), deleteReason: deleteReason.trim() }, ...prev]);
    setLogs(prev=> [{ id: uid(), ts: Date.now(), kind:'order', message:`Order ${o.id} deleted${deleteReason? ` — ${deleteReason}`:''}` }, ...prev]);
    setConfirmDelOpen(false);
    setPendingDeleteOrderId(null);
  }

  return (
    <div className="container mx-auto px-4 py-4 space-y-4">
      <div className="rounded-xl border p-3 bg-white/95 dark:bg-zinc-900 ring-1 ring-black/5 dark:ring-sky-500/15">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold flex items-center gap-2"><CalendarClock className="w-4 h-4"/> {t("production.chef")}</div>
          <div className="flex items-center gap-2 text-sm">
            <input type="date" value={date} onChange={(e)=> setDate(e.target.value)} className="rounded-md border px-2 py-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1"/>{t("production.addTask")}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("production.addTask")}</DropdownMenuLabel>
                <DropdownMenuItem onClick={()=> openTaskDialog({ category:'production', title:'', roleId: roles[0]?.id })}>{t("production.production")}</DropdownMenuItem>
                <DropdownMenuItem onClick={()=> openTaskDialog({ category:'housekeeping', title:'Clean workstation' })}>{t("production.housekeeping")}</DropdownMenuItem>
                <DropdownMenuItem onClick={()=> openTaskDialog({ category:'delivery', title:'Delivery to outlet' })}>Delivery���</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={()=> openTaskDialog({})}>Custom…</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="secondary" onClick={openQuick}><Plus className="w-4 h-4 mr-1"/>{t("production.addOrder")}</Button>
            <Button size="sm" variant="outline" onClick={()=> setPrepOpen(true)}><Printer className="w-4 h-4 mr-1"/>{t("production.prepSheet")}</Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="flex flex-wrap gap-1 p-1 bg-muted rounded-lg">
          <TabsTrigger value="calendar">{t("production.calendar")}</TabsTrigger>
          <TabsTrigger value="global-cal">{t("production.globalCalendar")}</TabsTrigger>
          <TabsTrigger value="orders">{t("production.orders")}</TabsTrigger>
          <TabsTrigger value="staff">{t("production.staffDuties")}</TabsTrigger>
          <TabsTrigger value="outlets">{t("production.outlets")}</TabsTrigger>
          <TabsTrigger value="trash">{t("production.trash")} <span style={{ marginLeft:6, background:trashColor, color:'#fff', borderRadius:12, padding:'0 6px' }}>{trashCount}</span></TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <div ref={calRef} className="rounded-xl border p-3 bg-white/95 dark:bg-zinc-900 ring-1 ring-black/5 dark:ring-sky-500/15">
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div className="flex flex-col text-xs text-muted-foreground">
                {Array.from({length:24}).map((_,i)=> (
                  <div key={i} className="h-12 border-b last:border-b-0">{String(i).padStart(2,'0')}:00</div>
                ))}
              </div>
              <div className="relative">
                <div className="absolute inset-0 pointer-events-none">
                  {Array.from({length:24}).map((_,i)=> (
                    <div key={i} className="h-12 border-b last:border-b-0" />
                  ))}
                </div>
                <div className="relative" ref={timelineRef}>
                  {dayTasks.map(t=>{
                    const top = hhmmToMin(t.start)*pxPerMin;
                    const h = Math.max(36, (hhmmToMin(t.end)-hhmmToMin(t.start))*pxPerMin);
                    const bg = taskBgColor(t);
                    const info = laneInfo.get(t.id);
                    const lane = info?.lane ?? 0;
                    const total = info?.lanesTotal ?? 1;
                    const visibleCols = Math.max(total,1);
                    const maxWidth = `calc(${100/visibleCols}% - 6px)`;
                    const laneDisplay = Math.max(0, Math.min(visibleCols-1, lane + (t.laneBias||0)));
                    const leftPct = `${(100/visibleCols)*laneDisplay}%`;
                    return (
                      <div key={t.id} className="absolute" style={{ top, height:h, left:leftPct, maxWidth, paddingRight:6 }}>
                        <div className="rounded-lg border shadow p-2 text-sm select-none cursor-move w-max max-w-full pointer-events-auto relative" style={{ background: `linear-gradient(180deg, ${bg}22, transparent)`, touchAction:'none' as any }} onPointerDown={(e)=> startDrag(e, t, 'move')} onDoubleClick={()=>{ if(t.orderId && ordersById[t.orderId]) openOrderDialog(ordersById[t.orderId]!); else openTaskDialog(t); }}>
                          <div className="flex items-center justify-between">
                            <div className="font-medium truncate flex items-center gap-1">
                              <span className="truncate">{t.title}</span>
                              {t.orderId && (orderLinesCount[t.orderId]||0)>=3 && <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white rounded-full" style={{ background:'#ef4444', boxShadow:'0 0 10px rgba(239,68,68,0.7)'}} title="Multiple items">→</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              {t.timePending && (
                                <>
                                  <button className="text-xs text-green-600" onClick={(ev)=>{ ev.stopPropagation(); confirmTimeChange(t.id); }} title="Save new time"><Check className="w-4 h-4"/></button>
                                  <button className="text-xs" onClick={(ev)=>{ ev.stopPropagation(); revertTimeChange(t.id); }} title="Revert to original time"><RotateCcw className="w-4 h-4"/></button>
                                </>
                              )}
                              <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={!!t.done} onChange={(e)=> toggleTaskDone(t.id, e.target.checked)}/> Done</label>
                              <button className="text-xs text-red-600" onClick={()=>deleteTask(t.id)} title="Delete"><Trash className="w-4 h-4"/></button>
                            </div>
                          </div>
                          <div className="text-xs opacity-80 flex flex-wrap gap-2">
                            <span>{t.start}–{t.end}</span>
                            {t.outletId && <span>{outletsById[t.outletId]?.name}</span>}
                            {t.roleId && <span>{rolesById[t.roleId]?.name}</span>}
                            {t.staffId && <span>{staffById[t.staffId]?.name}</span>}
                            {t.qty && t.unit && <span>{t.qty} {t.unit}</span>}
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize" style={{ touchAction:'none' as any }} onPointerDown={(e)=>{ e.stopPropagation(); startDrag(e, t, 'resize'); }} />
                        </div>
                      </div>
                    );
                  })}
                  {/* indicator now lives on each pill when order has multiple lines */}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>


        <TabsContent value="global-cal">
          <div className="rounded-xl border p-3 bg-white/95 dark:bg-zinc-900 ring-1 ring-black/5 dark:ring-sky-500/15">
            <GlobalCalendar events={combinedEvents} />
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <div className="rounded-xl border p-3 space-y-3 bg-white/95 dark:bg-zinc-900 ring-1 ring-black/5 dark:ring-sky-500/15">
            <div className="flex items-center justify-between">
              <div className="font-medium"><ClipboardList className="inline w-4 h-4 mr-1"/>Outlet & Banquets Orders</div>
              <div className="flex items-center gap-2"></div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {orders.map(o=> {
                const st = orderStatus(o);
                const style = st==='late'? { borderColor: '#ef4444', background: 'linear-gradient(180deg, #ef444422, transparent)' } : st==='change'? { borderColor: '#f59e0b', background: 'linear-gradient(180deg, #f59e0b22, transparent)' } : {};
                return (
                  <div key={o.id} className="rounded-lg border p-2" onContextMenu={(e)=> onOrderContext(e, o.id)} style={style}>
                    <div className="text-sm font-medium flex items-center justify-between">
                      <span>{outletsById[o.outletId]?.name} • {new Date(o.dueISO).toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        {st==='late' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white">Late</span>}
                        {st==='change' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white">Change</span>}
                        <button className="text-xs underline" onClick={()=> openOrderDialog(o)} title="Edit order">Change</button>
                        <button className="text-xs text-red-600" onClick={()=> openDeleteOrderFlow(o.id)} title="Delete order"><Trash className="w-4 h-4"/></button>
                      </div>
                    </div>
                    <ul className="text-sm list-disc pl-5">
                      {o.lines.map(l=> <li key={l.id}>{l.qty} {l.unit} {l.item}</li>)}
                    </ul>
                    <div className="text-xs opacity-70">Right‑click to assign to a duty or staff and auto‑add to schedule.</div>
                  </div>
                );
              })}
            </div>
            {menu.open && (
              <div className="fixed z-50 rounded-md border bg-white shadow dark:bg-zinc-900 text-sm" style={{ top: menu.y, left: menu.x }} onMouseLeave={closeMenu}>
                <div className="px-3 py-1 font-medium border-b">Assign</div>
                <div className="px-3 py-1">To duty:</div>
                {roles.map(r=> (
                  <button key={r.id} className="block w-full text-left px-3 py-1 hover:bg-muted" onClick={()=>{ const o = orders.find(x=>x.id===menu.orderId)!; autoPlanFromOrder(o, { roleId: r.id }); closeMenu(); }}>
                    {r.name}
                  </button>
                ))}
                <div className="px-3 py-1 border-t">To staff:</div>
                {staff.map(s=> (
                  <button key={s.id} className="block w-full text-left px-3 py-1 hover:bg-muted" onClick={()=>{ const o = orders.find(x=>x.id===menu.orderId)!; autoPlanFromOrder(o, { staffId: s.id, roleId: s.roleId }); closeMenu(); }}>
                    {s.name} {s.roleId? `��� ${rolesById[s.roleId]?.name}`:''}
                  </button>
                ))}
                <div className="border-t mt-1">
                  <button className="block w-full text-left px-3 py-1 hover:bg-muted" onClick={()=>{ setMultiAssignOrderId(menu.orderId||null); setMultiAssignOpen(true); closeMenu(); }}>Assign to multiple…</button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="trash">
          <div className="rounded-xl border p-3 space-y-2 bg-white/95 dark:bg-zinc-900 ring-1 ring-black/5 dark:ring-sky-500/15">
            <div className="text-sm text-muted-foreground">Orders in Trash (auto‑empties after 7 days)</div>
            <div className="grid md:grid-cols-2 gap-3">
              {ordersTrash.map(o=> (
                <div key={o.id} className="rounded border p-2 flex items-center justify-between">
                  <div className="text-sm">
                    <div>{outletsById[o.outletId]?.name} • {new Date(o.dueISO).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Deleted {Math.ceil((Date.now()-o.deletedAt)/3600000)}h ago{ o.deletedByName? ` by ${o.deletedByName}`:'' }{ o.deleteReason? ` — ${o.deleteReason}`:''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={()=>{ setOrders(prev=> [ { id:o.id, outletId:o.outletId, dueISO:o.dueISO, notes:o.notes, lines:o.lines, createdAt:o.createdAt, changedAt:o.changedAt }, ...prev ]); setOrdersTrash(prev=> prev.filter(x=> x.id!==o.id)); setLogs(prev=> [{ id: uid(), ts: Date.now(), kind:'order', message:`Order ${o.id} restored from trash`, actorId: currentUser?.id, actorName: currentUser?.name }, ...prev]); }}>
                      Restore
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>


        <TabsContent value="staff">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-xl border p-3 bg-white/95 dark:bg-zinc-900 ring-1 ring-black/5 dark:ring-sky-500/15">
              <div className="font-medium mb-2 flex items-center gap-2"><ChefHat className="w-4 h-4"/>Duties/Roles</div>
              <ul className="text-sm">
                {roles.map(r=> (
                  <li key={r.id} className="flex items-center justify-between border-t py-1">
                    <span>{r.name}</span>
                    <button onClick={()=> setRoles(prev=> prev.filter(x=> x.id!==r.id))}><Trash className="w-4 h-4"/></button>
                  </li>
                ))}
              </ul>
              <Button size="sm" className="mt-2" onClick={addRole}><Plus className="w-4 h-4 mr-1"/>Add role</Button>
            </div>
            <div className="rounded-xl border p-3 bg-white/95 dark:bg-zinc-900 ring-1 ring-black/5 dark:ring-sky-500/15">
              <div className="font-medium mb-2 flex items-center gap-2"><Users className="w-4 h-4"/>Staff</div>
              <ul className="text-sm">
                {staff.map(s=> (
                  <li key={s.id} className="flex items-center justify-between border-t py-1 gap-2">
                    <span className="min-w-[120px]">{s.name}</span>
                    <select className="border rounded px-1 text-xs" value={s.roleId||""} onChange={(e)=> setStaff(prev=> prev.map(x=> x.id===s.id? {...x, roleId: e.target.value||undefined }: x))}>
                      <option value="">Unassigned</option>
                      {roles.map(r=> <option value={r.id} key={r.id}>{r.name}</option>)}
                    </select>
                    <Button size="sm" variant="outline" onClick={async()=>{
                      const pin1 = prompt("Set 4–8 digit PIN for "+s.name, ""); if(!pin1) return;
                      if(!/^\d{4,8}$/.test(pin1)) { alert('PIN must be 4–8 digits'); return; }
                      const pin2 = prompt("Confirm PIN", ""); if(pin1 !== pin2){ alert('PINs do not match'); return; }
                      const h = await sha256Hex(pin1);
                      setStaff(prev=> prev.map(x=> x.id===s.id? { ...x, pinHash: h }: x));
                    }}>Set PIN</Button>
                    <button onClick={()=> setStaff(prev=> prev.filter(x=> x.id!==s.id))}><Trash className="w-4 h-4"/></button>
                  </li>
                ))}
              </ul>
              <Button size="sm" className="mt-2" onClick={addStaff}><Plus className="w-4 h-4 mr-1"/>Add staff</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="outlets">
          <div className="rounded-xl border p-3 bg-white/95 dark:bg-zinc-900 ring-1 ring-black/5 dark:ring-sky-500/15">
            <div className="font-medium mb-2">Outlets & Banquets</div>
            <ul className="text-sm">
              {outlets.map(o=> (
                <li key={o.id} className="flex items-center justify-between border-t py-1 gap-2">
                  <span className="flex-1">{o.name} • {o.type}</span>
                  <span className="text-xs text-muted-foreground">Cutoff {o.orderCutoff||'—'} | Hours {o.open||'—'}–{o.close||'���'}</span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={()=> setGuideOutlet(o)}>Edit</Button>
                    <button onClick={()=> setOutlets(prev=> prev.filter(x=> x.id!==o.id))}><Trash className="w-4 h-4"/></button>
                  </div>
                </li>
              ))}
            </ul>
            <Button size="sm" className="mt-2" onClick={addOutlet}><Plus className="w-4 h-4 mr-1"/>Add outlet</Button>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={taskDialogOpen} onOpenChange={(o)=>{ setTaskDialogOpen(o); if(!o) { setTaskDraft(null); setEditingId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId? 'Edit Task' : 'New Task'}</DialogTitle></DialogHeader>
          {taskDraft && (
            <div className="space-y-2 text-sm">
              <label className="block">Title<input className="w-full border rounded px-2 py-1" value={taskDraft.title} onChange={(e)=> setTaskDraft({ ...(taskDraft as Task), title:e.target.value })}/></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">Start<input className="w-full border rounded px-2 py-1" value={taskDraft.start} onChange={(e)=> setTaskDraft({ ...(taskDraft as Task), start:e.target.value })} placeholder="HH:mm"/></label>
                <label className="block">End<input className="w-full border rounded px-2 py-1" value={taskDraft.end} onChange={(e)=> setTaskDraft({ ...(taskDraft as Task), end:e.target.value })} placeholder="HH:mm"/></label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">Outlet<select className="w-full border rounded px-2 py-1" value={taskDraft.outletId||""} onChange={(e)=> setTaskDraft({ ...(taskDraft as Task), outletId:e.target.value })}>{outlets.map(o=> <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
                <label className="block">Duty<select className="w-full border rounded px-2 py-1" value={taskDraft.roleId||""} onChange={(e)=> setTaskDraft({ ...(taskDraft as Task), roleId:e.target.value||undefined, color: roleColor(e.target.value) })}><option value="">Unassigned</option>{roles.map(r=> <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">Staff<select className="w-full border rounded px-2 py-1" value={taskDraft.staffId||""} onChange={(e)=> setTaskDraft({ ...(taskDraft as Task), staffId:e.target.value||undefined })}><option value="">Unassigned</option>{staff.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                <label className="block">Qty/Unit<div className="flex gap-2"><input className="border rounded px-2 py-1 w-24" value={taskDraft.qty||''} onChange={(e)=> setTaskDraft({ ...(taskDraft as Task), qty: Number(e.target.value||0) })}/><input className="border rounded px-2 py-1 w-24" value={taskDraft.unit||''} onChange={(e)=> setTaskDraft({ ...(taskDraft as Task), unit: e.target.value })}/></div></label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">Category<select className="w-full border rounded px-2 py-1" value={taskDraft.category||'production'} onChange={(e)=> setTaskDraft({ ...(taskDraft as Task), category: e.target.value as Task['category'] })}><option value="production">Production</option><option value="housekeeping">Housekeeping</option><option value="delivery">Delivery</option><option value="other">Other</option></select></label>
                <label className="block">Color<input className="w-24 border rounded px-2 py-1" type="color" value={taskDraft.color||taskBgColor(taskDraft as Task)} onChange={(e)=> setTaskDraft({ ...(taskDraft as Task), color:e.target.value })}/></label>
              </div>
              <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={()=> setTaskDialogOpen(false)}>Cancel</Button><Button onClick={saveTask}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>



      <Dialog open={prepOpen} onOpenChange={(o)=>{ setPrepOpen(o); if(o){ if(selectedOutletIds.length===0) setSelectedOutletIds(outlets.map(x=> x.id)); setEnabledGroups(prev=>{ const all: Record<string, boolean> = {}; for(const k of Object.keys(prepGroupsModal)) all[k]= prev[k] ?? true; return all; }); } }}>
        <DialogContent className="max-w-4xl shadow-[0_0_28px_rgba(59,130,246,0.35)] dark:shadow-[0_0_32px_rgba(14,165,233,0.45)] hover:shadow-[0_0_44px_rgba(59,130,246,0.5)] dark:hover:shadow-[0_0_52px_rgba(14,165,233,0.6)] transition-shadow print:max-w-none print:w-[960px]">
          <DialogHeader><DialogTitle>Prep Sheets</DialogTitle></DialogHeader>
          <style>{`@media print{ .no-print{ display:none } }`}</style>
          <div className="no-print grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <label className="text-sm">Start date<input type="date" className="w-full border rounded px-2 py-1" value={prepStart} onChange={(e)=> setPrepStart(e.target.value)} /></label>
            <label className="text-sm">End date<input type="date" className="w-full border rounded px-2 py-1" value={prepEnd} onChange={(e)=> setPrepEnd(e.target.value)} /></label>
            <div className="flex items-end justify-end gap-2"><Button onClick={()=> window.print()}><Printer className="w-4 h-4 mr-1"/>Print</Button></div>
          </div>
          <div className="space-y-3 relative">
            {Object.entries(prepGroupsModal).map(([key, items])=> (enabledGroups[key]??true) && (
              <div key={key} className="rounded border p-2 bg-background/60">
                <div className="font-medium mb-1 flex items-center gap-3">
                  <input type="checkbox" checked={enabledGroups[key]??true} onChange={(e)=> setEnabledGroups(prev=> ({...prev, [key]: e.target.checked}))} className="no-print" />
                  <span>{key}</span>
                </div>
                <table className="w-full text-sm"><thead><tr className="text-left"><th>Time</th><th>Task</th><th>Assigned</th><th>Qty</th></tr></thead><tbody>
                  {items.map(t=> <tr key={t.id} className="border-t"><td>{t.start}–{t.end}</td><td>{t.title}</td><td>{t.staffId? staffById[t.staffId]?.name : rolesById[t.roleId||'']?.name || ''}</td><td>{t.qty? `${t.qty} ${t.unit||''}`:''}</td></tr>)}
                </tbody></table>
              </div>
            ))}
            <div className="absolute right-2 bottom-2 opacity-70 print:opacity-100">
              <CornerBrand />
            </div>
          </div>
          <div className="no-print mt-3 border-t pt-2">
            <div className="text-sm font-medium mb-1">Outlets</div>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-1"><input type="checkbox" checked={selectedOutletIds.length===outlets.length} onChange={(e)=> setSelectedOutletIds(e.target.checked? outlets.map(o=>o.id): [])}/>Select all</label>
              {outlets.map(o=> (
                <label key={o.id} className="inline-flex items-center gap-1">
                  <input type="checkbox" checked={selectedOutletIds.includes(o.id)} onChange={(e)=> setSelectedOutletIds(prev=> e.target.checked? [...prev, o.id]: prev.filter(x=> x!==o.id))} />{o.name}
                </label>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>


      <Dialog open={multiAssignOpen} onOpenChange={(v)=>{ setMultiAssignOpen(v); if(!v){ setMultiAssign([]); setMultiAssignOrderId(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign to multiple staff</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="max-h-60 overflow-auto border rounded p-2">
              {staff.map(s=> (
                <label key={s.id} className="flex items-center gap-2 py-1">
                  <input type="checkbox" checked={multiAssign.includes(s.id)} onChange={(e)=> setMultiAssign(prev=> e.target.checked? [...prev, s.id] : prev.filter(x=> x!==s.id))} />
                  <span>{s.name}{s.roleId? ` • ${rolesById[s.roleId]?.name}`:''}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={()=> setMultiAssignOpen(false)}>Cancel</Button>
              <Button onClick={()=>{
                const o = orders.find(x=> x.id===multiAssignOrderId);
                if(o){ multiAssign.forEach(id=> { const st = staffById[id]; autoPlanFromOrder(o, { staffId: id, roleId: st?.roleId }); }); }
                setMultiAssignOpen(false); setMultiAssign([]); setMultiAssignOrderId(null);
              }}>Assign</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={quickOpen} onOpenChange={(v)=>{ setQuickOpen(v); if(!v){ setQuickDraft(null); } }}>
        <DialogContent className="max-w-4xl shadow-[0_0_28px_rgba(59,130,246,0.35)] dark:shadow-[0_0_32px_rgba(14,165,233,0.45)] hover:shadow-[0_0_44px_rgba(59,130,246,0.5)] dark:hover:shadow-[0_0_52px_rgba(14,165,233,0.6)] transition-shadow">
          <DialogHeader><DialogTitle>Add order</DialogTitle></DialogHeader>
          {quickDraft && (
            <div className="space-y-3 text-sm">
              <div className="grid md:grid-cols-3 gap-2">
                <label className="block">Outlet<select className="w-full border rounded px-2 py-1" value={quickDraft.outletId} onChange={(e)=>{ const id=e.target.value; const o = outlets.find(x=> x.id===id); const guideLines = o?.guide?.length? o!.guide!.filter(g=> g.item).map(g=> ({ id: uid(), item: g.item, qty: g.defaultQty||0, unit: g.unit||'pcs' })) : quickDraft.lines.length? quickDraft.lines : [ { id: uid(), item: '', qty: 0, unit: 'pcs' } ]; setQuickDraft({ ...(quickDraft as any), outletId: id, lines: guideLines }); }}>{outlets.map(o=> <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
                <label className="block">Date<input type="date" className="w-full border rounded px-2 py-1" value={quickDraft.date} onChange={(e)=> setQuickDraft({ ...(quickDraft as any), date: e.target.value })}/></label>
                <label className="block">Time<input type="time" className="w-full border rounded px-2 py-1" value={quickDraft.time} onChange={(e)=> setQuickDraft({ ...(quickDraft as any), time: e.target.value })}/></label>
              </div>
              <div>
                <div className="font-medium mb-1">Lines</div>
                <table className="w-full text-sm">
                  <thead><tr className="text-left"><th>Finished item</th><th>Qty</th><th>Unit</th><th></th></tr></thead>
                  <tbody>
                    {quickDraft.lines.map((l,idx)=> (
                      <tr key={l.id} className="border-t">
                        <td>
                          <input list="fin-items" className="w-full border rounded px-1" value={l.item} onChange={(e)=> onQuickItemChange(idx, e.target.value)} placeholder="Type to search finished goods"/>
                        </td>
                        <td><input className="w-24 border rounded px-1" value={l.qty} onChange={(e)=> setQuickDraft({ ...(quickDraft as any), lines: quickDraft.lines.map((x,i)=> i===idx? { ...x, qty: Number(e.target.value||0) }: x) })}/></td>
                        <td><input className="w-24 border rounded px-1" value={l.unit} onChange={(e)=> setQuickDraft({ ...(quickDraft as any), lines: quickDraft.lines.map((x,i)=> i===idx? { ...x, unit: e.target.value }: x) })}/></td>
                        <td><button onClick={()=> setQuickDraft({ ...(quickDraft as any), lines: quickDraft.lines.filter((_,i)=> i!==idx) })}><Trash className="w-4 h-4"/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <datalist id="fin-items">
                  {fin.map(f=> <option key={f.id} value={f.name}></option>)}
                </datalist>
                <div className="mt-2"><Button size="sm" onClick={()=> setQuickDraft({ ...(quickDraft as any), lines: [ ...quickDraft.lines, { id: uid(), item: '', qty: 0, unit: 'pcs' } ] })}><Plus className="w-4 h-4 mr-1"/>Add line</Button></div>
              </div>
              <div className="border-t pt-2">
                <label className="inline-flex items-center gap-2 mr-4">
                  <input type="checkbox" checked={quickRecurring} onChange={(e)=> setQuickRecurring(e.target.checked)} />Recurring
                </label>
                {quickRecurring && (
                  <div className="mt-2 grid md:grid-cols-3 gap-2">
                    <div className="col-span-2 flex flex-wrap gap-3 items-center">
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i)=> (
                        <label key={d} className="inline-flex items-center gap-1"><input type="checkbox" checked={quickDays.includes(i)} onChange={(e)=> setQuickDays(prev=> e.target.checked? [...prev, i] : prev.filter(x=> x!==i))}/>{d}</label>
                      ))}
                    </div>
                    <label className="block">Until<input type="date" className="w-full border rounded px-2 py-1" value={quickUntil} onChange={(e)=> setQuickUntil(e.target.value)} /></label>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={()=> setQuickOpen(false)}>Cancel</Button>
                  <Button onClick={saveQuick}>Create & plan</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={orderDialogOpen} onOpenChange={(v)=>{ setOrderDialogOpen(v); if(!v){ setOrderEditingId(null); setOrderDraft(null); } }}>
        <DialogContent className="max-w-3xl shadow-[0_0_28px_rgba(59,130,246,0.35)] dark:shadow-[0_0_32px_rgba(14,165,233,0.45)] hover:shadow-[0_0_44px_rgba(59,130,246,0.5)] dark:hover:shadow-[0_0_52px_rgba(14,165,233,0.6)] transition-shadow">
          <DialogHeader><DialogTitle>Edit Order</DialogTitle></DialogHeader>
          {orderDraft && (
            <div className="space-y-3 text-sm">
              {(()=>{ const affected = tasks.filter(tt=> tt.orderId===orderDraft.id && tt.timePending); return affected.length? (
                <div className="rounded-md border p-2 bg-amber-50 text-amber-800">
                  <div className="font-medium text-xs mb-1">Pending time adjustments</div>
                  <ul className="text-xs space-y-1">
                    {affected.map(tt=> (
                      <li key={tt.id} className="flex items-center justify-between gap-2">
                        <span>{tt.title} — Time adjusted: {tt.pendingOriginalStart}–{tt.pendingOriginalEnd} on {tt.pendingOriginalDateISO}</span>
                        <button className="underline" onClick={()=> revertTimeChange(tt.id)}>Revert</button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null; })()}
              <div className="grid md:grid-cols-3 gap-2">
                <label className="block">Outlet<select className="w-full border rounded px-2 py-1" value={orderDraft.outletId} onChange={(e)=> setOrderDraft({ ...(orderDraft as any), outletId: e.target.value })}>{outlets.map(o=> <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
                <label className="block">Date<input type="date" className="w-full border rounded px-2 py-1" value={orderDraft.date} onChange={(e)=> setOrderDraft({ ...(orderDraft as any), date: e.target.value })}/></label>
                <label className="block">Time<input type="time" className="w-full border rounded px-2 py-1" value={orderDraft.time} onChange={(e)=> setOrderDraft({ ...(orderDraft as any), time: e.target.value })}/></label>
              </div>
              <label className="block">Notes<textarea className="w-full border rounded px-2 py-1" value={orderDraft.notes} onChange={(e)=> setOrderDraft({ ...(orderDraft as any), notes: e.target.value })}/></label>
              <div>
                <div className="font-medium mb-1">Lines</div>
                <table className="w-full text-sm">
                  <thead><tr className="text-left"><th>Item</th><th>Qty</th><th>Unit</th><th></th></tr></thead>
                  <tbody>
                    {orderDraft.lines.map((l,idx)=> (
                      <tr key={l.id} className="border-t">
                        <td><input className="w-full border rounded px-1" value={l.item} onChange={(e)=> setOrderDraft({ ...(orderDraft as any), lines: orderDraft.lines.map((x,i)=> i===idx? { ...x, item: e.target.value }: x) })}/></td>
                        <td><input className="w-24 border rounded px-1" value={l.qty} onChange={(e)=> setOrderDraft({ ...(orderDraft as any), lines: orderDraft.lines.map((x,i)=> i===idx? { ...x, qty: Number(e.target.value||0) }: x) })}/></td>
                        <td><input className="w-24 border rounded px-1" value={l.unit} onChange={(e)=> setOrderDraft({ ...(orderDraft as any), lines: orderDraft.lines.map((x,i)=> i===idx? { ...x, unit: e.target.value }: x) })}/></td>
                        <td><button onClick={()=> setOrderDraft({ ...(orderDraft as any), lines: orderDraft.lines.filter((_,i)=> i!==idx) })}><Trash className="w-4 h-4"/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2"><Button size="sm" onClick={()=> setOrderDraft({ ...(orderDraft as any), lines: [ ...orderDraft.lines, { id: uid(), item: '', qty: 0, unit: 'pcs' } as any ] })}><Plus className="w-4 h-4 mr-1"/>Add line</Button></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={()=> setOrderDialogOpen(false)}>Cancel</Button>
                <Button onClick={saveOrder}>Save changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!guideOutlet} onOpenChange={(v)=>{ if(!v) setGuideOutlet(null); }}>
        <DialogContent className="max-w-3xl shadow-[0_0_28px_rgba(59,130,246,0.35)] dark:shadow-[0_0_32px_rgba(14,165,233,0.45)] hover:shadow-[0_0_44px_rgba(59,130,246,0.5)] dark:hover:shadow-[0_0_52px_rgba(14,165,233,0.6)] transition-shadow">
          <DialogHeader><DialogTitle>Outlet — {guideOutlet?.name}</DialogTitle></DialogHeader>
          {guideOutlet && (
            <div className="space-y-3 text-sm">
              <div className="grid md:grid-cols-5 gap-2">
                <label className="block">Name<input className="w-full border rounded px-2 py-1" value={guideOutlet.name} onChange={(e)=> setOutlets(prev=> prev.map(o=> o.id===guideOutlet.id? { ...o, name: e.target.value }: o))} /></label>
                <label className="block">Type<select className="w-full border rounded px-2 py-1" value={guideOutlet.type} onChange={(e)=> setOutlets(prev=> prev.map(o=> o.id===guideOutlet.id? { ...o, type: e.target.value as Outlet['type'] }: o))}><option>Outlet</option><option>Banquets</option><option>Custom Cakes</option></select></label>
                <label className="block">Cutoff<input type="time" className="w-full border rounded px-2 py-1" value={guideOutlet.orderCutoff||''} onChange={(e)=> setOutlets(prev=> prev.map(o=> o.id===guideOutlet.id? { ...o, orderCutoff: e.target.value }: o))} /></label>
                <label className="block">Open<input type="time" className="w-full border rounded px-2 py-1" value={guideOutlet.open||''} onChange={(e)=> setOutlets(prev=> prev.map(o=> o.id===guideOutlet.id? { ...o, open: e.target.value }: o))} /></label>
                <label className="block">Close<input type="time" className="w-full border rounded px-2 py-1" value={guideOutlet.close||''} onChange={(e)=> setOutlets(prev=> prev.map(o=> o.id===guideOutlet.id? { ...o, close: e.target.value }: o))} /></label>
              </div>
              <div className="grid md:grid-cols-2 gap-2">
                <label className="block">Start<input type="date" className="w-full border rounded px-2 py-1" value={guideStart} onChange={(e)=> setGuideStart(e.target.value)} /></label>
                <label className="block">Until<input type="date" className="w-full border rounded px-2 py-1" value={guideUntil} onChange={(e)=> setGuideUntil(e.target.value)} /></label>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-left"><th>Item</th><th>Default Qty</th><th>Unit</th><th>Times (comma‑sep)</th><th>Recurring</th><th>Days</th><th></th></tr></thead>
                <tbody>
                  {(guideOutlet.guide||[]).map((g,idx)=> (
                    <tr key={idx} className="border-t align-top">
                      <td><input className="w-full border rounded px-1" value={g.item} onChange={(e)=> setOutlets(prev=> prev.map(o=> o.id===guideOutlet.id? { ...o, guide: (o.guide||[]).map((x,i)=> i===idx? { ...x, item: e.target.value }: x) } : o))} /></td>
                      <td><input className="w-24 border rounded px-1" value={g.defaultQty} onChange={(e)=> setOutlets(prev=> prev.map(o=> o.id===guideOutlet.id? { ...o, guide: (o.guide||[]).map((x,i)=> i===idx? { ...x, defaultQty: Number(e.target.value||0) }: x) } : o))} /></td>
                      <td><input className="w-24 border rounded px-1" value={g.unit} onChange={(e)=> setOutlets(prev=> prev.map(o=> o.id===guideOutlet.id? { ...o, guide: (o.guide||[]).map((x,i)=> i===idx? { ...x, unit: e.target.value }: x) } : o))} /></td>
                      <td><input className="w-40 border rounded px-1" placeholder="06:00, 15:00" value={g.times||''} onChange={(e)=> setOutlets(prev=> prev.map(o=> o.id===guideOutlet.id? { ...o, guide: (o.guide||[]).map((x,i)=> i===idx? { ...x, times: e.target.value }: x) } : o))} /></td>
                      <td>
                        <label className="inline-flex items-center gap-1">
                          <input type="checkbox" checked={!!g.recurring} onChange={(e)=> setOutlets(prev=> prev.map(o=> o.id===guideOutlet.id? { ...o, guide: (o.guide||[]).map((x,i)=> i===idx? { ...x, recurring: e.target.checked }: x) } : o))} />
                          <span className="text-xs">Yes</span>
                        </label>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {['S','M','T','W','T','F','S'].map((d,i)=> (
                            <label key={i} className="inline-flex items-center gap-1 text-[11px]"><input type="checkbox" checked={(g.days||[]).includes(i)} onChange={(e)=> setOutlets(prev=> prev.map(o=> o.id===guideOutlet.id? { ...o, guide: (o.guide||[]).map((x,xi)=> xi===idx? { ...x, days: e.target.checked? ([...(x.days||[]), i]) : (x.days||[]).filter(v=> v!==i) }: x) } : o))} />{d}</label>
                          ))}
                        </div>
                      </td>
                      <td><button onClick={()=> setOutlets(prev=> prev.map(o=> o.id===guideOutlet.id? { ...o, guide: (o.guide||[]).filter((_,i)=> i!==idx) } : o))}><Trash className="w-4 h-4"/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Button size="sm" onClick={()=> setOutlets(prev=> prev.map(o=> o.id===guideOutlet.id? { ...o, guide: [ ...(o.guide||[]), { item:'', defaultQty:0, unit:'pcs', times:'06:00' } ] }: o))}><Plus className="w-4 h-4 mr-1"/>Add line</Button>
              <div className="flex justify-between">
                <Button variant="secondary" onClick={()=> setGuideOutlet(null)}>Close</Button>
                <Button onClick={()=>{
                  const outlet = guideOutlet;
                  if(!outlet) return;
                  const start = new Date(`${guideStart}T00:00:00`);
                  const until = new Date(`${guideUntil}T23:59:59`);
                  const buckets: Record<string, { dateStr:string; time:string; lines: { id:string; item:string; qty:number; unit:string }[] }> = {};
                  for(let d = new Date(start); d <= until; d.setDate(d.getDate()+1)){
                    const dow = d.getDay();
                    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
                    const dateStr = `${y}-${m}-${day}`;
                    for(const g of (outlet.guide||[])){
                      if(!(g.item && (g.defaultQty||0)>0)) continue;
                      const include = g.recurring? (!(g.days&&g.days.length) || (g.days||[]).includes(dow)) : true;
                      if(!include) continue;
                      const times = (g.times||'06:00').split(',').map(s=> s.trim()).filter(Boolean);
                      for(const t of times){
                        const key = `${dateStr}|${t}`;
                        (buckets[key] ||= { dateStr, time: t, lines: [] }).lines.push({ id: uid(), item: g.item, qty: g.defaultQty||0, unit: g.unit||'pcs' });
                      }
                    }
                  }
                  Object.values(buckets).forEach(b=>{
                    const dueISO = new Date(`${b.dateStr}T${b.time}:00`).toISOString();
                    addOrderQuick({ outletId: outlet.id, dueISO, lines: b.lines });
                  });
                  setGuideOutlet(null);
                }}>Create Order Guide</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      <Dialog open={confirmDelOpen} onOpenChange={(v)=>{ setConfirmDelOpen(v); if(!v){ setPendingDeleteOrderId(null); setDeleteReason(""); setDeleteError(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Confirm delete order</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            {pendingDeleteOrderId && (()=>{ const o = orders.find(x=> x.id===pendingDeleteOrderId)!; return (
              <div className="text-xs text-muted-foreground">{outletsById[o.outletId]?.name} • {new Date(o.dueISO).toLocaleString()}</div>
            ); })()}
            <label className="block">Reason<input className="w-full border rounded px-2 py-1" value={deleteReason} onChange={(e)=> setDeleteReason(e.target.value)} placeholder="Optional"/></label>
            {deleteError && <div className="text-xs text-red-600">{deleteError}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={()=> setConfirmDelOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={performDeleteOrder}>Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
