import Layout from "@/components/Layout";
import MoveablePanel from "@/components/MoveablePanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import {
  Calendar,
  Clock,
  Users,
  Target,
  AlertCircle,
  CheckCircle,
  Plus,
  Filter,
  Search,
  BarChart3,
  Flag,
  ArrowRight,
  Edit,
  Trash2,
  Eye,
  Play,
  Pause,
  Download,
  Upload,
} from "lucide-react";
import { useState } from "react";

interface TimelineItem {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  assignee: string;
  team: string[];
  category: 'event' | 'project' | 'task' | 'milestone';
  dependencies: number[];
  budget: number;
  tags: string[];
  milestones: Array<{
    id: number;
    title: string;
    date: string;
    completed: boolean;
  }>;
}

const sampleTimelineItems: TimelineItem[] = [
  {
    id: 1,
    title: "Corporate Leadership Summit Planning",
    description: "Complete planning and execution of the annual corporate leadership summit including venue setup, catering, and AV requirements.",
    startDate: "2024-01-01",
    endDate: "2024-01-15",
    status: "completed",
    priority: "high",
    progress: 100,
    assignee: "Sarah Johnson",
    team: ["Sarah Johnson", "Mike Rodriguez", "Lisa Wang"],
    category: "event",
    dependencies: [],
    budget: 45000,
    tags: ["Corporate", "VIP", "Annual"],
    milestones: [
      { id: 1, title: "Venue Booking", date: "2024-01-02", completed: true },
      { id: 2, title: "Catering Confirmed", date: "2024-01-05", completed: true },
      { id: 3, title: "AV Setup Complete", date: "2024-01-14", completed: true },
      { id: 4, title: "Event Execution", date: "2024-01-15", completed: true }
    ]
  },
  {
    id: 2,
    title: "Q1 Marketing Campaign",
    description: "Launch comprehensive marketing campaign to attract new corporate clients for Q2 events.",
    startDate: "2024-01-10",
    endDate: "2024-03-31",
    status: "in_progress",
    priority: "high",
    progress: 65,
    assignee: "Emily Rodriguez",
    team: ["Emily Rodriguez", "David Kim", "Alex Thompson"],
    category: "project",
    dependencies: [1],
    budget: 25000,
    tags: ["Marketing", "Lead Generation", "Digital"],
    milestones: [
      { id: 1, title: "Campaign Strategy", date: "2024-01-15", completed: true },
      { id: 2, title: "Content Creation", date: "2024-02-01", completed: true },
      { id: 3, title: "Launch Phase 1", date: "2024-02-15", completed: true },
      { id: 4, title: "Mid-Campaign Review", date: "2024-03-01", completed: false },
      { id: 5, title: "Campaign Completion", date: "2024-03-31", completed: false }
    ]
  },
  {
    id: 3,
    title: "Wedding Season Preparation",
    description: "Prepare facilities and staff for the upcoming wedding season including training, equipment upgrades, and venue decorations.",
    startDate: "2024-02-01",
    endDate: "2024-04-30",
    status: "not_started",
    priority: "medium",
    progress: 0,
    assignee: "Jennifer Brown",
    team: ["Jennifer Brown", "Carlos Martinez", "Amy Wilson"],
    category: "project",
    dependencies: [],
    budget: 35000,
    tags: ["Wedding", "Seasonal", "Training"],
    milestones: [
      { id: 1, title: "Staff Training Program", date: "2024-02-15", completed: false },
      { id: 2, title: "Equipment Upgrades", date: "2024-03-01", completed: false },
      { id: 3, title: "Venue Decorations", date: "2024-03-15", completed: false },
      { id: 4, title: "Season Launch", date: "2024-04-01", completed: false }
    ]
  },
  {
    id: 4,
    title: "CRM System Upgrade",
    description: "Upgrade the existing CRM system with new features including AI analytics, automated workflows, and enhanced reporting.",
    startDate: "2024-01-20",
    endDate: "2024-03-15",
    status: "in_progress",
    priority: "critical",
    progress: 45,
    assignee: "William Morrison",
    team: ["William Morrison", "Tech Team", "IT Support"],
    category: "project",
    dependencies: [],
    budget: 50000,
    tags: ["Technology", "CRM", "Automation"],
    milestones: [
      { id: 1, title: "Requirements Analysis", date: "2024-01-25", completed: true },
      { id: 2, title: "Development Phase 1", date: "2024-02-10", completed: true },
      { id: 3, title: "Testing & QA", date: "2024-02-25", completed: false },
      { id: 4, title: "User Training", date: "2024-03-05", completed: false },
      { id: 5, title: "System Launch", date: "2024-03-15", completed: false }
    ]
  }
];

