import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  MapPin,
  Building2,
  DollarSign,
  Phone,
  Mail,
  Eye,
  Edit,
  Plus
} from "lucide-react";

interface EventsCalendarModalProps {
  children: React.ReactNode;
}

export default function EventsCalendarModal({ children }: EventsCalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 0)); // January 2024
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const events = [
    {
      id: 1,
      title: "Corporate Leadership Summit",
      date: new Date(2024, 0, 15),
      time: "09:00 AM - 5:00 PM",
      guests: 250,
      venue: "Main Ballroom",
      type: "Corporate",
      status: "confirmed",
      value: "$45,000",
      client: "TechCorp Inc.",
      contact: "Sarah Johnson",
      phone: "+1 (555) 123-4567",
      email: "sarah@techcorp.com",
      description: "Annual leadership summit with keynote speakers and networking sessions"
    },
    {
      id: 2,
      title: "Product Launch Event",
      date: new Date(2024, 0, 16),
      time: "2:00 PM - 8:00 PM",
      guests: 180,
      venue: "Conference Center",
      type: "Corporate",
      status: "in-progress",
      value: "$32,000",
      client: "Global Events Ltd.",
      contact: "Michael Chen",
      phone: "+1 (555) 987-6543",
      email: "m.chen@globalevents.com",
      description: "Tech product launch with demo stations and cocktail reception"
    },
    {
      id: 3,
      title: "Wedding Reception",
      date: new Date(2024, 0, 18),
      time: "6:00 PM - 12:00 AM",
      guests: 120,
      venue: "Garden Pavilion",
      type: "Wedding",
      status: "confirmed",
      value: "$28,000",
      client: "Johnson-Smith Wedding",
      contact: "Emily Rodriguez",
      phone: "+1 (555) 456-7890",
      email: "emily@luxuryweddings.com",
      description: "Elegant garden wedding reception with dinner and dancing"
    },
    {
      id: 4,
      title: "Board Meeting Lunch",
      date: new Date(2024, 0, 22),
      time: "11:30 AM - 2:30 PM",
      guests: 25,
      venue: "Private Dining Room",
      type: "Corporate",
      status: "confirmed",
      value: "$8,500",
      client: "Financial Partners LLC",
      contact: "David Wilson",
      phone: "+1 (555) 321-0987",
      email: "dwilson@finpartners.com",
      description: "Quarterly board meeting with catered lunch"
    },
    {
      id: 5,
      title: "Charity Gala",
      date: new Date(2024, 0, 25),
      time: "7:00 PM - 11:00 PM",
      guests: 300,
      venue: "Main Ballroom",
      type: "Social",
      status: "pending",
      value: "$55,000",
      client: "Children's Foundation",
      contact: "Lisa Anderson",
      phone: "+1 (555) 654-3210",
      email: "lisa@childrensfound.org",
      description: "Annual charity gala with auction and entertainment"
    },
    {
      id: 6,
      title: "Birthday Party",
      date: new Date(2024, 0, 27),
      time: "3:00 PM - 8:00 PM",
      guests: 75,
      venue: "Garden Pavilion",
      type: "Social",
      status: "confirmed",
      value: "$12,000",
      client: "Thompson Family",
      contact: "Jennifer Thompson",
      phone: "+1 (555) 789-0123",
      email: "jen.thompson@email.com",
      description: "50th birthday celebration with family and friends"
    },
    {
      id: 7,
      title: "Training Workshop",
      date: new Date(2024, 0, 29),
      time: "9:00 AM - 4:00 PM",
      guests: 60,
      venue: "Conference Center",
      type: "Corporate",
      status: "confirmed",
      value: "$15,000",
      client: "Professional Development Co.",
      contact: "Mark Roberts",
      phone: "+1 (555) 234-5678",
      email: "mark@profdev.com",
      description: "Leadership training workshop with team building activities"
    }
  ];

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  const previousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const getEventsForDate = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return events.filter(event => 
      event.date.getDate() === day &&
      event.date.getMonth() === currentMonth &&
      event.date.getFullYear() === currentYear
    );
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "Corporate": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Wedding": return "bg-pink-100 text-pink-700 border-pink-200";
      case "Social": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-500";
      case "in-progress": return "bg-yellow-500";
      case "pending": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-border/20"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDate(day);
      const isToday = new Date().getDate() === day && 
                     new Date().getMonth() === currentMonth && 
                     new Date().getFullYear() === currentYear;
      
      days.push(
        <div key={day} className={`h-24 border border-border/20 p-1 ${isToday ? 'bg-primary/5 border-primary/30' : ''}`}>
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map((event) => (
              <div
                key={event.id}
                className="text-xs p-1 rounded cursor-pointer hover:opacity-80 bg-primary/10 text-primary truncate"
                onClick={() => setSelectedEvent(event)}
                title={event.title}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-muted-foreground">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  const totalRevenue = events.reduce((sum, event) => sum + parseInt(event.value.replace(/[$,]/g, '')), 0);
  const totalGuests = events.reduce((sum, event) => sum + event.guests, 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span>Events Calendar - {monthNames[currentMonth]} {currentYear}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(90vh-120px)]">
          {/* Calendar View */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button variant="outline" size="sm" onClick={previousMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h3 className="text-lg font-semibold">
                      {monthNames[currentMonth]} {currentYear}
                    </h3>
                    <Button variant="outline" size="sm" onClick={nextMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="day">Day</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Event
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-7 border-b border-border">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-r border-border/20 last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {renderCalendarDays()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Event Details Sidebar */}
          <div className="space-y-4">
            {/* Month Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Month Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Events:</span>
                  <span className="font-medium">{events.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Guests:</span>
                  <span className="font-medium">{totalGuests.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Revenue:</span>
                  <span className="font-medium text-green-600">${totalRevenue.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Event Types */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Event Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {['Corporate', 'Wedding', 'Social'].map((type) => {
                  const typeEvents = events.filter(e => e.type === type);
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded ${getEventTypeColor(type).split(' ')[0]}`}></div>
                        <span className="text-sm">{type}</span>
                      </div>
                      <span className="text-sm font-medium">{typeEvents.length}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Selected Event Details */}
            {selectedEvent && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Event Details</span>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(selectedEvent.status)}`}></div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-medium">{selectedEvent.title}</h4>
                    <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>{selectedEvent.date.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{selectedEvent.time}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span>{selectedEvent.guests} guests</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span>{selectedEvent.venue}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <span className="text-green-600 font-medium">{selectedEvent.value}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <h5 className="text-sm font-medium mb-2">Contact Information</h5>
                    <div className="space-y-1 text-sm">
                      <div>{selectedEvent.client}</div>
                      <div className="text-muted-foreground">{selectedEvent.contact}</div>
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{selectedEvent.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{selectedEvent.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Events List */}
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="text-sm">Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-64">
                  <div className="space-y-2 p-4">
                    {events
                      .sort((a, b) => a.date.getTime() - b.date.getTime())
                      .map((event) => (
                        <div
                          key={event.id}
                          className="p-2 rounded-lg border border-border hover:bg-muted/50 cursor-pointer text-sm"
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium truncate">{event.title}</span>
                            <Badge className={getEventTypeColor(event.type)}>{event.type}</Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>{event.date.toLocaleDateString()}</span>
                            <span>{event.guests} guests</span>
                            <span className="text-green-600">{event.value}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
