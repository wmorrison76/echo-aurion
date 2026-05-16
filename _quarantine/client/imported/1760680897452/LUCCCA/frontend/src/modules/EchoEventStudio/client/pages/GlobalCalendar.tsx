import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import SmartInput from '@/components/SmartInput';
import {
  Calendar,
  Plus,
  Settings,
  Filter,
  Bell,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  ChefHat,
  Cookie,
  Utensils,
  Wine,
  Music,
  Car,
  Eye,
  EyeOff,
  Search,
  Download,
  RefreshCw,
  ArrowLeft,
  Home,
  CalendarDays,
  FileText,
  Monitor,
  Wrench,
  ParkingCircle,
  Camera,
  Zap
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  clientName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'tentative' | 'in-progress' | 'confirmed' | 'completed' | 'cancelled';
  type: 'beo' | 'reo' | 'meeting' | 'other';
  segments: string[];
  guestCount: number;
  venue: string;
  description: string;
  assignedTo: string[];
  budget: number;
  specialRequests: string;
  createdAt: string;
  updatedAt: string;
}

interface Segment {
  id: string;
  name: string;
  color: string;
  icon: React.ElementType;
  description: string;
  isActive: boolean;
  permissions: string[];
}

const defaultSegments: Segment[] = [
  {
    id: 'culinary',
    name: 'Culinary',
    color: 'bg-orange-500',
    icon: ChefHat,
    description: 'Kitchen operations and food preparation',
    isActive: true,
    permissions: ['chef', 'admin', 'manager']
  },
  {
    id: 'pastry',
    name: 'Pastry',
    color: 'bg-pink-500',
    icon: Cookie,
    description: 'Desserts, cakes, and pastry items',
    isActive: true,
    permissions: ['chef', 'admin', 'manager']
  },
  {
    id: 'service',
    name: 'Service',
    color: 'bg-blue-500',
    icon: Utensils,
    description: 'Front of house and event service',
    isActive: true,
    permissions: ['server', 'coordinator', 'admin', 'manager']
  },
  {
    id: 'beverage',
    name: 'Beverage',
    color: 'bg-purple-500',
    icon: Wine,
    description: 'Bar operations and beverage service',
    isActive: true,
    permissions: ['server', 'admin', 'manager']
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    color: 'bg-green-500',
    icon: Music,
    description: 'Audio/visual and entertainment coordination',
    isActive: true,
    permissions: ['coordinator', 'admin', 'manager']
  },
  {
    id: 'logistics',
    name: 'Logistics',
    color: 'bg-gray-500',
    icon: Car,
    description: 'Setup, breakdown, and transportation',
    isActive: true,
    permissions: ['coordinator', 'admin', 'manager']
  },
  {
    id: 'av',
    name: 'A/V',
    color: 'bg-red-500',
    icon: Monitor,
    description: 'Audio/visual equipment, lighting, and technical production',
    isActive: true,
    permissions: ['technician', 'coordinator', 'admin', 'manager']
  },
  {
    id: 'engineering',
    name: 'Engineering',
    color: 'bg-yellow-500',
    icon: Wrench,
    description: 'Facility maintenance, technical support, and infrastructure',
    isActive: true,
    permissions: ['engineer', 'technician', 'admin', 'manager']
  },
  {
    id: 'parking',
    name: 'Parking',
    color: 'bg-indigo-500',
    icon: ParkingCircle,
    description: 'Parking coordination, valet service, and guest transportation',
    isActive: true,
    permissions: ['valet', 'coordinator', 'admin', 'manager']
  }
];

const statusColors = {
  tentative: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  'in-progress': 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  confirmed: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
  completed: 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
  cancelled: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30'
};

const statusIcons = {
  tentative: Clock,
  'in-progress': AlertTriangle,
  confirmed: CheckCircle,
  completed: CheckCircle,
  cancelled: AlertTriangle
};

