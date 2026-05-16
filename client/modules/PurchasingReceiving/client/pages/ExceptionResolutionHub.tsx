import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Settings,
  Zap,
} from "lucide-react";
interface Exception {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  status: "open" | "auto_resolved" | "manual_resolved" | "escalated";
  autoResolutionAttempted: boolean;
  autoResolutionMethod?: string;
  referenceId?: string;
  createdAt: string;
}
interface ExceptionRule {
  id: string;
  exceptionType: string;
  condition: string;
  resolutionAction: string;
  enabled: boolean;
}
export default function ExceptionResolutionHub() {
  const [organizationId, setOrganizationId] = useState<string>("");
  const [outletId, setOutletId] = useState<string>("");
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [rules, setRules] = useState<ExceptionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoResolving, setAutoResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [showRuleModal, setShowRuleModal] = useState(false);
  useEffect(() => {
    initializeData();
  }, []);
  useEffect(() => {
    if (outletId && organizationId) {
      fetchExceptions();
    }
  }, [outletId, organizationId]);
  const initializeData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/inventory?limit=100");
      if (response.ok) {
        const data = await response.json();
        setOutlets(data.data || []);
        if (data.data && data.data.length > 0) {
          setOutletId(data.data[0].id);
        }
      }
    } catch (err) {
      setError("Failed to load outlets");
    } finally {
      setLoading(false);
    }
  };
  const fetchExceptions = async () => {
    try {
      const response = await fetch(
        `/api/exception-resolution/open/${organizationId}?outletId=${outletId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setExceptions(data);
      }
    } catch (err) {
      setError("Failed to fetch exceptions");
    }
  };
  const handleAutoResolve = async () => {
    try {
      setAutoResolving(true);
      const response = await fetch(
        `/api/exception-resolution/auto-resolve/${organizationId}/${outletId}`,
        { method: "POST" },
      );
      if (response.ok) {
        const result = await response.json();
        setError(null);
        await fetchExceptions();
      }
    } catch (err) {
      setError("Failed to auto-resolve exceptions");
    } finally {
      setAutoResolving(false);
    }
  };
  const handleResolveException = async (
    exceptionId: string,
    method: string,
  ) => {
    try {
      const response = await fetch("/api/exception-resolution/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exceptionId,
          resolutionMethod: method,
          notes: "Manually resolved",
        }),
      });
      if (response.ok) {
        await fetchExceptions();
      }
    } catch (err) {
      setError("Failed to resolve exception");
    }
  };
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-600 bg-red-50";
      case "high":
        return "text-orange-600 bg-orange-50";
      case "medium":
        return "text-yellow-600 bg-yellow-50";
      default:
        return "text-muted-foreground bg-surface";
    }
  };
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="w-5 h-5" />;
      case "high":
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };
  const criticalExceptions = exceptions.filter(
    (e) => e.severity === "critical",
  );
  const highExceptions = exceptions.filter((e) => e.severity === "high");
  const mediumExceptions = exceptions.filter((e) => e.severity === "medium");
  const lowExceptions = exceptions.filter((e) => e.severity === "low");
  const autoResolvedCount = exceptions.filter(
    (e) => e.autoResolutionAttempted,
  ).length;
  if (loading) {
    return (
      <main id="main-content" className="flex-1 overflow-auto">
        {" "}
        <div className="p-6 text-center">
          {" "}
          <p>Loading exception data...</p>{" "}
        </div>{" "}
      </main>
    );
  }
  return (
    <main id="main-content" className="flex-1 overflow-auto">
      {" "}
      <div className="p-6 space-y-6">
        {" "}
        {/* Header */}{" "}
        <div>
          {" "}
          <div className="flex items-center justify-between mb-2">
            {" "}
            <div className="flex items-center gap-3">
              {" "}
              <Zap className="w-8 h-8 text-orange-600" />{" "}
              <h1 className="text-3xl font-bold">
                Exception Resolution Hub
              </h1>{" "}
            </div>{" "}
            <Button
              onClick={handleAutoResolve}
              disabled={autoResolving || exceptions.length === 0}
            >
              {" "}
              <RefreshCw
                className={`w-4 h-4 mr-2 ${autoResolving ? "animate-spin" : ""}`}
              />{" "}
              {autoResolving ? "Resolving..." : "Auto-Resolve All"}{" "}
            </Button>{" "}
          </div>{" "}
          <p className="text-muted-foreground">
            {" "}
            Detect and automatically resolve business exceptions{" "}
          </p>{" "}
        </div>{" "}
        {error && (
          <Alert className="bg-red-50 border-red-200">
            {" "}
            <AlertCircle className="h-4 w-4 text-red-600" />{" "}
            <AlertDescription className="text-red-800">
              {" "}
              {error}{" "}
              <button
                onClick={() => setError(null)}
                className="ml-4 text-sm underline"
              >
                {" "}
                Dismiss{" "}
              </button>{" "}
            </AlertDescription>{" "}
          </Alert>
        )}{" "}
        {/* Outlet Selector */}{" "}
        <Card className="p-4">
          {" "}
          <label className="block text-sm font-medium mb-2">
            Select Outlet
          </label>{" "}
          <select
            value={outletId}
            onChange={(e) => setOutletId(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            {" "}
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {" "}
                {outlet.name}{" "}
              </option>
            ))}{" "}
          </select>{" "}
        </Card>{" "}
        {/* Key Metrics */}{" "}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {" "}
          <Card className="p-4">
            {" "}
            <p className="text-sm text-muted-foreground mb-1">
              Total Exceptions
            </p>{" "}
            <p className="text-3xl font-bold">{exceptions.length}</p>{" "}
          </Card>{" "}
          <Card className="p-4">
            {" "}
            <p className="text-sm text-muted-foreground mb-1">Critical</p>{" "}
            <p className="text-3xl font-bold text-red-600">
              {" "}
              {criticalExceptions.length}{" "}
            </p>{" "}
          </Card>{" "}
          <Card className="p-4">
            {" "}
            <p className="text-sm text-muted-foreground mb-1">
              High Priority
            </p>{" "}
            <p className="text-3xl font-bold text-orange-600">
              {" "}
              {highExceptions.length}{" "}
            </p>{" "}
          </Card>{" "}
          <Card className="p-4">
            {" "}
            <p className="text-sm text-muted-foreground mb-1">
              Auto-Resolved
            </p>{" "}
            <p className="text-3xl font-bold text-green-600">
              {autoResolvedCount}
            </p>{" "}
          </Card>{" "}
          <Card className="p-4">
            {" "}
            <p className="text-sm text-muted-foreground mb-1">
              Resolution Rate
            </p>{" "}
            <p className="text-3xl font-bold">
              {" "}
              {exceptions.length > 0
                ? Math.round((autoResolvedCount / exceptions.length) * 100)
                : 0}{" "}
              %{" "}
            </p>{" "}
          </Card>{" "}
        </div>{" "}
        {/* Main Tabs */}{" "}
        <Tabs defaultValue="exceptions" className="w-full">
          {" "}
          <TabsList className="grid w-full grid-cols-3">
            {" "}
            <TabsTrigger value="exceptions">
              {" "}
              Exceptions ({exceptions.length}){" "}
            </TabsTrigger>{" "}
            <TabsTrigger value="rules">Rules</TabsTrigger>{" "}
            <TabsTrigger value="settings">Settings</TabsTrigger>{" "}
          </TabsList>{" "}
          {/* Exceptions Tab */}{" "}
          <TabsContent value="exceptions" className="space-y-4">
            {" "}
            {exceptions.length === 0 ? (
              <Alert>
                {" "}
                <CheckCircle2 className="h-4 w-4 text-green-600" />{" "}
                <AlertDescription>
                  {" "}
                  No exceptions detected. All systems operating normally.{" "}
                </AlertDescription>{" "}
              </Alert>
            ) : (
              <div className="space-y-4">
                {" "}
                {criticalExceptions.length > 0 && (
                  <div className="space-y-2">
                    {" "}
                    <h3 className="font-semibold text-red-700">
                      {" "}
                      Critical Exceptions ({criticalExceptions.length}){" "}
                    </h3>{" "}
                    {criticalExceptions.map((exc) => (
                      <ExceptionCard
                        key={exc.id}
                        exception={exc}
                        onResolve={handleResolveException}
                      />
                    ))}{" "}
                  </div>
                )}{" "}
                {highExceptions.length > 0 && (
                  <div className="space-y-2">
                    {" "}
                    <h3 className="font-semibold text-orange-700">
                      {" "}
                      High Priority ({highExceptions.length}){" "}
                    </h3>{" "}
                    {highExceptions.map((exc) => (
                      <ExceptionCard
                        key={exc.id}
                        exception={exc}
                        onResolve={handleResolveException}
                      />
                    ))}{" "}
                  </div>
                )}{" "}
                {mediumExceptions.length > 0 && (
                  <details>
                    {" "}
                    <summary className="cursor-pointer font-semibold text-yellow-700">
                      {" "}
                      Medium Priority ({mediumExceptions.length}){" "}
                    </summary>{" "}
                    <div className="space-y-2 mt-2">
                      {" "}
                      {mediumExceptions.map((exc) => (
                        <ExceptionCard
                          key={exc.id}
                          exception={exc}
                          onResolve={handleResolveException}
                        />
                      ))}{" "}
                    </div>{" "}
                  </details>
                )}{" "}
                {lowExceptions.length > 0 && (
                  <details>
                    {" "}
                    <summary className="cursor-pointer font-semibold text-foreground">
                      {" "}
                      Low Priority ({lowExceptions.length}){" "}
                    </summary>{" "}
                    <div className="space-y-2 mt-2">
                      {" "}
                      {lowExceptions.map((exc) => (
                        <ExceptionCard
                          key={exc.id}
                          exception={exc}
                          onResolve={handleResolveException}
                        />
                      ))}{" "}
                    </div>{" "}
                  </details>
                )}{" "}
              </div>
            )}{" "}
          </TabsContent>{" "}
          {/* Rules Tab */}{" "}
          <TabsContent value="rules" className="space-y-4">
            {" "}
            <div className="flex gap-2 mb-4">
              {" "}
              <Button onClick={() => setShowRuleModal(true)}>
                {" "}
                + Add Rule{" "}
              </Button>{" "}
            </div>{" "}
            <Card className="p-4 bg-blue-50 border-blue-200">
              {" "}
              <div className="flex items-center gap-2 mb-2">
                {" "}
                <Settings className="w-5 h-5 text-primary" />{" "}
                <h3 className="font-semibold text-blue-900">
                  Auto-Resolution Rules
                </h3>{" "}
              </div>{" "}
              <p className="text-sm text-blue-800">
                {" "}
                Configure rules for automatically resolving specific exception
                types{" "}
              </p>{" "}
            </Card>{" "}
            {rules.length === 0 ? (
              <Alert>
                {" "}
                <AlertCircle className="h-4 w-4" />{" "}
                <AlertDescription>
                  {" "}
                  No rules configured. Create rules to enable automatic
                  exception resolution.{" "}
                </AlertDescription>{" "}
              </Alert>
            ) : (
              <div className="space-y-2">
                {" "}
                {rules.map((rule) => (
                  <Card key={rule.id} className="p-3">
                    {" "}
                    <div className="flex items-start justify-between">
                      {" "}
                      <div>
                        {" "}
                        <p className="font-semibold">
                          {rule.exceptionType}
                        </p>{" "}
                        <p className="text-sm text-muted-foreground">
                          {rule.condition}
                        </p>{" "}
                        <p className="text-sm text-primary mt-1">
                          {" "}
                          Action: {rule.resolutionAction}{" "}
                        </p>{" "}
                      </div>{" "}
                      <div className="flex items-center gap-2">
                        {" "}
                        {rule.enabled && (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        )}{" "}
                      </div>{" "}
                    </div>{" "}
                  </Card>
                ))}{" "}
              </div>
            )}{" "}
          </TabsContent>{" "}
          {/* Settings Tab */}{" "}
          <TabsContent value="settings" className="space-y-4">
            {" "}
            <Card className="p-6">
              {" "}
              <h3 className="font-semibold mb-4">Variance Thresholds</h3>{" "}
              <div className="space-y-4">
                {" "}
                <div>
                  {" "}
                  <label className="block text-sm font-medium mb-1">
                    {" "}
                    Price Variance Threshold (%){" "}
                  </label>{" "}
                  <input
                    type="number"
                    defaultValue="5"
                    className="w-full px-3 py-2 border rounded-md"
                  />{" "}
                  <p className="text-xs text-muted-foreground mt-1">
                    {" "}
                    Triggers exception if price variance exceeds this
                    percentage{" "}
                  </p>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="block text-sm font-medium mb-1">
                    {" "}
                    Quantity Variance Threshold (%){" "}
                  </label>{" "}
                  <input
                    type="number"
                    defaultValue="2"
                    className="w-full px-3 py-2 border rounded-md"
                  />{" "}
                  <p className="text-xs text-muted-foreground mt-1">
                    {" "}
                    Triggers exception if quantity variance exceeds this
                    percentage{" "}
                  </p>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="block text-sm font-medium mb-1">
                    {" "}
                    Deadline Buffer (Days){" "}
                  </label>{" "}
                  <input
                    type="number"
                    defaultValue="1"
                    className="w-full px-3 py-2 border rounded-md"
                  />{" "}
                  <p className="text-xs text-muted-foreground mt-1">
                    {" "}
                    Number of days before deadline to trigger alert{" "}
                  </p>{" "}
                </div>{" "}
                <Button className="w-full">Save Thresholds</Button>{" "}
              </div>{" "}
            </Card>{" "}
            <Card className="p-6">
              {" "}
              <h3 className="font-semibold mb-4">
                Auto-Resolution Settings
              </h3>{" "}
              <div className="space-y-3">
                {" "}
                <label className="flex items-center gap-2">
                  {" "}
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4"
                  />{" "}
                  <span>Enable automatic exception detection</span>{" "}
                </label>{" "}
                <label className="flex items-center gap-2">
                  {" "}
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4"
                  />{" "}
                  <span>
                    Enable automatic resolution for low-severity exceptions
                  </span>{" "}
                </label>{" "}
                <label className="flex items-center gap-2">
                  {" "}
                  <input type="checkbox" className="w-4 h-4" />{" "}
                  <span>Escalate unresolved critical exceptions</span>{" "}
                </label>{" "}
              </div>{" "}
            </Card>{" "}
          </TabsContent>{" "}
        </Tabs>{" "}
      </div>{" "}
    </main>
  );
}
function ExceptionCard({
  exception,
  onResolve,
}: {
  exception: Exception;
  onResolve: (id: string, method: string) => void;
}) {
  return (
    <Card
      className={`p-4 border-l-4 ${exception.severity === "critical" ? "border-l-red-500 bg-red-50" : exception.severity === "high" ? "border-l-orange-500 bg-orange-50" : exception.severity === "medium" ? "border-l-yellow-500 bg-yellow-50" : "border-l-gray-500 bg-surface"}`}
    >
      {" "}
      <div className="flex items-start justify-between">
        {" "}
        <div className="flex-1">
          {" "}
          <div className="flex items-center gap-2 mb-1">
            {" "}
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${exception.severity === "critical" ? "bg-red-200 text-red-800" : exception.severity === "high" ? "bg-orange-200 text-orange-800" : exception.severity === "medium" ? "bg-yellow-200 text-yellow-800" : "bg-surface text-gray-800"}`}
            >
              {" "}
              {exception.severity.toUpperCase()}{" "}
            </span>{" "}
            <span className="text-xs font-medium text-muted-foreground">
              {" "}
              {exception.type}{" "}
            </span>{" "}
          </div>{" "}
          <p className="font-semibold">{exception.description}</p>{" "}
          <p className="text-sm text-muted-foreground mt-1">
            {" "}
            {new Date(exception.createdAt).toLocaleString()}{" "}
          </p>{" "}
          {exception.autoResolutionAttempted && (
            <p className="text-xs text-green-600 mt-1">
              {" "}
              ✓ Auto-resolved: {exception.autoResolutionMethod}{" "}
            </p>
          )}{" "}
        </div>{" "}
        {exception.status === "open" && (
          <div className="flex gap-2 ml-4">
            {" "}
            <Button size="sm" onClick={() => onResolve(exception.id, "auto")}>
              {" "}
              Resolve{" "}
            </Button>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </Card>
  );
}
