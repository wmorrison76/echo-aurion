import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Target,
  Zap,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  ThumbsUp,
  ThumbsDown,
  Award,
  Building,
  Heart,
  Music,
  Utensils,
  Camera,
  Sparkles,
  Shield,
  Bot,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Flame,
  Snowflake,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QualificationCriteria {
  id: string;
  category: 'budget' | 'authority' | 'need' | 'timeline' | 'fit';
  question: string;
  weight: number; // 1-10 importance
  responseType: 'scale' | 'boolean' | 'text' | 'select';
  options?: string[];
  scoreMapping?: { [key: string]: number };
  required: boolean;
}

interface LeadQualification {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  leadPhone?: string;
  company?: string;
  eventType: string;
  responses: { [criteriaId: string]: string | number };
  overallScore: number;
  categoryScores: { [category: string]: number };
  qualification: 'hot' | 'warm' | 'cold' | 'unqualified';
  qualifiedBy: string;
  qualifiedAt: Date;
  notes: string;
  nextSteps: string[];
  estimatedValue?: number;
  timeToClose?: number; // days
  probability: number;
  tags: string[];
  source: string;
  aiInsights?: {
    strengths: string[];
    concerns: string[];
    recommendations: string[];
    confidence: number;
  };
}

interface QualificationTemplate {
  id: string;
  name: string;
  description: string;
  eventTypes: string[];
  criteria: QualificationCriteria[];
  isDefault: boolean;
  createdBy: string;
  usageCount: number;
}

const mockQualificationCriteria: QualificationCriteria[] = [
  {
    id: 'budget-1',
    category: 'budget',
    question: 'What is your budget range for this event?',
    weight: 9,
    responseType: 'select',
    options: ['Under $15k', '$15k-$30k', '$30k-$50k', '$50k-$75k', '$75k-$100k', 'Over $100k'],
    scoreMapping: {
      'Under $15k': 3,
      '$15k-$30k': 5,
      '$30k-$50k': 7,
      '$50k-$75k': 9,
      '$75k-$100k': 10,
      'Over $100k': 10
    },
    required: true
  },
  {
    id: 'authority-1',
    category: 'authority',
    question: 'Are you the primary decision-maker for this event?',
    weight: 8,
    responseType: 'select',
    options: ['Yes, I make the final decision', 'I make recommendations, others approve', 'I am gathering information', 'Not sure'],
    scoreMapping: {
      'Yes, I make the final decision': 10,
      'I make recommendations, others approve': 7,
      'I am gathering information': 4,
      'Not sure': 2
    },
    required: true
  },
  {
    id: 'timeline-1',
    category: 'timeline',
    question: 'When is your target event date?',
    weight: 7,
    responseType: 'select',
    options: ['Within 30 days', '1-3 months', '3-6 months', '6-12 months', 'Over 1 year', 'Flexible'],
    scoreMapping: {
      'Within 30 days': 6,
      '1-3 months': 10,
      '3-6 months': 9,
      '6-12 months': 7,
      'Over 1 year': 5,
      'Flexible': 8
    },
    required: true
  },
  {
    id: 'need-1',
    category: 'need',
    question: 'How urgent is finding a venue for your event?',
    weight: 6,
    responseType: 'scale',
    scoreMapping: {
      '1': 2, '2': 3, '3': 4, '4': 5, '5': 6, 
      '6': 7, '7': 8, '8': 9, '9': 10, '10': 10
    },
    required: true
  },
  {
    id: 'fit-1',
    category: 'fit',
    question: 'How many guests do you expect?',
    weight: 7,
    responseType: 'select',
    options: ['Under 50', '50-100', '100-200', '200-300', '300-500', 'Over 500'],
    scoreMapping: {
      'Under 50': 6,
      '50-100': 8,
      '100-200': 10,
      '200-300': 10,
      '300-500': 8,
      'Over 500': 6
    },
    required: true
  },
  {
    id: 'budget-2',
    category: 'budget',
    question: 'Do you have a formal budget approved for this event?',
    weight: 8,
    responseType: 'boolean',
    scoreMapping: { 'true': 10, 'false': 4 },
    required: false
  },
  {
    id: 'authority-2',
    category: 'authority',
    question: 'Who else is involved in the decision-making process?',
    weight: 5,
    responseType: 'text',
    required: false
  },
  {
    id: 'need-2',
    category: 'need',
    question: 'What specific features or services are most important to you?',
    weight: 6,
    responseType: 'text',
    required: false
  },
  {
    id: 'fit-2',
    category: 'fit',
    question: 'Have you booked events like this before?',
    weight: 4,
    responseType: 'select',
    options: ['Yes, multiple times', 'Yes, once or twice', 'This is my first time', 'Not personally, but my organization has'],
    scoreMapping: {
      'Yes, multiple times': 8,
      'Yes, once or twice': 6,
      'This is my first time': 4,
      'Not personally, but my organization has': 7
    },
    required: false
  }
];

