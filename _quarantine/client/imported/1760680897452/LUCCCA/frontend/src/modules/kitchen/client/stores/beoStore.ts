import React from 'react';

export type CalendarEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. 5:00 PM - 9:00 PM
  room: string;
  guestCount: number;
  status: 'lead'|'proposal'|'pending'|'confirmed'|'in_prep'|'execution'|'closed';
  priority: 'low'|'medium'|'high'|'urgent';
  acknowledged: boolean;
  beoId?: string;
  clientName?: string;
  revenue?: number;
  type?: string;
};

const demoEvents: CalendarEvent[] = [
  { id:'EV-1', title:'Wedding Reception', date:new Date().toISOString().slice(0,10), time:'5:00 PM - 9:00 PM', room:'Ballroom A', guestCount:120, status:'confirmed', priority:'high', acknowledged:false, clientName:'Smith' },
  { id:'EV-2', title:'Corporate Lunch', date:new Date().toISOString().slice(0,10), time:'12:00 PM - 2:00 PM', room:'Salon C', guestCount:60, status:'pending', priority:'medium', acknowledged:true, clientName:'Acme Inc.' },
  { id:'EV-3', title:'Gala Dinner', date:new Date(Date.now()+86400000).toISOString().slice(0,10), time:'6:00 PM - 11:00 PM', room:'Grand Hall', guestCount:200, status:'lead', priority:'urgent', acknowledged:false, clientName:'Charity Org', revenue: 15000 },
];

export function useBEOStore(){
  const [events, setEvents] = React.useState<CalendarEvent[]>(demoEvents);
  const [isLoading, setIsLoading] = React.useState(false);
  const beos: Record<string, any> = {};
  async function loadEvents(){ setIsLoading(true); setTimeout(()=> setIsLoading(false), 100); }
  async function acknowledgeEvent(id: string, who: string){ setEvents(prev=> prev.map(e=> e.id===id? { ...e, acknowledged:true }: e)); }
  async function createBEO(eventId: string){ setEvents(prev=> prev.map(e=> e.id===eventId? { ...e, beoId: `BEO-${eventId}` }: e)); }
  async function loadBEO(id: string){ return beos[id]; }
  return { events, isLoading, loadEvents, acknowledgeEvent, createBEO, isIntegrationEnabled:false, syncStatus:{ isConnected:false, lastSyncAt: Date.now() }, pendingConflicts:[], beos, loadBEO } as const;
}

export default useBEOStore;
