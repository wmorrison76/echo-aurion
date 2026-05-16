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
  Star,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Reply,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  Settings,
  RefreshCw,
  Download,
  Plus,
  Bell,
  Zap,
  Brain,
  Globe,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  BarChart3,
  PieChart,
  LineChart,
  Target,
  Award,
  Users,
  Calendar,
  Filter,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Review,
  ReviewPlatform,
  ReputationMetrics,
  SocialMediaMention,
  defaultResponseTemplates,
  defaultAutomationRules,
} from "@shared/reputation-management-types";

export default function ReputationManagement() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  // Mock reputation metrics - would integrate with review platforms
  const reputationMetrics: ReputationMetrics = {
    propertyId: "property-1",
    period: { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
    overallRating: 4.3,
    totalReviews: 247,
    reviewVolume: 82,
    responseRate: 89,
    averageResponseTime: 4.2,
    ratingDistribution: { 1: 8, 2: 12, 3: 35, 4: 89, 5: 103 },
    platformMetrics: [
      {
        platform: 'tripadvisor',
        averageRating: 4.1,
        totalReviews: 89,
        recentReviews: 15,
        responseRate: 92,
        averageResponseTime: 3.8,
        sentimentScore: 0.72,
        ranking: 3,
        ratingTrend: 'up',
        volumeTrend: 'stable'
      },
      {
        platform: 'google',
        averageRating: 4.4,
        totalReviews: 156,
        recentReviews: 28,
        responseRate: 88,
        averageResponseTime: 4.5,
        sentimentScore: 0.78,
        ratingTrend: 'up',
        volumeTrend: 'up'
      }
    ],
    categoryScores: {
      service: { averageRating: 4.2, totalMentions: 187, sentiment: 0.65, trend: 'improving' },
      cleanliness: { averageRating: 4.5, totalMentions: 203, sentiment: 0.82, trend: 'stable' },
      location: { averageRating: 4.7, totalMentions: 89, sentiment: 0.91, trend: 'stable' },
      value: { averageRating: 3.9, totalMentions: 145, sentiment: 0.45, trend: 'declining' },
      amenities: { averageRating: 4.1, totalMentions: 98, sentiment: 0.58, trend: 'improving' }
    },
    sentimentBreakdown: { positive: 68, negative: 18, neutral: 12, mixed: 2 },
    topCompliments: ["Excellent service", "Beautiful location", "Clean rooms", "Friendly staff"],
    topComplaints: ["Overpriced", "Slow wifi", "Noisy rooms", "Limited parking"],
    trendingTopics: [
      {
        topic: "Pool renovation",
        mentionCount: 23,
        sentimentScore: 0.85,
        trend: 'rising',
        platforms: ['tripadvisor', 'google'],
        impactLevel: 'medium',
        actionRequired: false,
        suggestedActions: []
      }
    ],
    responseMetrics: {
      totalResponses: 220,
      responseRate: 89,
      averageResponseTime: 4.2,
      medianResponseTime: 3.1,
      averageResponseLength: 156,
      personalizationRate: 78,
      responseRateByRating: { 1: 100, 2: 95, 3: 85, 4: 82, 5: 75 },
      staffResponseMetrics: [],
      templateUsage: []
    },
    calculatedAt: new Date()
  };

  const getPlatformIcon = (platform: ReviewPlatform) => {
    switch (platform) {
      case 'tripadvisor': return Globe;
      case 'google': return Globe;
      case 'facebook': return Facebook;
      case 'booking': return Globe;
      case 'expedia': return Globe;
      default: return Globe;
    }
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.6) return 'text-green-600';
    if (sentiment > 0.2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': case 'improving': case 'rising': return TrendingUp;
      case 'down': case 'declining': case 'falling': return TrendingDown;
      default: return BarChart3;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reputation Management</h1>
            <p className="text-muted-foreground">
              Monitor reviews, manage responses, and track sentiment across all platforms
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
              <Brain className="h-4 w-4 mr-2" />
              AI Sentiment Analysis
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Reports
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Reputation Report</DropdownMenuItem>
                <DropdownMenuItem>Sentiment Analysis</DropdownMenuItem>
                <DropdownMenuItem>Response Performance</DropdownMenuItem>
                <DropdownMenuItem>Competitive Analysis</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-panel dark:glass-panel-dark">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overall Rating</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{reputationMetrics.overallRating}</p>
                    <div className="flex items-center">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star 
                          key={i} 
                          className={cn(
                            "h-4 w-4",
                            i < Math.floor(reputationMetrics.overallRating) 
                              ? "fill-yellow-400 text-yellow-400" 
                              : "text-gray-300"
                          )} 
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-green-600">+0.2 from last month</p>
                </div>
                <Star className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel dark:glass-panel-dark">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Reviews</p>
                  <p className="text-2xl font-bold">{reputationMetrics.totalReviews}</p>
                  <p className="text-xs text-blue-600">+{reputationMetrics.reviewVolume} this month</p>
                </div>
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel dark:glass-panel-dark">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Response Rate</p>
                  <p className="text-2xl font-bold">{reputationMetrics.responseRate}%</p>
                  <p className="text-xs text-green-600">Above industry average</p>
                </div>
                <Reply className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel dark:glass-panel-dark">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response Time</p>
                  <p className="text-2xl font-bold">{reputationMetrics.averageResponseTime}h</p>
                  <p className="text-xs text-yellow-600">Target: &lt;4h</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-panel dark:glass-panel-dark">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="tripadvisor">TripAdvisor</SelectItem>
                  <SelectItem value="google">Google Reviews</SelectItem>
                  <SelectItem value="booking">Booking.com</SelectItem>
                  <SelectItem value="expedia">Expedia</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">1 Week</SelectItem>
                  <SelectItem value="month">1 Month</SelectItem>
                  <SelectItem value="quarter">3 Months</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1" />

              <Badge variant="outline" className="bg-green-50 text-green-700">
                Sentiment: {Math.round((reputationMetrics.sentimentBreakdown.positive / 100) * 100)}% Positive
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="reviews">Review Monitor</TabsTrigger>
            <TabsTrigger value="responses">Response Management</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment Analysis</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Platform Performance */}
              <Card className="glass-panel dark:glass-panel-dark">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Platform Performance
                  </CardTitle>
                  <CardDescription>Review performance across platforms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reputationMetrics.platformMetrics.map((platform) => {
                      const PlatformIcon = getPlatformIcon(platform.platform);
                      const TrendIcon = getTrendIcon(platform.ratingTrend);
                      
                      return (
                        <div key={platform.platform} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <PlatformIcon className="h-5 w-5 text-primary" />
                            <div>
                              <div className="font-medium capitalize">{platform.platform}</div>
                              <div className="text-sm text-muted-foreground">
                                {platform.totalReviews} reviews
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-lg font-bold">{platform.averageRating}</div>
                              <div className="text-xs text-muted-foreground">Rating</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold">{platform.responseRate}%</div>
                              <div className="text-xs text-muted-foreground">Response</div>
                            </div>
                            <TrendIcon className={cn(
                              "h-4 w-4",
                              platform.ratingTrend === 'up' ? 'text-green-600' : 
                              platform.ratingTrend === 'down' ? 'text-red-600' : 'text-gray-600'
                            )} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Sentiment Breakdown */}
              <Card className="glass-panel dark:glass-panel-dark">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Sentiment Analysis
                  </CardTitle>
                  <CardDescription>Overall sentiment distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(reputationMetrics.sentimentBreakdown).map(([sentiment, percentage]) => (
                      <div key={sentiment} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{sentiment}</span>
                          <span>{percentage}%</span>
                        </div>
                        <Progress 
                          value={percentage} 
                          className={cn(
                            "h-2",
                            sentiment === 'positive' ? '[&>div]:bg-green-500' :
                            sentiment === 'negative' ? '[&>div]:bg-red-500' :
                            sentiment === 'neutral' ? '[&>div]:bg-gray-500' :
                            '[&>div]:bg-yellow-500'
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Category Performance */}
              <Card className="glass-panel dark:glass-panel-dark">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Category Performance
                  </CardTitle>
                  <CardDescription>Performance by review categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(reputationMetrics.categoryScores).map(([category, data]) => {
                      const TrendIcon = getTrendIcon(data.trend);
                      
                      return (
                        <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium capitalize">{category}</div>
                            <div className="text-sm text-muted-foreground">
                              {data.totalMentions} mentions
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <div className="font-bold">{data.averageRating}</div>
                              <div className="text-xs text-muted-foreground">Rating</div>
                            </div>
                            <div className="text-center">
                              <div className={cn("font-bold", getSentimentColor(data.sentiment))}>
                                {Math.round(data.sentiment * 100)}%
                              </div>
                              <div className="text-xs text-muted-foreground">Sentiment</div>
                            </div>
                            <TrendIcon className={cn(
                              "h-4 w-4",
                              data.trend === 'improving' ? 'text-green-600' : 
                              data.trend === 'declining' ? 'text-red-600' : 'text-gray-600'
                            )} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="glass-panel dark:glass-panel-dark">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest reviews and responses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium">Real-time Review Feed</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Monitor incoming reviews across all platforms
                    </p>
                    <Button size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Feed
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <Card className="glass-panel dark:glass-panel-dark">
              <CardHeader>
                <CardTitle>Review Monitoring</CardTitle>
                <CardDescription>
                  Real-time review feed with AI-powered sentiment analysis and priority scoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium">Review Management Dashboard</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Comprehensive review monitoring and management interface
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Integration with TripAdvisor, Google, Booking.com, Expedia APIs
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="responses">
            <Card className="glass-panel dark:glass-panel-dark">
              <CardHeader>
                <CardTitle>Response Management</CardTitle>
                <CardDescription>
                  Manage review responses with AI-powered templates and sentiment-based suggestions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Reply className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium">Response Management System</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    AI-powered response templates and management tools
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Smart templates, approval workflows, and response analytics
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sentiment">
            <Card className="glass-panel dark:glass-panel-dark">
              <CardHeader>
                <CardTitle>AI Sentiment Analysis</CardTitle>
                <CardDescription>
                  Advanced sentiment analysis with topic modeling and trend detection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium">Sentiment Intelligence</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    AI-powered sentiment analysis and topic extraction
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Integration with AWS Comprehend, Google Cloud Natural Language
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="automation">
            <Card className="glass-panel dark:glass-panel-dark">
              <CardHeader>
                <CardTitle>Automation & Alerts</CardTitle>
                <CardDescription>
                  Automated workflows for review monitoring, response reminders, and escalation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium">Reputation Automation</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Automated workflows for reputation management
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Alert rules, auto-assignment, and escalation workflows
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// TODO: Third-party integration points for Reputation Management:
// 1. Review Platforms: TripAdvisor, Google My Business, Booking.com, Expedia APIs
// 2. Sentiment Analysis: AWS Comprehend, Google Cloud Natural Language, Azure Text Analytics
// 3. Social Media: Twitter API, Facebook Graph API, Instagram Basic Display API
// 4. Review Aggregation: ReviewPro, TrustYou, Revinate APIs
// 5. Notification Services: Twilio (SMS), SendGrid (Email), Slack webhooks
// 6. Analytics: Google Analytics, Mixpanel for review engagement tracking
// 7. Translation: Google Translate API for multi-language reviews
// 8. Image Recognition: Google Vision API for review photo analysis
// 9. Competitor Monitoring: Reputation monitoring services
// 10. CRM Integration: Sync with guest profiles and satisfaction scores
