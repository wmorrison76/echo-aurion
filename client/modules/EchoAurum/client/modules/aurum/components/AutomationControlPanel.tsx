/** * Automation Control Panel Component * UI for managing Echo AI³ automation settings with real-time preview */ import React, {
  useState,
  useEffect,
} from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
export interface AutomationControlProps {
  entityId: string;
  onSettingsChange?: (settings: any) => void;
}
interface AutomationSetting {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  percentage: number;
  approvalMode?: "auto" | "recommend" | "manual";
  icon: string;
}
export function AutomationControlPanel({
  entityId,
  onSettingsChange,
}: AutomationControlProps) {
  const [activeTab, setActiveTab] = useState("gl-operations");
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    loadSettings();
  }, [entityId]);
  const loadSettings = async () => {
    try {
      const response = await fetch(
        `/api/aurum/automation/settings?entityId=${entityId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Error loading automation settings:", error);
    }
  };
  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/aurum/automation/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, ...settings }),
      });
      if (response.ok) {
        setUnsavedChanges(false);
        if (onSettingsChange) {
          onSettingsChange(settings);
        }
      }
    } catch (error) {
      console.error("Error saving automation settings:", error);
    } finally {
      setIsSaving(false);
    }
  };
  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setUnsavedChanges(true);
  };
  return (
    <div className="space-y-4">
      {" "}
      <div className="flex justify-between items-center">
        {" "}
        <div>
          {" "}
          <h2 className="text-2xl font-bold">Automation Control Panel</h2>{" "}
          <p className="text-muted-foreground">
            Configure Echo AI³ automation for your accounting operations
          </p>{" "}
        </div>{" "}
        {unsavedChanges && (
          <Button onClick={saveSettings} disabled={isSaving}>
            {" "}
            {isSaving ? "Saving..." : "Save Changes"}{" "}
          </Button>
        )}{" "}
      </div>{" "}
      {unsavedChanges && (
        <Alert className="border-yellow-200 bg-yellow-50">
          {" "}
          <AlertDescription className="text-yellow-800">
            {" "}
            You have unsaved changes. Click"Save Changes" to apply them.{" "}
          </AlertDescription>{" "}
        </Alert>
      )}{" "}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {" "}
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          {" "}
          <TabsTrigger value="gl-operations">GL</TabsTrigger>{" "}
          <TabsTrigger value="ap-operations">AP</TabsTrigger>{" "}
          <TabsTrigger value="reconciliation">Recon</TabsTrigger>{" "}
          <TabsTrigger value="month-end">Month-End</TabsTrigger>{" "}
          <TabsTrigger value="payments">Payments</TabsTrigger>{" "}
          <TabsTrigger value="cash">Cash</TabsTrigger>{" "}
          <TabsTrigger value="cfo">CFO</TabsTrigger>{" "}
        </TabsList>{" "}
        {/* GL Operations Tab */}{" "}
        <TabsContent value="gl-operations" className="space-y-4">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>GL Entry Auto-Creation</CardTitle>{" "}
              <CardDescription>
                {" "}
                Automatically create GL entries from POS/PMS feeds{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-6">
              {" "}
              <AutomationControl
                label="Auto-Create GL Entries"
                enabled={settings.glEntryAutoCreateEnabled}
                percentage={settings.glEntryAutoCreatePct || 0}
                onEnabledChange={(enabled) =>
                  handleSettingChange("glEntryAutoCreateEnabled", enabled)
                }
                onPercentageChange={(pct) =>
                  handleSettingChange("glEntryAutoCreatePct", pct)
                }
                helpText="When enabled, GL entries are created automatically from integrated systems"
                options={[
                  {
                    label: "Include Toast POS events",
                    sublabel: "Daily revenue, payments",
                  },
                  {
                    label: "Include OPERA PMS events",
                    sublabel: "Room charges, adjustments",
                  },
                  {
                    label: "Include Gusto Payroll",
                    sublabel: "Weekly/bi-weekly payroll",
                  },
                ]}
              />{" "}
              <div className="space-y-3 pt-4 border-t">
                {" "}
                <label className="block text-sm font-medium">
                  {" "}
                  Default Approval Mode{" "}
                </label>{" "}
                <Select
                  value={settings.glEntryApprovalMode || "recommend_only"}
                  onValueChange={(value) =>
                    handleSettingChange("glEntryApprovalMode", value)
                  }
                >
                  {" "}
                  <SelectTrigger>
                    {" "}
                    <SelectValue />{" "}
                  </SelectTrigger>{" "}
                  <SelectContent>
                    {" "}
                    <SelectItem value="auto_post">
                      Auto-Post (No Review)
                    </SelectItem>{" "}
                    <SelectItem value="recommend_only">
                      Recommend Only (Review Before Post)
                    </SelectItem>{" "}
                    <SelectItem value="manual">
                      Manual Entry (Always Ask)
                    </SelectItem>{" "}
                  </SelectContent>{" "}
                </Select>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* AP Operations Tab */}{" "}
        <TabsContent value="ap-operations" className="space-y-4">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>AP Invoice Automation</CardTitle>{" "}
              <CardDescription>
                {" "}
                Automate 3-way matching and approval workflows{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-6">
              {" "}
              <AutomationControl
                label="Auto-Match Invoices"
                enabled={settings.apInvoiceAutoMatchEnabled}
                percentage={settings.apInvoiceAutoMatchPct || 0}
                onEnabledChange={(enabled) =>
                  handleSettingChange("apInvoiceAutoMatchEnabled", enabled)
                }
                onPercentageChange={(pct) =>
                  handleSettingChange("apInvoiceAutoMatchPct", pct)
                }
                helpText="Automatically match invoices to POs and receipts"
              />{" "}
              <div className="space-y-3 pt-4 border-t">
                {" "}
                <label className="block text-sm font-medium">
                  {" "}
                  Matching Confidence Threshold{" "}
                </label>{" "}
                <div className="flex items-center space-x-4">
                  {" "}
                  <Slider
                    min={70}
                    max={100}
                    step={5}
                    value={[settings.apInvoiceMatchConfidence || 80]}
                    onValueChange={(value) =>
                      handleSettingChange("apInvoiceMatchConfidence", value[0])
                    }
                    className="flex-1"
                  />{" "}
                  <span className="text-lg font-semibold min-w-fit">
                    {settings.apInvoiceMatchConfidence || 80}%
                  </span>{" "}
                </div>{" "}
              </div>{" "}
              <AutomationControl
                label="Auto-Approve Matched Invoices"
                enabled={settings.apInvoiceAutoApproveEnabled}
                percentage={settings.apInvoiceAutoApprovePct || 0}
                onEnabledChange={(enabled) =>
                  handleSettingChange("apInvoiceAutoApproveEnabled", enabled)
                }
                onPercentageChange={(pct) =>
                  handleSettingChange("apInvoiceAutoApprovePct", pct)
                }
                helpText="Automatically approve invoices with 3-way match"
              />{" "}
              <AutomationControl
                label="Auto-Schedule Payments"
                enabled={settings.apPaymentAutoScheduleEnabled}
                percentage={settings.apPaymentAutoSchedulePct || 0}
                onEnabledChange={(enabled) =>
                  handleSettingChange("apPaymentAutoScheduleEnabled", enabled)
                }
                onPercentageChange={(pct) =>
                  handleSettingChange("apPaymentAutoSchedulePct", pct)
                }
                helpText="Automatically schedule payments for approved invoices"
              />{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Reconciliation Tab */}{" "}
        <TabsContent value="reconciliation" className="space-y-4">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Bank Reconciliation Automation</CardTitle>{" "}
              <CardDescription>
                {" "}
                Automate bank matching and GL reconciliation{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-6">
              {" "}
              <AutomationControl
                label="Auto-Match Bank Transactions"
                enabled={settings.bankAutoMatchEnabled}
                percentage={settings.bankAutoMatchPct || 0}
                onEnabledChange={(enabled) =>
                  handleSettingChange("bankAutoMatchEnabled", enabled)
                }
                onPercentageChange={(pct) =>
                  handleSettingChange("bankAutoMatchPct", pct)
                }
                helpText="Automatically match bank transactions to GL entries"
              />{" "}
              <AutomationControl
                label="Auto-Post Reconciling Items"
                enabled={settings.bankAutoPostEnabled}
                percentage={settings.bankAutoPostPct || 0}
                onEnabledChange={(enabled) =>
                  handleSettingChange("bankAutoPostEnabled", enabled)
                }
                onPercentageChange={(pct) =>
                  handleSettingChange("bankAutoPostPct", pct)
                }
                helpText="Automatically post reconciling items (outstanding checks, deposits in transit)"
              />{" "}
              <AutomationControl
                label="Auto-Reconcile GL Accounts"
                enabled={settings.glAutoReconEnabled}
                percentage={settings.glAutoReconPct || 0}
                onEnabledChange={(enabled) =>
                  handleSettingChange("glAutoReconEnabled", enabled)
                }
                onPercentageChange={(pct) =>
                  handleSettingChange("glAutoReconPct", pct)
                }
                helpText="Automatically reconcile GL accounts after matching"
              />{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Month-End Close Tab */}{" "}
        <TabsContent value="month-end" className="space-y-4">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Month-End Close Automation</CardTitle>{" "}
              <CardDescription>
                {" "}
                Automate accruals, depreciation, and consolidation{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-6">
              {" "}
              <AutomationControl
                label="Auto-Post Accruals"
                enabled={settings.autoAccrualsEnabled}
                percentage={settings.autoAccrualsPct || 0}
                onEnabledChange={(enabled) =>
                  handleSettingChange("autoAccrualsEnabled", enabled)
                }
                onPercentageChange={(pct) =>
                  handleSettingChange("autoAccrualsPct", pct)
                }
                helpText="Automatically post accrued expenses and revenues"
              />{" "}
              <AutomationControl
                label="Auto-Post Depreciation"
                enabled={settings.autoDepreciationEnabled}
                percentage={settings.autoDepreciationPct || 0}
                onEnabledChange={(enabled) =>
                  handleSettingChange("autoDepreciationEnabled", enabled)
                }
                onPercentageChange={(pct) =>
                  handleSettingChange("autoDepreciationPct", pct)
                }
                helpText="Automatically post monthly depreciation"
              />{" "}
              <AutomationControl
                label="Auto-Consolidate Entities"
                enabled={settings.autoConsolidationEnabled}
                percentage={settings.autoConsolidationPct || 0}
                onEnabledChange={(enabled) =>
                  handleSettingChange("autoConsolidationEnabled", enabled)
                }
                onPercentageChange={(pct) =>
                  handleSettingChange("autoConsolidationPct", pct)
                }
                helpText="Automatically consolidate multi-entity results"
              />{" "}
              <AutomationControl
                label="Full Close Automation"
                enabled={settings.fullCloseAutomationEnabled}
                percentage={settings.fullCloseAutomationPct || 0}
                onEnabledChange={(enabled) =>
                  handleSettingChange("fullCloseAutomationEnabled", enabled)
                }
                onPercentageChange={(pct) =>
                  handleSettingChange("fullCloseAutomationPct", pct)
                }
                helpText="Run entire month-end close process"
              />{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Payments Tab */}{" "}
        <TabsContent value="payments" className="space-y-4">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Payment Processing Automation</CardTitle>{" "}
              <CardDescription>
                {" "}
                Automate payment initiation and processing{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              {" "}
              <p className="text-sm text-muted-foreground">
                {" "}
                Payment automation is managed through the Payments module.
                Configure approval thresholds and payment methods there.{" "}
              </p>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Cash Tab */}{" "}
        <TabsContent value="cash" className="space-y-4">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Cash Management & Forecasting</CardTitle>{" "}
              <CardDescription>
                {" "}
                Monitor cash position and forecast shortfalls{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-6">
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">
                    Cash Position Monitoring
                  </label>{" "}
                  <p className="text-xs text-muted-foreground">
                    Continuously monitor cash balance
                  </p>{" "}
                </div>{" "}
                <Switch
                  checked={settings.cashMonitorEnabled}
                  onCheckedChange={(checked) =>
                    handleSettingChange("cashMonitorEnabled", checked)
                  }
                />{" "}
              </div>{" "}
              <div className="space-y-3 pt-4 border-t">
                {" "}
                <label className="block text-sm font-medium">
                  {" "}
                  Cash Forecast Days Ahead{" "}
                </label>{" "}
                <Input
                  type="number"
                  min="7"
                  max="90"
                  value={settings.cashForecastDays || 30}
                  onChange={(e) =>
                    handleSettingChange(
                      "cashForecastDays",
                      parseInt(e.target.value),
                    )
                  }
                />{" "}
              </div>{" "}
              <div className="space-y-3 pt-4 border-t">
                {" "}
                <label className="block text-sm font-medium">
                  {" "}
                  Minimum Cash Threshold{" "}
                </label>{" "}
                <Input
                  type="number"
                  placeholder="20000"
                  value={settings.cashMinimumThreshold || 20000}
                  onChange={(e) =>
                    handleSettingChange(
                      "cashMinimumThreshold",
                      parseFloat(e.target.value),
                    )
                  }
                />{" "}
                <p className="text-xs text-muted-foreground">
                  Alert when cash falls below this amount
                </p>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* CFO Tab */}{" "}
        <TabsContent value="cfo" className="space-y-4">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Virtual CFO Recommendations</CardTitle>{" "}
              <CardDescription>
                {" "}
                Configure AI-powered CFO insights and recommendations{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-6">
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">
                    Profitability Recommendations
                  </label>{" "}
                  <p className="text-xs text-muted-foreground">
                    AI suggestions for improving profitability
                  </p>{" "}
                </div>{" "}
                <Switch
                  checked={settings.profitabilityRecommendationsEnabled}
                  onCheckedChange={(checked) =>
                    handleSettingChange(
                      "profitabilityRecommendationsEnabled",
                      checked,
                    )
                  }
                />{" "}
              </div>{" "}
              <div className="flex items-center justify-between pt-4 border-t">
                {" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">
                    Food Decisions Integration
                  </label>{" "}
                  <p className="text-xs text-muted-foreground">
                    Menu pricing and recipe profitability analysis
                  </p>{" "}
                </div>{" "}
                <Switch
                  checked={settings.foodDecisionsIntegrationEnabled}
                  onCheckedChange={(checked) =>
                    handleSettingChange(
                      "foodDecisionsIntegrationEnabled",
                      checked,
                    )
                  }
                />{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
      {/* Time-Based Schedule Settings */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Automation Operating Hours</CardTitle>{" "}
          <CardDescription>
            {" "}
            Define when automation should be active{" "}
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-6">
          {" "}
          <div className="grid grid-cols-2 gap-6">
            {" "}
            <div className="space-y-3">
              {" "}
              <label className="text-sm font-medium">
                GL Operations Hours
              </label>{" "}
              <div className="flex items-center space-x-2">
                {" "}
                <Input
                  type="time"
                  value={settings.glAutoHoursStart || "06:00"}
                  onChange={(e) =>
                    handleSettingChange("glAutoHoursStart", e.target.value)
                  }
                />{" "}
                <span className="text-muted-foreground">to</span>{" "}
                <Input
                  type="time"
                  value={settings.glAutoHoursEnd || "22:00"}
                  onChange={(e) =>
                    handleSettingChange("glAutoHoursEnd", e.target.value)
                  }
                />{" "}
              </div>{" "}
            </div>{" "}
            <div className="space-y-3">
              {" "}
              <label className="text-sm font-medium">
                AP Operations Hours
              </label>{" "}
              <div className="flex items-center space-x-2">
                {" "}
                <Input
                  type="time"
                  value={settings.apAutoHoursStart || "06:00"}
                  onChange={(e) =>
                    handleSettingChange("apAutoHoursStart", e.target.value)
                  }
                />{" "}
                <span className="text-muted-foreground">to</span>{" "}
                <Input
                  type="time"
                  value={settings.apAutoHoursEnd || "17:00"}
                  onChange={(e) =>
                    handleSettingChange("apAutoHoursEnd", e.target.value)
                  }
                />{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex items-center space-x-2 pt-4 border-t">
            {" "}
            <Switch
              checked={settings.autoDuringWeekends}
              onCheckedChange={(checked) =>
                handleSettingChange("autoDuringWeekends", checked)
              }
            />{" "}
            <label className="text-sm font-medium">
              Allow automation during weekends
            </label>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Save Button */}{" "}
      {unsavedChanges && (
        <div className="flex justify-end space-x-2">
          {" "}
          <Button variant="outline" onClick={() => loadSettings()}>
            {" "}
            Discard Changes{" "}
          </Button>{" "}
          <Button onClick={saveSettings} disabled={isSaving}>
            {" "}
            {isSaving ? "Saving..." : "Save All Changes"}{" "}
          </Button>{" "}
        </div>
      )}{" "}
    </div>
  );
} /** * Automation Control Component * Checkbox + percentage slider with description and options */
interface AutomationControlProps {
  label: string;
  enabled: boolean;
  percentage: number;
  onEnabledChange: (enabled: boolean) => void;
  onPercentageChange: (percentage: number) => void;
  helpText?: string;
  options?: Array<{ label: string; sublabel?: string }>;
}
function AutomationControl({
  label,
  enabled,
  percentage,
  onEnabledChange,
  onPercentageChange,
  helpText,
  options,
}: AutomationControlProps) {
  return (
    <div className="space-y-3">
      {" "}
      <div className="flex items-center space-x-3">
        {" "}
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />{" "}
        <label className="text-sm font-medium">{label}</label>{" "}
      </div>{" "}
      {enabled && (
        <>
          {" "}
          <div className="pl-8 space-y-3">
            {" "}
            <div className="space-y-2">
              {" "}
              <div className="flex justify-between items-center">
                {" "}
                <label className="text-sm text-muted-foreground">
                  Automation Level
                </label>{" "}
                <span className="text-lg font-semibold">
                  {percentage}%
                </span>{" "}
              </div>{" "}
              <Slider
                min={0}
                max={100}
                step={5}
                value={[percentage]}
                onValueChange={(value) => onPercentageChange(value[0])}
              />{" "}
            </div>{" "}
            {helpText && (
              <p className="text-xs text-muted-foreground">{helpText}</p>
            )}{" "}
            {options && (
              <div className="space-y-2 pt-2">
                {" "}
                {options.map((option) => (
                  <div
                    key={option.label}
                    className="flex items-start space-x-2"
                  >
                    {" "}
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mt-1"
                    />{" "}
                    <div>
                      {" "}
                      <p className="text-xs font-medium">{option.label}</p>{" "}
                      {option.sublabel && (
                        <p className="text-xs text-muted-foreground">
                          {option.sublabel}
                        </p>
                      )}{" "}
                    </div>{" "}
                  </div>
                ))}{" "}
              </div>
            )}{" "}
          </div>{" "}
        </>
      )}{" "}
    </div>
  );
}
