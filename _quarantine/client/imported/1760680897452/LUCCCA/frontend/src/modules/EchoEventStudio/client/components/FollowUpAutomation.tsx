import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Zap,
  Clock,
  Mail,
  Phone,
  Calendar,
  Users,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  Bot,
  Repeat,
  RefreshCw,
  Filter,
  Search,
  Bell,
  ArrowRight,
  Star,
  Heart,
  Building,
  Sparkles,
  Shield,
  Timer,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    event: 'deal_stage_change' | 'email_opened' | 'email_not_opened' | 'meeting_completed' | 'time_elapsed' | 'custom';
    conditions: {
      stage?: string;
      timeframe?: number; // in days
      eventType?: string;
      dealValue?: { min?: number; max?: number; };
      temperature?: 'hot' | 'warm' | 'cold';
    };
  };
  actions: {
    type: 'send_email' | 'create_task' | 'schedule_call' | 'update_deal' | 'notify_manager';
    template?: string;
    assignTo?: string;
    delay?: number; // in hours
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    content?: string;
  }[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
  successRate: number;
  averageResponseTime?: number; // in hours
}

interface AutomationMetrics {
  totalRules: number;
  activeRules: number;
  totalTriggers: number;
  successfulOutcomes: number;
  timesSaved: number; // in hours
  responseImprovement: number; // percentage
  leadRetention: number; // percentage
}

const mockAutomationRules: AutomationRule[] = [
  {
    id: 'auto-1',
    name: 'Proposal Follow-up Sequence',
    description: 'Automated follow-up sequence when a deal moves to proposal stage',
    trigger: {
      event: 'deal_stage_change',
      conditions: {
        stage: 'proposal'
      }
    },
    actions: [
      {
        type: 'send_email',
        template: 'proposal-sent-confirmation',
        delay: 1
      },
      {
        type: 'create_task',
        content: 'Follow up on proposal feedback',
        assignTo: 'deal_owner',
        delay: 72,
        priority: 'high'
      },
      {
        type: 'send_email',
        template: 'proposal-follow-up',
        delay: 120
      }
    ],
    isActive: true,
    createdBy: 'William Morrison',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastTriggered: new Date(Date.now() - 6 * 60 * 60 * 1000),
    triggerCount: 23,
    successRate: 78,
    averageResponseTime: 18
  },
  {
    id: 'auto-2',
    name: 'Cold Lead Nurturing',
    description: 'Re-engage leads that haven\'t responded in 7 days',
    trigger: {
      event: 'time_elapsed',
      conditions: {
        timeframe: 7,
        temperature: 'cold'
      }
    },
    actions: [
      {
        type: 'send_email',
        template: 'reengagement-offer',
        delay: 0
      },
      {
        type: 'notify_manager',
        content: 'Cold lead requires attention',
        delay: 0
      },
      {
        type: 'create_task',
        content: 'Personal outreach to re-engage lead',
        assignTo: 'deal_owner',
        delay: 24,
        priority: 'medium'
      }
    ],
    isActive: true,
    createdBy: 'Sarah Wilson',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    lastTriggered: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    triggerCount: 45,
    successRate: 34,
    averageResponseTime: 8
  },
  {
    id: 'auto-3',
    name: 'High-Value Deal Alerts',
    description: 'Special attention for deals over $50k',
    trigger: {
      event: 'deal_stage_change',
      conditions: {
        dealValue: { min: 50000 },
        stage: 'qualified'
      }
    },
    actions: [
      {
        type: 'notify_manager',
        content: 'High-value deal requires senior attention',
        delay: 0
      },
      {
        type: 'create_task',
        content: 'Executive presentation preparation',
        assignTo: 'deal_owner',
        delay: 4,
        priority: 'urgent'
      },
      {
        type: 'send_email',
        template: 'vip-welcome-sequence',
        delay: 2
      }
    ],
    isActive: true,
    createdBy: 'Mike Rodriguez',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    lastTriggered: new Date(Date.now() - 12 * 60 * 60 * 1000),
    triggerCount: 8,
    successRate: 95,
    averageResponseTime: 2
  },
  {
    id: 'auto-4',
    name: 'Wedding Season Warm-up',
    description: 'Seasonal outreach for wedding inquiries during peak season',
    trigger: {
      event: 'time_elapsed',
      conditions: {
        timeframe: 3,
        eventType: 'wedding'
      }
    },
    actions: [
      {
        type: 'send_email',
        template: 'wedding-seasonal-follow-up',
        delay: 0
      },
      {
        type: 'create_task',
        content: 'Schedule venue tour for wedding couple',
        assignTo: 'deal_owner',
        delay: 24,
        priority: 'high'
      }
    ],
    isActive: false,
    createdBy: 'Sarah Wilson',
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    triggerCount: 67,
    successRate: 68,
    averageResponseTime: 6
  }
];

