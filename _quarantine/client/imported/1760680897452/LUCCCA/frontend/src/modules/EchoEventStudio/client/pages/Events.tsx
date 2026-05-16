import Layout from "@/components/Layout";
import MoveablePanel from "@/components/MoveablePanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Plus,
  Users,
  Clock,
  MapPin,
  DollarSign,
  Filter,
  Grid3X3,
  List,
  ChevronLeft,
  ChevronRight,
  Building2,
  Phone,
  Mail,
  Settings,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  CalendarDays,
  TrendingUp,
  BarChart3,
  Target,
  Hotel,
  Home,
  Utensils,
  Wifi,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useFormAutoSave } from "@/hooks/useAutoSave";

interface EventItem {
  id: number;
  title: string;
  eventNumber: string;
  guestCount: number;
  estimatedGuestCount?: number;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  venue: string;
  type: 'BEO' | 'REO';
  status: 'confirmed' | 'in-progress' | 'pending' | 'cancelled';
  contractSigned: boolean;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  budget: number;
  notes: string;
  requirements: string[];
  color: string;
}

const sampleEvents: EventItem[] = [
  {
    id: 1,
    title: "Corporate Leadership Summit",
    eventNumber: "BEO-2024-001",
    guestCount: 250,
    date: "2024-01-15",
    startTime: "09:00",
    endTime: "17:00",
    department: "Main Ballroom",
    venue: "Grand Ballroom A",
    type: "BEO",
    status: "confirmed",
    contractSigned: true,
    contactPerson: "Sarah Johnson",
    contactEmail: "sarah@techcorp.com",
    contactPhone: "+1 (555) 123-4567",
    budget: 45000,
    notes: "VIP speakers, premium catering required",
    requirements: ["AV Equipment", "Stage Setup", "Premium Catering", "Security"],
    color: "#3B82F6",
  },
  {
    id: 2,
    title: "Tech Innovation Conference",
    eventNumber: "REO-2024-002",
    guestCount: 180,
    estimatedGuestCount: 200,
    date: "2024-01-16",
    startTime: "14:00",
    endTime: "18:00",
    department: "Conference Center",
    venue: "Conference Hall B",
    type: "REO",
    status: "in-progress",
    contractSigned: false,
    contactPerson: "Michael Chen",
    contactEmail: "m.chen@globalevents.com",
    contactPhone: "+1 (555) 987-6543",
    budget: 78000,
    notes: "Still finalizing speaker lineup and catering options",
    requirements: ["Tech Setup", "Live Streaming", "Networking Space"],
    color: "#000000",
  },
  {
    id: 3,
    title: "Wedding Reception",
    eventNumber: "BEO-2024-003",
    guestCount: 120,
    date: "2024-01-18",
    startTime: "18:00",
    endTime: "23:00",
    department: "Garden Pavilion",
    venue: "Rose Garden Pavilion",
    type: "BEO",
    status: "confirmed",
    contractSigned: true,
    contactPerson: "Emily Rodriguez",
    contactEmail: "emily@luxuryweddings.com",
    contactPhone: "+1 (555) 456-7890",
    budget: 32000,
    notes: "Outdoor ceremony, indoor reception, floral arrangements included",
    requirements: ["Floral Design", "Catering", "DJ Setup", "Photography"],
    color: "#3B82F6",
  },
  {
    id: 4,
    title: "Annual Company Picnic",
    eventNumber: "REO-2024-004",
    estimatedGuestCount: 300,
    guestCount: 0,
    date: "2024-01-22",
    startTime: "11:00",
    endTime: "16:00",
    department: "Outdoor Grounds",
    venue: "East Lawn",
    type: "REO",
    status: "pending",
    contractSigned: false,
    contactPerson: "David Thompson",
    contactEmail: "david@thompsonindustries.com",
    contactPhone: "+1 (555) 321-9876",
    budget: 65000,
    notes: "Weather contingency plan needed, family-friendly activities",
    requirements: ["Tent Rental", "Games & Activities", "BBQ Catering"],
    color: "#000000",
  },
];

