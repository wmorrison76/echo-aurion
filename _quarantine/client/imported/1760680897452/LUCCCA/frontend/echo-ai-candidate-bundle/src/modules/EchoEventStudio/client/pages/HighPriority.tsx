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
  AlertTriangle,
  Clock,
  Users,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Zap,
  Flag,
  Calendar,
  DollarSign,
  MessageSquare,
  Bell,
  Plus,
  Filter,
  Search,
  RefreshCw,
  ArrowUpRight,
  Target,
  Activity,
} from "lucide-react";
import { useState } from "react";

interface HighPriorityItem {
  id: number;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'urgent';
  category: 'customer_issue' | 'system_alert' | 'deadline' | 'escalation' | 'emergency';
  status: 'open' | 'in_progress' | 'resolved' | 'escalated';
  assignee: string;
  customer: string;
  contactInfo: {
    email: string;
    phone: string;
  };
  dueDate: string;
  createdDate: string;
  lastUpdated: string;
  value: number;
  slaStatus: 'on_time' | 'at_risk' | 'overdue';
  timeRemaining: string;
  escalationLevel: number;
  tags: string[];
  notes: string[];
}

const sampleHighPriorityItems: HighPriorityItem[] = [
  {
    id: 1,
    title: "VIP Client Event Venue Issue",
    description: "TechCorp's CEO arrival delayed due to unexpected venue maintenance. Need immediate alternative solution for 250-person corporate summit.",
    priority: "critical",
    category: "emergency",
    status: "in_progress",
    assignee: "Sarah Johnson",
    customer: "TechCorp Inc.",
    contactInfo: {
      email: "sarah@techcorp.com",
      phone: "+1 (555) 123-4567"
    },
    dueDate: "2024-01-15T09:00:00",
    createdDate: "2024-01-14T14:30:00",
    lastUpdated: "2024-01-14T16:45:00",
    value: 45000,
    slaStatus: "at_risk",
    timeRemaining: "14h 15m",
    escalationLevel: 2,
    tags: ["VIP", "Venue", "Emergency", "CEO"],
    notes: [
      "14:30 - Issue reported by client",
      "15:15 - Alternative venues contacted",
      "16:45 - Backup venue secured, awaiting confirmation"
    ]
  },
  {
    id: 2,
    title: "Payment System Outage",
    description: "Credit card processing system down affecting all current bookings and new reservations. Multiple clients unable to complete transactions.",
    priority: "critical",
    category: "system_alert",
    status: "escalated",
    assignee: "IT Support Team",
    customer: "Multiple Clients",
    contactInfo: {
      email: "support@hospitalitycrm.com",
      phone: "+1 (555) 987-6543"
    },
    dueDate: "2024-01-14T20:00:00",
    createdDate: "2024-01-14T13:20:00",
    lastUpdated: "2024-01-14T17:00:00",
    value: 125000,
    slaStatus: "overdue",
    timeRemaining: "Overdue by 2h",
    escalationLevel: 3,
    tags: ["System", "Payment", "Outage", "Revenue Impact"],
    notes: [
      "13:20 - System outage detected",
      "13:45 - Payment processor contacted",
      "15:30 - Escalated to Level 2 support",
      "17:00 - CEO notification sent"
    ]
  },
  {
    id: 3,
    title: "Wedding Catering Supplier Cancellation",
    description: "Primary catering supplier cancelled 48 hours before luxury wedding due to staff shortage. Need immediate replacement for 120-guest reception.",
    priority: "high",
    category: "escalation",
    status: "open",
    assignee: "Jennifer Brown",
    customer: "Luxury Weddings Co.",
    contactInfo: {
      email: "emily@luxuryweddings.com",
      phone: "+1 (555) 456-7890"
    },
    dueDate: "2024-01-16T12:00:00",
    createdDate: "2024-01-14T10:15:00",
    lastUpdated: "2024-01-14T11:30:00",
    value: 32000,
    slaStatus: "at_risk",
    timeRemaining: "1d 18h",
    escalationLevel: 1,
    tags: ["Wedding", "Catering", "Supplier", "Last Minute"],
    notes: [
      "10:15 - Cancellation notice received",
      "10:45 - Backup suppliers contacted",
      "11:30 - 3 potential replacements identified"
    ]
  },
  {
    id: 4,
    title: "Data Security Breach Alert",
    description: "Suspicious login attempts detected on multiple admin accounts. Potential security breach requiring immediate investigation and response.",
    priority: "critical",
    category: "system_alert",
    status: "in_progress",
    assignee: "Security Team",
    customer: "Internal",
    contactInfo: {
      email: "security@hospitalitycrm.com",
      phone: "+1 (555) 555-0123"
    },
    dueDate: "2024-01-14T19:00:00",
    createdDate: "2024-01-14T16:20:00",
    lastUpdated: "2024-01-14T17:15:00",
    value: 0,
    slaStatus: "on_time",
    timeRemaining: "1h 45m",
    escalationLevel: 1,
    tags: ["Security", "Breach", "Admin", "Investigation"],
    notes: [
      "16:20 - Suspicious activity detected",
      "16:35 - Admin accounts temporarily locked",
      "17:15 - Forensic analysis initiated"
    ]
  },
  {
    id: 5,
    title: "Contract Deadline - Global Events Ltd",
    description: "Multi-million dollar annual contract with Global Events Ltd expires tonight. Need final signature and approval before deadline.",
    priority: "urgent",
    category: "deadline",
    status: "in_progress",
    assignee: "William Morrison",
    customer: "Global Events Ltd.",
    contactInfo: {
      email: "m.chen@globalevents.com",
      phone: "+1 (555) 987-6543"
    },
    dueDate: "2024-01-14T23:59:00",
    createdDate: "2024-01-12T09:00:00",
    lastUpdated: "2024-01-14T16:30:00",
    value: 780000,
    slaStatus: "at_risk",
    timeRemaining: "6h 45m",
    escalationLevel: 2,
    tags: ["Contract", "Deadline", "Revenue", "Legal"],
    notes: [
      "Jan 12 - Contract negotiations initiated",
      "Jan 13 - Terms agreed upon",
      "16:30 - Final review with legal team"
    ]
  }
];

