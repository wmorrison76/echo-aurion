import { useState, useMemo, useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// Removed drag-and-drop for now - can be added back with proper dependency
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Share,
  Save,
  Eye,
  Settings,
  Trash2,
  Edit,
  Copy,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Table as TableIcon,
  Image,
  Type,
  Grid,
  Layout as LayoutIcon,
  Palette,
  Clock,
  Mail,
  Users,
  Database,
  ChevronRight,
  ChevronDown,
  Move,
  GripVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Link2,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Zap,
  Target,
  TrendingUp,
  Award,
  Star,
  DollarSign,
  Percent,
  Calendar as CalendarIcon,
  Hash,
  Globe,
} from "lucide-react";
import type {
  Report,
  ReportSection,
  ReportTemplate,
  ReportParameter,
  ReportSchedule,
  ReportStatus,
  ReportType,
  SectionType,
} from "@shared/dashboard-analytics-types";

// Mock data for demonstration
const mockReports: Report[] = [
  {
    id: "1",
    name: "Monthly Revenue Report",
    description: "Comprehensive monthly revenue analysis with trends and forecasts",
    type: "financial",
    template: {
      sections: [],
      styling: {
        theme: "professional",
        colors: { primary: "#10b981", secondary: "#3b82f6", accent: "#f59e0b", background: "#ffffff", text: "#1f2937", border: "#e5e7eb" },
        fonts: {
          heading: { family: "Inter", size: 24, weight: "600", lineHeight: 1.2 },
          body: { family: "Inter", size: 14, weight: "400", lineHeight: 1.5 },
          caption: { family: "Inter", size: 12, weight: "400", lineHeight: 1.4 },
        },
        spacing: { section: 24, paragraph: 16, line: 8 },
      },
      header: { enabled: true, title: "Monthly Revenue Report", date: true, pageNumbers: true },
      footer: { enabled: true, pageNumbers: true, disclaimer: "Confidential - Internal Use Only" },
      layout: { orientation: "portrait", size: "letter", margins: { top: 72, right: 72, bottom: 72, left: 72 }, columns: 1 },
    },
    parameters: [],
    schedule: { enabled: true, frequency: "monthly", time: "09:00", timezone: "UTC", dates: [1] },
    distribution: {
      channels: [{ type: "email", configuration: {} }],
      recipients: [{ type: "email", value: "management@hotel.com", permissions: ["view"] }],
      formats: ["pdf"],
      settings: { compression: false, encryption: false, retentionDays: 365 },
    },
    lastGenerated: new Date("2024-01-20"),
    status: "published",
    owner: "William Morrison",
    tags: ["financial", "monthly", "revenue"],
  },
  {
    id: "2",
    name: "Guest Satisfaction Dashboard",
    description: "Weekly guest satisfaction metrics and trends",
    type: "guest-analytics",
    template: {
      sections: [],
      styling: {
        theme: "modern",
        colors: { primary: "#3b82f6", secondary: "#10b981", accent: "#f59e0b", background: "#ffffff", text: "#1f2937", border: "#e5e7eb" },
        fonts: {
          heading: { family: "Inter", size: 20, weight: "600", lineHeight: 1.2 },
          body: { family: "Inter", size: 13, weight: "400", lineHeight: 1.5 },
          caption: { family: "Inter", size: 11, weight: "400", lineHeight: 1.4 },
        },
        spacing: { section: 20, paragraph: 14, line: 6 },
      },
      header: { enabled: true, title: "Guest Satisfaction Report", date: true, pageNumbers: false },
      footer: { enabled: false, pageNumbers: false },
      layout: { orientation: "landscape", size: "letter", margins: { top: 48, right: 48, bottom: 48, left: 48 }, columns: 2 },
    },
    parameters: [],
    schedule: { enabled: false, frequency: "weekly", time: "08:00", timezone: "UTC" },
    distribution: {
      channels: [{ type: "email", configuration: {} }],
      recipients: [{ type: "role", value: "management", permissions: ["view"] }],
      formats: ["pdf", "html"],
      settings: { compression: false, encryption: false, retentionDays: 90 },
    },
    status: "draft",
    owner: "William Morrison",
    tags: ["guest", "satisfaction", "weekly"],
  },
  {
    id: "3",
    name: "Executive Summary",
    description: "High-level executive summary for board meetings",
    type: "custom",
    template: {
      sections: [],
      styling: {
        theme: "executive",
        colors: { primary: "#1f2937", secondary: "#374151", accent: "#10b981", background: "#ffffff", text: "#111827", border: "#d1d5db" },
        fonts: {
          heading: { family: "Times New Roman", size: 28, weight: "700", lineHeight: 1.1 },
          body: { family: "Times New Roman", size: 16, weight: "400", lineHeight: 1.6 },
          caption: { family: "Times New Roman", size: 14, weight: "400", lineHeight: 1.4 },
        },
        spacing: { section: 32, paragraph: 20, line: 10 },
      },
      header: { enabled: true, logo: "/logo.png", title: "Executive Summary", subtitle: "Board Meeting Report", date: true, pageNumbers: true },
      footer: { enabled: true, text: "EchoCRM Hospitality Management", pageNumbers: true, disclaimer: "Confidential" },
      layout: { orientation: "portrait", size: "letter", margins: { top: 96, right: 96, bottom: 96, left: 96 }, columns: 1 },
    },
    parameters: [],
    schedule: { enabled: true, frequency: "quarterly", time: "06:00", timezone: "UTC" },
    distribution: {
      channels: [{ type: "email", configuration: {} }],
      recipients: [{ type: "role", value: "executive", permissions: ["view"] }],
      formats: ["pdf"],
      settings: { compression: false, encryption: true, password: "protected", retentionDays: 1095 },
    },
    status: "published",
    owner: "William Morrison",
    tags: ["executive", "board", "quarterly"],
  },
];

