import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  DollarSign,
  Target,
  TrendingUp,
  Phone,
  Mail,
  Calendar,
  Building2,
  Clock,
  User,
  Award,
  Eye,
  ArrowRight,
  MessageSquare,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle
} from "lucide-react";

interface PipelineDetailsModalProps {
  children: React.ReactNode;
  pipelineData: any;
}

export default function PipelineDetailsModal({ children, pipelineData }: PipelineDetailsModalProps) {
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const sampleLeads = [
    {
      id: 1,
      name: "Sarah Johnson",
      company: "TechCorp Inc.",
      email: "sarah@techcorp.com",
      phone: "+1 (555) 123-4567",
      value: "$45,000",
      stage: "Qualified",
      lastInteraction: "Called about venue capacity for tech conference",
      lastContact: "2 hours ago",
      priority: "high",
      eventType: "Corporate Conference",
      guestCount: 250,
      eventDate: "2024-04-15",
      probability: 75,
      interactions: [
        { date: "2024-01-10", type: "call", note: "Initial inquiry about corporate events", user: "William Morrison" },
        { date: "2024-01-12", type: "email", note: "Sent venue tour invitation and pricing", user: "William Morrison" },
        { date: "2024-01-15", type: "meeting", note: "Venue tour completed, very interested", user: "William Morrison" },
        { date: "2024-01-18", type: "call", note: "Discussed catering options and AV requirements", user: "William Morrison" }
      ]
    },
    {
      id: 2,
      name: "Michael Chen",
      company: "Global Events Ltd.",
      email: "m.chen@globalevents.com",
      phone: "+1 (555) 987-6543",
      value: "$78,000",
      stage: "Proposal",
      lastInteraction: "Reviewed and approved initial BEO draft",
      lastContact: "1 day ago",
      priority: "high",
      eventType: "Product Launch",
      guestCount: 180,
      eventDate: "2024-03-20",
      probability: 85,
      interactions: [
        { date: "2024-01-05", type: "email", note: "Inbound lead from website form", user: "Sarah Johnson" },
        { date: "2024-01-08", type: "call", note: "Qualified as decision maker, budget confirmed", user: "Sarah Johnson" },
        { date: "2024-01-12", type: "meeting", note: "Proposal presentation, positive feedback", user: "Sarah Johnson" },
        { date: "2024-01-16", type: "email", note: "Sent detailed BEO and contract", user: "Sarah Johnson" }
      ]
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      company: "Luxury Weddings Co.",
      email: "emily@luxuryweddings.com",
      phone: "+1 (555) 456-7890",
      value: "$32,000",
      stage: "Negotiation",
      lastInteraction: "Negotiating catering package options",
      lastContact: "3 days ago",
      priority: "medium",
      eventType: "Wedding Reception",
      guestCount: 120,
      eventDate: "2024-06-08",
      probability: 65,
      interactions: [
        { date: "2024-01-02", type: "call", note: "Referral from previous client", user: "Michael Chen" },
        { date: "2024-01-05", type: "meeting", note: "Venue walkthrough with couple", user: "Michael Chen" },
        { date: "2024-01-10", type: "email", note: "Sent wedding package options", user: "Michael Chen" },
        { date: "2024-01-14", type: "call", note: "Price negotiation in progress", user: "Michael Chen" }
      ]
    }
  ];

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "Prospects": return "bg-gray-100 text-gray-700";
      case "Qualified": return "bg-blue-100 text-blue-700";
      case "Proposal": return "bg-yellow-100 text-yellow-700";
      case "Negotiation": return "bg-orange-100 text-orange-700";
      case "Won": return "bg-green-100 text-green-700";
      case "Lost": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "medium": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "low": return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case "call": return <Phone className="h-4 w-4" />;
      case "email": return <Mail className="h-4 w-4" />;
      case "meeting": return <Users className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-primary" />
            <span>Sales Pipeline Details - $890K Total Value</span>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="by-stage">By Stage</TabsTrigger>
            <TabsTrigger value="team-performance">Team Performance</TabsTrigger>
            <TabsTrigger value="leads">Individual Leads</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">$890,000</div>
                  <p className="text-xs text-muted-foreground">Across 85 active leads</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">24.7%</div>
                  <p className="text-xs text-muted-foreground">Up 3.2% from last month</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Avg. Deal Size</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$30,470</div>
                  <p className="text-xs text-muted-foreground">18% larger than last quarter</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Pipeline Flow</CardTitle>
                <CardDescription>Lead progression through sales stages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pipelineData.stages.map((stage: any, index: number) => (
                    <div key={stage.name} className="flex items-center space-x-4">
                      <div className="w-20 text-sm font-medium">{stage.name}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-muted-foreground">{stage.count} leads</span>
                          <span className="text-sm font-medium">${(stage.value / 1000).toFixed(0)}K</span>
                        </div>
                        <Progress value={stage.conversionRate} className="h-2" />
                      </div>
                      <div className="text-sm text-muted-foreground">{stage.conversionRate}%</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="by-stage" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pipelineData.stages.map((stage: any) => (
                <Card key={stage.name}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{stage.name}</span>
                      <Badge className={getStageColor(stage.name)}>{stage.count}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Value:</span>
                        <span className="font-medium">${(stage.value / 1000).toFixed(0)}K</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Conversion Rate:</span>
                        <span className="font-medium">{stage.conversionRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Avg. Deal:</span>
                        <span className="font-medium">${stage.count > 0 ? (stage.value / stage.count / 1000).toFixed(0) : 0}K</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="team-performance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pipelineData.teamPerformance.map((member: any) => (
                <Card key={member.name}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{member.name}</span>
                    </CardTitle>
                    <CardDescription>{member.role}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Prospects:</span>
                        <span className="font-medium">{member.prospects}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Qualified:</span>
                        <span className="font-medium">{member.qualified}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Won/Lost:</span>
                        <span className="font-medium">{member.won}/{member.lost}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Revenue:</span>
                        <span className="font-medium text-green-600">${(member.revenue / 1000).toFixed(0)}K</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Commission:</span>
                        <span className="font-medium">${member.commission.toLocaleString()}</span>
                      </div>
                      <div className="pt-2">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-muted-foreground">Efficiency:</span>
                          <span className="text-sm font-medium">{member.efficiency}%</span>
                        </div>
                        <Progress value={member.efficiency} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="leads" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Active Leads</CardTitle>
                  <CardDescription>Click on any lead to view detailed interaction history</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {sampleLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{lead.name}</span>
                                {getPriorityIcon(lead.priority)}
                              </div>
                              <p className="text-sm text-muted-foreground">{lead.company}</p>
                              <div className="flex items-center space-x-4 mt-2">
                                <Badge className={getStageColor(lead.stage)}>{lead.stage}</Badge>
                                <span className="text-sm font-medium text-green-600">{lead.value}</span>
                                <span className="text-sm text-muted-foreground">{lead.probability}%</span>
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">{lead.lastInteraction}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {selectedLead && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{selectedLead.name}</span>
                    </CardTitle>
                    <CardDescription>{selectedLead.company}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Email:</span>
                          <p className="font-medium">{selectedLead.email}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Phone:</span>
                          <p className="font-medium">{selectedLead.phone}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Event Type:</span>
                          <p className="font-medium">{selectedLead.eventType}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Guest Count:</span>
                          <p className="font-medium">{selectedLead.guestCount}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Event Date:</span>
                          <p className="font-medium">{selectedLead.eventDate}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Deal Value:</span>
                          <p className="font-medium text-green-600">{selectedLead.value}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Interaction History</h4>
                        <ScrollArea className="h-48">
                          <div className="space-y-3">
                            {selectedLead.interactions.map((interaction: any, index: number) => (
                              <div key={index} className="flex items-start space-x-3 p-2 rounded-lg bg-muted/20">
                                <div className="mt-1">
                                  {getInteractionIcon(interaction.type)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium capitalize">{interaction.type}</span>
                                    <span className="text-xs text-muted-foreground">{interaction.date}</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{interaction.note}</p>
                                  <p className="text-xs text-muted-foreground">by {interaction.user}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>

                      <div className="flex space-x-2">
                        <Button size="sm" className="flex-1">
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Mail className="h-4 w-4 mr-2" />
                          Email
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