export default function GlobalCalendar() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [segments, setSegments] = useState<Segment[]>(defaultSegments);
  const [selectedSegments, setSelectedSegments] = useState<string[]>(segments.map(s => s.id));
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['tentative', 'in-progress', 'confirmed']);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'list'>('list');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isSegmentSettingsOpen, setIsSegmentSettingsOpen] = useState(false);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [clientNotes, setClientNotes] = useState<string>('');
  const [voiceNoteRecording, setVoiceNoteRecording] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: '',
    clientName: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    status: 'tentative',
    type: 'beo',
    segments: ['culinary'],
    guestCount: 50,
    venue: '',
    description: '',
    assignedTo: [],
    budget: 0,
    specialRequests: ''
  });
  const [newSegment, setNewSegment] = useState({
    name: '',
    color: 'bg-blue-500',
    description: ''
  });
  const [alerts, setAlerts] = useState<Array<{id: string, message: string, type: 'info' | 'success' | 'warning' | 'error', timestamp: string}>>([]);

  // Sample events for demonstration
  useEffect(() => {
    const sampleEvents: CalendarEvent[] = [
      {
        id: '1',
        title: 'Corporate Holiday Party',
        clientName: 'Tech Corp Inc.',
        date: '2024-01-20',
        startTime: '18:00',
        endTime: '23:00',
        status: 'confirmed',
        type: 'beo',
        segments: ['culinary', 'pastry', 'service', 'beverage'],
        guestCount: 150,
        venue: 'Grand Ballroom',
        description: 'Annual holiday celebration with dinner and dancing',
        assignedTo: ['chef-john', 'coordinator-sarah'],
        budget: 15000,
        specialRequests: 'Vegetarian and gluten-free options required',
        createdAt: '2024-01-10T10:00:00Z',
        updatedAt: '2024-01-15T14:30:00Z'
      },
      {
        id: '2',
        title: 'Wedding Reception',
        clientName: 'Smith & Johnson',
        date: '2024-01-25',
        startTime: '17:00',
        endTime: '24:00',
        status: 'in-progress',
        type: 'beo',
        segments: ['culinary', 'pastry', 'service', 'entertainment'],
        guestCount: 200,
        venue: 'Garden Pavilion',
        description: 'Wedding reception with three-course dinner',
        assignedTo: ['chef-maria', 'coordinator-alex'],
        budget: 25000,
        specialRequests: 'Custom wedding cake design required',
        createdAt: '2024-01-05T09:00:00Z',
        updatedAt: '2024-01-18T16:00:00Z'
      },
      {
        id: '3',
        title: 'Business Lunch Meeting',
        clientName: 'Investment Partners LLC',
        date: '2024-01-22',
        startTime: '12:00',
        endTime: '14:00',
        status: 'tentative',
        type: 'reo',
        segments: ['culinary', 'service'],
        guestCount: 12,
        venue: 'Private Dining Room',
        description: 'Executive lunch meeting',
        assignedTo: ['chef-david'],
        budget: 800,
        specialRequests: 'Dietary restrictions: no shellfish',
        createdAt: '2024-01-19T11:00:00Z',
        updatedAt: '2024-01-19T11:00:00Z'
      }
    ];
    setEvents(sampleEvents);
  }, []);

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.venue.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSegments = event.segments.some(segment => selectedSegments.includes(segment));
    const matchesStatus = selectedStatuses.includes(event.status);
    
    return matchesSearch && matchesSegments && matchesStatus;
  });

  const createEvent = () => {
    const event: CalendarEvent = {
      id: Date.now().toString(),
      title: newEvent.title || '',
      clientName: newEvent.clientName || '',
      date: newEvent.date || '',
      startTime: newEvent.startTime || '09:00',
      endTime: newEvent.endTime || '17:00',
      status: newEvent.status as CalendarEvent['status'] || 'tentative',
      type: newEvent.type as CalendarEvent['type'] || 'beo',
      segments: newEvent.segments || ['culinary'],
      guestCount: newEvent.guestCount || 0,
      venue: newEvent.venue || '',
      description: newEvent.description || '',
      assignedTo: newEvent.assignedTo || [],
      budget: newEvent.budget || 0,
      specialRequests: newEvent.specialRequests || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setEvents([...events, event]);
    
    // Add alert for new BEO
    if (event.type === 'beo' && event.status === 'confirmed') {
      setAlerts(prev => [...prev, {
        id: Date.now().toString(),
        message: `New confirmed BEO: ${event.title} for ${event.clientName}`,
        type: 'success',
        timestamp: new Date().toISOString()
      }]);
    }

    setNewEvent({
      title: '',
      clientName: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00',
      status: 'tentative',
      type: 'beo',
      segments: ['culinary'],
      guestCount: 50,
      venue: '',
      description: '',
      assignedTo: [],
      budget: 0,
      specialRequests: ''
    });
    setIsCreateEventOpen(false);
  };

  const createSegment = () => {
    const segment: Segment = {
      id: Date.now().toString(),
      name: newSegment.name,
      color: newSegment.color,
      icon: Utensils, // Default icon
      description: newSegment.description,
      isActive: true,
      permissions: ['admin', 'manager']
    };

    setSegments([...segments, segment]);
    setNewSegment({ name: '', color: 'bg-blue-500', description: '' });
  };

  const toggleSegmentVisibility = (segmentId: string) => {
    setSelectedSegments(prev => 
      prev.includes(segmentId)
        ? prev.filter(id => id !== segmentId)
        : [...prev, segmentId]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const exportEventForClient = (event: CalendarEvent) => {
    // Create client-friendly export without sensitive information
    const clientData = {
      eventName: event.title,
      date: formatDate(event.date),
      time: `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`,
      venue: event.venue,
      guestCount: event.guestCount,
      description: event.description,
      specialRequests: event.specialRequests,
      status: event.status === 'confirmed' ? 'Confirmed' : 'In Planning',
      // Exclude sensitive data like budget, internal notes, costs
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(clientData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${event.title.replace(/\s+/g, '_')}_client_summary.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    setAlerts(prev => [...prev, {
      id: Date.now().toString(),
      message: `Event details exported for ${event.clientName}`,
      type: 'success',
      timestamp: new Date().toISOString()
    }]);
  };

  const addClientNote = (eventId: string, note: string) => {
    setEvents(prev => prev.map(event =>
      event.id === eventId
        ? {
            ...event,
            comments: [...(event.comments || []), {
              id: Date.now().toString(),
              author: 'William Morrison',
              content: note,
              createdAt: new Date().toISOString()
            }]
          }
        : event
    ));
    setClientNotes('');
  };

  const startVoiceRecording = () => {
    setVoiceNoteRecording(true);
    // Voice recording implementation would go here
    // For now, we'll simulate it
    setTimeout(() => {
      setVoiceNoteRecording(false);
      setAlerts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Voice note recorded successfully',
        type: 'success',
        timestamp: new Date().toISOString()
      }]);
    }, 3000);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="apple-button p-1 h-auto"
          >
            <Home className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
          <span>/</span>
          <span className="text-foreground font-medium">Global Calendar</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Global Calendar</h1>
            <p className="text-muted-foreground">Centralized event management with secure client information and BEO/REO integration</p>
          </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="apple-button"
            onClick={() => navigate('/beo-reo')}
          >
            <FileText className="h-4 w-4 mr-2" />
            View BEO/REO
          </Button>
          <Button
            onClick={() => setIsSegmentSettingsOpen(true)}
            variant="outline"
            className="apple-button"
          >
            <Settings className="h-4 w-4 mr-2" />
            Segments
          </Button>
          <Button
            onClick={() => setIsCreateEventOpen(true)}
            className="apple-button bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="glass-panel border-blue-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <Bell className="h-5 w-5" />
              Recent Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <span className="text-sm">{alert.message}</span>
                  <Badge variant="outline" className="text-xs">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Controls */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & View Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search Events</Label>
              <SmartInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search by title, client, venue, or type (with spell check)..."
                enableSpellCheck={true}
                enableAutoCorrect={true}
                enableVoiceNotes={false}
                className="apple-button"
              />
            </div>
            <div>
              <Label>View Mode</Label>
              <Select value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
                <SelectTrigger className="apple-button">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-panel">
                  <SelectItem value="list">List View</SelectItem>
                  <SelectItem value="month">Month View</SelectItem>
                  <SelectItem value="week">Week View</SelectItem>
                  <SelectItem value="day">Day View</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground">Status Filter</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {Object.keys(statusColors).map(status => {
                  const isSelected = selectedStatuses.includes(status);
                  return (
                    <Button
                      key={status}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedStatuses(prev =>
                        prev.includes(status)
                          ? prev.filter(s => s !== status)
                          : [...prev, status]
                      )}
                      className={cn(
                        "px-3 py-1.5 h-8 text-xs font-medium transition-all duration-200 capitalize",
                        "border-2 rounded-lg shadow-sm hover:shadow-md",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-background border-border text-foreground hover:bg-muted hover:border-muted-foreground/30"
                      )}
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full mr-2",
                        statusColors[status as keyof typeof statusColors]
                      )} />
                      {status}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground">Segment Visibility</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {segments.filter(s => s.isActive).map(segment => {
                  const Icon = segment.icon;
                  const isVisible = selectedSegments.includes(segment.id);
                  return (
                    <Button
                      key={segment.id}
                      variant={isVisible ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleSegmentVisibility(segment.id)}
                      className={cn(
                        "px-3 py-1.5 h-8 text-xs font-medium transition-all duration-200",
                        "border-2 rounded-lg shadow-sm hover:shadow-md",
                        isVisible
                          ? "bg-gradient-to-r from-primary to-primary/90 border-primary text-primary-foreground hover:from-primary/90 hover:to-primary/80"
                          : "bg-background border-border text-foreground hover:bg-muted hover:border-muted-foreground/30"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          isVisible ? "bg-white" : segment.color.replace('bg-', 'bg-')
                        )} />
                        <Icon className="h-3.5 w-3.5" />
                        <span>{segment.name}</span>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Events ({filteredEvents.length})
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="apple-button">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" className="apple-button">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEvents.map(event => {
              const StatusIcon = statusIcons[event.status];
              return (
                <div key={event.id} className="p-4 border border-border/50 rounded-lg glass-panel hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground">{event.title}</h3>
                        <Badge className={cn("text-xs", statusColors[event.status])}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {event.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {event.type.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div>
                          <div className="font-medium text-foreground">{event.clientName}</div>
                          <div>{formatDate(event.date)}</div>
                          <div>{formatTime(event.startTime)} - {formatTime(event.endTime)}</div>
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{event.venue}</div>
                          <div>{event.guestCount} guests</div>
                          <div>${event.budget.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="font-medium text-foreground">Segments:</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {event.segments.map(segmentId => {
                              const segment = segments.find(s => s.id === segmentId);
                              if (!segment) return null;
                              const Icon = segment.icon;
                              return (
                                <Badge
                                  key={segmentId}
                                  className={cn("text-xs", segment.color, "text-white")}
                                >
                                  <Icon className="h-3 w-3 mr-1" />
                                  {segment.name}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                      )}
                      {event.specialRequests && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-orange-600">Special Requests: </span>
                          <span className="text-xs text-muted-foreground">{event.specialRequests}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="apple-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                          setIsEventDetailOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="apple-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/beo-reo?event=${event.id}`);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        BEO/REO
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="apple-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Export event details for client (without sensitive info)
                          exportEventForClient(event);
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredEvents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No events found matching your filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Event Dialog */}
      <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
        <DialogContent className="glass-panel max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>
              Add a new event to the calendar with segment assignments
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="event-title">Event Title</Label>
                <SmartInput
                  value={newEvent.title || ''}
                  onChange={(value) => setNewEvent({...newEvent, title: value})}
                  placeholder="Enter event title (e.g., Wedding Reception, Corporate Dinner)"
                  enableSpellCheck={true}
                  enableAutoCorrect={true}
                  enableVoiceNotes={false}
                  className="apple-button"
                />
              </div>
              <div>
                <Label htmlFor="client-name">Client Name</Label>
                <SmartInput
                  value={newEvent.clientName || ''}
                  onChange={(value) => setNewEvent({...newEvent, clientName: value})}
                  placeholder="Enter client or company name"
                  enableSpellCheck={true}
                  enableAutoCorrect={true}
                  enableVoiceNotes={false}
                  className="apple-button"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="event-date">Date</Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                    className="apple-button"
                  />
                </div>
                <div>
                  <Label htmlFor="guest-count">Guest Count</Label>
                  <Input
                    id="guest-count"
                    type="number"
                    value={newEvent.guestCount}
                    onChange={(e) => setNewEvent({...newEvent, guestCount: parseInt(e.target.value) || 0})}
                    className="apple-button"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({...newEvent, startTime: e.target.value})}
                    className="apple-button"
                  />
                </div>
                <div>
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})}
                    className="apple-button"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={newEvent.venue}
                  onChange={(e) => setNewEvent({...newEvent, venue: e.target.value})}
                  className="apple-button"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={newEvent.status} 
                    onValueChange={(value) => setNewEvent({...newEvent, status: value as CalendarEvent['status']})}
                  >
                    <SelectTrigger className="apple-button">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-panel">
                      <SelectItem value="tentative">Tentative</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select 
                    value={newEvent.type} 
                    onValueChange={(value) => setNewEvent({...newEvent, type: value as CalendarEvent['type']})}
                  >
                    <SelectTrigger className="apple-button">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-panel">
                      <SelectItem value="beo">BEO</SelectItem>
                      <SelectItem value="reo">REO</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="budget">Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={newEvent.budget}
                  onChange={(e) => setNewEvent({...newEvent, budget: parseInt(e.target.value) || 0})}
                  className="apple-button"
                />
              </div>
              <div>
                <Label>Segments</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {segments.filter(s => s.isActive).map(segment => {
                    const Icon = segment.icon;
                    const isSelected = newEvent.segments?.includes(segment.id);
                    return (
                      <div key={segment.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`segment-${segment.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewEvent({
                                ...newEvent,
                                segments: [...(newEvent.segments || []), segment.id]
                              });
                            } else {
                              setNewEvent({
                                ...newEvent,
                                segments: (newEvent.segments || []).filter(id => id !== segment.id)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`segment-${segment.id}`} className="flex items-center gap-1 text-sm">
                          <Icon className="h-3 w-3" />
                          {segment.name}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="md:col-span-2 space-y-4">
              <div>
                <Label htmlFor="description">Description</Label>
                <SmartInput
                  value={newEvent.description || ''}
                  onChange={(value) => setNewEvent({...newEvent, description: value})}
                  placeholder="Describe the event details, theme, requirements..."
                  multiline
                  rows={3}
                  enableSpellCheck={true}
                  enableVoiceNotes={true}
                  enableAutoCorrect={true}
                  className="apple-button"
                />
              </div>
              <div>
                <Label htmlFor="special-requests">Special Requests</Label>
                <SmartInput
                  value={newEvent.specialRequests || ''}
                  onChange={(value) => setNewEvent({...newEvent, specialRequests: value})}
                  placeholder="Dietary restrictions, accessibility needs, special accommodations..."
                  multiline
                  rows={2}
                  enableSpellCheck={true}
                  enableVoiceNotes={true}
                  enableAutoCorrect={true}
                  className="apple-button"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateEventOpen(false)} className="apple-button">
              Cancel
            </Button>
            <Button onClick={createEvent} className="apple-button bg-primary hover:bg-primary/90">
              Create Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Segment Settings Dialog */}
      <Dialog open={isSegmentSettingsOpen} onOpenChange={setIsSegmentSettingsOpen}>
        <DialogContent className="glass-panel max-w-2xl">
          <DialogHeader>
            <DialogTitle>Segment Settings</DialogTitle>
            <DialogDescription>
              Manage event segments and create custom categories
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="existing" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">Existing Segments</TabsTrigger>
              <TabsTrigger value="create">Create New</TabsTrigger>
            </TabsList>
            <TabsContent value="existing" className="space-y-4">
              <div className="space-y-3">
                {segments.map(segment => {
                  const Icon = segment.icon;
                  return (
                    <div key={segment.id} className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", segment.color)}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">{segment.name}</div>
                          <div className="text-sm text-muted-foreground">{segment.description}</div>
                        </div>
                      </div>
                      <Switch
                        checked={segment.isActive}
                        onCheckedChange={(checked) => {
                          setSegments(segments.map(s => 
                            s.id === segment.id ? {...s, isActive: checked} : s
                          ));
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </TabsContent>
            <TabsContent value="create" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="segment-name">Segment Name</Label>
                  <Input
                    id="segment-name"
                    value={newSegment.name}
                    onChange={(e) => setNewSegment({...newSegment, name: e.target.value})}
                    className="apple-button"
                    placeholder="e.g., Catering, Floral, Photography"
                  />
                </div>
                <div>
                  <Label htmlFor="segment-description">Description</Label>
                  <Textarea
                    id="segment-description"
                    value={newSegment.description}
                    onChange={(e) => setNewSegment({...newSegment, description: e.target.value})}
                    className="apple-button"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex gap-2 mt-2">
                    {['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'].map(color => (
                      <button
                        key={color}
                        onClick={() => setNewSegment({...newSegment, color})}
                        className={cn(
                          "w-8 h-8 rounded-lg border-2 transition-all",
                          color,
                          newSegment.color === color ? "border-white scale-110" : "border-transparent"
                        )}
                      />
                    ))}
                  </div>
                </div>
                <Button onClick={createSegment} className="apple-button bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Segment
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button onClick={() => setIsSegmentSettingsOpen(false)} className="apple-button">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comprehensive Event Details Dialog */}
      <Dialog open={isEventDetailOpen} onOpenChange={setIsEventDetailOpen}>
        <DialogContent className="glass-panel max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Event Details: {selectedEvent?.title}
            </DialogTitle>
            <DialogDescription>
              Comprehensive event management with client notes, timeline, and development tracking
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="timeline">Client Timeline</TabsTrigger>
                <TabsTrigger value="notes">Notes & Development</TabsTrigger>
                <TabsTrigger value="export">Export Options</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="glass-panel">
                    <CardHeader>
                      <CardTitle className="text-lg">Event Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Client Name</Label>
                          <p className="text-sm text-muted-foreground">{selectedEvent.clientName}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Event Type</Label>
                          <Badge className="ml-2">{selectedEvent.type.toUpperCase()}</Badge>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Date & Time</Label>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(selectedEvent.date)} at {formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Venue</Label>
                          <p className="text-sm text-muted-foreground">{selectedEvent.venue}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Guest Count</Label>
                          <p className="text-sm text-muted-foreground">{selectedEvent.guestCount} guests</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Status</Label>
                          <Badge className={cn("ml-2", statusColors[selectedEvent.status])}>
                            {selectedEvent.status}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Description</Label>
                        <p className="text-sm text-muted-foreground mt-1">{selectedEvent.description}</p>
                      </div>
                      {selectedEvent.specialRequests && (
                        <div>
                          <Label className="text-sm font-medium">Special Requests</Label>
                          <p className="text-sm text-muted-foreground mt-1">{selectedEvent.specialRequests}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="glass-panel">
                    <CardHeader>
                      <CardTitle className="text-lg">Financial Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Event Budget</Label>
                          <p className="text-2xl font-bold text-green-600">${selectedEvent.budget.toLocaleString()}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Segments Involved</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedEvent.segments.map(segmentId => {
                              const segment = segments.find(s => s.id === segmentId);
                              if (!segment) return null;
                              const Icon = segment.icon;
                              return (
                                <Badge
                                  key={segmentId}
                                  className={cn("text-xs", segment.color, "text-white")}
                                >
                                  <Icon className="h-3 w-3 mr-1" />
                                  {segment.name}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle className="text-lg">Client Development Timeline</CardTitle>
                    <CardDescription>
                      Full timeline of client interactions and event development path
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium">Event Created</p>
                          <p className="text-sm text-muted-foreground">{formatDate(selectedEvent.createdAt)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="font-medium">Initial Client Contact</p>
                          <p className="text-sm text-muted-foreground">Requirements gathering and budget discussion</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <div className="flex-1">
                          <p className="font-medium">Proposal Stage</p>
                          <p className="text-sm text-muted-foreground">Custom proposal created and sent to client</p>
                        </div>
                      </div>

                      {selectedEvent.status === 'confirmed' && (
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div className="flex-1">
                            <p className="font-medium">Event Confirmed</p>
                            <p className="text-sm text-muted-foreground">Contract signed and deposit received</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle className="text-lg">Client Notes & Development Tracking</CardTitle>
                    <CardDescription>
                      Add notes during client meetings and track event development progress
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <SmartInput
                        value={clientNotes}
                        onChange={setClientNotes}
                        placeholder="Add client notes, meeting outcomes, or development updates... (with spell check and voice notes)"
                        multiline
                        rows={3}
                        enableSpellCheck={true}
                        enableVoiceNotes={true}
                        enableAutoCorrect={true}
                        onVoiceNote={(audioBlob, transcription) => {
                          // Handle voice note - you could save the audio file and transcription
                          console.log('Voice note recorded:', { audioBlob, transcription });
                          if (transcription) {
                            setClientNotes(prev => prev ? `${prev}\n\n[Voice Note]: ${transcription}` : `[Voice Note]: ${transcription}`);
                          }
                        }}
                        className="apple-button"
                      />
                      <Button
                        onClick={() => addClientNote(selectedEvent.id, clientNotes)}
                        disabled={!clientNotes.trim()}
                        className="apple-button"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Note
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      <h4 className="font-medium">Previous Notes:</h4>
                      {selectedEvent.comments && selectedEvent.comments.length > 0 ? (
                        selectedEvent.comments.map(comment => (
                          <div key={comment.id} className="p-3 bg-muted/20 rounded-lg border border-border/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{comment.author}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No notes added yet.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="export" className="space-y-4">
                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle className="text-lg">Export Options</CardTitle>
                    <CardDescription>
                      Export event information for clients or internal use
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        onClick={() => exportEventForClient(selectedEvent)}
                        className="apple-button justify-start h-auto p-4"
                        variant="outline"
                      >
                        <div className="text-left">
                          <div className="flex items-center gap-2 mb-1">
                            <Download className="h-4 w-4" />
                            <span className="font-medium">Client Summary</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Export event details without sensitive information like costs or internal notes
                          </p>
                        </div>
                      </Button>

                      <Button
                        onClick={() => {
                          // Full internal export with all details
                          const fullData = {
                            ...selectedEvent,
                            exportedAt: new Date().toISOString(),
                            exportedBy: 'William Morrison'
                          };
                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullData, null, 2));
                          const downloadAnchorNode = document.createElement('a');
                          downloadAnchorNode.setAttribute("href", dataStr);
                          downloadAnchorNode.setAttribute("download", `${selectedEvent.title.replace(/\s+/g, '_')}_full_details.json`);
                          document.body.appendChild(downloadAnchorNode);
                          downloadAnchorNode.click();
                          downloadAnchorNode.remove();
                        }}
                        className="apple-button justify-start h-auto p-4"
                        variant="outline"
                      >
                        <div className="text-left">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4" />
                            <span className="font-medium">Internal Report</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Complete event details including costs, notes, and internal information
                          </p>
                        </div>
                      </Button>
                    </div>

                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium text-yellow-800 dark:text-yellow-200">Privacy Notice</span>
                      </div>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        Client exports automatically exclude sensitive information such as internal costs, profit margins, and private notes.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEventDetailOpen(false)}
              className="apple-button"
            >
              Close
            </Button>
            <Button
              onClick={() => navigate(`/beo-reo?event=${selectedEvent?.id}`)}
              className="apple-button bg-primary hover:bg-primary/90"
            >
              <FileText className="h-4 w-4 mr-2" />
              View BEO/REO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
}
