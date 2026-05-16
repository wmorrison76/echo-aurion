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
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Plus,
  Edit,
  Trash2,
  Eye,
  ArrowRight,
  ArrowLeft,
  Filter,
  Search,
  BarChart3,
  Target,
  Zap,
  Star,
  Building,
  MapPin,
  User,
  Heart,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Deal,
  Lead,
  PipelineStage,
  SalesActivity,
  Objection,
  defaultHospitalityPipeline,
  DealActivity,
  SalesMetrics,
} from "@shared/sales-pipeline-types";
import AISalesAssistant from "./AISalesAssistant";

// Mock data for demonstration
const mockDeals: Deal[] = [
  {
    id: 'deal-1',
    leadId: 'lead-1',
    name: 'TechCorp Annual Conference',
    description: 'Corporate conference for 300 attendees',
    stage: 'proposal',
    value: 75000,
    probability: 70,
    expectedCloseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    assignedTo: 'John Smith',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    eventDetails: {
      eventType: 'corporate',
      eventDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      guestCount: 300,
      venue: 'Grand Ballroom A',
      requirements: ['AV Equipment', 'Catering', 'Parking'],
      specialRequests: 'Lactose-free meal options needed'
    },
    activities: [],
    proposals: [],
    objections: [],
    competitors: ['Hotel Competitor A'],
    tags: ['corporate', 'high-value']
  },
  {
    id: 'deal-2',
    leadId: 'lead-2',
    name: 'Johnson Wedding Reception',
    description: 'Elegant wedding reception for 120 guests',
    stage: 'negotiation',
    value: 35000,
    probability: 85,
    expectedCloseDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    assignedTo: 'Sarah Wilson',
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    eventDetails: {
      eventType: 'wedding',
      eventDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      guestCount: 120,
      venue: 'Rose Garden Pavilion',
      requirements: ['Photography', 'Floral', 'Music'],
      specialRequests: 'Outdoor ceremony backup needed'
    },
    activities: [],
    proposals: [],
    objections: [],
    competitors: [],
    tags: ['wedding', 'urgent']
  },
  {
    id: 'deal-3',
    leadId: 'lead-3',
    name: 'Charity Gala Fundraiser',
    description: 'Annual fundraising gala for 250 guests',
    stage: 'qualified',
    value: 50000,
    probability: 40,
    expectedCloseDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    assignedTo: 'Mike Rodriguez',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    eventDetails: {
      eventType: 'gala',
      eventDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      guestCount: 250,
      venue: 'Grand Ballroom B',
      requirements: ['Silent Auction Setup', 'Premium Catering', 'Entertainment'],
      specialRequests: 'Live streaming for remote attendees'
    },
    activities: [],
    proposals: [],
    objections: [],
    competitors: ['Event Center Downtown'],
    tags: ['gala', 'nonprofit']
  }
];

const mockMetrics: SalesMetrics = {
  period: 'monthly',
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  endDate: new Date(),
  newLeads: 45,
  qualifiedLeads: 23,
  proposals: 12,
  closedWon: 8,
  closedLost: 4,
  totalRevenue: 425000,
  averageDealSize: 53125,
  salesCycleLength: 28,
  leadToQualified: 51,
  qualifiedToProposal: 52,
  proposalToClose: 67,
  overallConversion: 18,
  calls: 156,
  emails: 289,
  meetings: 67,
  demos: 23,
  topPerformers: [
    { salesPerson: 'Sarah Wilson', revenue: 145000, deals: 3, activities: 78 },
    { salesPerson: 'John Smith', revenue: 125000, deals: 2, activities: 65 },
    { salesPerson: 'Mike Rodriguez', revenue: 95000, deals: 2, activities: 52 }
  ],
  pipelineValue: 485000,
  weightedPipeline: 267500,
  forecastAccuracy: 85
};

interface SalesPipelineProps {
  className?: string;
}

