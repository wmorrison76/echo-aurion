import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertTriangle,
  CheckCircle,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Calendar,
  User,
  Users,
  Flame,
  Target,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Repeat,
  Zap,
  Filter,
  Search,
  TrendingUp,
  DollarSign,
  Building,
  Heart,
  Star,
  RefreshCw,
  Bell,
  ArrowUp,
  ArrowDown,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DailyTodo, Lead, Deal } from "@shared/sales-pipeline-types";

// Mock data for demonstration
const mockTodos: DailyTodo[] = [
  {
    id: 'todo-1',
    title: 'Follow up with TechCorp about proposal feedback',
    description: 'Call Sarah Johnson to discuss pricing concerns and timeline questions',
    type: 'call',
    priority: 'high',
    dueDate: new Date(),
    dueTime: '10:00',
    completed: false,
    leadId: 'lead-1',
    dealId: 'deal-1',
    assignedTo: 'John Smith',
    createdBy: 'John Smith',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    followUpType: 'proposal_follow_up',
    emailIntegration: {
      templateId: 'proposal-follow-up',
      emailsSent: 1,
      lastEmailSent: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      trackingEnabled: true
    }
  },
  {
    id: 'todo-2',
    title: 'Send wedding venue options to Johnson couple',
    description: 'Email detailed proposal with Rose Garden Pavilion package',
    type: 'email',
    priority: 'urgent',
    dueDate: new Date(),
    dueTime: '14:30',
    completed: false,
    leadId: 'lead-2',
    dealId: 'deal-2',
    assignedTo: 'Sarah Wilson',
    createdBy: 'Sarah Wilson',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    followUpType: 'warm_lead',
    emailIntegration: {
      templateId: 'wedding-proposal',
      emailsSent: 0,
      trackingEnabled: true
    }
  },
  {
    id: 'todo-3',
    title: 'Check in with charity gala organizers',
    description: 'Follow up on budget approval and event requirements',
    type: 'call',
    priority: 'medium',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    dueTime: '11:00',
    completed: false,
    leadId: 'lead-3',
    dealId: 'deal-3',
    assignedTo: 'Mike Rodriguez',
    createdBy: 'Mike Rodriguez',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    followUpType: 'check_in'
  },
  {
    id: 'todo-4',
    title: 'Prepare conference proposal presentation',
    description: 'Create slides for TechCorp conference proposal meeting',
    type: 'admin',
    priority: 'medium',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    completed: false,
    dealId: 'deal-1',
    assignedTo: 'John Smith',
    createdBy: 'John Smith',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'todo-5',
    title: 'Site visit with corporate client',
    description: 'Show Grand Ballroom setup options and catering facilities',
    type: 'meeting',
    priority: 'high',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    dueTime: '15:00',
    completed: true,
    completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    leadId: 'lead-4',
    assignedTo: 'Sarah Wilson',
    createdBy: 'Sarah Wilson',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    followUpType: 'post_meeting'
  }
];

const mockWarmLeads = [
  {
    id: 'warm-1',
    name: 'GlobalTech Industries',
    contact: 'Jennifer Martinez',
    lastContact: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    nextFollowUp: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    temperature: 'hot',
    value: 95000,
    type: 'corporate',
    notes: 'Very interested in Q2 corporate retreat. Budget approved.'
  },
  {
    id: 'warm-2',
    name: 'Peterson Wedding',
    contact: 'Amanda Peterson',
    lastContact: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    nextFollowUp: new Date(),
    temperature: 'warm',
    value: 45000,
    type: 'wedding',
    notes: 'Comparing with two other venues. Decision by end of week.'
  },
  {
    id: 'warm-3',
    name: 'Healthcare Association',
    contact: 'Dr. Robert Kim',
    lastContact: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    nextFollowUp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    temperature: 'cooling',
    value: 125000,
    type: 'conference',
    notes: 'Delayed decision due to budget review. Follow up needed.'
  }
];

interface DailyTodosProps {
  className?: string;
}

