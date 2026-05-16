import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Brain,
  Zap,
  TrendingUp,
  Target,
  Users,
  DollarSign,
  Heart,
  Star,
  ChevronRight,
  ChevronDown,
  Settings,
  Play,
  Pause,
  RefreshCw,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  Database,
  Cpu,
  Cloud,
  Shield,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import type {
  AIModel,
  PredictiveAnalytics,
  GuestBehaviorPrediction,
  DemandForecast,
  PersonalizationEngine,
  ModelStatus,
  ModelType,
  AnalyticsType,
} from "@shared/ai-ml-types";

// Mock data for demonstration
const mockAIModels: AIModel[] = [
  {
    id: "1",
    name: "Guest Churn Predictor",
    type: "churn-prevention",
    version: "2.1.0",
    status: "deployed",
    accuracy: 0.847,
    lastTrained: new Date("2024-01-15"),
    trainingDataSize: 15000,
    features: [
      { name: "booking_frequency", type: "numerical", importance: 0.23, source: "reservations", description: "Guest booking frequency over past year" },
      { name: "avg_spending", type: "numerical", importance: 0.19, source: "billing", description: "Average spending per stay" },
      { name: "satisfaction_score", type: "numerical", importance: 0.17, source: "reviews", description: "Average satisfaction score" },
    ],
    hyperparameters: { learning_rate: 0.001, batch_size: 32, epochs: 100 },
    metrics: {
      accuracy: 0.847,
      precision: 0.82,
      recall: 0.89,
      f1Score: 0.855,
      auc: 0.91,
      confidenceInterval: 0.95,
      validationDate: new Date("2024-01-20"),
      testDataSize: 3000,
    },
    deploymentConfig: {
      environment: "production",
      endpoint: "https://api.ai.echocrm.com/v1/churn-prediction",
      scalingConfig: { minInstances: 2, maxInstances: 10, targetUtilization: 70, autoScaling: true },
      monitoringConfig: {
        alertThresholds: [
          { metric: "accuracy", operator: "<", value: 0.8, severity: "high", action: "retrain" },
          { metric: "latency", operator: ">", value: 500, severity: "medium", action: "email" },
        ],
        loggingLevel: "info",
        metricsCollection: true,
        driftDetection: true,
      },
      rollbackConfig: { enabled: true, previousVersions: 3, automaticRollback: true, rollbackTriggers: ["accuracy < 0.7"] },
    },
  },
  {
    id: "2",
    name: "Revenue Optimizer",
    type: "revenue-optimization",
    version: "1.8.2",
    status: "deployed",
    accuracy: 0.923,
    lastTrained: new Date("2024-01-18"),
    trainingDataSize: 25000,
    features: [
      { name: "historical_demand", type: "numerical", importance: 0.31, source: "reservations", description: "Historical demand patterns" },
      { name: "competitor_rates", type: "numerical", importance: 0.28, source: "external", description: "Competitor pricing data" },
      { name: "events_calendar", type: "categorical", importance: 0.21, source: "events", description: "Local events and holidays" },
    ],
    hyperparameters: { learning_rate: 0.01, batch_size: 64, epochs: 150 },
    metrics: {
      accuracy: 0.923,
      precision: 0.91,
      recall: 0.93,
      f1Score: 0.92,
      auc: 0.96,
      mse: 12.5,
      mae: 8.3,
      confidenceInterval: 0.95,
      validationDate: new Date("2024-01-20"),
      testDataSize: 5000,
    },
    deploymentConfig: {
      environment: "production",
      endpoint: "https://api.ai.echocrm.com/v1/revenue-optimization",
      scalingConfig: { minInstances: 3, maxInstances: 15, targetUtilization: 80, autoScaling: true },
      monitoringConfig: {
        alertThresholds: [
          { metric: "mse", operator: ">", value: 20, severity: "high", action: "retrain" },
          { metric: "prediction_volume", operator: ">", value: 1000, severity: "medium", action: "log" },
        ],
        loggingLevel: "info",
        metricsCollection: true,
        driftDetection: true,
      },
      rollbackConfig: { enabled: true, previousVersions: 2, automaticRollback: false, rollbackTriggers: [] },
    },
  },
  {
    id: "3",
    name: "Demand Forecaster",
    type: "demand-forecasting",
    version: "3.0.1",
    status: "training",
    accuracy: 0.0,
    lastTrained: new Date("2024-01-10"),
    trainingDataSize: 18000,
    features: [
      { name: "seasonal_trends", type: "numerical", importance: 0.35, source: "historical", description: "Seasonal booking patterns" },
      { name: "marketing_campaigns", type: "categorical", importance: 0.22, source: "marketing", description: "Active marketing campaigns" },
      { name: "economic_indicators", type: "numerical", importance: 0.18, source: "external", description: "Economic indicators and trends" },
    ],
    hyperparameters: { learning_rate: 0.005, batch_size: 128, epochs: 200 },
    metrics: {
      accuracy: 0.0,
      precision: 0.0,
      recall: 0.0,
      f1Score: 0.0,
      auc: 0.0,
      confidenceInterval: 0.0,
      validationDate: new Date("2024-01-10"),
      testDataSize: 0,
    },
    deploymentConfig: {
      environment: "staging",
      endpoint: "https://api-staging.ai.echocrm.com/v1/demand-forecasting",
      scalingConfig: { minInstances: 1, maxInstances: 5, targetUtilization: 60, autoScaling: false },
      monitoringConfig: {
        alertThresholds: [],
        loggingLevel: "debug",
        metricsCollection: true,
        driftDetection: false,
      },
      rollbackConfig: { enabled: false, previousVersions: 1, automaticRollback: false, rollbackTriggers: [] },
    },
  },
];

