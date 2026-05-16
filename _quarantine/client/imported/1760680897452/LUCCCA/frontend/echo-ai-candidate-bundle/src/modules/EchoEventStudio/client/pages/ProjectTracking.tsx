import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  FolderKanban,
  Plus,
  Settings,
  Filter,
  Bell,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Calendar,
  Target,
  TrendingUp,
  BarChart3,
  FileText,
  MessageSquare,
  Upload,
  Download,
  RefreshCw,
  Search,
  Star,
  Flag,
  Paperclip,
  Edit,
  Trash2,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  GitBranch,
  Timer,
  Zap
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string;
  endDate: string;
  estimatedHours: number;
  actualHours: number;
  budget: number;
  spent: number;
  progress: number;
  teamMembers: string[];
  clientId?: string;
  eventId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  milestones: Milestone[];
  tasks: Task[];
  attachments: Attachment[];
  comments: Comment[];
}

interface Task {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string[];
  estimatedHours: number;
  actualHours: number;
  startDate: string;
  dueDate: string;
  completedAt?: string;
  dependencies: string[];
  tags: string[];
  attachments: Attachment[];
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue';
  completedAt?: string;
  tasks: string[];
  createdAt: string;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  editedAt?: string;
  attachments?: Attachment[];
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  email: string;
  activeProjects: number;
  capacity: number;
  skills: string[];
}

const statusColors = {
  'planning': 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'active': 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
  'on-hold': 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  'completed': 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
  'cancelled': 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30'
};

const priorityColors = {
  'low': 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
  'medium': 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'high': 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
  'urgent': 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30'
};

const taskStatusColors = {
  'todo': 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
  'in-progress': 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'review': 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  'completed': 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
  'blocked': 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30'
};

