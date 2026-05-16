/**
 * Enhanced Performance Tracking Dashboard
 *
 * Comprehensive view of employee performance, skills, and AI insights
 * Expanded to all roles: culinary, pastry, banquet servers, captains, food runners, etc.
 */

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  Star,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Brain,
  Calendar,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/glass";

interface EmployeePerformance {
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  overallRating: number;
  attendanceRate: number;
  skills: Array<{
    skillCode: string;
    skillName: string;
    proficiencyLevel: string;
    performanceScore: number;
  }>;
  trend: "improving" | "stable" | "declining";
  readinessScores: {
    currentRole: number;
    promotion: number;
    crossTraining: Record<string, number>;
  };
  aiInsights: {
    workStyle: string;
    bestFitRoles: string[];
    growthPotential: "high" | "medium" | "low";
    riskFactors: string[];
    recommendations: string[];
  };
}

function EnhancedPerformanceDashboard() {
  const [employees, setEmployees] = React.useState<EmployeePerformance[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedDepartment, setSelectedDepartment] = React.useState<string>("all");
  const [selectedRole, setSelectedRole] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedEmployee, setSelectedEmployee] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadPerformanceData();
  }, [selectedDepartment, selectedRole]);

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      // const response = await fetch(`/api/performance/department/${selectedDepartment}`);
      // const data = await response.json();
      // setEmployees(data.data || []);

      // Mock data for now
      setEmployees([]);
    } catch (error) {
      console.error("Error loading performance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesDepartment =
      selectedDepartment === "all" || emp.department === selectedDepartment;
    const matchesRole = selectedRole === "all" || emp.role === selectedRole;
    const matchesSearch =
      searchQuery === "" ||
      emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDepartment && matchesRole && matchesSearch;
  });

  const selectedEmployeeData = selectedEmployee
    ? employees.find((e) => e.employeeId === selectedEmployee)
    : null;

  return (
    <div className="w-full h-full overflow-y-auto p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            Enhanced Performance Tracking
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive employee performance analysis powered by EchoAI^3
          </p>
        </div>
        <Button>
          <Brain className="w-4 h-4 mr-2" />
          AI Analysis
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Search
              </label>
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Department
              </label>
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="culinary">Culinary</SelectItem>
                  <SelectItem value="pastry">Pastry</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="stewards">Stewards</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Role
              </label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="chef">Chef</SelectItem>
                  <SelectItem value="server">Server</SelectItem>
                  <SelectItem value="captain">Captain</SelectItem>
                  <SelectItem value="runner">Food Runner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={loadPerformanceData}
              >
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills">Skills Matrix</TabsTrigger>
          <TabsTrigger value="readiness">Readiness</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          <TabsTrigger value="development">Development</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Total Employees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {employees.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Avg Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {employees.length > 0
                    ? (
                        employees.reduce((sum, e) => sum + e.overallRating, 0) /
                        employees.length
                      ).toFixed(1)
                    : "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  High Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {employees.filter((e) => e.overallRating >= 85).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Needs Development
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {employees.filter((e) => e.overallRating < 70).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Employee Table */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Performance</CardTitle>
              <CardDescription>
                {filteredEmployees.length} employee(s) found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead>Readiness</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow
                      key={employee.employeeId}
                      className="cursor-pointer hover:bg-surface"
                      onClick={() => setSelectedEmployee(employee.employeeId)}
                    >
                      <TableCell className="font-medium">
                        {employee.employeeName}
                      </TableCell>
                      <TableCell>{employee.role}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Star
                            className={cn(
                              "w-4 h-4",
                              employee.overallRating >= 85
                                ? "text-yellow-500 fill-yellow-500"
                                : employee.overallRating >= 70
                                  ? "text-yellow-400"
                                  : "text-muted-foreground",
                            )}
                          />
                          {employee.overallRating.toFixed(1)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {employee.attendanceRate.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        {employee.trend === "improving" ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : employee.trend === "declining" ? (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        ) : (
                          <Target className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            employee.readinessScores.currentRole >= 80
                              ? "default"
                              : "secondary"
                          }
                        >
                          {employee.readinessScores.currentRole}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmployee(employee.employeeId);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Skills Matrix</CardTitle>
              <CardDescription>
                Comprehensive view of all employee skills across the
                organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Skills matrix visualization will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readiness" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Readiness Scores</CardTitle>
              <CardDescription>
                Employee readiness for current role, promotion, and
                cross-training
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Readiness analysis will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-4 mt-4">
          {selectedEmployeeData ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  AI Insights: {selectedEmployeeData.employeeName}
                </CardTitle>
                <CardDescription>Powered by EchoAI^3</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Work Style
                  </h3>
                  <p className="text-muted-foreground">
                    {selectedEmployeeData.aiInsights.workStyle}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Best Fit Roles
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmployeeData.aiInsights.bestFitRoles.map(
                      (role) => (
                        <Badge key={role} variant="outline">
                          {role}
                        </Badge>
                      ),
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Growth Potential
                  </h3>
                  <Badge
                    variant={
                      selectedEmployeeData.aiInsights.growthPotential === "high"
                        ? "default"
                        : selectedEmployeeData.aiInsights.growthPotential ===
                            "medium"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {selectedEmployeeData.aiInsights.growthPotential.toUpperCase()}
                  </Badge>
                </div>
                {selectedEmployeeData.aiInsights.riskFactors.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-destructive mb-2">
                      Risk Factors
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {selectedEmployeeData.aiInsights.riskFactors.map(
                        (risk, idx) => (
                          <li key={idx}>{risk}</li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Recommendations
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {selectedEmployeeData.aiInsights.recommendations.map(
                      (rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ),
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Select an employee to view AI insights
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="development" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Development Plans</CardTitle>
              <CardDescription>
                Track employee development goals and progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Development plans will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EnhancedPerformanceDashboard;
export { EnhancedPerformanceDashboard };