export default function TimelinePage() {
  const [items, setItems] = useState<TimelineItem[]>(sampleTimelineItems);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'gantt' | 'list'>('timeline');

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.assignee.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'not_started': return 'bg-gray-500';
      case 'on_hold': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Play className="h-4 w-4" />;
      case 'not_started': return <Clock className="h-4 w-4" />;
      case 'on_hold': return <Pause className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const totalBudget = items.reduce((sum, item) => sum + item.budget, 0);
  const completedItems = items.filter(item => item.status === 'completed').length;
  const inProgressItems = items.filter(item => item.status === 'in_progress').length;
  const avgProgress = items.reduce((sum, item) => sum + item.progress, 0) / items.length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Project Timeline</h1>
            <p className="text-muted-foreground mt-2">
              Visual timeline management for projects, events, and milestones
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('timeline')}
                className="apple-button"
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'gantt' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('gantt')}
                className="apple-button"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" className="apple-button">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="apple-button">
                  <Plus className="h-4 w-4 mr-2" />
                  New Timeline Item
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Timeline Item</DialogTitle>
                  <DialogDescription>
                    Add a new project, event, or milestone to the timeline
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" placeholder="Project name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="project">Project</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                          <SelectItem value="task">Task</SelectItem>
                          <SelectItem value="milestone">Milestone</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Detailed description..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input id="startDate" type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input id="endDate" type="date" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assignee">Assignee</Label>
                      <Input id="assignee" placeholder="Team member" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget</Label>
                    <Input id="budget" type="number" placeholder="0" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(false)}>Create Item</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Budget</p>
                    <p className="text-2xl font-bold text-foreground">${(totalBudget / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-green-500">Across all projects</p>
                  </div>
                  <Target className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-foreground">{completedItems}</p>
                    <p className="text-xs text-green-500">Projects finished</p>
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
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-bold text-foreground">{inProgressItems}</p>
                    <p className="text-xs text-blue-500">Active projects</p>
                  </div>
                  <Play className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Progress</p>
                    <p className="text-2xl font-bold text-foreground">{avgProgress.toFixed(0)}%</p>
                    <p className="text-xs text-yellow-500">Overall completion</p>
                  </div>
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>
        </div>

        {/* Filters */}
        <MoveablePanel className="glass-panel p-4 rounded-xl">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects, events, or team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50 border-2 border-border/50 hover:border-primary/30 focus:border-primary/50 transition-all duration-200"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-32 bg-background/50 border-2 border-border/50 hover:border-primary/30 transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="project">Projects</SelectItem>
                  <SelectItem value="event">Events</SelectItem>
                  <SelectItem value="task">Tasks</SelectItem>
                  <SelectItem value="milestone">Milestones</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 bg-background/50 border-2 border-border/50 hover:border-primary/30 transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </MoveablePanel>

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="space-y-4">
            {filteredItems.map((item, index) => (
              <MoveablePanel key={item.id} className="glass-panel">
                <Card className="bg-transparent border-none shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* Timeline Line */}
                      <div className="flex flex-col items-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                        </div>
                        {index < filteredItems.length - 1 && (
                          <div className="w-px h-16 bg-border/50 mt-2" />
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                              <Badge variant="outline" className="capitalize">
                                {item.category}
                              </Badge>
                              <Flag className={`h-4 w-4 ${getPriorityColor(item.priority)}`} />
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-2 text-muted-foreground" />
                                {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                              </div>
                              <div className="flex items-center">
                                <Users className="h-3 w-3 mr-2 text-muted-foreground" />
                                {item.assignee}
                              </div>
                              <div className="flex items-center">
                                <Target className="h-3 w-3 mr-2 text-muted-foreground" />
                                ${item.budget.toLocaleString()}
                              </div>
                              <div className="flex items-center">
                                <BarChart3 className="h-3 w-3 mr-2 text-muted-foreground" />
                                {item.progress}% Complete
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedItem(item)}
                              className="apple-button"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                            <Button size="sm" variant="outline" className="apple-button">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{item.progress}%</span>
                          </div>
                          <Progress value={item.progress} className="h-2" />
                        </div>
                        
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1">
                          {item.tags.map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        {/* Milestones */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                          {item.milestones.slice(0, 4).map((milestone) => (
                            <div key={milestone.id} className="flex items-center space-x-2 p-2 bg-muted/20 rounded-lg">
                              {milestone.completed ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <Clock className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span className="text-xs font-medium truncate">{milestone.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </MoveablePanel>
            ))}
          </div>
        )}

        {/* Gantt View */}
        {viewMode === 'gantt' && (
          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardHeader>
                <CardTitle>Gantt Chart View</CardTitle>
                <CardDescription>Interactive project timeline with dependencies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96 flex items-center justify-center border-2 border-dashed border-border/50 rounded-lg">
                  <div className="text-center space-y-2">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Interactive Gantt chart would be rendered here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Showing project dependencies and critical path
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="glass-panel max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedItem && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-2xl">{selectedItem.title}</DialogTitle>
                      <DialogDescription className="text-lg mt-1">
                        {selectedItem.category.toUpperCase()} • Assigned to {selectedItem.assignee}
                      </DialogDescription>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="outline" className="capitalize">
                          {selectedItem.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="secondary" className="capitalize">
                          {selectedItem.priority} Priority
                        </Badge>
                        <Badge variant="outline">
                          {selectedItem.progress}% Complete
                        </Badge>
                      </div>
                    </div>
                  </div>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Project Details</h4>
                      <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Start Date:</span>
                        <div className="font-medium">{new Date(selectedItem.startDate).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">End Date:</span>
                        <div className="font-medium">{new Date(selectedItem.endDate).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Budget:</span>
                        <div className="font-medium text-green-500">${selectedItem.budget.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Team Size:</span>
                        <div className="font-medium">{selectedItem.team.length} members</div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Team Members</h4>
                      <div className="space-y-1">
                        {selectedItem.team.map((member, index) => (
                          <div key={index} className="text-sm text-muted-foreground">{member}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-3">Milestones</h4>
                      <div className="space-y-2">
                        {selectedItem.milestones.map((milestone) => (
                          <div key={milestone.id} className="flex items-center justify-between p-2 bg-muted/20 rounded-lg">
                            <div className="flex items-center space-x-2">
                              {milestone.completed ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Clock className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-sm font-medium">{milestone.title}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{milestone.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Progress Overview</h4>
                      <Progress value={selectedItem.progress} className="h-3" />
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{selectedItem.progress}% Complete</span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedItem.tags.map((tag, index) => (
                          <Badge key={index} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <DialogFooter className="mt-6">
                  <Button variant="outline" onClick={() => setSelectedItem(null)}>
                    Close
                  </Button>
                  <Button>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Project
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