const sectionTypes: { type: SectionType; name: string; icon: any; description: string }[] = [
  { type: "summary", name: "Summary", icon: FileText, description: "Executive summary or overview text" },
  { type: "chart", name: "Chart", icon: BarChart3, description: "Bar charts, line charts, and visualizations" },
  { type: "table", name: "Table", icon: TableIcon, description: "Data tables with sorting and filtering" },
  { type: "metrics", name: "Metrics", icon: Target, description: "KPI metrics and performance indicators" },
  { type: "text", name: "Text", icon: Type, description: "Rich text content and paragraphs" },
  { type: "image", name: "Image", icon: Image, description: "Images, logos, and visual content" },
  { type: "page-break", name: "Page Break", icon: Grid, description: "Page break for print formatting" },
];

const chartTypes = [
  { value: "bar", label: "Bar Chart", icon: BarChart3 },
  { value: "line", label: "Line Chart", icon: LineChart },
  { value: "pie", label: "Pie Chart", icon: PieChart },
  { value: "area", label: "Area Chart", icon: BarChart3 },
  { value: "scatter", label: "Scatter Plot", icon: BarChart3 },
];

const dataSources = [
  { id: "reservations", name: "Reservations", description: "Booking and reservation data" },
  { id: "revenue", name: "Revenue", description: "Financial and revenue metrics" },
  { id: "guests", name: "Guest Profiles", description: "Customer and guest information" },
  { id: "reviews", name: "Reviews", description: "Guest feedback and ratings" },
  { id: "staff", name: "Staff Performance", description: "Employee performance metrics" },
  { id: "marketing", name: "Marketing", description: "Campaign and marketing data" },
];

const themes = [
  { value: "professional", label: "Professional", colors: { primary: "#10b981", secondary: "#3b82f6" } },
  { value: "modern", label: "Modern", colors: { primary: "#3b82f6", secondary: "#10b981" } },
  { value: "executive", label: "Executive", colors: { primary: "#1f2937", secondary: "#374151" } },
  { value: "minimal", label: "Minimal", colors: { primary: "#6b7280", secondary: "#9ca3af" } },
  { value: "colorful", label: "Colorful", colors: { primary: "#f59e0b", secondary: "#ef4444" } },
];

