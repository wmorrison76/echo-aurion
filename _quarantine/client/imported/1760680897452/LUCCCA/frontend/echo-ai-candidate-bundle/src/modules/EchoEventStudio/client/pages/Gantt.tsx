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
  BarChart3,
  Calendar,
  Clock,
  Users,
  Target,
  Plus,
  Filter,
  Search,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Edit,
  Play,
  Pause,
} from "lucide-react";
import { useState } from "react";

interface GanttTask {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  duration: number; // in days
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'delayed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee: string;
  team: string[];
  project: string;
  dependencies: number[];
  criticalPath: boolean;
  budget: number;
  resourceAllocation: number; // percentage
  milestones: Array<{
    id: number;
    title: string;
    date: string;
    completed: boolean;
  }>;
  subtasks: Array<{
    id: number;
    title: string;
    progress: number;
    assignee: string;
  }>;
}

const sampleGanttTasks: GanttTask[] = [
  {
    id: 1,
    title: "Corporate Summit Planning",
    description: "Complete planning and execution of annual corporate leadership summit",
    startDate: "2024-01-01",
    endDate: "2024-01-15",
    duration: 14,
    progress: 100,
    status: "completed",
    priority: "high",
    assignee: "Sarah Johnson",
    team: ["Sarah Johnson", "Mike Rodriguez", "Lisa Wang"],
    project: "Events Q1",
    dependencies: [],
    criticalPath: true,
    budget: 45000,
    resourceAllocation: 85,
    milestones: [
      { id: 1, title: "Venue Confirmed", date: "2024-01-03", completed: true },
      { id: 2, title: "Speakers Booked", date: "2024-01-08", completed: true },
      { id: 3, title: "Event Execution", date: "2024-01-15", completed: true }
    ],
    subtasks: [
      { id: 1, title: "Venue Setup", progress: 100, assignee: "Mike Rodriguez" },
      { id: 2, title: "Catering Coordination", progress: 100, assignee: "Lisa Wang" },
      { id: 3, title: "AV Equipment", progress: 100, assignee: "Sarah Johnson" }
    ]
  },
  {
    id: 2,
    title: "Q1 Marketing Campaign",
    description: "Digital marketing campaign to increase brand awareness and lead generation",
    startDate: "2024-01-10",
    endDate: "2024-03-31",
    duration: 81,
    progress: 65,
    status: "in_progress",
    priority: "high",
    assignee: "Emily Rodriguez",
    team: ["Emily Rodriguez", "David Kim", "Alex Thompson"],
    project: "Marketing Q1",
    dependencies: [1],
    criticalPath: true,
    budget: 25000,
    resourceAllocation: 70,
    milestones: [
      { id: 1, title: "Campaign Strategy", date: "2024-01-20", completed: true },
      { id: 2, title: "Content Creation", date: "2024-02-15", completed: true },
      { id: 3, title: "Campaign Launch", date: "2024-02-20", completed: true },
      { id: 4, title: "Mid-Campaign Review", date: "2024-03-10", completed: false }
    ],
    subtasks: [
      { id: 1, title: "Social Media Content", progress: 80, assignee: "David Kim" },
      { id: 2, title: "Email Campaigns", progress: 90, assignee: "Emily Rodriguez" },
      { id: 3, title: "PPC Advertising", progress: 45, assignee: "Alex Thompson" }
    ]
  },
  {
    id: 3,
    title: "CRM System Upgrade",
    description: "Comprehensive upgrade of CRM system with AI features and automation",
    startDate: "2024-01-20",
    endDate: "2024-03-15",
    duration: 55,
    progress: 45,
    status: "in_progress",
    priority: "critical",
    assignee: "William Morrison",
    team: ["William Morrison", "Tech Team", "IT Support"],
    project: "Technology Upgrade",
    dependencies: [],
    criticalPath: true,
    budget: 50000,
    resourceAllocation: 95,
    milestones: [
      { id: 1, title: "Requirements Analysis", date: "2024-01-30", completed: true },
      { id: 2, title: "Development Phase 1", date: "2024-02-15", completed: true },
      { id: 3, title: "Testing Phase", date: "2024-02-28", completed: false },
      { id: 4, title: "User Training", date: "2024-03-10", completed: false }
    ],
    subtasks: [
      { id: 1, title: "Backend Development", progress: 70, assignee: "Tech Team" },
      { id: 2, title: "Frontend Updates", progress: 60, assignee: "William Morrison" },
      { id: 3, title: "Database Migration", progress: 30, assignee: "IT Support" }
    ]
  },
  {
    id: 4,
    title: "Wedding Season Preparation",
    description: "Comprehensive preparation for upcoming wedding season including staff training",
    startDate: "2024-02-01",
    endDate: "2024-04-30",
    duration: 89,
    progress: 20,
    status: "not_started",
    priority: "medium",
    assignee: "Jennifer Brown",
    team: ["Jennifer Brown", "Carlos Martinez", "Amy Wilson"],
    project: "Seasonal Preparation",
    dependencies: [2],
    criticalPath: false,
    budget: 35000,
    resourceAllocation: 60,
    milestones: [
      { id: 1, title: "Staff Training Complete", date: "2024-02-28", completed: false },
      { id: 2, title: "Venue Decorations", date: "2024-03-20", completed: false },
      { id: 3, title: "Equipment Upgrades", date: "2024-04-10", completed: false }
    ],
    subtasks: [
      { id: 1, title: "Vendor Coordination", progress: 15, assignee: "Carlos Martinez" },
      { id: 2, title: "Floral Design Setup", progress: 25, assignee: "Amy Wilson" },
      { id: 3, title: "Training Program", progress: 20, assignee: "Jennifer Brown" }
    ]
  },
  {
    id: 5,
    title: "Financial System Integration",
    description: "Integration of new financial reporting system with existing CRM and accounting",
    startDate: "2024-02-15",
    endDate: "2024-04-15",
    duration: 60,
    progress: 10,
    status: "not_started",
    priority: "high",
    assignee: "Finance Team",
    team: ["Finance Team", "IT Support", "External Consultant"],
    project: "Financial Upgrade",
    dependencies: [3],
    criticalPath: false,
    budget: 40000,
    resourceAllocation: 50,
    milestones: [
      { id: 1, title: "System Analysis", date: "2024-03-01", completed: false },
      { id: 2, title: "Data Migration", date: "2024-03-20", completed: false },
      { id: 3, title: "Testing & Training", date: "2024-04-10", completed: false }
    ],
    subtasks: [
      { id: 1, title: "Requirements Gathering", progress: 30, assignee: "Finance Team" },
      { id: 2, title: "Integration Development", progress: 0, assignee: "IT Support" },
      { id: 3, title: "Consultant Review", progress: 5, assignee: "External Consultant" }
    ]
  }
];

