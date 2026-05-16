import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  Users,
  MessageSquare,
  FileText,
  Star,
  Clock,
  TrendingUp,
  Award,
  Heart,
  Gift,
  Coffee,
  Briefcase
} from "lucide-react";

interface ContactDetailModalProps {
  children: React.ReactNode;
  contact: any;
}

export default function ContactDetailModal({ children, contact }: ContactDetailModalProps) {
  const navigate = useNavigate();

  // Enhanced contact data
  const contactDetails = {
    ...contact,
    fullAddress: "123 Business Ave, Suite 500, New York, NY 10001",
    website: "www.techcorp.com",
    industry: "Technology",
    companySize: "250-500 employees",
    preferredContact: "email",
    timezone: "EST",
    birthday: "March 15th",
    notes: "Prefers morning meetings, interested in tech conferences and corporate retreats",
    tags: ["VIP", "Corporate", "High-Value", "Repeat Customer"]
  };

  const interactionHistory = [
    {
      id: 1,
      date: "2024-01-18",
      time: "14:30",
      type: "call",
      duration: "25 min",
      subject: "Discussed Q2 corporate retreat planning",
      outcome: "Positive - Scheduled venue tour",
      nextAction: "Send venue options email",
      rating: 5
    },
    {
      id: 2,
      date: "2024-01-15",
      time: "10:15",
      type: "email",
      subject: "Venue capacity and pricing inquiry",
      outcome: "Responded with detailed proposal",
      nextAction: "Follow up call scheduled",
      rating: 4
    },
    {
      id: 3,
      date: "2024-01-10",
      time: "16:45",
      type: "meeting",
      duration: "60 min",
      subject: "Site visit and tour",
      outcome: "Very impressed with facilities",
      nextAction: "Prepare formal proposal",
      rating: 5
    },
    {
      id: 4,
      date: "2024-01-05",
      time: "09:20",
      type: "email",
      subject: "Initial event inquiry",
      outcome: "Qualified as serious prospect",
      nextAction: "Schedule discovery call",
      rating: 4
    }
  ];

  const eventHistory = [
    {
      id: 1,
      eventName: "Annual Tech Summit 2023",
      date: "2023-09-15",
      guests: 300,
      revenue: "$68,000",
      satisfaction: 95,
      type: "Corporate Conference"
    },
    {
      id: 2,
      eventName: "Product Launch Event",
      date: "2023-06-20",
      guests: 150,
      revenue: "$42,000",
      satisfaction: 88,
      type: "Product Launch"
    },
    {
      id: 3,
      eventName: "Holiday Party 2022",
      date: "2022-12-10",
      guests: 200,
      revenue: "$35,000",
      satisfaction: 92,
      type: "Corporate Social"
    }
  ];

  const opportunities = [
    {
      id: 1,
      title: "Q2 Corporate Retreat",
      value: "$45,000",
      probability: 75,
      stage: "Proposal",
      expectedCloseDate: "2024-02-15",
      type: "Corporate Event"
    },
    {
      id: 2,
      title: "Summer Team Building",
      value: "$25,000",
      probability: 60,
      stage: "Qualified",
      expectedCloseDate: "2024-03-01",
      type: "Team Building"
    },
    {
      id: 3,
      title: "Annual Awards Ceremony",
      value: "$85,000",
      probability: 40,
      stage: "Discovery",
      expectedCloseDate: "2024-04-30",
      type: "Awards Event"
    }
  ];

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case "call": return <Phone className="h-4 w-4 text-blue-500" />;
      case "email": return <Mail className="h-4 w-4 text-green-500" />;
      case "meeting": return <Users className="h-4 w-4 text-purple-500" />;
      default: return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "Discovery": return "bg-blue-100 text-blue-700";
      case "Qualified": return "bg-yellow-100 text-yellow-700";
      case "Proposal": return "bg-orange-100 text-orange-700";
      case "Negotiation": return "bg-purple-100 text-purple-700";
      case "Won": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const totalRevenue = eventHistory.reduce((sum, event) => sum + parseInt(event.revenue.replace(/[$,]/g, '')), 0);
  const averageSatisfaction = eventHistory.reduce((sum, event) => sum + event.satisfaction, 0) / eventHistory.length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium text-primary">
                {contactDetails.avatar}
              </div>
              <div>
                <span className="text-xl">{contactDetails.name}</span>
                <p className="text-sm text-muted-foreground">{contactDetails.company}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {contactDetails.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="interactions">Interactions</TabsTrigger>
            <TabsTrigger value="history">Event History</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{contactDetails.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{contactDetails.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{contactDetails.company}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{contactDetails.fullAddress}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{contactDetails.industry}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Relationship Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Revenue:</span>
                    <span className="font-medium text-green-600">${totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Events Hosted:</span>
                    <span className="font-medium">{eventHistory.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg. Satisfaction:</span>
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">{averageSatisfaction.toFixed(1)}%</span>
                      <Star className="h-3 w-3 text-yellow-500" />
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Contact:</span>
                    <span className="font-medium">{contactDetails.lastContact}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Customer Since:</span>
                    <span className="font-medium">2022</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button size="sm" className="w-full justify-start">
                    <Phone className="h-4 w-4 mr-2" />
                    Call Contact
                  </Button>
                  <Button size="sm" variant="outline" className="w-full justify-start">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                  <Button size="sm" variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Meeting
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate('/contacts')}
                  >
                    <User className="h-4 w-4 mr-2" />
                    View Full Profile
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Recent Interactions</CardTitle>
                  <CardDescription>Last 3 touchpoints</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {interactionHistory.slice(0, 3).map((interaction) => (
                      <div key={interaction.id} className="flex items-start space-x-3 p-2 rounded-lg bg-muted/20">
                        <div className="mt-1">
                          {getInteractionIcon(interaction.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium capitalize">{interaction.type}</span>
                            <span className="text-xs text-muted-foreground">{interaction.date}</span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{interaction.subject}</p>
                          {interaction.rating && (
                            <div className="flex items-center space-x-1 mt-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-3 w-3 ${i < interaction.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Active Opportunities</CardTitle>
                  <CardDescription>Current sales pipeline</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {opportunities.slice(0, 3).map((opp) => (
                      <div key={opp.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium">{opp.title}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={getStageColor(opp.stage)} variant="outline">
                              {opp.stage}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{opp.probability}%</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-600">{opp.value}</div>
                          <div className="text-xs text-muted-foreground">{opp.expectedCloseDate}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="interactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Interaction History</CardTitle>
                <CardDescription>Complete communication timeline</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {interactionHistory.map((interaction) => (
                      <div key={interaction.id} className="flex items-start space-x-4 p-4 rounded-lg border border-border hover:bg-muted/50">
                        <div className="flex flex-col items-center">
                          {getInteractionIcon(interaction.type)}
                          <div className="text-xs text-muted-foreground mt-1">{interaction.time}</div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{interaction.subject}</h4>
                            <span className="text-sm text-muted-foreground">{interaction.date}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{interaction.outcome}</p>
                          {interaction.nextAction && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Next Action: </span>
                              <span className="font-medium">{interaction.nextAction}</span>
                            </div>
                          )}
                          {interaction.duration && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Duration: {interaction.duration}
                            </div>
                          )}
                          {interaction.rating && (
                            <div className="flex items-center space-x-1 mt-2">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-3 w-3 ${i < interaction.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Event History</CardTitle>
                <CardDescription>Previous events hosted by this contact</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {eventHistory.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{event.eventName}</h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                            <span>{event.date}</span>
                            <span>{event.guests} guests</span>
                            <span>{event.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">{event.revenue}</div>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Star className="h-3 w-3 text-yellow-500" />
                          <span>{event.satisfaction}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sales Opportunities</CardTitle>
                <CardDescription>Current and potential future events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {opportunities.map((opp) => (
                    <div key={opp.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium">{opp.title}</h4>
                          <Badge className={getStageColor(opp.stage)}>{opp.stage}</Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{opp.type}</span>
                          <span>Expected close: {opp.expectedCloseDate}</span>
                          <span>{opp.probability}% probability</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-medium text-green-600">{opp.value}</div>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Communication Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Preferred Method:</span>
                    <Badge variant="outline">{contactDetails.preferredContact}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Timezone:</span>
                    <span className="text-sm font-medium">{contactDetails.timezone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Best Time:</span>
                    <span className="text-sm font-medium">9 AM - 11 AM</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Personal Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Birthday:</span>
                    <span className="text-sm font-medium">{contactDetails.birthday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Company Size:</span>
                    <span className="text-sm font-medium">{contactDetails.companySize}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notes & Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{contactDetails.notes}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