export default function ReportBuilder() {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [activeTab, setActiveTab] = useState("reports");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [currentSections, setCurrentSections] = useState<ReportSection[]>([]);
  const [previewMode, setPreviewMode] = useState(false);

  // Report Builder State
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportType, setReportType] = useState<ReportType>("custom");
  const [selectedTheme, setSelectedTheme] = useState("professional");

  const filteredReports = useMemo(() => {
    return mockReports.filter(report => {
      const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          report.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || report.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [searchQuery, filterType]);

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case "published": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "draft": return <Edit className="h-4 w-4 text-yellow-500" />;
      case "generating": return <PlayCircle className="h-4 w-4 text-blue-500" />;
      case "failed": return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case "published": return "bg-green-50 text-green-700 border-green-200";
      case "draft": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "generating": return "bg-blue-50 text-blue-700 border-blue-200";
      case "failed": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // Simplified section reordering without drag-and-drop for now

  const addSection = useCallback((type: SectionType) => {
    const newSection: ReportSection = {
      id: `section-${Date.now()}`,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Section`,
      type,
      content: {
        data: null,
        template: "",
        configuration: {},
      },
    };
    setCurrentSections(prev => [...prev, newSection]);
  }, []);

  const removeSection = useCallback((sectionId: string) => {
    setCurrentSections(prev => prev.filter(section => section.id !== sectionId));
  }, []);

  const updateSection = useCallback((sectionId: string, updates: Partial<ReportSection>) => {
    setCurrentSections(prev => prev.map(section => 
      section.id === sectionId ? { ...section, ...updates } : section
    ));
  }, []);

  const createNewReport = () => {
    setReportName("");
    setReportDescription("");
    setReportType("custom");
    setSelectedTheme("professional");
    setCurrentSections([]);
    setIsBuilderOpen(true);
    setIsCreateDialogOpen(false);
  };

  const editReport = (report: Report) => {
    setSelectedReport(report);
    setReportName(report.name);
    setReportDescription(report.description);
    setReportType(report.type);
    setCurrentSections(report.template.sections);
    setIsBuilderOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Report Builder
            </h1>
            <p className="text-muted-foreground mt-2">
              Create custom reports with drag-and-drop components and automated distribution
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="apple-button">
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="apple-button bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  New Report
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Report</DialogTitle>
                  <DialogDescription>
                    Start building a custom report from scratch
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Report Name</Label>
                    <Input
                      id="name"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="Monthly Revenue Report"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Brief description of the report..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Report Type</Label>
                    <Select value={reportType} onValueChange={(value: ReportType) => setReportType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="financial">Financial</SelectItem>
                        <SelectItem value="operational">Operational</SelectItem>
                        <SelectItem value="guest-analytics">Guest Analytics</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="staff-performance">Staff Performance</SelectItem>
                        <SelectItem value="compliance">Compliance</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createNewReport}>Create Report</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!isBuilderOpen ? (
          /* Reports List View */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="reports">My Reports</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="reports" className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Report Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="guest-analytics">Guest Analytics</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reports Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReports.map((report) => (
                  <Card key={report.id} className="glass-panel hover:shadow-lg transition-all duration-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(report.status)}
                          <CardTitle className="text-lg">{report.name}</CardTitle>
                        </div>
                        <Badge variant="outline" className={getStatusColor(report.status)}>
                          {report.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">{report.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {report.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Type</p>
                            <p className="font-medium capitalize">{report.type.replace("-", " ")}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Owner</p>
                            <p className="font-medium">{report.owner}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Schedule</p>
                            <p className="font-medium capitalize">
                              {report.schedule.enabled ? report.schedule.frequency : "Manual"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Last Generated</p>
                            <p className="font-medium">
                              {report.lastGenerated ? report.lastGenerated.toLocaleDateString() : "Never"}
                            </p>
                          </div>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" className="apple-button">
                              <Eye className="h-3 w-3 mr-1" />
                              Preview
                            </Button>
                            <Button variant="outline" size="sm" className="apple-button">
                              <Download className="h-3 w-3 mr-1" />
                              Export
                            </Button>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button variant="outline" size="sm" onClick={() => editReport(report)} className="apple-button">
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" className="apple-button">
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="sm" className="apple-button text-red-600 hover:text-red-700">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="scheduled" className="space-y-6">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle>Scheduled Reports</CardTitle>
                  <CardDescription>Automated report generation and distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report Name</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Next Run</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockReports.filter(r => r.schedule.enabled).map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{report.name}</TableCell>
                          <TableCell className="capitalize">{report.schedule.frequency}</TableCell>
                          <TableCell>
                            {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{report.distribution.recipients.length} recipients</TableCell>
                          <TableCell>
                            <Badge variant="default">Active</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm" className="apple-button">
                                <PlayCircle className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm" className="apple-button">
                                <PauseCircle className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm" className="apple-button">
                                <Settings className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Template Cards */}
                <Card className="glass-panel border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6 text-center">
                    <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Financial Performance</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Comprehensive financial reporting template with revenue, expenses, and profitability metrics
                    </p>
                    <Button variant="outline" className="apple-button">
                      Use Template
                    </Button>
                  </CardContent>
                </Card>

                <Card className="glass-panel border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6 text-center">
                    <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Guest Experience</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Guest satisfaction, feedback analysis, and service quality metrics
                    </p>
                    <Button variant="outline" className="apple-button">
                      Use Template
                    </Button>
                  </CardContent>
                </Card>

                <Card className="glass-panel border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6 text-center">
                    <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Operational Efficiency</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Staff performance, resource utilization, and operational KPIs
                    </p>
                    <Button variant="outline" className="apple-button">
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* Report Builder Interface */
          <div className="space-y-6">
            {/* Builder Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="outline" onClick={() => setIsBuilderOpen(false)} className="apple-button">
                  ← Back to Reports
                </Button>
                <div>
                  <h2 className="text-xl font-semibold">{reportName || "New Report"}</h2>
                  <p className="text-sm text-muted-foreground">
                    {reportDescription || "Building a custom report"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={() => setPreviewMode(!previewMode)} className="apple-button">
                  <Eye className="h-4 w-4 mr-2" />
                  {previewMode ? "Edit" : "Preview"}
                </Button>
                <Button variant="outline" className="apple-button">
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                <Button className="apple-button">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Publish
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Component Palette */}
              {!previewMode && (
                <div className="lg:col-span-1">
                  <Card className="glass-panel">
                    <CardHeader>
                      <CardTitle className="text-lg">Components</CardTitle>
                      <CardDescription>Drag components to build your report</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible defaultValue="content">
                        <AccordionItem value="content">
                          <AccordionTrigger className="text-sm">Content</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2">
                              {sectionTypes.slice(0, 4).map((sectionType) => (
                                <Button
                                  key={sectionType.type}
                                  variant="outline"
                                  className="w-full justify-start text-left apple-button"
                                  onClick={() => addSection(sectionType.type)}
                                >
                                  <sectionType.icon className="h-4 w-4 mr-2" />
                                  {sectionType.name}
                                </Button>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="visualizations">
                          <AccordionTrigger className="text-sm">Visualizations</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2">
                              {chartTypes.map((chart) => (
                                <Button
                                  key={chart.value}
                                  variant="outline"
                                  className="w-full justify-start text-left apple-button"
                                  onClick={() => addSection("chart")}
                                >
                                  <chart.icon className="h-4 w-4 mr-2" />
                                  {chart.label}
                                </Button>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="layout">
                          <AccordionTrigger className="text-sm">Layout</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2">
                              {sectionTypes.slice(4).map((sectionType) => (
                                <Button
                                  key={sectionType.type}
                                  variant="outline"
                                  className="w-full justify-start text-left apple-button"
                                  onClick={() => addSection(sectionType.type)}
                                >
                                  <sectionType.icon className="h-4 w-4 mr-2" />
                                  {sectionType.name}
                                </Button>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Report Canvas */}
              <div className={previewMode ? "lg:col-span-4" : "lg:col-span-3"}>
                <Card className="glass-panel min-h-[600px]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {previewMode ? "Report Preview" : "Report Builder"}
                      </CardTitle>
                      {!previewMode && (
                        <div className="flex items-center space-x-2">
                          <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {themes.map((theme) => (
                                <SelectItem key={theme.value} value={theme.value}>
                                  {theme.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm" className="apple-button">
                            <Palette className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {previewMode ? (
                      /* Preview Mode */
                      <div className="space-y-6 p-6 bg-white rounded-lg shadow-inner min-h-[500px]">
                        <div className="text-center border-b pb-4">
                          <h1 className="text-2xl font-bold">{reportName}</h1>
                          <p className="text-muted-foreground mt-2">{reportDescription}</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Generated on {new Date().toLocaleDateString()}
                          </p>
                        </div>
                        {currentSections.map((section, index) => (
                          <div key={section.id} className="space-y-2">
                            <h3 className="text-lg font-semibold">{section.title}</h3>
                            <div className="border rounded-lg p-4 bg-gray-50">
                              <p className="text-sm text-muted-foreground text-center">
                                {section.type.charAt(0).toUpperCase() + section.type.slice(1)} Component
                              </p>
                              <p className="text-xs text-muted-foreground text-center mt-1">
                                This section would display actual {section.type} content
                              </p>
                            </div>
                          </div>
                        ))}
                        {currentSections.length === 0 && (
                          <div className="text-center py-12">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                              Add components to see the report preview
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Builder Mode */
                      <div className="space-y-4 min-h-[400px]">
                        {currentSections.map((section, index) => (
                          <div
                            key={section.id}
                            className="border rounded-lg p-4 bg-background transition-all"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <div className="cursor-move">
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <Input
                                  value={section.title}
                                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                  className="font-medium border-none p-0 h-auto focus-visible:ring-0"
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  {section.type}
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="apple-button"
                                >
                                  <Settings className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeSection(section.id)}
                                  className="apple-button text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                              <div className="text-muted-foreground">
                                <p className="font-medium">
                                  {section.type.charAt(0).toUpperCase() + section.type.slice(1)} Component
                                </p>
                                <p className="text-sm mt-1">
                                  Configure this section to display {section.type} content
                                </p>
                                <Button variant="outline" size="sm" className="mt-3 apple-button">
                                  Configure
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {currentSections.length === 0 && (
                          <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                              Click components from the sidebar to start building your report
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
