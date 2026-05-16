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
  Calendar,
  Clock,
  Star,
  Heart,
  Gift,
  MessageSquare,
  Phone,
  Mail,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Award,
  Sparkles,
  Target,
  Eye,
  Edit,
  Trash2,
  Plus,
  MoreVertical,
  RefreshCw,
  Send,
  Bell,
  Building,
  Camera,
  Music,
  Utensils,
  PartyPopper,
  Cake,
  Search,
  Filter,
  Download,
  Share,
  Bot,
  Shield,
  Zap,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  ArrowRight,
  BarChart3,
  Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerLifecycleStage {
  id: string;
  name: string;
  description: string;
  order: number;
  duration: number; // average days
  activities: string[];
  triggers: string[];
  goals: string[];
  successMetrics: string[];
}

interface CustomerTouchpoint {
  id: string;
  customerId: string;
  type: 'email' | 'call' | 'meeting' | 'survey' | 'review_request' | 'referral_ask' | 'event_follow_up' | 'anniversary';
  channel: 'email' | 'phone' | 'in_person' | 'sms' | 'social' | 'mail';
  title: string;
  description: string;
  scheduledDate: Date;
  completedDate?: Date;
  status: 'scheduled' | 'completed' | 'failed' | 'cancelled';
  outcome?: 'positive' | 'neutral' | 'negative';
  notes?: string;
  assignedTo: string;
  automationTriggered: boolean;
  followUpRequired?: boolean;
  nextTouchpoint?: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  currentStage: string;
  stageStartDate: Date;
  totalValue: number;
  eventsHosted: number;
  lastEventDate: Date;
  nextEventDate?: Date;
  satisfactionScore: number;
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  referralsGenerated: number;
  touchpoints: CustomerTouchpoint[];
  preferences: {
    communicationChannel: string;
    frequency: string;
    interests: string[];
  };
  tags: string[];
  assignedManager: string;
  acquisitionSource: string;
  lifetimeValue: number;
  riskScore: number; // 0-100, higher = more risk of churn
  aiInsights?: {
    churnProbability: number;
    retentionRecommendations: string[];
    upsellOpportunities: string[];
    nextBestAction: string;
    sentimentTrend: 'positive' | 'neutral' | 'negative';
  };
}

interface LifecycleMetrics {
  totalCustomers: number;
  activeCustomers: number;
  churnRate: number;
  averageLifetimeValue: number;
  retentionRate: number;
  repeatEventRate: number;
  referralRate: number;
  satisfactionScore: number;
  stageDistribution: { [stage: string]: number };
  touchpointSuccess: number;
}

const defaultLifecycleStages: CustomerLifecycleStage[] = [
  {
    id: 'onboarding',
    name: 'Post-Event Onboarding',
    description: 'Immediate follow-up and relationship building after successful event',
    order: 1,
    duration: 14,
    activities: [
      'Send thank you message with event photos',
      'Request feedback and testimonial',
      'Provide post-event services guide',
      'Schedule satisfaction survey'
    ],
    triggers: [
      'Event completion',
      'Final payment received',
      'Venue handover completed'
    ],
    goals: [
      'Ensure customer satisfaction',
      'Capture testimonials and reviews',
      'Set foundation for long-term relationship'
    ],
    successMetrics: [
      'Satisfaction score > 8/10',
      'Testimonial received',
      'No complaints or issues'
    ]
  },
  {
    id: 'nurturing',
    name: 'Relationship Nurturing',
    description: 'Ongoing relationship building and value-added communications',
    order: 2,
    duration: 90,
    activities: [
      'Send relevant industry insights',
      'Share event planning tips and trends',
      'Invite to exclusive customer events',
      'Provide seasonal event ideas'
    ],
    triggers: [
      'Onboarding stage completion',
      'Positive feedback received',
      'No negative interactions'
    ],
    goals: [
      'Stay top-of-mind for future events',
      'Position as trusted advisor',
      'Build emotional connection'
    ],
    successMetrics: [
      'Email open rate > 25%',
      'Event attendance at customer events',
      'Social media engagement'
    ]
  },
  {
    id: 'retention',
    name: 'Active Retention',
    description: 'Proactive retention efforts and repeat business development',
    order: 3,
    duration: 180,
    activities: [
      'Monitor event anniversary dates',
      'Proactive outreach for future events',
      'Offer loyalty discounts and perks',
      'Request referrals from satisfied customers'
    ],
    triggers: [
      '6 months since last event',
      'Seasonal event opportunities',
      'Customer milestone dates'
    ],
    goals: [
      'Generate repeat business',
      'Increase customer lifetime value',
      'Reduce churn risk'
    ],
    successMetrics: [
      'Repeat booking rate > 40%',
      'Referrals generated',
      'Increased event value'
    ]
  },
  {
    id: 'loyalty',
    name: 'Loyalty & Advocacy',
    description: 'Transform satisfied customers into brand advocates and VIP clients',
    order: 4,
    duration: 365,
    activities: [
      'VIP customer program enrollment',
      'Exclusive preview of new services',
      'Partner collaboration opportunities',
      'Brand ambassador program'
    ],
    triggers: [
      'Multiple successful events',
      'High satisfaction scores',
      'Active referral generation'
    ],
    goals: [
      'Create brand advocates',
      'Maximize lifetime value',
      'Generate word-of-mouth marketing'
    ],
    successMetrics: [
      'Net Promoter Score > 9',
      'Multiple referrals per year',
      'Premium service adoption'
    ]
  },
  {
    id: 'at_risk',
    name: 'At-Risk Recovery',
    description: 'Identify and recover customers showing signs of churn or dissatisfaction',
    order: 0,
    duration: 30,
    activities: [
      'Personal outreach from senior staff',
      'Service recovery initiatives',
      'Special offers and concessions',
      'Detailed feedback collection'
    ],
    triggers: [
      'Long period without contact',
      'Negative feedback or complaints',
      'Declined booking opportunities'
    ],
    goals: [
      'Prevent customer churn',
      'Resolve outstanding issues',
      'Restore customer confidence'
    ],
    successMetrics: [
      'Issue resolution rate > 90%',
      'Satisfaction improvement',
      'Retention of at-risk customers'
    ]
  }
];

