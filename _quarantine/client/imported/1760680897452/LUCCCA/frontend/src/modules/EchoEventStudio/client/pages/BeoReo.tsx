import Layout from "@/components/Layout";
import MoveablePanel from "@/components/MoveablePanel";
import MenuParser from "@/components/MenuParser";
import MenuToBeoGenerator from "@/components/MenuToBeoGenerator";
import EnhancedMenuParser from "@/components/EnhancedMenuParser";
import EnhancedBeoGenerator from "@/components/EnhancedBeoGenerator";
import PersistentAIAssistant from "@/components/PersistentAIAssistant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  MessageSquare,
  Search,
  Filter,
  Plus,
  FileText,
  Clock,
  Users,
  DollarSign,
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle,
  Edit,
  Download,
  Send,
  Eye,
  Building2,
  ChefHat,
  Upload,
  Settings,
  BarChart3,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { Menu } from "@shared/menu-types";

interface BeoReoItem {
  id: number;
  type: 'BEO' | 'REO';
  eventNumber: string;
  eventName: string;
  guestCount: number;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  department: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  client: string;
  contactPerson: string;
  email: string;
  phone: string;
  totalValue: number;
  requirements: string[];
  setupInstructions: string;
  specialRequests: string;
  assignedStaff: string[];
  approvedBy?: string;
  createdDate: string;
  lastModified: string;
}

const sampleBeoReoItems: BeoReoItem[] = [
  {
    id: 1,
    type: 'BEO',
    eventNumber: 'BEO-2024-001',
    eventName: 'Corporate Leadership Summit',
    guestCount: 250,
    date: '2024-01-15',
    startTime: '09:00',
    endTime: '17:00',
    venue: 'Grand Ballroom A',
    department: 'Main Ballroom',
    status: 'approved',
    client: 'TechCorp Inc.',
    contactPerson: 'Sarah Johnson',
    email: 'sarah@techcorp.com',
    phone: '+1 (555) 123-4567',
    totalValue: 45000,
    requirements: ['AV Equipment', 'Stage Setup', 'Premium Catering', 'Security', 'Valet Parking'],
    setupInstructions: 'Setup begins at 6:00 AM. Stage must be positioned center with AV booth in back-left corner.',
    specialRequests: 'VIP green room needed. Lactose-free meal options for 15 guests.',
    assignedStaff: ['John Smith (Event Manager)', 'Maria Garcia (Catering)', 'David Kim (AV Tech)', 'Lisa Wang (Security)'],
    approvedBy: 'William Morrison',
    createdDate: '2024-01-01',
    lastModified: '2024-01-14'
  },
  {
    id: 2,
    type: 'REO',
    eventNumber: 'REO-2024-002',
    eventName: 'Tech Innovation Conference',
    guestCount: 180,
    date: '2024-01-16',
    startTime: '14:00',
    endTime: '18:00',
    venue: 'Conference Hall B',
    department: 'Conference Center',
    status: 'pending_approval',
    client: 'Global Events Ltd.',
    contactPerson: 'Michael Chen',
    email: 'm.chen@globalevents.com',
    phone: '+1 (555) 987-6543',
    totalValue: 78000,
    requirements: ['Tech Setup', 'Live Streaming', 'Networking Space', 'Coffee Stations'],
    setupInstructions: 'Room setup in classroom style. Live streaming equipment needs ethernet connection.',
    specialRequests: 'Need high-speed internet for 200 concurrent users. Recording equipment required.',
    assignedStaff: ['Alex Thompson (Event Coordinator)', 'Sarah Lee (Tech Support)', 'Mike Rodriguez (Catering)'],
    createdDate: '2024-01-05',
    lastModified: '2024-01-13'
  },
  {
    id: 3,
    type: 'BEO',
    eventNumber: 'BEO-2024-003',
    eventName: 'Wedding Reception',
    guestCount: 120,
    date: '2024-01-18',
    startTime: '18:00',
    endTime: '23:00',
    venue: 'Rose Garden Pavilion',
    department: 'Garden Pavilion',
    status: 'in_progress',
    client: 'Luxury Weddings Co.',
    contactPerson: 'Emily Rodriguez',
    email: 'emily@luxuryweddings.com',
    phone: '+1 (555) 456-7890',
    totalValue: 32000,
    requirements: ['Floral Design', 'Wedding Catering', 'DJ Setup', 'Photography Space', 'Bridal Suite'],
    setupInstructions: 'Ceremony setup at 3:00 PM. Reception flip at 6:30 PM. Garden lights activated at sunset.',
    specialRequests: 'Gluten-free wedding cake. Late-night snack service. Designated smoking area.',
    assignedStaff: ['Jennifer Brown (Wedding Coordinator)', 'Carlos Martinez (Catering)', 'Amy Wilson (Florals)'],
    approvedBy: 'William Morrison',
    createdDate: '2024-01-02',
    lastModified: '2024-01-15'
  }
];

