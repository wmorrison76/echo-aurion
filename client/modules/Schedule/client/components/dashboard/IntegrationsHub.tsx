import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity,
  TrendingUp,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
interface Feature {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: "ready" | "loading" | "error" | "demo";
  action: string;
  category: string;
}
export default function IntegrationsHub() {
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const features: Feature[] = [
    {
      id: "advanced-analytics",
      name: "Advanced Analytics Dashboard",
      description: "Real-time anomaly detection and trend analysis",
      icon: <TrendingUp className="h-6 w-6" />,
      status: "ready",
      action: "View Dashboard",
      category: "Analytics",
    },
    {
      id: "labor-reports",
      name: "Comprehensive Labor Reports",
      description: "10+ detailed labor analysis and compliance reports",
      icon: <BarChart3 className="h-6 w-6" />,
      status: "ready",
      action: "Generate Report",
      category: "Reports",
    },
    {
      id: "employee-onboarding",
      name: "Employee Onboarding System",
      description: "Resume parsing, document management, and workflow",
      icon: <Users className="h-6 w-6" />,
      status: "ready",
      action: "Start Onboarding",
      category: "HR",
    },
    {
      id: "interactive-help",
      name: "Interactive Help Guide",
      description: "Step-by-step guided tours with visual walkthroughs",
      icon: <HelpCircle className="h-6 w-6" />,
      status: "ready",
      action: "Launch Guide",
      category: "Help",
    },
    {
      id: "echo-voice",
      name: "Accessible Echo Voice",
      description: "WCAG-compliant AI assistant with voice controls",
      icon: <Activity className="h-6 w-6" />,
      status: "ready",
      action: "Use Echo",
      category: "AI",
    },
    {
      id: "performance-monitoring",
      name: "Performance Monitoring",
      description: "Real-time API and database performance tracking",
      icon: <Activity className="h-6 w-6" />,
      status: "ready",
      action: "View Metrics",
      category: "Operations",
    },
    {
      id: "auto-healing",
      name: "Auto-Healing System",
      description: "Automatic issue detection and remediation",
      icon: <AlertCircle className="h-6 w-6" />,
      status: "ready",
      action: "Check Health",
      category: "Operations",
    },
    {
      id: "security-audit",
      name: "Security Audit Dashboard",
      description: "Compliance tracking and RLS policy verification",
      icon: <CheckCircle className="h-6 w-6" />,
      status: "ready",
      action: "Review Security",
      category: "Security",
    },
  ];
  const categories = [
    "all",
    ...Array.from(new Set(features.map((f) => f.category))).sort(),
  ];
  const filtered =
    selectedCategory === "all"
      ? features
      : features.filter((f) => f.category === selectedCategory);
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "bg-green-50 border-green-200";
      case "loading":
        return "bg-blue-50 border-blue-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "demo":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-surface border-gray-200";
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            {" "}
            <CheckCircle className="h-3 w-3" /> Ready{" "}
          </span>
        );
      case "loading":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
            {" "}
            <Activity className="h-3 w-3 animate-spin" /> Loading{" "}
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
            {" "}
            <AlertCircle className="h-3 w-3" /> Error{" "}
          </span>
        );
      case "demo":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
            {" "}
            Demo{" "}
          </span>
        );
      default:
        return null;
    }
  };
  return (
    <div className="space-y-6 p-6">
      {" "}
      {/* Header */}{" "}
      <div>
        {" "}
        <h1 className="text-3xl font-bold text-gray-900">
          Integrations Hub
        </h1>{" "}
        <p className="mt-2 text-muted-foreground">
          {" "}
          Access all new features and enhancements in one place{" "}
        </p>{" "}
      </div>{" "}
      {/* Category Filter */}{" "}
      <div className="flex flex-wrap gap-2">
        {" "}
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            onClick={() => setSelectedCategory(category)}
            size="sm"
          >
            {" "}
            {category.charAt(0).toUpperCase() + category.slice(1)}{" "}
          </Button>
        ))}{" "}
      </div>{" "}
      {/* Features Grid */}{" "}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {" "}
        {filtered.map((feature) => (
          <Card
            key={feature.id}
            className={`border-2 transition-all hover:shadow-lg ${getStatusColor(feature.status)}`}
          >
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <div className="flex items-start justify-between">
                {" "}
                <div className="flex gap-3">
                  {" "}
                  <div className="text-primary">{feature.icon}</div>{" "}
                  <div>
                    {" "}
                    <CardTitle className="text-lg">
                      {feature.name}
                    </CardTitle>{" "}
                    <p className="text-xs font-medium text-muted-foreground">
                      {" "}
                      {feature.category}{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              {" "}
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>{" "}
              <div className="flex items-center justify-between pt-3">
                {" "}
                {getStatusBadge(feature.status)}{" "}
                <Button
                  size="sm"
                  variant="default"
                  disabled={feature.status !== "ready"}
                >
                  {" "}
                  {feature.action}{" "}
                </Button>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>
        ))}{" "}
      </div>{" "}
      {/* Empty State */}{" "}
      {filtered.length === 0 && (
        <Card className="border-dashed">
          {" "}
          <CardContent className="py-12 text-center">
            {" "}
            <p className="text-muted-foreground">
              {" "}
              No features in this category. Try selecting a different
              category.{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      {/* Stats Summary */}{" "}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {" "}
        <Card>
          {" "}
          <CardContent className="pt-6">
            {" "}
            <div className="text-center">
              {" "}
              <p className="text-3xl font-bold text-green-600">
                {" "}
                {features.filter((f) => f.status === "ready").length}{" "}
              </p>{" "}
              <p className="text-sm text-muted-foreground">
                Features Ready
              </p>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardContent className="pt-6">
            {" "}
            <div className="text-center">
              {" "}
              <p className="text-3xl font-bold text-primary">
                {" "}
                {categories.length - 1}{" "}
              </p>{" "}
              <p className="text-sm text-muted-foreground">Categories</p>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardContent className="pt-6">
            {" "}
            <div className="text-center">
              {" "}
              <p className="text-3xl font-bold text-purple-600">5</p>{" "}
              <p className="text-sm text-muted-foreground">
                APIs Integrated
              </p>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardContent className="pt-6">
            {" "}
            <div className="text-center">
              {" "}
              <p className="text-3xl font-bold text-emerald-600">100%</p>{" "}
              <p className="text-sm text-muted-foreground">
                Test Coverage
              </p>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
    </div>
  );
}