export default function DailyTodos({ className }: DailyTodosProps) {
  const [todos, setTodos] = useState<DailyTodo[]>(mockTodos);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const filteredTodos = useMemo(() => {
    return todos.filter(todo => {
      const matchesSearch = searchQuery === "" || 
        todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        todo.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === "all" || todo.type === filterType;
      const matchesPriority = filterPriority === "all" || todo.priority === filterPriority;
      const matchesCompleted = showCompleted || !todo.completed;
      
      return matchesSearch && matchesType && matchesPriority && matchesCompleted;
    });
  }, [todos, searchQuery, filterType, filterPriority, showCompleted]);

  const todayTodos = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return filteredTodos.filter(todo => {
      const todoDate = new Date(todo.dueDate);
      todoDate.setHours(0, 0, 0, 0);
      return todoDate.getTime() === today.getTime();
    });
  }, [filteredTodos]);

  const overdueTodos = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return filteredTodos.filter(todo => {
      const todoDate = new Date(todo.dueDate);
      todoDate.setHours(0, 0, 0, 0);
      return todoDate.getTime() < today.getTime() && !todo.completed;
    });
  }, [filteredTodos]);

  const upcomingTodos = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return filteredTodos.filter(todo => {
      const todoDate = new Date(todo.dueDate);
      todoDate.setHours(0, 0, 0, 0);
      return todoDate.getTime() > today.getTime();
    });
  }, [filteredTodos]);

  const completionRate = useMemo(() => {
    const completed = todos.filter(todo => todo.completed).length;
    return todos.length > 0 ? Math.round((completed / todos.length) * 100) : 0;
  }, [todos]);

  const warmLeadsNeedingAttention = useMemo(() => {
    return mockWarmLeads.filter(lead => {
      const nextFollowUp = new Date(lead.nextFollowUp);
      const today = new Date();
      return nextFollowUp <= today || lead.temperature === 'cooling';
    });
  }, []);

  const handleTodoComplete = useCallback((todoId: string) => {
    setTodos(prev => prev.map(todo => 
      todo.id === todoId 
        ? { ...todo, completed: !todo.completed, completedAt: todo.completed ? undefined : new Date() }
        : todo
    ));
  }, []);

  const handleTodoDelete = useCallback((todoId: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== todoId));
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return Phone;
      case 'email': return Mail;
      case 'meeting': return Users;
      case 'proposal': return FileText;
      case 'follow_up': return RefreshCw;
      case 'demo': return Eye;
      case 'admin': return User;
      default: return Clock;
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

  const getTemperatureIcon = (temperature: string) => {
    switch (temperature) {
      case 'hot': return <Flame className="h-3 w-3 text-red-500" />;
      case 'warm': return <TrendingUp className="h-3 w-3 text-orange-500" />;
      case 'cooling': return <ArrowDown className="h-3 w-3 text-blue-500" />;
      default: return <Target className="h-3 w-3 text-gray-500" />;
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'wedding': return Heart;
      case 'corporate': return Building;
      case 'conference': return Users;
      case 'gala': return Star;
      default: return Calendar;
    }
  };

  const isOverdue = (dueDate: Date) => {
    const today = new Date();
    const todoDate = new Date(dueDate);
    return todoDate < today;
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Daily Todos</h1>
          <p className="text-muted-foreground mt-2">
            Manage your daily tasks and warm lead follow-ups
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" className="apple-button">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="apple-button">
                <Plus className="h-4 w-4 mr-2" />
                New Todo
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Todo</DialogTitle>
                <DialogDescription>
                  Add a new task to your daily todo list
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="todo-title">Title</Label>
                  <Input id="todo-title" placeholder="Follow up with client about proposal" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="todo-description">Description</Label>
                  <Textarea id="todo-description" placeholder="Detailed description of the task..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="todo-type">Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">Phone Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="proposal">Proposal</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                        <SelectItem value="demo">Demo</SelectItem>
                        <SelectItem value="admin">Administrative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="todo-priority">Priority</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="todo-date">Due Date</Label>
                    <Input id="todo-date" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="todo-time">Due Time</Label>
                    <Input id="todo-time" type="time" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="todo-assignee">Assigned To</Label>
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
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(false)}>
                  Create Todo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Tasks</p>
                <p className="text-2xl font-bold text-foreground">{todayTodos.length}</p>
              </div>
              <Clock className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-500">{overdueTodos.length}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warm Leads</p>
                <p className="text-2xl font-bold text-orange-500">{warmLeadsNeedingAttention.length}</p>
              </div>
              <Flame className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold text-green-500">{completionRate}%</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="today">Today ({todayTodos.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdueTodos.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcomingTodos.length})</TabsTrigger>
          <TabsTrigger value="warm-leads">Warm Leads ({warmLeadsNeedingAttention.length})</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center mt-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search todos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="call">Calls</SelectItem>
                <SelectItem value="email">Emails</SelectItem>
                <SelectItem value="meeting">Meetings</SelectItem>
                <SelectItem value="proposal">Proposals</SelectItem>
                <SelectItem value="follow_up">Follow Ups</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center space-x-2 text-sm">
              <Checkbox
                checked={showCompleted}
                onCheckedChange={setShowCompleted}
              />
              <span>Show completed</span>
            </label>
          </div>
        </div>

        <TabsContent value="today" className="space-y-4 mt-6">
          {/* Progress Bar */}
          <Card className="glass-panel">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Today's Progress</span>
                <span className="text-sm text-muted-foreground">
                  {todayTodos.filter(t => t.completed).length} of {todayTodos.length} completed
                </span>
              </div>
              <Progress 
                value={todayTodos.length > 0 ? (todayTodos.filter(t => t.completed).length / todayTodos.length) * 100 : 0} 
                className="h-2" 
              />
            </CardContent>
          </Card>

          {/* Todo List */}
          <div className="space-y-3">
            {todayTodos.map((todo) => {
              const TypeIcon = getTypeIcon(todo.type);
              const isLate = todo.dueTime && new Date(`${todo.dueDate.toDateString()} ${todo.dueTime}`) < new Date();
              
              return (
                <Card 
                  key={todo.id} 
                  className={cn(
                    "glass-panel transition-all duration-200",
                    todo.completed && "opacity-60",
                    isLate && !todo.completed && "border-red-500/50 bg-red-500/5"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <Checkbox
                        checked={todo.completed}
                        onCheckedChange={() => handleTodoComplete(todo.id)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={cn(
                              "font-medium text-sm leading-tight",
                              todo.completed && "line-through text-muted-foreground"
                            )}>
                              {todo.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">{todo.description}</p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Badge className={cn("text-xs", getPriorityColor(todo.priority))}>
                              {todo.priority}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit className="h-3 w-3 mr-2" />
                                  Edit Todo
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Repeat className="h-3 w-3 mr-2" />
                                  Create Recurring
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleTodoDelete(todo.id)}
                                >
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Delete Todo
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <TypeIcon className="h-3 w-3 text-primary" />
                              <span className="capitalize">{todo.type.replace('_', ' ')}</span>
                            </div>
                            
                            {todo.dueTime && (
                              <div className={cn(
                                "flex items-center space-x-1",
                                isLate && !todo.completed ? "text-red-500" : "text-muted-foreground"
                              )}>
                                <Timer className="h-3 w-3" />
                                <span>{todo.dueTime}</span>
                                {isLate && !todo.completed && <span>(Late)</span>}
                              </div>
                            )}
                            
                            {todo.followUpType && (
                              <Badge variant="outline" className="text-xs">
                                {todo.followUpType.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-1 text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{todo.assignedTo}</span>
                          </div>
                        </div>
                        
                        {todo.emailIntegration && (
                          <div className="text-xs text-muted-foreground">
                            <span>
                              {todo.emailIntegration.emailsSent > 0 ? 
                                `${todo.emailIntegration.emailsSent} email(s) sent` : 
                                'Email template ready'
                              }
                            </span>
                            {todo.emailIntegration.lastEmailSent && (
                              <span className="ml-2">
                                • Last sent {todo.emailIntegration.lastEmailSent.toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Quick Actions */}
                        <div className="flex space-x-2 pt-2">
                          {todo.type === 'call' && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                              <Phone className="h-3 w-3 mr-1" />
                              Call Now
                            </Button>
                          )}
                          {todo.type === 'email' && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                              <Mail className="h-3 w-3 mr-1" />
                              Send Email
                            </Button>
                          )}
                          {todo.type === 'meeting' && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              Schedule
                            </Button>
                          )}
                          {todo.dealId && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                              <Eye className="h-3 w-3 mr-1" />
                              View Deal
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {todayTodos.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium">All caught up!</h3>
                <p className="text-muted-foreground">No todos for today. Great job!</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4 mt-6">
          {overdueTodos.length > 0 ? (
            <div className="space-y-3">
              {overdueTodos.map((todo) => {
                const TypeIcon = getTypeIcon(todo.type);
                const daysOverdue = Math.abs(getDaysUntilDue(todo.dueDate));
                
                return (
                  <Card key={todo.id} className="glass-panel border-red-500/50 bg-red-500/5">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <Checkbox
                          checked={todo.completed}
                          onCheckedChange={() => handleTodoComplete(todo.id)}
                          className="mt-1"
                        />
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm leading-tight">{todo.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1">{todo.description}</p>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300">
                                {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                              </Badge>
                              <Badge className={cn("text-xs", getPriorityColor(todo.priority))}>
                                {todo.priority}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-1">
                                <TypeIcon className="h-3 w-3 text-primary" />
                                <span className="capitalize">{todo.type.replace('_', ' ')}</span>
                              </div>
                              
                              <div className="flex items-center space-x-1 text-red-500">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Due: {todo.dueDate.toLocaleDateString()}</span>
                                {todo.dueTime && <span>at {todo.dueTime}</span>}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-1 text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{todo.assignedTo}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium">No overdue tasks!</h3>
              <p className="text-muted-foreground">You're staying on top of your todos.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4 mt-6">
          <div className="space-y-3">
            {upcomingTodos.map((todo) => {
              const TypeIcon = getTypeIcon(todo.type);
              const daysUntilDue = getDaysUntilDue(todo.dueDate);
              
              return (
                <Card key={todo.id} className="glass-panel">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <Checkbox
                        checked={todo.completed}
                        onCheckedChange={() => handleTodoComplete(todo.id)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm leading-tight">{todo.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{todo.description}</p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}
                            </Badge>
                            <Badge className={cn("text-xs", getPriorityColor(todo.priority))}>
                              {todo.priority}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <TypeIcon className="h-3 w-3 text-primary" />
                              <span className="capitalize">{todo.type.replace('_', ' ')}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1 text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>{todo.dueDate.toLocaleDateString()}</span>
                              {todo.dueTime && <span>at {todo.dueTime}</span>}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{todo.assignedTo}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {upcomingTodos.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No upcoming tasks</h3>
                <p className="text-muted-foreground">Your schedule is clear for the next few days.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="warm-leads" className="space-y-4 mt-6">
          <div className="space-y-3">
            {mockWarmLeads.map((lead) => {
              const EventIcon = getEventTypeIcon(lead.type);
              const daysOverdue = lead.nextFollowUp < new Date() ? 
                Math.abs(getDaysUntilDue(lead.nextFollowUp)) : 0;
              
              return (
                <Card 
                  key={lead.id} 
                  className={cn(
                    "glass-panel",
                    lead.temperature === 'cooling' && "border-blue-500/50 bg-blue-500/5",
                    daysOverdue > 0 && "border-red-500/50 bg-red-500/5"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-sm">{lead.name}</h4>
                            {getTemperatureIcon(lead.temperature)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Contact: {lead.contact}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {lead.notes}
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-end space-y-1">
                          <Badge variant="outline" className="text-xs">
                            ${lead.value.toLocaleString()}
                          </Badge>
                          <Badge className={cn("text-xs capitalize", getPriorityColor(lead.temperature))}>
                            {lead.temperature}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <EventIcon className="h-3 w-3 text-primary" />
                            <span className="capitalize">{lead.type}</span>
                          </div>
                          
                          <div className="flex items-center space-x-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Last contact: {lead.lastContact.toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className={cn(
                          "flex items-center space-x-1",
                          daysOverdue > 0 ? "text-red-500" : "text-green-500"
                        )}>
                          {daysOverdue > 0 ? (
                            <>
                              <AlertTriangle className="h-3 w-3" />
                              <span>{daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue</span>
                            </>
                          ) : (
                            <>
                              <Target className="h-3 w-3" />
                              <span>Follow up: {lead.nextFollowUp.toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="flex space-x-2 pt-2">
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                          <Phone className="h-3 w-3 mr-1" />
                          Call Now
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                          <Mail className="h-3 w-3 mr-1" />
                          Send Email
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                          <Plus className="h-3 w-3 mr-1" />
                          Add Todo
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          Schedule Meeting
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {warmLeadsNeedingAttention.length === 0 && (
              <div className="text-center py-12">
                <Flame className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium">All warm leads are current!</h3>
                <p className="text-muted-foreground">You're staying on top of your follow-ups.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