export default function BeoReo() {
  const [items, setItems] = useState<BeoReoItem[]>(sampleBeoReoItems);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<BeoReoItem | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showEnhancedAI, setShowEnhancedAI] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const [selectedMenuItems, setSelectedMenuItems] = useState<string[]>([]);
  const [persistedMenus, setPersistedMenus] = useState<any[]>([]);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.eventNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.client.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    const matchesType = filterType === "all" || item.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'pending_approval': return 'bg-yellow-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-purple-500';
      case 'cancelled': return 'bg-red-500';
      case 'draft': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'pending_approval': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <AlertCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'draft': return <Edit className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleMenuCreated = (menu: Menu) => {
    setMenus(prev => [...prev, menu]);
    setPersistedMenus(prev => [...prev, menu]);
    setShowSuccessAlert(true);
    setTimeout(() => setShowSuccessAlert(false), 5000);
  };

  const handleMenuSelected = (menu: any, selectedItems: string[]) => {
    setSelectedMenu(menu);
    setSelectedMenuItems(selectedItems);
    setShowSuccessAlert(true);
    setTimeout(() => setShowSuccessAlert(false), 5000);
  };

  const toggleAdvancedMode = () => {
    setIsAdvancedMode(!isAdvancedMode);
  };

  const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
  const approvedItems = items.filter(item => item.status === 'approved').length;
  const pendingApproval = items.filter(item => item.status === 'pending_approval').length;
  const inProgress = items.filter(item => item.status === 'in_progress').length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Success Alert */}
        {showSuccessAlert && (
          <Alert className="glass-panel border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>
              {selectedMenu ?
                `Menu "${selectedMenu.name}" selected with ${selectedMenuItems.length} items. Ready for BEO/REO generation.` :
                'Your menu has been parsed and is now available for use in BEO/REO creation.'
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">BEO/REO Management</h1>
            <p className="text-muted-foreground mt-2">
              Banquet Event Orders and Room Event Orders with comprehensive menu and outlet management
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              className="apple-button"
              onClick={toggleAdvancedMode}
            >
              <Settings className="h-4 w-4 mr-2" />
              {isAdvancedMode ? 'Simple' : 'Advanced'} Mode
            </Button>
            <EnhancedMenuParser
              onMenuCreated={handleMenuCreated}
              onMenuSelected={handleMenuSelected}
              persistedMenus={persistedMenus}
            />
            <EnhancedBeoGenerator
              selectedMenu={selectedMenu}
              selectedItems={selectedMenuItems}
              onBeoGenerated={(beo) => {
                console.log('Legal BEO Generated:', beo);
                setShowSuccessAlert(true);
                setTimeout(() => setShowSuccessAlert(false), 5000);
              }}
            />
            <Button variant="outline" size="sm" className="apple-button">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="apple-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Create BEO/REO
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New BEO/REO</DialogTitle>
                  <DialogDescription>
                    Create a comprehensive event order for department coordination
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Order Type</Label>
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
                      <Label htmlFor="eventName">Event Name</Label>
                      <Input id="eventName" placeholder="Corporate Conference" />
                    </div>
                  </div>

                  {isAdvancedMode && (
                    <div className="space-y-2">
                      <Label htmlFor="menu-select">Select Menu (Optional)</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose from parsed menus..." />
                        </SelectTrigger>
                        <SelectContent>
                          {menus.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No menus available - Parse a menu first
                            </SelectItem>
                          ) : (
                            menus.map(menu => (
                              <SelectItem key={menu.id} value={menu.id}>
                                <div className="flex items-center">
                                  <ChefHat className="h-4 w-4 mr-2" />
                                  {menu.name} ({menu.type})
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Event Date</Label>
                      <Input id="date" type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input id="startTime" type="time" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">End Time</Label>
                      <Input id="endTime" type="time" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="venue">Event Space</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select event space" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ballroom-a">Grand Ballroom A (300 seated)</SelectItem>
                          <SelectItem value="ballroom-b">Grand Ballroom B (250 seated)</SelectItem>
                          <SelectItem value="conference-a">Conference Hall A (150 seated)</SelectItem>
                          <SelectItem value="conference-b">Conference Hall B (100 seated)</SelectItem>
                          <SelectItem value="garden">Rose Garden Pavilion (120 seated)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guests">Guest Count</Label>
                      <Input id="guests" type="number" placeholder="150" />
                    </div>
                  </div>

                  {isAdvancedMode && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="outlet">Primary Outlet</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select outlet" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="main-kitchen">Main Kitchen</SelectItem>
                            <SelectItem value="pastry-kitchen">Pastry & Dessert Kitchen</SelectItem>
                            <SelectItem value="bar-service">Bar Service</SelectItem>
                            <SelectItem value="room-service">Room Service</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="service-style">Service Style</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Service style" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="plated">Plated Service</SelectItem>
                            <SelectItem value="buffet">Buffet Style</SelectItem>
                            <SelectItem value="family">Family Style</SelectItem>
                            <SelectItem value="stations">Food Stations</SelectItem>
                            <SelectItem value="cocktail">Cocktail Reception</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="client">Client Company</Label>
                    <Input id="client" placeholder="Acme Corporation" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-person">Contact Person</Label>
                      <Input id="contact-person" placeholder="John Smith" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Contact Email</Label>
                      <Input id="contact-email" type="email" placeholder="john@company.com" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requirements">Special Requirements & Setup Instructions</Label>
                    <Textarea
                      id="requirements"
                      placeholder="AV equipment, dietary restrictions, setup requirements, special requests..."
                      rows={3}
                    />
                  </div>

                  {isAdvancedMode && (
                    <div className="space-y-2">
                      <Label htmlFor="budget">Estimated Budget</Label>
                      <Input id="budget" type="number" placeholder="5000" />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(false)}>Create Order</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Overview */}
        <div className={`grid grid-cols-1 gap-6 ${isAdvancedMode ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold text-foreground">${(totalValue / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-green-500">Active orders</p>
                  </div>
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Approved</p>
                    <p className="text-2xl font-bold text-foreground">{approvedItems}</p>
                    <p className="text-xs text-green-500">Ready to execute</p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Approval</p>
                    <p className="text-2xl font-bold text-foreground">{pendingApproval}</p>
                    <p className="text-xs text-yellow-500">Needs review</p>
                  </div>
                  <Clock className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-bold text-foreground">{inProgress}</p>
                    <p className="text-xs text-blue-500">Active events</p>
                  </div>
                  <AlertCircle className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          {isAdvancedMode && (
            <MoveablePanel className="glass-panel">
              <Card className="bg-transparent border-none shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Menus</p>
                      <p className="text-2xl font-bold text-foreground">{menus.length}</p>
                      <p className="text-xs text-green-500">Available for use</p>
                    </div>
                    <ChefHat className="h-6 w-6 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </MoveablePanel>
          )}
        </div>

        {/* Filters */}
        <MoveablePanel className="glass-panel p-4 rounded-xl">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by event name, number, or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50 border-2 border-border/50 hover:border-primary/30 focus:border-primary/50 transition-all duration-200"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32 bg-background/50 border-2 border-border/50 hover:border-primary/30 transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="BEO">BEO Only</SelectItem>
                  <SelectItem value="REO">REO Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 bg-background/50 border-2 border-border/50 hover:border-primary/30 transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_approval">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </MoveablePanel>

        {/* BEO/REO Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <MoveablePanel key={item.id} className="glass-panel">
              <Card className="bg-transparent border-none shadow-none h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge
                          variant="outline"
                          className={
                            item.type === "BEO"
                              ? "bg-blue-500 text-white border-blue-500"
                              : "bg-purple-500 text-white border-purple-500"
                          }
                        >
                          {item.eventNumber}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="flex items-center space-x-1"
                        >
                          {getStatusIcon(item.status)}
                          <span className="capitalize">{item.status.replace('_', ' ')}</span>
                        </Badge>
                      </div>
                      <CardTitle className="text-lg leading-tight">{item.eventName}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {item.client} • {item.venue}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-2 text-muted-foreground" />
                      {new Date(item.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-2 text-muted-foreground" />
                      {item.startTime} - {item.endTime}
                    </div>
                    <div className="flex items-center">
                      <Users className="h-3 w-3 mr-2 text-muted-foreground" />
                      {item.guestCount} guests
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-3 w-3 mr-2 text-muted-foreground" />
                      ${item.totalValue.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <div className="flex items-center mb-1">
                      <Building2 className="h-3 w-3 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Contact:</span>
                    </div>
                    <div className="ml-5 text-foreground">{item.contactPerson}</div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {item.requirements.slice(0, 3).map((req, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {req}
                      </Badge>
                    ))}
                    {item.requirements.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{item.requirements.length - 3}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedItem(item)}
                      className="apple-button"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button size="sm" variant="outline" className="apple-button">
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </MoveablePanel>
          ))}
        </div>

        {/* Detailed View Dialog */}
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="glass-panel max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedItem && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-2xl">{selectedItem.eventName}</DialogTitle>
                      <DialogDescription className="text-lg mt-1">
                        {selectedItem.eventNumber} • {selectedItem.client}
                      </DialogDescription>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge
                          variant="outline"
                          className={
                            selectedItem.type === "BEO"
                              ? "bg-blue-500 text-white border-blue-500"
                              : "bg-purple-500 text-white border-purple-500"
                          }
                        >
                          {selectedItem.type}
                        </Badge>
                        <Badge variant="secondary" className="capitalize">
                          {selectedItem.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                      <Button size="sm">
                        <Send className="h-4 w-4 mr-2" />
                        Send to Departments
                      </Button>
                    </div>
                  </div>
                </DialogHeader>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="requirements">Requirements</TabsTrigger>
                    <TabsTrigger value="staff">Staff & Departments</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium">Event Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date & Time:</span>
                            <span>{selectedItem.date} | {selectedItem.startTime} - {selectedItem.endTime}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Venue:</span>
                            <span>{selectedItem.venue}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Department:</span>
                            <span>{selectedItem.department}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Guest Count:</span>
                            <span>{selectedItem.guestCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Value:</span>
                            <span className="font-bold text-green-500">${selectedItem.totalValue.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-medium">Contact Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Client:</span>
                            <span>{selectedItem.client}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Contact Person:</span>
                            <span>{selectedItem.contactPerson}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <span>{selectedItem.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Phone:</span>
                            <span>{selectedItem.phone}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h4 className="font-medium mb-2">Setup Instructions</h4>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                        {selectedItem.setupInstructions}
                      </p>
                    </div>
                    
                    {selectedItem.specialRequests && (
                      <div>
                        <h4 className="font-medium mb-2">Special Requests</h4>
                        <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                          {selectedItem.specialRequests}
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="requirements" className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedItem.requirements.map((req, index) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-muted/20 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{req}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="staff" className="space-y-4 mt-6">
                    <div className="space-y-3">
                      {selectedItem.assignedStaff.map((staff, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm">{staff}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="timeline" className="space-y-4 mt-6">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">Created</div>
                          <div className="text-xs text-muted-foreground">{selectedItem.createdDate}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg">
                        <Edit className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">Last Modified</div>
                          <div className="text-xs text-muted-foreground">{selectedItem.lastModified}</div>
                        </div>
                      </div>
                      {selectedItem.approvedBy && (
                        <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="text-sm font-medium">Approved by {selectedItem.approvedBy}</div>
                            <div className="text-xs text-muted-foreground">Ready for execution</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
                
                <DialogFooter className="mt-6">
                  <Button variant="outline" onClick={() => setSelectedItem(null)}>
                    Close
                  </Button>
                  <Button>
                    <Send className="h-4 w-4 mr-2" />
                    Send to All Departments
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

    </Layout>
  );
}