const mockPredictiveAnalytics: PredictiveAnalytics[] = [
  {
    id: "1",
    type: "churn-prediction",
    model: mockAIModels[0],
    predictions: [
      {
        id: "pred-1",
        entityId: "guest-001",
        entityType: "guest",
        predictionType: "churn_risk",
        value: 0.73,
        confidence: 0.91,
        probability: 0.73,
        timeframe: { start: new Date(), end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), granularity: "day" },
        factors: [
          { name: "decreased_booking_frequency", importance: 0.31, value: -45, description: "45% decrease in booking frequency" },
          { name: "low_satisfaction_scores", importance: 0.28, value: 3.2, description: "Recent satisfaction score of 3.2/5" },
        ],
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    ],
    insights: [
      {
        id: "insight-1",
        type: "risk",
        title: "High Churn Risk Detected",
        description: "15 guests showing high churn probability this month",
        severity: "high",
        actionable: true,
        recommendations: [
          {
            id: "rec-1",
            title: "Personalized Retention Campaign",
            description: "Launch targeted email campaign with exclusive offers",
            action: { type: "retain", parameters: { campaign_type: "email", discount: 15 }, targetEntity: "high_risk_guests", timeframe: { start: new Date(), end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), granularity: "day" } },
            priority: "high",
            expectedImpact: { metric: "churn_rate", currentValue: 12, projectedValue: 8, confidence: 0.85, timeToRealize: 30 },
            implementation: { steps: [], estimatedEffort: 8, skillsRequired: ["marketing", "data-analysis"], tools: ["email-platform", "crm"] },
            dependencies: [],
          },
        ],
        metrics: [
          { name: "at_risk_guests", value: 15, unit: "count", trend: "increasing", changePercent: 25 },
          { name: "avg_churn_probability", value: 0.68, unit: "probability", trend: "increasing", changePercent: 12 },
        ],
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    ],
    lastUpdate: new Date(),
    nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    confidence: 0.89,
  },
];

