/**
 * Global Calendar - Maestro Banquets
 * Integrated calendar system with BEO management and Chef notifications
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Calendar, ChevronLeft, ChevronRight, Bell,
  Clock, Users, DollarSign, AlertCircle, CheckCircle, Eye, Edit3,
  Search, FileText, MapPin, Grid3X3, List, Activity, Zap,
  ChefHat, ClipboardList, BarChart3, Settings, Filter, Target,
  RefreshCw, Printer
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { cn } from '../../lib/utils';
import type { BEODocument } from '../../types/beo';
import { BEOEditor } from './BEOEditor';
import { EchoIntegrationPanel } from './EchoIntegrationPanel';
// Chef and Production views are now separate dedicated pages
import { useBEOStore, type CalendarEvent } from '../../stores/beoStore';

// CalendarEvent is now imported from the store

interface GlobalCalendarProps {
  onBEOSelect?: (beoId: string) => void;
  onCreateBEO?: (eventId: string) => void;
  viewMode?: 'calendar' | 'list' | 'timeline' | 'chef' | 'production' | 'analytics';
}

// Event data is now managed by the BEO store

const EventStatusBadge: React.FC<{ status: CalendarEvent['status'] }> = ({ status }) => {
  const statusConfig = {
    lead: { variant: 'outline' as const, label: 'Lead', color: 'text-muted-foreground' },
    proposal: { variant: 'secondary' as const, label: 'Proposal', color: 'text-blue-600' },
    pending: { variant: 'default' as const, label: 'Pending', color: 'text-yellow-600' },
    confirmed: { variant: 'default' as const, label: 'Confirmed', color: 'text-green-600' },
    in_prep: { variant: 'destructive' as const, label: 'In Prep', color: 'text-orange-600' },
    execution: { variant: 'destructive' as const, label: 'Execution', color: 'text-red-600' },
    closed: { variant: 'outline' as const, label: 'Closed', color: 'text-muted-foreground' },
  };
  
  const config = statusConfig[status];
  return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>;
};

const PriorityIndicator: React.FC<{ priority: CalendarEvent['priority'] }> = ({ priority }) => {
  const colors = {
    low: 'text-green-500',
    medium: 'text-yellow-500',
    high: 'text-orange-500',
    urgent: 'text-red-500 animate-pulse',
  };
  
  return <div className={cn('w-3 h-3 rounded-full', colors[priority])} />;
};

const EventDetailsModal: React.FC<{
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEditBEO: (event: CalendarEvent) => void;
  onCreateBEO: (eventId: string) => void;
  onAcknowledgeEvent: (eventId: string) => void;
}> = ({ event, isOpen, onClose, onEditBEO, onCreateBEO, onAcknowledgeEvent }) => {
  console.log('EventDetailsModal render:', { isOpen, hasEvent: !!event });
  if (!isOpen || !event) return null;

  const { beos, loadBEO } = useBEOStore();
  const [step, setStep] = React.useState<number>(15);
  const beo = event.beoId ? beos[event.beoId] : undefined;
  React.useEffect(() => {
    if (event.beoId && !beo) {
      loadBEO(event.beoId).catch(() => {});
    }
  }, [event.beoId, beo, loadBEO]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
      style={{ zIndex: 9999 }}
    >
      <Card
        className="max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl border-2 bg-white dark:bg-slate-900 relative"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 10000 }}
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">{event.title}</h2>
                {event.isFromEchoCrm && (
                  <Badge variant="outline" className="text-blue-600 border-blue-200">
                    <Zap className="h-3 w-3 mr-1" />
                    Echo CRM
                  </Badge>
                )}
                {!event.acknowledged && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Needs Attention
                  </Badge>
                )}
              </div>
              <EventStatusBadge status={event.status} />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close details">
                ✕
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Event Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Date & Time</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(event.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="text-sm text-muted-foreground">{event.time}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Location</div>
                  <div className="text-sm text-muted-foreground">{event.room}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Guest Count</div>
                  <div className="text-sm text-muted-foreground">{event.guestCount} guests</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PriorityIndicator priority={event.priority} />
                <div>
                  <div className="text-sm font-medium">Priority</div>
                  <div className="text-sm text-muted-foreground capitalize">{event.priority}</div>
                </div>
              </div>

              {event.revenue && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Revenue</div>
                    <div className="text-sm text-muted-foreground">
                      ${event.revenue.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Event Type</div>
                  <div className="text-sm text-muted-foreground capitalize">{event.type}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Echo CRM Details */}
          {event.isFromEchoCrm && (
            <div className="border rounded-lg p-4 bg-blue-50/50 dark:bg-blue-950/20">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                Echo CRM Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {event.clientName && (
                  <div>
                    <span className="font-medium">Client:</span>
                    <div className="text-muted-foreground">{event.clientName}</div>
                  </div>
                )}
                {event.salesRepName && (
                  <div>
                    <span className="font-medium">Sales Rep:</span>
                    <div className="text-muted-foreground">{event.salesRepName}</div>
                  </div>
                )}
                {event.contractStatus && (
                  <div>
                    <span className="font-medium">Contract Status:</span>
                    <div className="text-muted-foreground capitalize">{event.contractStatus.replace('_', ' ')}</div>
                  </div>
                )}
                {event.lastSyncedAt && (
                  <div>
                    <span className="font-medium">Last Synced:</span>
                    <div className="text-muted-foreground">
                      {new Date(event.lastSyncedAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            {!event.acknowledged && (
              <Button
                onClick={() => {
                  onAcknowledgeEvent(event.id);
                  onClose();
                }}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Acknowledge Event
              </Button>
            )}

            {event.beoId ? (
              <Button
                onClick={() => {
                  onEditBEO(event);
                  onClose();
                }}
                variant="outline"
                className="flex-1"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit BEO
              </Button>
            ) : (
              <Button
                onClick={() => {
                  onCreateBEO(event.id);
                  onClose();
                }}
                variant="outline"
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                Create BEO
              </Button>
            )}

            {/* Removed external view link to avoid new page load; details stay in context */}
          </div>

          <div className="pt-4 border-t">
            {event.notes && (
              <>
                <h3 className="font-medium mb-2">Notes</h3>
                <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 mb-3">
                  {event.notes}
                </div>
              </>
            )}

            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Event Timeline</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Granularity</span>
                <Select value={String(step)} onValueChange={(v:any) => setStep(parseInt(v, 10))}>
                  <SelectTrigger className="h-7 w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="1">1 min</SelectItem>
                    <SelectItem value="5">5 min</SelectItem>
                    <SelectItem value="10">10 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(() => {
              const toMinutes = (t: string) => {
                const m = t.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m)$/);
                if (!m) return 0;
                let h = parseInt(m[1], 10) % 12;
                const min = parseInt(m[2] || '0', 10);
                if (m[3] === 'pm') h += 12;
                return h * 60 + min;
              };
              const parseRange = (range: string): [number, number] => {
                const [startStr, endStr] = range.split('-').map(s => s.trim());
                const start = toMinutes(startStr.replace(/\./g, ''));
                let end = toMinutes(endStr.replace(/\./g, ''));
                if (end <= start) end += 24 * 60;
                return [start, end];
              };
              const minutesToLabel = (mins: number) => {
                const m = mins % (24 * 60);
                let h = Math.floor(m / 60);
                const min = m % 60;
                const am = h < 12;
                if (h === 0) h = 12; else if (h > 12) h -= 12;
                return `${h}:${String(min).padStart(2, '0')} ${am ? 'AM' : 'PM'}`;
              };
              const generateSlots = (start: number, end: number, step: number) => {
                const out: number[] = [];
                const s = Math.max(1, Math.min(60, step));
                for (let t = start; t <= end; t += s) out.push(t);
                return out;
              };
              const extractTimelineHints = (beo?: BEODocument) => {
                const hints = new Map<number, string[]>();
                if (!beo?.menu?.timeline) return hints;
                const vals = Object.values(beo.menu.timeline).filter(Boolean) as string[];
                const timeRe = /(\d{1,2}:\d{2})\s*([ap]m)/gi;
                for (const v of vals) {
                  const desc = v.replace(/^[^a-zA-Z0-9]*\d{1,2}.*?\s-\s*/, '').trim();
                  let m: RegExpExecArray | null;
                  while ((m = timeRe.exec(v))) {
                    const label = `${m[1]} ${m[2]}`.toLowerCase();
                    const min = toMinutes(label);
                    const arr = hints.get(min) || [];
                    arr.push(desc || v);
                    hints.set(min, arr);
                  }
                }
                return hints;
              };

              const [start, end] = parseRange(event.time);
              const slots = generateSlots(start, end, step);
              const hints = extractTimelineHints(beo);

              return (
                <div className="border rounded-md overflow-hidden">
                  <div className="grid grid-cols-12 bg-muted/50 text-xs font-medium px-3 py-2">
                    <div className="col-span-3">Time</div>
                    <div className="col-span-9">Details</div>
                  </div>
                  <div className="max-h-72 overflow-auto">
                    {slots.map((m, idx) => (
                      <div key={m} className={cn('grid grid-cols-12 px-3 py-2 text-xs', idx % 2 === 0 ? 'bg-background' : 'bg-muted/20')}>
                        <div className="col-span-3 font-mono">{minutesToLabel(m)}</div>
                        <div className="col-span-9">
                          {hints.get(m)?.map((d, i) => (
                            <div key={i} className="text-slate-700 dark:text-slate-200">{d}</div>
                          )) || <span className="text-muted-foreground">No scheduled activity</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
};

const UpcomingEventsSection: React.FC<{
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
  onCreateBEO: (eventId: string) => void;
  onAcknowledgeEvent: (eventId: string) => void;
}> = ({ events, onEventSelect, onCreateBEO, onAcknowledgeEvent }) => {
  // Sort events by date and take the next 3
  const upcomingEvents = events
    .filter(event => new Date(event.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  if (upcomingEvents.length === 0) {
    return null;
  }

  return (
    <Card className="border shadow-sm bg-white dark:bg-slate-900">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">Next 3 Events</span>
          <Badge variant="outline" className="text-xs">{upcomingEvents.length}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {upcomingEvents.map((event) => (
            <div
              key={event.id}
              onClick={() => onEventSelect(event)}
              className={cn(
                "p-2 rounded border border-border cursor-pointer transition-all duration-200 text-xs",
                "hover:bg-accent hover:border-primary/50",
                !event.acknowledged && "ring-1 ring-red-200 dark:ring-red-900"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <PriorityIndicator priority={event.priority} />
                  <span className="font-medium text-xs truncate">{event.title}</span>
                </div>
                {!event.acknowledged && (
                  <AlertCircle className="h-3 w-3 text-red-500 animate-pulse flex-shrink-0" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(event.date).toLocaleDateString()} • {event.time}</span>
                  <EventStatusBadge status={event.status} />
                </div>
                {event.isFromEchoCrm && (
                  <div className="flex items-center gap-1 text-xs">
                    <Zap className="h-3 w-3 text-blue-500" />
                    <span className="text-blue-600">Echo CRM</span>
                    {event.salesRepName && (
                      <span className="text-muted-foreground">• {event.salesRepName}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const CalendarGrid: React.FC<{
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  colorFilter: 'all' | 'status' | 'priority';
}> = ({ events, currentDate, onEventClick, colorFilter }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => null);
  const totalCells = firstDay + daysInMonth;
  const trailing = (7 - (totalCells % 7)) % 7;
  const trailingDays = Array.from({ length: trailing }, () => null);

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => event.date === dateStr);
  };

  const coversForDay = (dayEvents: CalendarEvent[]) => dayEvents.reduce((sum, e) => sum + (e.guestCount || 0), 0);
  const busynessForCovers = (covers: number) => {
    if (covers === 0) return 'none';
    if (covers < 50) return 'light';
    if (covers < 150) return 'busy';
    return 'very';
  };
  const busynessColorClass: Record<string, string> = {
    none: 'bg-white dark:bg-slate-900',
    light: 'bg-green-50 dark:bg-green-950/20',
    busy: 'bg-amber-50 dark:bg-amber-950/20',
    very: 'bg-red-50 dark:bg-red-950/20',
  };

  const getEventColor = (event: CalendarEvent) => {
    if (colorFilter === 'priority') {
      switch (event.priority) {
        case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-300';
        case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 border-orange-300';
        case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border-yellow-300';
        case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-300';
      }
    } else {
      switch (event.status) {
        case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-300';
        case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border-yellow-300';
        case 'in_prep': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 border-orange-300';
        case 'execution': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-300';
        case 'lead': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200 border-gray-300';
        case 'proposal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-300';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200 border-gray-300';
      }
    }
  };

  return (
    <div className="bg-white dark:bg-background h-full flex flex-col border rounded-lg overflow-hidden">
      {/* Day Headers - Clean Style */}
      <div className="grid grid-cols-7 border-b bg-slate-100 dark:bg-slate-800">
        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
          <div key={day} className="p-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 last:border-r-0">
            {day.substring(0, 3)}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 flex-1 min-h-0">
        {/* Empty days for month start */}
        {emptyDays.map((_, index) => (
          <div key={`empty-${index}`} className="border-r border-b border-slate-200 dark:border-slate-700 last:border-r-0 bg-slate-50 dark:bg-slate-900"></div>
        ))}

        {/* Calendar days */}
        {days.map(day => {
          const dayEvents = getEventsForDate(day);
          const dayCovers = coversForDay(dayEvents);
          const busy = busynessForCovers(dayCovers);
          const isToday =
            day === new Date().getDate() &&
            currentDate.getMonth() === new Date().getMonth() &&
            currentDate.getFullYear() === new Date().getFullYear();

          const isSelected =
            day === selectedDate.getDate() &&
            currentDate.getMonth() === selectedDate.getMonth() &&
            currentDate.getFullYear() === selectedDate.getFullYear();

          return (
            <div
              key={day}
              className={cn(
                "border-r border-b border-slate-200 dark:border-slate-700 last:border-r-0 p-3 cursor-pointer transition-all duration-200 relative min-h-[120px] flex flex-col",
                busynessColorClass[busy],
                "hover:shadow-sm",
                isSelected && "ring-2 ring-blue-300 dark:ring-blue-600 shadow-md",
                isToday && "border-blue-300 dark:border-blue-600"
              )}
              onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
            >
              {/* Day Number and busyness dot */}
              <div className="flex items-center justify-between mb-2">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 text-sm font-semibold rounded-full flex-shrink-0 transition-all",
                  isToday ? "bg-blue-600 text-white shadow-md" : "bg-white/60 dark:bg-slate-900/60"
                )}>
                  {day}
                </div>
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    busy === 'none' && 'bg-slate-300',
                    busy === 'light' && 'bg-green-500',
                    busy === 'busy' && 'bg-amber-500',
                    busy === 'very' && 'bg-red-500'
                  )}
                  title={`${dayCovers} covers`}
                />
              </div>

              {/* Events - CRM Style */}
              <div className="space-y-1 flex-1 min-h-0 overflow-hidden">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Event clicked:', event.title, event.id);
                      onEventClick(event);
                    }}
                    className={cn(
                      "text-xs px-2 py-1 rounded border cursor-pointer transition-all duration-200 truncate relative",
                      "hover:shadow-sm hover:scale-[1.01] hover:z-10",
                      getEventColor(event),
                      !event.acknowledged && "ring-1 ring-red-500 bg-red-50 dark:bg-red-900/20"
                    )}
                    title={`${event.title} - ${event.time} - ${event.room}${event.isFromEchoCrm ? ' (Echo CRM)' : ''}`}
                  >
                    <div className="flex items-center gap-1">
                      {!event.acknowledged && (
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                      )}
                      {event.isFromEchoCrm && (
                        <Zap className="w-3 h-3 text-blue-600 flex-shrink-0" />
                      )}
                      <span className="truncate font-medium">{event.beoId ? `#${event.beoId.replace(/.*-(\d+)/, '$1')} ` : ''}{event.title}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {event.time.split(' ')[0]} • {event.guestCount}p
                    </div>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-center font-medium border border-dashed border-slate-300 dark:border-slate-600">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>

              {/* Event count chip */}
              {dayEvents.length > 3 && (
                <div className="absolute top-2 right-2 w-5 h-4 bg-slate-600 text-white text-xs flex items-center justify-center rounded font-bold">
                  {dayEvents.length}
                </div>
              )}
            </div>
          );
        })}

        {/* Trailing empty days to complete grid */}
        {trailingDays.map((_, index) => (
          <div key={`trailing-${index}`} className="border-r border-b border-slate-200 dark:border-slate-700 last:border-r-0 bg-slate-50 dark:bg-slate-900"></div>
        ))}
      </div>
    </div>
  );
};

// Week view component
const WeekView: React.FC<{
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
}> = ({ events, currentDate, onEventClick }) => {
  const start = new Date(currentDate);
  start.setDate(currentDate.getDate() - start.getDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const eventsForDate = (d: Date) => {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return events
      .filter(e => e.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  };
  return (
    <div className="grid grid-cols-7 h-full">
      {days.map((d, idx) => (
        <div key={idx} className="border-r last:border-r-0 border-slate-200 dark:border-slate-700 p-2">
          <div className="text-xs font-semibold mb-2 text-slate-600 dark:text-slate-300">
            {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          <div className="space-y-2">
            {eventsForDate(d).length === 0 && (
              <div className="text-xs text-muted-foreground">No events</div>
            )}
            {eventsForDate(d).map(ev => (
              <div key={ev.id} className="rounded border px-2 py-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer" onClick={() => onEventClick(ev)}>
                <div className="font-medium truncate">{ev.title}</div>
                <div className="text-[11px] text-muted-foreground truncate">{ev.time} • {ev.room} • {ev.guestCount}p</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Today view: lists today's BEOs and inline expandable breakdown at 15-minute intervals
const TodayView: React.FC<{ events: CalendarEvent[]; date: Date; onEditBEO: (event: CalendarEvent) => void; }> = ({ events, date, onEditBEO }) => {
  const { beos, loadBEO } = useBEOStore();
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [granularityById, setGranularityById] = React.useState<Record<string, number>>({});

  const todayStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const toMinutes = (t: string) => {
    const m = t.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m)$/);
    if (!m) return 0;
    let h = parseInt(m[1], 10) % 12;
    const min = parseInt(m[2] || '0', 10);
    if (m[3] === 'pm') h += 12;
    return h * 60 + min;
  };

  const parseRange = (range: string): [number, number] => {
    const [startStr, endStr] = range.split('-').map(s => s.trim());
    const start = toMinutes(startStr.replace(/\./g, ''));
    let end = toMinutes(endStr.replace(/\./g, ''));
    if (end <= start) end += 24 * 60; // cross midnight support
    return [start, end];
  };

  const minutesToLabel = (mins: number) => {
    const m = mins % (24 * 60);
    let h = Math.floor(m / 60);
    const min = m % 60;
    const am = h < 12;
    if (h === 0) h = 12; else if (h > 12) h -= 12;
    return `${h}:${String(min).padStart(2, '0')} ${am ? 'AM' : 'PM'}`;
  };

  const generateSlots = (start: number, end: number, step: number) => {
    const out: number[] = [];
    const s = Math.max(1, Math.min(60, step));
    for (let t = start; t <= end; t += s) out.push(t);
    return out;
  };

  const extractTimelineHints = (beo?: BEODocument) => {
    const hints = new Map<number, string[]>();
    if (!beo?.menu?.timeline) return hints;
    const vals = Object.values(beo.menu.timeline).filter(Boolean) as string[];
    const timeRe = /(\d{1,2}:\d{2})\s*([ap]m)/gi;
    for (const v of vals) {
      const desc = v.replace(/^[^a-zA-Z0-9]*\d{1,2}.*?\s-\s*/, '').trim();
      let m: RegExpExecArray | null;
      while ((m = timeRe.exec(v))) {
        const label = `${m[1]} ${m[2]}`.toLowerCase();
        const min = toMinutes(label);
        const arr = hints.get(min) || [];
        arr.push(desc || v);
        hints.set(min, arr);
      }
    }
    return hints;
  };

  const todays = events
    .filter(e => e.date === todayStr)
    .sort((a, b) => toMinutes(a.time.split('-')[0].trim().toLowerCase()) - toMinutes(b.time.split('-')[0].trim().toLowerCase()));

  if (todays.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">No events today</div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {todays.map((e) => {
        const [start, end] = parseRange(e.time);
        const isOpen = expandedId === e.id;
        const number = e.beoId ? `#${e.beoId.replace(/.*-(\d+)/, '$1')}` : '—';
        const beo = e.beoId ? (beos as any)[e.beoId] as BEODocument | undefined : undefined;
        const toggle = async () => {
          setExpandedId(isOpen ? null : e.id);
          if (!isOpen && e.beoId && !beo) {
            try { await loadBEO(e.beoId); } catch {}
          }
        };
        return (
          <div key={e.id} className={cn('rounded-lg border', !e.acknowledged && 'ring-2 ring-red-200 dark:ring-red-900')}>
            <div className="grid grid-cols-5 gap-2 items-center p-3 cursor-pointer hover:bg-accent" onClick={toggle}>
              <div className="font-mono text-sm">{number}</div>
              <div className="text-sm">{e.guestCount} guests</div>
              <div className="font-medium truncate">{e.clientName || e.title}</div>
              <div className="text-sm text-muted-foreground">{e.time}</div>
              <div className="text-right">
                <Badge variant="outline" className="text-xs">{e.room}</Badge>
              </div>
            </div>
            {isOpen && (
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between py-2">
                  <div className="text-sm text-muted-foreground">{new Date(e.date).toLocaleDateString()} • {e.room}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      Granularity
                      <Select value={String(granularityById[e.id] || 15)} onValueChange={(v:any)=> setGranularityById(prev=>({...prev, [e.id]: parseInt(v,10)}))}>
                        <SelectTrigger className="h-7 w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                          <SelectItem value="1">1 min</SelectItem>
                          <SelectItem value="5">5 min</SelectItem>
                          <SelectItem value="10">10 min</SelectItem>
                          <SelectItem value="15">15 min</SelectItem>
                          <SelectItem value="30">30 min</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {e.beoId && (
                      <Button size="sm" variant="outline" onClick={() => onEditBEO(e)}>
                        <Edit3 className="h-3 w-3 mr-2" />
                        Open BEO
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => window.print()}>
                      <Printer className="h-3 w-3 mr-2" />
                      Print breakdown
                    </Button>
                  </div>
                </div>
                <div className="border rounded-md overflow-hidden">
                  <div className="grid grid-cols-12 bg-muted/50 text-xs font-medium px-3 py-2">
                    <div className="col-span-3">Time</div>
                    <div className="col-span-9">Details</div>
                  </div>
                  {(() => {
                    const step = granularityById[e.id] || 15;
                    const slots = generateSlots(start, end, step);
                    const hints = extractTimelineHints(beo);
                    return (
                      <div className="max-h-72 overflow-auto">
                        {slots.map((m, idx) => (
                          <div key={m} className={cn('grid grid-cols-12 px-3 py-2 text-xs', idx % 2 === 0 ? 'bg-background' : 'bg-muted/20')}>
                            <div className="col-span-3 font-mono">{minutesToLabel(m)}</div>
                            <div className="col-span-9">
                              {hints.get(m)?.map((d, i) => (
                                <div key={i} className="text-slate-700 dark:text-slate-200">{d}</div>
                              )) || <span className="text-muted-foreground">No scheduled activity</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const GlobalCalendar: React.FC<GlobalCalendarProps> = ({
  onBEOSelect,
  onCreateBEO,
  viewMode = 'calendar'
}) => {
  const {
    events,
    isLoading,
    loadEvents,
    acknowledgeEvent,
    createBEO,
    isIntegrationEnabled,
    syncStatus,
    pendingConflicts
  } = useBEOStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showBEOEditor, setShowBEOEditor] = useState(false);

  const routerLocation = useLocation();
  useEffect(()=>{
    const params = new URLSearchParams(routerLocation.search || '');
    const evId = params.get('event');
    if(evId && events.length){
      const ev = events.find(e=> e.id===evId);
      if(ev){ setSelectedEvent(ev); setShowEventDetails(true); }
    }
  }, [events, routerLocation.search]);
  const [showEventDetails, setShowEventDetails] = useState(false);
  // Removed mainView state - calendar is now focused only on calendar functionality
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'today'>('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [colorFilter, setColorFilter] = useState<'all' | 'status' | 'priority'>('status');
  const [showEchoIntegration, setShowEchoIntegration] = useState(false);
  // Removed venue and chef selection - handled in dedicated views

  useEffect(() => {
    // Load events from store on component mount
    loadEvents();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEventSelect = (event: CalendarEvent) => {
    console.log('Event selected:', event);
    setSelectedEvent(event);
    setShowEventDetails(true);
    console.log('Show event details set to true');
    // Don't navigate away from calendar - show details in modal/sidebar instead
  };

  const handleEditBEO = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowBEOEditor(true);
    if (event.beoId) {
      onBEOSelect?.(event.beoId);
    }
  };

  const handleCreateBEO = async (eventId: string) => {
    try {
      await createBEO(eventId);
      setShowBEOEditor(true);
      onCreateBEO?.(eventId);
    } catch (error) {
      console.error('Failed to create BEO:', error);
    }
  };

  const handleAcknowledgeEvent = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event && !event.acknowledged) {
      await acknowledgeEvent(eventId, 'Chef Johnson');
    }
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const n = new Date(prev);
      n.setDate(n.getDate() + (direction === 'prev' ? -1 : 1));
      return n;
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const unacknowledgedEvents = events.filter(e => !e.acknowledged);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    );
  }

  // BEO Editor modal overlay
  if (showBEOEditor) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto p-4 h-full overflow-auto">
          <BEOEditor
            eventId={selectedEvent?.id}
            beoId={selectedEvent?.beoId}
            mode={selectedEvent?.beoId ? "edit" : "create"}
            onClose={() => {
              setShowBEOEditor(false);
              setSelectedEvent(null);
            }}
            onSave={() => {
              setShowBEOEditor(false);
              setSelectedEvent(null);
              loadEvents(); // Refresh events
            }}
          />
        </div>
      </div>
    );
  }

  // Filter events based on search (including Echo CRM metadata)
  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.room.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (event.clientName && event.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (event.salesRepName && event.salesRepName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (event.echoCrmEventId && event.echoCrmEventId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  console.log('Total events:', events.length, 'Filtered events:', filteredEvents.length);
  console.log('Selected event:', selectedEvent);
  console.log('Show event details:', showEventDetails);

  const isSameMonth = (d: string, ref: Date) => {
    const dt = new Date(d);
    return dt.getMonth() === ref.getMonth() && dt.getFullYear() === ref.getFullYear();
  };
  const monthEvents = events.filter(e => isSameMonth(e.date, currentDate));
  const monthCovers = monthEvents.reduce((sum, e) => sum + (e.guestCount || 0), 0);
  const dayLabel = currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-3">
      {/* Compact Top Section */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Compact Chef Alert */}
        {unacknowledgedEvents.length > 0 && (
          <div className="flex-1">
            <Alert className="border-black/20 bg-red-50 dark:border-red-900 dark:bg-red-950 py-2 cursor-pointer" onClick={() => { const first = unacknowledgedEvents[0]; if (first) handleEventSelect(first); }}>
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200 text-sm">
                <strong>Chef Alert:</strong> {unacknowledgedEvents.length} BEO(s) need acknowledgment
                <div className="flex gap-1 mt-1">
                  {unacknowledgedEvents.slice(0, 2).map(event => (
                    <Button
                      key={event.id}
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); handleAcknowledgeEvent(event.id); }}
                      className="text-xs h-6 px-2"
                    >
                      ACK {event.title.split(' ')[0]}
                    </Button>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Search Section & Echo Integration */}
        <div className="lg:w-80 space-y-2">
          <Card className="border shadow-sm bg-white dark:bg-slate-900">
            <CardContent className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search BEO/REO/Echo CRM..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-8"
                />
              </div>
            </CardContent>
          </Card>

          {/* Echo Integration Status */}
          {isIntegrationEnabled && (
            <Card className="border shadow-sm bg-white dark:bg-slate-900">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Echo CRM</span>
                    <div className={`w-2 h-2 rounded-full ${
                      syncStatus?.isConnected ? 'bg-green-500' : 'bg-red-500'
                    } animate-pulse`} />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowEchoIntegration(true)}
                    className="h-6 px-2"
                  >
                    {pendingConflicts.length > 0 && (
                      <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    Manage
                  </Button>
                </div>
                {syncStatus?.lastSyncAt && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Last sync: {new Date(syncStatus.lastSyncAt).toLocaleTimeString()}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Compact Upcoming Events */}
      <UpcomingEventsSection
        events={filteredEvents}
        onEventSelect={handleEventSelect}
        onCreateBEO={handleCreateBEO}
        onAcknowledgeEvent={handleAcknowledgeEvent}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-h-0">
        {/* Calendar View - Simplified */}
        <Card className="h-full flex flex-col border shadow-md bg-white dark:bg-slate-900">
            <CardHeader className="pb-4 bg-slate-50 dark:bg-slate-800 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('prev')}
                      className="hover:bg-primary/10 transition-all"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                      {currentDate.toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </h2>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('next')}
                      className="hover:bg-primary/10 transition-all"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Today
                  </Button>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Calendar Controls */}
                  <div className="flex items-center gap-2 mr-2">
                    <Button variant="outline" size="sm" onClick={() => loadEvents()}>
                      <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Filter className="h-4 w-4 mr-2" /> Filter
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-56">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Color Mode</div>
                          <Select value={colorFilter} onValueChange={(v: any) => setColorFilter(v)}>
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="status">By Status</SelectItem>
                              <SelectItem value="priority">By Priority</SelectItem>
                              <SelectItem value="all">All Events</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Month/Year pickers */}
                  <div className="flex items-center gap-2">
                    <Select value={String(currentDate.getMonth())} onValueChange={(v:any)=>{
                      setCurrentDate(d=>{ const n = new Date(d); n.setMonth(parseInt(v,10)); return n; });
                    }}>
                      <SelectTrigger className="w-28">
                        <SelectValue>{currentDate.toLocaleString('en-US',{month:'long'})}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({length:12},(_,i)=> (
                          <SelectItem key={i} value={String(i)}>{new Date(2000,i,1).toLocaleString('en-US',{month:'long'})}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={String(currentDate.getFullYear())} onValueChange={(v:any)=>{
                      setCurrentDate(d=>{ const n = new Date(d); n.setFullYear(parseInt(v,10)); return n; });
                    }}>
                      <SelectTrigger className="w-24">
                        <SelectValue>{currentDate.getFullYear()}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({length:11},(_,i)=> currentDate.getFullYear()-5+i).map(y=> (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Calendar Sub-Views */}
                  <div className="flex border rounded-lg shadow-sm bg-background">
                    <Button
                      variant={calendarView === 'month' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCalendarView('month')}
                      className="rounded-r-none border-r"
                    >
                      <Grid3X3 className="h-4 w-4 mr-1" />
                      Month
                    </Button>
                    <Button
                      variant={calendarView === 'week' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCalendarView('week')}
                      className="rounded-none border-r"
                    >
                      <Activity className="h-4 w-4 mr-1" />
                      Week
                    </Button>
                    <Button
                      variant={calendarView === 'today' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCalendarView('today')}
                      className="rounded-l-none"
                    >
                      <List className="h-4 w-4 mr-1" />
                      Today
                    </Button>
                  </div>

                  {/* Color Filter */}
                  <Select value={colorFilter} onValueChange={(value: any) => setColorFilter(value)}>
                    <SelectTrigger className="w-36 shadow-sm">
                      <SelectValue placeholder="Color by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="status">By Status</SelectItem>
                      <SelectItem value="priority">By Priority</SelectItem>
                      <SelectItem value="all">All Events</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Event Statistics */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs font-medium">
                        <Calendar className="h-3 w-3 mr-1" />
                        {monthEvents.length} events
                      </Badge>
                      <Badge variant="outline" className="text-xs font-medium">
                        <Users className="h-3 w-3 mr-1" />
                        {monthCovers} covers
                      </Badge>
                      <div className="hidden md:flex items-center gap-1 ml-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" title="No events" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500" title="Light" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" title="Busy" />
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" title="Very busy" />
                      </div>
                      {unacknowledgedEvents.length > 0 && (
                        <Badge variant="destructive" className="text-xs font-medium animate-pulse">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {unacknowledgedEvents.length} urgent
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
              {calendarView === 'month' && (
                <CalendarGrid
                  events={filteredEvents}
                  currentDate={currentDate}
                  onEventClick={handleEventSelect}
                  colorFilter={colorFilter}
                />
              )}
              {calendarView === 'today' && (
                <div className="flex flex-col h-full">
                  <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigateDay('prev')}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="text-lg font-semibold">{dayLabel}</div>
                      <Button variant="outline" size="sm" onClick={() => navigateDay('next')}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button variant="default" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
                  </div>
                  <TodayView events={filteredEvents} date={currentDate} onEditBEO={handleEditBEO} />
                </div>
              )}
              {calendarView === 'week' && (
                <div className="p-0 h-full">
                  <WeekView
                    events={filteredEvents}
                    currentDate={currentDate}
                    onEventClick={handleEventSelect}
                  />
                </div>
              )}
            </CardContent>
          </Card>
      </div>

      {/* Event Details Modal */}
      <EventDetailsModal
        event={selectedEvent}
        isOpen={showEventDetails}
        onClose={() => {
          console.log('Closing event details modal');
          setShowEventDetails(false);
          setSelectedEvent(null);
        }}
        onEditBEO={handleEditBEO}
        onCreateBEO={handleCreateBEO}
        onAcknowledgeEvent={handleAcknowledgeEvent}
      />

      {/* Echo CRM Events Integration Panel */}
      <EchoIntegrationPanel
        isVisible={showEchoIntegration}
        onClose={() => setShowEchoIntegration(false)}
      />
    </div>
  );
};

export default GlobalCalendar;