export default function HighPriority() {
  const [items, setItems] = useState<HighPriorityItem[]>(sampleHighPriorityItems);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<HighPriorityItem | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === "all" || item.priority === filterPriority;
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    return matchesSearch && matchesPriority && matchesCategory;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'urgent': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getSLAColor = (slaStatus: string) => {
    switch (slaStatus) {
      case 'on_time': return 'text-green-500';
      case 'at_risk': return 'text-yellow-500';
      case 'overdue': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Activity className="h-4 w-4 text-blue-500" />;
      case 'escalated': return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'open': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const criticalItems = items.filter(item => item.priority === 'critical').length;
  const overdueItems = items.filter(item => item.slaStatus === 'overdue').length;
  const totalValue = items.reduce((sum, item) => sum + item.value, 0);
  const escalatedItems = items.filter(item => item.status === 'escalated').length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <span>High Priority Dashboard</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Critical alerts, urgent tasks, and escalated issues requiring immediate attention
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" className="apple-button">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="apple-button bg-red-500 hover:bg-red-600">
                  <Plus className="h-4 w-4 mr-2" />
                  New Alert
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create High Priority Alert</DialogTitle>
                  <DialogDescription>
                    Report a critical issue or urgent task requiring immediate attention
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Alert Title</Label>
                      <Input id="title" placeholder="Critical issue description" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority Level</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Detailed description of the issue..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer_issue">Customer Issue</SelectItem>
                          <SelectItem value="system_alert">System Alert</SelectItem>
                          <SelectItem value="deadline">Deadline</SelectItem>
                          <SelectItem value="escalation">Escalation</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assignee">Assign To</Label>
                      <Input id="assignee" placeholder="Team member" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer">Customer/Client</Label>
                      <Input id="customer" placeholder="Client name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Due Date & Time</Label>
                      <Input id="dueDate" type="datetime-local" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(false)} className="bg-red-500 hover:bg-red-600">
                    Create Alert
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Critical Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Critical Issues</p>
                    <p className="text-2xl font-bold text-red-500">{criticalItems}</p>
                    <p className="text-xs text-red-500">Requires immediate action</p>
                  </div>
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Overdue</p>
                    <p className="text-2xl font-bold text-red-500">{overdueItems}</p>
                    <p className="text-xs text-red-500">Past SLA deadline</p>
                  </div>
                  <Clock className="h-6 w-6 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Value at Risk</p>
                    <p className="text-2xl font-bold text-orange-500">${(totalValue / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-orange-500">Revenue exposure</p>
                  </div>
                  <DollarSign className="h-6 w-6 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Escalated</p>
                    <p className="text-2xl font-bold text-yellow-500">{escalatedItems}</p>
                    <p className="text-xs text-yellow-500">Management involved</p>
                  </div>
                  <ArrowUpRight className="h-6 w-6 text-yellow-500" />
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
                placeholder="Search alerts, customers, or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50 border-2 border-border/50 hover:border-primary/30 focus:border-primary/50 transition-all duration-200"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-32 bg-background/50 border-2 border-border/50 hover:border-primary/30 transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40 bg-background/50 border-2 border-border/50 hover:border-primary/30 transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="customer_issue">Customer Issues</SelectItem>
                  <SelectItem value="system_alert">System Alerts</SelectItem>
                  <SelectItem value="deadline">Deadlines</SelectItem>
                  <SelectItem value="emergency">Emergencies</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </MoveablePanel>

        {/* High Priority Items */}
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <MoveablePanel key={item.id} className="glass-panel">
              <Card className="bg-transparent border-none shadow-none">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Priority Indicator */}
                    <div className="flex flex-col items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getPriorityColor(item.priority)}`}>
                        <Flag className="h-6 w-6 text-white" />
                      </div>
                      <Badge variant="outline" className="mt-2 text-xs capitalize">
                        {item.priority}
                      </Badge>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                            <Badge variant="outline" className="capitalize">
                              {item.category.replace('_', ' ')}
                            </Badge>
                            {getStatusIcon(item.status)}
                            <Badge variant="outline" className="capitalize">
                              {item.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center">
                              <Users className="h-3 w-3 mr-2 text-muted-foreground" />
                              <span className="text-muted-foreground">Customer:</span>
                              <span className="ml-1 font-medium">{item.customer}</span>
                            </div>
                            <div className="flex items-center">
                              <Target className="h-3 w-3 mr-2 text-muted-foreground" />
                              <span className="text-muted-foreground">Assignee:</span>
                              <span className="ml-1 font-medium">{item.assignee}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-2 text-muted-foreground" />
                              <span className="text-muted-foreground">Due:</span>
                              <span className="ml-1 font-medium">
                                {new Date(item.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <DollarSign className="h-3 w-3 mr-2 text-muted-foreground" />
                              <span className="text-muted-foreground">Value:</span>
                              <span className="ml-1 font-medium text-green-500">
                                ${item.value.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end space-y-2">
                          <div className="flex items-center space-x-2">
                            <Button size="sm" variant="outline" className="apple-button">
                              <Phone className="h-4 w-4 mr-2" />
                              Call
                            </Button>
                            <Button size="sm" variant="outline" className="apple-button">
                              <Mail className="h-4 w-4 mr-2" />
                              Email
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedItem(item)}
                              className="apple-button"
                            >
                              View Details
                            </Button>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${getSLAColor(item.slaStatus)}`}>
                              {item.timeRemaining}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Escalation Level {item.escalationLevel}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* SLA Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">SLA Progress</span>
                          <span className={getSLAColor(item.slaStatus)}>
                            {item.slaStatus.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <Progress 
                          value={item.slaStatus === 'overdue' ? 100 : item.slaStatus === 'at_risk' ? 85 : 45} 
                          className="h-2" 
                        />
                      </div>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      {/* Latest Note */}
                      {item.notes.length > 0 && (
                        <div className="bg-muted/20 p-3 rounded-lg">
                          <div className="flex items-center space-x-2 mb-1">
                            <MessageSquare className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Latest Update:</span>
                          </div>
                          <p className="text-sm">{item.notes[item.notes.length - 1]}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </MoveablePanel>
          ))}
        </div>

        {/* Detail Dialog */}
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="glass-panel max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedItem && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-2xl flex items-center space-x-2">
                        <Flag className={`h-6 w-6 ${selectedItem.priority === 'critical' ? 'text-red-500' : selectedItem.priority === 'high' ? 'text-orange-500' : 'text-yellow-500'}`} />
                        <span>{selectedItem.title}</span>
                      </DialogTitle>
                      <DialogDescription className="text-lg mt-1">
                        {selectedItem.customer} • {selectedItem.category.replace('_', ' ').toUpperCase()}
                      </DialogDescription>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="outline" className="capitalize">
                          {selectedItem.priority} Priority
                        </Badge>
                        <Badge variant="secondary" className="capitalize">
                          {selectedItem.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className={getSLAColor(selectedItem.slaStatus)}>
                          SLA: {selectedItem.slaStatus.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Phone className="h-4 w-4 mr-2" />
                        {selectedItem.contactInfo.phone}
                      </Button>
                      <Button size="sm" variant="outline">
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </Button>
                    </div>
                  </div>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Issue Details</h4>
                      <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Assignee:</span>
                        <div className="font-medium">{selectedItem.assignee}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Due Date:</span>
                        <div className="font-medium">{new Date(selectedItem.dueDate).toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <div className="font-medium">{new Date(selectedItem.createdDate).toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Value at Risk:</span>
                        <div className="font-medium text-green-500">${selectedItem.value.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Contact Information</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center">
                          <Mail className="h-3 w-3 mr-2 text-muted-foreground" />
                          {selectedItem.contactInfo.email}
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-3 w-3 mr-2 text-muted-foreground" />
                          {selectedItem.contactInfo.phone}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-3">Activity Timeline</h4>
                      <div className="space-y-2">
                        {selectedItem.notes.map((note, index) => (
                          <div key={index} className="flex items-start space-x-2 p-2 bg-muted/20 rounded-lg">
                            <Clock className="h-3 w-3 mt-1 text-muted-foreground" />
                            <span className="text-sm">{note}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Time Remaining</h4>
                      <div className="text-center p-4 bg-muted/20 rounded-lg">
                        <div className={`text-2xl font-bold ${getSLAColor(selectedItem.slaStatus)}`}>
                          {selectedItem.timeRemaining}
                        </div>
                        <div className="text-sm text-muted-foreground">Until SLA deadline</div>
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
                  <Button className="bg-red-500 hover:bg-red-600">
                    <Zap className="h-4 w-4 mr-2" />
                    Take Action
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
