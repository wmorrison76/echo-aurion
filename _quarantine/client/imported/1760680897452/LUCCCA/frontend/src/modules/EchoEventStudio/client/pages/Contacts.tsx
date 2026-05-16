import Layout from "@/components/Layout";
import MoveablePanel from "@/components/MoveablePanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  Filter,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  Star,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  MessageSquare,
  TrendingUp,
  Clock,
  Activity,
  Target,
  Zap,
  FileText,
  Video,
  Bot,
  Shield,
  Database,
} from "lucide-react";
import { useState } from "react";

interface Contact {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  location: string;
  value: string;
  status: 'hot' | 'warm' | 'cold' | 'converted' | 'qualified' | 'nurturing';
  leadScore: number;
  lastContact: string;
  nextFollowUp: string;
  avatar: string;
  tags: string[];
  notes: string;
  eventsHosted: number;
  totalRevenue: number;
  preferredContactMethod: string;
  industry: string;
  companySize: string;
  decisionMaker: boolean;
  socialProfiles: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  interactions: Array<{
    type: 'email' | 'call' | 'meeting' | 'proposal' | 'contract';
    date: string;
    description: string;
    outcome: string;
  }>;
  opportunities: Array<{
    id: number;
    name: string;
    value: number;
    stage: string;
    probability: number;
    closeDate: string;
  }>;
}

