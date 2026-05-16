/**
 * Chef Kitchen View - Maestro Banquets
 * Specialized view for chefs showing their events organized by meal service
 */

import React, { useState, useEffect } from 'react';
import {
  ChefHat, Clock, Users, AlertTriangle, CheckCircle, Timer,
  Utensils, Coffee, Sun, Moon, Sparkles, Wine, Calendar,
  TrendingUp, FileText, Printer, Download, Filter, Search,
  Bell, Settings, BarChart3, Target, Zap, Thermometer
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { cn } from '../../lib/utils';
import type { 
  KitchenEvent, 
  DietaryRestriction, 
  Allergen, 
  ProductionList, 
  RunSheet,
  StaffAssignment
} from '../../types/chef-kitchen';

interface ChefKitchenViewProps {
  chefId?: string;
  venueId?: string;
  selectedDate?: Date;
}

// Mock data for demonstration
const mockKitchenEvents: KitchenEvent[] = [
  {
    id: 'ke-001',
    beoId: 'beo-001',
    eventName: 'Smith Wedding Reception',
    eventDate: '2024-09-04',
    guestCount: 87,
    venue: 'Arrabelle Ballrooms',
    chefResponsible: 'Chef Johnson',
    mealService: 'dinner',
    prepStartTime: '14:00',
    serviceStartTime: '19:00',
    serviceEndTime: '23:00',
    status: 'prep',
    priority: 'high',
    dietaryRestrictions: [
      { id: 'dr-1', type: 'vegetarian', guestCount: 12, color: '#22c55e', icon: '🌱', notes: 'Strict vegetarian meals' },
      { id: 'dr-2', type: 'gluten-free', guestCount: 5, color: '#f59e0b', icon: '🌾', notes: 'Celiac requirements' }
    ],
    allergens: [
      { id: 'al-1', name: 'Tree Nuts', severity: 'severe', guestCount: 3, notes: 'Cross-contamination risk', color: '#ef4444', requiresSeparatePrep: true }
    ],
    menuItems: []
  },
  {
    id: 'ke-002',
    beoId: 'beo-002',
    eventName: 'Corporate Holiday Party',
    eventDate: '2024-09-04',
    guestCount: 150,
    venue: 'Grand Ballroom',
    chefResponsible: 'Chef Johnson',
    mealService: 'cocktail',
    prepStartTime: '16:00',
    serviceStartTime: '18:00',
    serviceEndTime: '21:00',
    status: 'cooking',
    priority: 'medium',
    dietaryRestrictions: [
      { id: 'dr-3', type: 'vegan', guestCount: 8, color: '#10b981', icon: '🌿', notes: 'Full vegan options' }
    ],
    allergens: [],
    menuItems: []
  }
];

const MealServiceIcon: React.FC<{ service: KitchenEvent['mealService'] }> = ({ service }) => {
  const icons = {
    breakfast: Coffee,
    brunch: Sun,
    lunch: Utensils,
    dinner: Moon,
    reception: Sparkles,
    cocktail: Wine
  };
  
  const Icon = icons[service];
  return <Icon className="h-4 w-4" />;
};

const DietaryRestrictionBadge: React.FC<{ restriction: DietaryRestriction }> = ({ restriction }) => (
  <Badge 
    variant="outline" 
    className="text-xs border-2" 
    style={{ borderColor: restriction.color, color: restriction.color }}
  >
    <span className="mr-1">{restriction.icon}</span>
    {restriction.type} ({restriction.guestCount})
  </Badge>
);

const AllergenAlert: React.FC<{ allergen: Allergen }> = ({ allergen }) => (
  <div 
    className={cn(
      "flex items-center gap-2 p-2 rounded-lg border-2",
      allergen.severity === 'anaphylaxis' ? "bg-red-50 border-red-300 dark:bg-red-950" :
      allergen.severity === 'severe' ? "bg-orange-50 border-orange-300 dark:bg-orange-950" :
      "bg-yellow-50 border-yellow-300 dark:bg-yellow-950"
    )}
  >
    <AlertTriangle className={cn(
      "h-4 w-4",
      allergen.severity === 'anaphylaxis' ? "text-red-600" :
      allergen.severity === 'severe' ? "text-orange-600" :
      "text-yellow-600"
    )} />
    <div className="flex-1">
      <div className="font-medium text-sm">{allergen.name}</div>
      <div className="text-xs text-muted-foreground">
        {allergen.guestCount} guests • {allergen.severity}
        {allergen.requiresSeparatePrep && " • Separate prep required"}
      </div>
    </div>
  </div>
);

const EventTimeline: React.FC<{ event: KitchenEvent }> = ({ event }) => {
  const prepDuration = new Date(`1970-01-01T${event.serviceStartTime}`).getTime() - 
                      new Date(`1970-01-01T${event.prepStartTime}`).getTime();
  const serviceDuration = new Date(`1970-01-01T${event.serviceEndTime}`).getTime() - 
                         new Date(`1970-01-01T${event.serviceStartTime}`).getTime();
  
  const prepHours = Math.floor(prepDuration / (1000 * 60 * 60));
  const serviceHours = Math.floor(serviceDuration / (1000 * 60 * 60));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Event Timeline</h4>
        <Badge variant={event.status === 'completed' ? 'default' : 'outline'}>
          {event.status.replace('_', ' ')}
        </Badge>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
          <div className="font-medium text-blue-700 dark:text-blue-300">Prep Start</div>
          <div className="text-lg font-bold">{event.prepStartTime}</div>
          <div className="text-xs text-muted-foreground">{prepHours}h prep time</div>
        </div>
        
        <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
          <div className="font-medium text-green-700 dark:text-green-300">Service</div>
          <div className="text-lg font-bold">{event.serviceStartTime}</div>
          <div className="text-xs text-muted-foreground">{serviceHours}h service</div>
        </div>
        
        <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
          <div className="font-medium text-purple-700 dark:text-purple-300">End</div>
          <div className="text-lg font-bold">{event.serviceEndTime}</div>
          <div className="text-xs text-muted-foreground">Cleanup time</div>
        </div>
      </div>
    </div>
  );
};

