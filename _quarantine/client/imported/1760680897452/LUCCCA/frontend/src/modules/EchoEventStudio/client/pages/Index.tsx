import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import MoveablePanel from "@/components/MoveablePanel";
import PipelineDetailsModal from "@/components/PipelineDetailsModal";
import PipelineDetailsModalFixed from "@/components/PipelineDetailsModalFixed";
import RevenueDetailsModal from "@/components/RevenueDetailsModal";
import EventsCalendarModal from "@/components/EventsCalendarModal";
import EventDetailModal from "@/components/EventDetailModal";
import ContactDetailModal from "@/components/ContactDetailModal";
import BusinessGapAlertModal from "@/components/BusinessGapAlertModal";
import WeatherTracker from "@/components/WeatherTracker";
import WeatherTrackerSimple from "@/components/WeatherTrackerSimple";
import WeatherRadarMap from "@/components/WeatherRadarMap";
import WeatherNotificationPopup from "@/components/WeatherNotificationPopup";
import { weatherNotificationService, EventWeatherAlert } from "@/lib/weather-notification-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Clock,
  Target,
  Building2,
  Phone,
  Mail,
  MapPin,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  UserPlus,
  Zap,
  PieChart,
  BarChart3,
  Trophy,
  Award,
  TrendingDown,
  CheckCircle,
  XCircle,
  Users2,
  Activity,
  Eye,
  CloudRain
} from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const [weatherAlerts, setWeatherAlerts] = useState<EventWeatherAlert[]>([]);
  const [showWeatherNotifications, setShowWeatherNotifications] = useState(false);

  // Set up weather monitoring for events
  useEffect(() => {
    const setupWeatherMonitoring = async () => {
      try {
        // Add sample events to monitoring
        const sampleEvents = [
          {
            id: '1',
            account_id: 'acc_1',
            name: 'Corporate Leadership Summit',
            status: 'definite' as const,
            start_at: new Date(Date.now() + 15 * 60 * 60 * 1000), // 15 hours from now
            end_at: new Date(Date.now() + 23 * 60 * 60 * 1000),
            timezone: 'America/New_York',
            expected_guests: 250,
            manager_id: 'mgr_1',
            currency: 'USD',
            weather_plan: {
              id: 'wp_1',
              event_id: '1',
              primary_plan: 'hybrid' as const,
              backup_plans: [],
              weather_triggers: [],
              decision_timeline: [],
              last_forecast_check: new Date()
            },
            functions: [],
            line_items: []
          },
          {
            id: '2',
            account_id: 'acc_2',
            name: 'Tech Innovation Conference',
            status: 'definite' as const,
            start_at: new Date(Date.now() + 36 * 60 * 60 * 1000), // 36 hours from now
            end_at: new Date(Date.now() + 42 * 60 * 60 * 1000),
            timezone: 'America/New_York',
            expected_guests: 180,
            manager_id: 'mgr_2',
            currency: 'USD',
            weather_plan: {
              id: 'wp_2',
              event_id: '2',
              primary_plan: 'indoor' as const,
              backup_plans: [],
              weather_triggers: [],
              decision_timeline: [],
              last_forecast_check: new Date()
            },
            functions: [],
            line_items: []
          },
          {
            id: '3',
            account_id: 'acc_3',
            name: 'Wedding Reception',
            status: 'definite' as const,
            start_at: new Date(Date.now() + 60 * 60 * 60 * 1000), // 60 hours from now
            end_at: new Date(Date.now() + 66 * 60 * 60 * 1000),
            timezone: 'America/New_York',
            expected_guests: 120,
            manager_id: 'mgr_3',
            currency: 'USD',
            weather_plan: {
              id: 'wp_3',
              event_id: '3',
              primary_plan: 'outdoor' as const,
              backup_plans: [],
              weather_triggers: [],
              decision_timeline: [],
              last_forecast_check: new Date()
            },
            functions: [],
            line_items: []
          }
        ];

        await weatherNotificationService.addEventsToMonitoring(sampleEvents);

        // Load existing alerts
        const existingAlerts = weatherNotificationService.getActiveAlerts();
        setWeatherAlerts(existingAlerts);

      } catch (error) {
        console.error('Error setting up weather monitoring:', error);
      }
    };

    setupWeatherMonitoring();

    // Subscribe to new weather alerts
    const unsubscribe = weatherNotificationService.subscribe((alert: EventWeatherAlert) => {
      setWeatherAlerts(prev => {
        const existing = prev.find(a => a.id === alert.id);
        if (existing) {
          return prev.map(a => a.id === alert.id ? alert : a);
        }
        return [...prev, alert];
      });
    });

    return unsubscribe;
  }, []);

  // Sample data for the dashboard
  const stats = [
    {
      title: "Total Revenue",
      value: "$2.4M",
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
      description: "vs last month",
    },
    {
      title: "Active Contacts",
      value: "3,247",
      change: "+8.2%",
      trend: "up",
      icon: Users,
      description: "total contacts",
    },
    {
      title: "Events This Month",
      value: "89",
      change: "-2.1%",
      trend: "down",
      icon: Calendar,
      description: "scheduled events",
    },
    {
      title: "Pipeline Value",
      value: "$890K",
      change: "+15.3%",
      trend: "up",
      icon: Target,
      description: "potential revenue",
    },
  ];

  const upcomingEvents = [
    {
      id: 1,
      name: "Corporate Leadership Summit",
      guests: 250,
      date: "2024-01-15",
      time: "09:00 AM",
      status: "confirmed",
      department: "Main Ballroom",
      type: "BEO",
    },
    {
      id: 2,
      name: "Tech Innovation Conference",
      guests: 180,
      date: "2024-01-16",
      time: "2:00 PM",
      status: "in-progress",
      department: "Conference Center",
      type: "REO",
    },
    {
      id: 3,
      name: "Wedding Reception",
      guests: 120,
      date: "2024-01-18",
      time: "6:00 PM",
      status: "pending",
      department: "Garden Pavilion",
      type: "BEO",
    },
  ];

  const recentContacts = [
    {
      id: 1,
      name: "Sarah Johnson",
      company: "TechCorp Inc.",
      email: "sarah@techcorp.com",
      phone: "+1 (555) 123-4567",
      lastContact: "2 hours ago",
      value: "$45,000",
      avatar: "SJ",
    },
    {
      id: 2,
      name: "Michael Chen",
      company: "Global Events Ltd.",
      email: "m.chen@globalevents.com",
      phone: "+1 (555) 987-6543",
      lastContact: "1 day ago",
      value: "$78,000",
      avatar: "MC",
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      company: "Luxury Weddings Co.",
      email: "emily@luxuryweddings.com",
      phone: "+1 (555) 456-7890",
      lastContact: "3 days ago",
      value: "$32,000",
      avatar: "ER",
    },
  ];

  const businessGaps = [
    {
      period: "March 2024",
      gap: "18% below target",
      severity: "high",
      suggestion: "Reach out to Q1 2023 corporate clients",
    },
    {
      period: "June 2024",
      gap: "12% below target",
      severity: "medium",
      suggestion: "Wedding season push for summer bookings",
    },
    {
      period: "November 2024",
      gap: "8% below target",
      severity: "low",
      suggestion: "Holiday party season opportunities",
    },
  ];

  // Sales Pipeline Analytics Data
  const salesPipelineData = {
    stages: [
      { name: "Prospects", count: 47, value: 470000, conversionRate: 21 },
      { name: "Qualified", count: 18, value: 324000, conversionRate: 56 },
      { name: "Proposal", count: 12, value: 288000, conversionRate: 67 },
      { name: "Negotiation", count: 8, value: 240000, conversionRate: 75 },
      { name: "Won", count: 6, value: 180000, conversionRate: 100 },
      { name: "Lost", count: 14, value: 0, conversionRate: 0 }
    ],
    tenThreeOneRatio: {
      currentWeek: {
        prospects: 15,
        target: 15,
        qualified: 4,
        expectedQualified: 3,
        immediateAction: 1,
        expectedAction: 1
      },
      monthlyProgress: {
        totalProspects: 62,
        totalQualified: 18,
        totalImmediate: 6,
        actualRatio: "3.4:1:0.33",
        targetRatio: "10:3:1",
        efficiency: 85
      }
    },
    teamPerformance: [
      {
        name: "William Morrison",
        role: "Sales Agent",
        prospects: 15,
        qualified: 4,
        won: 2,
        lost: 1,
        revenue: 45000,
        commission: 2475,
        efficiency: 87
      },
      {
        name: "Sarah Johnson",
        role: "Sales Agent",
        prospects: 12,
        qualified: 3,
        won: 1,
        lost: 2,
        revenue: 28000,
        commission: 1540,
        efficiency: 72
      },
      {
        name: "Michael Chen",
        role: "Senior Agent",
        prospects: 18,
        qualified: 6,
        won: 3,
        lost: 1,
        revenue: 78000,
        commission: 5460,
        efficiency: 94
      }
    ],
    winLossAnalysis: {
      thisMonth: {
        won: 6,
        lost: 4,
        winRate: 60,
        avgDealSize: 30000,
        totalRevenue: 180000
      },
      lastMonth: {
        won: 4,
        lost: 6,
        winRate: 40,
        avgDealSize: 22000,
        totalRevenue: 88000
      },
      trends: {
        winRateChange: 20,
        dealSizeChange: 36,
        revenueChange: 104
      }
    },
    longTermGoals: {
      currentRegularClients: 28,
      targetRegularClients: 40,
      idealTarget: 80,
      contractClients: 12,
      retention: 87,
      monthsToTarget: 8
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Welcome back! Here's what's happening with your hospitality business.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <WeatherRadarMap>
              <Button
                variant="outline"
                size="sm"
                className="apple-button border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <CloudRain className="h-4 w-4 mr-2 text-blue-600" />
                Weather Radar
              </Button>
            </WeatherRadarMap>
            {weatherAlerts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="apple-button border-orange-200 text-orange-700 hover:bg-orange-50"
                onClick={() => setShowWeatherNotifications(true)}
              >
                <AlertTriangle className="h-4 w-4 mr-2 text-orange-600 animate-pulse" />
                {weatherAlerts.length} Weather Alert{weatherAlerts.length > 1 ? 's' : ''}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="apple-button"
              onClick={() => navigate('/calendar')}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              View Calendar
            </Button>
            <Button
              size="sm"
              className="apple-button bg-primary hover:bg-primary/90"
              onClick={() => navigate('/contacts')}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const StatCard = (
              <MoveablePanel key={index} className="glass-panel">
                <Card className="bg-transparent border-none shadow-none hover:shadow-lg transition-all duration-200 cursor-pointer hover:bg-muted/10">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                      {stat.trend === "up" ? (
                        <ArrowUpRight className="h-3 w-3 text-hospitality-green" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-destructive" />
                      )}
                      <span
                        className={
                          stat.trend === "up" ? "text-hospitality-green" : "text-destructive"
                        }
                      >
                        {stat.change}
                      </span>
                      <span>{stat.description}</span>
                    </div>
                  </CardContent>
                </Card>
              </MoveablePanel>
            );

            // Wrap specific cards with their respective modal components
            if (stat.title === "Pipeline Value") {
              return (
                <PipelineDetailsModalFixed key={index} pipelineData={salesPipelineData}>
                  {StatCard}
                </PipelineDetailsModalFixed>
              );
            }

            if (stat.title === "Total Revenue") {
              return (
                <RevenueDetailsModal key={index}>
                  {StatCard}
                </RevenueDetailsModal>
              );
            }

            if (stat.title === "Events This Month") {
              return (
                <EventsCalendarModal key={index}>
                  {StatCard}
                </EventsCalendarModal>
              );
            }

            if (stat.title === "Active Contacts") {
              return (
                <div key={index} onClick={() => navigate('/contacts')}>
                  {StatCard}
                </div>
              );
            }

            return StatCard;
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Events */}
          <MoveablePanel className="lg:col-span-2 glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span>Upcoming Events</span>
                </CardTitle>
                <CardDescription>
                  Events scheduled for the next 7 days across all departments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <EventDetailModal key={event.id} event={event}>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/50 hover:bg-muted/30 transition-all duration-200 cursor-pointer hover:shadow-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">{event.name}</h4>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center">
                                <Users className="h-3 w-3 mr-1" />
                                {event.guests} guests
                              </span>
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {event.time}
                              </span>
                              <span className="flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                {event.department}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge
                            variant="outline"
                            className={
                              event.type === "BEO"
                                ? "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
                                : "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200"
                            }
                          >
                            {event.type}
                          </Badge>
                          <Badge
                            variant={
                              event.status === "confirmed"
                                ? "default"
                                : event.status === "in-progress"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {event.status}
                          </Badge>
                        </div>
                      </div>
                    </EventDetailModal>
                  ))}
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          {/* Recent Contacts */}
          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>Recent Contacts</span>
                </CardTitle>
                <CardDescription>Latest customer interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentContacts.map((contact) => (
                    <ContactDetailModal key={contact.id} contact={contact}>
                      <div className="group flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/20 transition-all duration-200 cursor-pointer border border-transparent hover:border-border hover:shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                          {contact.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {contact.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.company}
                          </p>
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                            <span>{contact.lastContact}</span>
                            <span>•</span>
                            <span className="text-hospitality-green font-medium">
                              {contact.value}
                            </span>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </ContactDetailModal>
                  ))}
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>
        </div>

        {/* Business Intelligence & Predictions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Forecast */}
          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span>18-Month Revenue Forecast</span>
                </CardTitle>
                <CardDescription>
                  AI-powered predictions based on historical data and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current Quarter</span>
                    <span className="text-sm font-medium text-hospitality-green">
                      $2.4M (Target: $2.2M)
                    </span>
                  </div>
                  <Progress value={109} className="h-2" />
                  
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Next Quarter</span>
                      <span className="font-medium">$2.8M projected</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">6 Months</span>
                      <span className="font-medium">$5.2M projected</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">12 Months</span>
                      <span className="font-medium">$9.8M projected</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          {/* Business Gaps Alert */}
          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span>Business Gap Alerts</span>
                </CardTitle>
                <CardDescription>
                  Periods requiring attention to meet revenue targets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {businessGaps.map((gap, index) => (
                    <BusinessGapAlertModal key={index} gapAlert={gap}>
                      <div className="flex items-start space-x-3 p-3 rounded-lg border border-border/50 bg-muted/10 hover:bg-muted/20 transition-all duration-200 cursor-pointer hover:shadow-sm">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${
                            gap.severity === "high"
                              ? "bg-destructive"
                              : gap.severity === "medium"
                              ? "bg-amber-500"
                              : "bg-hospitality-green"
                          }`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">
                              {gap.period}
                            </span>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant="outline"
                                className={
                                  gap.severity === "high"
                                    ? "border-destructive text-destructive"
                                    : gap.severity === "medium"
                                    ? "border-amber-500 text-amber-600"
                                    : "border-hospitality-green text-hospitality-green"
                                }
                              >
                                {gap.gap}
                              </Badge>
                              <BarChart3 className="h-4 w-4 text-muted-foreground opacity-60" />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{gap.suggestion}</p>
                          <p className="text-xs text-primary mt-1 font-medium">Click to view trends and historical clients →</p>
                        </div>
                      </div>
                    </BusinessGapAlertModal>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4 apple-button">
                  <Zap className="h-4 w-4 mr-2" />
                  AI Recommendations
                </Button>
              </CardContent>
            </Card>
          </MoveablePanel>
        </div>
      </div>

      {/* Weather Notification Popup */}
      <WeatherNotificationPopup
        isOpen={showWeatherNotifications}
        onClose={() => setShowWeatherNotifications(false)}
      />
    </Layout>
  );
}
