import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  Users,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  ChefHat,
  Music,
  Camera,
  Car,
  Sparkles,
  Building,
  GraduationCap,
  Heart,
  Briefcase,
  PartyPopper,
  Trophy,
  Gift,
  Plane,
  Coffee,
  Wine,
  Utensils,
  Plus,
  Template,
  Workflow,
  CheckCircle,
  ArrowRight,
  Copy,
  Save,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  category: 'corporate' | 'wedding' | 'social' | 'conference' | 'gala' | 'meeting';
  difficulty: 'simple' | 'moderate' | 'complex';
  estimatedDuration: number; // hours
  guestRange: {
    min: number;
    max: number;
  };
  estimatedBudget: {
    min: number;
    max: number;
  };
  icon: React.ComponentType<any>;
  color: string;
  popularityRating: number; // 1-5
  features: string[];
  requirements: TemplateRequirement[];
  timeline: TemplateTimelineStep[];
  checklist: TemplateChecklistItem[];
  vendors: TemplateVendor[];
  menus?: string[];
  spaces?: string[];
  tags: string[];
}

export interface TemplateRequirement {
  id: string;
  category: 'space' | 'catering' | 'av' | 'decor' | 'staff' | 'transport' | 'other';
  name: string;
  description: string;
  required: boolean;
  estimatedCost?: number;
}

export interface TemplateTimelineStep {
  id: string;
  title: string;
  description: string;
  timeBeforeEvent: number; // hours
  assignedTo: 'planner' | 'client' | 'vendor' | 'staff';
  category: 'planning' | 'booking' | 'preparation' | 'execution' | 'followup';
  dependencies?: string[];
}