export default function SalesPipeline({ className }: SalesPipelineProps) {
  const [deals, setDeals] = useState<Deal[]>(mockDeals);
  const [stages] = useState<PipelineStage[]>(defaultHospitalityPipeline.filter(s => s.id !== 'closed_lost'));
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");

  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      const matchesSearch = searchQuery === "" || 
        deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.eventDetails?.venue.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStage = filterStage === "all" || deal.stage === filterStage;
      const matchesAssignee = filterAssignee === "all" || deal.assignedTo === filterAssignee;
      
      return matchesSearch && matchesStage && matchesAssignee;
    });
  }, [deals, searchQuery, filterStage, filterAssignee]);

  const dealsByStage = useMemo(() => {
    const grouped = stages.reduce((acc, stage) => {
      acc[stage.id] = filteredDeals.filter(deal => deal.stage === stage.id);
      return acc;
    }, {} as Record<string, Deal[]>);
    return grouped;
  }, [stages, filteredDeals]);

  const pipelineValue = useMemo(() => {
    return filteredDeals.reduce((sum, deal) => sum + deal.value, 0);
  }, [filteredDeals]);

  const weightedValue = useMemo(() => {
    return filteredDeals.reduce((sum, deal) => {
      const stage = stages.find(s => s.id === deal.stage);
      return sum + (deal.value * (stage?.probability || 0) / 100);
    }, 0);
  }, [filteredDeals, stages]);

  const handleDealMove = useCallback((dealId: string, newStage: string) => {
    setDeals(prev => prev.map(deal => 
      deal.id === dealId 
        ? { ...deal, stage: newStage, updatedAt: new Date() }
        : deal
    ));
  }, []);

  const getStageIcon = (stageId: string) => {
    switch (stageId) {
      case 'prospecting': return Search;
      case 'qualified': return CheckCircle;
      case 'initial_contact': return Phone;
      case 'proposal': return FileText;
      case 'negotiation': return MessageSquare;
      case 'closed_won': return Target;
      default: return AlertCircle;
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'wedding': return Heart;
      case 'corporate': return Building;
      case 'gala': return Star;
      default: return Calendar;
    }
  };

  const getDaysUntilClose = (date: Date) => {
    const diffTime = date.getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyColor = (days: number) => {
    if (days < 0) return 'text-red-500'; // Overdue
    if (days <= 3) return 'text-orange-500'; // Very urgent
    if (days <= 7) return 'text-yellow-500'; // Urgent
    return 'text-green-500'; // Normal
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales Pipeline</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage your hospitality sales opportunities
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" className="apple-button">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="apple-button">
                <Plus className="h-4 w-4 mr-2" />
                New Deal
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Deal</DialogTitle>
                <DialogDescription>
                  Add a new opportunity to your sales pipeline
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deal-name">Deal Name</Label>
                    <Input id="deal-name" placeholder="Corporate Conference 2024" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deal-value">Estimated Value</Label>
                    <Input id="deal-value" type="number" placeholder="50000" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deal-stage">Initial Stage</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map(stage => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deal-assignee">Assigned To</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="john-smith">John Smith</SelectItem>
                        <SelectItem value="sarah-wilson">Sarah Wilson</SelectItem>
                        <SelectItem value="mike-rodriguez">Mike Rodriguez</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deal-description">Description</Label>
                  <Textarea id="deal-description" placeholder="Brief description of the opportunity..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(false)}>
                  Create Deal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pipeline Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
                <p className="text-2xl font-bold text-foreground">
                  ${pipelineValue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Weighted Value</p>
                <p className="text-2xl font-bold text-foreground">
                  ${weightedValue.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Deals</p>
                <p className="text-2xl font-bold text-foreground">{filteredDeals.length}</p>
              </div>
              <Target className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Deal Size</p>
                <p className="text-2xl font-bold text-foreground">
                  ${Math.round(pipelineValue / filteredDeals.length || 0).toLocaleString()}
                </p>
              </div>
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pipeline">Pipeline View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="metrics">Metrics & Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-6 mt-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deals..."
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
                  {stages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  <SelectItem value="John Smith">John Smith</SelectItem>
                  <SelectItem value="Sarah Wilson">Sarah Wilson</SelectItem>
                  <SelectItem value="Mike Rodriguez">Mike Rodriguez</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pipeline Stages */}
          <div className="flex space-x-6 overflow-x-auto pb-4">
            {stages.map((stage) => {
              const stageDeals = dealsByStage[stage.id] || [];
              const stageValue = stageDeals.reduce((sum, deal) => sum + deal.value, 0);
              const StageIcon = getStageIcon(stage.id);

              return (
                <div key={stage.id} className="flex-shrink-0 w-80">
                  <Card className="glass-panel h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <StageIcon className="h-4 w-4 text-primary" />
                          <CardTitle className="text-lg">{stage.name}</CardTitle>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {stageDeals.length}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">
                        ${stageValue.toLocaleString()} • {stage.probability}% avg
                      </CardDescription>
                      <Progress value={(stageValue / pipelineValue) * 100} className="h-2" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ScrollArea className="h-96">
                        {stageDeals.map((deal) => {
                          const EventIcon = getEventTypeIcon(deal.eventDetails?.eventType || '');
                          const daysUntilClose = getDaysUntilClose(deal.expectedCloseDate);
                          
                          return (
                            <Card 
                              key={deal.id} 
                              className="mb-3 cursor-pointer hover:border-primary/50 transition-colors"
                              onClick={() => setSelectedDeal(deal)}
                            >
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-sm leading-tight">{deal.name}</h4>
                                      <p className="text-xs text-muted-foreground mt-1">{deal.description}</p>
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-6 w-6 p-0"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <MoreVertical className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem>
                                          <Eye className="h-3 w-3 mr-2" />
                                          View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                          <Edit className="h-3 w-3 mr-2" />
                                          Edit Deal
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-red-600">
                                          <Trash2 className="h-3 w-3 mr-2" />
                                          Delete Deal
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>

                                  <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center space-x-1">
                                      <EventIcon className="h-3 w-3 text-primary" />
                                      <span>{deal.eventDetails?.eventType}</span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      ${deal.value.toLocaleString()}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center space-x-1">
                                      <Users className="h-3 w-3 text-muted-foreground" />
                                      <span>{deal.eventDetails?.guestCount} guests</span>
                                    </div>
                                    <div className={cn(
                                      "flex items-center space-x-1",
                                      getUrgencyColor(daysUntilClose)
                                    )}>
                                      <Clock className="h-3 w-3" />
                                      <span>
                                        {daysUntilClose < 0 ? 'Overdue' : 
                                         daysUntilClose === 0 ? 'Today' : 
                                         `${daysUntilClose}d`}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                      <User className="h-3 w-3" />
                                      <span>{deal.assignedTo}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Progress value={deal.probability} className="w-12 h-1" />
                                      <span className="text-xs text-muted-foreground">{deal.probability}%</span>
                                    </div>
                                  </div>

                                  {deal.eventDetails?.venue && (
                                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                      <MapPin className="h-3 w-3" />
                                      <span>{deal.eventDetails.venue}</span>
                                    </div>
                                  )}

                                  {/* Quick Actions */}
                                  <div className="flex space-x-1 pt-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle quick call action
                            }}
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            Call
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle quick email action
                            }}
                          >
                            <Mail className="h-3 w-3 mr-1" />
                            Email
                          </Button>
                          <AISalesAssistant
                            eventContext={{
                              type: deal.eventDetails?.eventType,
                              guestCount: deal.eventDetails?.guestCount,
                              budget: deal.value,
                              venue: deal.eventDetails?.venue
                            }}
                            onSuggestionApply={(suggestion) => {
                              console.log('Applied suggestion:', suggestion);
                              // Here you could update the deal with the suggestion
                            }}
                          />
                          {stage.order < stages.length - 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextStage = stages.find(s => s.order === stage.order + 1);
                                if (nextStage) {
                                  handleDealMove(deal.id, nextStage.id);
                                }
                              }}
                            >
                              <ArrowRight className="h-3 w-3 mr-1" />
                              Next
                            </Button>
                          )}
                        </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          {/* List view would go here */}
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">List View</h3>
            <p className="text-muted-foreground">Tabular view of all deals coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="mt-6">
          {/* Metrics dashboard would go here */}
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Sales Metrics</h3>
            <p className="text-muted-foreground">Advanced analytics and reporting coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Deal Detail Dialog */}
      <Dialog open={!!selectedDeal} onOpenChange={() => setSelectedDeal(null)}>
        <DialogContent className="glass-panel max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedDeal && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedDeal.name}</DialogTitle>
                <DialogDescription>
                  {selectedDeal.description}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="md:col-span-2 space-y-6">
                  {/* Deal Overview */}
                  <Card className="glass-panel">
                    <CardHeader>
                      <CardTitle>Deal Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Value:</span>
                          <span className="ml-2 font-medium">${selectedDeal.value.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Probability:</span>
                          <span className="ml-2 font-medium">{selectedDeal.probability}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Expected Close:</span>
                          <span className="ml-2 font-medium">{selectedDeal.expectedCloseDate.toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Assigned To:</span>
                          <span className="ml-2 font-medium">{selectedDeal.assignedTo}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* AI-Powered Objection Handling */}
                  <Card className="glass-panel">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-blue-500" />
                        AI Objection Support
                      </CardTitle>
                      <CardDescription>
                        Get AI-powered responses for client objections and concerns
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                            <strong>Common objections for {selectedDeal.eventDetails?.eventType} events:</strong>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-blue-100">
                              Price concerns
                            </Badge>
                            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-blue-100">
                              Timing issues
                            </Badge>
                            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-blue-100">
                              Need approval
                            </Badge>
                            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-blue-100">
                              Comparing options
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Click on the AI Sales Assistant button below to access the full objection handling toolkit.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Event Details */}
                  {selectedDeal.eventDetails && (
                    <Card className="glass-panel">
                      <CardHeader>
                        <CardTitle>Event Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Event Type:</span>
                            <span className="ml-2 font-medium capitalize">{selectedDeal.eventDetails.eventType}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Guest Count:</span>
                            <span className="ml-2 font-medium">{selectedDeal.eventDetails.guestCount}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Event Date:</span>
                            <span className="ml-2 font-medium">{selectedDeal.eventDetails.eventDate.toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Venue:</span>
                            <span className="ml-2 font-medium">{selectedDeal.eventDetails.venue}</span>
                          </div>
                        </div>
                        
                        {selectedDeal.eventDetails.requirements.length > 0 && (
                          <div>
                            <span className="text-muted-foreground text-sm">Requirements:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedDeal.eventDetails.requirements.map((req, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {req}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedDeal.eventDetails.specialRequests && (
                          <div>
                            <span className="text-muted-foreground text-sm">Special Requests:</span>
                            <p className="text-sm mt-1">{selectedDeal.eventDetails.specialRequests}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Quick Actions */}
                  <Card className="glass-panel">
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button size="sm" className="w-full justify-start apple-button">
                        <Phone className="h-4 w-4 mr-2" />
                        Schedule Call
                      </Button>
                      <Button size="sm" variant="outline" className="w-full justify-start">
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </Button>
                      <Button size="sm" variant="outline" className="w-full justify-start">
                        <FileText className="h-4 w-4 mr-2" />
                        Create Proposal
                      </Button>
                      <Button size="sm" variant="outline" className="w-full justify-start">
                        <Calendar className="h-4 w-4 mr-2" />
                        Book Meeting
                      </Button>
                      <div className="pt-2 border-t border-border/50">
                        <AISalesAssistant
                          eventContext={{
                            type: selectedDeal.eventDetails?.eventType,
                            guestCount: selectedDeal.eventDetails?.guestCount,
                            budget: selectedDeal.value,
                            venue: selectedDeal.eventDetails?.venue,
                            clientIndustry: 'corporate' // Could be determined from deal data
                          }}
                          onSuggestionApply={(suggestion) => {
                            console.log('Applied suggestion to deal:', suggestion);
                            // Update deal with AI suggestion
                          }}
                          userLevel="experienced"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stage Progression */}
                  <Card className="glass-panel">
                    <CardHeader>
                      <CardTitle>Stage Progression</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {stages.map((stage, index) => {
                        const isCurrentStage = stage.id === selectedDeal.stage;
                        const isPastStage = stage.order < (stages.find(s => s.id === selectedDeal.stage)?.order || 0);
                        
                        return (
                          <div key={stage.id} className="flex items-center space-x-3">
                            <div className={cn(
                              "w-3 h-3 rounded-full",
                              isPastStage ? "bg-green-500" : 
                              isCurrentStage ? "bg-primary" : "bg-gray-300"
                            )} />
                            <span className={cn(
                              "text-sm",
                              isCurrentStage ? "font-medium text-primary" : 
                              isPastStage ? "text-muted-foreground" : "text-muted-foreground"
                            )}>
                              {stage.name}
                            </span>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
