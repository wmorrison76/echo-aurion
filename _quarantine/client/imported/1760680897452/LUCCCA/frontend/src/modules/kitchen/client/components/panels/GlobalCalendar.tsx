import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AlertCircle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, DollarSign, Grid3X3, List, Activity, Users, FileText, Edit3, CheckCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import type { BEODocument } from '../../types/beo';
import { useBEOStore, type CalendarEvent } from '../../stores/beoStore';

export interface GlobalCalendarProps { onBEOSelect?: (beoId: string) => void; onCreateBEO?: (eventId: string) => void; viewMode?: 'calendar'|'list'|'timeline'|'chef'|'production'|'analytics'; events?: CalendarEvent[]; }

const EventStatusBadge: React.FC<{ status: CalendarEvent['status'] }> = ({ status }) => (
  <Badge variant="outline" className="capitalize">{status.replace('_',' ')}</Badge>
);

const EventDetailsModal: React.FC<{ event: CalendarEvent|null; open: boolean; onClose:()=>void; onEditBEO:(e:CalendarEvent)=>void; onCreateBEO:(id:string)=>void; onAck:(id:string)=>void; }> = ({ event, open, onClose, onEditBEO, onCreateBEO, onAck }) => {
  if(!open || !event) return null;
  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <Card className="max-w-xl w-full" onClick={(e)=> e.stopPropagation()}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">{event.title}</div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2"><CalendarIcon className="w-4 h-4"/><span>{new Date(event.date).toLocaleDateString()}</span></div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4"/><span>{event.time}</span></div>
            <div className="flex items-center gap-2"><Users className="w-4 h-4"/><span>{event.guestCount} guests</span></div>
            {event.revenue? (<div className="flex items-center gap-2"><DollarSign className="w-4 h-4"/><span>${event.revenue.toLocaleString()}</span></div>): null}
          </div>
          <EventStatusBadge status={event.status}/>
          <div className="flex gap-2 pt-2 border-t">
            {!event.acknowledged && (<Button className="flex-1" onClick={()=>{ onAck(event.id); onClose(); }}><CheckCircle className="w-4 h-4 mr-2"/>Acknowledge</Button>)}
            {event.beoId? (
              <Button variant="outline" className="flex-1" onClick={()=>{ onEditBEO(event); onClose(); }}><Edit3 className="w-4 h-4 mr-2"/>Edit BEO</Button>
            ):(
              <Button variant="outline" className="flex-1" onClick={()=>{ onCreateBEO(event.id); onClose(); }}><FileText className="w-4 h-4 mr-2"/>Create BEO</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
};

const CalendarGrid: React.FC<{ events: CalendarEvent[]; date: Date; onEvent:(e:CalendarEvent)=>void; }> = ({ events, date, onEvent }) => {
  const daysInMonth = new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const days = Array.from({length:daysInMonth},(_,i)=> i+1);
  const empty = Array.from({length:firstDay},()=> null);
  const getEvents = (d:number)=> events.filter(e=> e.date===`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  return (
    <div className="bg-white dark:bg-background border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=> <div key={x} className="p-2 text-center">{x}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {empty.map((_,i)=> <div key={`e-${i}`} className="h-24 border-r border-b"/>) }
        {days.map(d=>{ const evs=getEvents(d); return (
          <div key={d} className="h-24 border-r border-b p-1">
            <div className="text-xs font-semibold opacity-70">{d}</div>
            <div className="space-y-1">
              {evs.slice(0,3).map(ev=> (
                <div key={ev.id} className={cn('text-[11px] px-1 py-0.5 rounded border cursor-pointer truncate', !ev.acknowledged && 'ring-1 ring-red-400')} onClick={()=> onEvent(ev)}>
                  {ev.title} • {ev.time.split(' ')[0]}
                </div>
              ))}
              {evs.length>3 && <div className="text-[11px] text-muted-foreground">+{evs.length-3} more</div>}
            </div>
          </div>
        );})}
      </div>
    </div>
  );
};

export const GlobalCalendar: React.FC<GlobalCalendarProps> = ({ onBEOSelect, onCreateBEO, events: propEvents }) => {
  const store = useBEOStore();
  const events = propEvents ?? store.events;
  const isLoading = propEvents ? false : store.isLoading;
  const loadEvents = propEvents ? (()=>{}) : store.loadEvents;
  const acknowledgeEvent = propEvents ? ((_id:string,_who?:string)=>{}) : store.acknowledgeEvent;
  const createBEO = propEvents ? (async (_id:string)=>{}) : store.createBEO;
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<'month'|'week'|'today'>('month');
  const [selected, setSelected] = useState<CalendarEvent|null>(null);
  const [open, setOpen] = useState(false);
  const routerLocation = useLocation();
  useEffect(()=>{ if(!propEvents){ loadEvents(); } }, [propEvents]);
  useEffect(()=>{ const p=new URLSearchParams(routerLocation.search||''); const id=p.get('event'); if(id){ const ev=events.find(e=> e.id===id); if(ev){ setSelected(ev); setOpen(true);} } }, [routerLocation.search, events]);
  if(isLoading){ return (<div className="p-6 text-center">Loading…</div>); }
  const monthEvents = events.filter(e=> new Date(e.date).getMonth()===date.getMonth() && new Date(e.date).getFullYear()===date.getFullYear());
  const covers = monthEvents.reduce((s,e)=> s + (e.guestCount||0), 0);
  return (
    <div className="space-y-3">
      <Alert className="py-2"><AlertCircle className="h-4 w-4"/><AlertDescription className="text-sm">{events.filter(e=>!e.acknowledged).length} BEO(s) need acknowledgment</AlertDescription></Alert>
      <Card className="border shadow-md">
        <CardHeader className="bg-slate-50 dark:bg-slate-800 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={()=> setDate(d=>{ const n=new Date(d); n.setMonth(d.getMonth()-1); return n; })}><ChevronLeft className="w-4 h-4"/></Button>
              <div className="text-xl font-semibold">{date.toLocaleDateString('en-US',{month:'long', year:'numeric'})}</div>
              <Button variant="outline" size="sm" onClick={()=> setDate(d=>{ const n=new Date(d); n.setMonth(d.getMonth()+1); return n; })}><ChevronRight className="w-4 h-4"/></Button>
              <Button variant="default" size="sm" onClick={()=> setDate(new Date())}><Clock className="w-4 h-4 mr-1"/>Today</Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={()=> loadEvents()}><RefreshCw className="w-4 h-4 mr-2"/>Refresh</Button>
              <div className="flex border rounded-lg">
                <Button variant={view==='month'? 'default':'ghost'} size="sm" onClick={()=> setView('month')} className="rounded-r-none border-r"><Grid3X3 className="w-4 h-4 mr-1"/>Month</Button>
                <Button variant={view==='week'? 'default':'ghost'} size="sm" onClick={()=> setView('week')} className="rounded-none border-r"><Activity className="w-4 h-4 mr-1"/>Week</Button>
                <Button variant={view==='today'? 'default':'ghost'} size="sm" onClick={()=> setView('today')} className="rounded-l-none"><List className="w-4 h-4 mr-1"/>Today</Button>
              </div>
              <Badge variant="outline" className="text-xs">{monthEvents.length} events</Badge>
              <Badge variant="outline" className="text-xs"><Users className="w-3 h-3 mr-1"/>{covers} covers</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <CalendarGrid events={events} date={date} onEvent={(e)=>{ setSelected(e); setOpen(true); }} />
        </CardContent>
      </Card>
      <EventDetailsModal event={selected} open={open} onClose={()=> setOpen(false)} onEditBEO={(e)=> onBEOSelect?.(e.beoId||'')} onCreateBEO={async(id)=>{ await createBEO(id); onCreateBEO?.(id); }} onAck={(id)=> acknowledgeEvent(id,'Chef')} />
    </div>
  );
};

export default GlobalCalendar;
