import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  FileText,
  Download,
  Upload,
  Plus,
  Minus,
  Edit,
  Save,
  AlertTriangle,
  CheckCircle,
  Cloud,
  Sun,
  CloudRain,
  Wind,
  Eye,
  Settings,
  BarChart3,
  PieChart,
  TrendingUp,
  Utensils,
  Coffee,
  Music,
  Palette,
  Truck,
  Calculator,
  Building2,
  Phone,
  Mail,
  Camera,
  Zap,
  Shield,
  Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeatherService, WeatherUtils } from '../../shared/weather-service';
import { 
  Event, 
  Function, 
  CatalogItem, 
  LineItem, 
  BEO, 
  WeatherForecast,
  GeoLocation,
  EventImpact
} from '../../shared/beo-reo-types';

// Mock data for demonstration
const mockEvent: Event = {
  id: 'evt_001',
  account_id: 'acc_001',
  name: 'Corporate Leadership Retreat',
  status: 'definite',
  start_at: new Date('2024-02-15T09:00:00'),
  end_at: new Date('2024-02-15T17:00:00'),
  timezone: 'America/New_York',
  expected_guests: 120,
  manager_id: 'mgr_001',
  currency: 'USD',
  weather_plan: {
    id: 'wp_001',
    event_id: 'evt_001',
    primary_plan: 'hybrid',
    backup_plans: [],
    weather_triggers: [],
    decision_timeline: [],
    last_forecast_check: new Date()
  },
  functions: [],
  line_items: []
};

const mockCatalogItems: CatalogItem[] = [
  {
    id: 'cat_001',
    type: 'FB',
    name: 'Continental Breakfast',
    description: 'Fresh pastries, coffee, juice, fruit',
    unit: 'per person',
    cost: 12.50,
    price: 18.00,
    tax_code: 'FOOD',
    gl_code: '4000',
    modifiers: [],
    allergens: ['gluten', 'dairy'],
    prep_lead_hours: 2,
    dietary_tags: ['vegetarian']
  },
  {
    id: 'cat_002', 
    type: 'FB',
    name: 'Plated Lunch',
    description: 'Chicken, salmon, or vegetarian option with sides',
    unit: 'per person',
    cost: 22.00,
    price: 35.00,
    tax_code: 'FOOD',
    gl_code: '4000',
    modifiers: [],
    allergens: ['dairy'],
    prep_lead_hours: 4,
    dietary_tags: ['gluten-free option']
  },
  {
    id: 'cat_003',
    type: 'AV',
    name: 'Projector & Screen Setup',
    description: 'Professional AV equipment with technician',
    unit: 'per setup',
    cost: 150.00,
    price: 275.00,
    tax_code: 'EQUIP',
    gl_code: '4100',
    modifiers: [],
    allergens: [],
    prep_lead_hours: 1,
    dietary_tags: []
  },
  {
    id: 'cat_004',
    type: 'DECOR',
    name: 'Centerpiece - Corporate Modern',
    description: 'Sleek corporate centerpieces with branded elements',
    unit: 'per table',
    cost: 25.00,
    price: 45.00,
    tax_code: 'DECOR',
    gl_code: '4200',
    modifiers: [],
    allergens: [],
    prep_lead_hours: 24,
    dietary_tags: []
  }
];

interface DraggedItem {
  item: CatalogItem;
  quantity: number;
}