const departments = [
  "Main Ballroom",
  "Conference Center",
  "Garden Pavilion",
  "Outdoor Grounds",
  "Private Dining",
  "Rooftop Terrace",
];

const eventSpaces = [
  {
    id: "grand-ballroom-a",
    name: "Grand Ballroom A",
    capacity: 500,
    type: "ballroom",
    department: "Main Ballroom",
    amenities: ["AV Equipment", "Stage", "Dance Floor", "Premium Lighting"],
    rate: 2500,
    utilization: 78,
    nextAvailable: "2024-01-20",
    bookedThisMonth: 12,
    revenue: 45000,
    connected: ["Grand Ballroom B", "Foyer A"],
  },
  {
    id: "conference-center-1",
    name: "Executive Conference Room",
    capacity: 50,
    type: "meeting",
    department: "Conference Center",
    amenities: ["Video Conferencing", "Whiteboard", "Presentation Screen"],
    rate: 500,
    utilization: 85,
    nextAvailable: "2024-01-18",
    bookedThisMonth: 18,
    revenue: 12000,
    connected: ["Conference Center Lobby"],
  },
  {
    id: "garden-pavilion",
    name: "Garden Pavilion",
    capacity: 200,
    type: "outdoor",
    department: "Garden Pavilion",
    amenities: ["Natural Lighting", "Garden Views", "Climate Control"],
    rate: 1800,
    utilization: 65,
    nextAvailable: "2024-01-22",
    bookedThisMonth: 8,
    revenue: 28000,
    connected: ["Garden Terrace", "Bridal Suite"],
  },
  {
    id: "rooftop-terrace",
    name: "Rooftop Terrace",
    capacity: 150,
    type: "outdoor",
    department: "Rooftop Terrace",
    amenities: ["City Views", "Bar Setup", "Lounge Seating"],
    rate: 2200,
    utilization: 45,
    nextAvailable: "2024-01-19",
    bookedThisMonth: 6,
    revenue: 15000,
    connected: ["Indoor Reception Area"],
  },
  {
    id: "private-dining-1",
    name: "The Executive Dining Room",
    capacity: 30,
    type: "dining",
    department: "Private Dining",
    amenities: ["Premium Catering", "Wine Cellar", "Private Service"],
    rate: 800,
    utilization: 92,
    nextAvailable: "2024-01-25",
    bookedThisMonth: 22,
    revenue: 20000,
    connected: ["Wine Tasting Room"],
  },
];

const timeSlots = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
];