const mockQualifications: LeadQualification[] = [
  {
    id: 'qual-1',
    leadId: 'lead-1',
    leadName: 'Sarah Johnson',
    leadEmail: 'sarah.johnson@techcorp.com',
    leadPhone: '+1 (555) 123-4567',
    company: 'TechCorp Industries',
    eventType: 'corporate',
    responses: {
      'budget-1': '$50k-$75k',
      'authority-1': 'I make recommendations, others approve',
      'timeline-1': '3-6 months',
      'need-1': 8,
      'fit-1': '200-300',
      'budget-2': 'true'
    },
    overallScore: 85,
    categoryScores: {
      budget: 95,
      authority: 70,
      timeline: 90,
      need: 80,
      fit: 100
    },
    qualification: 'hot',
    qualifiedBy: 'William Morrison',
    qualifiedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    notes: 'Excellent fit for corporate events. Has budget approval and timeline works well. Decision committee includes CFO.',
    nextSteps: [
      'Send detailed proposal within 24 hours',
      'Schedule presentation for decision committee',
      'Provide references from similar corporate events'
    ],
    estimatedValue: 65000,
    timeToClose: 45,
    probability: 75,
    tags: ['corporate', 'high-value', 'committee-decision'],
    source: 'Website inquiry',
    aiInsights: {
      strengths: [
        'Strong budget alignment with our premium packages',
        'Realistic timeline allows for proper planning',
        'Company size and event type are perfect fit'
      ],
      concerns: [
        'Multiple decision-makers may slow process',
        'No previous relationship with company'
      ],
      recommendations: [
        'Focus on ROI and professional reputation benefits',
        'Prepare detailed comparison with competitors',
        'Offer executive-level presentation'
      ],
      confidence: 0.87
    }
  },
  {
    id: 'qual-2',
    leadId: 'lead-2',
    leadName: 'Michael and Jennifer Peterson',
    leadEmail: 'mjpeterson@email.com',
    eventType: 'wedding',
    responses: {
      'budget-1': '$30k-$50k',
      'authority-1': 'Yes, I make the final decision',
      'timeline-1': '6-12 months',
      'need-1': 9,
      'fit-1': '100-200',
      'fit-2': 'This is my first time'
    },
    overallScore: 78,
    categoryScores: {
      budget: 70,
      authority: 100,
      timeline: 70,
      need: 90,
      fit: 60
    },
    qualification: 'warm',
    qualifiedBy: 'Sarah Wilson',
    qualifiedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    notes: 'Engaged couple planning their first wedding. High emotional investment but limited experience.',
    nextSteps: [
      'Schedule venue tour this weekend',
      'Provide wedding planning guide',
      'Connect with preferred vendors'
    ],
    estimatedValue: 42000,
    timeToClose: 30,
    probability: 65,
    tags: ['wedding', 'first-time', 'emotional-buy'],
    source: 'Referral',
    aiInsights: {
      strengths: [
        'Direct decision-makers with high motivation',
        'Budget range aligns with wedding packages',
        'Strong emotional investment in perfect day'
      ],
      concerns: [
        'First-time planners may need more guidance',
        'Competition from other venues is high',
        'May be price-sensitive due to overall wedding costs'
      ],
      recommendations: [
        'Emphasize personalized service and guidance',
        'Show real wedding examples and testimonials',
        'Create all-inclusive package to simplify decisions'
      ],
      confidence: 0.73
    }
  },
  {
    id: 'qual-3',
    leadId: 'lead-3',
    leadName: 'David Kim',
    leadEmail: 'dkim@nonprofit.org',
    company: 'Children Health Foundation',
    eventType: 'gala',
    responses: {
      'budget-1': '$15k-$30k',
      'authority-1': 'I am gathering information',
      'timeline-1': '1-3 months',
      'need-1': 6,
      'fit-1': '200-300'
    },
    overallScore: 45,
    categoryScores: {
      budget: 50,
      authority: 40,
      timeline: 100,
      need: 60,
      fit: 100
    },
    qualification: 'cold',
    qualifiedBy: 'Mike Rodriguez',
    qualifiedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    notes: 'Nonprofit with limited budget. Still in early planning stages with multiple stakeholders.',
    nextSteps: [
      'Provide nonprofit pricing information',
      'Schedule call with committee',
      'Offer to present at board meeting'
    ],
    estimatedValue: 25000,
    timeToClose: 60,
    probability: 35,
    tags: ['nonprofit', 'committee', 'budget-constrained'],
    source: 'Cold outreach',
    aiInsights: {
      strengths: [
        'Urgent timeline creates decision pressure',
        'Event size matches venue capacity well',
        'Nonprofit events often have good word-of-mouth potential'
      ],
      concerns: [
        'Limited budget may not cover costs',
        'Multiple decision-makers with different priorities',
        'Nonprofit events often price-sensitive'
      ],
      recommendations: [
        'Focus on community impact and mission alignment',
        'Offer tiered pricing with basic package',
        'Emphasize sponsorship opportunities to offset costs'
      ],
      confidence: 0.52
    }
  }
];

