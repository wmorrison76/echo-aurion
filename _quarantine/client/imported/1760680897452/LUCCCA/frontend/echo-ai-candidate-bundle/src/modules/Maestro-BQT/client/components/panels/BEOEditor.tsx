// @ts-nocheck
/**
 * BEO Editor Component - Maestro Banquets
 * Based on Banquet Event Order template and GIO manifest requirements
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Save, FileText, Calendar, Users, Clock, DollarSign, Printer, Eye, Edit3, Check, X, Truck, MapPin, ChefHat, MessageSquare, BarChart3, Target } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription } from '../ui/alert';
import { cn } from '../../lib/utils';
import type { BEODocument, BEOHeader, BEOEvent, BEOMenu, BEOBeverage, BEOSetup, BEOMenuItem, BEOBeverageItem } from '../../types/beo';
import { BEOMessaging } from './BEOMessaging';
import { PrepLogicService, DEFAULT_COURSE_STRUCTURE, SAMPLE_RECIPES } from '../../services/prep-logic';

interface BEOEditorProps {
  eventId?: string;
  beoId?: string;
  onSave?: (beo: BEODocument) => void;
  onClose?: () => void;
  mode?: 'create' | 'edit' | 'view';
}

// Sample BEO template based on the provided image
const createSampleBEO = (): BEODocument => ({
  id: `beo-${Date.now()}`,
  version: 1,
  status: 'draft',
  header: {
    account: 'Smith Wedding',
    postAs: 'Smith Reception',
    eventName: 'Smith-Johnson Wedding Reception',
    eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next week
    contact: 'Emily Smith (Bride)',
    onSite: 'John Smith (Groom)',
    cateringSrc: 'Maestro Banquets',
    paymentType: 'credit_card',
  },
  event: {
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '6:45 PM - 12:00 AM',
    room: 'Arrabelle Ballrooms',
    function: 'WEDDING',
    setup: 'RECEPTION',
    expected: 90,
    guaranteed: 87,
    rental: 2500,
  },
  menu: {
    timeline: {
      guestSeating: '7:00pm - Guests begin taking their seats',
      serviceStart: '7:25pm - Emcee announces Bridal Party',
      buffetInstructions: 'Guests dine off buffet at their leisure (emcee to let guests know to go to buffet when they would like)',
    },
    items: [
      {
        id: 'organic-greens-salad',
        category: 'salad',
        course: 2,
        name: 'Preset Salads, Bread & Butter',
        description: '90 person Organic Greens, Baby Tomatoes, Grilled Red Onions & Lemon Olive Oil',
        price: 9.00,
        quantity: 90,
        notes: 'Dressing served on the side',
        recipe: SAMPLE_RECIPES['organic-greens-salad']
      },
      {
        id: 'rocky-mountain-taco-bar',
        category: 'entree',
        course: 3,
        name: 'Rocky Mountain Taco Bar',
        description: 'Build Your Own - BBQ Duck, Venison & Seafood with soft tortillas, salsa, guacamole',
        price: 25.00,
        quantity: 90,
        notes: '7:15-8:30pm Buffet & Carving Stations Open',
        recipe: SAMPLE_RECIPES['rocky-mountain-taco-bar']
      },
      {
        id: 'passed-canapes',
        category: 'appetizer',
        course: 1,
        name: 'Passed Canapés Selection',
        description: 'Assorted bite-sized appetizers passed during cocktail hour',
        price: 4.50,
        quantity: 180, // 2 per person
        notes: 'Served during cocktail hour'
      },
      {
        id: 'seasonal-vegetables',
        category: 'other',
        course: 4,
        name: 'Seasonal Roasted Vegetables',
        description: 'Chef\'s selection of seasonal vegetables, roasted with herbs',
        price: 6.00,
        quantity: 90,
        notes: 'Vegetarian option'
      },
      {
        id: 'wedding-cake',
        category: 'dessert',
        course: 5,
        name: 'Wedding Cake Service',
        description: 'Three-tier wedding cake with cutting ceremony',
        price: 8.00,
        quantity: 90,
        notes: 'Includes cake cutting ceremony at 9:30pm'
      }
    ],
    specialInstructions: ['Bridal table gets first service', 'Wedding cake cutting at 9:30pm'],
  },
  beverage: {
    room: 'Arrabelle Ballrooms',
    barType: 'Premium',
    consumption: 'hosted',
    domesticBeer: ['Coors Light', 'Budweiser'],
    importedBeer: ['Corona', 'Stella Artois'],
    wine: ['William Hill Chardonnay - $48.00', 'Kim Crawford Sauvignon Blanc - $42.00', 'La Crema Pinot Noir - $57.00'],
    cocktails: ['Signature Bride Cocktail: Gruet Sparkling with pomegranate sugar cube - $10.00', 'Groom Signature: Crown Royal & Diet Coke - $10.00'],
    nonAlcoholic: ['Assorted Sodas - $3.50', 'Premium Coffee Service'],
  },
  setup: {
    room: 'Arrabelle Ballrooms',
    layout: 'Round tables with sweetheart table',
    capacity: 90,
    tables: [
      { id: '1', seats: 8, type: 'round' },
      { id: '2', seats: 8, type: 'round' },
      { id: '3', seats: 8, type: 'round' },
      { id: '4', seats: 8, type: 'round' },
      { id: '5', seats: 8, type: 'round' },
      { id: '6', seats: 8, type: 'round' },
      { id: '7', seats: 8, type: 'round' },
      { id: '8', seats: 8, type: 'round' },
      { id: '9', seats: 8, type: 'round' },
      { id: '10', seats: 8, type: 'round' },
      { id: '11', seats: 8, type: 'round' },
      { id: 'head', seats: 2, type: 'sweetheart' }
    ],
    linens: { color: 'ivory', type: 'premium' },
    centerpieces: 'Seasonal floral arrangements with candles',
    audioVisual: ['Wireless microphone system', 'DJ sound system', 'Uplighting'],
    lighting: 'Romantic ambient with pin spots',
    specialRequests: ['Dance floor setup', 'Wedding cake table', 'Gift table'],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'current_user',
});

const BEOHeaderSection: React.FC<{
  header: BEOHeader;
  onChange: (header: BEOHeader) => void;
  readonly?: boolean;
}> = ({ header, onChange, readonly = false }) => {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Banquet Event Order
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="account">Account:</Label>
                <Input
                  id="account"
                  value={header.account || ''}
                  onChange={(e) => onChange({ ...header, account: e.target.value })}
                  readOnly={readonly}
                  placeholder="Client/Account name"
                  className={!header.account && !readonly ? "border-orange-300" : ""}
                />
              </div>
              <div>
                <Label htmlFor="postAs">Post As:</Label>
                <Input
                  id="postAs"
                  value={header.postAs || ''}
                  onChange={(e) => onChange({ ...header, postAs: e.target.value })}
                  readOnly={readonly}
                  placeholder="Billing designation"
                />
              </div>
              <div>
                <Label htmlFor="eventName">Event Name:</Label>
                <Input
                  id="eventName"
                  value={header.eventName || ''}
                  onChange={(e) => onChange({ ...header, eventName: e.target.value })}
                  readOnly={readonly}
                  placeholder="e.g., Smith Wedding Reception"
                  className={!header.eventName && !readonly ? "border-orange-300" : ""}
                />
              </div>
              <div>
                <Label htmlFor="paymentType">Payment Type:</Label>
                <Select
                  value={header.paymentType || ''}
                  onValueChange={(value) => onChange({ ...header, paymentType: value })}
                  disabled={readonly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="eventDate">Event Date:</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={header.eventDate || ''}
                  onChange={(e) => onChange({ ...header, eventDate: e.target.value })}
                  readOnly={readonly}
                  className={!header.eventDate && !readonly ? "border-orange-300" : ""}
                />
              </div>
              <div>
                <Label htmlFor="contact">Contact:</Label>
                <Input
                  id="contact"
                  value={header.contact || ''}
                  onChange={(e) => onChange({ ...header, contact: e.target.value })}
                  readOnly={readonly}
                  placeholder="Primary contact person"
                  className={!header.contact && !readonly ? "border-orange-300" : ""}
                />
              </div>
              <div>
                <Label htmlFor="onSite">On-Site:</Label>
                <Input
                  id="onSite"
                  value={header.onSite || ''}
                  onChange={(e) => onChange({ ...header, onSite: e.target.value })}
                  readOnly={readonly}
                  placeholder="On-site contact"
                />
              </div>
              <div>
                <Label htmlFor="cateringSrc">Catering Src:</Label>
                <Input
                  id="cateringSrc"
                  value={header.cateringSrc || ''}
                  onChange={(e) => onChange({ ...header, cateringSrc: e.target.value })}
                  readOnly={readonly}
                  placeholder="Catering source"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const BEOEventDetailsSection: React.FC<{
  event: BEOEvent;
  onChange: (event: BEOEvent) => void;
  readonly?: boolean;
}> = ({ event, onChange, readonly = false }) => {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Event Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-2 text-left">Date</th>
                <th className="border border-border p-2 text-left">Time</th>
                <th className="border border-border p-2 text-left">Room</th>
                <th className="border border-border p-2 text-left">Function</th>
                <th className="border border-border p-2 text-left">Set-up</th>
                <th className="border border-border p-2 text-left">EXP</th>
                <th className="border border-border p-2 text-left">GTD</th>
                <th className="border border-border p-2 text-left">Rental</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border p-2">
                  <Input
                    type="date"
                    value={event.date}
                    onChange={(e) => onChange({ ...event, date: e.target.value })}
                    readOnly={readonly}
                    className="border-0 bg-transparent"
                  />
                </td>
                <td className="border border-border p-2">
                  <Input
                    value={event.time}
                    onChange={(e) => onChange({ ...event, time: e.target.value })}
                    readOnly={readonly}
                    placeholder="6:45 PM - 12:00 AM"
                    className="border-0 bg-transparent"
                  />
                </td>
                <td className="border border-border p-2">
                  <Input
                    value={event.room}
                    onChange={(e) => onChange({ ...event, room: e.target.value })}
                    readOnly={readonly}
                    placeholder="Arrabelle Ballrooms"
                    className="border-0 bg-transparent"
                  />
                </td>
                <td className="border border-border p-2">
                  <Input
                    value={event.function}
                    onChange={(e) => onChange({ ...event, function: e.target.value })}
                    readOnly={readonly}
                    placeholder="WEDD"
                    className="border-0 bg-transparent"
                  />
                </td>
                <td className="border border-border p-2">
                  <Input
                    value={event.setup}
                    onChange={(e) => onChange({ ...event, setup: e.target.value })}
                    readOnly={readonly}
                    placeholder="SPEC"
                    className="border-0 bg-transparent"
                  />
                </td>
                <td className="border border-border p-2">
                  <Input
                    type="number"
                    value={event.expected}
                    onChange={(e) => onChange({ ...event, expected: parseInt(e.target.value) || 0 })}
                    readOnly={readonly}
                    className="border-0 bg-transparent"
                  />
                </td>
                <td className="border border-border p-2">
                  <Input
                    type="number"
                    value={event.guaranteed}
                    onChange={(e) => onChange({ ...event, guaranteed: parseInt(e.target.value) || 0 })}
                    readOnly={readonly}
                    className="border-0 bg-transparent"
                  />
                </td>
                <td className="border border-border p-2">
                  <Input
                    type="number"
                    value={event.rental || ''}
                    onChange={(e) => onChange({ ...event, rental: parseInt(e.target.value) || undefined })}
                    readOnly={readonly}
                    className="border-0 bg-transparent"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

const BEOMenuSection: React.FC<{
  menu: BEOMenu;
  onChange: (menu: BEOMenu) => void;
  readonly?: boolean;
}> = ({ menu, onChange, readonly = false }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Menu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Guest Seating Timeline:</Label>
              <Textarea
                value={menu.timeline?.guestSeating || ''}
                onChange={(e) => onChange({
                  ...menu,
                  timeline: { ...menu.timeline, guestSeating: e.target.value }
                })}
                readOnly={readonly}
                placeholder="7pm- Guests begin taking their seats"
                className="min-h-[60px]"
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Service Instructions:</Label>
              <Textarea
                value={menu.timeline?.buffetInstructions || ''}
                onChange={(e) => onChange({
                  ...menu,
                  timeline: { ...menu.timeline, buffetInstructions: e.target.value }
                })}
                readOnly={readonly}
                placeholder="Guests dine off buffet at their leisure..."
                className="min-h-[80px]"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Menu Items</h4>
              {!readonly && (
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="p-3 border rounded-lg bg-muted/30">
                <div className="font-medium">**PRESET SALADS, BREAD & BUTTER**</div>
                <div className="text-sm text-muted-foreground mt-1">
                  90 person Organic Greens, Baby Tomatoes, Grilled Red Onions & Lemon Olive Oil @ $9.00 each
                </div>
                <div className="text-xs text-muted-foreground italic">(dressing served on the side)</div>
              </div>
              
              <div className="p-3 border rounded-lg bg-muted/30">
                <div className="font-medium">7:15-8:30pm Buffet & Carving Stations Open</div>
                <div className="text-sm text-muted-foreground mt-1">
                  90 person ROCKY MOUNTAIN TACO BAR @ $25.00 per person<br/>
                  Build Your Own
                </div>
              </div>
              
              <div className="p-3 border rounded-lg bg-muted/30">
                <div className="font-medium">BBQ Duck, Venison & Seafood</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Soft Tortillas, Tomato Salsa, Pico de Gallo, Guacamole, Limes, Spicy Slaw, Cotija Cheese, Cilantro Sour Cream
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Beverage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Room:</Label>
            <Input
              value={menu.timeline?.guestSeating?.split(' ')[0] || 'Arrabelle Ballrooms'}
              readOnly
              className="bg-muted/30"
            />
          </div>
          
          <div className="space-y-3">
            <div className="p-3 border rounded-lg bg-muted/30">
              <div className="font-medium">Hosted Premium Bar, based on consumption</div>
              <div className="text-sm text-muted-foreground mt-2">
                Assorted Sodas @ $3.50<br/>
                Domestic Beer @ $5.00 each<br/>
                Imported & Microbrew Beer @ $6.00 each<br/>
                William Hill Chardonnay @ $48.00 per bottle<br/>
                Kim Crawford Sauvignon Blanc @ $42.00 per bottle<br/>
                La Crema Pinot Noir @ $57.00 per bottle<br/>
                William Hill Cabernet Sauvignon @ $65.00 per bottle<br/>
                Gruet Sparkling Wine @ $44.00 per bottle
              </div>
            </div>
            
            <div className="p-3 border rounded-lg bg-muted/30">
              <div className="font-medium">Premium Cocktails:</div>
              <div className="text-sm text-muted-foreground mt-1">
                Glenlivet Single Malt Scotch, Bombay Sapphire Gin, Grey Goose Vodka, Sauza Hornitos Tequila, Maker's Mark Bourbon, Ten Cane Rum, Dewar's Royal Whiskey @ $9.50 each
              </div>
            </div>
            
            <div className="p-3 border rounded-lg bg-muted/30">
              <div className="font-medium">Signature Cocktails:</div>
              <div className="text-sm text-muted-foreground mt-1">
                Bride Signature Cocktail: Gruet Sparkling Wine served with a pomegranate soaked sugar cube @ $10.00 each<br/>
                Margarita @ $10.00 each<br/>
                Groom Signature Cocktail: Crown Royal & Diet Coke @ $10.00 each
              </div>
            </div>
          </div>
          
          <div className="text-center text-sm text-muted-foreground italic border-t pt-3">
            **wine service with dinner**
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const BEOSetupSection: React.FC<{
  setup: BEOSetup;
  onChange: (setup: BEOSetup) => void;
  readonly?: boolean;
}> = ({ setup, onChange, readonly = false }) => {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Setup
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <div className="text-lg font-medium text-muted-foreground">Setup Details</div>
          <div className="text-sm text-muted-foreground mt-2">
            Table arrangements, linens, centerpieces, A/V equipment, and special setup requirements will be detailed here.
          </div>
          {!readonly && (
            <Button variant="outline" className="mt-4">
              <Edit3 className="h-4 w-4 mr-2" />
              Configure Setup
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const BEOEditor: React.FC<BEOEditorProps> = ({
  eventId,
  beoId,
  onSave,
  onClose,
  mode = 'create'
}) => {
  const [beo, setBeo] = useState<BEODocument>(() => createSampleBEO());
  const [activeTab, setActiveTab] = useState('header');
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [messagingMinimized, setMessagingMinimized] = useState(false);

  const readonly = mode === 'view';
  const routerLocation = useLocation();

  useEffect(() => {
    if (beoId && mode !== 'create') {
      // Load existing BEO
      setIsLoading(true);
      // TODO: Fetch BEO from API
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    } else if (mode === 'create' && eventId) {
      // Pre-fill BEO with event data when creating from calendar
      const searchParams = new URLSearchParams(routerLocation.search || '');
      const sourceEventId = searchParams.get('eventId') || eventId;

      if (sourceEventId) {
        // In a real app, this would fetch from the store or API
        // For now, we'll use sample event data that matches the BEO
        const sampleEventData = {
          title: 'Johnson Anniversary Celebration',
          date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          time: '6:00 PM - 10:00 PM',
          room: 'Garden Terrace',
          guestCount: 60,
          type: 'anniversary',
          clientName: 'Robert & Margaret Johnson',
          clientContact: 'Margaret Johnson',
          salesRep: 'Sarah Williams'
        };

        setBeo(prev => ({
          ...prev,
          header: {
            ...prev.header,
            eventName: sampleEventData.title,
            eventDate: sampleEventData.date,
            contact: sampleEventData.clientContact,
            account: sampleEventData.clientName,
            postAs: `${sampleEventData.type} celebration`,
          },
          event: {
            ...prev.event,
            date: sampleEventData.date,
            time: sampleEventData.time,
            room: sampleEventData.room,
            function: sampleEventData.type.toUpperCase(),
            expected: sampleEventData.guestCount,
            guaranteed: sampleEventData.guestCount,
          },
          beverage: {
            ...prev.beverage,
            room: sampleEventData.room,
          },
          setup: {
            ...prev.setup,
            room: sampleEventData.room,
            capacity: sampleEventData.guestCount,
          }
        }));
      }
    }
  }, [beoId, mode, eventId]);

  // Auto-save functionality
  useEffect(() => {
    if (!isDirty || readonly || isLoading) return;

    const autoSaveTimer = setTimeout(() => {
      handleSave();
    }, 30000); // Auto-save after 30 seconds of inactivity

    return () => clearTimeout(autoSaveTimer);
  }, [isDirty, beo, readonly, isLoading]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updatedBeo = {
        ...beo,
        updatedAt: new Date().toISOString(),
      };
      
      // TODO: Save to API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setBeo(updatedBeo);
      setIsDirty(false);
      onSave?.(updatedBeo);
    } catch (error) {
      console.error('Failed to save BEO:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateBEO = (updates: Partial<BEODocument>) => {
    setBeo(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  // Generate prep schedule and cart system
  const generatePrepSchedule = () => {
    const dailyPrepCounts = PrepLogicService.calculateDailyPrepCounts(beo);
    const speedRacks = PrepLogicService.generateSpeedRacks(beo);
    const staffingRequirements = PrepLogicService.calculateStaffingRequirements(dailyPrepCounts);

    updateBEO({
      prepSchedule: {
        dailyPrepCounts,
        totalPrepDays: dailyPrepCounts.length,
        criticalPath: ['organic-greens-salad', 'rocky-mountain-taco-bar'], // Example
        staffingRequirements
      },
      cart: {
        speedRacks,
        firingLocations: [],
        cartNumberPrefix: `SR-${beo.id.split('-').pop()?.slice(-3) || '001'}`,
        courseStructure: DEFAULT_COURSE_STRUCTURE
      }
    });
  };

  // Auto-generate prep schedule when menu items change
  useEffect(() => {
    if (beo.menu.items.length > 0) {
      generatePrepSchedule();
    }
  }, [beo.menu.items, beo.event.guaranteed]);

  const getStatusBadge = (status: BEODocument['status']) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, label: 'Draft' },
      pending: { variant: 'default' as const, label: 'Pending' },
      confirmed: { variant: 'default' as const, label: 'Confirmed' },
      in_prep: { variant: 'default' as const, label: 'In Prep' },
      execution: { variant: 'destructive' as const, label: 'Execution' },
      closed: { variant: 'outline' as const, label: 'Closed' },
    };
    
    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading BEO...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Information */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusBadge(beo.status)}
          {isDirty && (
            <Badge variant="outline" className="text-orange-600">
              Unsaved Changes
            </Badge>
          )}
          <span className="text-muted-foreground">
            {beo.header.eventName || 'Untitled Event'} �� Version {beo.version}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMessaging(!showMessaging)}
            className={showMessaging ? "bg-primary/10 border-primary" : ""}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {showMessaging ? 'Hide' : 'Show'} Communication
          </Button>

          {isDirty && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Now'}
            </Button>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="header">Header & Event</TabsTrigger>
          <TabsTrigger value="menu">Menu & Beverage</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="header" className="space-y-6">
          <BEOHeaderSection
            header={beo.header}
            onChange={(header) => updateBEO({ header })}
            readonly={readonly}
          />
          <BEOEventDetailsSection
            event={beo.event}
            onChange={(event) => updateBEO({ event })}
            readonly={readonly}
          />
        </TabsContent>

        <TabsContent value="menu" className="space-y-6">
          <BEOMenuSection
            menu={beo.menu}
            onChange={(menu) => updateBEO({ menu })}
            readonly={readonly}
          />
        </TabsContent>

        <TabsContent value="setup" className="space-y-6">
          <BEOSetupSection
            setup={beo.setup}
            onChange={(setup) => updateBEO({ setup })}
            readonly={readonly}
          />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Prep Schedule by Course */}
            <div className="space-y-6">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Daily Prep Schedule by Course
                  </CardTitle>
                  {!readonly && (
                    <Button size="sm" variant="outline" onClick={generatePrepSchedule}>
                      <Target className="h-4 w-4 mr-2" />
                      Regenerate Schedule
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {beo.prepSchedule?.dailyPrepCounts.map((dayCount, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-medium">
                            {new Date(dayCount.date).toLocaleDateString()} - Course {dayCount.course}
                          </div>
                          <Badge variant="outline">
                            {DEFAULT_COURSE_STRUCTURE[dayCount.course - 1]?.name}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          {dayCount.items.map((item, itemIndex) => {
                            const recipe = SAMPLE_RECIPES[item.recipeId];
                            return (
                              <div key={itemIndex} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                                <div>
                                  <div className="font-medium">{item.menuItemId.replace(/-/g, ' ')}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Qty: {item.targetQuantity} | Est: {Math.ceil(item.estimatedTimeMinutes / 60)}h
                                    {recipe && ` | Skill Level: ${recipe.skillRequired}`}
                                  </div>
                                </div>
                                <Badge variant={item.status === 'completed' ? 'default' : 'outline'}>
                                  {item.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-3 pt-3 border-t border-border/50">
                          <div className="flex justify-between text-sm">
                            <span>Total Time Required:</span>
                            <span className="font-medium">{Math.ceil(dayCount.totalTimeRequired / 60)} hours</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Efficiency Target:</span>
                            <span className="font-medium">{(dayCount.efficiency * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {(!beo.prepSchedule || beo.prepSchedule.dailyPrepCounts.length === 0) && (
                      <div className="text-center p-6 text-muted-foreground">
                        <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No prep schedule generated yet</p>
                        <p className="text-sm">Add menu items to generate prep schedule</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Staffing Requirements */}
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Calculated Staffing Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {beo.prepSchedule?.staffingRequirements.map((staffReq, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">
                            {new Date(staffReq.date).toLocaleDateString()} - Course {staffReq.course}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {staffReq.totalHours}h total
                          </div>
                        </div>

                        <div className="space-y-2">
                          {staffReq.requiredStaff.map((staff, staffIndex) => (
                            <div key={staffIndex} className="flex items-center justify-between text-sm">
                              <div>
                                <span className="font-medium">{staff.role}</span>
                                <span className="text-muted-foreground ml-2">
                                  (Skill Level {staff.skillLevel})
                                </span>
                              </div>
                              <div className="text-right">
                                <div>{staff.count} × {staff.hoursNeeded}h</div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {staffReq.criticalTasks.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <div className="text-xs text-orange-600">
                              Critical: {staffReq.criticalTasks.join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Course-Based Cart System */}
            <div className="space-y-6">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Course-Based Speed Rack System
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {beo.cart?.cartNumberPrefix || `SR-${beo.id?.slice(-3) || '001'}`}
                        </div>
                        <div className="text-xs text-muted-foreground">Cart Number Prefix</div>
                      </div>
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-2xl font-bold text-secondary">
                          {beo.cart?.speedRacks?.length || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Speed Racks</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Speed Rack Assignments by Course:</h4>

                      {DEFAULT_COURSE_STRUCTURE.map((courseInfo) => {
                        const courseRacks = beo.cart?.speedRacks?.filter(rack => rack.course === courseInfo.courseNumber) || [];

                        return (
                          <div key={courseInfo.courseNumber} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium text-sm">
                                Course {courseInfo.courseNumber}: {courseInfo.name}
                              </div>
                              <Badge variant="outline">{courseRacks.length} racks</Badge>
                            </div>

                            {courseRacks.map((rack, rackIndex) => (
                              <div key={rackIndex} className="ml-4 mb-2 p-2 bg-muted/30 rounded text-xs">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">{rack.rackNumber}</div>
                                    <div className="text-muted-foreground">
                                      {rack.items.length} items • {rack.location}
                                    </div>
                                    <div className="text-muted-foreground">
                                      Est: {Math.ceil(rack.estimatedPrepTime / 60)}h
                                    </div>
                                  </div>
                                  <Badge variant={rack.status === 'ready' ? 'default' : 'outline'} className="text-xs">
                                    {rack.status}
                                  </Badge>
                                </div>

                                <div className="mt-2 space-y-1">
                                  {rack.items.map((item, itemIndex) => (
                                    <div key={itemIndex} className="text-muted-foreground">
                                      • {item.menuItemId.replace(/-/g, ' ')} (×{item.quantity})
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}

                            {courseRacks.length === 0 && (
                              <div className="ml-4 text-sm text-muted-foreground italic">
                                No items assigned to this course
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {!readonly && (
                      <Button size="sm" variant="outline" className="w-full" onClick={generatePrepSchedule}>
                        <Plus className="h-4 w-4 mr-2" />
                        Regenerate Cart System
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recipe Analysis & Truth Statements */}
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5" />
                    Recipe Analysis & Logic Rules
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {beo.menu.items.map((item, index) => {
                      const recipe = item.recipe || SAMPLE_RECIPES[item.id];
                      if (!recipe) return null;

                      const analysis = PrepLogicService.analyzeRecipePrepRequirements(
                        recipe,
                        item.quantity || beo.event.guaranteed,
                        new Date(beo.event.date)
                      );

                      return (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="font-medium text-sm mb-2">{item.name}</div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <div className="text-muted-foreground">Prep Time:</div>
                              <div>{Math.ceil(analysis.totalPrepTime / 60)} hours</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Required Staff:</div>
                              <div>{analysis.requiredStaff} people</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Complexity:</div>
                              <div>Level {recipe.complexity}/5</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Scaling:</div>
                              <div>{analysis.scalingFactor.toFixed(2)}x</div>
                            </div>
                          </div>

                          {recipe.truthStatements && recipe.truthStatements.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <div className="text-xs font-medium mb-1">Active Logic Rules:</div>
                              {recipe.truthStatements.map((truth, truthIndex) => (
                                <div key={truthIndex} className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-1 rounded">
                                  {truth.description}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="mt-2 pt-2 border-t border-border/50">
                            <div className="text-xs font-medium mb-1">Prep Schedule:</div>
                            {analysis.prepDays.map((prepDay, dayIndex) => (
                              <div key={dayIndex} className="text-xs text-muted-foreground">
                                {prepDay.date.toLocaleDateString()}: {prepDay.estimatedHours}h ({prepDay.tasks.length} tasks)
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {beo.menu.items.length === 0 && (
                      <div className="text-center p-4 text-muted-foreground">
                        <ChefHat className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No recipes to analyze</p>
                        <p className="text-sm">Add menu items to see recipe analysis</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Precision Notice */}
      <Alert>
        <AlertDescription>
          <strong>GIO Precision Standard:</strong> This BEO operates under Maestro Banquets' .00005 precision requirement.
          All timing, portions, and costs are optimized for orchestral coordination across all systems.
        </AlertDescription>
      </Alert>

      {/* BEO Communication Panel */}
      {showMessaging && (
        <BEOMessaging
          beoId={beo.id}
          eventId={eventId}
          echoCrmEventId={(beo as any).echoCrmEventId}
          createdByUserId={(beo as any).salesRepId || (beo as any).createdBy}
          isMinimized={messagingMinimized}
          onToggleMinimize={() => setMessagingMinimized(!messagingMinimized)}
          onClose={() => setShowMessaging(false)}
          className="mt-6"
        />
      )}
    </div>
  );
};

export default BEOEditor;