const sampleContacts: Contact[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    company: "TechCorp Inc.",
    email: "sarah@techcorp.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    value: "$45,000",
    status: "hot",
    leadScore: 92,
    lastContact: "2 hours ago",
    nextFollowUp: "2024-01-16",
    avatar: "SJ",
    tags: ["VIP", "Corporate", "Recurring", "Decision Maker"],
    notes: "Interested in Q2 corporate retreat. Prefers morning meetings. Budget approved.",
    eventsHosted: 5,
    totalRevenue: 125000,
    preferredContactMethod: "email",
    industry: "Technology",
    companySize: "500-1000",
    decisionMaker: true,
    socialProfiles: {
      linkedin: "https://linkedin.com/in/sarahjohnson",
      twitter: "@sarahj_tech"
    },
    interactions: [
      { type: 'email', date: '2024-01-14', description: 'Proposal sent for Q2 corporate event', outcome: 'Positive response' },
      { type: 'call', date: '2024-01-12', description: 'Discovery call - budget discussion', outcome: 'Budget confirmed' },
      { type: 'meeting', date: '2024-01-10', description: 'Initial consultation meeting', outcome: 'Requirements gathered' }
    ],
    opportunities: [
      { id: 1, name: 'Q2 Corporate Retreat', value: 45000, stage: 'Proposal', probability: 85, closeDate: '2024-02-15' },
      { id: 2, name: 'Annual Conference 2024', value: 75000, stage: 'Discovery', probability: 40, closeDate: '2024-06-01' }
    ]
  },
  {
    id: 2,
    name: "Michael Chen",
    company: "Global Events Ltd.",
    email: "m.chen@globalevents.com",
    phone: "+1 (555) 987-6543",
    location: "New York, NY",
    value: "$78,000",
    status: "qualified",
    leadScore: 78,
    lastContact: "1 day ago",
    nextFollowUp: "2024-01-18",
    avatar: "MC",
    tags: ["Enterprise", "Multi-Location", "Influencer"],
    notes: "Planning annual conference. Budget approved for premium package. Needs proposal by Friday.",
    eventsHosted: 8,
    totalRevenue: 240000,
    preferredContactMethod: "phone",
    industry: "Event Management",
    companySize: "100-500",
    decisionMaker: true,
    socialProfiles: {
      linkedin: "https://linkedin.com/in/michaelchen"
    },
    interactions: [
      { type: 'proposal', date: '2024-01-13', description: 'Custom proposal for multi-city events', outcome: 'Under review' },
      { type: 'meeting', date: '2024-01-11', description: 'Requirements gathering session', outcome: 'Detailed specs collected' }
    ],
    opportunities: [
      { id: 3, name: 'Multi-City Conference Series', value: 78000, stage: 'Proposal', probability: 70, closeDate: '2024-03-01' }
    ]
  }
];

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>(sampleContacts);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || contact.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hot': return 'bg-red-500';
      case 'warm': return 'bg-amber-500';
      case 'cold': return 'bg-blue-500';
      case 'converted': return 'bg-green-500';
      case 'qualified': return 'bg-purple-500';
      case 'nurturing': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const totalRevenue = contacts.reduce((sum, contact) => sum + contact.totalRevenue, 0);
  const avgLeadScore = contacts.reduce((sum, contact) => sum + contact.leadScore, 0) / contacts.length;
  const hotLeads = contacts.filter(c => c.status === 'hot').length;
  const qualifiedLeads = contacts.filter(c => c.status === 'qualified').length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Contact Management</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive customer relationship management with AI-powered insights
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" className="apple-button">
              <Bot className="h-4 w-4 mr-2" />
              AI Insights
            </Button>
            <Button variant="outline" size="sm" className="apple-button">
              <Database className="h-4 w-4 mr-2" />
              Import/Export
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="apple-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                  <DialogDescription>
                    Create a comprehensive contact record with lead scoring and opportunity tracking.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input id="company" placeholder="Acme Inc." />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="john@acme.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" placeholder="+1 (555) 123-4567" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Lead Status</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hot">Hot Lead</SelectItem>
                          <SelectItem value="warm">Warm Lead</SelectItem>
                          <SelectItem value="cold">Cold Lead</SelectItem>
                          <SelectItem value="qualified">Qualified</SelectItem>
                          <SelectItem value="nurturing">Nurturing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Initial Notes</Label>
                    <Textarea id="notes" placeholder="Initial contact notes, requirements, preferences..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsAddDialogOpen(false)}>Create Contact</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* CRM Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Pipeline</p>
                    <p className="text-2xl font-bold text-foreground">${(totalRevenue / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-green-500">+18.2% this quarter</p>
                  </div>
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Lead Score</p>
                    <p className="text-2xl font-bold text-foreground">{avgLeadScore.toFixed(0)}</p>
                    <p className="text-xs text-blue-500">Quality improving</p>
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
                    <p className="text-sm text-muted-foreground">Hot Leads</p>
                    <p className="text-2xl font-bold text-foreground">{hotLeads}</p>
                    <p className="text-xs text-red-500">Require attention</p>
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
                    <p className="text-sm text-muted-foreground">Qualified</p>
                    <p className="text-2xl font-bold text-foreground">{qualifiedLeads}</p>
                    <p className="text-xs text-green-500">Ready for proposals</p>
                  </div>
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>
        </div>

        {/* Advanced Filters and Search */}
        <MoveablePanel className="glass-panel p-4 rounded-xl">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts by name, company, email, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50 border-2 border-border/50 hover:border-primary/30 focus:border-primary/50 transition-all duration-200"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 bg-background/50 border-2 border-border/50 hover:border-primary/30 transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contacts</SelectItem>
                  <SelectItem value="hot">Hot Leads</SelectItem>
                  <SelectItem value="warm">Warm Leads</SelectItem>
                  <SelectItem value="cold">Cold Leads</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="nurturing">Nurturing</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="apple-button">
                <Shield className="h-4 w-4 mr-2" />
                Security
              </Button>
            </div>
          </div>
        </MoveablePanel>

        {/* Enhanced Contacts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => (
            <MoveablePanel key={contact.id} className="glass-panel">
              <Card className="bg-transparent border-none shadow-none h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src="/placeholder.svg" alt={contact.name} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {contact.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg leading-none">{contact.name}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {contact.company}
                        </CardDescription>
                        <div className="flex items-center space-x-1 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {contact.industry}
                          </Badge>
                          {contact.decisionMaker && (
                            <Badge variant="secondary" className="text-xs">
                              Decision Maker
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedContact(contact)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Contact
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Send Message
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Calendar className="mr-2 h-4 w-4" />
                          Schedule Meeting
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="mr-2 h-4 w-4" />
                          Create Proposal
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Contact
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(contact.status)}`} />
                      <span className="text-sm capitalize font-medium">{contact.status}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">Lead Score:</span>
                      <span className={`text-sm font-bold ${getLeadScoreColor(contact.leadScore)}`}>
                        {contact.leadScore}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Mail className="h-3 w-3 mr-2" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Phone className="h-3 w-3 mr-2" />
                      <span>{contact.phone}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="h-3 w-3 mr-2" />
                      <span>{contact.location}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Pipeline Value:</span>
                      <span className="font-bold text-green-500">{contact.value}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Revenue:</span>
                      <span className="font-medium">${contact.totalRevenue.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {contact.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {contact.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{contact.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Last contact: {contact.lastContact}</span>
                    <span>Next: {contact.nextFollowUp}</span>
                  </div>
                </CardContent>
              </Card>
            </MoveablePanel>
          ))}
        </div>

        {/* Enhanced Contact Detail Dialog */}
        <Dialog open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
          <DialogContent className="glass-panel max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedContact && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src="/placeholder.svg" alt={selectedContact.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {selectedContact.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <DialogTitle className="text-2xl">{selectedContact.name}</DialogTitle>
                        <DialogDescription className="text-lg">
                          {selectedContact.company} • {selectedContact.industry}
                        </DialogDescription>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline" className="capitalize">
                            {selectedContact.status}
                          </Badge>
                          <Badge variant="secondary">
                            Lead Score: {selectedContact.leadScore}
                          </Badge>
                          {selectedContact.decisionMaker && (
                            <Badge variant="default">Decision Maker</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </Button>
                      <Button size="sm" variant="outline">
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </Button>
                      <Button size="sm" variant="outline">
                        <Video className="h-4 w-4 mr-2" />
                        Meet
                      </Button>
                    </div>
                  </div>
                </DialogHeader>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="interactions">Activity</TabsTrigger>
                    <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium">Contact Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-3 text-muted-foreground" />
                            {selectedContact.email}
                          </div>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-3 text-muted-foreground" />
                            {selectedContact.phone}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-3 text-muted-foreground" />
                            {selectedContact.location}
                          </div>
                          <div className="flex items-center">
                            <Building2 className="h-4 w-4 mr-3 text-muted-foreground" />
                            {selectedContact.companySize} employees
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">Tags & Categories</h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedContact.tags.map((tag, index) => (
                              <Badge key={index} variant="outline">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-medium">Business Metrics</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Events Hosted:</span>
                            <span className="font-medium">{selectedContact.eventsHosted}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Total Revenue:</span>
                            <span className="font-bold text-green-500">
                              ${selectedContact.totalRevenue.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Lead Score:</span>
                            <div className="flex items-center space-x-2">
                              <Progress value={selectedContact.leadScore} className="w-16 h-2" />
                              <span className={`font-bold ${getLeadScoreColor(selectedContact.leadScore)}`}>
                                {selectedContact.leadScore}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Next Follow-up:</span>
                            <span className="font-medium">{selectedContact.nextFollowUp}</span>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">Social Profiles</h4>
                          <div className="space-y-1 text-sm">
                            {selectedContact.socialProfiles.linkedin && (
                              <div className="text-blue-600">LinkedIn: Connected</div>
                            )}
                            {selectedContact.socialProfiles.twitter && (
                              <div className="text-blue-400">Twitter: {selectedContact.socialProfiles.twitter}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h4 className="font-medium mb-2">Notes & Comments</h4>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                        {selectedContact.notes}
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="interactions" className="space-y-4 mt-6">
                    <div className="space-y-3">
                      {selectedContact.interactions.map((interaction, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-muted/20 rounded-lg">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Activity className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium capitalize">{interaction.type}</span>
                              <span className="text-xs text-muted-foreground">{interaction.date}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{interaction.description}</p>
                            <p className="text-xs text-green-600 mt-1">Outcome: {interaction.outcome}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="opportunities" className="space-y-4 mt-6">
                    <div className="space-y-3">
                      {selectedContact.opportunities.map((opportunity) => (
                        <div key={opportunity.id} className="p-4 border border-border/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium">{opportunity.name}</h5>
                            <Badge variant="outline">{opportunity.stage}</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Value:</span>
                              <div className="font-bold text-green-500">${opportunity.value.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Probability:</span>
                              <div className="font-medium">{opportunity.probability}%</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Close Date:</span>
                              <div className="font-medium">{opportunity.closeDate}</div>
                            </div>
                          </div>
                          <Progress value={opportunity.probability} className="mt-3 h-2" />
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="documents" className="space-y-4 mt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Document management and proposal tracking will be available here.</p>
                      <Button variant="outline" className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="analytics" className="space-y-4 mt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Advanced contact analytics and AI insights will be displayed here.</p>
                      <Button variant="outline" className="mt-4">
                        <Zap className="h-4 w-4 mr-2" />
                        Generate Insights
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <DialogFooter className="mt-6">
                  <Button variant="outline" onClick={() => setSelectedContact(null)}>
                    Close
                  </Button>
                  <Button>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Contact
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