const mockTemplates: QualificationTemplate[] = [
  {
    id: 'template-1',
    name: 'Corporate Events Standard',
    description: 'Standard qualification criteria for corporate events and conferences',
    eventTypes: ['corporate', 'conference', 'meeting'],
    criteria: mockQualificationCriteria.filter(c => ['budget-1', 'authority-1', 'timeline-1', 'need-1', 'fit-1', 'authority-2'].includes(c.id)),
    isDefault: true,
    createdBy: 'System',
    usageCount: 45
  },
  {
    id: 'template-2',
    name: 'Wedding Comprehensive',
    description: 'Detailed qualification for wedding events with emotional and practical considerations',
    eventTypes: ['wedding'],
    criteria: mockQualificationCriteria.filter(c => ['budget-1', 'authority-1', 'timeline-1', 'need-1', 'fit-1', 'fit-2', 'need-2'].includes(c.id)),
    isDefault: false,
    createdBy: 'Sarah Wilson',
    usageCount: 32
  },
  {
    id: 'template-3',
    name: 'Quick Qualifier',
    description: 'Fast 5-question qualifier for initial lead scoring',
    eventTypes: ['all'],
    criteria: mockQualificationCriteria.filter(c => ['budget-1', 'authority-1', 'timeline-1', 'need-1', 'fit-1'].includes(c.id)),
    isDefault: false,
    createdBy: 'William Morrison',
    usageCount: 78
  }
];

interface LeadQualificationProps {
  className?: string;
}