const mockMetrics: AutomationMetrics = {
  totalRules: 4,
  activeRules: 3,
  totalTriggers: 143,
  successfulOutcomes: 98,
  timesSaved: 286,
  responseImprovement: 45,
  leadRetention: 23
};

interface FollowUpAutomationProps {
  className?: string;
}

export default function FollowUpAutomation({ className }: FollowUpAutomationProps) {
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(mockAutomationRules);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [activeTab, setActiveTab] = useState("rules");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredRules = useMemo(() => {
    return automationRules.filter(rule => {
      const matchesSearch = searchQuery === "" || 
        rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || 
        (filterStatus === "active" && rule.isActive) ||
        (filterStatus === "inactive" && !rule.isActive);
      
      return matchesSearch && matchesStatus;
    });
  }, [automationRules, searchQuery, filterStatus]);

  const handleToggleRule = useCallback((ruleId: string) => {
    setAutomationRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    ));
  }, []);

  const handleDeleteRule = useCallback((ruleId: string) => {
    setAutomationRules(prev => prev.filter(rule => rule.id !== ruleId));
  }, []);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'send_email': return Mail;
      case 'create_task': return CheckCircle;
      case 'schedule_call': return Phone;
      case 'update_deal': return TrendingUp;
      case 'notify_manager': return Bell;
      default: return Zap;
    }
  };

  const getTriggerIcon = (triggerEvent: string) => {
    switch (triggerEvent) {
      case 'deal_stage_change': return ArrowRight;
      case 'email_opened': return Mail;
      case 'email_not_opened': return XCircle;
      case 'meeting_completed': return Users;
      case 'time_elapsed': return Clock;
      default: return Sparkles;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-500 bg-red-100 dark:bg-red-900/20';
      case 'high': return 'text-orange-500 bg-orange-100 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low': return 'text-green-500 bg-green-100 dark:bg-green-900/20';
      default: return 'text-gray-500 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Follow-up Automation</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered automation rules to ensure no leads fall through the cracks
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" className="apple-button">
            <Shield className="h-4 w-4 mr-2" />
            AI Optimization
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="apple-button">
                <Plus className="h-4 w-4 mr-2" />
                New Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel max-w-4xl">
              <DialogHeader>
                <DialogTitle>Create Automation Rule</DialogTitle>
                <DialogDescription>
                  Set up automated follow-up sequences to engage leads at the right time
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rule-name">Rule Name</Label>
                    <Input id="rule-name" placeholder="Proposal Follow-up Sequence" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rule-trigger">Trigger Event</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select trigger" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deal_stage_change">Deal Stage Change</SelectItem>
                        <SelectItem value="email_opened">Email Opened</SelectItem>
                        <SelectItem value="email_not_opened">Email Not Opened</SelectItem>
                        <SelectItem value="meeting_completed">Meeting Completed</SelectItem>
                        <SelectItem value="time_elapsed">Time Elapsed</SelectItem>
                        <SelectItem value="custom">Custom Condition</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rule-description">Description</Label>
                  <Textarea 
                    id="rule-description" 
                    placeholder="Describe what this automation rule does and when it should trigger..."
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rule-conditions">Trigger Conditions</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select conditions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="proposal_stage">When deal reaches proposal stage</SelectItem>
                        <SelectItem value="no_response_3days">No response after 3 days</SelectItem>
                        <SelectItem value="high_value_deal">Deal value over $50,000</SelectItem>
                        <SelectItem value="wedding_inquiry">Wedding event type</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rule-delay">Action Delay (hours)</Label>
                    <Input id="rule-delay" type="number" placeholder="24" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Actions to Perform</Label>
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Select>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select action" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="send_email">Send Email</SelectItem>
                          <SelectItem value="create_task">Create Task</SelectItem>
                          <SelectItem value="schedule_call">Schedule Call</SelectItem>
                          <SelectItem value="update_deal">Update Deal</SelectItem>
                          <SelectItem value="notify_manager">Notify Manager</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch id="rule-active" />
                  <Label htmlFor="rule-active">Activate rule immediately</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(false)}>
                  Create Rule
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
                <p className="text-sm text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold text-foreground">{mockMetrics.activeRules}</p>
              </div>
              <Zap className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Time Saved</p>
                <p className="text-2xl font-bold text-blue-500">{mockMetrics.timesSaved}h</p>
              </div>
              <Timer className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-green-500">
                  {Math.round((mockMetrics.successfulOutcomes / mockMetrics.totalTriggers) * 100)}%
                </p>
              </div>
              <Target className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lead Retention</p>
                <p className="text-2xl font-bold text-purple-500">+{mockMetrics.leadRetention}%</p>
              </div>
              <TrendingUp className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules">Automation Rules ({filteredRules.length})</TabsTrigger>
          <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6 mt-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search automation rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rules</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rules List */}
          <div className="space-y-4">
            {filteredRules.map((rule) => {
              const TriggerIcon = getTriggerIcon(rule.trigger.event);
              
              return (
                <Card key={rule.id} className="glass-panel">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <TriggerIcon className="h-5 w-5 text-primary" />
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-medium text-lg">{rule.name}</h3>
                              <Badge className={cn(
                                "text-xs",
                                rule.isActive 
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300"
                              )}>
                                {rule.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {rule.triggerCount} triggers
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{rule.description}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Trigger:</span>
                              <span className="ml-2 font-medium capitalize">
                                {rule.trigger.event.replace('_', ' ')}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Success Rate:</span>
                              <span className="ml-2 font-medium text-green-500">{rule.successRate}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Avg Response:</span>
                              <span className="ml-2 font-medium">
                                {rule.averageResponseTime ? `${rule.averageResponseTime}h` : 'N/A'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Actions:</h4>
                            <div className="flex flex-wrap gap-2">
                              {rule.actions.map((action, index) => {
                                const ActionIcon = getActionIcon(action.type);
                                
                                return (
                                  <div key={index} className="flex items-center space-x-1 text-xs bg-muted/30 rounded-full px-3 py-1">
                                    <ActionIcon className="h-3 w-3" />
                                    <span className="capitalize">{action.type.replace('_', ' ')}</span>
                                    {action.delay && action.delay > 0 && (
                                      <span className="text-muted-foreground">({action.delay}h)</span>
                                    )}
                                    {action.priority && (
                                      <Badge className={cn("text-xs ml-1", getPriorityColor(action.priority))}>
                                        {action.priority}
                                      </Badge>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                          {rule.lastTriggered && (
                            <p className="text-xs text-muted-foreground">
                              Last triggered: {rule.lastTriggered.toLocaleDateString()} at {rule.lastTriggered.toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleRule(rule.id)}
                        >
                          {rule.isActive ? (
                            <>
                              <Pause className="h-3 w-3 mr-2" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3 mr-2" />
                              Activate
                            </>
                          )}
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedRule(rule)}>
                              <Eye className="h-3 w-3 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-3 w-3 mr-2" />
                              Edit Rule
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Repeat className="h-3 w-3 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteRule(rule.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Delete Rule
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
          
          {filteredRules.length === 0 && (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No automation rules found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || filterStatus !== "all" 
                  ? "Try adjusting your search or filters" 
                  : "Create your first automation rule to get started"}
              </p>
              {(!searchQuery && filterStatus === "all") && (
                <Button onClick={() => setIsCreateDialogOpen(true)} className="apple-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Rule
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Rule Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {automationRules.map((rule) => (
                  <div key={rule.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{rule.name}</span>
                      <span className="text-muted-foreground">{rule.successRate}%</span>
                    </div>
                    <Progress value={rule.successRate} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Impact Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Response Time Improvement</span>
                    <span className="font-medium text-green-500">+{mockMetrics.responseImprovement}%</span>
                  </div>
                  <Progress value={mockMetrics.responseImprovement} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Lead Retention Increase</span>
                    <span className="font-medium text-blue-500">+{mockMetrics.leadRetention}%</span>
                  </div>
                  <Progress value={mockMetrics.leadRetention} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Time Efficiency</span>
                    <span className="font-medium text-purple-500">{mockMetrics.timesSaved} hours saved</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-insights" className="mt-6">
          <div className="space-y-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bot className="h-5 w-5 mr-2 text-blue-500" />
                  AI-Powered Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Optimization Opportunity</h4>
                  <p className="text-sm text-blue-600 dark:text-blue-200 mb-3">
                    Your "Proposal Follow-up Sequence" could be improved by adding a phone call action after email non-response.
                    This could increase success rate by an estimated 15-20%.
                  </p>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Sparkles className="h-3 w-3 mr-2" />
                    Apply Optimization
                  </Button>
                </div>
                
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">New Rule Suggestion</h4>
                  <p className="text-sm text-green-600 dark:text-green-200 mb-3">
                    Based on your booking patterns, consider creating a "Last-Minute Availability" rule to capture 
                    urgent wedding bookings within 30 days of inquiry.
                  </p>
                  <Button size="sm" variant="outline" className="border-green-500 text-green-700 hover:bg-green-100">
                    <Plus className="h-3 w-3 mr-2" />
                    Create Suggested Rule
                  </Button>
                </div>
                
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <h4 className="font-medium text-yellow-700 dark:text-yellow-300 mb-2">Performance Alert</h4>
                  <p className="text-sm text-yellow-600 dark:text-yellow-200 mb-3">
                    The "Cold Lead Nurturing" rule has a lower success rate (34%) compared to industry average (42%). 
                    Consider updating the email template or adjusting timing.
                  </p>
                  <Button size="sm" variant="outline" className="border-yellow-500 text-yellow-700 hover:bg-yellow-100">
                    <Settings className="h-3 w-3 mr-2" />
                    Review & Optimize
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Rule Detail Dialog */}
      <Dialog open={!!selectedRule} onOpenChange={() => setSelectedRule(null)}>
        <DialogContent className="glass-panel max-w-4xl">
          {selectedRule && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedRule.name}</DialogTitle>
                <DialogDescription>
                  {selectedRule.description}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Trigger Configuration</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Event:</span>
                        <span className="font-medium capitalize">{selectedRule.trigger.event.replace('_', ' ')}</span>
                      </div>
                      {selectedRule.trigger.conditions.stage && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Stage:</span>
                          <span className="font-medium capitalize">{selectedRule.trigger.conditions.stage}</span>
                        </div>
                      )}
                      {selectedRule.trigger.conditions.timeframe && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Timeframe:</span>
                          <span className="font-medium">{selectedRule.trigger.conditions.timeframe} days</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Performance Metrics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Triggered:</span>
                        <span className="font-medium">{selectedRule.triggerCount} times</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Success Rate:</span>
                        <span className="font-medium text-green-500">{selectedRule.successRate}%</span>
                      </div>
                      {selectedRule.averageResponseTime && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Response:</span>
                          <span className="font-medium">{selectedRule.averageResponseTime} hours</span>
                        </div>
                      )}
                      {selectedRule.lastTriggered && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Triggered:</span>
                          <span className="font-medium">{selectedRule.lastTriggered.toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Action Sequence</h4>
                  <div className="space-y-3">
                    {selectedRule.actions.map((action, index) => {
                      const ActionIcon = getActionIcon(action.type);
                      
                      return (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg">
                          <div className="p-2 bg-primary/10 rounded">
                            <ActionIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium capitalize">{action.type.replace('_', ' ')}</div>
                            <div className="text-sm text-muted-foreground">
                              {action.delay ? `Delay: ${action.delay} hours` : 'Immediate'}
                              {action.priority && ` • Priority: ${action.priority}`}
                              {action.template && ` • Template: ${action.template}`}
                            </div>
                            {action.content && (
                              <div className="text-sm text-muted-foreground mt-1">{action.content}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
