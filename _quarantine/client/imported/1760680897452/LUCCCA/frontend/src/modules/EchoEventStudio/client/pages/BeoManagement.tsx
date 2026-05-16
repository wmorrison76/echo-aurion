import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge, StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Upload,
  FileText,
  Download,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Calendar,
  DollarSign,
  ChefHat,
  Utensils,
  Settings,
  Send,
  Copy,
  Printer,
  FileIcon,
  Zap,
  Target,
  TrendingUp,
  PieChart,
  BarChart3,
  Search,
  Filter,
  SortAsc,
  MoreVertical,
  MessageSquare,
  Bell,
  RefreshCw,
  ExternalLink,
  Paperclip,
  MapPin,
  Phone,
  Mail,
  Home,
  Shield
} from 'lucide-react';
import { 
  Project, 
  BEO, 
  Quote, 
  QuoteLine, 
  LeadStatus, 
  EventStatus, 
  BeoStatus, 
  ItemCategory,
  Client,
  Venue 
} from '@shared/beo-types';

interface BeoManagementProps {
  venueId?: string;
  projectId?: string;
}

const statusColors = {
  // Lead Status
  cold: 'bg-gray-500/20 text-gray-700 dark:text-gray-300',
  warm: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
  qualified: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  proposal: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
  negotiation: 'bg-orange-500/20 text-orange-700 dark:text-orange-300',
  won: 'bg-green-500/20 text-green-700 dark:text-green-300',
  lost: 'bg-red-500/20 text-red-700 dark:text-red-300',
  
  // Event Status
  tentative: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
  'in-progress': 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  confirmed: 'bg-green-500/20 text-green-700 dark:text-green-300',
  completed: 'bg-gray-500/20 text-gray-700 dark:text-gray-300',
  cancelled: 'bg-red-500/20 text-red-700 dark:text-red-300',
  
  // BEO Status
  draft: 'bg-gray-500/20 text-gray-700 dark:text-gray-300',
  'pending-approval': 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
  approved: 'bg-green-500/20 text-green-700 dark:text-green-300',
  final: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  executed: 'bg-purple-500/20 text-purple-700 dark:text-purple-300'
};

const categoryIcons = {
  food: ChefHat,
  beverage: Utensils,
  av: Settings,
  floral: Users,
  rental: Settings,
  labor: Users,
  fee: DollarSign
};

