/** * Frontend Audit Dashboard * Real-time audit readiness status, findings tracker, compliance monitoring * Comprehensive UI for audit intelligence and compliance management */ import React, {
  useState,
  useEffect,
} from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
interface AuditReadinessData {
  score: number;
  status:
    | "excellent"
    | "good"
    | "adequate"
    | "needs_improvement"
    | "at_risk"
    | "critical";
  components: {
    glReconciliation: number;
    documentation: number;
    controlTesting: number;
    compliance: number;
    disclosure: number;
    estimates: number;
  };
  daysToAudit: number;
  openExceptions: number;
  criticalExceptions: number;
}
interface AuditFinding {
  findingId: string;
  title: string;
  severity:
    | "observation"
    | "finding"
    | "significant_deficiency"
    | "material_weakness";
  status: "open" | "in_progress" | "remediated";
  dueDate: string;
  owner: string;
  description: string;
}
export function AuditDashboard() {
  const navigate = useNavigate();
  const [readinessData, setReadinessData] = useState<AuditReadinessData>({
    score: 78,
    status: "adequate",
    components: {
      glReconciliation: 85,
      documentation: 92,
      controlTesting: 62,
      compliance: 75,
      disclosure: 80,
      estimates: 70,
    },
    daysToAudit: 21,
    openExceptions: 7,
    criticalExceptions: 1,
  });
  const [findings, setFindings] = useState<AuditFinding[]>([
    {
      findingId: "F-001",
      title: "GL Reconciliation Process Enhancement",
      severity: "finding",
      status: "in_progress",
      dueDate: "2024-02-15",
      owner: "Accounting Manager",
      description:
        "Several GL accounts show month-end reconciliation delays exceeding 5 days",
    },
    {
      findingId: "F-002",
      title: "Control Testing Documentation Gap",
      severity: "significant_deficiency",
      status: "open",
      dueDate: "2024-02-28",
      owner: "Internal Audit",
      description: "Missing evidence documentation for 3 control procedures",
    },
  ]);
  const getReadinessColor = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 80) return "bg-primary";
    if (score >= 70) return "bg-yellow-500";
    if (score >= 60) return "bg-orange-500";
    return "bg-red-500";
  };
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "material_weakness":
        return "border-l-4 border-l-red-500 bg-red-50";
      case "significant_deficiency":
        return "border-l-4 border-l-orange-500 bg-orange-50";
      case "finding":
        return "border-l-4 border-l-yellow-500 bg-yellow-50";
      default:
        return "border-l-4 border-l-blue-500 bg-blue-50";
    }
  };
  return (
    <PageLayout>
      {" "}
      <div className="mr-auto ml-10 max-w-7xl overflow-hidden px-6 py-8 sm:px-10">
        {" "}
        <div className="space-y-6">
          {" "}
          {/* Page Header */}{" "}
          <div className="space-y-2">
            {" "}
            <h1 className="text-3xl font-bold text-foreground">
              {" "}
              Audit Intelligence Dashboard{" "}
            </h1>{" "}
            <p className="text-muted-foreground">
              {" "}
              Real-time monitoring of audit preparation status and compliance
              controls{" "}
            </p>{" "}
          </div>{" "}
          {/* Audit Readiness Alert */}{" "}
          {readinessData.criticalExceptions > 0 && (
            <Alert className="border-red-300 bg-red-50">
              {" "}
              <AlertTriangle className="h-4 w-4 text-red-600" />{" "}
              <AlertTitle className="text-red-600">
                {" "}
                Critical Issues Identified{" "}
              </AlertTitle>{" "}
              <AlertDescription className="text-red-700">
                {" "}
                {readinessData.criticalExceptions} critical audit exceptions
                require immediate attention{" "}
              </AlertDescription>{" "}
            </Alert>
          )}{" "}
          {/* Readiness Score Overview */}{" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="flex items-center gap-2">
                {" "}
                <TrendingUp className="h-5 w-5" /> Audit Readiness Score{" "}
              </CardTitle>{" "}
              <CardDescription>
                {" "}
                Overall preparation status for audit{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-6">
              {" "}
              {/* Main Score Display */}{" "}
              <div className="flex items-center gap-8">
                {" "}
                <div className="flex-shrink-0">
                  {" "}
                  <div className="relative h-32 w-32">
                    {" "}
                    <div
                      className={`absolute inset-0 rounded-full ${getReadinessColor(readinessData.score)}`}
                    />{" "}
                    <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
                      {" "}
                      <div className="text-center">
                        {" "}
                        <div className="text-4xl font-bold">
                          {" "}
                          {readinessData.score}{" "}
                        </div>{" "}
                        <div className="text-xs text-muted-foreground">
                          out of 100
                        </div>{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="flex-1 space-y-4">
                  {" "}
                  <div>
                    {" "}
                    <p className="text-sm font-medium text-foreground">
                      Status
                    </p>{" "}
                    <p className="text-lg capitalize font-semibold text-foreground">
                      {" "}
                      {readinessData.status}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-sm font-medium text-foreground">
                      {" "}
                      Days to Audit Start{" "}
                    </p>{" "}
                    <p className="text-lg font-semibold text-foreground flex items-center gap-2">
                      {" "}
                      <Clock className="h-4 w-4" /> {readinessData.daysToAudit}
                      {""} days{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-sm font-medium text-foreground">
                      {" "}
                      Open Exceptions{" "}
                    </p>{" "}
                    <p className="text-lg font-semibold text-foreground">
                      {" "}
                      {readinessData.openExceptions} total ({" "}
                      {readinessData.criticalExceptions} critical){" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              {/* Component Scores */}{" "}
              <div className="space-y-4">
                {" "}
                <h3 className="font-semibold text-foreground">
                  {" "}
                  Component Breakdown{" "}
                </h3>{" "}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {" "}
                  {Object.entries(readinessData.components).map(
                    ([key, value]) => (
                      <div key={key} className="space-y-2">
                        {" "}
                        <div className="flex justify-between text-sm">
                          {" "}
                          <span className="capitalize font-medium text-foreground">
                            {" "}
                            {key.replace(/([A-Z])/g, " $1")}{" "}
                          </span>{" "}
                          <span className="font-semibold text-foreground">
                            {" "}
                            {value}%{" "}
                          </span>{" "}
                        </div>{" "}
                        <div className="w-full bg-surface rounded-full h-2">
                          {" "}
                          <div
                            className={`h-2 rounded-full ${getReadinessColor(value)}`}
                            style={{ width: `${value}%` }}
                          />{" "}
                        </div>{" "}
                      </div>
                    ),
                  )}{" "}
                </div>{" "}
              </div>{" "}
              {/* Action Buttons */}{" "}
              <div className="flex flex-wrap gap-3 pt-4">
                {" "}
                <Button
                  onClick={() => navigate("/audit/reconciliation")}
                  variant="outline"
                >
                  {" "}
                  GL Reconciliation{" "}
                </Button>{" "}
                <Button
                  onClick={() => navigate("/audit/control-testing")}
                  variant="outline"
                >
                  {" "}
                  Control Testing{" "}
                </Button>{" "}
                <Button
                  onClick={() => navigate("/audit/compliance")}
                  variant="outline"
                >
                  {" "}
                  Compliance Status{" "}
                </Button>{" "}
                <Button
                  onClick={() => navigate("/audit/disclosures")}
                  variant="outline"
                >
                  {" "}
                  Disclosures{" "}
                </Button>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          {/* Tabs for Different Views */}{" "}
          <Tabs defaultValue="findings" className="space-y-4">
            {" "}
            <TabsList className="grid w-full grid-cols-4">
              {" "}
              <TabsTrigger value="findings">Findings</TabsTrigger>{" "}
              <TabsTrigger value="procedures">Procedures</TabsTrigger>{" "}
              <TabsTrigger value="monitoring">Monitoring</TabsTrigger>{" "}
              <TabsTrigger value="reports">Reports</TabsTrigger>{" "}
            </TabsList>{" "}
            {/* Findings Tab */}{" "}
            <TabsContent value="findings" className="space-y-4">
              {" "}
              <Card>
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle>Audit Findings Tracker</CardTitle>{" "}
                  <CardDescription>
                    {" "}
                    Current period findings and remediation status{" "}
                  </CardDescription>{" "}
                </CardHeader>{" "}
                <CardContent className="space-y-3">
                  {" "}
                  {findings.length === 0 ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-8">
                      {" "}
                      <CheckCircle2 className="h-5 w-5 text-green-500" />{" "}
                      <p>No open findings</p>{" "}
                    </div>
                  ) : (
                    findings.map((finding) => (
                      <div
                        key={finding.findingId}
                        className={`p-4 rounded-lg ${getSeverityColor(finding.severity)}`}
                      >
                        {" "}
                        <div className="flex items-start justify-between">
                          {" "}
                          <div className="flex-1">
                            {" "}
                            <h4 className="font-semibold text-foreground">
                              {" "}
                              {finding.title}{" "}
                            </h4>{" "}
                            <p className="text-sm text-muted-foreground mt-1">
                              {" "}
                              {finding.description}{" "}
                            </p>{" "}
                            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                              {" "}
                              <span>Owner: {finding.owner}</span>{" "}
                              <span>Due: {finding.dueDate}</span>{" "}
                            </div>{" "}
                          </div>{" "}
                          <div className="flex-shrink-0">
                            {" "}
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${finding.status === "remediated" ? "bg-green-100 text-green-800" : finding.status === "in_progress" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"}`}
                            >
                              {" "}
                              {finding.status}{" "}
                            </span>{" "}
                          </div>{" "}
                        </div>{" "}
                      </div>
                    ))
                  )}{" "}
                </CardContent>{" "}
              </Card>{" "}
              {/* Prior Year Findings */}{" "}
              <Card>
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle className="text-lg">
                    {" "}
                    Prior Year Findings Status{" "}
                  </CardTitle>{" "}
                </CardHeader>{" "}
                <CardContent className="space-y-3">
                  {" "}
                  <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                    {" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <CheckCircle2 className="h-5 w-5 text-green-600" />{" "}
                      <div>
                        {" "}
                        <p className="font-semibold text-green-900">
                          {" "}
                          AR Aging Control Enhancement{" "}
                        </p>{" "}
                        <p className="text-sm text-green-700">
                          {" "}
                          Remediated: New aging analysis implemented{" "}
                        </p>{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                </CardContent>{" "}
              </Card>{" "}
            </TabsContent>{" "}
            {/* Procedures Tab */}{" "}
            <TabsContent value="procedures" className="space-y-4">
              {" "}
              <Card>
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle>Audit Procedures Status</CardTitle>{" "}
                  <CardDescription>
                    {" "}
                    Progress on substantive and control testing procedures{" "}
                  </CardDescription>{" "}
                </CardHeader>{" "}
                <CardContent className="space-y-4">
                  {" "}
                  <div className="space-y-3">
                    {" "}
                    {[
                      {
                        name: "Journal Entry Testing",
                        progress: 90,
                        status: "in_progress",
                      },
                      {
                        name: "AR Reconciliation",
                        progress: 100,
                        status: "completed",
                      },
                      {
                        name: "Inventory Count Observation",
                        progress: 0,
                        status: "not_started",
                      },
                      {
                        name: "Fixed Assets Verification",
                        progress: 75,
                        status: "in_progress",
                      },
                      {
                        name: "Litigation Review",
                        progress: 100,
                        status: "completed",
                      },
                      {
                        name: "Subsequent Events",
                        progress: 50,
                        status: "in_progress",
                      },
                    ].map((proc, i) => (
                      <div key={i} className="space-y-1">
                        {" "}
                        <div className="flex justify-between text-sm">
                          {" "}
                          <span className="font-medium text-foreground">
                            {" "}
                            {proc.name}{" "}
                          </span>{" "}
                          <span className="text-xs font-semibold">
                            {" "}
                            {proc.progress}%{" "}
                          </span>{" "}
                        </div>{" "}
                        <div className="w-full bg-surface rounded-full h-2">
                          {" "}
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${proc.progress}%` }}
                          />{" "}
                        </div>{" "}
                      </div>
                    ))}{" "}
                  </div>{" "}
                </CardContent>{" "}
              </Card>{" "}
            </TabsContent>{" "}
            {/* Monitoring Tab */}{" "}
            <TabsContent value="monitoring" className="space-y-4">
              {" "}
              <Card>
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle>Real-Time Monitoring</CardTitle>{" "}
                  <CardDescription>
                    {" "}
                    Continuous audit and compliance tracking{" "}
                  </CardDescription>{" "}
                </CardHeader>{" "}
                <CardContent className="space-y-4">
                  {" "}
                  <div className="grid gap-4 md:grid-cols-2">
                    {" "}
                    <div className="p-4 border rounded-lg space-y-2">
                      {" "}
                      <p className="text-sm font-medium text-foreground">
                        {" "}
                        GL Entries Posted{" "}
                      </p>{" "}
                      <p className="text-2xl font-bold text-foreground">
                        847
                      </p>{" "}
                      <p className="text-xs text-muted-foreground">
                        24-hour period
                      </p>{" "}
                    </div>{" "}
                    <div className="p-4 border rounded-lg space-y-2">
                      {" "}
                      <p className="text-sm font-medium text-foreground">
                        {" "}
                        Outstanding Approvals{" "}
                      </p>{" "}
                      <p className="text-2xl font-bold text-orange-600">
                        23
                      </p>{" "}
                      <p className="text-xs text-muted-foreground">
                        {" "}
                        Requires attention{" "}
                      </p>{" "}
                    </div>{" "}
                    <div className="p-4 border rounded-lg space-y-2">
                      {" "}
                      <p className="text-sm font-medium text-foreground">
                        {" "}
                        SOD Violations{" "}
                      </p>{" "}
                      <p className="text-2xl font-bold text-red-600">2</p>{" "}
                      <p className="text-xs text-muted-foreground">
                        Active
                      </p>{" "}
                    </div>{" "}
                    <div className="p-4 border rounded-lg space-y-2">
                      {" "}
                      <p className="text-sm font-medium text-foreground">
                        {" "}
                        Fraud Indicators{" "}
                      </p>{" "}
                      <p className="text-2xl font-bold text-yellow-600">
                        5
                      </p>{" "}
                      <p className="text-xs text-muted-foreground">
                        {" "}
                        Flagged for review{" "}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                  {/* Action Buttons for Monitoring */}{" "}
                  <div className="flex flex-wrap gap-3 pt-4">
                    {" "}
                    <Button
                      onClick={() => navigate("/audit/fraud-monitoring")}
                      variant="outline"
                      size="sm"
                    >
                      {" "}
                      View Fraud Alerts{" "}
                    </Button>{" "}
                    <Button
                      onClick={() => navigate("/audit/sod-violations")}
                      variant="outline"
                      size="sm"
                    >
                      {" "}
                      View SOD Violations{" "}
                    </Button>{" "}
                    <Button
                      onClick={() => navigate("/audit/gl-monitoring")}
                      variant="outline"
                      size="sm"
                    >
                      {" "}
                      GL Activity Monitor{" "}
                    </Button>{" "}
                  </div>{" "}
                </CardContent>{" "}
              </Card>{" "}
            </TabsContent>{" "}
            {/* Reports Tab */}{" "}
            <TabsContent value="reports" className="space-y-4">
              {" "}
              <Card>
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle>Audit Reports</CardTitle>{" "}
                  <CardDescription>
                    {" "}
                    Generate and manage audit documentation{" "}
                  </CardDescription>{" "}
                </CardHeader>{" "}
                <CardContent className="space-y-4">
                  {" "}
                  <div className="space-y-3">
                    {" "}
                    {[
                      {
                        title: "Management Representation Letter",
                        available: true,
                      },
                      { title: "Audit Workpaper Index", available: true },
                      {
                        title: "Financial Statement Disclosure Checklist",
                        available: true,
                      },
                      {
                        title: "Audit Committee Communication Letter",
                        available: false,
                      },
                      { title: "SOX 404 Compliance Report", available: true },
                    ].map((report, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-surface"
                      >
                        {" "}
                        <span className="font-medium text-foreground">
                          {" "}
                          {report.title}{" "}
                        </span>{" "}
                        <Button
                          onClick={() =>
                            report.available &&
                            alert(
                              `Report: ${report.title} - Feature coming soon`,
                            )
                          }
                          size="sm"
                          disabled={!report.available}
                        >
                          {" "}
                          {report.available
                            ? "Generate / View"
                            : "Not Ready"}{" "}
                        </Button>{" "}
                      </div>
                    ))}{" "}
                  </div>{" "}
                </CardContent>{" "}
              </Card>{" "}
            </TabsContent>{" "}
          </Tabs>{" "}
          {/* Upcoming Deadlines */}{" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="flex items-center gap-2">
                {" "}
                <Clock className="h-5 w-5" /> Upcoming Audit Milestones{" "}
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="space-y-3">
                {" "}
                {[
                  {
                    date: "Feb 15, 2024",
                    task: "Complete GL Reconciliation",
                    days: 5,
                  },
                  {
                    date: "Feb 20, 2024",
                    task: "Control Testing Completion",
                    days: 10,
                  },
                  {
                    date: "Feb 28, 2024",
                    task: "Financial Statement Disclosure Review",
                    days: 18,
                  },
                  {
                    date: "Mar 5, 2024",
                    task: "Audit Committee Presentation",
                    days: 23,
                  },
                ].map((milestone, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    {" "}
                    <div>
                      {" "}
                      <p className="font-medium text-foreground">
                        {" "}
                        {milestone.task}{" "}
                      </p>{" "}
                      <p className="text-sm text-muted-foreground">
                        {milestone.date}
                      </p>{" "}
                    </div>{" "}
                    <span
                      className={`text-sm font-semibold ${milestone.days <= 5 ? "text-red-600" : milestone.days <= 15 ? "text-orange-600" : "text-green-600"}`}
                    >
                      {" "}
                      {milestone.days} days{" "}
                    </span>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>{" "}
      </div>{" "}
    </PageLayout>
  );
}
export default AuditDashboard;