const mockGuestBehavior: GuestBehaviorPrediction[] = [
  {
    id: "1",
    guestId: "guest-001",
    predictions: {
      churnRisk: {
        score: 0.73,
        risk: "high",
        factors: [
          { factor: "booking_frequency", impact: -0.31, description: "Decreased booking frequency", weight: 0.4 },
          { factor: "satisfaction", impact: -0.28, description: "Low satisfaction scores", weight: 0.3 },
        ],
        recommendations: [
          { action: "personalized_offer", description: "Send personalized discount offer", expectedEffectiveness: 0.65, cost: 25, priority: 1 },
          { action: "satisfaction_survey", description: "Follow up on satisfaction concerns", expectedEffectiveness: 0.45, cost: 5, priority: 2 },
        ],
        nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      spendingPrediction: {
        predictedAmount: 485.50,
        currency: "USD",
        confidence: 0.82,
        timeframe: { start: new Date(), end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), granularity: "day" },
        spendingCategories: [
          { category: "accommodation", predictedAmount: 320.00, probability: 0.95, trend: "stable" },
          { category: "dining", predictedAmount: 125.50, probability: 0.78, trend: "increasing" },
          { category: "spa", predictedAmount: 40.00, probability: 0.45, trend: "stable" },
        ],
        factors: [
          { factor: "historical_spending", influence: 0.35, description: "Based on historical spending patterns" },
          { factor: "seasonal_trends", influence: 0.25, description: "Seasonal spending variations" },
        ],
      },
      servicePreferences: [
        { service: "spa", preferenceScore: 0.85, confidence: 0.92, reason: "Frequent spa bookings", lastUpdated: new Date() },
        { service: "fine_dining", preferenceScore: 0.72, confidence: 0.88, reason: "Premium restaurant preferences", lastUpdated: new Date() },
        { service: "concierge", preferenceScore: 0.45, confidence: 0.75, reason: "Occasional concierge usage", lastUpdated: new Date() },
      ],
      loyaltyScore: {
        score: 78,
        tier: "gold",
        trend: "increasing",
        factors: [
          { factor: "stay_frequency", contribution: 25, weight: 0.3, description: "Regular stays throughout the year" },
          { factor: "spending_level", contribution: 20, weight: 0.25, description: "Above-average spending per stay" },
          { factor: "engagement", contribution: 18, weight: 0.2, description: "High engagement with hotel services" },
        ],
        nextTierRequirements: [
          { requirement: "additional_stays", current: 8, required: 12, progress: 67 },
          { requirement: "minimum_spending", current: 2400, required: 3000, progress: 80 },
        ],
      },
      nextBookingProbability: {
        probability: 0.67,
        timeframe: { start: new Date(), end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), granularity: "day" },
        factors: [
          { factor: "seasonal_pattern", impact: 0.35, description: "Strong seasonal booking pattern" },
          { factor: "loyalty_tier", impact: 0.28, description: "Gold tier loyalty status" },
        ],
        recommendedActions: [
          { action: "early_bird_offer", description: "Send early booking incentive", expectedLift: 15, cost: 20 },
          { action: "personalized_destination", description: "Suggest preferred destinations", expectedLift: 10, cost: 5 },
        ],
      },
      upsellOpportunities: [
        {
          service: "spa_package",
          probability: 0.78,
          expectedRevenue: 180.00,
          confidence: 0.85,
          reasoning: "High spa preference score and premium spending behavior",
          optimalTiming: { phase: "pre-arrival", specificTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), factors: ["booking_confirmation", "spa_preference"] },
          approach: { channel: "email", message: "Exclusive spa package upgrade available", incentive: { type: "discount", value: 20, description: "20% off spa services" }, expectedConversion: 0.35 },
        },
      ],
    },
    lastUpdated: new Date(),
    modelVersion: "2.1.0",
  },
];

const mockDemandForecast: DemandForecast = {
  id: "1",
  property: "EchoCRM Hotel",
  forecastDate: new Date(),
  horizon: 90,
  granularity: "daily",
  forecasts: [
    {
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      roomType: "standard",
      predictedDemand: 85,
      confidence: 0.91,
      occupancyForecast: 0.78,
      revenueForecast: 12500,
      optimalRate: { rate: 185, currency: "USD", confidence: 0.88, factors: [], priceElasticity: -1.2 },
      recommendations: [
        { type: "pricing", action: "increase_rate", description: "Increase rate by 8% due to high demand", expectedImpact: 950, confidence: 0.82 },
      ],
    },
  ],
  accuracy: { mape: 8.5, rmse: 12.3, mae: 9.1, accuracy: 91.5, lastEvaluated: new Date("2024-01-20"), evaluationPeriod: 30 },
  factors: [
    { factor: "local_events", type: "event-based", impact: 0.35, confidence: 0.92, source: "events_calendar", description: "Major conference in the city" },
    { factor: "seasonal_trend", type: "seasonal", impact: 0.28, confidence: 0.88, source: "historical_data", description: "Peak winter season" },
  ],
  lastUpdated: new Date(),
  nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000),
};

