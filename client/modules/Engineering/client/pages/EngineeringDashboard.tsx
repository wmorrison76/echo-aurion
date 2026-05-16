import React, { useState, useEffect, useMemo } from "react";
import { useMultiOutlet } from "@/context/MultiOutletContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Thermometer,
  Calendar,
  Clock,
  Settings,
  Zap,
  Building2,
  Snowflake,
  Sun,
  Activity,
  Plus,
  Edit,
  AlertTriangle,
  MapPin,
  Users,
  TrendingUp,
  Filter,
  Search,
  Grid3x3,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  format,
  formatDistanceToNow,
  parseISO,
  isToday,
  isPast,
  addDays,
  startOfDay,
  endOfDay,
} from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { maestroEventBus, EVENT_TYPES } from "@/modules/MaestroBQT/event-bus";
interface EngineeringPanelProps {
  onClose?: () => void;
  onMinimize?: () => void;
}
interface Outlet {
  id: string;
  name: string;
  location?: string;
  timezone?: string;
}
interface Room {
  id: string;
  outlet_id: string;
  name: string;
  capacity?: number;
  room_type?: string;
  features?: string[];
  active?: boolean;
}
interface CalendarEvent {
  id: string;
  outlet_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  date: string;
  location_room?: string;
  guest_count?: number;
  status: string;
  event_type?: string;
}
interface HVACSchedule {
  id: string;
  eventId: string;
  eventName: string;
  eventType: string;
  roomId: string;
  roomName: string;
  outletId: string;
  outletName: string;
  startTime: string;
  endTime: string;
  targetTemp: number;
  mode: "cooling" | "heating" | "auto";
  preStartMinutes: number;
  postEndMinutes: number;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  energyUsage?: number;
  actualTemp?: number;
  createdAt: string;
  updatedAt: string;
}
interface MaintenanceBlock {
  id: string;
  roomId: string;
  roomName: string;
  outletId: string;
  outletName: string;
  startTime: string;
  endTime: string;
  reason: string;
  type: "maintenance" | "repair" | "inspection" | "cleaning";
  status: "scheduled" | "in-progress" | "completed";
}
interface TemperaturePreset {
  id: string;
  name: string;
  eventType: string;
  targetTemp: number;
  mode: "cooling" | "heating" | "auto";
  preStartMinutes: number;
  postEndMinutes: number;
  description?: string;
}
const TEMPERATURE_PRESETS: TemperaturePreset[] = [
  {
    id: "wedding",
    name: "Wedding Reception",
    eventType: "wedding",
    targetTemp: 72,
    mode: "auto",
    preStartMinutes: 120,
    postEndMinutes: 60,
    description: "Comfortable temperature for formal events",
  },
  {
    id: "corporate",
    name: "Corporate Meeting",
    eventType: "corporate",
    targetTemp: 70,
    mode: "cooling",
    preStartMinutes: 90,
    postEndMinutes: 30,
    description: "Slightly cooler for professional settings",
  },
  {
    id: "banquet",
    name: "Banquet Dinner",
    eventType: "banquet",
    targetTemp: 71,
    mode: "auto",
    preStartMinutes: 120,
    postEndMinutes: 60,
    description: "Balanced temperature for dining",
  },
  {
    id: "conference",
    name: "Conference/Workshop",
    eventType: "conference",
    targetTemp: 69,
    mode: "cooling",
    preStartMinutes: 90,
    postEndMinutes: 30,
    description: "Cooler temperature for extended sessions",
  },
  {
    id: "cocktail",
    name: "Cocktail Reception",
    eventType: "cocktail",
    targetTemp: 73,
    mode: "auto",
    preStartMinutes: 60,
    postEndMinutes: 30,
    description: "Slightly warmer for social gatherings",
  },
];
export default function EngineeringDashboard({
  onClose,
  onMinimize,
}: EngineeringPanelProps) {
  const { currentOutlet, outlets } = useMultiOutlet();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<
    "overview" | "schedule" | "rooms" | "maintenance" | "analytics"
  >("overview");
  const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [schedules, setSchedules] = useState<HVACSchedule[]>([]);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState<
    MaintenanceBlock[]
  >([]);
  const [selectedOutlets, setSelectedOutlets] = useState<Set<string>>(
    new Set(),
  );
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [filterDate, setFilterDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [dateRange, setDateRange] = useState<number>(7); // days const [viewMode, setViewMode] = useState<"grid" |"list">("grid"); const [searchQuery, setSearchQuery] = useState<string>(""); const [isLoading, setIsLoading] = useState(false); // Load all outlets useEffect(() => { loadAllOutlets(); }, []); // Load all rooms for selected outlets useEffect(() => { if (selectedOutlets.size > 0) { loadAllRooms(Array.from(selectedOutlets)); } }, [selectedOutlets]); // Load all events and generate schedules useEffect(() => { if (selectedOutlets.size > 0) { loadAllEvents(); } }, [selectedOutlets, filterDate, dateRange]); const loadAllOutlets = async () => { try { setIsLoading(true); // Fetch all outlets from API const response = await fetch("/api/outlets", { method:"GET", headers: {"Content-Type":"application/json" }, }); if (response.ok) { const data = await response.json(); const fetchedOutlets = data.outlets || []; setAllOutlets(fetchedOutlets); // Auto-select all outlets by default setSelectedOutlets(new Set(fetchedOutlets.map((o: Outlet) => o.id))); } else { // Fallback to outlets from context const fallbackOutlets = outlets.length > 0 ? outlets : [ { id:"main", name:"Main Location" }, { id:"secondary", name:"Secondary Location" }, ]; setAllOutlets(fallbackOutlets); setSelectedOutlets(new Set(fallbackOutlets.map((o: any) => o.id))); } } catch (error) { console.error("Error loading outlets:", error); // Use fallback const fallbackOutlets = outlets.length > 0 ? outlets : [ { id:"main", name:"Main Location" }, ]; setAllOutlets(fallbackOutlets); setSelectedOutlets(new Set(fallbackOutlets.map((o: any) => o.id))); } finally { setIsLoading(false); } }; const loadAllRooms = async (outletIds: string[]) => { try { setIsLoading(true); const allRoomsData: Room[] = []; // Fetch rooms for each outlet for (const outletId of outletIds) { try { const response = await fetch(`/api/rooms?outlet_id=${outletId}`, { method:"GET", headers: {"Content-Type":"application/json" }, }); if (response.ok) { const data = await response.json(); if (data.rooms && Array.isArray(data.rooms)) { allRoomsData.push(...data.rooms); } } } catch (error) { console.error(`Error loading rooms for outlet ${outletId}:`, error); } } // If no rooms from API, generate mock rooms if (allRoomsData.length === 0) { const mockRooms: Room[] = generateMockRooms(outletIds); setAllRooms(mockRooms); } else { setAllRooms(allRoomsData); } } catch (error) { console.error("Error loading rooms:", error); const mockRooms = generateMockRooms(outletIds); setAllRooms(mockRooms); } finally { setIsLoading(false); } }; const generateMockRooms = (outletIds: string[]): Room[] => { const roomTypes = [ { name:"Grand Ballroom", capacity: 500, type:"banquet" }, { name:"Conference Center", capacity: 200, type:"conference" }, { name:"Private Dining Room", capacity: 50, type:"dining" }, { name:"Board Room", capacity: 20, type:"meeting" }, { name:"Crystal Ballroom", capacity: 400, type:"banquet" }, { name:"River View Room", capacity: 150, type:"banquet" }, { name:"Garden Pavilion", capacity: 300, type:"outdoor" }, { name:"Executive Suite", capacity: 100, type:"corporate" }, ]; const rooms: Room[] = []; outletIds.forEach((outletId) => { const outletName = allOutlets.find(o => o.id === outletId)?.name ||"Outlet"; roomTypes.forEach((roomType, index) => { rooms.push({ id: `room-${outletId}-${index}`, outlet_id: outletId, name: `${outletName} - ${roomType.name}`, capacity: roomType.capacity, room_type: roomType.type, active: true, }); }); }); return rooms; }; const loadAllEvents = async () => { try { setIsLoading(true); const startDate = format(parseISO(filterDate),"yyyy-MM-dd"); const endDate = format(addDays(parseISO(filterDate), dateRange),"yyyy-MM-dd"); // Fetch all events from calendar API const outletIds = Array.from(selectedOutlets).join(","); const response = await fetch( `/api/calendar/events?outlet_ids=${outletIds}&start_date=${startDate}&end_date=${endDate}&status=confirmed,pending`, { method:"GET", headers: {"Content-Type":"application/json" }, } ); if (response.ok) { const data = await response.json(); const events = data.data?.items || []; setAllEvents(events); // Generate HVAC schedules from events generateSchedulesFromEvents(events); } else { // Generate mock events const mockEvents = generateMockEvents(); setAllEvents(mockEvents); generateSchedulesFromEvents(mockEvents); } } catch (error) { console.error("Error loading events:", error); const mockEvents = generateMockEvents(); setAllEvents(mockEvents); generateSchedulesFromEvents(mockEvents); } finally { setIsLoading(false); } }; const generateMockEvents = (): CalendarEvent[] => { const events: CalendarEvent[] = []; const eventTypes = ["wedding","corporate","banquet","conference","cocktail"]; const startDate = parseISO(filterDate); allOutlets.forEach((outlet) => { const outletRooms = allRooms.filter(r => r.outlet_id === outlet.id); outletRooms.forEach((room, roomIndex) => { // Generate 1-2 events per room in the date range const eventCount = roomIndex % 2 === 0 ? 2 : 1; for (let i = 0; i < eventCount && i < dateRange; i++) { const eventDate = addDays(startDate, i); const eventType = eventTypes[(roomIndex + i) % eventTypes.length]; events.push({ id: `event-${outlet.id}-${room.id}-${i}`, outlet_id: outlet.id, title: `${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Event`, description: `Event in ${room.name}`, start_time: format(new Date(eventDate.setHours(14 + i, 0, 0, 0)),"yyyy-MM-dd'T'HH:mm:ss"), end_time: format(new Date(eventDate.setHours(18 + i, 0, 0, 0)),"yyyy-MM-dd'T'HH:mm:ss"), date: format(eventDate,"yyyy-MM-dd"), location_room: room.name, guest_count: (room.capacity || 100) * 0.8, status:"confirmed", event_type: eventType, }); } }); }); return events; }; const generateSchedulesFromEvents = (events: CalendarEvent[]) => { const schedules: HVACSchedule[] = events.map((event) => { const outlet = allOutlets.find(o => o.id === event.outlet_id); const room = allRooms.find(r => r.id === event.location_room || r.name === event.location_room); const preset = TEMPERATURE_PRESETS.find( p => p.eventType === event.event_type ) || TEMPERATURE_PRESETS[0]; const startTime = parseISO(event.start_time); const endTime = parseISO(event.end_time); const now = new Date(); return { id: `schedule-${event.id}`, eventId: event.id, eventName: event.title, eventType: event.event_type ||"banquet", roomId: room?.id ||"unknown", roomName: room?.name || event.location_room ||"Unknown Room", outletId: outlet?.id || event.outlet_id, outletName: outlet?.name ||"Unknown Outlet", startTime: event.start_time, endTime: event.end_time, targetTemp: preset.targetTemp, mode: preset.mode, preStartMinutes: preset.preStartMinutes, postEndMinutes: preset.postEndMinutes, status: startTime > now ?"scheduled" : endTime < now ?"completed" :"in-progress", energyUsage: Math.random() * 50 + 20, actualTemp: startTime <= now && endTime >= now ? preset.targetTemp + (Math.random() * 2 - 1) : undefined, createdAt: format(new Date(),"yyyy-MM-dd'T'HH:mm:ss"), updatedAt: format(new Date(),"yyyy-MM-dd'T'HH:mm:ss"), }; }); setSchedules(schedules); }; const filteredRooms = useMemo(() => { let filtered = allRooms.filter(r => selectedOutlets.size === 0 || selectedOutlets.has(r.outlet_id) ); if (searchQuery) { filtered = filtered.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) ); } return filtered; }, [allRooms, selectedOutlets, searchQuery]); const filteredEvents = useMemo(() => { let filtered = allEvents.filter(e => selectedOutlets.size === 0 || selectedOutlets.has(e.outlet_id) ); if (selectedRooms.size > 0) { filtered = filtered.filter(e => { const room = allRooms.find(r => r.id === e.location_room || r.name === e.location_room); return room && selectedRooms.has(room.id); }); } if (searchQuery) { filtered = filtered.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.location_room?.toLowerCase().includes(searchQuery.toLowerCase()) ); } return filtered; }, [allEvents, selectedOutlets, selectedRooms, searchQuery, allRooms]); const roomsWithEvents = useMemo(() => { return filteredRooms.map(room => { const roomEvents = filteredEvents.filter(e => e.location_room === room.name || e.location_room === room.id ); const todayEvents = roomEvents.filter(e => isToday(parseISO(e.date))); const upcomingEvents = roomEvents.filter(e => parseISO(e.date) > new Date()); return { ...room, eventCount: roomEvents.length, todayEventCount: todayEvents.length, upcomingEventCount: upcomingEvents.length, nextEvent: upcomingEvents.sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime() )[0], }; }); }, [filteredRooms, filteredEvents]); const upcomingSchedules = useMemo(() => { const now = new Date(); return schedules .filter(s => parseISO(s.startTime) >= now && s.status ==="scheduled") .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime()) .slice(0, 10); }, [schedules]); const activeSchedules = useMemo(() => { return schedules.filter(s => s.status ==="in-progress"); }, [schedules]); const todaysSchedules = useMemo(() => { return schedules.filter(s => isToday(parseISO(s.startTime))); }, [schedules]); const totalEnergyUsage = useMemo(() => { return todaysSchedules.reduce((sum, s) => sum + (s.energyUsage || 0), 0); }, [todaysSchedules]); const toggleOutlet = (outletId: string) => { setSelectedOutlets(prev => { const newSet = new Set(prev); if (newSet.has(outletId)) { newSet.delete(outletId); } else { newSet.add(outletId); } return newSet; }); }; const toggleRoom = (roomId: string) => { setSelectedRooms(prev => { const newSet = new Set(prev); if (newSet.has(roomId)) { newSet.delete(roomId); } else { newSet.add(roomId); } return newSet; }); }; const selectAllRooms = () => { setSelectedRooms(new Set(filteredRooms.map(r => r.id))); }; const clearRoomSelection = () => { setSelectedRooms(new Set()); }; return ( <div className="h-full w-full flex flex-col bg-background"> {/* Header */} <div className="border-b border-border/30 p-4 bg-background/50 backdrop-blur-sm sticky top-0 z-10"> <div className="flex items-center justify-between mb-4"> <div> <h2 className="text-2xl font-bold text-foreground">Engineering & HVAC</h2> <p className="text-sm text-muted-foreground mt-1"> View all outlets, rooms, and scheduled events to plan work around bookings </p> </div> <div className="flex items-center gap-2"> <div className="flex items-center gap-2"> <Label htmlFor="date-range" className="text-sm">Days:</Label> <Select value={dateRange.toString()} onValueChange={(v) => setDateRange(parseInt(v))} > <SelectTrigger className="w-20"> <SelectValue /> </SelectTrigger> <SelectContent> <SelectItem value="3">3</SelectItem> <SelectItem value="7">7</SelectItem> <SelectItem value="14">14</SelectItem> <SelectItem value="30">30</SelectItem> </SelectContent> </Select> </div> <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-40" /> <Button variant="outline" size="sm" onClick={loadAllEvents}> <Activity className="h-4 w-4 mr-2" /> Refresh </Button> </div> </div> {/* Quick Stats */} <div className="grid grid-cols-5 gap-4 mt-4"> <Card> <CardContent className="p-4"> <div className="flex items-center justify-between"> <div> <p className="text-xs text-muted-foreground">Total Outlets</p> <p className="text-2xl font-bold text-foreground">{allOutlets.length}</p> </div> <Building2 className="h-8 w-8 text-blue-500" /> </div> </CardContent> </Card> <Card> <CardContent className="p-4"> <div className="flex items-center justify-between"> <div> <p className="text-xs text-muted-foreground">Total Rooms</p> <p className="text-2xl font-bold text-foreground">{allRooms.length}</p> </div> <MapPin className="h-8 w-8 text-green-500" /> </div> </CardContent> </Card> <Card> <CardContent className="p-4"> <div className="flex items-center justify-between"> <div> <p className="text-xs text-muted-foreground">Scheduled Events</p> <p className="text-2xl font-bold text-foreground">{allEvents.length}</p> </div> <Calendar className="h-8 w-8 text-purple-500" /> </div> </CardContent> </Card> <Card> <CardContent className="p-4"> <div className="flex items-center justify-between"> <div> <p className="text-xs text-muted-foreground">Active HVAC</p> <p className="text-2xl font-bold text-foreground">{activeSchedules.length}</p> </div> <Thermometer className="h-8 w-8 text-red-500" /> </div> </CardContent> </Card> <Card> <CardContent className="p-4"> <div className="flex items-center justify-between"> <div> <p className="text-xs text-muted-foreground">Energy Today</p> <p className="text-2xl font-bold text-foreground">{totalEnergyUsage.toFixed(0)} kWh</p> </div> <Zap className="h-8 w-8 text-amber-500" /> </div> </CardContent> </Card> </div> </div> {/* Main Content */} <div className="flex-1 overflow-hidden"> <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-full flex flex-col"> <div className="flex items-center justify-between px-4 pt-4 border-b"> <TabsList> <TabsTrigger value="overview">Overview</TabsTrigger> <TabsTrigger value="schedule">Schedule</TabsTrigger> <TabsTrigger value="rooms">All Rooms</TabsTrigger> <TabsTrigger value="maintenance">Maintenance</TabsTrigger> <TabsTrigger value="analytics">Analytics</TabsTrigger> </TabsList> <div className="flex items-center gap-2"> <div className="relative"> <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /> <Input placeholder="Search rooms or events..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 w-64" /> </div> <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode ==="grid" ?"list" :"grid")} > {viewMode ==="grid" ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />} </Button> </div> </div> {/* Overview Tab */} <TabsContent value="overview" className="flex-1 overflow-auto p-4 space-y-4"> {/* Outlet Filter */} <Card> <CardHeader> <CardTitle className="flex items-center justify-between"> <span>Filter by Outlet</span> <div className="flex items-center gap-2"> <Button variant="outline" size="sm" onClick={() => setSelectedOutlets(new Set(allOutlets.map(o => o.id)))} > Select All </Button> <Button variant="outline" size="sm" onClick={() => setSelectedOutlets(new Set())} > Clear </Button> </div> </CardTitle> </CardHeader> <CardContent> <div className="grid grid-cols-4 gap-2"> {allOutlets.map((outlet) => ( <div key={outlet.id} className="flex items-center space-x-2"> <Checkbox id={`outlet-${outlet.id}`} checked={selectedOutlets.has(outlet.id)} onCheckedChange={() => toggleOutlet(outlet.id)} /> <Label htmlFor={`outlet-${outlet.id}`} className="text-sm font-medium cursor-pointer flex-1" > {outlet.name} </Label> </div> ))} </div> </CardContent> </Card> {/* Rooms Overview */} <Card> <CardHeader> <CardTitle>All Rooms & Events Overview</CardTitle> <CardDescription> View all rooms across all outlets and their scheduled events </CardDescription> </CardHeader> <CardContent> {viewMode ==="grid" ? ( <div className="grid grid-cols-3 gap-4"> {roomsWithEvents.map((room) => { const outlet = allOutlets.find(o => o.id === room.outlet_id); return ( <Card key={room.id} className={cn("cursor-pointer transition-all hover:shadow-lg", room.todayEventCount > 0 &&"ring-2 ring-blue-500", room.eventCount === 0 &&"opacity-60" )} > <CardHeader className="pb-3"> <div className="flex items-start justify-between"> <div className="flex-1"> <CardTitle className="text-base">{room.name}</CardTitle> <CardDescription className="text-xs mt-1"> {outlet?.name} </CardDescription> </div> <Badge variant={room.eventCount > 0 ?"default" :"secondary"}> {room.eventCount} </Badge> </div> </CardHeader> <CardContent className="pt-0"> <div className="space-y-2 text-sm"> <div className="flex items-center justify-between"> <span className="text-muted-foreground">Capacity</span> <span className="font-medium">{room.capacity ||"N/A"}</span> </div> <div className="flex items-center justify-between"> <span className="text-muted-foreground">Today's Events</span> <Badge variant={room.todayEventCount > 0 ?"default" :"secondary"}> {room.todayEventCount} </Badge> </div> {room.nextEvent && ( <div className="pt-2 border-t"> <p className="text-xs text-muted-foreground mb-1">Next Event</p> <p className="text-xs font-medium">{room.nextEvent.title}</p> <p className="text-xs text-muted-foreground"> {format(parseISO(room.nextEvent.start_time),"MMM d, h:mm a")} </p> </div> )} {room.eventCount === 0 && ( <div className="pt-2 border-t"> <p className="text-xs text-muted-foreground italic"> No events scheduled - Available for maintenance </p> </div> )} </div> </CardContent> </Card> ); })} </div> ) : ( <Table> <TableHeader> <TableRow> <TableHead>Room</TableHead> <TableHead>Outlet</TableHead> <TableHead>Capacity</TableHead> <TableHead className="text-center">Total Events</TableHead> <TableHead className="text-center">Today</TableHead> <TableHead>Next Event</TableHead> <TableHead className="text-right">Status</TableHead> </TableRow> </TableHeader> <TableBody> {roomsWithEvents.map((room) => { const outlet = allOutlets.find(o => o.id === room.outlet_id); return ( <TableRow key={room.id}> <TableCell className="font-medium">{room.name}</TableCell> <TableCell>{outlet?.name}</TableCell> <TableCell>{room.capacity ||"N/A"}</TableCell> <TableCell className="text-center"> <Badge variant={room.eventCount > 0 ?"default" :"secondary"}> {room.eventCount} </Badge> </TableCell> <TableCell className="text-center"> {room.todayEventCount > 0 && ( <Badge variant="default">{room.todayEventCount}</Badge> )} </TableCell> <TableCell> {room.nextEvent ? ( <div> <p className="text-sm font-medium">{room.nextEvent.title}</p> <p className="text-xs text-muted-foreground"> {format(parseISO(room.nextEvent.start_time),"MMM d, h:mm a")} </p> </div> ) : ( <span className="text-sm text-muted-foreground italic"> No upcoming events </span> )} </TableCell> <TableCell className="text-right"> {room.eventCount === 0 ? ( <Badge variant="outline" className="text-green-600"> Available </Badge> ) : ( <Badge variant="outline">Booked</Badge> )} </TableCell> </TableRow> ); })} </TableBody> </Table> )} </CardContent> </Card> </TabsContent> {/* Schedule Tab */} <TabsContent value="schedule" className="flex-1 overflow-auto p-4"> <Card> <CardHeader> <CardTitle>Complete HVAC Schedule</CardTitle> <CardDescription> All scheduled HVAC events across all outlets and rooms </CardDescription> </CardHeader> <CardContent> <Table> <TableHeader> <TableRow> <TableHead>Event</TableHead> <TableHead>Room</TableHead> <TableHead>Outlet</TableHead> <TableHead>Time</TableHead> <TableHead>Target Temp</TableHead> <TableHead>Mode</TableHead> <TableHead>Status</TableHead> <TableHead className="text-right">Actions</TableHead> </TableRow> </TableHeader> <TableBody> {schedules.map((schedule) => ( <TableRow key={schedule.id}> <TableCell className="font-medium">{schedule.eventName}</TableCell> <TableCell>{schedule.roomName}</TableCell> <TableCell>{schedule.outletName}</TableCell> <TableCell> <div className="text-sm"> <div>{format(parseISO(schedule.startTime),"MMM d, h:mm a")}</div> <div className="text-muted-foreground text-xs"> {formatDistanceToNow(parseISO(schedule.startTime), { addSuffix: true })} </div> </div> </TableCell> <TableCell> <div className="flex items-center gap-2"> <span className="font-medium">{schedule.targetTemp}°F</span> {schedule.actualTemp !== undefined && ( <span className={cn("text-xs", Math.abs(schedule.actualTemp - schedule.targetTemp) > 2 ?"text-red-500" :"text-green-500" )}> ({schedule.actualTemp.toFixed(1)}°F) </span> )} </div> </TableCell> <TableCell> <Badge variant={schedule.mode ==="cooling" ?"default" : schedule.mode ==="heating" ?"destructive" :"secondary"}> {schedule.mode} </Badge> </TableCell> <TableCell> <Badge variant={ schedule.status ==="completed" ?"default" : schedule.status ==="in-progress" ?"default" :"secondary" } > {schedule.status} </Badge> </TableCell> <TableCell className="text-right"> <Select value={schedule.targetTemp.toString()} onValueChange={(value) => { const updatedSchedule = { ...schedule, targetTemp: parseInt(value), updatedAt: format(new Date(),"yyyy-MM-dd'T'HH:mm:ss"), }; setSchedules(schedules.map(s => s.id === schedule.id ? updatedSchedule : s)); maestroEventBus.publish({ type:"hvac:temperature_adjusted", source:"Engineering", payload: { scheduleId: updatedSchedule.id, eventId: updatedSchedule.eventId, targetTemp: updatedSchedule.targetTemp, previousTemp: schedule.targetTemp, }, }); toast({ title:"Temperature adjusted", description: `Target temperature set to ${value}°F`, }); }} > <SelectTrigger className="w-24"> <SelectValue /> </SelectTrigger> <SelectContent> {Array.from({ length: 21 }, (_, i) => 65 + i).map((temp) => ( <SelectItem key={temp} value={temp.toString()}> {temp}°F </SelectItem> ))} </SelectContent> </Select> </TableCell> </TableRow> ))} </TableBody> </Table> </CardContent> </Card> </TabsContent> {/* Rooms Tab */} <TabsContent value="rooms" className="flex-1 overflow-auto p-4"> <Card> <CardHeader> <CardTitle className="flex items-center justify-between"> <span>All Rooms ({allRooms.length})</span> <div className="flex items-center gap-2"> <Button variant="outline" size="sm" onClick={selectAllRooms}> Select All </Button> <Button variant="outline" size="sm" onClick={clearRoomSelection}> Clear </Button> </div> </CardTitle> <CardDescription> Filter rooms to see specific schedules and plan maintenance </CardDescription> </CardHeader> <CardContent> <div className="grid grid-cols-4 gap-2 mb-4"> {filteredRooms.map((room) => ( <div key={room.id} className="flex items-center space-x-2"> <Checkbox id={`room-${room.id}`} checked={selectedRooms.has(room.id)} onCheckedChange={() => toggleRoom(room.id)} /> <Label htmlFor={`room-${room.id}`} className="text-sm font-medium cursor-pointer flex-1" > {room.name} </Label> </div> ))} </div> <Table> <TableHeader> <TableRow> <TableHead>Room</TableHead> <TableHead>Outlet</TableHead> <TableHead>Type</TableHead> <TableHead>Capacity</TableHead> <TableHead className="text-center">Events</TableHead> <TableHead>Next Event</TableHead> <TableHead className="text-right">Available For</TableHead> </TableRow> </TableHeader> <TableBody> {filteredRooms.map((room) => { const outlet = allOutlets.find(o => o.id === room.outlet_id); const roomEvents = filteredEvents.filter(e => e.location_room === room.name || e.location_room === room.id ); const nextEvent = roomEvents .filter(e => parseISO(e.start_time) > new Date()) .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime())[0]; return ( <TableRow key={room.id}> <TableCell className="font-medium">{room.name}</TableCell> <TableCell>{outlet?.name}</TableCell> <TableCell> <Badge variant="outline">{room.room_type ||"standard"}</Badge> </TableCell> <TableCell>{room.capacity ||"N/A"}</TableCell> <TableCell className="text-center"> <Badge variant={roomEvents.length > 0 ?"default" :"secondary"}> {roomEvents.length} </Badge> </TableCell> <TableCell> {nextEvent ? ( <div> <p className="text-sm font-medium">{nextEvent.title}</p> <p className="text-xs text-muted-foreground"> {format(parseISO(nextEvent.start_time),"MMM d, h:mm a")} </p> </div> ) : ( <span className="text-sm text-muted-foreground italic"> No upcoming events </span> )} </TableCell> <TableCell className="text-right"> {roomEvents.length === 0 ? ( <Badge variant="outline" className="text-green-600"> Available now </Badge> ) : nextEvent ? ( <span className="text-xs text-muted-foreground"> {formatDistanceToNow(parseISO(nextEvent.start_time))} until next event </span> ) : ( <Badge variant="outline" className="text-green-600"> Available </Badge> )} </TableCell> </TableRow> ); })} </TableBody> </Table> </CardContent> </Card> </TabsContent> {/* Maintenance Tab */} <TabsContent value="maintenance" className="flex-1 overflow-auto p-4"> <Card> <CardHeader> <CardTitle>Maintenance Planning</CardTitle> <CardDescription> Plan maintenance work around scheduled events </CardDescription> </CardHeader> <CardContent> <div className="text-center py-8 text-muted-foreground"> <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" /> <p>Maintenance scheduling coming soon</p> <p className="text-sm mt-2"> This will allow you to block rooms for maintenance while respecting event schedules </p> </div> </CardContent> </Card> </TabsContent> {/* Analytics Tab */} <TabsContent value="analytics" className="flex-1 overflow-auto p-4"> <Card> <CardHeader> <CardTitle>Energy Analytics</CardTitle> <CardDescription> Track energy usage across all outlets and rooms </CardDescription> </CardHeader> <CardContent> <div className="grid grid-cols-3 gap-4 mb-4"> <Card> <CardContent className="p-4"> <p className="text-xs text-muted-foreground mb-1">Today's Energy</p> <p className="text-2xl font-bold">{totalEnergyUsage.toFixed(1)} kWh</p> </CardContent> </Card> <Card> <CardContent className="p-4"> <p className="text-xs text-muted-foreground mb-1">Average per Event</p> <p className="text-2xl font-bold"> {todaysSchedules.length > 0 ? (totalEnergyUsage / todaysSchedules.length).toFixed(1) :"0.0"}{""} kWh </p> </CardContent> </Card> <Card> <CardContent className="p-4"> <p className="text-xs text-muted-foreground mb-1">Active Events</p> <p className="text-2xl font-bold">{activeSchedules.length}</p> </CardContent> </Card> </div> </CardContent> </Card> </TabsContent> </Tabs> </div> </div> );
}
