import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Calendar,
  Users,
  DollarSign,
  Building2,
  Phone,
  Mail,
  Clock,
  Target,
  BarChart3,
  LineChart,
  PieChart,
  ArrowRight,
  CheckCircle,
  XCircle,
  Zap
} from "lucide-react";

interface BusinessGapAlertModalProps {
  children: React.ReactNode;
  gapAlert: any;
}

export default function BusinessGapAlertModal({ children, gapAlert }: BusinessGapAlertModalProps) {
  const [selectedYear, setSelectedYear] = useState("2023");
  
  // Generate historical data for the specific period
  const getHistoricalData = () => {
    const month = gapAlert.period.split(' ')[0];
    const year = parseInt(gapAlert.period.split(' ')[1]);
    
    return {
      currentPeriod: {
        month,
        year,
        target: 180000,
        actual: 148000,
        gap: -32000,
        gapPercentage: -18
      },
      historicalTrend: [
        { year: year - 3, revenue: 165000, target: 150000, events: 12 },
        { year: year - 2, revenue: 172000, target: 160000, events: 14 },
        { year: year - 1, revenue: 185000, target: 170000, events: 16 },
        { year: year, revenue: 148000, target: 180000, events: 10 }
      ],
      monthlyPattern: [
        { month: 'Jan', avg: 180000, current: 165000, difference: -15000 },
        { month: 'Feb', avg: 175000, current: 158000, difference: -17000 },
        { month: 'Mar', avg: 190000, current: 148000, difference: -42000 },
        { month: 'Apr', avg: 195000, current: 0, difference: 0 },
        { month: 'May', avg: 200000, current: 0, difference: 0 },
        { month: 'Jun', avg: 210000, current: 0, difference: 0 }
      ],
      competitorAnalysis: {
        marketShare: 68,
        lostToCompetitors: 15,
        newCompetitors: 3,
        priceAdvantage: -8
      }
    };
  };

  const historicalData = getHistoricalData();

  // Historical clients for the same period
  const historicalClients = [
    {
      id: 1,
      name: "TechCorp Industries",
      lastEventDate: "March 2023",
      eventType: "Annual Conference",
      revenue: "$45,000",
      guests: 250,
      status: "not-booked",
      contactPerson: "Sarah Johnson",
      phone: "+1 (555) 123-4567",
      email: "sarah@techcorp.com",
      lastContact: "6 months ago",
      probability: 65,
      notes: "Interested in similar event for 2024, waiting for budget approval"
    },
    {
      id: 2,
      name: "Global Solutions Ltd",
      lastEventDate: "March 2022",
      eventType: "Product Launch",
      revenue: "$32,000",
      guests: 180,
      status: "considering",
      contactPerson: "Michael Chen",
      phone: "+1 (555) 987-6543",
      email: "m.chen@globalsolutions.com",
      lastContact: "2 weeks ago",
      probability: 40,
      notes: "Exploring venue options, competitor pricing is concerning"
    },
    {
      id: 3,
      name: "Innovation Partners",
      lastEventDate: "March 2023",
      eventType: "Team Retreat",
      revenue: "$28,000",
      guests: 120,
      status: "lost-to-competitor",
      contactPerson: "Emily Rodriguez",
      phone: "+1 (555) 456-7890",
      email: "emily@innovationpartners.com",
      lastContact: "3 months ago",
      probability: 0,
      notes: "Chose competitor due to 15% lower pricing"
    },
    {
      id: 4,
      name: "Premier Consulting",
      lastEventDate: "March 2022",
      eventType: "Client Appreciation",
      revenue: "$22,000",
      guests: 100,
      status: "not-contacted",
      contactPerson: "David Wilson",
      phone: "+1 (555) 321-0987",
      email: "dwilson@premierconsulting.com",
      lastContact: "8 months ago",
      probability: 75,
      notes: "Strong previous relationship, no outreach yet this year"
    },
    {
      id: 5,
      name: "Excellence Corp",
      lastEventDate: "March 2023",
      eventType: "Training Workshop",
      revenue: "$38,000",
      guests: 200,
      status: "warm-lead",
      contactPerson: "Lisa Anderson",
      phone: "+1 (555) 654-3210",
      email: "lisa@excellencecorp.com",
      lastContact: "1 week ago",
      probability: 80,
      notes: "Very interested, requesting detailed proposal"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "not-booked": return "bg-red-100 text-red-700 border-red-200";
      case "considering": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "warm-lead": return "bg-green-100 text-green-700 border-green-200";
      case "lost-to-competitor": return "bg-gray-100 text-gray-700 border-gray-200";
      case "not-contacted": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "not-booked": return <XCircle className="h-4 w-4" />;
      case "considering": return <Clock className="h-4 w-4" />;
      case "warm-lead": return <CheckCircle className="h-4 w-4" />;
      case "lost-to-competitor": return <TrendingDown className="h-4 w-4" />;
      case "not-contacted": return <Mail className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "text-red-600";
      case "medium": return "text-yellow-600";
      case "low": return "text-green-600";
      default: return "text-gray-600";
    }
  };

  const totalHistoricalRevenue = historicalClients.reduce((sum, client) => 
    sum + parseInt(client.revenue.replace(/[$,]/g, '')), 0
  );

  const potentialRecovery = historicalClients
    .filter(client => client.status !== "lost-to-competitor")
    .reduce((sum, client) => sum + parseInt(client.revenue.replace(/[$,]/g, '')), 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className={`h-5 w-5 ${getSeverityColor(gapAlert.severity)}`} />
              <span>Business Gap Analysis - {gapAlert.period}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className={
                gapAlert.severity === "high" 
                  ? "border-red-500 text-red-600"
                  : gapAlert.severity === "medium"
                  ? "border-yellow-500 text-yellow-600"
                  : "border-green-500 text-green-600"
              }>
                {gapAlert.severity.toUpperCase()} PRIORITY
              </Badge>
              <Badge variant="outline">
                {gapAlert.gap}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Historical Trends</TabsTrigger>
            <TabsTrigger value="clients">Historical Clients</TabsTrigger>
            <TabsTrigger value="opportunities">Recovery Plan</TabsTrigger>
            <TabsTrigger value="actions">Action Items</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Current Gap</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    ${Math.abs(historicalData.currentPeriod.gap).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Below target</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Target Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${historicalData.currentPeriod.target.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Monthly goal</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Actual Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${historicalData.currentPeriod.actual.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Current performance</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Recovery Potential</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${potentialRecovery.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">From historical clients</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Monthly Performance vs Target</CardTitle>
                  <CardDescription>Current year progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {historicalData.monthlyPattern.slice(0, 4).map((month) => (
                      <div key={month.month} className="flex items-center space-x-4">
                        <div className="w-12 text-sm font-medium">{month.month}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">
                              ${month.current > 0 ? month.current.toLocaleString() : 'Projected'}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Target: ${month.avg.toLocaleString()}
                            </span>
                          </div>
                          <Progress 
                            value={month.current > 0 ? Math.min((month.current / month.avg) * 100, 100) : 0} 
                            className="h-2" 
                          />
                          {month.difference !== 0 && (
                            <div className={`text-xs mt-1 ${month.difference < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {month.difference < 0 ? '' : '+'}{month.difference.toLocaleString()} vs target
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
                  <CardTitle className="text-sm">4-Year Trend Analysis</CardTitle>
                  <CardDescription>Revenue pattern for {gapAlert.period.split(' ')[0]}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {historicalData.historicalTrend.map((year, index) => (
                      <div key={year.year} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {year.year}
                          </div>
                          <div>
                            <div className="text-sm font-medium">${year.revenue.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">{year.events} events</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm ${year.revenue >= year.target ? 'text-green-600' : 'text-red-600'}`}>
                            {year.revenue >= year.target ? '+' : ''}
                            {((year.revenue - year.target) / year.target * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">vs ${year.target.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Root Cause Analysis</CardTitle>
                <CardDescription>Factors contributing to the revenue gap</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg border border-border">
                    <div className="text-2xl font-bold text-red-600">{historicalData.competitorAnalysis.lostToCompetitors}%</div>
                    <div className="text-sm text-muted-foreground">Lost to Competitors</div>
                  </div>
                  <div className="text-center p-4 rounded-lg border border-border">
                    <div className="text-2xl font-bold text-yellow-600">{historicalData.competitorAnalysis.newCompetitors}</div>
                    <div className="text-sm text-muted-foreground">New Competitors</div>
                  </div>
                  <div className="text-center p-4 rounded-lg border border-border">
                    <div className="text-2xl font-bold text-red-600">{Math.abs(historicalData.competitorAnalysis.priceAdvantage)}%</div>
                    <div className="text-sm text-muted-foreground">Price Disadvantage</div>
                  </div>
                  <div className="text-center p-4 rounded-lg border border-border">
                    <div className="text-2xl font-bold text-blue-600">{historicalData.competitorAnalysis.marketShare}%</div>
                    <div className="text-sm text-muted-foreground">Market Share</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Revenue Trends & Patterns</h3>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                  <SelectItem value="2021">2021</SelectItem>
                  <SelectItem value="2020">2020</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <LineChart className="h-4 w-4" />
                    <span>Year-over-Year Comparison</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {historicalData.historicalTrend.map((year) => (
                      <div key={year.year} className="flex items-center space-x-4">
                        <div className="w-16 text-sm font-medium">{year.year}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">${year.revenue.toLocaleString()}</span>
                            <span className="text-sm text-muted-foreground">{year.events} events</span>
                          </div>
                          <Progress value={(year.revenue / 200000) * 100} className="h-2" />
                        </div>
                        <div className={`text-sm ${year.revenue >= year.target ? 'text-green-600' : 'text-red-600'}`}>
                          {((year.revenue - year.target) / year.target * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Monthly Patterns</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {historicalData.monthlyPattern.map((month) => (
                      <div key={month.month} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium w-8">{month.month}</span>
                          <div>
                            <div className="text-sm">Avg: ${month.avg.toLocaleString()}</div>
                            {month.current > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Current: ${month.current.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                        {month.difference !== 0 && (
                          <div className={`text-sm ${month.difference < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {month.difference < 0 ? '' : '+'}{month.difference.toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Trend Insights & Predictions</CardTitle>
                <CardDescription>AI-powered analysis of revenue patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-start space-x-2">
                      <TrendingDown className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Declining Trend Detected</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Revenue for {gapAlert.period.split(' ')[0]} has declined 12% over the past 2 years, 
                          primarily due to increased competition and price pressure.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                    <div className="flex items-start space-x-2">
                      <Target className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-900">Recovery Opportunity</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          Historical client base shows ${totalHistoricalRevenue.toLocaleString()} in past revenue. 
                          Targeted outreach could recover 60-70% of this business.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-start space-x-2">
                      <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-900">Positive Indicators</h4>
                        <p className="text-sm text-green-700 mt-1">
                          Market demand remains strong. Three major prospects are in advanced discussions, 
                          representing potential ${potentialRecovery.toLocaleString()} in recovery revenue.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Historical Clients - {gapAlert.period.split(' ')[0]} Events</h3>
                <p className="text-sm text-muted-foreground">
                  Clients who hosted events in {gapAlert.period.split(' ')[0]} during previous years
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {historicalClients.length} Total Clients
                </Badge>
                <Badge variant="outline">
                  ${totalHistoricalRevenue.toLocaleString()} Historical Revenue
                </Badge>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Client Status Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  {[
                    { status: "not-contacted", count: historicalClients.filter(c => c.status === "not-contacted").length, label: "Not Contacted" },
                    { status: "warm-lead", count: historicalClients.filter(c => c.status === "warm-lead").length, label: "Warm Leads" },
                    { status: "considering", count: historicalClients.filter(c => c.status === "considering").length, label: "Considering" },
                    { status: "not-booked", count: historicalClients.filter(c => c.status === "not-booked").length, label: "Not Booked" },
                    { status: "lost-to-competitor", count: historicalClients.filter(c => c.status === "lost-to-competitor").length, label: "Lost" }
                  ].map((item) => (
                    <div key={item.status} className="text-center p-3 rounded-lg border border-border">
                      <div className="text-2xl font-bold">{item.count}</div>
                      <div className="text-sm text-muted-foreground">{item.label}</div>
                    </div>
                  ))}
                </div>

                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {historicalClients.map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium">{client.name}</h4>
                              <Badge className={getStatusColor(client.status)} variant="outline">
                                {client.status.replace('-', ' ')}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                              <div>
                                <span>Last Event: {client.lastEventDate}</span>
                                <span className="block">{client.eventType} • {client.guests} guests</span>
                              </div>
                              <div>
                                <span>Contact: {client.contactPerson}</span>
                                <span className="block">Last contact: {client.lastContact}</span>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">{client.notes}</p>
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <div className="font-medium text-green-600">{client.revenue}</div>
                          {client.probability > 0 && (
                            <div className="text-sm text-muted-foreground">{client.probability}% probability</div>
                          )}
                          <div className="flex space-x-1">
                            <Button size="sm" variant="outline">
                              <Phone className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Mail className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Recovery Plan</CardTitle>
                <CardDescription>Strategic approach to close the ${Math.abs(historicalData.currentPeriod.gap).toLocaleString()} gap</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                      ${historicalClients.filter(c => c.probability >= 70).reduce((sum, c) => sum + parseInt(c.revenue.replace(/[$,]/g, '')), 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-green-700">High Probability</div>
                    <div className="text-xs text-muted-foreground">70%+ chance</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                    <div className="text-2xl font-bold text-yellow-600">
                      ${historicalClients.filter(c => c.probability >= 40 && c.probability < 70).reduce((sum, c) => sum + parseInt(c.revenue.replace(/[$,]/g, '')), 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-yellow-700">Medium Probability</div>
                    <div className="text-xs text-muted-foreground">40-70% chance</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">
                      ${historicalClients.filter(c => c.probability > 0 && c.probability < 40).reduce((sum, c) => sum + parseInt(c.revenue.replace(/[$,]/g, '')), 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-blue-700">Low Probability</div>
                    <div className="text-xs text-muted-foreground">Under 40% chance</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Recommended Actions by Priority:</h4>
                  
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-green-600">Immediate Actions (1-2 weeks)</h5>
                        <Badge className="bg-green-100 text-green-700">High Impact</Badge>
                      </div>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Contact Excellence Corp (80% probability) - requesting proposal</li>
                        <li>• Follow up with Premier Consulting (75% probability) - no contact in 8 months</li>
                        <li>• Immediate outreach to 2 "not-contacted" high-value clients</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-yellow-600">Short-term Actions (2-4 weeks)</h5>
                        <Badge className="bg-yellow-100 text-yellow-700">Medium Impact</Badge>
                      </div>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Re-engage TechCorp Industries with competitive pricing</li>
                        <li>• Address pricing concerns with Global Solutions Ltd</li>
                        <li>• Develop special promotions for March bookings</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-blue-600">Long-term Strategy (1-3 months)</h5>
                        <Badge className="bg-blue-100 text-blue-700">Strategic</Badge>
                      </div>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Competitive pricing analysis and adjustment</li>
                        <li>• Enhanced value proposition development</li>
                        <li>• Client retention program implementation</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>AI-Generated Action Plan</span>
                </CardTitle>
                <CardDescription>Specific steps to address the {gapAlert.period} revenue gap</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      priority: "HIGH",
                      action: "Contact Excellence Corp immediately",
                      reason: "80% probability, actively requesting proposal",
                      impact: "$38,000 potential revenue",
                      timeline: "This week",
                      assignee: "William Morrison"
                    },
                    {
                      priority: "HIGH", 
                      action: "Re-engage Premier Consulting",
                      reason: "Strong relationship, no recent contact",
                      impact: "$22,000 potential revenue",
                      timeline: "This week",
                      assignee: "Sarah Johnson"
                    },
                    {
                      priority: "MEDIUM",
                      action: "Competitive pricing analysis",
                      reason: "Lost business due to pricing disadvantage",
                      impact: "Long-term revenue protection",
                      timeline: "2 weeks",
                      assignee: "Revenue Team"
                    },
                    {
                      priority: "MEDIUM",
                      action: "March promotion campaign",
                      reason: "Historical slow period, need demand stimulus",
                      impact: "10-15% booking increase",
                      timeline: "2 weeks",
                      assignee: "Marketing Team"
                    },
                    {
                      priority: "LOW",
                      action: "Client retention program",
                      reason: "Prevent future client loss to competitors",
                      impact: "Improved repeat business",
                      timeline: "1 month",
                      assignee: "Customer Success"
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-muted/50">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant={
                            item.priority === "HIGH" ? "destructive" :
                            item.priority === "MEDIUM" ? "default" : "secondary"
                          }>
                            {item.priority}
                          </Badge>
                          <h4 className="font-medium">{item.action}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{item.reason}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Impact: {item.impact}</span>
                          <span>Timeline: {item.timeline}</span>
                          <span>Assignee: {item.assignee}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          Assign
                        </Button>
                        <Button size="sm">
                          Start
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h4 className="font-medium text-primary mb-2">Success Metrics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Target Recovery:</span>
                      <div className="font-medium">${Math.abs(historicalData.currentPeriod.gap).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Timeline:</span>
                      <div className="font-medium">4-6 weeks</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Success Rate:</span>
                      <div className="font-medium">65-75%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