export interface TemplateChecklistItem {
  id: string;
  task: string;
  category: 'setup' | 'catering' | 'av' | 'decor' | 'logistics' | 'cleanup';
  timeBeforeEvent: number; // hours
  estimatedDuration: number; // minutes
  assignedTo: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface TemplateVendor {
  id: string;
  type: 'catering' | 'florist' | 'photographer' | 'dj' | 'band' | 'lighting' | 'transport' | 'security';
  name: string;
  description: string;
  estimatedCost: number;
  bookingLeadTime: number; // days
  required: boolean;
}

const eventTemplates: EventTemplate[] = [
  {
    id: 'corporate-conference',
    name: 'Corporate Conference (100-300 guests)',
    description: 'Professional conference with keynote speakers, breakout sessions, and networking',
    category: 'corporate',
    difficulty: 'moderate',
    estimatedDuration: 8,
    guestRange: { min: 100, max: 300 },
    estimatedBudget: { min: 25000, max: 75000 },
    icon: Briefcase,
    color: 'blue',
    popularityRating: 5,
    features: [
      'Multi-session agenda',
      'Keynote presentations',
      'Networking breaks',
      'Professional catering',
      'AV equipment included',
      'Registration system'
    ],
    requirements: [
      {
        id: 'conf-space',
        category: 'space',
        name: 'Main auditorium + breakout rooms',
        description: 'Large presentation space with 2-3 smaller meeting rooms',
        required: true,
        estimatedCost: 8000
      },
      {
        id: 'conf-av',
        category: 'av',
        name: 'Professional AV setup',
        description: 'Microphones, projectors, screens, lighting for presentations',
        required: true,
        estimatedCost: 5000
      },
      {
        id: 'conf-catering',
        category: 'catering',
        name: 'Business lunch + breaks',
        description: 'Welcome coffee, lunch, afternoon refreshments',
        required: true,
        estimatedCost: 15000
      }
    ],
    timeline: [
      {
        id: 'conf-timeline-1',
        title: 'Initial Planning',
        description: 'Define agenda, book speakers, secure venue',
        timeBeforeEvent: 2160, // 90 days
        assignedTo: 'planner',
        category: 'planning'
      },
      {
        id: 'conf-timeline-2',
        title: 'Marketing Launch',
        description: 'Open registration, launch marketing campaign',
        timeBeforeEvent: 1440, // 60 days
        assignedTo: 'client',
        category: 'planning'
      },
      {
        id: 'conf-timeline-3',
        title: 'Final Confirmations',
        description: 'Confirm all vendors, finalize headcount',
        timeBeforeEvent: 168, // 7 days
        assignedTo: 'planner',
        category: 'preparation'
      }
    ],
    checklist: [
      {
        id: 'conf-check-1',
        task: 'Set up registration desk',
        category: 'setup',
        timeBeforeEvent: 2,
        estimatedDuration: 30,
        assignedTo: 'Staff Team',
        priority: 'high'
      },
      {
        id: 'conf-check-2',
        task: 'Test all AV equipment',
        category: 'av',
        timeBeforeEvent: 1,
        estimatedDuration: 60,
        assignedTo: 'AV Technician',
        priority: 'critical'
      }
    ],
    vendors: [
      {
        id: 'conf-vendor-1',
        type: 'catering',
        name: 'Executive Catering Services',
        description: 'Professional business meal service',
        estimatedCost: 15000,
        bookingLeadTime: 30,
        required: true
      }
    ],
    tags: ['business', 'professional', 'networking', 'presentations']
  },
  {
    id: 'wedding-reception',
    name: 'Wedding Reception (50-150 guests)',
    description: 'Elegant wedding reception with dinner, dancing, and celebration',
    category: 'wedding',
    difficulty: 'complex',
    estimatedDuration: 6,
    guestRange: { min: 50, max: 150 },
    estimatedBudget: { min: 15000, max: 50000 },
    icon: Heart,
    color: 'pink',
    popularityRating: 5,
    features: [
      'Ceremony coordination',
      'Reception dinner',
      'DJ and dancing',
      'Photography',
      'Floral arrangements',
      'Wedding cake'
    ],
    requirements: [
      {
        id: 'wedding-space',
        category: 'space',
        name: 'Reception hall',
        description: 'Elegant space for dinner and dancing',
        required: true,
        estimatedCost: 5000
      },
      {
        id: 'wedding-catering',
        category: 'catering',
        name: 'Wedding dinner service',
        description: 'Multi-course plated dinner with wedding cake',
        required: true,
        estimatedCost: 20000
      },
      {
        id: 'wedding-decor',
        category: 'decor',
        name: 'Floral and decorations',
        description: 'Centerpieces, ceremony arch, ambient lighting',
        required: true,
        estimatedCost: 8000
      }
    ],
    timeline: [
      {
        id: 'wedding-timeline-1',
        title: 'Initial Consultation',
        description: 'Meet with couple, understand vision and budget',
        timeBeforeEvent: 4320, // 180 days
        assignedTo: 'planner',
        category: 'planning'
      },
      {
        id: 'wedding-timeline-2',
        title: 'Vendor Bookings',
        description: 'Secure photographers, florists, DJ, catering',
        timeBeforeEvent: 2880, // 120 days
        assignedTo: 'planner',
        category: 'booking'
      },
      {
        id: 'wedding-timeline-3',
        title: 'Final Rehearsal',
        description: 'Wedding party rehearsal and timeline review',
        timeBeforeEvent: 24, // 1 day
        assignedTo: 'planner',
        category: 'preparation'
      }
    ],
    checklist: [
      {
        id: 'wedding-check-1',
        task: 'Set up ceremony space',
        category: 'setup',
        timeBeforeEvent: 4,
        estimatedDuration: 120,
        assignedTo: 'Setup Team',
        priority: 'critical'
      },
      {
        id: 'wedding-check-2',
        task: 'Arrange bridal suite',
        category: 'setup',
        timeBeforeEvent: 6,
        estimatedDuration: 60,
        assignedTo: 'Coordinator',
        priority: 'high'
      }
    ],
    vendors: [
      {
        id: 'wedding-vendor-1',
        type: 'photographer',
        name: 'Premium Wedding Photography',
        description: 'Full day wedding photography and videography',
        estimatedCost: 8000,
        bookingLeadTime: 60,
        required: true
      },
      {
        id: 'wedding-vendor-2',
        type: 'florist',
        name: 'Elegant Florals',
        description: 'Bridal bouquets, centerpieces, ceremony arrangements',
        estimatedCost: 5000,
        bookingLeadTime: 45,
        required: true
      }
    ],
    tags: ['wedding', 'celebration', 'elegant', 'romantic']
  },
  {
    id: 'gala-dinner',
    name: 'Gala Dinner (200+ guests)',
    description: 'Formal fundraising gala with auction, entertainment, and fine dining',
    category: 'gala',
    difficulty: 'complex',
    estimatedDuration: 5,
    guestRange: { min: 200, max: 500 },
    estimatedBudget: { min: 50000, max: 150000 },
    icon: Trophy,
    color: 'gold',
    popularityRating: 4,
    features: [
      'Silent auction',
      'Live entertainment',
      'Multi-course dinner',
      'VIP reception',
      'Professional lighting',
      'Live streaming'
    ],
    requirements: [
      {
        id: 'gala-space',
        category: 'space',
        name: 'Grand ballroom',
        description: 'Formal dining space with stage area',
        required: true,
        estimatedCost: 12000
      }
    ],
    timeline: [],
    checklist: [],
    vendors: [],
    tags: ['formal', 'fundraising', 'elegant', 'entertainment']
  },
  {
    id: 'team-building',
    name: 'Team Building Event (25-75 guests)',
    description: 'Interactive team building with activities, lunch, and collaboration exercises',
    category: 'corporate',
    difficulty: 'simple',
    estimatedDuration: 4,
    guestRange: { min: 25, max: 75 },
    estimatedBudget: { min: 5000, max: 15000 },
    icon: Users,
    color: 'green',
    popularityRating: 4,
    features: [
      'Interactive activities',
      'Team challenges',
      'Casual catering',
      'Outdoor options',
      'Professional facilitation'
    ],
    requirements: [],
    timeline: [],
    checklist: [],
    vendors: [],
    tags: ['team-building', 'corporate', 'interactive', 'fun']
  }
];

interface EventTemplatesProps {
  onTemplateSelect?: (template: EventTemplate) => void;
  onCreateFromTemplate?: (template: EventTemplate, customizations: any) => void;
}

export default function EventTemplates({ onTemplateSelect, onCreateFromTemplate }: EventTemplatesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("browse");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTemplates = eventTemplates.filter(template => {
    const matchesCategory = filterCategory === "all" || template.category === filterCategory;
    const matchesSearch = searchQuery === "" || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const handleTemplateSelect = useCallback((template: EventTemplate) => {
    setSelectedTemplate(template);
    setActiveTab("details");
  }, []);

  const handleUseTemplate = useCallback(() => {
    if (selectedTemplate) {
      onTemplateSelect?.(selectedTemplate);
      setIsDialogOpen(false);
      setSelectedTemplate(null);
      setActiveTab("browse");
    }
  }, [selectedTemplate, onTemplateSelect]);

  const getIcon = (template: EventTemplate) => {
    const Icon = template.icon;
    return <Icon className="h-5 w-5" />;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'corporate': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
      case 'wedding': return 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300';
      case 'social': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300';
      case 'conference': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300';
      case 'gala': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'meeting': return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'simple': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'complex': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="apple-button">
            <Template className="h-4 w-4 mr-2" />
            Event Templates
          </Button>
        </DialogTrigger>
        <DialogContent className="glass-panel max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg mr-3">
                <Template className="h-6 w-6 text-white" />
              </div>
              Event Templates & Workflows
            </DialogTitle>
            <DialogDescription>
              Choose from professionally designed event templates to jumpstart your planning process.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="browse">Browse Templates</TabsTrigger>
              <TabsTrigger value="details" disabled={!selectedTemplate}>Template Details</TabsTrigger>
              <TabsTrigger value="customize" disabled={!selectedTemplate}>Customize & Create</TabsTrigger>
            </TabsList>

            <TabsContent value="browse" className="space-y-6 mt-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="wedding">Wedding</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="gala">Gala</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Template Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="glass-panel cursor-pointer hover:border-primary/50 transition-all duration-200 group"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={cn(
                            "p-2 rounded-lg",
                            `bg-${template.color}-100 dark:bg-${template.color}-900/20`
                          )}>
                            {getIcon(template)}
                          </div>
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: template.popularityRating }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                        <Badge className={cn("text-xs capitalize", getDifficultyColor(template.difficulty))}>
                          {template.difficulty}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="text-sm">{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <Badge className={cn("text-xs capitalize", getCategoryColor(template.category))}>
                          {template.category}
                        </Badge>
                        <div className="flex items-center space-x-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{template.estimatedDuration}h</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{template.guestRange.min}-{template.guestRange.max}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span>${(template.estimatedBudget.min / 1000).toFixed(0)}K-${(template.estimatedBudget.max / 1000).toFixed(0)}K</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {template.features.slice(0, 3).map((feature, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                        {template.features.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.features.length - 3}
                          </Badge>
                        )}
                      </div>

