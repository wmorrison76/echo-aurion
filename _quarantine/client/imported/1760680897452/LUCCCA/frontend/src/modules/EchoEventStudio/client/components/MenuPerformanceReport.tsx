import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Target,
  Star,
  BarChart3,
  FileText,
  Calendar,
  DollarSign,
  Users,
  Award,
  AlertCircle,
  Download
} from "lucide-react";
import {
  MenuRevisionReport,
  MenuItemPerformance,
  CategoryPerformance,
  MenuAnalyticsFilters
} from "../../shared/menu-analytics-types";
import { MenuAnalyticsService } from "../../shared/menu-analytics-service";

interface MenuPerformanceReportProps {
  outletId?: string;
  onClose?: () => void;
}

export default function MenuPerformanceReport({ outletId, onClose }: MenuPerformanceReportProps) {
  const [report, setReport] = useState<MenuRevisionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("6_months");
  const [selectedOutlet, setSelectedOutlet] = useState<string>(outletId || "all");

  useEffect(() => {
    loadMenuPerformanceReport();
  }, [selectedPeriod, selectedOutlet]);

  const loadMenuPerformanceReport = async () => {
    setLoading(true);
    try {
      // Generate mock BEO data for demonstration
      const mockBEOData = generateMockBEOData();
      
      const filters: MenuAnalyticsFilters = {
        outlet_ids: selectedOutlet === "all" ? undefined : [selectedOutlet],
        date_range: {
          start_date: getStartDateForPeriod(selectedPeriod),
          end_date: new Date()
        },
        min_events: 2
      };

      const generatedReport = await MenuAnalyticsService.generateMenuRevisionReport(mockBEOData, filters);
      setReport(generatedReport);
    } catch (error) {
      console.error("Error loading menu performance report:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDateForPeriod = (period: string): Date => {
    const now = new Date();
    switch (period) {
      case "3_months":
        return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      case "6_months":
        return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      case "1_year":
        return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      default:
        return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable': return <Minus className="h-4 w-4 text-gray-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRecommendationColor = (recommendation: string): string => {
    switch (recommendation) {
      case 'keep': return 'bg-green-100 text-green-800 border-green-300';
      case 'promote': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'modify': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'replace': return 'bg-red-100 text-red-800 border-red-300';
      case 'review': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'keep': return <CheckCircle className="h-4 w-4" />;
      case 'promote': return <Star className="h-4 w-4" />;
      case 'modify': return <Target className="h-4 w-4" />;
      case 'replace': return <AlertTriangle className="h-4 w-4" />;
      case 'review': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const generateMockBEOData = () => {
    // This would be replaced with actual data fetching in production
    const mockItems = [
      { id: 'app_001', name: 'Shrimp Cocktail', category: 'appetizer', price: 18 },
      { id: 'app_002', name: 'Caesar Salad', category: 'appetizer', price: 14 },
      { id: 'ent_001', name: 'Grilled Salmon', category: 'entree', price: 32 },
      { id: 'ent_002', name: 'Filet Mignon', category: 'entree', price: 45 },
      { id: 'ent_003', name: 'Chicken Marsala', category: 'entree', price: 28 },
      { id: 'des_001', name: 'Chocolate Mousse', category: 'dessert', price: 12 },
      { id: 'des_002', name: 'Tiramisu', category: 'dessert', price: 14 },
      { id: 'bev_001', name: 'House Wine', category: 'beverage', price: 8 }
    ];

    const mockBEOs = [];
    const startDate = getStartDateForPeriod(selectedPeriod);
    
    for (let i = 0; i < 50; i++) {
      const eventDate = new Date(startDate.getTime() + Math.random() * (Date.now() - startDate.getTime()));
      const guestCount = Math.floor(Math.random() * 200) + 50;
      
      const selectedItems = mockItems
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 6) + 3)
        .map(item => ({
          catalog_item_id: item.id,
          item_name: item.name,
          category: item.category,
          quantity: Math.floor(guestCount * (0.7 + Math.random() * 0.3)),
          unit_price: item.price,
          total_price: Math.floor(guestCount * (0.7 + Math.random() * 0.3)) * item.price
        }));

      mockBEOs.push({
        beo_id: `beo_${i}`,
        event_id: `event_${i}`,
        event_date: eventDate,
        outlet_id: selectedOutlet === "all" ? 
          ['main_dining', 'banquet', 'outdoor'][Math.floor(Math.random() * 3)] : selectedOutlet,
        guest_count: guestCount,
        event_type: ['wedding', 'corporate', 'birthday', 'anniversary'][Math.floor(Math.random() * 4)],
        items: selectedItems,
        season: getSeason(eventDate),
        day_of_week: eventDate.toLocaleDateString('en-US', { weekday: 'long' }),
        is_weekend: eventDate.getDay() === 0 || eventDate.getDay() === 6,
        is_holiday: Math.random() < 0.1,
        total_revenue: selectedItems.reduce((sum, item) => sum + item.total_price, 0),
        revenue_per_guest: selectedItems.reduce((sum, item) => sum + item.total_price, 0) / guestCount,
        created_at: new Date()
      });
    }

    return mockBEOs;
  };

  const getSeason = (date: Date): 'spring' | 'summer' | 'fall' | 'winter' => {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Report</AlertTitle>
        <AlertDescription>
          Unable to generate menu performance report. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Menu Performance Report</h1>
          <p className="text-muted-foreground">
            Analysis for {report.outlet_name || "All Outlets"} • {report.report_period.start_date.toLocaleDateString()} - {report.report_period.end_date.toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3_months">Last 3 Months</SelectItem>
              <SelectItem value="6_months">Last 6 Months</SelectItem>
              <SelectItem value="1_year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outlets</SelectItem>
              <SelectItem value="main_dining">Main Dining Room</SelectItem>
              <SelectItem value="banquet">Banquet Hall</SelectItem>
              <SelectItem value="outdoor">Outdoor Pavilion</SelectItem>
              <SelectItem value="private_dining">Private Dining Room</SelectItem>
              <SelectItem value="bar_lounge">Bar & Lounge</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>

          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Items Analyzed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{report.total_items_analyzed}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{formatCurrency(report.total_revenue_analyzed)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Menu Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Award className={`h-5 w-5 ${report.menu_health_score > 70 ? 'text-green-600' : report.menu_health_score > 50 ? 'text-yellow-600' : 'text-red-600'}`} />
              <span className="text-2xl font-bold">{report.menu_health_score}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Changes Needed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-orange-600" />
              <span className="text-2xl font-bold">{report.recommended_changes_count}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Opportunity Alert */}
      {report.revenue_opportunity > 1000 && (
        <Alert className="border-green-200 bg-green-50">
          <DollarSign className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Revenue Opportunity Identified</AlertTitle>
          <AlertDescription className="text-green-700">
            Potential to increase revenue by <strong>{formatCurrency(report.revenue_opportunity)}</strong> by optimizing underperforming menu items.
          </AlertDescription>
        </Alert>
      )}

      {/* Category Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Category Performance Overview</span>
          </CardTitle>
          <CardDescription>Performance analysis by menu category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.category_performance.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium capitalize">{category.category}</h4>
                    <Badge variant="outline">
                      {category.total_items} items
                    </Badge>
                    <Badge className={
                      category.category_trend === 'growing' ? 'bg-green-100 text-green-700' :
                      category.category_trend === 'declining' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {getTrendIcon(category.category_trend)}
                      <span className="ml-1 capitalize">{category.category_trend}</span>
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Revenue: </span>
                      <span className="font-medium">{formatCurrency(category.total_revenue)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Top Performer: </span>
                      <span className="font-medium">{category.top_performer.item_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg Score: </span>
                      <span className="font-medium">{category.average_performance_score}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{category.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Items to Replace - High Priority */}
      {report.items_to_replace.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <span>Items Recommended for Replacement ({report.items_to_replace.length})</span>
            </CardTitle>
            <CardDescription>These items are consistently underperforming and should be considered for removal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.items_to_replace.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div>
                    <h4 className="font-medium">{item.item_name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>Revenue: {formatCurrency(item.total_revenue)}</span>
                      <span>Orders: {item.total_orders}</span>
                      <span>Score: {item.percentile_score}%</span>
                      {getTrendIcon(item.trend)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.recommendation_reason}</p>
                  </div>
                  <Badge className={getRecommendationColor(item.recommendation)}>
                    {getRecommendationIcon(item.recommendation)}
                    <span className="ml-1 capitalize">{item.recommendation}</span>
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items to Promote - Hidden Gems */}
      {report.items_to_promote.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-700">
              <Star className="h-5 w-5" />
              <span>Items to Promote - Hidden Gems ({report.items_to_promote.length})</span>
            </CardTitle>
            <CardDescription>High-performing items that could benefit from better positioning or marketing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.items_to_promote.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div>
                    <h4 className="font-medium">{item.item_name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>Revenue: {formatCurrency(item.total_revenue)}</span>
                      <span>Orders: {item.total_orders}</span>
                      <span>Score: {item.percentile_score}%</span>
                      {getTrendIcon(item.trend)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.recommendation_reason}</p>
                  </div>
                  <Badge className={getRecommendationColor(item.recommendation)}>
                    {getRecommendationIcon(item.recommendation)}
                    <span className="ml-1 capitalize">{item.recommendation}</span>
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Performers to Keep */}
      {report.items_to_keep.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span>Top Performers - Keep ({report.items_to_keep.length})</span>
            </CardTitle>
            <CardDescription>Best-selling items that should remain featured on the menu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.items_to_keep.slice(0, 10).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <h4 className="font-medium">{item.item_name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>Revenue: {formatCurrency(item.total_revenue)}</span>
                      <span>Orders: {item.total_orders}</span>
                      <span>Score: {item.percentile_score}%</span>
                      {getTrendIcon(item.trend)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.recommendation_reason}</p>
                  </div>
                  <Badge className={getRecommendationColor(item.recommendation)}>
                    {getRecommendationIcon(item.recommendation)}
                    <span className="ml-1 capitalize">{item.recommendation}</span>
                  </Badge>
                </div>
              ))}
              {report.items_to_keep.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  ... and {report.items_to_keep.length - 10} more top performers
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items Needing Modification */}
      {report.items_to_modify.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-yellow-700">
              <Target className="h-5 w-5" />
              <span>Items Needing Attention ({report.items_to_modify.length})</span>
            </CardTitle>
            <CardDescription>Items with potential that need modification or repositioning</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.items_to_modify.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div>
                    <h4 className="font-medium">{item.item_name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>Revenue: {formatCurrency(item.total_revenue)}</span>
                      <span>Orders: {item.total_orders}</span>
                      <span>Score: {item.percentile_score}%</span>
                      {getTrendIcon(item.trend)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.recommendation_reason}</p>
                  </div>
                  <Badge className={getRecommendationColor(item.recommendation)}>
                    {getRecommendationIcon(item.recommendation)}
                    <span className="ml-1 capitalize">{item.recommendation}</span>
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Summary and Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Summary & Next Steps</CardTitle>
          <CardDescription>Key insights and recommended actions for menu optimization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Key Insights</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <span>Top performing category: <strong>{report.top_performing_category}</strong></span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <span>Category needing attention: <strong>{report.worst_performing_category}</strong></span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <span>Menu health score: <strong>{report.menu_health_score}%</strong></span>
                </li>
                {report.revenue_opportunity > 1000 && (
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <span>Revenue opportunity: <strong>{formatCurrency(report.revenue_opportunity)}</strong></span>
                  </li>
                )}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Immediate Actions</h4>
              <ul className="space-y-2 text-sm">
                {report.items_to_replace.length > 0 && (
                  <li className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                    <span>Review {report.items_to_replace.length} underperforming items for removal</span>
                  </li>
                )}
                {report.items_to_promote.length > 0 && (
                  <li className="flex items-start space-x-2">
                    <Star className="h-4 w-4 text-blue-500 mt-0.5" />
                    <span>Feature {report.items_to_promote.length} hidden gems prominently</span>
                  </li>
                )}
                {report.items_to_modify.length > 0 && (
                  <li className="flex items-start space-x-2">
                    <Target className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <span>Modify {report.items_to_modify.length} items with declining performance</span>
                  </li>
                )}
                <li className="flex items-start space-x-2">
                  <Calendar className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Schedule menu review meeting with culinary team</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