const mockPersonalizationEngine: PersonalizationEngine = {
  id: "1",
  guestId: "guest-001",
  profile: {
    demographics: { ageRange: "35-45", gender: "female", location: "New York", familyStatus: "married_with_children", travelFrequency: "frequent" },
    preferences: {
      roomTypes: ["suite", "ocean_view"],
      amenities: ["spa", "fitness", "pool"],
      services: ["concierge", "room_service", "laundry"],
      dining: { cuisines: ["italian", "seafood"], dietaryRestrictions: ["vegetarian"], mealTimes: ["breakfast", "dinner"], diningStyle: ["fine_dining"], budgetRange: "premium" },
      activities: ["spa", "cultural_tours", "shopping"],
      communication: { channels: ["email", "app"], frequency: "medium", topics: ["offers", "events"], language: "en", timezone: "EST" },
      privacy: { dataSharing: true, marketing: true, analytics: true, thirdParty: false, retention: 24 },
    },
    behaviors: {
      bookingPatterns: [
        { pattern: "advance_planner", frequency: 0.8, seasonality: { pattern: "quarterly", peaks: ["Q1", "Q4"], troughs: ["Q3"] }, leadTime: 45, partySize: 2, stayDuration: 4 },
      ],
      spendingPatterns: [
        { category: "accommodation", averageAmount: 350, frequency: 0.9, trend: "stable", elasticity: 0.3 },
        { category: "spa", averageAmount: 180, frequency: 0.7, trend: "increasing", elasticity: 0.5 },
      ],
      serviceUsage: [
        { service: "spa", frequency: 0.8, satisfaction: 4.6, value: 180, trend: "increasing" },
        { service: "room_service", frequency: 0.4, satisfaction: 4.2, value: 65, trend: "stable" },
      ],
      feedbackPatterns: [
        { channels: ["email", "app"], frequency: 0.6, sentiment: "positive", topics: ["service", "amenities"], responsiveness: 0.8 },
      ],
      digitalEngagement: {
        channels: [
          { channel: "email", frequency: 0.8, engagement: 0.65, conversion: 0.12, preference: 0.9 },
          { channel: "app", frequency: 0.6, engagement: 0.72, conversion: 0.18, preference: 0.8 },
        ],
        devices: [
          { device: "mobile", usage: 0.7, preference: 0.8, capabilities: ["push", "location"] },
          { device: "desktop", usage: 0.3, preference: 0.6, capabilities: ["web", "email"] },
        ],
        contentPreferences: [
          { type: "offers", preference: 0.9, engagement: 0.8, topics: ["spa", "dining"] },
          { type: "events", preference: 0.6, engagement: 0.5, topics: ["cultural", "wellness"] },
        ],
        interactionPatterns: [
          { pattern: "evening_browser", frequency: 0.7, timing: "19:00-21:00", duration: 12 },
        ],
      },
    },
    segments: [
      { id: "seg-1", name: "Premium Family Travelers", description: "High-value families seeking luxury experiences", criteria: [], size: 850, characteristics: ["high_spender", "family_oriented"], behaviors: ["advance_booking", "spa_usage"], preferences: ["premium_rooms", "family_amenities"] },
    ],
    lifetimeValue: 4250,
    engagementScore: 78,
    satisfactionScore: 4.6,
  },
  recommendations: [
    {
      id: "rec-1",
      type: "spa-service",
      title: "Exclusive Spa Package",
      description: "Personalized wellness experience based on your preferences",
      confidence: 0.88,
      relevance: 0.92,
      timing: { phase: "pre-arrival", optimalTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), frequency: 1, duration: 2 },
      content: {
        headline: "Your Perfect Spa Escape Awaits",
        description: "Indulge in our signature wellness treatments, specially curated for you",
        images: ["/spa-image-1.jpg", "/spa-image-2.jpg"],
        callToAction: "Book Your Spa Experience",
        pricing: { price: 180, currency: "USD", discount: 20, originalPrice: 225, paymentOptions: ["card", "room_charge"] },
        benefits: ["Personalized treatments", "Premium products", "Relaxation lounge access"],
        social_proof: { type: "reviews", value: 4.8, description: "4.8/5 stars from 127 guests" },
      },
      tracking: { impressions: 1, clicks: 0, conversions: 0, revenue: 0, ctr: 0, conversion_rate: 0, roi: 0 },
    },
  ],
  content: [],
  offers: [],
  experiences: [],
  lastUpdated: new Date(),
  version: "1.0.0",
};