                      <Button 
                        size="sm" 
                        className="w-full apple-button group-hover:bg-primary group-hover:text-primary-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTemplateSelect(template);
                        }}
                      >
                        View Details
                        <ArrowRight className="h-3 w-3 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-6 mt-6">
              {selectedTemplate && (
                <div className="space-y-6">
                  {/* Template Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={cn(
                        "p-3 rounded-lg",
                        `bg-${selectedTemplate.color}-100 dark:bg-${selectedTemplate.color}-900/20`
                      )}>
                        {getIcon(selectedTemplate)}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">{selectedTemplate.name}</h3>
                        <p className="text-muted-foreground mt-1">{selectedTemplate.description}</p>
                        <div className="flex items-center space-x-3 mt-2">
                          <Badge className={cn("capitalize", getCategoryColor(selectedTemplate.category))}>
                            {selectedTemplate.category}
                          </Badge>
                          <Badge className={cn("capitalize", getDifficultyColor(selectedTemplate.difficulty))}>
                            {selectedTemplate.difficulty}
                          </Badge>
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: selectedTemplate.popularityRating }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button onClick={handleUseTemplate} className="apple-button">
                      <Zap className="h-4 w-4 mr-2" />
                      Use This Template
                    </Button>
                  </div>

                  {/* Template Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="glass-panel">
                      <CardContent className="p-4 text-center">
                        <Clock className="h-6 w-6 mx-auto text-primary mb-2" />
                        <p className="text-2xl font-bold">{selectedTemplate.estimatedDuration}h</p>
                        <p className="text-xs text-muted-foreground">Duration</p>
                      </CardContent>
                    </Card>
                    <Card className="glass-panel">
                      <CardContent className="p-4 text-center">
                        <Users className="h-6 w-6 mx-auto text-primary mb-2" />
                        <p className="text-2xl font-bold">{selectedTemplate.guestRange.min}-{selectedTemplate.guestRange.max}</p>
                        <p className="text-xs text-muted-foreground">Guests</p>
                      </CardContent>
                    </Card>
                    <Card className="glass-panel">
                      <CardContent className="p-4 text-center">
                        <DollarSign className="h-6 w-6 mx-auto text-primary mb-2" />
                        <p className="text-2xl font-bold">
                          ${(selectedTemplate.estimatedBudget.min / 1000).toFixed(0)}K-${(selectedTemplate.estimatedBudget.max / 1000).toFixed(0)}K
                        </p>
                        <p className="text-xs text-muted-foreground">Budget Range</p>
                      </CardContent>
                    </Card>
                    <Card className="glass-panel">
                      <CardContent className="p-4 text-center">
                        <CheckCircle className="h-6 w-6 mx-auto text-primary mb-2" />
                        <p className="text-2xl font-bold">{selectedTemplate.checklist.length}</p>
                        <p className="text-xs text-muted-foreground">Tasks</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Features & Requirements */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="glass-panel">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Sparkles className="h-5 w-5 mr-2" />
                          Included Features
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {selectedTemplate.features.map((feature, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-panel">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Building className="h-5 w-5 mr-2" />
                          Requirements
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {selectedTemplate.requirements.map((req) => (
                            <div key={req.id} className="p-3 bg-muted/20 rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-medium">{req.name}</h4>
                                {req.estimatedCost && (
                                  <Badge variant="outline" className="text-xs">
                                    ${req.estimatedCost.toLocaleString()}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{req.description}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Timeline */}
                  {selectedTemplate.timeline.length > 0 && (
                    <Card className="glass-panel">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Workflow className="h-5 w-5 mr-2" />
                          Planning Timeline
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {selectedTemplate.timeline
                            .sort((a, b) => b.timeBeforeEvent - a.timeBeforeEvent)
                            .map((step, index) => (
                            <div key={step.id} className="flex items-start space-x-4">
                              <div className="flex flex-col items-center">
                                <div className="w-3 h-3 bg-primary rounded-full" />
                                {index < selectedTemplate.timeline.length - 1 && (
                                  <div className="w-px h-8 bg-border mt-2" />
                                )}
                              </div>
                              <div className="flex-1 pb-4">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="text-sm font-medium">{step.title}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {Math.floor(step.timeBeforeEvent / 24)} days before
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{step.description}</p>
                                <p className="text-xs text-primary mt-1">Assigned to: {step.assignedTo}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="customize" className="space-y-6 mt-6">
              {selectedTemplate && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-2">Customize Your Event</h3>
                    <p className="text-muted-foreground">
                      Adjust the template settings to match your specific requirements
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="event-name">Event Name</Label>
                        <Input id="event-name" placeholder={selectedTemplate.name} />
                      </div>
                      <div>
                        <Label htmlFor="guest-count">Expected Guest Count</Label>
                        <Input 
                          id="guest-count" 
                          type="number" 
                          placeholder={`${selectedTemplate.guestRange.min}-${selectedTemplate.guestRange.max}`} 
                        />
                      </div>
                      <div>
                        <Label htmlFor="budget">Budget</Label>
                        <Input 
                          id="budget" 
                          type="number" 
                          placeholder={`${selectedTemplate.estimatedBudget.min}`} 
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="event-date">Event Date</Label>
                        <Input id="event-date" type="date" />
                      </div>
                      <div>
                        <Label htmlFor="venue">Preferred Venue</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select venue" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ballroom-a">Grand Ballroom A</SelectItem>
                            <SelectItem value="ballroom-b">Grand Ballroom B</SelectItem>
                            <SelectItem value="garden">Rose Garden Pavilion</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="special-requests">Special Requests</Label>
                        <Textarea 
                          id="special-requests" 
                          placeholder="Any specific requirements or customizations..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-4">Modify Template Features</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedTemplate.features.map((feature, index) => (
                        <label key={index} className="flex items-center space-x-2 cursor-pointer">
                          <input type="checkbox" defaultChecked className="rounded" />
                          <span className="text-sm">{feature}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {activeTab === "customize" && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setActiveTab("details")}>
                Back to Details
              </Button>
              <Button onClick={handleUseTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Event from Template
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export { eventTemplates };
