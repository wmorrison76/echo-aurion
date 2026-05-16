import Layout from "@/components/Layout";
import MoveablePanel from "@/components/MoveablePanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Download,
  Upload,
  Plus,
  Edit,
  Calendar,
  BarChart3,
  PieChart,
  FileText,
  Calculator,
  Zap,
} from "lucide-react";
import { useState } from "react";

interface BudgetCategory {
  id: number;
  name: string;
  budgetAmount: number;
  spentAmount: number;
  forecastAmount: number;
  quarter: string;
  department: string;
  subcategories: Array<{
    name: string;
    budget: number;
    spent: number;
    forecast: number;
  }>;
}

interface QuarterlyData {
  quarter: string;
  year: number;
  totalBudget: number;
  totalSpent: number;
  totalForecast: number;
  categories: BudgetCategory[];
  revenue: {
    actual: number;
    budgeted: number;
    forecast: number;
  };
  expenses: {
    actual: number;
    budgeted: number;
    forecast: number;
  };
  profitMargin: number;
}

const sampleQuarterlyData: QuarterlyData[] = [
  {
    quarter: "Q1",
    year: 2024,
    totalBudget: 500000,
    totalSpent: 325000,
    totalForecast: 480000,
    revenue: {
      actual: 750000,
      budgeted: 800000,
      forecast: 780000
    },
    expenses: {
      actual: 325000,
      budgeted: 350000,
      forecast: 340000
    },
    profitMargin: 56.7,
    categories: [
      {
        id: 1,
        name: "Marketing & Advertising",
        budgetAmount: 100000,
        spentAmount: 65000,
        forecastAmount: 95000,
        quarter: "Q1",
        department: "Marketing",
        subcategories: [
          { name: "Digital Marketing", budget: 50000, spent: 32000, forecast: 48000 },
          { name: "Events & Sponsorships", budget: 30000, spent: 18000, forecast: 28000 },
          { name: "Print Advertising", budget: 20000, spent: 15000, forecast: 19000 }
        ]
      },
      {
        id: 2,
        name: "Operations",
        budgetAmount: 150000,
        spentAmount: 120000,
        forecastAmount: 145000,
        quarter: "Q1",
        department: "Operations",
        subcategories: [
          { name: "Facility Maintenance", budget: 60000, spent: 48000, forecast: 58000 },
          { name: "Equipment & Supplies", budget: 50000, spent: 42000, forecast: 47000 },
          { name: "Utilities", budget: 40000, spent: 30000, forecast: 40000 }
        ]
      },
      {
        id: 3,
        name: "Human Resources",
        budgetAmount: 200000,
        spentAmount: 180000,
        forecastAmount: 195000,
        quarter: "Q1",
        department: "HR",
        subcategories: [
          { name: "Salaries & Benefits", budget: 150000, spent: 140000, forecast: 148000 },
          { name: "Training & Development", budget: 30000, spent: 25000, forecast: 28000 },
          { name: "Recruitment", budget: 20000, spent: 15000, forecast: 19000 }
        ]
      },
      {
        id: 4,
        name: "Technology",
        budgetAmount: 50000,
        spentAmount: 35000,
        forecastAmount: 45000,
        quarter: "Q1",
        department: "IT",
        subcategories: [
          { name: "Software Licenses", budget: 25000, spent: 20000, forecast: 24000 },
          { name: "Hardware Upgrades", budget: 15000, spent: 8000, forecast: 12000 },
          { name: "Cloud Services", budget: 10000, spent: 7000, forecast: 9000 }
        ]
      }
    ]
  }
];