export default function BeoManagement({ venueId = 'venue_1', projectId }: BeoManagementProps) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [beos, setBeos] = useState<BEO[]>([]);
  const [selectedBeo, setSelectedBeo] = useState<BEO | null>(null);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateBeoOpen, setIsCreateBeoOpen] = useState(false);
  const [isDocumentUploadOpen, setIsDocumentUploadOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'pipeline' | 'calendar' | 'list'>('pipeline');
  const [isMenuViewerOpen, setIsMenuViewerOpen] = useState(false);
  const [uploadedMenus, setUploadedMenus] = useState<any[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Outlet configuration
  const outlets = [
    {
      id: 'main_restaurant',
      name: 'Main Restaurant',
      hours: { open: '06:00', close: '22:00' },
      type: 'restaurant',
      canUpdateMenu: true
    },
    {
      id: 'bar_lounge',
      name: 'Bar & Lounge',
      hours: { open: '16:00', close: '02:00' },
      type: 'bar',
      canUpdateMenu: true
    },
    {
      id: 'banquet',
      name: 'Banquet Services',
      hours: { open: '00:00', close: '23:59' },
      type: 'banquet',
      canUpdateMenu: true,
      isDefault: true
    },
    {
      id: 'room_service',
      name: 'Room Service',
      hours: { open: '06:00', close: '23:00' },
      type: 'room_service',
      canUpdateMenu: true
    },
    {
      id: 'coffee_shop',
      name: 'Coffee Shop',
      hours: { open: '05:30', close: '14:00' },
      type: 'cafe',
      canUpdateMenu: true
    }
  ];

  // Sample data
  useEffect(() => {
    const sampleProjects: Project[] = [
      {
        id: 'proj_1',
        venueId: 'venue_1',
        clientId: 'client_1',
        name: 'Corporate Annual Gala',
        description: 'Annual corporate celebration with dinner and awards ceremony',
        eventDate: '2024-02-15',
        eventTime: '18:00',
        endTime: '23:00',
        guestCount: 200,
        leadStatus: 'qualified',
        eventStatus: 'tentative',
        priority: 'high',
        budget: 50000,
        estimatedRevenue: 45000,
        assignedTo: ['coord_1', 'chef_1'],
        createdAt: '2024-01-10T09:00:00Z',
        updatedAt: '2024-01-15T14:30:00Z',
        timeline: [],
        requirements: {
          menuStyle: 'plated',
          serviceStyle: 'full-service',
          specialDietary: ['vegetarian', 'gluten-free'],
          avNeeds: ['microphones', 'projector', 'sound system'],
          decorRequests: ['centerpieces', 'uplighting'],
          specialRequests: ['photo booth', 'live music'],
          setupNotes: 'Setup starts at 3 PM',
          breakdownNotes: 'Breakdown after midnight'
        },
        contacts: [],
        documents: [],
        notes: [],
        tags: ['corporate', 'gala', 'awards']
      },
      {
        id: 'proj_2',
        venueId: 'venue_1',
        clientId: 'client_2',
        name: 'Wedding Reception',
        description: 'Elegant wedding reception for 150 guests',
        eventDate: '2024-03-20',
        eventTime: '17:00',
        endTime: '24:00',
        guestCount: 150,
        leadStatus: 'proposal',
        eventStatus: 'in-progress',
        priority: 'medium',
        budget: 35000,
        estimatedRevenue: 32000,
        assignedTo: ['coord_2'],
        createdAt: '2024-01-05T10:00:00Z',
        updatedAt: '2024-01-18T11:00:00Z',
        timeline: [],
        requirements: {
          menuStyle: 'plated',
          serviceStyle: 'full-service',
          specialDietary: ['vegan'],
          avNeeds: ['dj setup', 'dance lighting'],
          decorRequests: ['floral arrangements', 'draping'],
          specialRequests: ['wedding cake', 'champagne toast'],
          setupNotes: 'Ceremony setup at 4 PM',
          breakdownNotes: 'Extended breakdown until 2 AM'
        },
        contacts: [],
        documents: [],
        notes: [],
        tags: ['wedding', 'reception', 'celebration']
      }
    ];

    const sampleBeos: BEO[] = [
      {
        id: 'beo_1',
        projectId: 'proj_1',
        venueId: 'venue_1',
        version: 1,
        status: 'pending-approval',
        title: 'Corporate Annual Gala - BEO v1.0',
        description: 'Comprehensive event details for corporate gala',
        eventDate: '2024-02-15',
        guestCount: 200,
        setupStyle: 'Theater with rounds',
        serviceStyle: 'Plated service',
        timeline: [
          {
            time: '15:00',
            duration: 120,
            activity: 'Setup and preparation',
            department: 'Operations',
            location: 'Main Ballroom',
            assignedTo: ['setup_team']
          },
          {
            time: '17:30',
            duration: 30,
            activity: 'Guest arrival and cocktails',
            department: 'Service',
            location: 'Foyer',
            assignedTo: ['service_team']
          }
        ],
        lines: [
          {
            id: 'line_1',
            category: 'food',
            name: 'Caesar Salad',
            description: 'Romaine lettuce, parmesan, croutons',
            quantity: 200,
            unit: 'per_person',
            unitPrice: 12.50,
            totalPrice: 2500,
            isOptional: false,
            departmentCode: 'KITCHEN',
            allergens: ['dairy'],
            dietary: ['vegetarian']
          }
        ],
        pricing: {
          subtotal: 35000,
          serviceCharge: 7000,
          serviceChargePercent: 20,
          tax: 3360,
          taxPercent: 8,
          gratuity: 0,
          gratuityPercent: 0,
          adminFee: 500,
          discount: 0,
          discountPercent: 0,
          total: 45860,
          deposit: 9172,
          depositPercent: 20,
          balance: 36688
        },
        terms: {
          paymentTerms: 'Net 30',
          cancellationPolicy: '72 hours notice required',
          changePolicy: 'Changes accepted up to 48 hours before event',
          setupTime: '3:00 PM',
          breakdownTime: '12:00 AM',
          overtime: '$100 per hour',
          minimumGuarantee: 180,
          finalCountDeadline: '72 hours prior',
          specialTerms: []
        },
        approvals: [],
        revisions: [],
        attachments: [],
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        createdBy: 'coord_1',
        beoNumber: 'BEO-2024-001',
        kitchenNotes: {
          prepTime: '2 hours before service',
          cookingInstructions: ['Grill chicken to 165°F', 'Prepare salads fresh'],
          platingInstructions: ['Use white dinner plates', 'Garnish with fresh herbs'],
          allergenAlerts: ['Contains dairy in caesar dressing'],
          specialEquipment: ['Grill station', 'Salad prep station'],
          staffingNeeds: 4,
          temperatureRequirements: ['Hot items at 140°F+', 'Cold items at 40°F-']
        },
        serviceNotes: {
          serviceFlow: ['Cocktail service 5:30-6:30', 'Dinner service 7:00-9:00'],
          stationSetup: ['Bar station in foyer', 'Service station in ballroom'],
          serverInstructions: ['Use formal service style', 'Coordinate wine pairings'],
          beverageService: ['Wine service with dinner', 'Coffee service with dessert'],
          specialRequests: ['VIP table service first', 'Photo coordination'],
          uniformRequirements: 'Black formal attire',
          staffingLevels: [
            {
              role: 'Server',
              count: 8,
              startTime: '17:00',
              endTime: '23:00',
              specialSkills: ['wine service', 'formal dining']
            }
          ]
        },
        setupNotes: {
          setupStart: '15:00',
          setupDuration: 180,
          breakdownStart: '23:30',
          breakdownDuration: 120,
          equipmentList: [
            {
              name: 'Round tables (60")',
              quantity: 20,
              supplier: 'In-house',
              deliveryTime: '14:00',
              specialInstructions: 'White linens, formal place settings'
            }
          ],
          roomConfiguration: 'Theater style with 20 round tables',
          decorativeElements: ['Centerpieces on each table', 'Uplighting around perimeter'],
          lightingRequirements: ['Dimmed ambient lighting', 'Spotlighting for presentations'],
          climateRequirements: '68-72°F throughout event'
        },
        avRequirements: {
          audioSystem: ['Wireless microphones (4)', 'Main sound system'],
          videoSystem: ['Projector and screen', 'Video switching'],
          lightingSystem: ['Uplighting', 'Pin spotting'],
          staging: ['18x24 stage with skirting'],
          powerRequirements: ['Additional power for AV', '20 amp circuits'],
          internetRequirements: 'High-speed WiFi for streaming',
          techRehearsal: '2:00 PM day of event',
          onSiteTech: true
        },
        floorPlan: {
          id: 'floor_1',
          name: 'Corporate Gala Layout',
          roomLayout: 'Theater with rounds',
          tableConfiguration: [
            {
              tableNumber: 1,
              shape: 'round',
              seating: 10,
              position: { x: 100, y: 100 },
              specialNeeds: [],
              vipTable: true
            }
          ],
          totalSeating: 200,
          accessibility: ['Wheelchair accessible tables', 'Clear pathways'],
          emergencyExits: ['Main entrance', 'Emergency exit east side'],
          diagramUrl: '/floor-plans/beo_1_layout.pdf',
          lastUpdated: '2024-01-15T14:00:00Z'
        },
        executionChecklist: [
          {
            id: 'task_1',
            time: '15:00',
            task: 'Begin room setup',
            assignedTo: 'setup_team',
            department: 'Operations',
            status: 'pending',
            priority: 'high',
            dependencies: [],
            estimatedDuration: 60
          },
          {
            id: 'task_2',
            time: '16:00',
            task: 'Kitchen prep begins',
            assignedTo: 'kitchen_team',
            department: 'Culinary',
            status: 'pending',
            priority: 'high',
            dependencies: ['task_1'],
            estimatedDuration: 120
          }
        ]
      }
    ];

    setProjects(sampleProjects);
    setBeos(sampleBeos);
    
    if (projectId) {
      const project = sampleProjects.find(p => p.id === projectId);
      if (project) {
        setSelectedProject(project);
      }
    }
  }, [projectId]);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || project.leadStatus === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!selectedOutlet) {
      alert('Please select an outlet before uploading a menu.');
      return;
    }

    const file = files[0];
    setUploadProgress(0);

    // Simulate upload progress with realistic stages
    const stages = [
      { progress: 20, message: 'Uploading file...' },
      { progress: 40, message: 'Processing document...' },
      { progress: 60, message: 'Extracting menu items...' },
      { progress: 80, message: 'Analyzing pricing...' },
      { progress: 100, message: 'Upload complete!' }
    ];

    let currentStage = 0;

    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setUploadProgress(stages[currentStage].progress);
        currentStage++;
      } else {
        clearInterval(interval);

        // Simulate processed menu data
        const processedMenu = {
          id: `menu_${Date.now()}`,
          fileName: file.name,
          outletId: selectedOutlet,
          outletName: outlets.find(o => o.id === selectedOutlet)?.name,
          effectiveDate: new Date().toISOString().split('T')[0],
          uploadedAt: new Date().toISOString(),
          isActive: true,
          categories: [
            {
              name: 'Appetizers',
              items: [
                { name: 'Caesar Salad', price: 12.50, description: 'Romaine lettuce, parmesan, croutons' },
                { name: 'Bruschetta', price: 10.00, description: 'Toasted bread with tomato and basil' }
              ]
            },
            {
              name: 'Main Courses',
              items: [
                { name: 'Grilled Salmon', price: 28.00, description: 'Fresh Atlantic salmon with vegetables' },
                { name: 'Beef Tenderloin', price: 35.00, description: 'Prime cut with seasonal sides' }
              ]
            }
          ],
          specialNotes: 'Menu processed automatically. Please review for accuracy.',
          version: '1.0'
        };

        // Add to uploaded menus
        setUploadedMenus(prev => [...prev, processedMenu]);

        // Close upload dialog and open menu viewer
        setTimeout(() => {
          setIsDocumentUploadOpen(false);
          setUploadProgress(0);
          setSelectedMenu(processedMenu);
          setIsMenuViewerOpen(true);
        }, 1000);
      }
    }, 500);

    // In production, this would upload to server and process with OCR
    console.log('Processing menu upload:', { fileName: file.name, outlet: selectedOutlet });
  };

  const generateBEO = async (projectId: string) => {
    console.log('Generating BEO for project:', projectId);
    
    // Simulate BEO generation
    const newBeo: Partial<BEO> = {
      id: `beo_${Date.now()}`,
      projectId,
      venueId,
      version: 1,
      status: 'draft',
      title: `${selectedProject?.name} - BEO v1.0`,
      description: 'Auto-generated BEO from project requirements',
      eventDate: selectedProject?.eventDate || '',
      guestCount: selectedProject?.guestCount || 0,
      setupStyle: 'Standard setup',
      serviceStyle: selectedProject?.requirements.serviceStyle || 'full-service',
      timeline: [],
      lines: [],
      pricing: {
        subtotal: 0,
        serviceCharge: 0,
        serviceChargePercent: 20,
        tax: 0,
        taxPercent: 8,
        gratuity: 0,
        gratuityPercent: 0,
        adminFee: 0,
        discount: 0,
        discountPercent: 0,
        total: 0,
        deposit: 0,
        depositPercent: 20,
        balance: 0
      },
      terms: {
        paymentTerms: 'Net 30',
        cancellationPolicy: '72 hours notice required',
        changePolicy: 'Changes accepted up to 48 hours before event',
        setupTime: '3:00 PM',
        breakdownTime: '12:00 AM',
        overtime: '$100 per hour',
        minimumGuarantee: Math.floor((selectedProject?.guestCount || 0) * 0.9),
        finalCountDeadline: '72 hours prior',
        specialTerms: []
      },
      approvals: [],
      revisions: [],
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'current_user'
    };

    // Add to BEOs list
    setBeos(prev => [...prev, newBeo as BEO]);
  };

  const exportBEO = (beo: BEO, format: 'client' | 'kitchen' | 'ops') => {
    console.log(`Exporting ${format} BEO for:`, beo.title);
    // In production, this would generate and download PDF
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return Clock;
      case 'pending-approval': return AlertTriangle;
      case 'approved': return CheckCircle;
      case 'final': return CheckCircle;
      case 'executed': return CheckCircle;
      default: return Clock;
    }
  };

  const getPipelineStageProjects = (stage: LeadStatus) => {
    return filteredProjects.filter(p => p.leadStatus === stage);
  };

  const pipelineStages: { stage: LeadStatus; title: string; color: string }[] = [
    { stage: 'cold', title: 'Cold Leads', color: 'border-gray-300' },
    { stage: 'warm', title: 'Warm Leads', color: 'border-yellow-300' },
    { stage: 'qualified', title: 'Qualified', color: 'border-blue-300' },
    { stage: 'proposal', title: 'Proposal', color: 'border-purple-300' },
    { stage: 'negotiation', title: 'Negotiation', color: 'border-orange-300' },
    { stage: 'won', title: 'Won', color: 'border-green-300' }
  ];

  return (
    <Layout>
      <div className="space-y-6">
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
          <span className="text-foreground font-medium">BEO/REO Management</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">BEO/REO Management</h1>
            <p className="text-muted-foreground">Complete event planning from lead to execution</p>
          </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setIsDocumentUploadOpen(true)}
            variant="outline"
            className="apple-button"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Menu
          </Button>
          <Button
            onClick={() => setIsCreateProjectOpen(true)}
            className="apple-button bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* View Mode Selector */}
      <Card className="glass-panel">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="view-mode">View:</Label>
                <Select value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
                  <SelectTrigger className="w-32 apple-button">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel">
                    <SelectItem value="pipeline">Pipeline</SelectItem>
                    <SelectItem value="calendar">Calendar</SelectItem>
                    <SelectItem value="list">List</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 apple-button"
                />
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32 apple-button">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="glass-panel">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="apple-button">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" className="apple-button">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline/Projects Column */}
        <div className="lg:col-span-2 space-y-6">
          {viewMode === 'pipeline' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pipelineStages.map(({ stage, title, color }) => {
                const stageProjects = getPipelineStageProjects(stage);
                return (
                  <Card key={stage} className={cn("glass-panel border-t-4", color)}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        {title} ({stageProjects.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {stageProjects.map(project => (
                        <div
                          key={project.id}
                          onClick={() => setSelectedProject(project)}
                          className={cn(
                            "p-3 rounded-lg border border-border/50 cursor-pointer transition-all hover:border-primary/30",
                            selectedProject?.id === project.id && "border-primary/50 bg-primary/5"
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm">{project.name}</h4>
                            <Badge className={cn("text-xs", statusColors[project.priority as keyof typeof statusColors])}>
                              {project.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{project.description}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span>{project.guestCount} guests</span>
                            <span>${project.budget.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span>{new Date(project.eventDate).toLocaleDateString()}</span>
                            <Badge className={cn("text-xs", statusColors[project.eventStatus])}>
                              {project.eventStatus}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {stageProjects.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          <div className="text-xs">No projects in this stage</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {viewMode === 'calendar' && (
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Calendar View
                </CardTitle>
                <CardDescription>
                  Monthly calendar view of all projects and events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center font-medium text-muted-foreground text-sm">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 35 }, (_, i) => {
                    const date = new Date();
                    date.setDate(1 - date.getDay() + i);
                    const dayEvents = filteredProjects.filter(project =>
                      new Date(project.eventDate).toDateString() === date.toDateString()
                    );
                    const isCurrentMonth = date.getMonth() === new Date().getMonth();
                    const isToday = date.toDateString() === new Date().toDateString();

                    return (
                      <div
                        key={i}
                        className={cn(
                          "min-h-[80px] p-1 border border-border/30 rounded transition-all",
                          isCurrentMonth ? "bg-background" : "bg-muted/20",
                          isToday && "border-primary bg-primary/5",
                          dayEvents.length > 0 && "cursor-pointer hover:bg-muted/30"
                        )}
                      >
                        <div className={cn(
                          "text-xs font-medium mb-1",
                          isCurrentMonth ? "text-foreground" : "text-muted-foreground",
                          isToday && "text-primary font-bold"
                        )}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map(project => (
                            <div
                              key={project.id}
                              onClick={() => setSelectedProject(project)}
                              className={cn(
                                "text-xs p-1 rounded truncate cursor-pointer transition-all",
                                statusColors[project.eventStatus],
                                "hover:opacity-80"
                              )}
                              title={`${project.name} - ${project.guestCount} guests`}
                            >
                              {project.name}
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
                  })}
                </div>
                <div className="flex items-center justify-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30"></div>
                    <span className="text-muted-foreground">Confirmed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/30"></div>
                    <span className="text-muted-foreground">In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/30"></div>
                    <span className="text-muted-foreground">Tentative</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {viewMode === 'list' && (
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>All Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredProjects.map(project => (
                    <div
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      className={cn(
                        "p-4 rounded-lg border border-border/50 cursor-pointer transition-all hover:border-primary/30",
                        selectedProject?.id === project.id && "border-primary/50 bg-primary/5"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{project.name}</h3>
                            <Badge className={cn("text-xs", statusColors[project.leadStatus])}>
                              {project.leadStatus}
                            </Badge>
                            <Badge className={cn("text-xs", statusColors[project.eventStatus])}>
                              {project.eventStatus}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{project.description}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Date:</span>
                              <div>{new Date(project.eventDate).toLocaleDateString()}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Guests:</span>
                              <div>{project.guestCount}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Budget:</span>
                              <div>${project.budget.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Revenue:</span>
                              <div>${project.estimatedRevenue.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="apple-button">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="apple-button">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Project Details & BEO Management */}
        <div className="space-y-6">
          {selectedProject ? (
            <>
              {/* Project Details */}
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Project Details</span>
                    <Button
                      onClick={() => generateBEO(selectedProject.id)}
                      size="sm"
                      className="apple-button bg-primary hover:bg-primary/90"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Generate BEO
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedProject.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedProject.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Event Date:</span>
                      <div className="font-medium">{new Date(selectedProject.eventDate).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time:</span>
                      <div className="font-medium">{selectedProject.eventTime} - {selectedProject.endTime}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Guest Count:</span>
                      <div className="font-medium">{selectedProject.guestCount}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Budget:</span>
                      <div className="font-medium">${selectedProject.budget.toLocaleString()}</div>
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground text-sm">Status:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={cn("text-xs", statusColors[selectedProject.leadStatus])}>
                        {selectedProject.leadStatus}
                      </Badge>
                      <Badge className={cn("text-xs", statusColors[selectedProject.eventStatus])}>
                        {selectedProject.eventStatus}
                      </Badge>
                      <Badge className={cn("text-xs", statusColors[selectedProject.priority as keyof typeof statusColors])}>
                        {selectedProject.priority}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground text-sm">Requirements:</span>
                    <div className="mt-1 space-y-1">
                      <div className="text-sm">Menu: {selectedProject.requirements.menuStyle}</div>
                      <div className="text-sm">Service: {selectedProject.requirements.serviceStyle}</div>
                      {selectedProject.requirements.specialDietary.length > 0 && (
                        <div className="text-sm">
                          Dietary: {selectedProject.requirements.specialDietary.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="apple-button flex-1">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="apple-button flex-1">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Notes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* BEOs for Selected Project */}
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle>BEO Documents</CardTitle>
                  <CardDescription>Event execution documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {beos
                      .filter(beo => beo.projectId === selectedProject.id)
                      .map(beo => {
                        const StatusIcon = getStatusIcon(beo.status);
                        return (
                          <div
                            key={beo.id}
                            className="p-3 border border-border/50 rounded-lg glass-panel hover:border-primary/30 transition-all"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <StatusIcon className="h-4 w-4" />
                                <h4 className="font-medium text-sm">{beo.title}</h4>
                              </div>
                              <Badge className={cn("text-xs", statusColors[beo.status])}>
                                {beo.status}
                              </Badge>
                            </div>
                            
                            <div className="text-xs text-muted-foreground mb-2">
                              Version {beo.version} • ${beo.pricing.total.toLocaleString()}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="apple-button text-xs h-7"
                                onClick={() => exportBEO(beo, 'client')}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Client
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="apple-button text-xs h-7"
                                onClick={() => exportBEO(beo, 'kitchen')}
                              >
                                <ChefHat className="h-3 w-3 mr-1" />
                                Kitchen
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="apple-button text-xs h-7"
                                onClick={() => exportBEO(beo, 'ops')}
                              >
                                <Settings className="h-3 w-3 mr-1" />
                                Ops
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    
                    {beos.filter(beo => beo.projectId === selectedProject.id).length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No BEO documents yet</p>
                        <Button
                          onClick={() => generateBEO(selectedProject.id)}
                          size="sm"
                          className="mt-2 apple-button"
                        >
                          Generate First BEO
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="glass-panel">
              <CardContent className="p-6 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">Select a project to view details and manage BEO documents</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Document Upload Dialog */}
      <Dialog open={isDocumentUploadOpen} onOpenChange={setIsDocumentUploadOpen}>
        <DialogContent className="glass-panel max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Menu Document</DialogTitle>
            <DialogDescription>
              Upload a menu document and assign it to an outlet with operating hours
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Outlet Selection */}
            <div className="space-y-3">
              <Label htmlFor="outlet-select">Select Outlet</Label>
              <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                <SelectTrigger className="apple-button">
                  <SelectValue placeholder="Choose an outlet for this menu" />
                </SelectTrigger>
                <SelectContent className="glass-panel">
                  {outlets.map(outlet => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{outlet.name}</span>
                        <div className="text-xs text-muted-foreground ml-4">
                          {outlet.hours.open} - {outlet.hours.close}
                          {outlet.isDefault && ' (Default for events)'}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedOutlet && (
                <div className="p-3 bg-muted/20 rounded-lg">
                  <div className="text-sm font-medium">
                    {outlets.find(o => o.id === selectedOutlet)?.name} - Operating Hours
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Opens: {outlets.find(o => o.id === selectedOutlet)?.hours.open} |
                    Closes: {outlets.find(o => o.id === selectedOutlet)?.hours.close}
                  </div>
                  {outlets.find(o => o.id === selectedOutlet)?.isDefault && (
                    <div className="text-xs text-green-600 mt-1">
                      ✓ Events outside operating hours will default to this outlet
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* File Upload Area */}
            <div className="space-y-4">
              <Label>Menu Document</Label>
              <div className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-all",
                selectedOutlet ? "border-border/50 hover:border-primary/50" : "border-muted/50",
                !selectedOutlet && "opacity-50 cursor-not-allowed"
              )}>
                <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  {selectedOutlet ?
                    "Drag and drop menu files here, or click to select" :
                    "Please select an outlet first"
                  }
                </p>
                <Button
                  onClick={() => selectedOutlet && fileInputRef.current?.click()}
                  variant="outline"
                  className="apple-button"
                  disabled={!selectedOutlet}
                >
                  Choose Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Supports PDF, Word, Images, and Text files (max 10MB)
                </p>
              </div>
            </div>

            {uploadProgress > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Processing Menu Document</span>
                  <span className="text-primary">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full h-3" />
                <div className="text-xs text-muted-foreground">
                  {uploadProgress <= 20 && "Uploading file..."}
                  {uploadProgress > 20 && uploadProgress <= 40 && "Processing document..."}
                  {uploadProgress > 40 && uploadProgress <= 60 && "Extracting menu items..."}
                  {uploadProgress > 60 && uploadProgress <= 80 && "Analyzing pricing..."}
                  {uploadProgress > 80 && "Finalizing menu data..."}
                </div>
              </div>
            )}

            {/* Hours Information */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">Operating Hours Policy</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Events scheduled outside of outlet operating hours will automatically default to
                    <strong> Banquet Services</strong> unless it's a venue buyout or specifically overridden by a director.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDocumentUploadOpen(false);
                setSelectedOutlet('');
                setUploadProgress(0);
              }}
              className="apple-button"
              disabled={uploadProgress > 0 && uploadProgress < 100}
            >
              Cancel
            </Button>
            {uploadedMenus.length > 0 && (
              <Button
                onClick={() => {
                  setIsDocumentUploadOpen(false);
                  setIsMenuViewerOpen(true);
                }}
                className="apple-button bg-primary hover:bg-primary/90"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Uploaded Menus
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu Viewer Dialog */}
      <Dialog open={isMenuViewerOpen} onOpenChange={setIsMenuViewerOpen}>
        <DialogContent className="glass-panel max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Menu Viewer & Management
            </DialogTitle>
            <DialogDescription>
              View and manage uploaded menus with effective dates and outlet assignments
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="current">Current Menu</TabsTrigger>
              <TabsTrigger value="all">All Menus</TabsTrigger>
              <TabsTrigger value="manage">Manage</TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="space-y-4">
              {selectedMenu ? (
                <div className="space-y-6">
                  {/* Menu Header */}
                  <Card className="glass-panel border-green-500/30">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{selectedMenu.fileName}</CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-2">
                            <span>{selectedMenu.outletName}</span>
                            <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active Menu
                            </Badge>
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">Effective Date</div>
                          <div className="text-lg font-bold text-green-600">
                            {new Date(selectedMenu.effectiveDate).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Uploaded {new Date(selectedMenu.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Version:</span>
                          <div className="font-medium">{selectedMenu.version}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Categories:</span>
                          <div className="font-medium">{selectedMenu.categories.length}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Items:</span>
                          <div className="font-medium">
                            {selectedMenu.categories.reduce((total, cat) => total + cat.items.length, 0)}
                          </div>
                        </div>
                      </div>
                      {selectedMenu.specialNotes && (
                        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                          <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            Special Notes:
                          </div>
                          <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            {selectedMenu.specialNotes}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Menu Categories */}
                  <div className="space-y-4">
                    {selectedMenu.categories.map((category, categoryIndex) => (
                      <Card key={categoryIndex} className="glass-panel">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center justify-between">
                            <span>{category.name}</span>
                            <Badge variant="outline">{category.items.length} items</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {category.items.map((item, itemIndex) => (
                              <div key={itemIndex} className="flex items-start justify-between p-3 bg-muted/20 rounded-lg">
                                <div className="flex-1">
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-sm text-muted-foreground mt-1">{item.description}</div>
                                </div>
                                <div className="text-right ml-4">
                                  <div className="font-bold text-lg text-primary">${item.price.toFixed(2)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                  <p className="text-muted-foreground">No menu selected. Upload a menu to view it here.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              <div className="space-y-4">
                {uploadedMenus.length > 0 ? (
                  uploadedMenus.map((menu, index) => (
                    <Card key={index} className={cn(
                      "glass-panel cursor-pointer transition-all",
                      menu.isActive ? "border-green-500/30" : "border-border/50"
                    )}
                    onClick={() => setSelectedMenu(menu)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div>
                              <div className="font-medium">{menu.fileName}</div>
                              <div className="text-sm text-muted-foreground">{menu.outletName}</div>
                            </div>
                            <div>
                              {menu.isActive && (
                                <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Current
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">Effective: {new Date(menu.effectiveDate).toLocaleDateString()}</div>
                            <div className="text-xs text-muted-foreground">
                              Uploaded: {new Date(menu.uploadedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Upload className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                    <p className="text-muted-foreground">No menus uploaded yet. Upload your first menu to get started.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="manage" className="space-y-4">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle>Menu Management</CardTitle>
                  <CardDescription>
                    Update effective dates, manage versions, and control outlet assignments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Update Permissions</h4>
                      <div className="space-y-3">
                        {outlets.filter(o => o.canUpdateMenu).map(outlet => (
                          <div key={outlet.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                            <div>
                              <div className="font-medium">{outlet.name}</div>
                              <div className="text-sm text-muted-foreground">Can update banquet menu</div>
                            </div>
                            <Switch defaultChecked={true} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">Director Override</h4>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-800 dark:text-blue-200">Director Access</span>
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Directors can override menu selections and approve budget overrides for special events.
                        </p>
                        <Button size="sm" className="mt-3 bg-blue-600 hover:bg-blue-700 text-white">
                          Request Override
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Quick Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="apple-button">
                        <Download className="h-4 w-4 mr-2" />
                        Export Menu PDF
                      </Button>
                      <Button variant="outline" size="sm" className="apple-button">
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate Menu
                      </Button>
                      <Button variant="outline" size="sm" className="apple-button">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Update
                      </Button>
                      <Button variant="outline" size="sm" className="apple-button text-red-600 border-red-200 hover:bg-red-50">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Archive Menu
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsMenuViewerOpen(false)}
              className="apple-button"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setIsMenuViewerOpen(false);
                setIsDocumentUploadOpen(true);
              }}
              className="apple-button bg-primary hover:bg-primary/90"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Another Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
        <DialogContent className="glass-panel max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Start a new event project and begin the BEO process
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="project-name">Project Name</Label>
              <Input id="project-name" className="apple-button" />
            </div>
            <div>
              <Label htmlFor="client-name">Client Name</Label>
              <Input id="client-name" className="apple-button" />
            </div>
            <div>
              <Label htmlFor="event-date">Event Date</Label>
              <Input id="event-date" type="date" className="apple-button" />
            </div>
            <div>
              <Label htmlFor="guest-count">Guest Count</Label>
              <Input id="guest-count" type="number" className="apple-button" />
            </div>
            <div>
              <Label htmlFor="budget">Budget</Label>
              <Input id="budget" type="number" placeholder="0" className="apple-button" />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select>
                <SelectTrigger className="apple-button">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="glass-panel">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" className="apple-button" rows={3} />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateProjectOpen(false)}
              className="apple-button"
            >
              Cancel
            </Button>
            <Button className="apple-button bg-primary hover:bg-primary/90">
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
}
