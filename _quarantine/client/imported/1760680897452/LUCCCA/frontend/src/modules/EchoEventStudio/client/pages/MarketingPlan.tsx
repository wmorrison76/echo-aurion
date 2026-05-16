import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Megaphone,
  Target,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Eye,
  Edit,
  Plus,
  MoreVertical,
  Send,
  FileText,
  BarChart3,
  Zap,
  Heart,
  Share2,
  MessageSquare,
  Globe,
  Mail,
  Instagram,
  Facebook,
  Twitter,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MarketingPlan() {
  const campaigns = [
    {
      id: 1,
      name: "Summer Wedding Package",
      status: "active",
      budget: 15000,
      spent: 8500,
      reach: 25000,
      leads: 47,
      conversions: 12,
      roi: 180,
      endDate: "2024-03-31",
      channels: ["social", "email", "paid-ads"]
    },
    {
      id: 2,
      name: "Corporate Events Q1",
      status: "planning",
      budget: 20000,
      spent: 0,
      reach: 0,
      leads: 0,
      conversions: 0,
      roi: 0,
      endDate: "2024-04-15",
      channels: ["linkedin", "email", "networking"]
    },
    {
      id: 3,
      name: "Holiday Catering Special",
      status: "completed",
      budget: 8000,
      spent: 7800,
      reach: 18000,
      leads: 32,
      conversions: 8,
      roi: 145,
      endDate: "2024-01-15",
      channels: ["social", "website", "referrals"]
    }
  ];

  const marketingMetrics = {
    totalBudget: 50000,
    totalSpent: 25300,
    totalLeads: 156,
    conversionRate: 18.5,
    avgCostPerLead: 162,
    totalROI: 165
  };

  const channelPerformance = [
    { name: "Social Media", leads: 45, cost: 3500, roi: 190 },
    { name: "Email Marketing", leads: 38, cost: 1200, roi: 240 },
    { name: "Paid Advertising", leads: 32, cost: 8500, roi: 150 },
    { name: "Referrals", leads: 28, cost: 500, roi: 320 },
    { name: "Website", leads: 13, cost: 2000, roi: 110 }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Marketing Plan</h1>
            <p className="text-muted-foreground">
              Create and manage marketing campaigns, strategies, and promotional activities
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <FileText className="h-4 w-4 mr-2" />
                  Export Report
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics Dashboard
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
                  <p className="text-sm text-muted-foreground">Total Budget</p>
                  <p className="text-2xl font-bold">${marketingMetrics.totalBudget.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Spent</p>
                  <p className="text-2xl font-bold">${marketingMetrics.totalSpent.toLocaleString()}</p>
                  <Progress value={(marketingMetrics.totalSpent / marketingMetrics.totalBudget) * 100} className="mt-2 h-2" />
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                  <p className="text-2xl font-bold">{marketingMetrics.totalLeads}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold">{marketingMetrics.conversionRate}%</p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cost/Lead</p>
                  <p className="text-2xl font-bold">${marketingMetrics.avgCostPerLead}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total ROI</p>
                  <p className="text-2xl font-bold">{marketingMetrics.totalROI}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList>
            <TabsTrigger value="campaigns">Active Campaigns</TabsTrigger>
            <TabsTrigger value="channels">Channel Performance</TabsTrigger>
            <TabsTrigger value="calendar">Marketing Calendar</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns">
            <div className="grid gap-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{campaign.name}</h3>
                          <Badge 
                            variant={campaign.status === 'active' ? 'default' : 
                                   campaign.status === 'planning' ? 'secondary' : 'outline'}
                          >
                            {campaign.status}
                          </Badge>
                          <div className="flex gap-1">
                            {campaign.channels.map((channel) => (
                              <Badge key={channel} variant="outline" className="text-xs">
                                {channel === 'social' && <Instagram className="h-3 w-3 mr-1" />}
                                {channel === 'email' && <Mail className="h-3 w-3 mr-1" />}
                                {channel === 'linkedin' && <Users className="h-3 w-3 mr-1" />}
                                {channel}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Budget</p>
                            <p className="font-semibold">${campaign.budget.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Spent</p>
                            <p className="font-semibold">${campaign.spent.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Reach</p>
                            <p className="font-semibold">{campaign.reach.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Leads</p>
                            <p className="font-semibold">{campaign.leads}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Conversions</p>
                            <p className="font-semibold">{campaign.conversions}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">ROI</p>
                            <p className={cn("font-semibold", 
                              campaign.roi > 150 ? "text-green-600" : 
                              campaign.roi > 100 ? "text-yellow-600" : "text-red-600"
                            )}>{campaign.roi}%</p>
                          </div>
                        </div>

                        {campaign.status === 'active' && (
                          <div className="mt-4">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Budget Usage</span>
                              <span>{Math.round((campaign.spent / campaign.budget) * 100)}%</span>
                            </div>
                            <Progress value={(campaign.spent / campaign.budget) * 100} className="h-2" />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Send className="h-4 w-4 mr-2" />
                              Launch Campaign
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="h-4 w-4 mr-2" />
                              Generate Report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              Pause Campaign
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

          <TabsContent value="channels">
            <Card>
              <CardHeader>
                <CardTitle>Channel Performance Analysis</CardTitle>
                <CardDescription>Compare performance across different marketing channels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {channelPerformance.map((channel, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          {channel.name === 'Social Media' && <Instagram className="h-5 w-5 text-primary" />}
                          {channel.name === 'Email Marketing' && <Mail className="h-5 w-5 text-primary" />}
                          {channel.name === 'Paid Advertising' && <Megaphone className="h-5 w-5 text-primary" />}
                          {channel.name === 'Referrals' && <Users className="h-5 w-5 text-primary" />}
                          {channel.name === 'Website' && <Globe className="h-5 w-5 text-primary" />}
                        </div>
                        <div>
                          <h4 className="font-medium">{channel.name}</h4>
                          <p className="text-sm text-muted-foreground">${channel.cost.toLocaleString()} spent</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Leads</p>
                          <p className="text-lg font-semibold">{channel.leads}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">ROI</p>
                          <p className={cn("text-lg font-semibold",
                            channel.roi > 200 ? "text-green-600" : 
                            channel.roi > 150 ? "text-yellow-600" : "text-red-600"
                          )}>{channel.roi}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Cost/Lead</p>
                          <p className="text-lg font-semibold">${Math.round(channel.cost / channel.leads)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle>Marketing Calendar</CardTitle>
                <CardDescription>Upcoming campaigns and marketing activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium">Marketing Calendar Coming Soon</h3>
                  <p className="text-sm text-muted-foreground">Plan and schedule your marketing campaigns</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>Marketing Templates</CardTitle>
                <CardDescription>Pre-built templates for campaigns and content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium">Templates Library Coming Soon</h3>
                  <p className="text-sm text-muted-foreground">Access pre-built marketing templates and content</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
