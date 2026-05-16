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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Check,
  Clock,
  Settings,
  Activity,
  TrendingUp,
} from "lucide-react";
interface GLAccountSetting {
  code: string;
  name: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  highRiskAccount: boolean;
  requiresCostCenter: boolean;
  requiresDepartment: boolean;
  largeAmountThreshold: number;
  maxDailyAmount: number;
  maxMonthlyAmount: number;
  alertsEnabled: boolean;
  alertRecipients: string[];
}
interface PhoenixThreshold {
  largeAmountThreshold: number;
  largeAmountRiskScore: number;
  offHoursRiskScore: number;
  unknownVendorRiskScore: number;
  highRiskAccountScore: number;
  rapidSuccessionScore: number;
  roundNumberScore: number;
  globalRiskThreshold: number;
}
interface GuardianStatus {
  system: "healthy" | "warning" | "critical";
  uptime: string;
  totalTransactions24h: number;
  passedTransactions: number;
  warningTransactions: number;
  blockedTransactions: number;
  avgLatency: number;
  cacheHitRate: number;
}
interface HighRiskAlert {
  id: string;
  transactionId: string;
  amount: number;
  riskScore: number;
  timestamp: string;
  actor: string;
  anomalies: string[];
  status: "new" | "reviewed" | "resolved";
}
export function GuardianAdminDashboard() {
  const [activeTab, setActiveTab] = useState<
    "status" | "settings" | "alerts" | "accounts"
  >("status");
  const [guardianStatus, setGuardianStatus] = useState<GuardianStatus>({
    system: "healthy",
    uptime: "45 days, 23 hours",
    totalTransactions24h: 1247,
    passedTransactions: 1158,
    warningTransactions: 87,
    blockedTransactions: 2,
    avgLatency: 213,
    cacheHitRate: 78.4,
  });
  const [glAccounts, setGLAccounts] = useState<GLAccountSetting[]>([
    {
      code: "1010",
      name: "Bank Account",
      riskLevel: "high",
      highRiskAccount: true,
      requiresCostCenter: false,
      requiresDepartment: false,
      largeAmountThreshold: 2.0,
      maxDailyAmount: 500000,
      maxMonthlyAmount: 2000000,
      alertsEnabled: true,
      alertRecipients: ["controller@hotel.com", "cfo@hotel.com"],
    },
    {
      code: "4000",
      name: "Room Revenue",
      riskLevel: "low",
      highRiskAccount: false,
      requiresCostCenter: false,
      requiresDepartment: false,
      largeAmountThreshold: 2.0,
      maxDailyAmount: 0,
      maxMonthlyAmount: 0,
      alertsEnabled: false,
      alertRecipients: [],
    },
    {
      code: "6000",
      name: "Payroll Expense",
      riskLevel: "medium",
      highRiskAccount: false,
      requiresCostCenter: true,
      requiresDepartment: true,
      largeAmountThreshold: 2.0,
      maxDailyAmount: 0,
      maxMonthlyAmount: 0,
      alertsEnabled: false,
      alertRecipients: [],
    },
  ]);
  const [phoenixSettings, setPhoenixSettings] = useState<PhoenixThreshold>({
    largeAmountThreshold: 2.0,
    largeAmountRiskScore: 15,
    offHoursRiskScore: 10,
    unknownVendorRiskScore: 20,
    highRiskAccountScore: 25,
    rapidSuccessionScore: 30,
    roundNumberScore: 5,
    globalRiskThreshold: 60,
  });
  const [highRiskAlerts, setHighRiskAlerts] = useState<HighRiskAlert[]>([
    {
      id: "alert-1",
      transactionId: "je-001",
      amount: 50000,
      riskScore: 72,
      timestamp: "2024-01-15T10:30:00Z",
      actor: "sarah.johnson@hotel.com",
      anomalies: ["Large Amount", "Off-hours Posting", "High-Risk Account"],
      status: "new",
    },
    {
      id: "alert-2",
      transactionId: "inv-001",
      amount: 15000,
      riskScore: 68,
      timestamp: "2024-01-15T09:15:00Z",
      actor: "mike.chen@hotel.com",
      anomalies: ["Unknown Vendor", "Large Amount"],
      status: "reviewed",
    },
  ]);
  const [selectedAccount, setSelectedAccount] =
    useState<GLAccountSetting | null>(glAccounts[0]);
  const [editingAccount, setEditingAccount] = useState(false);
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      healthy: "bg-green-50 border-green-200 text-green-900",
      warning: "bg-yellow-50 border-yellow-200 text-yellow-900",
      critical: "bg-red-50 border-red-200 text-red-900",
      new: "bg-red-100 text-red-900",
      reviewed: "bg-yellow-100 text-yellow-900",
      resolved: "bg-green-100 text-green-900",
    };
    return colors[status] || "bg-surface border-gray-200 text-gray-900";
  };
  const getRiskLevelBadge = (level: string) => {
    const badges: Record<string, string> = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    };
    return badges[level] || "bg-surface text-gray-800";
  };
  const calculatePassRate = () => {
    const total = guardianStatus.totalTransactions24h;
    return total > 0
      ? ((guardianStatus.passedTransactions / total) * 100).toFixed(1)
      : "0.0";
  };
  const handleAccountSave = () => {
    if (selectedAccount) {
      setGLAccounts(
        glAccounts.map((acc) =>
          acc.code === selectedAccount.code ? selectedAccount : acc,
        ),
      );
      setEditingAccount(false);
    }
  };
  const handlePhoenixSettingChange = (
    key: keyof PhoenixThreshold,
    value: any,
  ) => {
    setPhoenixSettings({
      ...phoenixSettings,
      [key]: typeof value === "string" ? parseFloat(value) : value,
    });
  };
  const handleAlertStatusChange = (
    alertId: string,
    newStatus: "new" | "reviewed" | "resolved",
  ) => {
    setHighRiskAlerts(
      highRiskAlerts.map((alert) =>
        alert.id === alertId ? { ...alert, status: newStatus } : alert,
      ),
    );
  };
  return (
    <div className="w-full space-y-6 p-6 bg-surface">
      {" "}
      {/* Header */}{" "}
      <div>
        {" "}
        <h1 className="text-3xl font-bold text-gray-900">
          Guardian Admin Dashboard
        </h1>{" "}
        <p className="text-muted-foreground mt-2">
          Configure, monitor, and manage the Guardian system
        </p>{" "}
      </div>{" "}
      {/* Main Tabs */}{" "}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as any)}
        className="w-full"
      >
        {" "}
        <TabsList className="grid w-full grid-cols-4">
          {" "}
          <TabsTrigger value="status" className="flex items-center gap-2">
            {" "}
            <Activity className="w-4 h-4" /> Status{" "}
          </TabsTrigger>{" "}
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            {" "}
            <Settings className="w-4 h-4" /> GL Accounts{" "}
          </TabsTrigger>{" "}
          <TabsTrigger value="settings" className="flex items-center gap-2">
            {" "}
            <TrendingUp className="w-4 h-4" /> Phoenix Settings{" "}
          </TabsTrigger>{" "}
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            {" "}
            <AlertCircle className="w-4 h-4" /> High-Risk Alerts{" "}
          </TabsTrigger>{" "}
        </TabsList>{" "}
        {/* STATUS TAB */}{" "}
        <TabsContent value="status" className="space-y-6">
          {" "}
          {/* System Status */}{" "}
          <Card className={`border-2 ${getStatusColor(guardianStatus.system)}`}>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="flex items-center gap-2">
                {" "}
                {guardianStatus.system === "healthy" ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : guardianStatus.system === "warning" ? (
                  <Clock className="w-5 h-5 text-yellow-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}{" "}
                System Status: {guardianStatus.system.toUpperCase()}{" "}
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent className="grid grid-cols-3 gap-4">
              {" "}
              <div>
                {" "}
                <p className="text-sm font-medium">Uptime</p>{" "}
                <p className="text-lg font-bold">
                  {guardianStatus.uptime}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="text-sm font-medium">Average Latency</p>{" "}
                <p className="text-lg font-bold">
                  {guardianStatus.avgLatency}ms
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="text-sm font-medium">Cache Hit Rate</p>{" "}
                <p className="text-lg font-bold">
                  {guardianStatus.cacheHitRate.toFixed(1)}%
                </p>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          {/* Transaction Statistics */}{" "}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {" "}
            <Card>
              {" "}
              <CardHeader className="pb-3">
                {" "}
                <CardTitle className="text-sm font-medium">
                  Total Transactions (24h)
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <p className="text-3xl font-bold">
                  {guardianStatus.totalTransactions24h.toLocaleString()}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="border-green-200 bg-green-50">
              {" "}
              <CardHeader className="pb-3">
                {" "}
                <CardTitle className="text-sm font-medium text-green-900">
                  Passed
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <p className="text-3xl font-bold text-green-900">
                  {guardianStatus.passedTransactions.toLocaleString()}
                </p>{" "}
                <p className="text-xs text-green-700">
                  {calculatePassRate()}% pass rate
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="border-yellow-200 bg-yellow-50">
              {" "}
              <CardHeader className="pb-3">
                {" "}
                <CardTitle className="text-sm font-medium text-yellow-900">
                  Warnings
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <p className="text-3xl font-bold text-yellow-900">
                  {guardianStatus.warningTransactions.toLocaleString()}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="border-red-200 bg-red-50">
              {" "}
              <CardHeader className="pb-3">
                {" "}
                <CardTitle className="text-sm font-medium text-red-900">
                  Blocked
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <p className="text-3xl font-bold text-red-900">
                  {guardianStatus.blockedTransactions.toLocaleString()}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
          </div>{" "}
          {/* Guardian Performance */}{" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Guardian Performance</CardTitle>{" "}
              <CardDescription>
                Performance metrics for each Guardian
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              {" "}
              <div className="space-y-3">
                {" "}
                <div>
                  {" "}
                  <div className="flex justify-between mb-1">
                    {" "}
                    <span className="text-sm font-medium">
                      Argus (Data Compliance)
                    </span>{" "}
                    <span className="text-sm text-muted-foreground">
                      42ms avg
                    </span>{" "}
                  </div>{" "}
                  <div className="w-full bg-surface rounded-full h-2">
                    {" "}
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: "30%" }}
                    ></div>{" "}
                  </div>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <div className="flex justify-between mb-1">
                    {" "}
                    <span className="text-sm font-medium">
                      Zelda (Duplicates)
                    </span>{" "}
                    <span className="text-sm text-muted-foreground">
                      56ms avg
                    </span>{" "}
                  </div>{" "}
                  <div className="w-full bg-surface rounded-full h-2">
                    {" "}
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: "40%" }}
                    ></div>{" "}
                  </div>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <div className="flex justify-between mb-1">
                    {" "}
                    <span className="text-sm font-medium">
                      Phoenix (Anomalies)
                    </span>{" "}
                    <span className="text-sm text-muted-foreground">
                      87ms avg
                    </span>{" "}
                  </div>{" "}
                  <div className="w-full bg-surface rounded-full h-2">
                    {" "}
                    <div
                      className="bg-orange-600 h-2 rounded-full"
                      style={{ width: "60%" }}
                    ></div>{" "}
                  </div>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <div className="flex justify-between mb-1">
                    {" "}
                    <span className="text-sm font-medium">
                      Odin (Audit Trail)
                    </span>{" "}
                    <span className="text-sm text-muted-foreground">
                      28ms avg
                    </span>{" "}
                  </div>{" "}
                  <div className="w-full bg-surface rounded-full h-2">
                    {" "}
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: "20%" }}
                    ></div>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* GL ACCOUNTS TAB */}{" "}
        <TabsContent value="accounts" className="space-y-6">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>GL Account Guardian Settings</CardTitle>{" "}
              <CardDescription>
                Configure Guardian behavior per GL account
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {" "}
                {glAccounts.map((account) => (
                  <button
                    key={account.code}
                    onClick={() => {
                      setSelectedAccount(account);
                      setEditingAccount(false);
                    }}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${selectedAccount?.code === account.code ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-background hover:border-border"}`}
                  >
                    {" "}
                    <p className="font-bold">{account.code}</p>{" "}
                    <p className="text-sm text-muted-foreground">
                      {account.name}
                    </p>{" "}
                    <div className="mt-2">
                      {" "}
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getRiskLevelBadge(account.riskLevel)}`}
                      >
                        {" "}
                        {account.riskLevel.toUpperCase()}{" "}
                      </span>{" "}
                    </div>{" "}
                  </button>
                ))}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          {/* Account Details */}{" "}
          {selectedAccount && (
            <Card>
              {" "}
              <CardHeader>
                {" "}
                <CardTitle>
                  {" "}
                  {selectedAccount.code} - {selectedAccount.name}{" "}
                </CardTitle>{" "}
                <CardDescription>
                  Guardian configuration for this account
                </CardDescription>{" "}
              </CardHeader>{" "}
              <CardContent className="space-y-6">
                {" "}
                {!editingAccount ? (
                  <div className="space-y-4">
                    {" "}
                    <div className="grid grid-cols-2 gap-4">
                      {" "}
                      <div>
                        {" "}
                        <p className="text-sm font-medium text-muted-foreground">
                          Risk Level
                        </p>{" "}
                        <p className="text-lg font-bold capitalize">
                          {selectedAccount.riskLevel}
                        </p>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <p className="text-sm font-medium text-muted-foreground">
                          High-Risk Account
                        </p>{" "}
                        <p className="text-lg font-bold">
                          {selectedAccount.highRiskAccount ? "Yes" : "No"}
                        </p>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <p className="text-sm font-medium text-muted-foreground">
                          Max Daily Amount
                        </p>{" "}
                        <p className="text-lg font-bold">
                          {" "}
                          $
                          {selectedAccount.maxDailyAmount?.toLocaleString() ||
                            "Unlimited"}{" "}
                        </p>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <p className="text-sm font-medium text-muted-foreground">
                          Max Monthly Amount
                        </p>{" "}
                        <p className="text-lg font-bold">
                          {" "}
                          $
                          {selectedAccount.maxMonthlyAmount?.toLocaleString() ||
                            "Unlimited"}{" "}
                        </p>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <p className="text-sm font-medium text-muted-foreground">
                          Requires Cost Center
                        </p>{" "}
                        <p className="text-lg font-bold">
                          {selectedAccount.requiresCostCenter ? "Yes" : "No"}
                        </p>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <p className="text-sm font-medium text-muted-foreground">
                          Requires Department
                        </p>{" "}
                        <p className="text-lg font-bold">
                          {selectedAccount.requiresDepartment ? "Yes" : "No"}
                        </p>{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="border-t pt-4">
                      {" "}
                      <p className="font-semibold mb-2">
                        Alert Recipients
                      </p>{" "}
                      {selectedAccount.alertsEnabled ? (
                        <div className="space-y-1">
                          {" "}
                          {selectedAccount.alertRecipients.map((email, idx) => (
                            <p
                              key={idx}
                              className="text-sm bg-blue-50 px-3 py-2 rounded"
                            >
                              {" "}
                              {email}{" "}
                            </p>
                          ))}{" "}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Alerts disabled for this account
                        </p>
                      )}{" "}
                    </div>{" "}
                    <Button
                      onClick={() => setEditingAccount(true)}
                      className="w-full"
                    >
                      {" "}
                      Edit Settings{" "}
                    </Button>{" "}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {" "}
                    <div>
                      {" "}
                      <label className="text-sm font-medium">
                        Risk Level
                      </label>{" "}
                      <select
                        value={selectedAccount.riskLevel}
                        onChange={(e) =>
                          setSelectedAccount({
                            ...selectedAccount,
                            riskLevel: e.target.value as
                              | "low"
                              | "medium"
                              | "high"
                              | "critical",
                          })
                        }
                        className="w-full mt-1 border rounded px-3 py-2"
                      >
                        {" "}
                        <option value="low">Low</option>{" "}
                        <option value="medium">Medium</option>{" "}
                        <option value="high">High</option>{" "}
                        <option value="critical">Critical</option>{" "}
                      </select>{" "}
                    </div>{" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <input
                        type="checkbox"
                        checked={selectedAccount.highRiskAccount}
                        onChange={(e) =>
                          setSelectedAccount({
                            ...selectedAccount,
                            highRiskAccount: e.target.checked,
                          })
                        }
                        id="highRisk"
                      />{" "}
                      <label htmlFor="highRisk" className="text-sm font-medium">
                        {" "}
                        Mark as High-Risk Account{" "}
                      </label>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <label className="text-sm font-medium">
                        Max Daily Amount
                      </label>{" "}
                      <Input
                        type="number"
                        value={selectedAccount.maxDailyAmount}
                        onChange={(e) =>
                          setSelectedAccount({
                            ...selectedAccount,
                            maxDailyAmount: parseInt(e.target.value) || 0,
                          })
                        }
                        className="mt-1"
                        placeholder="0 for unlimited"
                      />{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <label className="text-sm font-medium">
                        Max Monthly Amount
                      </label>{" "}
                      <Input
                        type="number"
                        value={selectedAccount.maxMonthlyAmount}
                        onChange={(e) =>
                          setSelectedAccount({
                            ...selectedAccount,
                            maxMonthlyAmount: parseInt(e.target.value) || 0,
                          })
                        }
                        className="mt-1"
                        placeholder="0 for unlimited"
                      />{" "}
                    </div>{" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <input
                        type="checkbox"
                        checked={selectedAccount.requiresCostCenter}
                        onChange={(e) =>
                          setSelectedAccount({
                            ...selectedAccount,
                            requiresCostCenter: e.target.checked,
                          })
                        }
                        id="costCenter"
                      />{" "}
                      <label
                        htmlFor="costCenter"
                        className="text-sm font-medium"
                      >
                        {" "}
                        Requires Cost Center{" "}
                      </label>{" "}
                    </div>{" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <input
                        type="checkbox"
                        checked={selectedAccount.requiresDepartment}
                        onChange={(e) =>
                          setSelectedAccount({
                            ...selectedAccount,
                            requiresDepartment: e.target.checked,
                          })
                        }
                        id="department"
                      />{" "}
                      <label
                        htmlFor="department"
                        className="text-sm font-medium"
                      >
                        {" "}
                        Requires Department{" "}
                      </label>{" "}
                    </div>{" "}
                    <div className="flex gap-2 pt-4">
                      {" "}
                      <Button
                        onClick={handleAccountSave}
                        className="flex-1"
                        variant="default"
                      >
                        {" "}
                        Save Changes{" "}
                      </Button>{" "}
                      <Button
                        onClick={() => setEditingAccount(false)}
                        className="flex-1"
                        variant="outline"
                      >
                        {" "}
                        Cancel{" "}
                      </Button>{" "}
                    </div>{" "}
                  </div>
                )}{" "}
              </CardContent>{" "}
            </Card>
          )}{" "}
        </TabsContent>{" "}
        {/* PHOENIX SETTINGS TAB */}{" "}
        <TabsContent value="settings" className="space-y-6">
          {" "}
          <Alert>
            {" "}
            <AlertCircle className="h-4 w-4" />{" "}
            <AlertDescription>
              {" "}
              Adjust Phoenix anomaly detection thresholds. Lower values = more
              sensitive fraud detection but more false positives.{" "}
            </AlertDescription>{" "}
          </Alert>{" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Anomaly Detection Thresholds</CardTitle>{" "}
              <CardDescription>
                Configure how Phoenix detects suspicious transactions
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-6">
              {" "}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">
                    Large Amount Threshold (x average)
                  </label>{" "}
                  <Input
                    type="number"
                    step="0.1"
                    value={phoenixSettings.largeAmountThreshold}
                    onChange={(e) =>
                      handlePhoenixSettingChange(
                        "largeAmountThreshold",
                        e.target.value,
                      )
                    }
                    className="mt-1"
                  />{" "}
                  <p className="text-xs text-muted-foreground mt-1">
                    Default: 2.0 (flag if 2x average)
                  </p>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">
                    Large Amount Risk Score
                  </label>{" "}
                  <Input
                    type="number"
                    value={phoenixSettings.largeAmountRiskScore}
                    onChange={(e) =>
                      handlePhoenixSettingChange(
                        "largeAmountRiskScore",
                        e.target.value,
                      )
                    }
                    className="mt-1"
                  />{" "}
                  <p className="text-xs text-muted-foreground mt-1">
                    Default: 15 points
                  </p>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">
                    Off-Hours Risk Score
                  </label>{" "}
                  <Input
                    type="number"
                    value={phoenixSettings.offHoursRiskScore}
                    onChange={(e) =>
                      handlePhoenixSettingChange(
                        "offHoursRiskScore",
                        e.target.value,
                      )
                    }
                    className="mt-1"
                  />{" "}
                  <p className="text-xs text-muted-foreground mt-1">
                    Default: 10 points
                  </p>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">
                    Unknown Vendor Risk Score
                  </label>{" "}
                  <Input
                    type="number"
                    value={phoenixSettings.unknownVendorRiskScore}
                    onChange={(e) =>
                      handlePhoenixSettingChange(
                        "unknownVendorRiskScore",
                        e.target.value,
                      )
                    }
                    className="mt-1"
                  />{" "}
                  <p className="text-xs text-muted-foreground mt-1">
                    Default: 20 points
                  </p>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">
                    High-Risk Account Risk Score
                  </label>{" "}
                  <Input
                    type="number"
                    value={phoenixSettings.highRiskAccountScore}
                    onChange={(e) =>
                      handlePhoenixSettingChange(
                        "highRiskAccountScore",
                        e.target.value,
                      )
                    }
                    className="mt-1"
                  />{" "}
                  <p className="text-xs text-muted-foreground mt-1">
                    Default: 25 points
                  </p>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">
                    Rapid Succession Risk Score
                  </label>{" "}
                  <Input
                    type="number"
                    value={phoenixSettings.rapidSuccessionScore}
                    onChange={(e) =>
                      handlePhoenixSettingChange(
                        "rapidSuccessionScore",
                        e.target.value,
                      )
                    }
                    className="mt-1"
                  />{" "}
                  <p className="text-xs text-muted-foreground mt-1">
                    Default: 30 points
                  </p>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">
                    Round Number Risk Score
                  </label>{" "}
                  <Input
                    type="number"
                    value={phoenixSettings.roundNumberScore}
                    onChange={(e) =>
                      handlePhoenixSettingChange(
                        "roundNumberScore",
                        e.target.value,
                      )
                    }
                    className="mt-1"
                  />{" "}
                  <p className="text-xs text-muted-foreground mt-1">
                    Default: 5 points
                  </p>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">
                    Global Risk Threshold
                  </label>{" "}
                  <Input
                    type="number"
                    value={phoenixSettings.globalRiskThreshold}
                    onChange={(e) =>
                      handlePhoenixSettingChange(
                        "globalRiskThreshold",
                        e.target.value,
                      )
                    }
                    className="mt-1"
                  />{" "}
                  <p className="text-xs text-muted-foreground mt-1">
                    Default: 60 (block if score exceeds)
                  </p>{" "}
                </div>{" "}
              </div>{" "}
              <div className="border-t pt-4">
                {" "}
                <h3 className="font-semibold mb-3">
                  Risk Score Reference
                </h3>{" "}
                <div className="space-y-2 text-sm">
                  {" "}
                  <div className="flex justify-between">
                    {" "}
                    <span>0-30 points:</span>{" "}
                    <span className="text-green-600 font-medium">
                      Low Risk (Post normally)
                    </span>{" "}
                  </div>{" "}
                  <div className="flex justify-between">
                    {" "}
                    <span>31-60 points:</span>{" "}
                    <span className="text-yellow-600 font-medium">
                      Medium Risk (Post with caution)
                    </span>{" "}
                  </div>{" "}
                  <div className="flex justify-between">
                    {" "}
                    <span>61-80 points:</span>{" "}
                    <span className="text-orange-600 font-medium">
                      High Risk (Requires review)
                    </span>{" "}
                  </div>{" "}
                  <div className="flex justify-between">
                    {" "}
                    <span>81-100 points:</span>{" "}
                    <span className="text-red-600 font-medium">
                      Critical Risk (Blocked)
                    </span>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              <Button className="w-full">Save Phoenix Settings</Button>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* ALERTS TAB */}{" "}
        <TabsContent value="alerts" className="space-y-6">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>High-Risk Alerts</CardTitle>{" "}
              <CardDescription>
                Manage high-risk transactions that require attention
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="space-y-4">
                {" "}
                {highRiskAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-2 ${getStatusColor(alert.status)}`}
                  >
                    {" "}
                    <div className="flex items-start justify-between">
                      {" "}
                      <div className="flex-1">
                        {" "}
                        <p className="font-bold">
                          {" "}
                          {alert.transactionId} - $
                          {alert.amount.toLocaleString()}{" "}
                        </p>{" "}
                        <p className="text-sm text-muted-foreground mt-1">
                          {" "}
                          Risk Score:{" "}
                          <span className="font-bold text-red-600">
                            {alert.riskScore}/100
                          </span>{" "}
                        </p>{" "}
                        <p className="text-sm text-muted-foreground">
                          Posted by: {alert.actor}
                        </p>{" "}
                        <p className="text-sm text-muted-foreground">
                          {" "}
                          Time:{" "}
                          {new Date(alert.timestamp).toLocaleString()}{" "}
                        </p>{" "}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {" "}
                          {alert.anomalies.map((anomaly, idx) => (
                            <span
                              key={idx}
                              className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded"
                            >
                              {" "}
                              {anomaly}{" "}
                            </span>
                          ))}{" "}
                        </div>{" "}
                      </div>{" "}
                      <div className="ml-4">
                        {" "}
                        <div className="text-right">
                          {" "}
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            Status
                          </p>{" "}
                          <p className="text-sm font-bold capitalize mb-3">
                            {alert.status}
                          </p>{" "}
                          <select
                            value={alert.status}
                            onChange={(e) =>
                              handleAlertStatusChange(
                                alert.id,
                                e.target.value as
                                  | "new"
                                  | "reviewed"
                                  | "resolved",
                              )
                            }
                            className="text-xs border rounded px-2 py-1"
                          >
                            {" "}
                            <option value="new">New</option>{" "}
                            <option value="reviewed">Reviewed</option>{" "}
                            <option value="resolved">Resolved</option>{" "}
                          </select>{" "}
                        </div>{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
              {highRiskAlerts.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No high-risk alerts at this time
                </p>
              )}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
    </div>
  );
}
export default GuardianAdminDashboard;
