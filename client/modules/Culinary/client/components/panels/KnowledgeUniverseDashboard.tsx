import React, { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Progress } from "../ui/progress";
import {
  ChefHat,
  Zap,
  Wine,
  Users,
  DollarSign,
  Box,
  Clock,
  UserCheck,
  TrendingUp,
  BookOpen,
  Beaker,
  Activity,
} from "lucide-react";

interface DomainProgress {
  domain: string;
  icon: React.ReactNode;
  progress: number;
  itemCount: number;
  lastUpdated: string;
  checkpoints: string[];
  completedCheckpoints: number;
}

interface KnowledgeStats {
  totalItems: number;
  totalDomains: number;
  overallProgress: number;
  domainBreakdown: DomainProgress[];
  lastSync: string;
}

export function KnowledgeUniverseDashboard() {
  const [stats, setStats] = useState<KnowledgeStats>({
    totalItems: 0,
    totalDomains: 12,
    overallProgress: 0,
    domainBreakdown: [],
    lastSync: new Date().toISOString(),
  });

  const [isTraining, setIsTraining] = useState(false);

  useEffect(() => {
    // Initialize with domain structure
    const domains: DomainProgress[] = [
      {
        domain: "Culinary Science",
        icon: <ChefHat className="w-5 h-5" />,
        progress: 15,
        itemCount: 342,
        lastUpdated: new Date().toISOString(),
        checkpoints: [
          "Ingredients",
          "Techniques",
          "Flavor Chemistry",
          "Thermodynamics",
        ],
        completedCheckpoints: 1,
      },
      {
        domain: "Pastry & Baking",
        icon: <Beaker className="w-5 h-5" />,
        progress: 8,
        itemCount: 189,
        lastUpdated: new Date().toISOString(),
        checkpoints: [
          "Baker's Percentages",
          "Rheology",
          "Texture Profiles",
          "Defect Diagnosis",
        ],
        completedCheckpoints: 0,
      },
      {
        domain: "Mixology",
        icon: <Zap className="w-5 h-5" />,
        progress: 5,
        itemCount: 127,
        lastUpdated: new Date().toISOString(),
        checkpoints: [
          "Spirits",
          "Cocktail Families",
          "Bar Techniques",
          "Costing",
        ],
        completedCheckpoints: 0,
      },
      {
        domain: "Wine & Sommelier",
        icon: <Wine className="w-5 h-5" />,
        progress: 12,
        itemCount: 356,
        lastUpdated: new Date().toISOString(),
        checkpoints: [
          "Varietals",
          "Regions",
          "Wine Chemistry",
          "Pairing Logic",
        ],
        completedCheckpoints: 1,
      },
      {
        domain: "Hospitality Ops",
        icon: <Users className="w-5 h-5" />,
        progress: 6,
        itemCount: 234,
        lastUpdated: new Date().toISOString(),
        checkpoints: [
          "FOH Standards",
          "BOH Workflows",
          "Guest Recovery",
          "Service Flow",
        ],
        completedCheckpoints: 0,
      },
      {
        domain: "Banquets & Events",
        icon: <Activity className="w-5 h-5" />,
        progress: 4,
        itemCount: 198,
        lastUpdated: new Date().toISOString(),
        checkpoints: [
          "BEO Structure",
          "Multi-Room Service",
          "Course Timing",
          "Buffet Logic",
        ],
        completedCheckpoints: 0,
      },
      {
        domain: "Finance & GL",
        icon: <DollarSign className="w-5 h-5" />,
        progress: 7,
        itemCount: 267,
        lastUpdated: new Date().toISOString(),
        checkpoints: [
          "Chart of Accounts",
          "P&L Models",
          "KPI Tracking",
          "Forecasting",
        ],
        completedCheckpoints: 0,
      },
      {
        domain: "Inventory & Supply",
        icon: <Box className="w-5 h-5" />,
        progress: 9,
        itemCount: 301,
        lastUpdated: new Date().toISOString(),
        checkpoints: [
          "Vendor Management",
          "PAR Levels",
          "FIFO Logic",
          "Yield Systems",
        ],
        completedCheckpoints: 0,
      },
      {
        domain: "Labor & HR",
        icon: <Clock className="w-5 h-5" />,
        progress: 3,
        itemCount: 156,
        lastUpdated: new Date().toISOString(),
        checkpoints: ["Compliance", "Scheduling", "Timecards", "Forecasting"],
        completedCheckpoints: 0,
      },
      {
        domain: "CRM & Guest Exp",
        icon: <UserCheck className="w-5 h-5" />,
        progress: 5,
        itemCount: 213,
        lastUpdated: new Date().toISOString(),
        checkpoints: [
          "Guest Profiles",
          "Journey Mapping",
          "Feedback",
          "Personalization",
        ],
        completedCheckpoints: 0,
      },
      {
        domain: "BI & Forecasting",
        icon: <TrendingUp className="w-5 h-5" />,
        progress: 4,
        itemCount: 184,
        lastUpdated: new Date().toISOString(),
        checkpoints: [
          "Dashboards",
          "AI Forecasting",
          "Insights",
          "Trend Analysis",
        ],
        completedCheckpoints: 0,
      },
      {
        domain: "Beverage Science",
        icon: <BookOpen className="w-5 h-5" />,
        progress: 6,
        itemCount: 245,
        lastUpdated: new Date().toISOString(),
        checkpoints: [
          "Spirits",
          "Cocktails",
          "Non-Alcoholic",
          "Beverage Costing",
        ],
        completedCheckpoints: 0,
      },
    ];

    const totalItems = domains.reduce((sum, d) => sum + d.itemCount, 0);
    const avgProgress =
      domains.reduce((sum, d) => sum + d.progress, 0) / domains.length;

    setStats({
      totalItems,
      totalDomains: domains.length,
      overallProgress: Math.round(avgProgress),
      domainBreakdown: domains,
      lastSync: new Date().toISOString(),
    });
  }, []);

  const handleStartTraining = () => {
    setIsTraining(true);
    // Simulate training progress
    setTimeout(() => {
      setStats((prev) => ({
        ...prev,
        overallProgress: Math.min(100, prev.overallProgress + 5),
        lastSync: new Date().toISOString(),
      }));
      setIsTraining(false);
    }, 2000);
  };

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Knowledge Universe
          </h2>
          <p className="text-sm text-gray-600">
            Echo's comprehensive knowledge across {stats.totalDomains} domains
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-indigo-600">
            {stats.overallProgress}%
          </p>
          <p className="text-sm text-gray-600">Overall Coverage</p>
        </div>
      </div>

      {/* Overall Progress */}
      <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200 p-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Total Knowledge Items: {stats.totalItems.toLocaleString()}
          </p>
          <Progress value={stats.overallProgress} className="h-3" />
          <div className="flex justify-between text-xs text-gray-600">
            <span>0%</span>
            <span>Target: 100%</span>
            <span>{stats.overallProgress}%</span>
          </div>
        </div>
      </Card>

      {/* Control Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleStartTraining}
          disabled={isTraining}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
        >
          {isTraining ? "Training..." : "Start Training Session"}
        </Button>
        <Button variant="outline" className="flex-1">
          View Knowledge Graph
        </Button>
      </div>

      {/* Domain Grid */}
      <Tabs defaultValue="domains" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="domains">Domains</TabsTrigger>
          <TabsTrigger value="timeline">Learning Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="domains" className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            {stats.domainBreakdown.map((domain) => (
              <Card
                key={domain.domain}
                className="hover:border-indigo-300 transition-colors p-3"
              >
                <div className="space-y-2">
                  {/* Domain Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-indigo-600">{domain.icon}</div>
                      <div>
                        <h4 className="font-semibold text-sm text-gray-900">
                          {domain.domain}
                        </h4>
                        <p className="text-xs text-gray-600">
                          {domain.itemCount} items
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="text-xs">{domain.progress}%</Badge>
                      <p className="text-xs text-gray-600 mt-1">
                        {domain.completedCheckpoints}/
                        {domain.checkpoints.length}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <Progress value={domain.progress} className="h-2" />

                  {/* Checkpoints */}
                  <div className="flex flex-wrap gap-1">
                    {domain.checkpoints.map((checkpoint, idx) => (
                      <Badge
                        key={checkpoint}
                        variant={
                          idx < domain.completedCheckpoints
                            ? "default"
                            : "outline"
                        }
                        className="text-xs py-0.5"
                      >
                        {checkpoint}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-3">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Learning Roadmap</h3>
            <p className="text-sm text-gray-600">
              Echo AI learns domains sequentially to build a comprehensive
              understanding
            </p>

            <div className="space-y-2 mt-4">
              {[
                {
                  phase: 1,
                  domain: "Culinary Science",
                  status: "in_progress",
                  percent: 15,
                },
                {
                  phase: 2,
                  domain: "Pastry & Baking",
                  status: "pending",
                  percent: 8,
                },
                {
                  phase: 3,
                  domain: "Wine & Sommelier",
                  status: "pending",
                  percent: 12,
                },
                {
                  phase: 4,
                  domain: "Mixology & Beverages",
                  status: "pending",
                  percent: 6,
                },
                {
                  phase: 5,
                  domain: "Hospitality Operations",
                  status: "pending",
                  percent: 6,
                },
                {
                  phase: 6,
                  domain: "Banquets & Events",
                  status: "pending",
                  percent: 4,
                },
                {
                  phase: 7,
                  domain: "Finance & Accounting",
                  status: "pending",
                  percent: 7,
                },
                {
                  phase: 8,
                  domain: "Inventory & Supply",
                  status: "pending",
                  percent: 9,
                },
                {
                  phase: 9,
                  domain: "Labor & HR",
                  status: "pending",
                  percent: 3,
                },
                {
                  phase: 10,
                  domain: "CRM & Guest Experience",
                  status: "pending",
                  percent: 5,
                },
                {
                  phase: 11,
                  domain: "Business Intelligence",
                  status: "pending",
                  percent: 4,
                },
                {
                  phase: 12,
                  domain: "Connection Engine",
                  status: "pending",
                  percent: 0,
                },
              ].map((phase) => (
                <div
                  key={phase.phase}
                  className="flex items-center gap-3 pb-2 border-b"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-semibold">
                    {phase.phase}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">
                      {phase.domain}
                    </p>
                    <div className="w-full bg-gray-200 rounded h-1.5 mt-1">
                      <div
                        className={`h-full rounded ${
                          phase.status === "in_progress"
                            ? "bg-indigo-600"
                            : "bg-gray-400"
                        }`}
                        style={{ width: `${phase.percent}%` }}
                      />
                    </div>
                  </div>
                  <Badge
                    variant={
                      phase.status === "in_progress" ? "default" : "outline"
                    }
                    className="text-xs"
                  >
                    {phase.status === "in_progress" ? "In Progress" : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stats Footer */}
      <Card className="bg-gray-50 p-3 text-xs text-gray-600">
        <p>Last synced: {new Date(stats.lastSync).toLocaleTimeString()}</p>
      </Card>
    </div>
  );
}