export default function AIMLEnhancement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("models");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);

  const filteredModels = useMemo(() => {
    return mockAIModels.filter(model => {
      const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          model.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || model.status === filterStatus;
      const matchesType = filterType === "all" || model.type === filterType;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [searchQuery, filterStatus, filterType]);

  const getStatusIcon = (status: ModelStatus) => {
    switch (status) {
      case "deployed": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "training": return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case "testing": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "failed": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "deprecated": return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getModelTypeIcon = (type: ModelType) => {
    switch (type) {
      case "churn-prevention": return <Users className="h-4 w-4" />;
      case "revenue-optimization": return <DollarSign className="h-4 w-4" />;
      case "demand-forecasting": return <TrendingUp className="h-4 w-4" />;
      case "recommendation-engine": return <Heart className="h-4 w-4" />;
      case "sentiment-analysis": return <Star className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              AI/ML Enhancement
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage AI models, predictive analytics, and personalization engines
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="apple-button">
              <BarChart3 className="h-4 w-4 mr-2" />
              Performance
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="apple-button bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  New Model
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New AI Model</DialogTitle>
                  <DialogDescription>
                    Configure a new machine learning model for deployment
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="model-name" className="text-right">Name</Label>
                    <Input id="model-name" placeholder="Model name" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="model-type" className="text-right">Type</Label>
                    <Select>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select model type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="churn-prevention">Churn Prevention</SelectItem>
                        <SelectItem value="revenue-optimization">Revenue Optimization</SelectItem>
                        <SelectItem value="demand-forecasting">Demand Forecasting</SelectItem>
                        <SelectItem value="recommendation-engine">Recommendation Engine</SelectItem>
                        <SelectItem value="sentiment-analysis">Sentiment Analysis</SelectItem>
                        <SelectItem value="personalization">Personalization</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="training-data" className="text-right">Training Data Size</Label>
                    <Input id="training-data" placeholder="10000" type="number" className="col-span-3" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(false)}>Create Model</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-panel">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Models</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">2 deployed, 1 training</p>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Accuracy</p>
                  <p className="text-2xl font-bold">88.5%</p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">+2.3% from last month</p>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Predictions Today</p>
                  <p className="text-2xl font-bold">1,247</p>
                </div>
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">+18% from yesterday</p>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Revenue Impact</p>
                  <p className="text-2xl font-bold">$34.2K</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="deployed">Deployed</SelectItem>
              <SelectItem value="training">Training</SelectItem>
              <SelectItem value="testing">Testing</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="churn-prevention">Churn Prevention</SelectItem>
              <SelectItem value="revenue-optimization">Revenue Optimization</SelectItem>
              <SelectItem value="demand-forecasting">Demand Forecasting</SelectItem>
              <SelectItem value="recommendation-engine">Recommendations</SelectItem>
              <SelectItem value="sentiment-analysis">Sentiment Analysis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="models">AI Models</TabsTrigger>
            <TabsTrigger value="analytics">Predictive Analytics</TabsTrigger>
            <TabsTrigger value="behavior">Guest Behavior</TabsTrigger>
            <TabsTrigger value="forecasting">Demand Forecasting</TabsTrigger>
            <TabsTrigger value="personalization">Personalization</TabsTrigger>
          </TabsList>

          <TabsContent value="models" className="space-y-4">
            <div className="grid grid-cols-1 gap-6">
              {filteredModels.map((model) => (
                <Card key={model.id} className="glass-panel">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getModelTypeIcon(model.type)}
                        <div>
                          <CardTitle className="text-lg">{model.name}</CardTitle>
                          <CardDescription>
                            v{model.version} • {model.type.replace("-", " ")} • {model.trainingDataSize.toLocaleString()} training samples
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(model.status)}
                        <Badge variant={model.status === "deployed" ? "default" : model.status === "training" ? "secondary" : "destructive"}>
                          {model.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Accuracy</p>
                          <div className="flex items-center space-x-2">
                            <Progress value={model.accuracy * 100} className="flex-1" />
                            <span className="text-sm font-medium">{(model.accuracy * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Last Trained</p>
                          <p className="text-sm font-medium">{model.lastTrained.toLocaleDateString()}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Environment</p>
                          <Badge variant="outline">{model.deploymentConfig.environment}</Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Scaling</p>
                          <p className="text-sm font-medium">
                            {model.deploymentConfig.scalingConfig.minInstances}-{model.deploymentConfig.scalingConfig.maxInstances} instances
                          </p>
                        </div>
                      </div>

                      {model.status === "deployed" && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Key Features (Top 3):</p>
                            <div className="space-y-1">
                              {model.features.slice(0, 3).map((feature, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                  <span className="flex items-center space-x-2">
                                    <span className="capitalize">{feature.name.replace(/_/g, ' ')}</span>
                                    <Badge variant="outline" className="text-xs">{feature.type}</Badge>
                                  </span>
                                  <span className="text-muted-foreground">{(feature.importance * 100).toFixed(1)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <Separator />

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Precision</p>
                              <p className="text-lg font-semibold">{(model.metrics.precision * 100).toFixed(1)}%</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Recall</p>
                              <p className="text-lg font-semibold">{(model.metrics.recall * 100).toFixed(1)}%</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">F1 Score</p>
                              <p className="text-lg font-semibold">{(model.metrics.f1Score * 100).toFixed(1)}%</p>
                            </div>
                          </div>
                        </>
                      )}

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <div className={`h-2 w-2 rounded-full ${model.status === "deployed" ? "bg-green-500" : model.status === "training" ? "bg-blue-500" : "bg-red-500"}`} />
                            <span className="text-sm text-muted-foreground capitalize">{model.status}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Endpoint: {model.deploymentConfig.endpoint.split('/').pop()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {model.status === "deployed" && (
                            <Button variant="outline" size="sm" className="apple-button">
                              <Pause className="h-4 w-4 mr-2" />
                              Pause
                            </Button>
                          )}
                          {model.status === "training" && (
                            <Button variant="outline" size="sm" className="apple-button">
                              <Play className="h-4 w-4 mr-2" />
                              Deploy
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="apple-button">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retrain
                          </Button>
                          <Button variant="outline" size="sm" className="apple-button">
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </Button>
                          <Button variant="outline" size="sm" className="apple-button">
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {mockPredictiveAnalytics.map((analytics) => (
              <Card key={analytics.id} className="glass-panel">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg capitalize">{analytics.type.replace("-", " ")} Analytics</CardTitle>
                      <CardDescription>
                        Powered by {analytics.model.name} • Confidence: {(analytics.confidence * 100).toFixed(1)}%
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">Active</Badge>
                      <Button variant="outline" size="sm" className="apple-button">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total Predictions</p>
                        <p className="text-2xl font-bold">{analytics.predictions.length}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Next Update</p>
                        <p className="text-sm font-medium">{analytics.nextUpdate.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Model Accuracy</p>
                        <p className="text-sm font-medium">{(analytics.model.accuracy * 100).toFixed(1)}%</p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-medium mb-3">Recent Insights</h4>
                      <div className="space-y-3">
                        {analytics.insights.map((insight) => (
                          <div key={insight.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Lightbulb className={`h-4 w-4 ${insight.severity === "high" ? "text-red-500" : insight.severity === "medium" ? "text-yellow-500" : "text-green-500"}`} />
                                <h5 className="font-medium">{insight.title}</h5>
                              </div>
                              <Badge variant={insight.severity === "high" ? "destructive" : insight.severity === "medium" ? "secondary" : "default"}>
                                {insight.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                              {insight.metrics.map((metric, index) => (
                                <div key={index} className="flex items-center justify-between">
                                  <span className="text-sm">{metric.name.replace(/_/g, ' ')}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium">{metric.value} {metric.unit}</span>
                                    {metric.changePercent && (
                                      <Badge variant={metric.trend === "increasing" ? "destructive" : "default"} className="text-xs">
                                        {metric.changePercent > 0 ? "+" : ""}{metric.changePercent}%
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {insight.actionable && insight.recommendations.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Recommended Actions:</p>
                                {insight.recommendations.map((rec) => (
                                  <div key={rec.id} className="flex items-center justify-between bg-muted/50 rounded p-2">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{rec.title}</p>
                                      <p className="text-xs text-muted-foreground">{rec.description}</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Badge variant="outline">{rec.priority}</Badge>
                                      <Button variant="outline" size="sm" className="apple-button">
                                        <ChevronRight className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="behavior" className="space-y-4">
            {mockGuestBehavior.map((behavior) => (
              <Card key={behavior.id} className="glass-panel">
                <CardHeader>
                  <CardTitle>Guest Behavior Analysis</CardTitle>
                  <CardDescription>
                    Guest ID: {behavior.guestId} • Model v{behavior.modelVersion}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Churn Risk */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Churn Risk Assessment</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Risk Score</span>
                            <Badge variant={behavior.predictions.churnRisk.risk === "high" ? "destructive" : behavior.predictions.churnRisk.risk === "medium" ? "secondary" : "default"}>
                              {behavior.predictions.churnRisk.risk}
                            </Badge>
                          </div>
                          <Progress value={behavior.predictions.churnRisk.score * 100} className="h-3" />
                          <p className="text-xs text-muted-foreground">{(behavior.predictions.churnRisk.score * 100).toFixed(1)}% probability</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm">Top Risk Factors</p>
                          {behavior.predictions.churnRisk.factors.slice(0, 2).map((factor, index) => (
                            <div key={index} className="text-xs">
                              <span className="text-muted-foreground">{factor.factor.replace(/_/g, ' ')}</span>
                              <span className="float-right">{(Math.abs(factor.impact) * 100).toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm">Recommendations</p>
                          {behavior.predictions.churnRisk.recommendations.slice(0, 2).map((rec, index) => (
                            <div key={index} className="text-xs">
                              <p className="text-muted-foreground">{rec.action.replace(/_/g, ' ')}</p>
                              <p className="text-xs">Effectiveness: {(rec.expectedEffectiveness * 100).toFixed(0)}%</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Spending Prediction */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Spending Prediction</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Predicted Amount</p>
                          <p className="text-2xl font-bold">
                            ${behavior.predictions.spendingPrediction.predictedAmount.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Confidence: {(behavior.predictions.spendingPrediction.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm">Category Breakdown</p>
                          {behavior.predictions.spendingPrediction.spendingCategories.map((category, index) => (
                            <div key={index} className="flex items-center justify-between text-xs">
                              <span className="capitalize">{category.category}</span>
                              <span>${category.predictedAmount.toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm">Key Factors</p>
                          {behavior.predictions.spendingPrediction.factors.map((factor, index) => (
                            <div key={index} className="text-xs">
                              <p className="text-muted-foreground">{factor.factor.replace(/_/g, ' ')}</p>
                              <p>Impact: {(factor.influence * 100).toFixed(0)}%</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Loyalty & Upselling */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Loyalty Score</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Current Score</span>
                            <Badge variant="default">{behavior.predictions.loyaltyScore.tier}</Badge>
                          </div>
                          <Progress value={behavior.predictions.loyaltyScore.score} className="h-3" />
                          <p className="text-xs text-muted-foreground">{behavior.predictions.loyaltyScore.score}/100</p>
                        </div>
                        {behavior.predictions.loyaltyScore.nextTierRequirements && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium">Next Tier Progress</p>
                            {behavior.predictions.loyaltyScore.nextTierRequirements.map((req, index) => (
                              <div key={index} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span>{req.requirement.replace(/_/g, ' ')}</span>
                                  <span>{req.progress}%</span>
                                </div>
                                <Progress value={req.progress} className="h-1" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Upsell Opportunities</h4>
                        {behavior.predictions.upsellOpportunities.map((opportunity, index) => (
                          <div key={index} className="border rounded p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{opportunity.service.replace(/_/g, ' ')}</span>
                              <Badge variant="outline">{(opportunity.probability * 100).toFixed(0)}%</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{opportunity.reasoning}</p>
                            <div className="flex items-center justify-between text-xs">
                              <span>Expected Revenue: ${opportunity.expectedRevenue.toFixed(0)}</span>
                              <span>Timing: {opportunity.optimalTiming.phase}</span>
                            </div>
                            {opportunity.approach.incentive && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Incentive: </span>
                                <span>{opportunity.approach.incentive.description}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="forecasting" className="space-y-4">
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Demand Forecasting</CardTitle>
                    <CardDescription>
                      {mockDemandForecast.horizon}-day forecast for {mockDemandForecast.property}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default">Active</Badge>
                    <Button variant="outline" size="sm" className="apple-button">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Forecast Accuracy</p>
                      <p className="text-2xl font-bold">{mockDemandForecast.accuracy.accuracy}%</p>
                      <p className="text-xs text-muted-foreground">MAPE: {mockDemandForecast.accuracy.mape}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Next Week Demand</p>
                      <p className="text-2xl font-bold">{mockDemandForecast.forecasts[0].predictedDemand}</p>
                      <p className="text-xs text-muted-foreground">Confidence: {(mockDemandForecast.forecasts[0].confidence * 100).toFixed(0)}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Occupancy Forecast</p>
                      <p className="text-2xl font-bold">{(mockDemandForecast.forecasts[0].occupancyForecast * 100).toFixed(0)}%</p>
                      <Progress value={mockDemandForecast.forecasts[0].occupancyForecast * 100} className="h-2 mt-1" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Revenue Forecast</p>
                      <p className="text-2xl font-bold">${(mockDemandForecast.forecasts[0].revenueForecast / 1000).toFixed(1)}K</p>
                      <p className="text-xs text-muted-foreground">Next 7 days</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Key Demand Factors</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {mockDemandForecast.factors.map((factor, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{factor.factor.replace(/_/g, ' ')}</span>
                            <Badge variant="outline">{factor.type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{factor.description}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span>Impact: {(factor.impact * 100).toFixed(0)}%</span>
                            <span>Confidence: {(factor.confidence * 100).toFixed(0)}%</span>
                          </div>
                          <Progress value={factor.impact * 100} className="h-1 mt-1" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Optimal Pricing Recommendations</h4>
                    <div className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Recommended Rate</p>
                          <p className="text-xl font-bold">${mockDemandForecast.forecasts[0].optimalRate.rate}</p>
                          <p className="text-xs text-muted-foreground">
                            Confidence: {(mockDemandForecast.forecasts[0].optimalRate.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Price Elasticity</p>
                          <p className="text-lg font-semibold">{mockDemandForecast.forecasts[0].optimalRate.priceElasticity}</p>
                          <p className="text-xs text-muted-foreground">Demand sensitivity</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Expected Impact</p>
                          <p className="text-lg font-semibold text-green-600">+${mockDemandForecast.forecasts[0].recommendations[0].expectedImpact}</p>
                          <p className="text-xs text-muted-foreground">Daily revenue increase</p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h5 className="text-sm font-medium mb-2">Recommendations</h5>
                        {mockDemandForecast.forecasts[0].recommendations.map((rec, index) => (
                          <div key={index} className="flex items-center justify-between bg-muted/50 rounded p-2">
                            <div>
                              <p className="text-sm font-medium">{rec.action.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-muted-foreground">{rec.description}</p>
                            </div>
                            <Badge variant="outline">{(rec.confidence * 100).toFixed(0)}% confidence</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="personalization" className="space-y-4">
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Personalization Engine</CardTitle>
                    <CardDescription>
                      Guest ID: {mockPersonalizationEngine.guestId} • Profile v{mockPersonalizationEngine.version}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default">Active</Badge>
                    <Button variant="outline" size="sm" className="apple-button">
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Guest Profile Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Lifetime Value</p>
                      <p className="text-xl font-bold">${mockPersonalizationEngine.profile.lifetimeValue.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Engagement Score</p>
                      <p className="text-xl font-bold">{mockPersonalizationEngine.profile.engagementScore}/100</p>
                      <Progress value={mockPersonalizationEngine.profile.engagementScore} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Satisfaction Score</p>
                      <p className="text-xl font-bold">{mockPersonalizationEngine.profile.satisfactionScore}/5</p>
                      <div className="flex">
                        {[1,2,3,4,5].map((star) => (
                          <Star key={star} className={`h-3 w-3 ${star <= Math.floor(mockPersonalizationEngine.profile.satisfactionScore) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Segment</p>
                      <Badge variant="default">{mockPersonalizationEngine.profile.segments[0].name}</Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Demographics & Preferences */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Demographics</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Age Range</span>
                          <span>{mockPersonalizationEngine.profile.demographics.ageRange}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Location</span>
                          <span>{mockPersonalizationEngine.profile.demographics.location}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Family Status</span>
                          <span className="capitalize">{mockPersonalizationEngine.profile.demographics.familyStatus.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Travel Frequency</span>
                          <span className="capitalize">{mockPersonalizationEngine.profile.demographics.travelFrequency}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Service Preferences</h4>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Room Types</p>
                          <div className="flex flex-wrap gap-1">
                            {mockPersonalizationEngine.profile.preferences.roomTypes.map((type, index) => (
                              <Badge key={index} variant="outline" className="text-xs">{type.replace(/_/g, ' ')}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Amenities</p>
                          <div className="flex flex-wrap gap-1">
                            {mockPersonalizationEngine.profile.preferences.amenities.slice(0, 3).map((amenity, index) => (
                              <Badge key={index} variant="outline" className="text-xs">{amenity}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Dining Preferences</p>
                          <div className="flex flex-wrap gap-1">
                            {mockPersonalizationEngine.profile.preferences.dining.cuisines.map((cuisine, index) => (
                              <Badge key={index} variant="outline" className="text-xs">{cuisine}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Personalized Recommendations */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Current Recommendations</h4>
                    {mockPersonalizationEngine.recommendations.map((rec) => (
                      <div key={rec.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h5 className="font-medium">{rec.content.headline}</h5>
                            <p className="text-sm text-muted-foreground mt-1">{rec.content.description}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{(rec.confidence * 100).toFixed(0)}% confidence</Badge>
                            <Badge variant="default">{rec.timing.phase.replace(/-/g, ' ')}</Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Pricing</p>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-semibold">${rec.content.pricing?.price}</span>
                              {rec.content.pricing?.discount && (
                                <Badge variant="destructive" className="text-xs">
                                  {rec.content.pricing.discount}% off
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Relevance</p>
                            <Progress value={rec.relevance * 100} className="h-2" />
                            <p className="text-xs">{(rec.relevance * 100).toFixed(0)}%</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Social Proof</p>
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs">{rec.content.social_proof?.value}/5 ({rec.content.social_proof?.description.split(' ')[2]} guests)</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-medium">Benefits:</p>
                          <div className="flex flex-wrap gap-1">
                            {rec.content.benefits.map((benefit, index) => (
                              <Badge key={index} variant="outline" className="text-xs">{benefit}</Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="text-xs text-muted-foreground">
                            Optimal timing: {rec.timing.optimalTime?.toLocaleDateString()}
                          </div>
                          <Button variant="outline" size="sm" className="apple-button">
                            {rec.content.callToAction}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Digital Engagement Patterns */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Digital Engagement Patterns</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h5 className="text-xs font-medium text-muted-foreground">Channel Performance</h5>
                        {mockPersonalizationEngine.profile.behaviors.digitalEngagement.channels.map((channel, index) => (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="capitalize">{channel.channel}</span>
                              <span>{(channel.conversion * 100).toFixed(1)}% conversion</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <Progress value={channel.frequency * 100} className="h-1" />
                                <span className="text-muted-foreground">Frequency</span>
                              </div>
                              <div>
                                <Progress value={channel.engagement * 100} className="h-1" />
                                <span className="text-muted-foreground">Engagement</span>
                              </div>
                              <div>
                                <Progress value={channel.preference * 100} className="h-1" />
                                <span className="text-muted-foreground">Preference</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3">
                        <h5 className="text-xs font-medium text-muted-foreground">Content Preferences</h5>
                        {mockPersonalizationEngine.profile.behaviors.digitalEngagement.contentPreferences.map((content, index) => (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="capitalize">{content.type}</span>
                              <span>{(content.engagement * 100).toFixed(0)}% engagement</span>
                            </div>
                            <Progress value={content.preference * 100} className="h-1" />
                            <div className="flex flex-wrap gap-1">
                              {content.topics.map((topic, topicIndex) => (
                                <Badge key={topicIndex} variant="outline" className="text-xs">{topic}</Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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
