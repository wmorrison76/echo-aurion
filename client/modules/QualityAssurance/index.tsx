import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  User,
  TrendingUp,
  RefreshCw,
  Download,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
interface RecipeStandard {
  id: string;
  name: string;
  prepTime: number;
  servingSize: string;
  qualityScore: number;
  lastUpdated: string;
  compliance: number;
}
interface QualityCheckItem {
  id: string;
  item: string;
  category: string;
  status: "pass" | "fail" | "review";
  timestamp: string;
  inspector: string;
  notes: string;
}
interface ComplianceArea {
  area: string;
  score: number;
  maxScore: number;
  percentage: number;
  details: string[];
}
interface AuditLog {
  id: string;
  date: string;
  type: "daily" | "weekly" | "monthly" | "incident";
  score: number;
  inspector: string;
  issues: number;
  correctionsDue: string[];
}
const RECIPE_STANDARDS: RecipeStandard[] = [
  {
    id: "1",
    name: "Maryland Crabcakes",
    prepTime: 15,
    servingSize: "2 cakes (6oz)",
    qualityScore: 94,
    lastUpdated: "2024-02-15",
    compliance: 98,
  },
  {
    id: "2",
    name: "Pan-Seared Salmon",
    prepTime: 12,
    servingSize: "6oz fillet",
    qualityScore: 91,
    lastUpdated: "2024-02-10",
    compliance: 96,
  },
  {
    id: "3",
    name: "Caesar Salad",
    prepTime: 8,
    servingSize: "Single portion",
    qualityScore: 88,
    lastUpdated: "2024-02-18",
    compliance: 94,
  },
  {
    id: "4",
    name: "Ribeye Steak (12oz)",
    prepTime: 14,
    servingSize: "12oz cut",
    qualityScore: 96,
    lastUpdated: "2024-02-12",
    compliance: 99,
  },
  {
    id: "5",
    name: "Chocolate Lava Cake",
    prepTime: 6,
    servingSize: "Single portion",
    qualityScore: 92,
    lastUpdated: "2024-02-16",
    compliance: 97,
  },
];
const QUALITY_CHECKS: QualityCheckItem[] = [
  {
    id: "1",
    item: "Crabcake Temperature (63°C internal)",
    category: "Temperature Control",
    status: "pass",
    timestamp: "2024-02-19 11:30",
    inspector: "Chef Marcus",
    notes: "Perfect golden crust, 64°C internal, excellent texture",
  },
  {
    id: "2",
    item: "Salmon Freshness (Appearance/Smell)",
    category: "Ingredient Quality",
    status: "pass",
    timestamp: "2024-02-19 10:15",
    inspector: "Sarah K.",
    notes: "Fresh delivery, vibrant color, no odor",
  },
  {
    id: "3",
    item: "Salad Dressing Consistency",
    category: "Preparation Standards",
    status: "review",
    timestamp: "2024-02-19 12:00",
    inspector: "Chef Marcus",
    notes:
      "Slightly thinner than standard - may need slight adjustment to recipe ratios",
  },
  {
    id: "4",
    item: "Steak Resting Time (5 min minimum)",
    category: "Cooking Process",
    status: "pass",
    timestamp: "2024-02-19 18:45",
    inspector: "David R.",
    notes: "Proper resting time observed, perfect medium-rare",
  },
  {
    id: "5",
    item: "Dessert Plating Consistency",
    category: "Presentation",
    status: "fail",
    timestamp: "2024-02-19 20:15",
    inspector: "Chef Marcus",
    notes:
      "Sauce drizzle uneven on two plates - training needed for consistency",
  },
];
const COMPLIANCE_AREAS: ComplianceArea[] = [
  {
    area: "Food Safety & HACCP",
    score: 98,
    maxScore: 100,
    percentage: 98,
    details: [
      "Temperature control: 98%",
      "Storage procedures: 97%",
      "Cleaning protocols: 99%",
    ],
  },
  {
    area: "Recipe Consistency",
    score: 92,
    maxScore: 100,
    percentage: 92,
    details: [
      "Ingredient measurements: 94%",
      "Preparation times: 90%",
      "Plating standards: 91%",
    ],
  },
  {
    area: "Allergen Management",
    score: 96,
    maxScore: 100,
    percentage: 96,
    details: [
      "Cross-contamination prevention: 96%",
      "Labeling accuracy: 97%",
      "Staff training: 95%",
    ],
  },
  {
    area: "Staff Compliance",
    score: 88,
    maxScore: 100,
    percentage: 88,
    details: [
      "Uniform & hygiene: 90%",
      "Training completion: 85%",
      "Certification current: 89%",
    ],
  },
  {
    area: "Health Code Compliance",
    score: 97,
    maxScore: 100,
    percentage: 97,
    details: [
      "Health permits current: 100%",
      "Inspection violations: 0",
      "Documentation: 97%",
    ],
  },
];
const AUDIT_LOGS: AuditLog[] = [
  {
    id: "1",
    date: "2024-02-19",
    type: "daily",
    score: 94,
    inspector: "Chef Marcus",
    issues: 1,
    correctionsDue: ["Dessert plating consistency - train pastry team"],
  },
  {
    id: "2",
    date: "2024-02-18",
    type: "daily",
    score: 96,
    inspector: "Sarah K.",
    issues: 0,
    correctionsDue: [],
  },
  {
    id: "3",
    date: "2024-02-17",
    type: "daily",
    score: 93,
    inspector: "David R.",
    issues: 2,
    correctionsDue: [
      "Update salad dressing ratios",
      "Restock gluten-free ingredients",
    ],
  },
  {
    id: "4",
    date: "2024-02-10",
    type: "weekly",
    score: 95,
    inspector: "Health Inspector",
    issues: 0,
    correctionsDue: [],
  },
  {
    id: "5",
    date: "2024-01-15",
    type: "monthly",
    score: 96,
    inspector: "Regional Manager",
    issues: 0,
    correctionsDue: [],
  },
];
export default function QualityAssuranceModule() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const avgQualityScore = (
    RECIPE_STANDARDS.reduce((sum, r) => sum + r.qualityScore, 0) /
    RECIPE_STANDARDS.length
  ).toFixed(1);
  const avgCompliance = (
    RECIPE_STANDARDS.reduce((sum, r) => sum + r.compliance, 0) /
    RECIPE_STANDARDS.length
  ).toFixed(1);
  const passedChecks = QUALITY_CHECKS.filter((c) => c.status === "pass").length;
  const reviewChecks = QUALITY_CHECKS.filter(
    (c) => c.status === "review",
  ).length;
  const failedChecks = QUALITY_CHECKS.filter((c) => c.status === "fail").length;
  const overallCompliance = (
    COMPLIANCE_AREAS.reduce((sum, a) => sum + a.percentage, 0) /
    COMPLIANCE_AREAS.length
  ).toFixed(1);
  const handleAudit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/quality-assurance/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipes: RECIPE_STANDARDS,
          checks: QUALITY_CHECKS,
          compliance: COMPLIANCE_AREAS,
        }),
      });
      if (!response.ok) throw new Error("Audit failed");
    } catch (error) {
      console.error("Quality audit error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div
      className={cn(
        "w-full h-full overflow-y-auto bg-background/50 backdrop-blur-sm p-6 space-y-6",
      )}
    >
      {" "}
      {/* Header */}{" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            {" "}
            <CheckCircle2 className="w-8 h-8 text-green-500" />{" "}
            {t("module.quality-assurance.title")}{" "}
          </h1>{" "}
          <p className="text-sm text-foreground/60 mt-1">
            {" "}
            {t("module.quality-assurance.description")}{" "}
          </p>{" "}
        </div>{" "}
        <div className="flex items-center gap-3">
          {" "}
          <ModuleChatButton
            moduleId="quality-assurance"
            moduleName={t("module.quality-assurance.title")}
          />{" "}
          <Button onClick={handleAudit} disabled={isLoading} className="gap-2">
            {" "}
            <RefreshCw
              className={cn("w-4 h-4", isLoading && "animate-spin")}
            />{" "}
            {t("module.quality-assurance.runAudit")}{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
      {/* Quick Stats */}{" "}
      <div className="grid grid-cols-5 gap-4">
        {" "}
        <Card className="bg-background border-white/10">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-foreground/60">
              {t("module.quality-assurance.metrics.avgQualityScore")}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-green-500">
              {avgQualityScore}
            </div>{" "}
            <p className="text-xs text-foreground/50 mt-1">
              {t("module.quality-assurance.metrics.acrossAllRecipes")}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="bg-background border-white/10">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-foreground/60">
              {t("module.quality-assurance.metrics.checksPassed")}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-blue-500">
              {passedChecks}/{QUALITY_CHECKS.length}
            </div>{" "}
            <p className="text-xs text-foreground/50 mt-1">
              {((passedChecks / QUALITY_CHECKS.length) * 100).toFixed(0)}%{" "}
              {t("module.quality-assurance.metrics.passRate")}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="bg-background border-white/10">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-foreground/60">
              {t("module.quality-assurance.metrics.issuesFound")}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-orange-500">
              {failedChecks}
            </div>{" "}
            <p className="text-xs text-foreground/50 mt-1">
              {reviewChecks} {t("module.quality-assurance.metrics.underReview")}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="bg-background border-white/10">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-foreground/60">
              {t("module.quality-assurance.metrics.complianceScore")}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-purple-500">
              {overallCompliance}%
            </div>{" "}
            <p className="text-xs text-foreground/50 mt-1">
              {t("module.quality-assurance.metrics.acrossAllAreas")}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="bg-background border-white/10">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-foreground/60">
              {t("module.quality-assurance.metrics.recipeStandards")}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-blue-500">
              {RECIPE_STANDARDS.length}
            </div>{" "}
            <p className="text-xs text-foreground/50 mt-1">
              {RECIPE_STANDARDS.filter((r) => r.compliance > 95).length}{" "}
              {t("module.quality-assurance.metrics.fullyCompliant")}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Tabs */}{" "}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {" "}
        <TabsList className="grid w-full grid-cols-4 bg-background border border-white/10 p-1 rounded-lg">
          {" "}
          <TabsTrigger value="overview">
            {t("module.quality-assurance.tabs.overview")}
          </TabsTrigger>{" "}
          <TabsTrigger value="recipes">
            {t("module.quality-assurance.tabs.recipes")}
          </TabsTrigger>{" "}
          <TabsTrigger value="checks">
            {t("module.quality-assurance.tabs.checks")}
          </TabsTrigger>{" "}
          <TabsTrigger value="audits">
            {t("module.quality-assurance.tabs.audits")}
          </TabsTrigger>{" "}
        </TabsList>{" "}
        {/* Overview */}{" "}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {" "}
          <div className="grid grid-cols-2 gap-4">
            {" "}
            <Card className="bg-background border-white/10">
              {" "}
              <CardHeader>
                {" "}
                <CardTitle>
                  {t("module.quality-assurance.complianceByArea")}
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent className="space-y-3">
                {" "}
                {COMPLIANCE_AREAS.map((area) => (
                  <div key={area.area}>
                    {" "}
                    <div className="flex justify-between items-center mb-1">
                      {" "}
                      <span className="text-sm text-foreground/70">
                        {area.area}
                      </span>{" "}
                      <span className="text-sm font-bold text-green-500">
                        {area.percentage}%
                      </span>{" "}
                    </div>{" "}
                    <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                      {" "}
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${area.percentage}%` }}
                      />{" "}
                    </div>{" "}
                  </div>
                ))}{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="bg-background border-white/10">
              {" "}
              <CardHeader>
                {" "}
                <CardTitle>
                  {t("module.quality-assurance.qualityCheckSummary")}
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent className="space-y-3">
                {" "}
                <div className="flex items-center justify-between p-3 bg-background rounded">
                  {" "}
                  <div className="flex items-center gap-2">
                    {" "}
                    <CheckCircle2 className="w-5 h-5 text-green-500" />{" "}
                    <span className="text-foreground/80">
                      {t("module.quality-assurance.passed")}
                    </span>{" "}
                  </div>{" "}
                  <span className="text-lg font-bold text-green-500">
                    {passedChecks}
                  </span>{" "}
                </div>{" "}
                <div className="flex items-center justify-between p-3 bg-background rounded">
                  {" "}
                  <div className="flex items-center gap-2">
                    {" "}
                    <AlertCircle className="w-5 h-5 text-yellow-500" />{" "}
                    <span className="text-foreground/80">
                      {t("module.quality-assurance.underReview")}
                    </span>{" "}
                  </div>{" "}
                  <span className="text-lg font-bold text-yellow-500">
                    {reviewChecks}
                  </span>{" "}
                </div>{" "}
                <div className="flex items-center justify-between p-3 bg-background rounded">
                  {" "}
                  <div className="flex items-center gap-2">
                    {" "}
                    <XCircle className="w-5 h-5 text-red-500" />{" "}
                    <span className="text-foreground/80">
                      {t("module.quality-assurance.failed")}
                    </span>{" "}
                  </div>{" "}
                  <span className="text-lg font-bold text-red-500">
                    {failedChecks}
                  </span>{" "}
                </div>{" "}
              </CardContent>{" "}
            </Card>{" "}
          </div>{" "}
          <Card className="bg-background border-white/10">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>
                {t("module.quality-assurance.complianceDetails")}
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-3">
              {" "}
              {COMPLIANCE_AREAS.map((area) => (
                <div key={area.area} className="border-b border-white/10 pb-3">
                  {" "}
                  <div className="flex justify-between items-start mb-2">
                    {" "}
                    <h4 className="font-semibold text-foreground">
                      {area.area}
                    </h4>{" "}
                    <span className="text-sm font-bold text-green-500">
                      {" "}
                      {area.score}/{area.maxScore}{" "}
                    </span>{" "}
                  </div>{" "}
                  <div className="space-y-1 text-xs text-foreground/60">
                    {" "}
                    {area.details.map((detail, idx) => (
                      <p key={idx}>• {detail}</p>
                    ))}{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Recipe Standards */}{" "}
        <TabsContent value="recipes" className="space-y-4 mt-4">
          {" "}
          <Card className="bg-background border-white/10">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>
                {t("module.quality-assurance.standardRecipes")}
              </CardTitle>{" "}
              <CardDescription>
                {t("module.quality-assurance.qualityScoresAndCompliance")}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-3">
              {" "}
              {RECIPE_STANDARDS.map((recipe) => (
                <div
                  key={recipe.id}
                  className="border border-white/10 rounded-lg p-4 cursor-pointer hover:bg-background transition-colors"
                  onClick={() =>
                    setExpandedRecipe(
                      expandedRecipe === recipe.id ? null : recipe.id,
                    )
                  }
                >
                  {" "}
                  <div className="flex justify-between items-start">
                    {" "}
                    <div className="flex-1">
                      {" "}
                      <h4 className="font-semibold text-foreground">
                        {recipe.name}
                      </h4>{" "}
                      <p className="text-xs text-foreground/60 mt-1">
                        {" "}
                        {t("module.quality-assurance.prep")}: {recipe.prepTime}
                        min | {t("module.quality-assurance.serving")}:{" "}
                        {recipe.servingSize}{" "}
                      </p>{" "}
                    </div>{" "}
                    <div className="text-right">
                      {" "}
                      <div className="text-lg font-bold text-green-500">
                        {recipe.qualityScore}
                      </div>{" "}
                      <div className="text-xs text-foreground/60">
                        {t("module.quality-assurance.qualityScore")}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="mt-3 space-y-2">
                    {" "}
                    <div>
                      {" "}
                      <div className="flex justify-between text-xs mb-1">
                        {" "}
                        <span>
                          {t("module.quality-assurance.qualityScore")}
                        </span>{" "}
                        <span>{recipe.qualityScore}%</span>{" "}
                      </div>{" "}
                      <div className="h-2 bg-background rounded-full overflow-hidden">
                        {" "}
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${recipe.qualityScore}%` }}
                        />{" "}
                      </div>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <div className="flex justify-between text-xs mb-1">
                        {" "}
                        <span>
                          {t("module.quality-assurance.compliance")}
                        </span>{" "}
                        <span>{recipe.compliance}%</span>{" "}
                      </div>{" "}
                      <div className="h-2 bg-background rounded-full overflow-hidden">
                        {" "}
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${recipe.compliance}%` }}
                        />{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                  {expandedRecipe === recipe.id && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-sm">
                      {" "}
                      <p className="text-foreground/80">
                        {" "}
                        <span className="font-semibold">
                          {t("module.quality-assurance.lastUpdated")}:
                        </span>{" "}
                        {recipe.lastUpdated}{" "}
                      </p>{" "}
                      <p className="text-foreground/80">
                        {" "}
                        <span className="font-semibold">
                          {t("module.quality-assurance.status")}:
                        </span>
                        {""}{" "}
                        {recipe.compliance > 95
                          ? t("module.quality-assurance.fullyCompliant")
                          : recipe.compliance > 90
                            ? t("module.quality-assurance.monitor")
                            : t("module.quality-assurance.actionRequired")}{" "}
                      </p>{" "}
                    </div>
                  )}{" "}
                </div>
              ))}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Quality Checks */}{" "}
        <TabsContent value="checks" className="space-y-4 mt-4">
          {" "}
          <Card className="bg-background border-white/10">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>
                {t("module.quality-assurance.dailyQualityChecks")}
              </CardTitle>{" "}
              <CardDescription>
                {t("module.quality-assurance.recentQualityControl")}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-3">
              {" "}
              {QUALITY_CHECKS.map((check) => (
                <div
                  key={check.id}
                  className={cn("border rounded-lg p-4", {
                    "border-green-500/30 bg-green-500/10":
                      check.status === "pass",
                    "border-yellow-500/30 bg-yellow-500/10":
                      check.status === "review",
                    "border-red-500/30 bg-red-500/10": check.status === "fail",
                  })}
                >
                  {" "}
                  <div className="flex items-start justify-between mb-2">
                    {" "}
                    <div className="flex items-start gap-3 flex-1">
                      {" "}
                      {check.status === "pass" && (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                      )}{" "}
                      {check.status === "review" && (
                        <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                      )}{" "}
                      {check.status === "fail" && (
                        <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                      )}{" "}
                      <div className="flex-1">
                        {" "}
                        <p className="font-semibold text-foreground">
                          {check.item}
                        </p>{" "}
                        <p className="text-xs text-foreground/60 mt-1">
                          {check.category}
                        </p>{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="text-right text-xs text-foreground/60">
                      {" "}
                      <p>{check.timestamp}</p>{" "}
                      <p className="mt-1">{check.inspector}</p>{" "}
                    </div>{" "}
                  </div>{" "}
                  <p className="text-sm text-foreground/80 ml-8">
                    {check.notes}
                  </p>{" "}
                </div>
              ))}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Audit Trail */}{" "}
        <TabsContent value="audits" className="space-y-4 mt-4">
          {" "}
          <Card className="bg-background border-white/10">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>
                {t("module.quality-assurance.auditHistory")}
              </CardTitle>{" "}
              <CardDescription>
                {t("module.quality-assurance.completeQualityAudit")}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-3">
              {" "}
              {AUDIT_LOGS.map((log) => (
                <div
                  key={log.id}
                  className="border border-white/10 rounded-lg p-4"
                >
                  {" "}
                  <div className="flex justify-between items-start mb-3">
                    {" "}
                    <div>
                      {" "}
                      <p className="font-semibold text-foreground">
                        {log.date}
                      </p>{" "}
                      <p className="text-xs text-foreground/60 mt-1">
                        {" "}
                        {log.type === "daily"
                          ? t("module.quality-assurance.dailyAudit")
                          : log.type === "weekly"
                            ? t("module.quality-assurance.weeklyAudit")
                            : log.type === "monthly"
                              ? t("module.quality-assurance.monthlyAudit")
                              : t(
                                  "module.quality-assurance.incidentReport",
                                )}{" "}
                      </p>{" "}
                    </div>{" "}
                    <div className="text-right">
                      {" "}
                      <div className="text-2xl font-bold text-green-500">
                        {log.score}
                      </div>{" "}
                      <p className="text-xs text-foreground/60">
                        {t("module.quality-assurance.score")}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    {" "}
                    <div className="bg-background rounded p-2">
                      {" "}
                      <p className="text-foreground/60">
                        {t("module.quality-assurance.inspector")}
                      </p>{" "}
                      <p className="font-semibold text-foreground">
                        {log.inspector}
                      </p>{" "}
                    </div>{" "}
                    <div className="bg-background rounded p-2">
                      {" "}
                      <p className="text-foreground/60">
                        {t("module.quality-assurance.issues")}
                      </p>{" "}
                      <p className="font-semibold text-foreground">
                        {log.issues}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                  {log.correctionsDue.length > 0 && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded p-2">
                      {" "}
                      <p className="text-xs font-semibold text-orange-500 mb-1">
                        {t("module.quality-assurance.correctionsDue")}:
                      </p>{" "}
                      <ul className="space-y-1 text-xs text-foreground/80">
                        {" "}
                        {log.correctionsDue.map((correction, idx) => (
                          <li key={idx}>• {correction}</li>
                        ))}{" "}
                      </ul>{" "}
                    </div>
                  )}{" "}
                </div>
              ))}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
    </div>
  );
}