export default function LeadQualification({ className }: LeadQualificationProps) {
  const [qualifications, setQualifications] = useState<LeadQualification[]>(mockQualifications);
  const [templates, setTemplates] = useState<QualificationTemplate[]>(mockTemplates);
  const [selectedQualification, setSelectedQualification] = useState<LeadQualification | null>(null);
  const [isQualifyDialogOpen, setIsQualifyDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("leads");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterQualification, setFilterQualification] = useState<string>("all");
  const [filterEventType, setFilterEventType] = useState<string>("all");

  const filteredQualifications = useMemo(() => {
    return qualifications.filter(qual => {
      const matchesSearch = searchQuery === "" || 
        qual.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        qual.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        qual.leadEmail.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesQualification = filterQualification === "all" || qual.qualification === filterQualification;
      const matchesEventType = filterEventType === "all" || qual.eventType === filterEventType;
      
      return matchesSearch && matchesQualification && matchesEventType;
    });
  }, [qualifications, searchQuery, filterQualification, filterEventType]);

  const qualificationCounts = useMemo(() => {
    return {
      hot: qualifications.filter(q => q.qualification === 'hot').length,
      warm: qualifications.filter(q => q.qualification === 'warm').length,
      cold: qualifications.filter(q => q.qualification === 'cold').length,
      unqualified: qualifications.filter(q => q.qualification === 'unqualified').length
    };
  }, [qualifications]);

  const averageScore = useMemo(() => {
    const total = qualifications.reduce((sum, qual) => sum + qual.overallScore, 0);
    return Math.round(total / qualifications.length);
  }, [qualifications]);

  const getQualificationColor = (qualification: string) => {
    switch (qualification) {
      case 'hot': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'warm': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'cold': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'unqualified': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getQualificationIcon = (qualification: string) => {
    switch (qualification) {
      case 'hot': return <Flame className="h-4 w-4" />;
      case 'warm': return <TrendingUp className="h-4 w-4" />;
      case 'cold': return <Snowflake className="h-4 w-4" />;
      case 'unqualified': return <XCircle className="h-4 w-4" />;
      default: return <HelpCircle className="h-4 w-4" />;
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'wedding': return <Heart className="h-4 w-4" />;
      case 'corporate': return <Building className="h-4 w-4" />;
      case 'gala': return <Star className="h-4 w-4" />;
      case 'conference': return <Users className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lead Qualification</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered lead scoring and qualification system
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" className="apple-button">
            <Bot className="h-4 w-4 mr-2" />
            AI Analysis
          </Button>
          <Dialog open={isQualifyDialogOpen} onOpenChange={setIsQualifyDialogOpen}>
            <DialogTrigger asChild>
              <Button className="apple-button">
                <Plus className="h-4 w-4 mr-2" />
                Qualify Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel max-w-4xl">
              <DialogHeader>
                <DialogTitle>Lead Qualification</DialogTitle>
                <DialogDescription>
                  Score and qualify a new lead using our AI-powered assessment
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lead-name">Lead Name</Label>
                    <Input id="lead-name" placeholder="John Smith" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead-email">Email</Label>
                    <Input id="lead-email" type="email" placeholder="john@company.com" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lead-company">Company (Optional)</Label>
                    <Input id="lead-company" placeholder="ABC Corporation" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-type">Event Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wedding">Wedding</SelectItem>
                        <SelectItem value="corporate">Corporate Event</SelectItem>
                        <SelectItem value="gala">Gala</SelectItem>
                        <SelectItem value="conference">Conference</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualification-template">Qualification Template</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} - {template.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsQualifyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsQualifyDialogOpen(false)}>
                  Start Qualification
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hot Leads</p>
                <p className="text-2xl font-bold text-red-500">{qualificationCounts.hot}</p>
              </div>
              <Flame className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warm Leads</p>
                <p className="text-2xl font-bold text-orange-500">{qualificationCounts.warm}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cold Leads</p>
                <p className="text-2xl font-bold text-blue-500">{qualificationCounts.cold}</p>
              </div>
              <Snowflake className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-2xl font-bold text-foreground">{averageScore}</p>
              </div>
              <Target className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold text-green-500">24%</p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leads">Qualified Leads ({filteredQualifications.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-6 mt-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterQualification} onValueChange={setFilterQualification}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scores</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                  <SelectItem value="unqualified">Unqualified</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterEventType} onValueChange={setFilterEventType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="wedding">Wedding</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="gala">Gala</SelectItem>
                  <SelectItem value="conference">Conference</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Qualified Leads List */}
          <div className="space-y-4">
            {filteredQualifications.map((qualification) => {
              const EventTypeIcon = getEventTypeIcon(qualification.eventType);
              
              return (
                <Card key={qualification.id} className="glass-panel cursor-pointer hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <EventTypeIcon className="h-6 w-6 text-primary" />
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-medium text-lg">{qualification.leadName}</h3>
                              {qualification.company && (
                                <Badge variant="outline" className="text-xs">
                                  {qualification.company}
                                </Badge>
                              )}
                              <Badge className={cn("text-xs", getQualificationColor(qualification.qualification))}>
                                {getQualificationIcon(qualification.qualification)}
                                <span className="ml-1 capitalize">{qualification.qualification}</span>
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {qualification.overallScore}/100
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span>{qualification.leadEmail}</span>
                              {qualification.leadPhone && <span>{qualification.leadPhone}</span>}
                              <span className="capitalize">{qualification.eventType} event</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Estimated Value:</span>
                              <span className="ml-2 font-medium">
                                {qualification.estimatedValue ? `$${qualification.estimatedValue.toLocaleString()}` : 'TBD'}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Probability:</span>
                              <span className="ml-2 font-medium">{qualification.probability}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Time to Close:</span>
                              <span className="ml-2 font-medium">
                                {qualification.timeToClose ? `${qualification.timeToClose} days` : 'Unknown'}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Source:</span>
                              <span className="ml-2 font-medium">{qualification.source}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Category Scores:</h4>
                            <div className="grid grid-cols-5 gap-2">
                              {Object.entries(qualification.categoryScores).map(([category, score]) => (
                                <div key={category} className="text-center">
                                  <div className="text-xs text-muted-foreground capitalize mb-1">{category}</div>
                                  <div className="relative">
                                    <Progress value={score} className="h-2" />
                                    <div className="text-xs font-medium mt-1">{score}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {qualification.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {qualification.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {qualification.aiInsights && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="flex items-center space-x-2 mb-2">
                                <Bot className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                  AI Insights
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(qualification.aiInsights.confidence * 100)}% confidence
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                <div>
                                  <div className="font-medium text-green-700 dark:text-green-300 mb-1">Strengths:</div>
                                  <ul className="space-y-1">
                                    {qualification.aiInsights.strengths.slice(0, 2).map((strength, index) => (
                                      <li key={index} className="text-green-600 dark:text-green-200">• {strength}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <div className="font-medium text-yellow-700 dark:text-yellow-300 mb-1">Concerns:</div>
                                  <ul className="space-y-1">
                                    {qualification.aiInsights.concerns.slice(0, 2).map((concern, index) => (
                                      <li key={index} className="text-yellow-600 dark:text-yellow-200">• {concern}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">Recommendations:</div>
                                  <ul className="space-y-1">
                                    {qualification.aiInsights.recommendations.slice(0, 2).map((rec, index) => (
                                      <li key={index} className="text-blue-600 dark:text-blue-200">• {rec}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="text-xs text-muted-foreground">
                            Qualified by {qualification.qualifiedBy} on {qualification.qualifiedAt.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedQualification(qualification)}
                        >
                          <Eye className="h-3 w-3 mr-2" />
                          View Details
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Mail className="h-3 w-3 mr-2" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Calendar className="h-3 w-3 mr-2" />
                              Schedule Call
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="h-3 w-3 mr-2" />
                              Create Proposal
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Edit className="h-3 w-3 mr-2" />
                              Re-qualify
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-3 w-3 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {filteredQualifications.length === 0 && (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No qualified leads found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || filterQualification !== "all" || filterEventType !== "all"
                  ? "Try adjusting your search or filters" 
                  : "Start qualifying leads to see them here"}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6 mt-6">
          {/* Templates List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="glass-panel">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg leading-tight">{template.name}</CardTitle>
                      {template.isDefault && (
                        <Badge className="mt-1 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                          Default
                        </Badge>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-3 w-3 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-3 w-3 mr-2" />
                          Edit Template
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Target className="h-3 w-3 mr-2" />
                          Use Template
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-3 w-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription className="text-sm">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Questions:</span>
                      <span className="ml-2 font-medium">{template.criteria.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Used:</span>
                      <span className="ml-2 font-medium">{template.usageCount} times</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-medium">Event Types:</div>
                    <div className="flex flex-wrap gap-1">
                      {template.eventTypes.map((eventType, index) => (
                        <Badge key={index} variant="outline" className="text-xs capitalize">
                          {eventType}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button size="sm" className="w-full apple-button">
                      <Plus className="h-3 w-3 mr-2" />
                      Use This Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Qualification Success Rate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Hot Leads Convert</span>
                    <span className="font-medium">85%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                  
                  <div className="flex justify-between text-sm">
                    <span>Warm Leads Convert</span>
                    <span className="font-medium">45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                  
                  <div className="flex justify-between text-sm">
                    <span>Cold Leads Convert</span>
                    <span className="font-medium">12%</span>
                  </div>
                  <Progress value={12} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>AI Insights Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Average AI Confidence:</span>
                    <span className="font-medium">74%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prediction Accuracy:</span>
                    <span className="font-medium text-green-500">82%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time Saved per Lead:</span>
                    <span className="font-medium">25 minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Qualification Efficiency:</span>
                    <span className="font-medium text-blue-500">+67%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Qualification Detail Dialog */}
      <Dialog open={!!selectedQualification} onOpenChange={() => setSelectedQualification(null)}>
        <DialogContent className="glass-panel max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedQualification && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedQualification.leadName}</DialogTitle>
                <DialogDescription>
                  Detailed qualification analysis and AI insights
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-6">
                    {/* Lead Information */}
                    <Card className="glass-panel">
                      <CardHeader>
                        <CardTitle>Lead Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Email:</span>
                            <span className="ml-2 font-medium">{selectedQualification.leadEmail}</span>
                          </div>
                          {selectedQualification.leadPhone && (
                            <div>
                              <span className="text-muted-foreground">Phone:</span>
                              <span className="ml-2 font-medium">{selectedQualification.leadPhone}</span>
                            </div>
                          )}
                          {selectedQualification.company && (
                            <div>
                              <span className="text-muted-foreground">Company:</span>
                              <span className="ml-2 font-medium">{selectedQualification.company}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Event Type:</span>
                            <span className="ml-2 font-medium capitalize">{selectedQualification.eventType}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Source:</span>
                            <span className="ml-2 font-medium">{selectedQualification.source}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Qualified:</span>
                            <span className="ml-2 font-medium">{selectedQualification.qualifiedAt.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* AI Insights */}
                    {selectedQualification.aiInsights && (
                      <Card className="glass-panel">
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Bot className="h-5 w-5 mr-2 text-blue-500" />
                            AI Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <h4 className="font-medium text-sm mb-2 text-green-700 dark:text-green-300">Strengths</h4>
                              <ul className="space-y-1">
                                {selectedQualification.aiInsights.strengths.map((strength, index) => (
                                  <li key={index} className="text-sm text-green-600 dark:text-green-200 flex items-start">
                                    <CheckCircle className="h-3 w-3 mr-2 mt-0.5 text-green-500" />
                                    <span>{strength}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-sm mb-2 text-yellow-700 dark:text-yellow-300">Concerns</h4>
                              <ul className="space-y-1">
                                {selectedQualification.aiInsights.concerns.map((concern, index) => (
                                  <li key={index} className="text-sm text-yellow-600 dark:text-yellow-200 flex items-start">
                                    <AlertTriangle className="h-3 w-3 mr-2 mt-0.5 text-yellow-500" />
                                    <span>{concern}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-sm mb-2 text-blue-700 dark:text-blue-300">Recommendations</h4>
                              <ul className="space-y-1">
                                {selectedQualification.aiInsights.recommendations.map((rec, index) => (
                                  <li key={index} className="text-sm text-blue-600 dark:text-blue-200 flex items-start">
                                    <Sparkles className="h-3 w-3 mr-2 mt-0.5 text-blue-500" />
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* Qualification Score */}
                    <Card className="glass-panel">
                      <CardHeader>
                        <CardTitle>Qualification Score</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-primary mb-2">
                            {selectedQualification.overallScore}
                          </div>
                          <Badge className={cn("text-sm", getQualificationColor(selectedQualification.qualification))}>
                            {getQualificationIcon(selectedQualification.qualification)}
                            <span className="ml-1 capitalize">{selectedQualification.qualification}</span>
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          {Object.entries(selectedQualification.categoryScores).map(([category, score]) => (
                            <div key={category} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="capitalize">{category}</span>
                                <span className="font-medium">{score}/100</span>
                              </div>
                              <Progress value={score} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="glass-panel">
                      <CardHeader>
                        <CardTitle>Actions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button size="sm" className="w-full justify-start apple-button">
                          <Mail className="h-4 w-4 mr-2" />
                          Send Follow-up Email
                        </Button>
                        <Button size="sm" variant="outline" className="w-full justify-start">
                          <Phone className="h-4 w-4 mr-2" />
                          Schedule Call
                        </Button>
                        <Button size="sm" variant="outline" className="w-full justify-start">
                          <FileText className="h-4 w-4 mr-2" />
                          Create Proposal
                        </Button>
                        <Button size="sm" variant="outline" className="w-full justify-start">
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Move to Pipeline
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