export default function QuarterlyBudget() {
  const [selectedQuarter, setSelectedQuarter] = useState("Q1 2024");
  const [activeTab, setActiveTab] = useState("overview");
  const [quarterlyData] = useState<QuarterlyData[]>(sampleQuarterlyData);

  const currentData = quarterlyData[0]; // Using Q1 2024 data

  const calculateUtilization = (spent: number, budget: number) => {
    return budget > 0 ? (spent / budget) * 100 : 0;
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 100) return "text-red-500";
    if (utilization > 90) return "text-yellow-500";
    if (utilization > 70) return "text-green-500";
    return "text-blue-500";
  };

  const getVarianceColor = (actual: number, budget: number) => {
    const variance = ((actual - budget) / budget) * 100;
    if (variance > 10) return "text-red-500";
    if (variance > 0) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quarterly Budget</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive financial planning and budget tracking with forecasting
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger className="w-32 apple-button">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Q1 2024">Q1 2024</SelectItem>
                <SelectItem value="Q2 2024">Q2 2024</SelectItem>
                <SelectItem value="Q3 2024">Q3 2024</SelectItem>
                <SelectItem value="Q4 2024">Q4 2024</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="apple-button">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" className="apple-button">
              <Plus className="h-4 w-4 mr-2" />
              New Budget
            </Button>
          </div>
        </div>

        {/* Key Financial Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Budget</p>
                    <p className="text-2xl font-bold text-foreground">
                      ${(currentData.totalBudget / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-blue-500">Q1 2024 allocation</p>
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
                    <p className="text-sm text-muted-foreground">Spent</p>
                    <p className="text-2xl font-bold text-foreground">
                      ${(currentData.totalSpent / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-green-500">
                      {calculateUtilization(currentData.totalSpent, currentData.totalBudget).toFixed(1)}% utilized
                    </p>
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
                    <p className="text-sm text-muted-foreground">Forecast</p>
                    <p className="text-2xl font-bold text-foreground">
                      ${(currentData.totalForecast / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-yellow-500">Projected spend</p>
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
                    <p className="text-sm text-muted-foreground">Profit Margin</p>
                    <p className="text-2xl font-bold text-foreground">{currentData.profitMargin}%</p>
                    <p className="text-xs text-green-500">Above target</p>
                  </div>
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>
        </div>

        {/* Revenue vs Expenses Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span>Revenue Performance</span>
                </CardTitle>
                <CardDescription>Actual vs Budgeted vs Forecast</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Actual Revenue</span>
                    <span className="font-bold text-green-500">
                      ${currentData.revenue.actual.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Budgeted Revenue</span>
                    <span className="font-medium">
                      ${currentData.revenue.budgeted.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Forecast Revenue</span>
                    <span className="font-medium text-blue-500">
                      ${currentData.revenue.forecast.toLocaleString()}
                    </span>
                  </div>
                </div>
                <Progress 
                  value={calculateUtilization(currentData.revenue.actual, currentData.revenue.budgeted)} 
                  className="h-3" 
                />
                <div className="text-center text-sm text-muted-foreground">
                  {calculateUtilization(currentData.revenue.actual, currentData.revenue.budgeted).toFixed(1)}% of budget achieved
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingDown className="h-5 w-5 text-primary" />
                  <span>Expense Tracking</span>
                </CardTitle>
                <CardDescription>Spending vs Budget allocation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Actual Expenses</span>
                    <span className="font-bold text-red-500">
                      ${currentData.expenses.actual.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Budgeted Expenses</span>
                    <span className="font-medium">
                      ${currentData.expenses.budgeted.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Forecast Expenses</span>
                    <span className="font-medium text-yellow-500">
                      ${currentData.expenses.forecast.toLocaleString()}
                    </span>
                  </div>
                </div>
                <Progress 
                  value={calculateUtilization(currentData.expenses.actual, currentData.expenses.budgeted)} 
                  className="h-3" 
                />
                <div className="text-center text-sm text-muted-foreground">
                  {calculateUtilization(currentData.expenses.actual, currentData.expenses.budgeted).toFixed(1)}% of budget spent
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>
        </div>

        {/* Detailed Budget Categories */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Category Overview</TabsTrigger>
            <TabsTrigger value="details">Detailed Breakdown</TabsTrigger>
            <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {currentData.categories.map((category) => (
                <MoveablePanel key={category.id} className="glass-panel">
                  <Card className="bg-transparent border-none shadow-none">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <Badge variant="outline">{category.department}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-muted-foreground">Budget</p>
                          <p className="font-bold">${(category.budgetAmount / 1000).toFixed(0)}K</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Spent</p>
                          <p className="font-bold text-red-500">${(category.spentAmount / 1000).toFixed(0)}K</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Forecast</p>
                          <p className="font-bold text-blue-500">${(category.forecastAmount / 1000).toFixed(0)}K</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Utilization</span>
                          <span className={getUtilizationColor(calculateUtilization(category.spentAmount, category.budgetAmount))}>
                            {calculateUtilization(category.spentAmount, category.budgetAmount).toFixed(1)}%
                          </span>
                        </div>
                        <Progress 
                          value={calculateUtilization(category.spentAmount, category.budgetAmount)} 
                          className="h-2" 
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Remaining: ${((category.budgetAmount - category.spentAmount) / 1000).toFixed(0)}K
                        </span>
                        <Button size="sm" variant="outline" className="apple-button">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </MoveablePanel>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4 mt-6">
            <div className="space-y-6">
              {currentData.categories.map((category) => (
                <MoveablePanel key={category.id} className="glass-panel">
                  <Card className="bg-transparent border-none shadow-none">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{category.name}</span>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{category.department}</Badge>
                          <span className="text-sm font-medium">
                            ${(category.budgetAmount / 1000).toFixed(0)}K Budget
                          </span>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {category.subcategories.map((subcategory, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium">{subcategory.name}</h4>
                              <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Budget: </span>
                                  <span className="font-medium">${(subcategory.budget / 1000).toFixed(0)}K</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Spent: </span>
                                  <span className="font-medium text-red-500">${(subcategory.spent / 1000).toFixed(0)}K</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Forecast: </span>
                                  <span className="font-medium text-blue-500">${(subcategory.forecast / 1000).toFixed(0)}K</span>
                                </div>
                              </div>
                            </div>
                            <div className="ml-4">
                              <Progress 
                                value={calculateUtilization(subcategory.spent, subcategory.budget)} 
                                className="w-20 h-2" 
                              />
                              <div className="text-xs text-center mt-1">
                                {calculateUtilization(subcategory.spent, subcategory.budget).toFixed(0)}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </MoveablePanel>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="forecasting" className="space-y-4 mt-6">
            <MoveablePanel className="glass-panel">
              <Card className="bg-transparent border-none shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    <span>AI-Powered Budget Forecasting</span>
                  </CardTitle>
                  <CardDescription>
                    Predictive analysis based on historical spending patterns and market trends
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <h3 className="font-semibold text-lg">Q2 2024 Forecast</h3>
                      <p className="text-2xl font-bold text-blue-500 mt-2">$520K</p>
                      <p className="text-sm text-muted-foreground">+4% from Q1</p>
                    </div>
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <h3 className="font-semibold text-lg">Q3 2024 Forecast</h3>
                      <p className="text-2xl font-bold text-green-500 mt-2">$485K</p>
                      <p className="text-sm text-muted-foreground">-6.7% seasonal</p>
                    </div>
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <h3 className="font-semibold text-lg">Q4 2024 Forecast</h3>
                      <p className="text-2xl font-bold text-purple-500 mt-2">$580K</p>
                      <p className="text-sm text-muted-foreground">+19.6% holiday boost</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <Zap className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-700 dark:text-blue-300">AI Insights</span>
                    </div>
                    <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                      <li>• Marketing spend efficiency up 15% - consider increasing digital budget</li>
                      <li>• Operations costs trending 8% below forecast - potential for reinvestment</li>
                      <li>• Q4 seasonal demand suggests 20% increase in event-related expenses</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </MoveablePanel>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MoveablePanel className="glass-panel">
                <Card className="bg-transparent border-none shadow-none">
                  <CardHeader>
                    <CardTitle>Budget Variance Analysis</CardTitle>
                    <CardDescription>Actual vs Budget performance by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {currentData.categories.map((category) => {
                        const variance = ((category.spentAmount - category.budgetAmount) / category.budgetAmount) * 100;
                        return (
                          <div key={category.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                            <span className="font-medium">{category.name}</span>
                            <div className="flex items-center space-x-2">
                              <span className={`font-bold ${getVarianceColor(category.spentAmount, category.budgetAmount)}`}>
                                {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                              </span>
                              {variance > 0 ? (
                                <TrendingUp className="h-4 w-4 text-red-500" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </MoveablePanel>

              <MoveablePanel className="glass-panel">
                <Card className="bg-transparent border-none shadow-none">
                  <CardHeader>
                    <CardTitle>Cost Optimization Opportunities</CardTitle>
                    <CardDescription>AI-identified savings potential</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <h4 className="font-medium text-green-700 dark:text-green-300">Technology Optimization</h4>
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                          Potential savings: $8K by consolidating software licenses
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <h4 className="font-medium text-yellow-700 dark:text-yellow-300">Marketing Efficiency</h4>
                        <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                          Reallocate $12K from print to digital for better ROI
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-medium text-blue-700 dark:text-blue-300">Operations Streamlining</h4>
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                          Energy efficiency upgrades could save $5K quarterly
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </MoveablePanel>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
