import "@/vendor/fullcalendar/daygrid.css";
import "@/vendor/fullcalendar/timegrid.css";
import "@/vendor/fullcalendar/list.css";
import FullCalendar from '@fullcalendar/react';
/*
/*
 * Personal Calendar — Chef's private planner (meetings, PTO, personal dates)
 * FullCalendar-based implementation with drag-to-create, drag/drop/resize,
 * recurrence, quick add, color categories, and ICS export. Local persistence
 * via localStorage.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Grid3X3, Activity, List, Download, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

// FullCalendar






import { DateSelectArg, EventApi, EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import rrulePlugin from '@fullcalendar/rrule';

// -------------------------------
// Types
// -------------------------------
export type CalendarCategory = 'Chef' | 'BEO' | 'Kitchen' | 'Scheduler' | 'CRM' | 'Personal' | 'Other';

export type CalendarExtended = {
  category?: CalendarCategory;
  color?: string;
  location?: string;
  attendees?: Array<{ name: string; email?: string; role?: string }>;
  notes?: string;
  attachments?: Array<{ name: string; url: string }>;
  linkedObjects?: { beoId?: string; recipeId?: string; crmId?: string; orderId?: string };
  privacy?: 'public' | 'private';
  status?: 'confirmed' | 'tentative' | 'cancelled';
};

export type SeedEvent = EventInput & { extendedProps?: CalendarExtended };

// -------------------------------
// Category → Color map (fallbacks)
// -------------------------------
const CATEGORY_COLORS: Record<CalendarCategory, string> = {
  Chef: '#0ea5e9',
  BEO: '#f59e0b',
  Kitchen: '#10b981',
  Scheduler: '#a78bfa',
  CRM: '#ef4444',
  Personal: '#64748b',
  Other: '#94a3b8',
};

// -------------------------------
// Minimal demo events (used if no sources provided)
// -------------------------------
const DEMO_EVENTS: SeedEvent[] = [
  {
    id: 'demo-1',
    title: 'Chef Tasting – Summer Menu',
    start: new Date().toISOString(),
    end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    extendedProps: { category: 'Chef', location: 'Test Kitchen', notes: 'Lemon verbena finish', privacy: 'private' },
  },
  {
    id: 'demo-2',
    title: 'BEO 10234 – Gala Dinner (Plated)',
    start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    end: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    extendedProps: { category: 'BEO', linkedObjects: { beoId: 'BEO-10234' }, location: 'Ballroom A', status: 'confirmed' },
  },
  {
    id: 'demo-3',
    title: 'Weekly Sous Check-In',
    rrule: {
      freq: 'weekly',
      byweekday: ['mo'],
      dtstart: new Date().toISOString(),
    },
    duration: '00:30',
    extendedProps: { category: 'Scheduler' },
  },
];

// -------------------------------
// Utilities
// -------------------------------
const STORAGE_KEY = 'echo.calendar.v1';

function persist(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function restore<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}

function toICS(events: EventApi[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LUCCCA//EchoCalendar//EN',
  ];
  for (const ev of events) {
    const uid = ev.id || `${Math.random().toString(36).slice(2)}@luccca`;
    const start = ev.start ? formatICSDate(ev.start) : '';
    const end = ev.end ? formatICSDate(ev.end) : '';
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      ev.title ? `SUMMARY:${escapeICS(ev.title)}` : '',
      start ? `DTSTART:${start}` : '',
      end ? `DTEND:${end}` : '',
      ev.extendedProps && (ev.extendedProps as any).location ? `LOCATION:${escapeICS((ev.extendedProps as any).location)}` : '',
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.filter(Boolean).join('\r\n');
}

function escapeICS(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function formatICSDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function cryptoRandomId() {
  try {
    return Array.from(crypto.getRandomValues(new Uint8Array(12))).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch { return Math.random().toString(36).slice(2); }
}

function parseQuickAdd(input: string, baseDate: Date): SeedEvent | null {
  if (!input.trim()) return null;
  const out: SeedEvent = { id: cryptoRandomId(), title: input.trim(), start: baseDate.toISOString() };

  const catMatch = input.match(/#(Chef|BEO|Kitchen|Scheduler|CRM|Personal|Other)/i);
  if (catMatch) {
    const cat = (catMatch[1][0].toUpperCase() + catMatch[1].slice(1).toLowerCase()) as CalendarCategory;
    out.extendedProps = { ...(out.extendedProps || {}), category: cat };
  }
  const locMatch = input.match(/@([^!#]+?)(?=\s[#!]|$)/);
  if (locMatch) { out.extendedProps = { ...(out.extendedProps || {}), location: locMatch[1].trim() }; }
  const privMatch = input.match(/!(private|public)/i);
  if (privMatch) { const p = privMatch[1].toLowerCase() as 'private' | 'public'; out.extendedProps = { ...(out.extendedProps || {}), privacy: p }; }

  const timeMatch = input.match(/(\d{1,2}(:\d{2})?)(am|pm)?\s*-\s*(\d{1,2}(:\d{2})?)(am|pm)?/i);
  const singleTimeMatch = input.match(/\b(\d{1,2}(:\d{2})?)(am|pm)\b/i);
  const start = new Date(baseDate); const end = new Date(baseDate);
  const setHM = (d: Date, hm: string) => { const [h, m] = hm.split(':'); d.setHours(Number(h), Number(m || 0), 0, 0); };
  if (timeMatch) {
    const [, startHM, , startMeridiem, endHM, , endMeridiem] = timeMatch as unknown as [string, string, string, string, string, string, string];
    if (startMeridiem) {
      const [hStr, mStr] = startHM.split(':');
      let h = Number(hStr);
      if (startMeridiem.toLowerCase() === 'pm' && h < 12) h += 12;
      if (startMeridiem.toLowerCase() === 'am' && h === 12) h = 0;
      start.setHours(h, Number(mStr || 0), 0, 0);
    } else setHM(start, startHM);
    if (endMeridiem) {
      const [hStr, mStr] = endHM.split(':');
      let h = Number(hStr);
      if (endMeridiem.toLowerCase() === 'pm' && h < 12) h += 12;
      if (endMeridiem.toLowerCase() === 'am' && h === 12) h = 0;
      end.setHours(h, Number(mStr || 0), 0, 0);
    } else setHM(end, endHM);
    out.start = start.toISOString(); out.end = end.toISOString();
  } else if (singleTimeMatch) {
    const [, hm, , meridiem] = singleTimeMatch as unknown as [string, string, string, string];
    const d = new Date(baseDate);
    const [hh, mm] = hm.split(':');
    let h = Number(hh);
    if (meridiem.toLowerCase() === 'pm' && h < 12) h += 12;
    if (meridiem.toLowerCase() === 'am' && h === 12) h = 0;
    d.setHours(h, Number(mm || 0), 0, 0);
    out.start = d.toISOString(); out.end = new Date(d.getTime() + 60 * 60 * 1000).toISOString();
  }
  const repMatch = input.match(/repeat:(daily|weekly|monthly)/i);
  if (repMatch) {
    const freq = repMatch[1].toLowerCase();
    const rrule: any = { dtstart: out.start };
    if (freq === 'daily') rrule.freq = 'daily';
    if (freq === 'weekly') rrule.freq = 'weekly';
    if (freq === 'monthly') rrule.freq = 'monthly';
    (out as any).rrule = rrule; delete (out as any).end; (out as any).duration = '01:00';
  }
  return out;
}

export default function PersonalCalendar() {
  const { toast } = useToast();
  const calendarRef = useRef<FullCalendar | null>(null);
  const [calendarTitle, setCalendarTitle] = useState('');
  const [quickAdd, setQuickAdd] = useState('');
  const [eventCount, setEventCount] = useState<number>(0);
  type FormState = { id?: string; title: string; start: string; end: string; allDay: boolean; category?: CalendarCategory; location?: string; notes?: string };
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ title: '', start: new Date().toISOString(), end: new Date(Date.now()+60*60*1000).toISOString(), allDay: false });
  const [showUS, setShowUS] = useState(false);
  const [showChristian, setShowChristian] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const SOURCES_KEY = 'echo.calendar.sources.v1';

  const initialEvents = useMemo<SeedEvent[]>(() => restore<SeedEvent[]>(STORAGE_KEY, DEMO_EVENTS), []);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api) {
      setCalendarTitle(api.view?.title || '');
      setEventCount(api.getEvents().length);
    } else {
      setEventCount(initialEvents.length);
    }
    try { const raw = localStorage.getItem(SOURCES_KEY); if(raw){ const s = JSON.parse(raw); setShowUS(!!s.us); setShowChristian(!!s.chr); } } catch {}
  }, []);

  useEffect(()=>{ try { localStorage.setItem(SOURCES_KEY, JSON.stringify({ us: showUS, chr: showChristian })); } catch {} }, [showUS, showChristian]);

  useEffect(()=>{ if (calendarRef.current?.getApi()) toggleHolidays('us', showUS); }, [showUS]);
  useEffect(()=>{ if (calendarRef.current?.getApi()) toggleHolidays('chr', showChristian); }, [showChristian]);

  const persistFromApi = () => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const plain: SeedEvent[] = api.getEvents().map((e) => {
      const ext = e.extendedProps as CalendarExtended | undefined;
      return {
        id: e.id,
        title: e.title,
        start: e.start ? e.start.toISOString() : undefined,
        end: e.end ? e.end.toISOString() : undefined,
        allDay: e.allDay,
        extendedProps: ext ? { ...ext } : undefined,
      } as SeedEvent;
    });
    persist(STORAGE_KEY, plain);
    setEventCount(plain.length);
  };

  const onSelect = (arg: DateSelectArg) => {
    const api = arg.view.calendar;
    api.unselect();
    setForm({ title: '', start: arg.startStr, end: arg.endStr || new Date(arg.start.getTime()+60*60*1000).toISOString(), allDay: !!arg.allDay, category: 'Personal' });
    setDialogOpen(true);
  };

  const onEventClick = (clickInfo: EventClickArg) => {
    const e = clickInfo.event;
    setForm({ id: e.id, title: e.title || '', start: e.start?.toISOString() || new Date().toISOString(), end: e.end?.toISOString() || new Date(Date.now()+60*60*1000).toISOString(), allDay: e.allDay, category: (e.extendedProps as any)?.category || 'Personal', location: (e.extendedProps as any)?.location || '', notes: (e.extendedProps as any)?.notes || '' });
    setDialogOpen(true);
  };

  const onEventDrop = (_: EventDropArg) => { persistFromApi(); };
  const onEventResize = (_: any) => { persistFromApi(); };

  const onDatesSet = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      setCalendarTitle(api.view?.title || '');
      setEventCount(api.getEvents().length);
    }
  };

  const goPrev = () => { calendarRef.current?.getApi().prev(); setCalendarTitle(calendarRef.current?.getApi().view?.title || ''); };
  const goNext = () => { calendarRef.current?.getApi().next(); setCalendarTitle(calendarRef.current?.getApi().view?.title || ''); };
  const goToday = () => { calendarRef.current?.getApi().today(); setCalendarTitle(calendarRef.current?.getApi().view?.title || ''); };

  const setView = (viewName: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => {
    calendarRef.current?.getApi().changeView(viewName);
    setCalendarTitle(calendarRef.current?.getApi().view?.title || '');
  };

  const addQuick = () => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const base = api.getDate();
    const ev = parseQuickAdd(quickAdd, base);
    if (ev) { api.addEvent(ev as EventInput); persistFromApi(); setQuickAdd(''); toast({ title: 'Added', description: ev.title || '' }); }
  };

  const exportICS = () => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const ics = toICS(api.getEvents());
    download('personal-calendar.ics', ics);
  };

  const eventDataTransform = (input: EventInput): EventInput => {
    const ext = (input as any).extendedProps as CalendarExtended | undefined;
    const cat = ext?.category;
    const color = ext?.color || (cat ? CATEGORY_COLORS[cat] : undefined);
    return { ...input, backgroundColor: color, borderColor: color };
  };

  function addOrUpdateFromForm() {
    const api = calendarRef.current?.getApi(); if (!api) return;
    if (!form.title) { setDialogOpen(false); return; }
    if (form.id) {
      const ev = api.getEventById(form.id);
      if (ev) {
        ev.setProp('title', form.title);
        ev.setExtendedProp('category', form.category || 'Personal');
        ev.setExtendedProp('location', form.location || '');
        ev.setExtendedProp('notes', form.notes || '');
        ev.setAllDay(!!form.allDay);
        ev.setDates(new Date(form.start), new Date(form.end));
      }
    } else {
      api.addEvent({ id: cryptoRandomId(), title: form.title, start: new Date(form.start), end: new Date(form.end), allDay: !!form.allDay, extendedProps: { category: form.category || 'Personal', location: form.location, notes: form.notes } });
    }
    setDialogOpen(false);
    persistFromApi();
  }

  async function importICS(file: File) {
    const text = await file.text();
    const blocks = text.split(/BEGIN:VEVENT/).slice(1);
    const api = calendarRef.current?.getApi(); if (!api) return;
    for (const block of blocks) {
      const endIdx = block.indexOf('END:VEVENT');
      const body = block.slice(0, endIdx);
      const get = (re: RegExp) => { const m = body.match(re); return m ? m[1].trim() : ''; };
      const DTSTART = get(/DTSTART[^:]*:(.*)/);
      const DTEND = get(/DTEND[^:]*:(.*)/);
      const SUMMARY = get(/SUMMARY:(.*)/);
      const start = icsDateToISO(DTSTART);
      const end = icsDateToISO(DTEND);
      if (start && SUMMARY) {
        api.addEvent({ id: cryptoRandomId(), title: SUMMARY, start: start, end: end || undefined, extendedProps: { category: 'Personal' } });
      }
    }
    persistFromApi();
  }
  function icsDateToISO(s: string): string | null {
    if (!s) return null;
    if (/^\d{8}$/.test(s)) { const y=+s.slice(0,4),m=+s.slice(4,6),d=+s.slice(6,8); return new Date(Date.UTC(y,m-1,d)).toISOString(); }
    if (/^\d{8}T\d{6}Z$/.test(s)) { const y=+s.slice(0,4),m=+s.slice(4,6),d=+s.slice(6,8),hh=+s.slice(9,11),mm=+s.slice(11,13),ss=+s.slice(13,15); return new Date(Date.UTC(y,m-1,d,hh,mm,ss)).toISOString(); }
    try { return new Date(s).toISOString(); } catch { return null; }
  }

  function nthWeekdayOfMonth(year: number, monthZero: number, weekday: number, n: number) {
    const d = new Date(Date.UTC(year, monthZero, 1));
    const first = (7 + weekday - d.getUTCDay()) % 7;
    const day = 1 + first + (n-1)*7;
    return new Date(Date.UTC(year, monthZero, day));
  }
  function lastWeekdayOfMonth(year: number, monthZero: number, weekday: number) {
    const d = new Date(Date.UTC(year, monthZero + 1, 0));
    const diff = (7 + d.getUTCDay() - weekday) % 7;
    d.setUTCDate(d.getUTCDate() - diff);
    return d;
  }
  function observed(date: Date) {
    const dow = date.getUTCDay();
    const d = new Date(date);
    if (dow === 0) d.setUTCDate(d.getUTCDate()+1);
    if (dow === 6) d.setUTCDate(d.getUTCDate()-1);
    return d;
  }
  function easterUTC(year: number) {
    const a=year%19; const b=Math.floor(year/100); const c=year%100; const d=Math.floor(b/4); const e=b%4; const f=Math.floor((b+8)/25); const g=Math.floor((b-f+1)/3); const h=(19*a+b-d-g+15)%30; const i=Math.floor(c/4); const k=c%4; const l=(32+2*e+2*i-h-k)%7; const m=Math.floor((a+11*h+22*l)/451); const month=Math.floor((h+l-7*m+114)/31); const day=((h+l-7*m+114)%31)+1; return new Date(Date.UTC(year, month-1, day));
  }
  function usFederal(year: number): SeedEvent[] {
    const ev = (title: string, d: Date) => ({ id: `holiday-us-${title}-${year}`, title, start: d.toISOString(), allDay: true, extendedProps: { category: 'Other' as CalendarCategory } });
    const list: SeedEvent[] = [];
    list.push(ev("New Year's Day", observed(new Date(Date.UTC(year,0,1)))));
    list.push(ev('Martin Luther King Jr. Day', nthWeekdayOfMonth(year,0,1,3)));
    list.push(ev("Presidents' Day", nthWeekdayOfMonth(year,1,1,3)));
    list.push(ev('Memorial Day', lastWeekdayOfMonth(year,4,1)));
    list.push(ev('Juneteenth', observed(new Date(Date.UTC(year,5,19)))));
    list.push(ev('Independence Day', observed(new Date(Date.UTC(year,6,4)))));
    list.push(ev('Labor Day', nthWeekdayOfMonth(year,8,1,1)));
    list.push(ev('Columbus Day', nthWeekdayOfMonth(year,9,1,2)));
    list.push(ev("Veterans Day", observed(new Date(Date.UTC(year,10,11)))));
    list.push(ev('Thanksgiving', nthWeekdayOfMonth(year,10,4,4)));
    list.push(ev('Christmas Day', observed(new Date(Date.UTC(year,11,25)))));
    return list;
  }
  function christian(year: number): SeedEvent[] {
    const e = easterUTC(year);
    const goodFriday = new Date(e); goodFriday.setUTCDate(goodFriday.getUTCDate()-2);
    const ev = (title: string, d: Date) => ({ id: `holiday-chr-${title}-${year}`, title, start: d.toISOString(), allDay: true, extendedProps: { category: 'Other' as CalendarCategory } });
    return [ev('Good Friday', goodFriday), ev('Easter Sunday', e), ev('Christmas Day', new Date(Date.UTC(year,11,25)))];
  }
  function toggleHolidays(kind: 'us'|'chr', on: boolean) {
    const api = calendarRef.current?.getApi(); if (!api) return;
    const year = api.getDate().getUTCFullYear();
    api.getEvents().filter(e=> e.id?.startsWith(kind==='us'?'holiday-us-':'holiday-chr-')).forEach(e=> e.remove());
    if (on) {
      const evs = kind==='us' ? usFederal(year) : christian(year);
      evs.forEach(e=> api.addEvent(e as EventInput));
    }
    persistFromApi();
  }

  return (
    <DashboardLayout title="Personal Calendar" hideBrandIcon>
      <div className="dashboard-canvas calendar-neon rounded-2xl p-2 md:p-2">
        <Card className="w-full h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)] flex flex-col shadow-lg">
          <CardHeader className="border-b py-2 px-3">
            <div className="mt-0.5 grid grid-cols-1 lg:grid-cols-3 gap-2 items-center">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goPrev}><ChevronLeft className="h-4 w-4"/></Button>
                <div className="font-semibold">{calendarTitle}</div>
                <Button variant="outline" size="sm" onClick={goNext}><ChevronRight className="h-4 w-4"/></Button>
                <Button variant="default" size="sm" onClick={goToday}>Today</Button>
              </div>
              <div className="flex border rounded-lg shadow-sm bg-background w-fit mx-auto scale-95">
                <Button variant="default" size="sm" onClick={()=>setView('dayGridMonth')} className="rounded-r-none border-r"><Grid3X3 className="h-4 w-4 mr-1"/>Month</Button>
                <Button variant="default" size="sm" onClick={()=>setView('timeGridWeek')} className="rounded-none border-r"><Activity className="h-4 w-4 mr-1"/>Week</Button>
                <Button variant="default" size="sm" onClick={()=>setView('timeGridDay')} className="rounded-l-none"><List className="h-4 w-4 mr-1"/>Day</Button>
              </div>
              <div className="flex items-center gap-2 justify-end flex-wrap max-w-full">
                <div className="hidden md:flex items-center gap-2 flex-wrap">
                  <Input value={quickAdd} onChange={(e)=>setQuickAdd(e.target.value)} className="h-9 w-56 shrink-0" placeholder="Quick Add (e.g. 'Fri 3-4pm @Test #Personal')" />
                  <Button size="sm" className="shrink-0" onClick={addQuick}><Plus className="h-4 w-4 mr-1"/>Quick Add</Button>
                </div>
                <Button size="sm" onClick={()=>{ setForm({ title: '', start: new Date().toISOString(), end: new Date(Date.now()+60*60*1000).toISOString(), allDay:false, category:'Personal' }); setDialogOpen(true); }}>New Event</Button>
                <label className="sr-only" htmlFor="icsFile">Import .ics</label>
                <input id="icsFile" type="file" accept=".ics,text/calendar" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) importICS(f); e.currentTarget.value=''; }} />
                <Button variant="default" size="sm" onClick={()=>document.getElementById('icsFile')?.click()}>Import .ics</Button>
                <Button variant="default" size="sm" onClick={exportICS}><Download className="h-4 w-4 mr-1"/>Export .ics</Button>
                <Button variant="outline" size="sm" onClick={()=> setSourcesOpen(true)}><Plus className="h-4 w-4 mr-1"/>Calendar</Button>
                <a className="text-sm underline text-primary" href={`${(typeof window!== 'undefined' ? window.location.origin : '')}/api/personal-calendar/feed.ics`}>Subscribe</a>
                <Badge variant="outline" className="text-xs">{eventCount} items</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-1 flex-1 min-h-0">
            <div className="h-full flex flex-col">
              <div className="px-2 pt-2 space-y-2">
                <div className="mt-2">
                  <div className="h-[calc(100vh-16rem)] md:h-[calc(100vh-16rem)]">
                    <FullCalendar
                      ref={calendarRef as any}
                      plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, rrulePlugin]}
                      initialView="dayGridMonth"
                      height="100%"
                      selectable
                      selectMirror
                      dayMaxEvents
                      eventResizableFromStart
                      events={initialEvents}
                      eventDataTransform={eventDataTransform}
                      select={onSelect}
                      eventClick={onEventClick}
                      eventDrop={onEventDrop}
                      eventResize={onEventResize}
                      datesSet={onDatesSet}
                      headerToolbar={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Event' : 'New Event'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Title</label>
              <Input value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={form.allDay} onChange={(e)=>setForm({...form, allDay: e.target.checked})}/>All day</label>
            </div>
            <div>
              <label className="text-sm">Start</label>
              <Input type="datetime-local" value={new Date(form.start).toISOString().slice(0,16)} onChange={(e)=>setForm({...form, start: new Date(e.target.value).toISOString()})} />
            </div>
            <div>
              <label className="text-sm">End</label>
              <Input type="datetime-local" value={new Date(form.end).toISOString().slice(0,16)} onChange={(e)=>setForm({...form, end: new Date(e.target.value).toISOString()})} />
            </div>
            <div>
              <label className="text-sm">Category</label>
              <select className="mt-2 w-full h-10 rounded-md border border-white/10 bg-background px-3" value={form.category||'Personal'} onChange={(e)=>setForm({...form, category: e.target.value as CalendarCategory})}>
                {(['Personal','Chef','BEO','Kitchen','Scheduler','CRM','Other'] as CalendarCategory[]).map(c=> <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm">Location</label>
              <Input value={form.location||''} onChange={(e)=>setForm({...form, location: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">Notes</label>
              <textarea className="mt-2 w-full min-h-[80px] rounded-md border border-white/10 bg-background px-3 py-2" value={form.notes||''} onChange={(e)=>setForm({...form, notes: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addOrUpdateFromForm}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sourcesOpen} onOpenChange={setSourcesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add calendars</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showUS} onChange={(e)=> setShowUS(e.target.checked)} />US Federal Holidays</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showChristian} onChange={(e)=> setShowChristian(e.target.checked)} />Christian Holidays</label>
          </div>
          <DialogFooter>
            <Button onClick={()=> setSourcesOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