export default function Events() {
  const [events, setEvents] = useState<EventItem[]>(sampleEvents);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [draggedEvent, setDraggedEvent] = useState<EventItem | null>(null);
  const [selectedEventSpace, setSelectedEventSpace] = useState<string>("all");
  const [showOptimization, setShowOptimization] = useState(false);

  const currentWeek = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    const week = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      week.push(day);
    }
    return week;
  }, [currentDate]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      const isInCurrentWeek = currentWeek.some(day => 
        day.toDateString() === eventDate.toDateString()
      );
      const matchesDepartment = filterDepartment === "all" || event.department === filterDepartment;
      return isInCurrentWeek && matchesDepartment;
    });
  }, [events, currentWeek, filterDepartment]);

  const getEventPosition = (event: EventItem, dayIndex: number) => {
    const startHour = parseInt(event.startTime.split(':')[0]);
    const endHour = parseInt(event.endTime.split(':')[0]);
    const top = (startHour - 6) * 60; // 60px per hour, starting from 6 AM
    const height = (endHour - startHour) * 60;
    return { top, height };
  };

  const handleDragStart = useCallback((event: EventItem) => {
    setDraggedEvent(event);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, newDate: Date, newTimeSlot?: string) => {
    e.preventDefault();
    if (draggedEvent) {
      const updatedEvents = events.map(event => 
        event.id === draggedEvent.id 
          ? { 
              ...event, 
              date: newDate.toISOString().split('T')[0],
              ...(newTimeSlot && { startTime: newTimeSlot })
            }
          : event
      );
      setEvents(updatedEvents);
      setDraggedEvent(null);
    }
  }, [draggedEvent, events]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const getStatusColor = (event: EventItem) => {
    if (!event.contractSigned) return event.color; // Black for unsigned contracts
    return event.type === 'BEO' ? '#3B82F6' : '#6366F1'; // Blue for BEO
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Events Calendar</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive event management with space optimization and room division connectivity
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Event Space Selector */}
            <Select value={selectedEventSpace} onValueChange={setSelectedEventSpace}>
              <SelectTrigger className="w-64 glass-panel dark:glass-panel-dark">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select Event Space" />
              </SelectTrigger>
              <SelectContent className="glass-panel dark:glass-panel-dark">
                <SelectItem value="all">All Event Spaces</SelectItem>
                {eventSpaces.map((space) => (
                  <SelectItem key={space.id} value={space.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{space.name}</span>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge
                          variant="outline"
                          className={
                            space.utilization > 80 ? "border-red-500 text-red-600" :
                            space.utilization > 60 ? "border-yellow-500 text-yellow-600" :
                            "border-green-500 text-green-600"
                          }
                        >
                          {space.utilization}% utilized
                        </Badge>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Optimization Toggle */}
            <Button
              variant={showOptimization ? "default" : "outline"}
              onClick={() => setShowOptimization(!showOptimization)}
              className="apple-button"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Optimization
            </Button>

            <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="apple-button"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="apple-button"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="apple-button">
                  <Plus className="h-4 w-4 mr-2" />
                  New Event
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                  <DialogDescription>
                    Schedule a new event with all necessary details.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title</Label>
                    <Input id="title" placeholder="Corporate Conference" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Event Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BEO">BEO - Banquet Event Order</SelectItem>
                        <SelectItem value="REO">REO - Room Event Order</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Event Date</Label>
                    <Input id="date" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guests">Guest Count</Label>
                    <Input id="guests" type="number" placeholder="150" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget</Label>
                    <Input id="budget" type="number" placeholder="50000" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="contact">Contact Person</Label>
                    <Input id="contact" placeholder="John Doe" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="notes">Event Notes</Label>
                    <Textarea id="notes" placeholder="Special requirements, VIP guests, etc." />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsAddDialogOpen(false)}>Create Event</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <MoveablePanel className="glass-panel p-4 rounded-xl border-2 border-border/40 hover:border-primary/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-48 bg-background/50 border-2 border-border/50 hover:border-primary/30 transition-all duration-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-500 rounded" />
                  <span>BEO (Contract Signed)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-black rounded" />
                  <span>Contract in Progress</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
                className="apple-button"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-4">
                {currentWeek[0].toLocaleDateString()} - {currentWeek[6].toLocaleDateString()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
                className="apple-button"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </MoveablePanel>

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <MoveablePanel className="glass-panel rounded-xl overflow-hidden border-2 border-border/40 hover:border-primary/40">
            <div className="grid grid-cols-8 bg-muted/30">
              <div className="p-3 border-r border-border text-sm font-medium">Time</div>
              {currentWeek.map((day, index) => (
                <div
                  key={index}
                  className="p-3 border-r border-border text-center"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day)}
                >
                  <div className="text-sm font-medium">{day.toLocaleDateString('en', { weekday: 'short' })}</div>
                  <div className="text-lg">{day.getDate()}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-8 relative" style={{ height: '1080px' }}>
              {/* Time Column */}
              <div className="border-r border-border">
                {timeSlots.map((time, index) => (
                  <div key={index} className="h-[60px] p-2 border-b border-border text-xs text-muted-foreground">
                    {time}
                  </div>
                ))}
              </div>
              
              {/* Day Columns */}
              {currentWeek.map((day, dayIndex) => {
                const dayEvents = filteredEvents.filter(event => 
                  new Date(event.date).toDateString() === day.toDateString()
                );
                
                return (
                  <div
                    key={dayIndex}
                    className="border-r border-border relative"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day)}
                  >
                    {timeSlots.map((time, timeIndex) => (
                      <div
                        key={timeIndex}
                        className="h-[60px] border-b border-border hover:bg-muted/10 transition-colors"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day, time)}
                      />
                    ))}
                    
                    {/* Events */}
                    {dayEvents.map((event, eventIndex) => {
                      const { top, height } = getEventPosition(event, dayIndex);
                      return (
                        <div
                          key={event.id}
                          className="absolute left-1 right-1 rounded p-1 text-xs cursor-move hover:shadow-lg transition-all z-10"
                          style={{
                            top: `${top}px`,
                            height: `${Math.max(height, 30)}px`,
                            backgroundColor: getStatusColor(event),
                            color: 'white',
                            left: `${4 + eventIndex * 2}px`,
                            right: `${4 + (dayEvents.length - eventIndex - 1) * 2}px`,
                          }}
                          draggable
                          onDragStart={() => handleDragStart(event)}
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div className="font-medium truncate">{event.title}</div>
                          <div className="truncate opacity-90">
                            {event.guestCount || event.estimatedGuestCount} guests
                          </div>
                          <div className="truncate opacity-75">
                            {event.eventNumber}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </MoveablePanel>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredEvents.map((event) => (
              <MoveablePanel key={event.id} className="glass-panel">
                <Card className="bg-transparent border-none shadow-none">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge
                            variant="outline"
                            style={{
                              backgroundColor: getStatusColor(event),
                              color: 'white',
                              borderColor: getStatusColor(event),
                            }}
                          >
                            {event.eventNumber}
                          </Badge>
                          <Badge variant={event.contractSigned ? 'default' : 'secondary'}>
                            {event.contractSigned ? 'Contract Signed' : 'In Progress'}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg leading-tight">{event.title}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {event.department} • {event.venue}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedEvent(event)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Event
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <CalendarDays className="mr-2 h-4 w-4" />
                            Reschedule
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Cancel Event
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-2 text-muted-foreground" />
                        {new Date(event.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-2 text-muted-foreground" />
                        {event.startTime} - {event.endTime}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-3 w-3 mr-2 text-muted-foreground" />
                        {event.guestCount || `~${event.estimatedGuestCount}`} guests
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-3 w-3 mr-2 text-muted-foreground" />
                        ${event.budget.toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <div className="flex items-center mb-1">
                        <Mail className="h-3 w-3 mr-2 text-muted-foreground" />
                        <span className="text-muted-foreground">Contact:</span>
                      </div>
                      <div className="ml-5 text-foreground">{event.contactPerson}</div>
                    </div>

                    {event.requirements.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {event.requirements.slice(0, 3).map((req, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {req}
                          </Badge>
                        ))}
                        {event.requirements.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{event.requirements.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </MoveablePanel>
            ))}
          </div>
        )}

        {/* Event Detail Dialog */}
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="glass-panel max-w-3xl">
            {selectedEvent && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-2xl">{selectedEvent.title}</DialogTitle>
                      <DialogDescription className="text-lg mt-1">
                        {selectedEvent.eventNumber} • {selectedEvent.department}
                      </DialogDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: getStatusColor(selectedEvent),
                          color: 'white',
                          borderColor: getStatusColor(selectedEvent),
                        }}
                      >
                        {selectedEvent.type}
                      </Badge>
                      <Badge variant={selectedEvent.contractSigned ? 'default' : 'secondary'}>
                        {selectedEvent.contractSigned ? 'Contract Signed' : 'In Progress'}
                      </Badge>
                    </div>
                  </div>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-3">Event Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-3 text-muted-foreground" />
                          <span>{new Date(selectedEvent.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-3 text-muted-foreground" />
                          <span>{selectedEvent.startTime} - {selectedEvent.endTime}</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-3 text-muted-foreground" />
                          <span>
                            {selectedEvent.guestCount ? 
                              `${selectedEvent.guestCount} confirmed guests` : 
                              `~${selectedEvent.estimatedGuestCount} estimated guests`
                            }
                          </span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-3 text-muted-foreground" />
                          <span>{selectedEvent.venue}</span>
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-3 text-muted-foreground" />
                          <span>${selectedEvent.budget.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-3">Requirements</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedEvent.requirements.map((req, index) => (
                          <Badge key={index} variant="outline">{req}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-3">Contact Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-3 text-muted-foreground" />
                          <span>{selectedEvent.contactPerson}</span>
                        </div>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-3 text-muted-foreground" />
                          <span>{selectedEvent.contactEmail}</span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-3 text-muted-foreground" />
                          <span>{selectedEvent.contactPhone}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {selectedEvent.notes && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-2">Event Notes</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                      {selectedEvent.notes}
                    </p>
                  </div>
                )}
                
                <DialogFooter className="mt-6">
                  <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                    Close
                  </Button>
                  <Button>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Event
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Space Optimization Panel */}
        {showOptimization && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Utilization Overview */}
            <Card className="glass-panel dark:glass-panel-dark enhanced-shadow-light dark:enhanced-shadow-dark">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Space Utilization
                </CardTitle>
                <CardDescription>
                  Current utilization rates across all event spaces
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {eventSpaces.map((space) => (
                    <div key={space.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{space.name}</span>
                        <span className="text-sm text-muted-foreground">{space.utilization}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all",
                            space.utilization > 80 ? "bg-red-500" :
                            space.utilization > 60 ? "bg-yellow-500" : "bg-green-500"
                          )}
                          style={{ width: `${space.utilization}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{space.bookedThisMonth} bookings this month</span>
                        <span>Next: {new Date(space.nextAvailable).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Revenue Analytics */}
            <Card className="glass-panel dark:glass-panel-dark enhanced-shadow-light dark:enhanced-shadow-dark">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Revenue Performance
                </CardTitle>
                <CardDescription>
                  Monthly revenue by event space
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {eventSpaces.map((space) => (
                    <div key={space.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{space.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {space.type} • {space.capacity} capacity
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${space.revenue.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          ${space.rate}/day
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Revenue</span>
                      <span className="font-bold text-primary">
                        ${eventSpaces.reduce((sum, space) => sum + space.revenue, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Room Division Connectivity */}
            <Card className="glass-panel dark:glass-panel-dark enhanced-shadow-light dark:enhanced-shadow-dark">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hotel className="h-5 w-5" />
                  Room Division Integration
                </CardTitle>
                <CardDescription>
                  Connected spaces and hotel integration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {eventSpaces
                    .filter(space => space.connected.length > 0)
                    .map((space) => (
                      <div key={space.id} className="p-3 border rounded-lg">
                        <div className="font-medium mb-2">{space.name}</div>
                        <div className="text-sm text-muted-foreground mb-2">Connected Spaces:</div>
                        <div className="flex flex-wrap gap-1">
                          {space.connected.map((connected, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {connected}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Wifi className="h-3 w-3" />
                            <span>Smart Controls</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Utensils className="h-3 w-3" />
                            <span>Catering Access</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Hotel className="h-3 w-3" />
                            <span>Hotel Services</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Home className="h-3 w-3" />
                            <span>Guest Rooms</span>
                          </div>
                        </div>
                      </div>
                    ))}

                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2 text-primary">
                      <Target className="h-4 w-4" />
                      <span className="font-medium">Optimization Suggestions</span>
                    </div>
                    <ul className="mt-2 text-sm space-y-1">
                      <li>• Rooftop Terrace has low utilization - consider promotional packages</li>
                      <li>• Private Dining is overbooked - expand capacity or add premium pricing</li>
                      <li>• Connect Garden Pavilion with outdoor event services</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