export default function Gantt() {
  const [tasks, setTasks] = useState<GanttTask[]>(sampleGanttTasks);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<'days' | 'weeks' | 'months'>('weeks');

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.assignee.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.project.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = filterProject === "all" || task.project === filterProject;
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    return matchesSearch && matchesProject && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'not_started': return 'bg-gray-500';
      case 'on_hold': return 'bg-yellow-500';
      case 'delayed': return 'bg-red-500';
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

  const calculateProjectCompletion = (project: string) => {
    const projectTasks = tasks.filter(task => task.project === project);
    const totalProgress = projectTasks.reduce((sum, task) => sum + task.progress, 0);
    return projectTasks.length > 0 ? totalProgress / projectTasks.length : 0;
  };

  const getTaskPosition = (task: GanttTask) => {
    const startDate = new Date(task.startDate);
    const endDate = new Date(task.endDate);
    const currentWeekStart = new Date(currentWeek);
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
    
    const daysDiff = Math.floor((startDate.getTime() - currentWeekStart.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      left: Math.max(0, daysDiff * 40), // 40px per day
      width: Math.max(20, duration * 40),
    };
  };

  const projects = Array.from(new Set(tasks.map(task => task.project)));
  const criticalPathTasks = tasks.filter(task => task.criticalPath);
  const totalBudget = tasks.reduce((sum, task) => sum + task.budget, 0);
  const avgProgress = tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length;

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gantt Chart</h1>
            <p className="text-muted-foreground mt-2">
              Advanced project scheduling with dependencies and critical path analysis
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'days' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('days')}
                className="apple-button"
              >
                Days
              </Button>
              <Button
                variant={viewMode === 'weeks' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('weeks')}
                className="apple-button"
              >
                Weeks
              </Button>
              <Button
                variant={viewMode === 'months' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('months')}
                className="apple-button"
              >
                Months
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
                  New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>
                    Add a new task to the project timeline with dependencies
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Task Title</Label>
                      <Input id="title" placeholder="Task name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project">Project</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map(project => (
                            <SelectItem key={project} value={project}>{project}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Task description..." />
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
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(false)}>Create Task</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Project Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Budget</p>
                    <p className="text-2xl font-bold text-foreground">${(totalBudget / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-green-500">All projects</p>
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
                    <p className="text-sm text-muted-foreground">Avg Progress</p>
                    <p className="text-2xl font-bold text-foreground">{avgProgress.toFixed(0)}%</p>
                    <p className="text-xs text-blue-500">Overall completion</p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Critical Path</p>
                    <p className="text-2xl font-bold text-foreground">{criticalPathTasks.length}</p>
                    <p className="text-xs text-red-500">Critical tasks</p>
                  </div>
                  <AlertTriangle className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Projects</p>
                    <p className="text-2xl font-bold text-foreground">{projects.length}</p>
                    <p className="text-xs text-blue-500">Running concurrently</p>
                  </div>
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>
        </div>

        {/* Project Progress by Category */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {projects.slice(0, 3).map((project) => (
            <MoveablePanel key={project} className="glass-panel">
              <Card className="bg-transparent border-none shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{project}</CardTitle>
                  <CardDescription>Project completion overview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {calculateProjectCompletion(project).toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Complete</div>
                  </div>
                  <Progress value={calculateProjectCompletion(project)} className="h-3" />
                  <div className="text-xs text-muted-foreground text-center">
                    {tasks.filter(task => task.project === project).length} tasks in project
                  </div>
                </CardContent>
              </Card>
            </MoveablePanel>
          ))}
        </div>

        {/* Filters and Timeline Navigation */}
        <MoveablePanel className="glass-panel p-4 rounded-xl">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-center flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks, projects, or assignees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80 bg-background/50 border-2 border-border/50 hover:border-primary/30 focus:border-primary/50 transition-all duration-200"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterProject} onValueChange={setFilterProject}>
                  <SelectTrigger className="w-40 bg-background/50 border-2 border-border/50 hover:border-primary/30 transition-all duration-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project} value={project}>{project}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32 bg-background/50 border-2 border-border/50 hover:border-primary/30 transition-all duration-200">
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
            
            {/* Timeline Navigation */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
                className="apple-button"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-4">
                {currentWeek.toLocaleDateString()} - {new Date(currentWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
                className="apple-button"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </MoveablePanel>

        {/* Gantt Chart */}
        <MoveablePanel className="glass-panel rounded-xl overflow-hidden">
          <Card className="bg-transparent border-none shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span>Interactive Gantt Chart</span>
              </CardTitle>
              <CardDescription>
                Drag tasks to reschedule, view dependencies, and track critical path
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Timeline Header */}
              <div className="grid grid-cols-12 border-b border-border/50 pb-2 mb-4">
                <div className="col-span-4 font-medium text-sm text-muted-foreground">Task</div>
                <div className="col-span-2 font-medium text-sm text-muted-foreground">Assignee</div>
                <div className="col-span-2 font-medium text-sm text-muted-foreground">Progress</div>
                <div className="col-span-4 font-medium text-sm text-muted-foreground">Timeline</div>
              </div>
              
              {/* Tasks */}
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <div key={task.id} className="grid grid-cols-12 items-center py-3 hover:bg-muted/20 rounded-lg transition-colors">
                    {/* Task Info */}
                    <div className="col-span-4 space-y-1">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(task.status)}`} />
                        <span className="font-medium text-sm">{task.title}</span>
                        {task.criticalPath && (
                          <Badge variant="destructive" className="text-xs">Critical</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground pl-5">
                        {task.project} • {task.duration} days
                      </div>
                    </div>
                    
                    {/* Assignee */}
                    <div className="col-span-2">
                      <div className="text-sm font-medium">{task.assignee}</div>
                      <div className="text-xs text-muted-foreground">
                        {task.team.length} team members
                      </div>
                    </div>
                    
                    {/* Progress */}
                    <div className="col-span-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{task.progress}%</span>
                        <span className={`text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      <Progress value={task.progress} className="h-2" />
                    </div>
                    
                    {/* Timeline Bar */}
                    <div className="col-span-4 relative h-8 bg-muted/20 rounded">
                      <div
                        className={`absolute top-1 bottom-1 rounded ${getStatusColor(task.status)} opacity-80 flex items-center px-2`}
                        style={{
                          left: '5%',
                          width: `${Math.max(20, task.duration * 2)}%`
                        }}
                      >
                        <span className="text-xs text-white font-medium truncate">
                          {new Date(task.startDate).toLocaleDateString()} - {new Date(task.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {/* Dependencies */}
                      {task.dependencies.length > 0 && (
                        <div className="absolute -left-2 top-1/2 transform -translate-y-1/2">
                          <ArrowRight className="h-3 w-3 text-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Chart Legend */}
              <div className="mt-6 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-green-500 rounded" />
                      <span>Completed</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-blue-500 rounded" />
                      <span>In Progress</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-gray-500 rounded" />
                      <span>Not Started</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Badge variant="destructive" className="text-xs">Critical</Badge>
                      <span>Critical Path</span>
                    </div>
                  </div>
                  <div className="text-xs">
                    Total tasks: {filteredTasks.length} • Critical path tasks: {criticalPathTasks.length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </MoveablePanel>

        {/* Critical Path Analysis */}
        <MoveablePanel className="glass-panel">
          <Card className="bg-transparent border-none shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-red-500" />
                <span>Critical Path Analysis</span>
              </CardTitle>
              <CardDescription>
                Tasks that directly impact project completion date
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {criticalPathTasks.map((task, index) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium text-red-700 dark:text-red-300">{task.title}</h4>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {task.assignee} • {task.duration} days • {task.progress}% complete
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Progress value={task.progress} className="w-20 h-2" />
                      <Button size="sm" variant="outline" onClick={() => setSelectedTask(task)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </MoveablePanel>
      </div>
    </Layout>
  );
}