export default function ProjectTracking() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeView, setActiveView] = useState<'grid' | 'list' | 'kanban' | 'timeline'>('grid');
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [newProject, setNewProject] = useState<Partial<Project>>({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    estimatedHours: 0,
    budget: 0,
    teamMembers: [],
    tags: []
  });
  const [newTask, setNewTask] = useState<Partial<Task>>({
    name: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignedTo: [],
    estimatedHours: 0,
    startDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    dependencies: [],
    tags: []
  });

  // Sample data initialization
  useEffect(() => {
    const sampleProjects: Project[] = [
      {
        id: '1',
        name: 'Corporate Event Q1 2024',
        description: 'Annual corporate conference with 500+ attendees, including venue setup, catering, and entertainment coordination.',
        status: 'active',
        priority: 'high',
        startDate: '2024-01-15',
        endDate: '2024-03-30',
        estimatedHours: 320,
        actualHours: 180,
        budget: 150000,
        spent: 85000,
        progress: 65,
        teamMembers: ['user1', 'user2', 'user3'],
        clientId: 'client1',
        eventId: 'event1',
        tags: ['Corporate', 'Conference', 'High-Profile'],
        createdAt: '2024-01-10T10:00:00Z',
        updatedAt: '2024-01-20T14:30:00Z',
        milestones: [
          {
            id: 'm1',
            projectId: '1',
            name: 'Venue Confirmation',
            description: 'Secure venue and finalize contracts',
            dueDate: '2024-02-01',
            status: 'completed',
            completedAt: '2024-01-28T15:00:00Z',
            tasks: ['t1', 't2'],
            createdAt: '2024-01-10T10:00:00Z'
          },
          {
            id: 'm2',
            projectId: '1',
            name: 'Catering Setup',
            description: 'Menu finalization and catering arrangements',
            dueDate: '2024-02-15',
            status: 'pending',
            tasks: ['t3', 't4'],
            createdAt: '2024-01-10T10:00:00Z'
          }
        ],
        tasks: [],
        attachments: [],
        comments: []
      },
      {
        id: '2',
        name: 'Wedding Package Optimization',
        description: 'Streamline wedding planning process and create standardized packages for better efficiency.',
        status: 'planning',
        priority: 'medium',
        startDate: '2024-02-01',
        endDate: '2024-04-15',
        estimatedHours: 160,
        actualHours: 0,
        budget: 50000,
        spent: 5000,
        progress: 15,
        teamMembers: ['user2', 'user4'],
        tags: ['Wedding', 'Process Improvement', 'Package Development'],
        createdAt: '2024-01-15T09:00:00Z',
        updatedAt: '2024-01-20T11:15:00Z',
        milestones: [],
        tasks: [],
        attachments: [],
        comments: []
      },
      {
        id: '3',
        name: 'Technology Integration',
        description: 'Implement new PMS system integration and mobile app development for enhanced guest experience.',
        status: 'active',
        priority: 'urgent',
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        estimatedHours: 800,
        actualHours: 320,
        budget: 200000,
        spent: 120000,
        progress: 40,
        teamMembers: ['user1', 'user3', 'user5'],
        tags: ['Technology', 'Integration', 'Mobile App'],
        createdAt: '2023-12-15T08:00:00Z',
        updatedAt: '2024-01-20T16:45:00Z',
        milestones: [],
        tasks: [],
        attachments: [],
        comments: []
      }
    ];

    const sampleTasks: Task[] = [
      {
        id: 't1',
        projectId: '1',
        name: 'Research and Contact Venues',
        description: 'Identify potential venues that can accommodate 500+ guests with required facilities',
        status: 'completed',
        priority: 'high',
        assignedTo: ['user1'],
        estimatedHours: 20,
        actualHours: 18,
        startDate: '2024-01-15',
        dueDate: '2024-01-25',
        completedAt: '2024-01-24T14:00:00Z',
        dependencies: [],
        tags: ['Venue', 'Research'],
        attachments: [],
        comments: [],
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-24T14:00:00Z'
      },
      {
        id: 't2',
        projectId: '1',
        name: 'Negotiate Venue Contracts',
        description: 'Negotiate terms, pricing, and secure contracts with selected venues',
        status: 'completed',
        priority: 'high',
        assignedTo: ['user2'],
        estimatedHours: 15,
        actualHours: 22,
        startDate: '2024-01-25',
        dueDate: '2024-02-01',
        completedAt: '2024-01-28T15:00:00Z',
        dependencies: ['t1'],
        tags: ['Contract', 'Negotiation'],
        attachments: [],
        comments: [],
        createdAt: '2024-01-25T09:00:00Z',
        updatedAt: '2024-01-28T15:00:00Z'
      },
      {
        id: 't3',
        projectId: '1',
        name: 'Design Menu Options',
        description: 'Create diverse menu options including dietary restrictions and preferences',
        status: 'in-progress',
        priority: 'medium',
        assignedTo: ['user3'],
        estimatedHours: 25,
        actualHours: 10,
        startDate: '2024-02-01',
        dueDate: '2024-02-10',
        dependencies: ['t2'],
        tags: ['Catering', 'Menu Design'],
        attachments: [],
        comments: [],
        createdAt: '2024-02-01T08:00:00Z',
        updatedAt: '2024-02-05T12:00:00Z'
      }
    ];

    const sampleTeamMembers: TeamMember[] = [
      {
        id: 'user1',
        name: 'Sarah Johnson',
        role: 'Project Manager',
        avatar: 'SJ',
        email: 'sarah@company.com',
        activeProjects: 2,
        capacity: 80,
        skills: ['Project Management', 'Client Relations', 'Event Planning']
      },
      {
        id: 'user2',
        name: 'Michael Chen',
        role: 'Event Coordinator',
        avatar: 'MC',
        email: 'michael@company.com',
        activeProjects: 3,
        capacity: 95,
        skills: ['Venue Management', 'Vendor Relations', 'Logistics']
      },
      {
        id: 'user3',
        name: 'Emily Rodriguez',
        role: 'Culinary Director',
        avatar: 'ER',
        email: 'emily@company.com',
        activeProjects: 2,
        capacity: 70,
        skills: ['Menu Planning', 'Catering', 'Dietary Management']
      },
      {
        id: 'user4',
        name: 'David Kim',
        role: 'Marketing Specialist',
        avatar: 'DK',
        email: 'david@company.com',
        activeProjects: 1,
        capacity: 50,
        skills: ['Marketing', 'Branding', 'Social Media']
      },
      {
        id: 'user5',
        name: 'Lisa Wang',
        role: 'Technology Lead',
        avatar: 'LW',
        email: 'lisa@company.com',
        activeProjects: 1,
        capacity: 90,
        skills: ['Software Development', 'System Integration', 'Mobile Apps']
      }
    ];

    setProjects(sampleProjects);
    setTasks(sampleTasks);
    setTeamMembers(sampleTeamMembers);
  }, []);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || project.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const createProject = () => {
    const project: Project = {
      id: Date.now().toString(),
      name: newProject.name || '',
      description: newProject.description || '',
      status: newProject.status as Project['status'] || 'planning',
      priority: newProject.priority as Project['priority'] || 'medium',
      startDate: newProject.startDate || '',
      endDate: newProject.endDate || '',
      estimatedHours: newProject.estimatedHours || 0,
      actualHours: 0,
      budget: newProject.budget || 0,
      spent: 0,
      progress: 0,
      teamMembers: newProject.teamMembers || [],
      tags: newProject.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      milestones: [],
      tasks: [],
      attachments: [],
      comments: []
    };

    setProjects([...projects, project]);
    setNewProject({
      name: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      estimatedHours: 0,
      budget: 0,
      teamMembers: [],
      tags: []
    });
    setIsCreateProjectOpen(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Project Tracking</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive project management with timeline tracking, team collaboration, and milestone management
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={activeView} onValueChange={(value) => setActiveView(value as any)}>
              <SelectTrigger className="w-32 apple-button">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-panel">
                <SelectItem value="grid">Grid View</SelectItem>
                <SelectItem value="list">List View</SelectItem>
                <SelectItem value="kanban">Kanban</SelectItem>
                <SelectItem value="timeline">Timeline</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => setIsCreateProjectOpen(true)}
              className="apple-button bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Projects
              </CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {projects.filter(p => p.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">
                {projects.filter(p => p.status === 'planning').length} in planning
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Budget
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ${projects.reduce((sum, p) => sum + p.budget, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                ${projects.reduce((sum, p) => sum + p.spent, 0).toLocaleString()} spent
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Team Utilization
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {Math.round(teamMembers.reduce((sum, m) => sum + m.capacity, 0) / teamMembers.length)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Average capacity
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completion Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Average progress
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search Projects</Label>
                <Input
                  id="search"
                  placeholder="Search by name, description, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="apple-button"
                />
              </div>
              <div>
                <Label>Status Filter</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="apple-button">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority Filter</Label>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="apple-button">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel">
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" className="apple-button w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects List/Grid */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Projects ({filteredProjects.length})
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="apple-button">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" className="apple-button">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "gap-6",
              activeView === 'grid' ? "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3" : "space-y-4"
            )}>
              {filteredProjects.map(project => {
                const daysUntilDue = getDaysUntilDue(project.endDate);
                const isOverdue = daysUntilDue < 0;
                const progressColor = getProgressColor(project.progress);

                return (
                  <div
                    key={project.id}
                    className="p-6 border border-border/50 rounded-lg glass-panel hover:border-primary/30 transition-all cursor-pointer"
                    onClick={() => setSelectedProject(project)}
                  >
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground text-lg">{project.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {project.description}
                          </p>
                        </div>
                        <Badge className={cn("ml-2", statusColors[project.status])}>
                          {project.status}
                        </Badge>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2">
                        <Badge className={cn("text-xs", priorityColors[project.priority])}>
                          <Flag className="h-3 w-3 mr-1" />
                          {project.priority}
                        </Badge>
                        {project.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {project.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{project.tags.length - 2} more
                          </Badge>
                        )}
                      </div>

                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-2" />
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Budget</div>
                          <div className="font-medium">${project.budget.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            ${project.spent.toLocaleString()} spent
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Timeline</div>
                          <div className="font-medium">{formatDate(project.endDate)}</div>
                          <div className={cn(
                            "text-xs",
                            isOverdue ? "text-red-500" : daysUntilDue <= 7 ? "text-yellow-500" : "text-muted-foreground"
                          )}>
                            {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : 
                             daysUntilDue === 0 ? 'Due today' :
                             `${daysUntilDue} days left`}
                          </div>
                        </div>
                      </div>

                      {/* Team */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Team:</span>
                          <div className="flex -space-x-2">
                            {project.teamMembers.slice(0, 3).map(memberId => {
                              const member = teamMembers.find(m => m.id === memberId);
                              if (!member) return null;
                              return (
                                <Avatar key={memberId} className="h-6 w-6 border-2 border-background">
                                  <AvatarFallback className="text-xs">{member.avatar}</AvatarFallback>
                                </Avatar>
                              );
                            })}
                            {project.teamMembers.length > 3 && (
                              <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                                +{project.teamMembers.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">{project.actualHours}h / {project.estimatedHours}h</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredProjects.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No projects found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Project Dialog */}
        <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
          <DialogContent className="glass-panel max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Start a new project with timeline, budget, and team assignments
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                    className="apple-button"
                    placeholder="Enter project name"
                  />
                </div>
                <div>
                  <Label htmlFor="project-description">Description</Label>
                  <Textarea
                    id="project-description"
                    value={newProject.description}
                    onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                    className="apple-button"
                    rows={3}
                    placeholder="Describe the project scope and objectives"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="project-status">Status</Label>
                    <Select 
                      value={newProject.status} 
                      onValueChange={(value) => setNewProject({...newProject, status: value as Project['status']})}
                    >
                      <SelectTrigger className="apple-button">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-panel">
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="project-priority">Priority</Label>
                    <Select 
                      value={newProject.priority} 
                      onValueChange={(value) => setNewProject({...newProject, priority: value as Project['priority']})}
                    >
                      <SelectTrigger className="apple-button">
                        <SelectValue />
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
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={newProject.startDate}
                      onChange={(e) => setNewProject({...newProject, startDate: e.target.value})}
                      className="apple-button"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={newProject.endDate}
                      onChange={(e) => setNewProject({...newProject, endDate: e.target.value})}
                      className="apple-button"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="estimated-hours">Estimated Hours</Label>
                    <Input
                      id="estimated-hours"
                      type="number"
                      value={newProject.estimatedHours}
                      onChange={(e) => setNewProject({...newProject, estimatedHours: parseInt(e.target.value) || 0})}
                      className="apple-button"
                    />
                  </div>
                  <div>
                    <Label htmlFor="budget">Budget ($)</Label>
                    <Input
                      id="budget"
                      type="number"
                      value={newProject.budget}
                      onChange={(e) => setNewProject({...newProject, budget: parseInt(e.target.value) || 0})}
                      className="apple-button"
                    />
                  </div>
                </div>
                <div>
                  <Label>Team Members</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {teamMembers.map(member => (
                      <div key={member.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`member-${member.id}`}
                          checked={newProject.teamMembers?.includes(member.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewProject({
                                ...newProject,
                                teamMembers: [...(newProject.teamMembers || []), member.id]
                              });
                            } else {
                              setNewProject({
                                ...newProject,
                                teamMembers: (newProject.teamMembers || []).filter(id => id !== member.id)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`member-${member.id}`} className="text-sm">
                          {member.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateProjectOpen(false)} className="apple-button">
                Cancel
              </Button>
              <Button onClick={createProject} className="apple-button bg-primary hover:bg-primary/90">
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
