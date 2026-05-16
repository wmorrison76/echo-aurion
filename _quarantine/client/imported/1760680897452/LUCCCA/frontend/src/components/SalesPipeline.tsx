import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SalesPipeline from "@/components/SalesPipeline";
import DailyTodos from "@/components/DailyTodos";
import LeadQualification from "@/components/LeadQualification";
import EmailIntegration from "@/components/EmailIntegration";
import FollowUpAutomation from "@/components/FollowUpAutomation";
import CustomerLifecycle from "@/components/CustomerLifecycle";
import AISalesAssistant from "@/components/AISalesAssistant";
import { useState } from "react";
import {
  TrendingUp,
  Users,
  Target,
  Mail,
  Bot,
  Zap,
  Heart,
  Clock,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Star,
  Award,
} from "lucide-react";

export default function SalesPipelinePage() {
  const [activeTab, setActiveTab] = useState("pipeline");

  // Mock metrics for the overview
  const metrics = {
    totalDeals: 45,
    pipelineValue: 2850000,
    avgDealSize: 63333,
    conversionRate: 24,
    activeLeads: 87,
    qualifiedLeads: 34,
    hotLeads: 12,
    automationRules: 8,
    emailsSent: 342,
    retentionRate: 84,
    lifetimeValue: 78000,
    touchpoints: 156
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sales Management</h1>
            <p className="text-muted-foreground mt-2">
              Complete sales pipeline, lead management, and customer lifecycle platform
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <AISalesAssistant 
              eventContext={{
                type: 'corporate',
                guestCount: 150,
                budget: 75000
              }}
              userLevel="experienced"
            />
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300">
              <CheckCircle className="h-3 w-3 mr-1" />
              All Systems Active
            </Badge>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-panel">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pipeline Value</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${(metrics.pipelineValue / 1000000).toFixed(1)}M
                  </p>
                </div>
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Deals</p>
                  <p className="text-2xl font-bold text-foreground">{metrics.totalDeals}</p>
                </div>
                <Target className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Hot Leads</p>
                  <p className="text-2xl font-bold text-red-500">{metrics.hotLeads}</p>
                </div>
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold text-green-500">{metrics.conversionRate}%</p>
                </div>
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="pipeline" className="flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="todos" className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Daily Todos
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Automation
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center">
              <Heart className="h-4 w-4 mr-2" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center">
              <Bot className="h-4 w-4 mr-2" />
              AI Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-6">
            <SalesPipeline />
          </TabsContent>

          <TabsContent value="leads" className="mt-6">
            <LeadQualification />
          </TabsContent>

          <TabsContent value="todos" className="mt-6">
            <DailyTodos />
          </TabsContent>

          <TabsContent value="email" className="mt-6">
            <EmailIntegration />
          </TabsContent>

          <TabsContent value="automation" className="mt-6">
            <FollowUpAutomation />
          </TabsContent>

          <TabsContent value="customers" className="mt-6">
            <CustomerLifecycle />
          </TabsContent>

          <TabsContent value="ai" className="mt-6">
            <div className="space-y-6">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bot className="h-6 w-6 mr-2 text-blue-500" />
                    AI Sales Assistant Hub
                  </CardTitle>
                  <CardDescription>
                    Access all AI-powered sales tools and insights from one central location
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                          <Target className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="font-medium">Objection Handling</h3>
                          <p className="text-xs text-muted-foreground">AI-powered responses</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Get intelligent responses to common sales objections with empathy and follow-up strategies.
                      </p>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <h3 className="font-medium">Sales Guidance</h3>
                          <p className="text-xs text-muted-foreground">Strategic recommendations</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Receive AI-driven recommendations based on your current sales situation and client behavior.
                      </p>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                          <Star className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                          <h3 className="font-medium">Event Enhancement</h3>
                          <p className="text-xs text-muted-foreground">Personalization suggestions</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Get AI suggestions to enhance events and create memorable experiences for clients.
                      </p>
                    </Card>
                  </div>

                  <div className="flex justify-center pt-4">
                    <AISalesAssistant 
                      eventContext={{
                        type: 'corporate',
                        guestCount: 200,
                        budget: 85000,
                        venue: 'Grand Ballroom',
                        clientIndustry: 'technology'
                      }}
                      userLevel="experienced"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* AI Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle className="text-lg">AI Objection Success</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-500 mb-2">87%</div>
                    <p className="text-sm text-muted-foreground">
                      Success rate for AI-generated objection responses
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle className="text-lg">Time Saved</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-500 mb-2">2.5h</div>
                    <p className="text-sm text-muted-foreground">
                      Average time saved per sales rep per day
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle className="text-lg">Revenue Impact</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-500 mb-2">+24%</div>
                    <p className="text-sm text-muted-foreground">
                      Increase in deal closure rate with AI assistance
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