const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'TechCorp Industries',
    email: 'sarah.johnson@techcorp.com',
    phone: '+1 (555) 123-4567',
    company: 'TechCorp Industries',
    currentStage: 'nurturing',
    stageStartDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    totalValue: 125000,
    eventsHosted: 2,
    lastEventDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    nextEventDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
    satisfactionScore: 9.2,
    loyaltyTier: 'gold',
    referralsGenerated: 3,
    touchpoints: [],
    preferences: {
      communicationChannel: 'email',
      frequency: 'monthly',
      interests: ['corporate events', 'team building', 'conferences']
    },
    tags: ['corporate', 'high-value', 'repeat-customer'],
    assignedManager: 'William Morrison',
    acquisitionSource: 'Website inquiry',
    lifetimeValue: 125000,
    riskScore: 15,
    aiInsights: {
      churnProbability: 0.12,
      retentionRecommendations: [
        'Schedule quarterly check-ins',
        'Offer early bird pricing for next corporate retreat',
        'Introduce to new premium services'
      ],
      upsellOpportunities: [
        'Premium AV package for next conference',
        'Extended venue hours for networking events',
        'Custom branding and signage services'
      ],
      nextBestAction: 'Schedule Q1 corporate retreat planning call',
      sentimentTrend: 'positive'
    }
  },
  {
    id: 'cust-2',
    name: 'Michael & Jennifer Peterson',
    email: 'mjpeterson@email.com',
    currentStage: 'onboarding',
    stageStartDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    totalValue: 42000,
    eventsHosted: 1,
    lastEventDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    satisfactionScore: 9.8,
    loyaltyTier: 'silver',
    referralsGenerated: 0,
    touchpoints: [],
    preferences: {
      communicationChannel: 'email',
      frequency: 'as-needed',
      interests: ['wedding', 'anniversary', 'celebrations']
    },
    tags: ['wedding', 'first-time', 'high-satisfaction'],
    assignedManager: 'Sarah Wilson',
    acquisitionSource: 'Referral',
    lifetimeValue: 42000,
    riskScore: 5,
    aiInsights: {
      churnProbability: 0.08,
      retentionRecommendations: [
        'Send anniversary reminder next year',
        'Offer anniversary celebration package',
        'Request wedding photos for testimonial'
      ],
      upsellOpportunities: [
        'Anniversary party in 1 year',
        'Baby shower planning services',
        'Holiday party hosting'
      ],
      nextBestAction: 'Request wedding testimonial and photos',
      sentimentTrend: 'positive'
    }
  },
  {
    id: 'cust-3',
    name: 'Global Innovations LLC',
    email: 'events@globalinnovations.com',
    phone: '+1 (555) 987-6543',
    company: 'Global Innovations LLC',
    currentStage: 'at_risk',
    stageStartDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    totalValue: 85000,
    eventsHosted: 3,
    lastEventDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    satisfactionScore: 6.5,
    loyaltyTier: 'bronze',
    referralsGenerated: 1,
    touchpoints: [],
    preferences: {
      communicationChannel: 'phone',
      frequency: 'quarterly',
      interests: ['product launches', 'corporate events', 'trade shows']
    },
    tags: ['corporate', 'at-risk', 'requires-attention'],
    assignedManager: 'Mike Rodriguez',
    acquisitionSource: 'Cold outreach',
    lifetimeValue: 85000,
    riskScore: 78,
    aiInsights: {
      churnProbability: 0.73,
      retentionRecommendations: [
        'Immediate personal outreach from senior management',
        'Offer service recovery package',
        'Schedule in-person meeting to address concerns'
      ],
      upsellOpportunities: [],
      nextBestAction: 'Executive-level recovery call within 48 hours',
      sentimentTrend: 'negative'
    }
  }
];

