import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  UserCheck,
  Users,
  TrendingUp,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Star,
  Filter,
  Search,
  Plus,
  Eye,
  Edit,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertCircle,
  Target,
  Award,
  Zap,
  MessageSquare,
  FileText,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function LeadManagement() {
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const leads = [
    {
      id: "1",
      name: "Sarah Chen",
      email: "sarah.chen@techcorp.com",
      phone: "(555) 123-4567",
      company: "TechCorp Solutions",
      status: "hot",
      score: 92,
      source: "Website",
      value: 45000,
      lastContact: "2024-01-15",
      nextFollowUp: "2024-01-18",
      assignedTo: "Alex Rodriguez",
      stage: "Proposal Sent",
      notes: "Interested in Q2 corporate retreat. Budget approved.",
      tags: ["Corporate", "High-Value", "Q2"]
    },
    {
      id: "2",
      name: "Michael Johnson",
      email: "mjohnson@happycouple.com",
      phone: "(555) 987-6543",
      company: "Happy Couple Wedding",
      status: "warm",
      score: 78,
      source: "Referral",
      value: 25000,
      lastContact: "2024-01-14",
      nextFollowUp: "2024-01-20",
      assignedTo: "Emma Thompson",
      stage: "Initial Meeting",
      notes: "Planning summer wedding for 150 guests. Price sensitive.",
      tags: ["Wedding", "Summer", "Price-Sensitive"]
    },
    {
      id: "3",
      name: "Lisa Rodriguez",
      email: "lisa@creativesolutions.com",
      phone: "(555) 456-7890",
      company: "Creative Solutions Agency",
      status: "cold",
      score: 45,
      source: "LinkedIn",
      value: 15000,
      lastContact: "2024-01-10",
      nextFollowUp: "2024-01-25",
      assignedTo: "David Kim",
      stage: "Qualification",
      notes: "Small team event. Needs to check availability.",
      tags: ["Corporate", "Small", "Follow-up"]
    },
    {
      id: "4",
      name: "Robert Wilson",
      email: "rwilson@familyevent.com",
      phone: "(555) 321-0987",
      company: "Wilson Family Events",
      status: "hot",
      score: 88,
      source: "Website",
      value: 35000,
      lastContact: "2024-01-16",
      nextFollowUp: "2024-01-19",
      assignedTo: "Sarah Mitchell",
      stage: "Contract Review",
      notes: "Anniversary celebration. Ready to book.",
      tags: ["Anniversary", "Family", "Ready-to-Book"]
    }
  ];

  const leadMetrics = {
    totalLeads: 156,
    newThisWeek: 23,
    conversionRate: 18.5,
    averageValue: 28500,
    hotLeads: 34,
    avgResponseTime: 2.4
  };

  const filteredLeads = leads.filter(lead => {
    const matchesStatus = filterStatus === "all" || lead.status === filterStatus;
    const matchesSearch = !searchTerm || 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hot': return 'bg-red-100 text-red-800 border-red-200';
      case 'warm': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cold': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lead Management</h1>
            <p className="text-muted-foreground">
              Track, qualify, and nurture leads throughout the sales funnel
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lead
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Lead</DialogTitle>
                  <DialogDescription>
                    Enter the lead information to start tracking
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" placeholder="John Doe" />
                    </div>
                    <div>
                      <Label htmlFor="company">Company</Label>
                      <Input id="company" placeholder="Company Name" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="john@company.com" />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" placeholder="(555) 123-4567" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="source">Lead Source</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="cold-call">Cold Call</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" placeholder="Initial conversation notes..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Add Lead</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <FileText className="h-4 w-4 mr-2" />
                  Export Leads
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Send className="h-4 w-4 mr-2" />
                  Bulk Email
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                  <p className="text-2xl font-bold">{leadMetrics.totalLeads}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">New This Week</p>
                  <p className="text-2xl font-bold">{leadMetrics.newThisWeek}</p>
                  <p className="text-xs text-green-600">+15% from last week</p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Hot Leads</p>
                  <p className="text-2xl font-bold">{leadMetrics.hotLeads}</p>
                </div>
                <Zap className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold">{leadMetrics.conversionRate}%</p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Value</p>
                  <p className="text-2xl font-bold">${leadMetrics.averageValue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                  <p className="text-2xl font-bold">{leadMetrics.avgResponseTime}h</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads by name, company, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="hot">Hot Leads</SelectItem>
                  <SelectItem value="warm">Warm Leads</SelectItem>
                  <SelectItem value="cold">Cold Leads</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="list" className="space-y-6">
          <TabsList>
            <TabsTrigger value="list">Lead List</TabsTrigger>
            <TabsTrigger value="board">Kanban Board</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <div className="grid gap-4">
              {filteredLeads.map((lead) => (
                <Card key={lead.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>
                            {lead.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{lead.name}</h3>
                            <Badge className={getStatusColor(lead.status)}>
                              {lead.status.toUpperCase()}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className={cn("font-medium", getScoreColor(lead.score))}>
                                {lead.score}
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Company</p>
                              <p className="font-medium">{lead.company}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Value</p>
                              <p className="font-medium">${lead.value.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Stage</p>
                              <p className="font-medium">{lead.stage}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Assigned To</p>
                              <p className="font-medium">{lead.assignedTo}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {lead.email}
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {lead.phone}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Next: {new Date(lead.nextFollowUp).toLocaleDateString()}
                            </div>
                          </div>

                          <div className="flex gap-2 mt-3">
                            {lead.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Lead
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Calendar className="h-4 w-4 mr-2" />
                              Schedule Meeting
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Send className="h-4 w-4 mr-2" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-green-600">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Convert to Customer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="board">
            <Card>
              <CardHeader>
                <CardTitle>Lead Pipeline Board</CardTitle>
                <CardDescription>Drag and drop leads through different stages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium">Kanban Board Coming Soon</h3>
                  <p className="text-sm text-muted-foreground">Visual pipeline management for your leads</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Lead Analytics</CardTitle>
                <CardDescription>Detailed insights and performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium">Advanced Analytics Coming Soon</h3>
                  <p className="text-sm text-muted-foreground">Deep insights into lead performance and trends</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