export default function EchoScopeBEO() {
  const [event, setEvent] = useState<Event>(mockEvent);
  const [catalog, setCatalog] = useState<CatalogItem[]>(mockCatalogItems);
  const [selectedItems, setSelectedItems] = useState<LineItem[]>([]);
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecast | null>(null);
  const [weatherImpact, setWeatherImpact] = useState<EventImpact | null>(null);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [marginPercent, setMarginPercent] = useState<number>(0);
  const [activeTab, setActiveTab] = useState('builder');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const draggedItemRef = useRef<DraggedItem | null>(null);

  // Initialize weather forecast
  useEffect(() => {
    const loadWeatherForecast = async () => {
      try {
        const location: GeoLocation = { latitude: 40.7128, longitude: -74.0060 }; // NYC
        const forecast = await WeatherService.getEventWeatherForecast(location, event.start_at);
        const impact = WeatherService.analyzeEventImpact(event, forecast);

        setWeatherForecast(forecast);
        setWeatherImpact(impact);
      } catch (error) {
        console.error('Failed to load weather forecast:', error);
        // Set fallback weather data so the UI doesn't break
        setWeatherForecast({
          date: new Date(),
          location: { latitude: 40.7128, longitude: -74.0060 },
          hourly_forecast: [{
            time: new Date(),
            temperature: 22,
            temperature_feels_like: 22,
            humidity: 60,
            precipitation_probability: 15,
            precipitation_amount: 0,
            wind_speed: 10,
            wind_direction: 180,
            cloud_cover: 30,
            conditions: 'partly cloudy',
            icon: '⛅'
          }],
          alerts: [],
          confidence_score: 0.5,
          last_updated: new Date()
        });
        setWeatherImpact({
          outdoor_events: 'low',
          guest_comfort: 'comfortable',
          equipment_risk: 'none',
          recommended_actions: ['Weather service unavailable - using default recommendations']
        });
      }
    };

    loadWeatherForecast();
  }, [event.start_at]);

  // Calculate totals
  useEffect(() => {
    const cost = selectedItems.reduce((sum, item) => sum + (item.qty * (catalog.find(c => c.id === item.catalog_item_id)?.cost || 0)), 0);
    const price = selectedItems.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);
    const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
    
    setTotalCost(cost);
    setTotalPrice(price);
    setMarginPercent(margin);
  }, [selectedItems, catalog]);

  // Filter catalog items
  const filteredCatalog = catalog.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleDragStart = (item: CatalogItem) => {
    draggedItemRef.current = { item, quantity: 1 };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedItemRef.current) {
      addItemToEvent(draggedItemRef.current.item, draggedItemRef.current.quantity);
      draggedItemRef.current = null;
    }
  };

  const addItemToEvent = (item: CatalogItem, quantity: number = 1) => {
    const newLineItem: LineItem = {
      id: `line_${Date.now()}`,
      parent_id: event.id,
      parent_type: 'event',
      catalog_item_id: item.id,
      calc_rule: { type: 'per_person' },
      qty: item.type === 'FB' ? event.expected_guests * quantity : quantity,
      unit: item.unit,
      unit_price: item.price,
      taxes: [],
      service_charges: [],
      gl_code: item.gl_code,
      notes: '',
      catalog_item: item
    };

    setSelectedItems(prev => [...prev, newLineItem]);
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateItemQuantity = (itemId: string, newQty: number) => {
    setSelectedItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, qty: Math.max(0, newQty) } : item
      )
    );
  };

  const generateBEO = (variant: 'ClientFacing' | 'Kitchen' | 'FOH' | 'Vendor') => {
    console.log(`Generating ${variant} BEO...`);
    // Implementation would create PDF and update BEO records
  };

  const getWeatherIcon = () => {
    if (!weatherForecast) return <Cloud className="h-4 w-4" />;
    
    const currentHour = weatherForecast.hourly_forecast[0];
    if (currentHour.precipitation_probability > 70) return <CloudRain className="h-4 w-4" />;
    if (currentHour.wind_speed > 25) return <Wind className="h-4 w-4" />;
    return <Sun className="h-4 w-4" />;
  };

  const getItemIcon = (type: string) => {
    const icons = {
      'FB': <Utensils className="h-4 w-4" />,
      'AV': <Zap className="h-4 w-4" />,
      'DECOR': <Palette className="h-4 w-4" />,
      'RENTAL': <Truck className="h-4 w-4" />,
      'FEE': <Calculator className="h-4 w-4" />
    };
    return icons[type as keyof typeof icons] || <FileText className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              EchoScope BEO/REO Builder
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered banquet event order creation with real-time weather intelligence
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import Menu
            </Button>
            <Button size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export BEO
            </Button>
          </div>
        </div>

        {/* Event Overview Card */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {event.name}
                  <Badge className={cn(
                    event.status === 'definite' ? 'bg-green-100 text-green-800' :
                    event.status === 'hold' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-gray-100 text-gray-800'
                  )}>
                    {event.status}
                  </Badge>
                </CardTitle>
                <CardDescription className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {event.start_at.toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {event.start_at.toLocaleTimeString()} - {event.end_at.toLocaleTimeString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {event.expected_guests} guests
                  </span>
                </CardDescription>
              </div>
              
              {/* Weather Widget */}
              {weatherForecast && (
                <Card className="w-64">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getWeatherIcon()}
                        <span className="font-medium">
                          {weatherForecast.hourly_forecast[0]?.temperature}°C
                        </span>
                      </div>
                      <Badge className={cn(
                        weatherImpact?.outdoor_events === 'low' ? 'bg-green-100 text-green-800' :
                        weatherImpact?.outdoor_events === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        weatherImpact?.outdoor_events === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      )}>
                        {weatherImpact?.outdoor_events} risk
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {weatherForecast.hourly_forecast[0]?.precipitation_probability}% chance of rain
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Weather Alert */}
        {weatherImpact && weatherImpact.outdoor_events !== 'low' && (
          <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800 dark:text-orange-200">Weather Consideration</AlertTitle>
            <AlertDescription className="text-orange-700 dark:text-orange-300">
              {weatherImpact.recommended_actions[0]}
              {weatherImpact.recommended_actions.length > 1 && (
                <Button variant="link" size="sm" className="p-0 h-auto text-orange-600 ml-2">
                  View all recommendations
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="builder">Builder</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="outputs">Outputs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Builder Tab */}
          <TabsContent value="builder" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Catalog Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Utensils className="h-5 w-5" />
                    Catalog Items
                  </CardTitle>
                  <div className="space-y-2">
                    <Input
                      placeholder="Search catalog..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Items</SelectItem>
                        <SelectItem value="FB">Food & Beverage</SelectItem>
                        <SelectItem value="AV">Audio Visual</SelectItem>
                        <SelectItem value="DECOR">Decorations</SelectItem>
                        <SelectItem value="RENTAL">Rentals</SelectItem>
                        <SelectItem value="FEE">Fees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {filteredCatalog.map(item => (
                        <Card 
                          key={item.id}
                          className="cursor-grab hover:shadow-md transition-shadow"
                          draggable
                          onDragStart={() => handleDragStart(item)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2">
                                {getItemIcon(item.type)}
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">{item.name}</h4>
                                  <p className="text-xs text-muted-foreground">{item.description}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">{item.type}</Badge>
                                    <span className="text-xs font-medium">${item.price}</span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => addItemToEvent(item)}
                                className="h-6 w-6 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Event Builder Panel */}
              <Card>
                <CardHeader>
                  <CardTitle>Event Builder</CardTitle>
                  <CardDescription>Drag items here or click + to add</CardDescription>
                </CardHeader>
                <CardContent>
                  <div 
                    className="min-h-64 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 space-y-2"
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {selectedItems.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Drag catalog items here to build your event</p>
                      </div>
                    ) : (
                      selectedItems.map(item => (
                        <Card key={item.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getItemIcon(item.catalog_item?.type || '')}
                              <div>
                                <h5 className="font-medium text-sm">{item.catalog_item?.name}</h5>
                                <p className="text-xs text-muted-foreground">
                                  ${item.unit_price} × {item.qty} = ${(item.unit_price * item.qty).toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateItemQuantity(item.id, item.qty - 1)}
                                className="h-6 w-6 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm">{item.qty}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateItemQuantity(item.id, item.qty + 1)}
                                className="h-6 w-6 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeItem(item.id)}
                                className="h-6 w-6 p-0 ml-2"
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Finance Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Live Totals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Cost:</span>
                      <span className="font-medium">${totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Price:</span>
                      <span className="font-medium">${totalPrice.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Gross Margin:</span>
                      <span className={cn(
                        "font-medium",
                        marginPercent > 30 ? "text-green-600" : 
                        marginPercent > 20 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {marginPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Per Person:</span>
                      <span className="font-medium">
                        ${event.expected_guests > 0 ? (totalPrice / event.expected_guests).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Generate BEO Variants</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateBEO('ClientFacing')}
                        className="text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Client BEO
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateBEO('Kitchen')}
                        className="text-xs"
                      >
                        <Utensils className="h-3 w-3 mr-1" />
                        Kitchen BEO
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateBEO('FOH')}
                        className="text-xs"
                      >
                        <Users className="h-3 w-3 mr-1" />
                        FOH BEO
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateBEO('Vendor')}
                        className="text-xs"
                      >
                        <Truck className="h-3 w-3 mr-1" />
                        Vendor PO
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Event Timeline & Functions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Timeline storyboard coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Finance Tab */}
          <TabsContent value="finance">
            <Card>
              <CardHeader>
                <CardTitle>Financial Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Gross Margin</p>
                          <p className="text-xl font-bold">{marginPercent.toFixed(1)}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Total Revenue</p>
                          <p className="text-xl font-bold">${totalPrice.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Per Person</p>
                          <p className="text-xl font-bold">
                            ${event.expected_guests > 0 ? (totalPrice / event.expected_guests).toFixed(2) : '0.00'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Outputs Tab */}
          <TabsContent value="outputs">
            <Card>
              <CardHeader>
                <CardTitle>BEO Outputs & Documentation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">PDF generation and export options coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Event Settings & Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Event configuration options coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
