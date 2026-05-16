import React, { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { useMultiOutlet } from "../context/MultiOutletContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Zap,
  Eye,
  DollarSign,
  Layers,
  Settings,
  HelpCircle,
} from "lucide-react";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";

export default function Dashboard() {
  const { user } = useAuth();
  const { currentOutlet } = useMultiOutlet();
  const [activeTab, setActiveTab] = useState("overview");
  const [showHelp, setShowHelp] = useState(false);

  const dashboards = [
    {
      id: "overview",
      label: "Overview",
      icon: Eye,
      description: "Main dashboard with key KPIs",
    },
    {
      id: "ap",
      label: "Accounts Payable",
      icon: DollarSign,
      description: "Payment tracking & scheduling",
    },
    {
      id: "p2p",
      label: "Procurement-to-Pay",
      icon: Layers,
      description: "End-to-end lifecycle metrics",
    },
    {
      id: "analytics",
      label: "Advanced Analytics",
      icon: BarChart3,
      description: "Deep business intelligence",
    },
    {
      id: "ocr",
      label: "OCR Metrics",
      icon: Zap,
      description: "Invoice scanning & accuracy",
    },
    {
      id: "forecasting",
      label: "Demand Forecasting",
      icon: TrendingUp,
      description: "Inventory predictions",
    },
    {
      id: "alerts",
      label: "Manager Alerts",
      icon: AlertTriangle,
      description: "Real-time issues & exceptions",
    },
  ];

  const renderDashboardContent = (dashId: string) => {
    const title = dashboards.find((d) => d.id === dashId)?.label || "Dashboard";
    return (
      <Card className="border-border bg-surface">
        <CardContent className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-border bg-surface">
                  <CardContent className="pt-4">
                    <div className="text-xs text-slate-400">Metric {i}</div>
                    <p className="text-2xl font-bold mt-2">
                      ${(Math.random() * 10000).toFixed(0)}
                    </p>
                    <p className="text-xs text-green-400 mt-1">↑ 12.5%</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-sm text-slate-400 p-4 bg-surface rounded">
              <p>
                {title} dashboard with real-time metrics, charts, and actionable
                insights.
              </p>
              <p className="mt-2 text-xs">
                KPIs | Charts | Alerts | Filters | Export
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Dashboards
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              All views: Operations, Finance, Analytics, Forecasting
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(!showHelp)}
              className="text-slate-400 hover:text-slate-200"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <ModuleChatButton
              moduleId="purchasing-receiving"
              moduleName="Purchasing & Receiving"
              variant="outline"
              size="md"
            />
          </div>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-3"
        >
          <TabsList className="bg-surface border-b border-border h-auto w-full justify-start rounded-none p-0 overflow-x-auto">
            {dashboards.map((dashboard) => {
              const Icon = dashboard.icon;
              return (
                <TabsTrigger
                  key={dashboard.id}
                  value={dashboard.id}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary whitespace-nowrap"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {dashboard.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {dashboards.map((dashboard) => (
            <TabsContent key={dashboard.id} value={dashboard.id}>
              {renderDashboardContent(dashboard.id)}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
