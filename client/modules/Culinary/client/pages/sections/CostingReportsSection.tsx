import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import { Download, MoreVertical, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "./saas/shared";
import {
  generateCostingReport,
  analyzeVariance,
  analyzeMenuProfit,
  analyzeSupplierCosts,
} from "@/lib/costing-reports";

export default function CostingReportsSection() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<"costing" | "variance" | "profit" | "supplier">(
    "costing",
  );
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [isGenerating, setIsGenerating] = useState(false);

  const getPeriodDates = () => {
    const now = Date.now();
    const days = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "1y": 365,
    }[period];

    return {
      startDate: now - days * 24 * 60 * 60 * 1000,
      endDate: now,
    };
  };

  const dates = useMemo(() => getPeriodDates(), [period]);

  const generateReport = async () => {
    setIsGenerating(true);

    try {
      let data;

      switch (reportType) {
        case "costing":
          data = await generateCostingReport("org-001", dates.startDate, dates.endDate);
          break;
        case "variance":
          data = await analyzeVariance("org-001", dates.startDate, dates.endDate);
          break;
        case "profit":
          data = await analyzeMenuProfit("org-001", dates.startDate, dates.endDate);
          break;
        case "supplier":
          data = await analyzeSupplierCosts("org-001", dates.startDate, dates.endDate);
          break;
      }

      toast({
        title: "Report Generated",
        description: `${reportType} report ready for download`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Costing & Variance Reports</h1>
        <p className="text-sm text-muted-foreground">
          Generate comprehensive reports on recipe costs, margins, and profitability
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="costing">Costing Report</SelectItem>
                  <SelectItem value="variance">Variance Analysis</SelectItem>
                  <SelectItem value="profit">Profit Analysis</SelectItem>
                  <SelectItem value="supplier">Supplier Costs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Period</label>
              <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={generateReport} disabled={isGenerating} className="w-full gap-1">
                {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isGenerating ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Recipes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground mt-1">Tracked recipes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">62%</div>
            <p className="text-xs text-muted-foreground mt-1">Profit margin</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              On Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground mt-1">recipes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">4.2%</div>
              <TrendingDown className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Avg variance</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recipes by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recipe Status</CardTitle>
            <CardDescription>Margin achievement</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "On Target", value: 18 },
                    { name: "Above Target", value: 4 },
                    { name: "Below Target", value: 2 },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#3b82f6" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Variance Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost Variance Trend</CardTitle>
            <CardDescription>Over selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={[
                { date: "1", variance: 3.2 },
                { date: "7", variance: 4.1 },
                { date: "14", variance: 3.8 },
                { date: "21", variance: 4.5 },
                { date: "30", variance: 4.2 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="variance" stroke="#8b5cf6" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recipes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recipe Performance</CardTitle>
          <CardDescription>Current costing and margin analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipe</TableHead>
                  <TableHead>Avg Cost</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Pan-Seared Scallops</TableCell>
                  <TableCell>${(46.34).toFixed(2)}</TableCell>
                  <TableCell>${(65.0).toFixed(2)}</TableCell>
                  <TableCell>28.7%</TableCell>
                  <TableCell>30%</TableCell>
                  <TableCell>
                    <Badge variant="outline">Below Target</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Herb-Roasted Chicken</TableCell>
                  <TableCell>${(39.22).toFixed(2)}</TableCell>
                  <TableCell>${(32.0).toFixed(2)}</TableCell>
                  <TableCell>22.4%</TableCell>
                  <TableCell>30%</TableCell>
                  <TableCell>
                    <Badge variant="destructive">Below Target</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Grilled Vegetables</TableCell>
                  <TableCell>${(8.5).toFixed(2)}</TableCell>
                  <TableCell>${(18.0).toFixed(2)}</TableCell>
                  <TableCell>52.8%</TableCell>
                  <TableCell>50%</TableCell>
                  <TableCell>
                    <Badge className="bg-green-600">On Target</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full gap-2 justify-start">
            <Download className="h-4 w-4" />
            Export as PDF
          </Button>
          <Button variant="outline" className="w-full gap-2 justify-start">
            <Download className="h-4 w-4" />
            Export as Excel
          </Button>
          <Button variant="outline" className="w-full gap-2 justify-start">
            <Download className="h-4 w-4" />
            Email Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