const mockMetrics: LifecycleMetrics = {
  totalCustomers: 87,
  activeCustomers: 76,
  churnRate: 8.5,
  averageLifetimeValue: 78000,
  retentionRate: 84,
  repeatEventRate: 62,
  referralRate: 34,
  satisfactionScore: 8.7,
  stageDistribution: {
    onboarding: 12,
    nurturing: 28,
    retention: 31,
    loyalty: 15,
    at_risk: 8
  },
  touchpointSuccess: 78
};

interface CustomerLifecycleProps {
  className?: string;
}

export default function CustomerLifecycle({ className }: CustomerLifecycleProps) {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [lifecycleStages] = useState<CustomerLifecycleStage[]>(defaultLifecycleStages);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isTouchpointDialogOpen, setIsTouchpointDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("customers");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterRisk, setFilterRisk] = useState<string>("all");

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = searchQuery === "" || 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.company?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStage = filterStage === "all" || customer.currentStage === filterStage;
      const matchesRisk = filterRisk === "all" ||
        (filterRisk === "low" && customer.riskScore < 30) ||
        (filterRisk === "medium" && customer.riskScore >= 30 && customer.riskScore < 70) ||
        (filterRisk === "high" && customer.riskScore >= 70);
      
      return matchesSearch && matchesStage && matchesRisk;
    });
  }, [customers, searchQuery, filterStage, filterRisk]);

  const getStageColor = (stageId: string) => {
    switch (stageId) {
      case 'onboarding': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'nurturing': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'retention': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'loyalty': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20';
      case 'at_risk': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getLoyaltyTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20';
      case 'gold': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'silver': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
      case 'bronze': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 70) return 'text-red-500';
    if (riskScore >= 30) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'negative': return <ThumbsDown className="h-4 w-4 text-red-500" />;
      default: return <MessageCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStageIcon = (stageId: string) => {
    switch (stageId) {
      case 'onboarding': return Gift;
      case 'nurturing': return Heart;
      case 'retention': return Target;
      case 'loyalty': return Award;
      case 'at_risk': return AlertTriangle;
      default: return Users;
    }
  };

  const handleStageMove = useCallback((customerId: string, newStage: string) => {
    setCustomers(prev => prev.map(customer => 
      customer.id === customerId 
        ? { ...customer, currentStage: newStage, stageStartDate: new Date() }
        : customer
    ));
  }, []);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Customer Lifecycle</h1>
          <p className="text-muted-foreground mt-2">
            Post-sale relationship management and customer retention
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" className="apple-button">
            <Bot className="h-4 w-4 mr-2" />
            AI Insights
          </Button>
          <Dialog open={isTouchpointDialogOpen} onOpenChange={setIsTouchpointDialogOpen}>
            <DialogTrigger asChild>
              <Button className="apple-button">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Touchpoint
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule Customer Touchpoint</DialogTitle>
                <DialogDescription>
                  Plan a customer interaction to maintain and strengthen the relationship
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="touchpoint-customer">Customer</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="touchpoint-type">Touchpoint Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="call">Phone Call</SelectItem>
                        <SelectItem value="meeting">In-Person Meeting</SelectItem>
                        <SelectItem value="survey">Satisfaction Survey</SelectItem>
                        <SelectItem value="review_request">Review Request</SelectItem>
                        <SelectItem value="referral_ask">Referral Request</SelectItem>
                        <SelectItem value="event_follow_up">Event Follow-up</SelectItem>
                        <SelectItem value="anniversary">Anniversary Contact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="touchpoint-title">Title</Label>
                  <Input id="touchpoint-title" placeholder="Quarterly check-in call" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="touchpoint-description">Description</Label>
                  <Textarea id="touchpoint-description" placeholder="Discuss upcoming events and gather feedback..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="touchpoint-date">Scheduled Date</Label>
                    <Input id="touchpoint-date" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="touchpoint-channel">Channel</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="in_person">In Person</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="social">Social Media</SelectItem>
                        <SelectItem value="mail">Mail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTouchpointDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsTouchpointDialogOpen(false)}>
                  Schedule Touchpoint
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Customers</p>
                <p className="text-2xl font-bold text-foreground">{mockMetrics.activeCustomers}</p>
              </div>
              <Users className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Retention Rate</p>
                <p className="text-2xl font-bold text-green-500">{mockMetrics.retentionRate}%</p>
              </div>
              <Heart className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Lifetime Value</p>
                <p className="text-2xl font-bold text-blue-500">${(mockMetrics.averageLifetimeValue / 1000).toFixed(0)}k</p>
              </div>
              <DollarSign className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Satisfaction Score</p>
                <p className="text-2xl font-bold text-yellow-500">{mockMetrics.satisfactionScore}</p>
              </div>
              <Star className="h-6 w-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="customers">Customers ({filteredCustomers.length})</TabsTrigger>
          <TabsTrigger value="stages">Lifecycle Stages</TabsTrigger>
          <TabsTrigger value="touchpoints">Scheduled Touchpoints</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-6 mt-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterStage} onValueChange={setFilterStage}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {lifecycleStages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterRisk} onValueChange={setFilterRisk}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Customer List */}
          <div className="space-y-4">
            {filteredCustomers.map((customer) => {
              const currentStage = lifecycleStages.find(s => s.id === customer.currentStage);
              const StageIcon = getStageIcon(customer.currentStage);
              
              return (
                <Card key={customer.id} className="glass-panel">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <StageIcon className="h-6 w-6 text-primary" />
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-medium text-lg">{customer.name}</h3>
                              {customer.company && (
                                <Badge variant="outline" className="text-xs">
                                  {customer.company}
                                </Badge>
                              )}
                              <Badge className={cn("text-xs", getStageColor(customer.currentStage))}>
                                {currentStage?.name}
                              </Badge>
                              <Badge className={cn("text-xs capitalize", getLoyaltyTierColor(customer.loyaltyTier))}>
                                {customer.loyaltyTier}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span>{customer.email}</span>
                              {customer.phone && <span>{customer.phone}</span>}
                              <span>{customer.eventsHosted} events hosted</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Lifetime Value:</span>
                              <span className="ml-2 font-medium">${customer.lifetimeValue.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Satisfaction:</span>
                              <span className="ml-2 font-medium">{customer.satisfactionScore}/10</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Last Event:</span>
                              <span className="ml-2 font-medium">{customer.lastEventDate.toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Referrals:</span>
                              <span className="ml-2 font-medium">{customer.referralsGenerated}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground">Risk Score:</span>
                                <span className={cn("text-sm font-medium", getRiskColor(customer.riskScore))}>
                                  {customer.riskScore}/100
                                </span>
                                <Progress value={customer.riskScore} className="w-16 h-2" />
                              </div>
                              
                              {customer.aiInsights && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-muted-foreground">Sentiment:</span>
                                  {getSentimentIcon(customer.aiInsights.sentimentTrend)}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex space-x-1">
                              {customer.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          {customer.aiInsights && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="flex items-center space-x-2 mb-2">
                                <Bot className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                  AI Recommendations
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {Math.round((1 - customer.aiInsights.churnProbability) * 100)}% retention probability
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <div>
                                  <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">Next Best Action:</div>
                                  <p className="text-blue-600 dark:text-blue-200">{customer.aiInsights.nextBestAction}</p>
                                </div>
                                <div>
                                  <div className="font-medium text-green-700 dark:text-green-300 mb-1">Upsell Opportunities:</div>
                                  <ul className="space-y-1">
                                    {customer.aiInsights.upsellOpportunities.slice(0, 2).map((opportunity, index) => (
                                      <li key={index} className="text-green-600 dark:text-green-200">• {opportunity}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="text-xs text-muted-foreground">
                            In {currentStage?.name} stage for {Math.floor((new Date().getTime() - customer.stageStartDate.getTime()) / (1000 * 60 * 60 * 24))} days
                            • Managed by {customer.assignedManager}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedCustomer(customer)}
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
                              <Phone className="h-3 w-3 mr-2" />
                              Schedule Call
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Calendar className="h-3 w-3 mr-2" />
                              Plan Touchpoint
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <ArrowRight className="h-3 w-3 mr-2" />
                              Move Stage
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-3 w-3 mr-2" />
                              Edit Customer
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
          
          {filteredCustomers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No customers found</h3>
              <p className="text-muted-foreground">
                {searchQuery || filterStage !== "all" || filterRisk !== "all"
                  ? "Try adjusting your search or filters" 
                  : "Your customer lifecycle management will appear here"}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stages" className="space-y-6 mt-6">
          {/* Lifecycle Stages */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lifecycleStages.filter(stage => stage.order > 0).map((stage) => {
              const StageIcon = getStageIcon(stage.id);
              const stageCustomers = customers.filter(c => c.currentStage === stage.id).length;
              
              return (
                <Card key={stage.id} className="glass-panel">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <StageIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{stage.name}</CardTitle>
                        <Badge className={cn("text-xs mt-1", getStageColor(stage.id))}>
                          {stageCustomers} customers
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="text-sm">
                      {stage.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Avg Duration:</span>
                        <span className="ml-2 font-medium">{stage.duration} days</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Order:</span>
                        <span className="ml-2 font-medium">Stage {stage.order}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Key Activities:</div>
                      <ul className="space-y-1">
                        {stage.activities.slice(0, 3).map((activity, index) => (
                          <li key={index} className="text-xs text-muted-foreground flex items-start">
                            <CheckCircle className="h-3 w-3 mr-2 mt-0.5 text-green-500" />
                            <span>{activity}</span>
                          </li>
                        ))}
                        {stage.activities.length > 3 && (
                          <li className="text-xs text-muted-foreground">
                            +{stage.activities.length - 3} more activities
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Success Metrics:</div>
                      <ul className="space-y-1">
                        {stage.successMetrics.slice(0, 2).map((metric, index) => (
                          <li key={index} className="text-xs text-muted-foreground flex items-start">
                            <Target className="h-3 w-3 mr-2 mt-0.5 text-blue-500" />
                            <span>{metric}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* At-Risk Stage */}
            {lifecycleStages.filter(stage => stage.id === 'at_risk').map((stage) => {
              const StageIcon = getStageIcon(stage.id);
              const stageCustomers = customers.filter(c => c.currentStage === stage.id).length;
              
              return (
                <Card key={stage.id} className="glass-panel border-red-500/50 bg-red-500/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                        <StageIcon className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-red-700 dark:text-red-300">{stage.name}</CardTitle>
                        <Badge className="text-xs mt-1 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300">
                          {stageCustomers} customers
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="text-sm text-red-600 dark:text-red-200">
                      {stage.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                      <div className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                        Recovery Actions:
                      </div>
                      <ul className="space-y-1">
                        {stage.activities.slice(0, 2).map((activity, index) => (
                          <li key={index} className="text-xs text-red-600 dark:text-red-200 flex items-start">
                            <AlertTriangle className="h-3 w-3 mr-2 mt-0.5 text-red-500" />
                            <span>{activity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="touchpoints" className="mt-6">
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Scheduled Touchpoints</h3>
            <p className="text-muted-foreground">Customer touchpoint calendar and management coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Customer Distribution by Stage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(mockMetrics.stageDistribution).map(([stage, count]) => {
                  const stageInfo = lifecycleStages.find(s => s.id === stage);
                  const percentage = Math.round((count / mockMetrics.totalCustomers) * 100);
                  
                  return (
                    <div key={stage} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{stageInfo?.name || stage}</span>
                        <span>{count} ({percentage}%)</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Key Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-3">
                  <div className="flex justify-between">
                    <span>Customer Retention Rate:</span>
                    <span className="font-medium text-green-500">{mockMetrics.retentionRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Repeat Event Rate:</span>
                    <span className="font-medium">{mockMetrics.repeatEventRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer Referral Rate:</span>
                    <span className="font-medium">{mockMetrics.referralRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Satisfaction:</span>
                    <span className="font-medium text-yellow-500">{mockMetrics.satisfactionScore}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Churn Rate:</span>
                    <span className="font-medium text-red-500">{mockMetrics.churnRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Touchpoint Success:</span>
                    <span className="font-medium text-blue-500">{mockMetrics.touchpointSuccess}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="glass-panel max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedCustomer && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedCustomer.name}</DialogTitle>
                <DialogDescription>
                  Complete customer lifecycle view and relationship history
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-6">
                    {/* Customer Overview */}
                    <Card className="glass-panel">
                      <CardHeader>
                        <CardTitle>Customer Overview</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Email:</span>
                            <span className="ml-2 font-medium">{selectedCustomer.email}</span>
                          </div>
                          {selectedCustomer.phone && (
                            <div>
                              <span className="text-muted-foreground">Phone:</span>
                              <span className="ml-2 font-medium">{selectedCustomer.phone}</span>
                            </div>
                          )}
                          {selectedCustomer.company && (
                            <div>
                              <span className="text-muted-foreground">Company:</span>
                              <span className="ml-2 font-medium">{selectedCustomer.company}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Loyalty Tier:</span>
                            <span className="ml-2 font-medium capitalize">{selectedCustomer.loyaltyTier}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Acquisition Source:</span>
                            <span className="ml-2 font-medium">{selectedCustomer.acquisitionSource}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Assigned Manager:</span>
                            <span className="ml-2 font-medium">{selectedCustomer.assignedManager}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* AI Insights */}
                    {selectedCustomer.aiInsights && (
                      <Card className="glass-panel">
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Bot className="h-5 w-5 mr-2 text-blue-500" />
                            AI Customer Insights
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-sm mb-2 text-green-700 dark:text-green-300">Retention Recommendations:</h4>
                              <ul className="space-y-1">
                                {selectedCustomer.aiInsights.retentionRecommendations.map((rec, index) => (
                                  <li key={index} className="text-sm text-green-600 dark:text-green-200 flex items-start">
                                    <CheckCircle className="h-3 w-3 mr-2 mt-0.5 text-green-500" />
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-sm mb-2 text-blue-700 dark:text-blue-300">Upsell Opportunities:</h4>
                              <ul className="space-y-1">
                                {selectedCustomer.aiInsights.upsellOpportunities.map((opportunity, index) => (
                                  <li key={index} className="text-sm text-blue-600 dark:text-blue-200 flex items-start">
                                    <TrendingUp className="h-3 w-3 mr-2 mt-0.5 text-blue-500" />
                                    <span>{opportunity}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <h4 className="font-medium text-sm mb-1 text-blue-700 dark:text-blue-300">
                              Next Best Action:
                            </h4>
                            <p className="text-sm text-blue-600 dark:text-blue-200">
                              {selectedCustomer.aiInsights.nextBestAction}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* Customer Score */}
                    <Card className="glass-panel">
                      <CardHeader>
                        <CardTitle>Customer Health</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-primary mb-2">
                            {selectedCustomer.satisfactionScore}/10
                          </div>
                          <div className="text-sm text-muted-foreground mb-4">Satisfaction Score</div>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span>Churn Risk</span>
                              <span className={cn("font-medium", getRiskColor(selectedCustomer.riskScore))}>
                                {selectedCustomer.riskScore}/100
                              </span>
                            </div>
                            <Progress value={selectedCustomer.riskScore} className="h-2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <Card className="glass-panel">
                      <CardHeader>
                        <CardTitle>Quick Stats</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm space-y-2">
                          <div className="flex justify-between">
                            <span>Events Hosted:</span>
                            <span className="font-medium">{selectedCustomer.eventsHosted}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Lifetime Value:</span>
                            <span className="font-medium">${selectedCustomer.lifetimeValue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Referrals Generated:</span>
                            <span className="font-medium">{selectedCustomer.referralsGenerated}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Last Event:</span>
                            <span className="font-medium">{selectedCustomer.lastEventDate.toLocaleDateString()}</span>
                          </div>
                          {selectedCustomer.nextEventDate && (
                            <div className="flex justify-between">
                              <span>Next Event:</span>
                              <span className="font-medium text-green-500">
                                {selectedCustomer.nextEventDate.toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="glass-panel">
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
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
                          <Calendar className="h-4 w-4 mr-2" />
                          Plan Event
                        </Button>
                        <Button size="sm" variant="outline" className="w-full justify-start">
                          <Gift className="h-4 w-4 mr-2" />
                          Send Gift
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