const EventCard: React.FC<{ event: KitchenEvent; onViewDetails: () => void }> = ({ 
  event, 
  onViewDetails 
}) => {
  const statusColors = {
    prep: 'border-blue-300 bg-blue-50 dark:bg-blue-950/20',
    cooking: 'border-orange-300 bg-orange-50 dark:bg-orange-950/20',
    plating: 'border-purple-300 bg-purple-50 dark:bg-purple-950/20',
    service: 'border-green-300 bg-green-50 dark:bg-green-950/20',
    completed: 'border-gray-300 bg-gray-50 dark:bg-gray-950/20'
  };

  return (
    <Card className={cn("border-2 transition-all duration-200 hover:shadow-lg", statusColors[event.status])}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MealServiceIcon service={event.mealService} />
              <h3 className="font-semibold">{event.eventName}</h3>
              <Badge variant={event.priority === 'urgent' ? 'destructive' : 'outline'}>
                {event.priority}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {event.guestCount} guests
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {event.venue}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {event.serviceStartTime}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onViewDetails}>
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Timeline */}
        <EventTimeline event={event} />

        {/* Dietary Restrictions */}
        {event.dietaryRestrictions.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium">Dietary Requirements</h5>
            <div className="flex flex-wrap gap-1">
              {event.dietaryRestrictions.map(restriction => (
                <DietaryRestrictionBadge key={restriction.id} restriction={restriction} />
              ))}
            </div>
          </div>
        )}

        {/* Allergen Alerts */}
        {event.allergens.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Allergen Alerts
            </h5>
            <div className="space-y-1">
              {event.allergens.map(allergen => (
                <AllergenAlert key={allergen.id} allergen={allergen} />
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <Button size="sm" variant="outline" className="flex-1">
            <Printer className="h-3 w-3 mr-1" />
            Production List
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            <FileText className="h-3 w-3 mr-1" />
            Run Sheet
          </Button>
          <Button size="sm" variant={event.status === 'completed' ? 'default' : 'outline'}>
            <CheckCircle className="h-3 w-3 mr-1" />
            {event.status === 'completed' ? 'Complete' : 'Mark Done'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const MealServiceSection: React.FC<{ 
  service: KitchenEvent['mealService'];
  events: KitchenEvent[];
  onViewEventDetails: (event: KitchenEvent) => void;
}> = ({ service, events, onViewEventDetails }) => {
  const serviceConfig = {
    breakfast: { name: 'Breakfast', color: 'from-yellow-500 to-orange-500', icon: Coffee },
    brunch: { name: 'Brunch', color: 'from-orange-500 to-amber-500', icon: Sun },
    lunch: { name: 'Lunch', color: 'from-blue-500 to-cyan-500', icon: Utensils },
    dinner: { name: 'Dinner', color: 'from-purple-500 to-pink-500', icon: Moon },
    reception: { name: 'Reception', color: 'from-green-500 to-emerald-500', icon: Sparkles },
    cocktail: { name: 'Cocktail', color: 'from-indigo-500 to-purple-500', icon: Wine }
  };

  const config = serviceConfig[service];
  const Icon = config.icon;

  if (events.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className={cn(
        "flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r text-white shadow-md",
        config.color
      )}>
        <Icon className="h-6 w-6" />
        <div>
          <h2 className="text-xl font-bold">{config.name} Service</h2>
          <p className="text-sm opacity-90">{events.length} events scheduled</p>
        </div>
        <div className="ml-auto">
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
            {events.reduce((sum, event) => sum + event.guestCount, 0)} total guests
          </Badge>
        </div>
      </div>

      <div className="grid gap-4">
        {events.map(event => (
          <EventCard 
            key={event.id} 
            event={event} 
            onViewDetails={() => onViewEventDetails(event)}
          />
        ))}
      </div>
    </div>
  );
};

const KitchenStatsOverview: React.FC<{ events: KitchenEvent[] }> = ({ events }) => {
  const totalGuests = events.reduce((sum, event) => sum + event.guestCount, 0);
  const completedEvents = events.filter(e => e.status === 'completed').length;
  const urgentEvents = events.filter(e => e.priority === 'urgent').length;
  const allergenEvents = events.filter(e => e.allergens.length > 0).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="glass-panel">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{events.length}</div>
              <div className="text-sm text-muted-foreground">Events Today</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
              <Users className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalGuests}</div>
              <div className="text-sm text-muted-foreground">Total Guests</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
              <Zap className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{urgentEvents}</div>
              <div className="text-sm text-muted-foreground">Urgent Priority</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{allergenEvents}</div>
              <div className="text-sm text-muted-foreground">Allergen Alerts</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const ChefKitchenView: React.FC<ChefKitchenViewProps> = ({
  chefId = 'chef-johnson',
  venueId,
  selectedDate = new Date()
}) => {
  const [events, setEvents] = useState<KitchenEvent[]>(mockKitchenEvents);
  const [selectedEvent, setSelectedEvent] = useState<KitchenEvent | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'service' | 'production'>('service');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.venue.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    const matchesVenue = !venueId || event.venue === venueId;
    const matchesChef = !chefId || event.chefResponsible.toLowerCase().includes(chefId.toLowerCase());

    return matchesSearch && matchesStatus && matchesVenue && matchesChef;
  });

  // Group events by meal service
  const eventsByService = filteredEvents.reduce((acc, event) => {
    if (!acc[event.mealService]) acc[event.mealService] = [];
    acc[event.mealService].push(event);
    return acc;
  }, {} as Record<string, KitchenEvent[]>);

  // Sort services by typical meal order
  const serviceOrder: KitchenEvent['mealService'][] = ['breakfast', 'brunch', 'lunch', 'cocktail', 'dinner', 'reception'];

  const handleViewEventDetails = (event: KitchenEvent) => {
    setSelectedEvent(event);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary">Kitchen Operations</h1>
          <p className="text-muted-foreground">
            Chef Johnson • {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 md:w-64"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="prep">Prep</SelectItem>
              <SelectItem value="cooking">Cooking</SelectItem>
              <SelectItem value="plating">Plating</SelectItem>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
            <TabsList>
              <TabsTrigger value="service">By Service</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="production">Production</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Preferences
          </Button>
        </div>
      </div>

      {/* Kitchen Stats Overview */}
      <KitchenStatsOverview events={filteredEvents} />

      {/* Urgent Alerts */}
      {filteredEvents.some(e => e.priority === 'urgent' || e.allergens.length > 0) && (
        <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <strong>Kitchen Alert:</strong> {filteredEvents.filter(e => e.priority === 'urgent').length} urgent events, {filteredEvents.filter(e => e.allergens.length > 0).length} allergen warnings
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
        <TabsContent value="service" className="space-y-8">
          {serviceOrder.map(service => {
            const serviceEvents = eventsByService[service];
            if (!serviceEvents) return null;
            
            return (
              <MealServiceSection
                key={service}
                service={service}
                events={serviceEvents}
                onViewEventDetails={handleViewEventDetails}
              />
            );
          })}
          
          {Object.keys(eventsByService).length === 0 && (
            <div className="text-center py-12">
              <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Events Scheduled</h3>
              <p className="text-muted-foreground">
                No kitchen events found for the selected filters and date.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Kitchen Timeline View</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Timer className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Timeline View</h3>
                <p className="text-muted-foreground">
                  Detailed timeline view with prep schedules and dependencies coming soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="production">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Production Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Production Lists</h3>
                <p className="text-muted-foreground">
                  Automated production lists, prep schedules, and ingredient pull lists coming soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChefKitchenView;
