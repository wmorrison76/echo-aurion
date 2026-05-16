import React, { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useMultiOutlet } from "@/context/MultiOutletContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Package,
  Clock,
  ImageIcon,
  FileText,
} from "lucide-react";
import { format } from "date-fns"; // Unified mock data for all phases
const MOCK_WORKFLOW_DATA = {
  // Phase 3: Inventory inventory: { items_received_today: 45, recipe_updates: 12, cost_updates: 8, lot_tracking: { items: 23, expiring_soon: 3 }, }, // Phase 3: Image Vault images: { today_uploaded: 67, storage_used_pct: 42, days_until_auto_delete: 30, }, // Phase 4: OCR & Invoice invoices: { processing: 5, pending_review: 3, high_confidence: 92, variance_detected: 2, }, // Phase 5: AP accounting: { payable_amount: 125340, due_today: 8500, early_discount_available: 3, auto_approved: 12, }, // Phase 6: Notifications & Audit notifications: { alerts: 8, approvals: 4, audit_records: 1247, }, // Phase 9: Reports analytics: { spend_ytd: 845600, invoice_accuracy: 94.2, avg_days_payable: 28, early_discount_savings: 4200, },
};
export default function ProcurementToPaymentDashboard() {
  const { currentOutlet } = useMultiOutlet();
  const [activePhase, setActivePhase] = useState("overview");
  return (
    <AppLayout>
      {" "}
      <div className="space-y-6">
        {" "}
        <div>
          {" "}
          <h1 className="text-3xl font-bold">Procurement to Payment</h1>{" "}
          <p className="text-slate-400 mt-2">
            {" "}
            Complete workflow from ordering to payment tracking (Phases
            3-9){" "}
          </p>{" "}
        </div>{" "}
        {/* Overview KPIs */}{" "}
        <div className="grid gap-4 md:grid-cols-4">
          {" "}
          <Card className="border-border bg-surface">
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div>
                {" "}
                <p className="text-sm text-slate-400">Invoice Accuracy</p>{" "}
                <p className="text-3xl font-bold text-green-400">
                  {" "}
                  {MOCK_WORKFLOW_DATA.analytics.invoice_accuracy}%{" "}
                </p>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card className="border-border bg-surface">
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div>
                {" "}
                <p className="text-sm text-slate-400">Days Payable</p>{" "}
                <p className="text-3xl font-bold text-slate-200">
                  {" "}
                  {MOCK_WORKFLOW_DATA.analytics.avg_days_payable} days{" "}
                </p>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card className="border-border bg-surface">
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div>
                {" "}
                <p className="text-sm text-slate-400">
                  Early Discount Savings
                </p>{" "}
                <p className="text-3xl font-bold text-blue-400">
                  {" "}
                  ${" "}
                  {(
                    MOCK_WORKFLOW_DATA.analytics.early_discount_savings / 1000
                  ).toFixed(1)}{" "}
                  K{" "}
                </p>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card className="border-border bg-surface">
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div>
                {" "}
                <p className="text-sm text-slate-400">Spend YTD</p>{" "}
                <p className="text-3xl font-bold text-slate-200">
                  {" "}
                  ${" "}
                  {(MOCK_WORKFLOW_DATA.analytics.spend_ytd / 1000000).toFixed(
                    2,
                  )}{" "}
                  M{" "}
                </p>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>{" "}
        {/* Workflow Tabs */}{" "}
        <Tabs defaultValue="overview" className="w-full">
          {" "}
          <TabsList className="grid w-full grid-cols-6">
            {" "}
            <TabsTrigger value="overview">Overview</TabsTrigger>{" "}
            <TabsTrigger value="inventory">Phase 3: Inventory</TabsTrigger>{" "}
            <TabsTrigger value="invoices">Phase 4: Invoices</TabsTrigger>{" "}
            <TabsTrigger value="accounting">Phase 5: AP</TabsTrigger>{" "}
            <TabsTrigger value="alerts">Phase 6: Alerts</TabsTrigger>{" "}
            <TabsTrigger value="reports">Phase 9: Reports</TabsTrigger>{" "}
          </TabsList>{" "}
          {/* Overview Tab */}{" "}
          <TabsContent value="overview" className="space-y-4 mt-6">
            {" "}
            <div className="grid gap-4 md:grid-cols-2">
              {" "}
              <Card className="border-border bg-surface">
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle className="text-base">
                    Workflow Status
                  </CardTitle>{" "}
                </CardHeader>{" "}
                <CardContent className="space-y-3">
                  {" "}
                  <div className="flex items-center justify-between p-2 bg-slate-800/20 rounded">
                    {" "}
                    <span className="text-sm">
                      Phase 3: Inventory Updates
                    </span>{" "}
                    <Badge variant="outline" className="text-green-600">
                      {" "}
                      Complete{" "}
                    </Badge>{" "}
                  </div>{" "}
                  <div className="flex items-center justify-between p-2 bg-slate-800/20 rounded">
                    {" "}
                    <span className="text-sm">
                      {" "}
                      Phase 4: OCR Invoice Processing{" "}
                    </span>{" "}
                    <Badge variant="outline" className="text-amber-600">
                      {" "}
                      In Progress{" "}
                    </Badge>{" "}
                  </div>{" "}
                  <div className="flex items-center justify-between p-2 bg-slate-800/20 rounded">
                    {" "}
                    <span className="text-sm">
                      Phase 5: Payment Automation
                    </span>{" "}
                    <Badge variant="outline" className="text-primary">
                      {" "}
                      Ready{" "}
                    </Badge>{" "}
                  </div>{" "}
                  <div className="flex items-center justify-between p-2 bg-slate-800/20 rounded">
                    {" "}
                    <span className="text-sm">
                      {" "}
                      Phase 6: Real-time Notifications{" "}
                    </span>{" "}
                    <Badge variant="outline" className="text-green-600">
                      {" "}
                      Active{" "}
                    </Badge>{" "}
                  </div>{" "}
                </CardContent>{" "}
              </Card>{" "}
              <Card className="border-border bg-surface">
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle className="text-base">Quick Stats</CardTitle>{" "}
                </CardHeader>{" "}
                <CardContent className="space-y-3">
                  {" "}
                  <div className="flex items-center justify-between">
                    {" "}
                    <span className="text-sm text-slate-400">
                      {" "}
                      Inventory Items Updated{" "}
                    </span>{" "}
                    <span className="font-semibold">
                      {" "}
                      {MOCK_WORKFLOW_DATA.inventory.items_received_today}{" "}
                    </span>{" "}
                  </div>{" "}
                  <div className="flex items-center justify-between">
                    {" "}
                    <span className="text-sm text-slate-400">
                      {" "}
                      Images in Vault{" "}
                    </span>{" "}
                    <span className="font-semibold">
                      {" "}
                      {MOCK_WORKFLOW_DATA.images.today_uploaded}{" "}
                    </span>{" "}
                  </div>{" "}
                  <div className="flex items-center justify-between">
                    {" "}
                    <span className="text-sm text-slate-400">
                      {" "}
                      Pending Approvals{" "}
                    </span>{" "}
                    <span className="font-semibold">
                      {" "}
                      {MOCK_WORKFLOW_DATA.notifications.approvals}{" "}
                    </span>{" "}
                  </div>{" "}
                  <div className="flex items-center justify-between">
                    {" "}
                    <span className="text-sm text-slate-400">
                      {" "}
                      Audit Records{" "}
                    </span>{" "}
                    <span className="font-semibold">
                      {" "}
                      {MOCK_WORKFLOW_DATA.notifications.audit_records}{" "}
                    </span>{" "}
                  </div>{" "}
                </CardContent>{" "}
              </Card>{" "}
            </div>{" "}
          </TabsContent>{" "}
          {/* Phase 3: Inventory Tab */}{" "}
          <TabsContent value="inventory" className="space-y-4 mt-6">
            {" "}
            <div className="grid gap-4 md:grid-cols-3">
              {" "}
              <Card className="border-border bg-surface">
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle className="text-base flex items-center gap-2">
                    {" "}
                    <Package className="h-4 w-4" /> Items Received{" "}
                  </CardTitle>{" "}
                </CardHeader>{" "}
                <CardContent>
                  {" "}
                  <p className="text-3xl font-bold">
                    {" "}
                    {MOCK_WORKFLOW_DATA.inventory.items_received_today}{" "}
                  </p>{" "}
                  <p className="text-xs text-slate-400 mt-2">
                    {" "}
                    Auto-inventory updated from invoices{" "}
                  </p>{" "}
                </CardContent>{" "}
              </Card>{" "}
              <Card className="border-border bg-surface">
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle className="text-base">
                    Recipe Updates
                  </CardTitle>{" "}
                </CardHeader>{" "}
                <CardContent>
                  {" "}
                  <p className="text-3xl font-bold">
                    {" "}
                    {MOCK_WORKFLOW_DATA.inventory.recipe_updates}{" "}
                  </p>{" "}
                  <p className="text-xs text-slate-400 mt-2">
                    {" "}
                    Ingredient costs updated from invoice{" "}
                  </p>{" "}
                </CardContent>{" "}
              </Card>{" "}
              <Card className="border-border bg-surface">
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle className="text-base">Lot Tracking</CardTitle>{" "}
                </CardHeader>{" "}
                <CardContent>
                  {" "}
                  <p className="text-3xl font-bold text-amber-400">
                    {" "}
                    {
                      MOCK_WORKFLOW_DATA.inventory.lot_tracking.expiring_soon
                    }{" "}
                  </p>{" "}
                  <p className="text-xs text-slate-400 mt-2">
                    {" "}
                    Items expiring soon{" "}
                  </p>{" "}
                </CardContent>{" "}
              </Card>{" "}
            </div>{" "}
            <Card className="border-border bg-surface">
              {" "}
              <CardHeader>
                {" "}
                <CardTitle className="text-base">Image Vault</CardTitle>{" "}
                <CardDescription>
                  {" "}
                  45-day auto-deletion policy for archived images{" "}
                </CardDescription>{" "}
              </CardHeader>{" "}
              <CardContent className="space-y-4">
                {" "}
                <div className="space-y-2">
                  {" "}
                  <div className="flex justify-between text-sm">
                    {" "}
                    <span>Storage Used</span>{" "}
                    <span>
                      {MOCK_WORKFLOW_DATA.images.storage_used_pct}%
                    </span>{" "}
                  </div>{" "}
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    {" "}
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${MOCK_WORKFLOW_DATA.images.storage_used_pct}%`,
                      }}
                    />{" "}
                  </div>{" "}
                </div>{" "}
                <p className="text-xs text-slate-400">
                  {" "}
                  {MOCK_WORKFLOW_DATA.images.today_uploaded} images uploaded
                  today{" "}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
          </TabsContent>{" "}
          {/* Phase 4: Invoices Tab */}{" "}
          <TabsContent value="invoices" className="space-y-4 mt-6">
            {" "}
            <div className="grid gap-4 md:grid-cols-3">
              {" "}
              <Card className="border-border bg-surface">
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle className="text-base">
                    OCR Confidence
                  </CardTitle>{" "}
                </CardHeader>{" "}
                <CardContent>
                  {" "}
                  <p className="text-3xl font-bold text-green-400">
                    {" "}
                    {MOCK_WORKFLOW_DATA.invoices.high_confidence}%{" "}
                  </p>{" "}
                  <p className="text-xs text-slate-400 mt-2">
                    {" "}
                    ≥92% minimum threshold{" "}
                  </p>{" "}
                </CardContent>{" "}
              </Card>{" "}
              <Card className="border-border bg-surface">
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle className="text-base">Processing</CardTitle>{" "}
                </CardHeader>{" "}
                <CardContent>
                  {" "}
                  <p className="text-3xl font-bold">
                    {" "}
                    {MOCK_WORKFLOW_DATA.invoices.processing}{" "}
                  </p>{" "}
                  <p className="text-xs text-slate-400 mt-2">
                    {" "}
                    Invoices in OCR queue{" "}
                  </p>{" "}
                </CardContent>{" "}
              </Card>{" "}
              <Card className="border-border bg-surface">
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle className="text-base">
                    Variance Detected
                  </CardTitle>{" "}
                </CardHeader>{" "}
                <CardContent>
                  {" "}
                  <p className="text-3xl font-bold text-amber-400">
                    {" "}
                    {MOCK_WORKFLOW_DATA.invoices.variance_detected}{" "}
                  </p>{" "}
                  <p className="text-xs text-slate-400 mt-2">
                    {" "}
                    Three-way match issues{" "}
                  </p>{" "}
                </CardContent>{" "}
              </Card>{" "}
            </div>{" "}
            <Card className="border-border bg-surface">
              {" "}
              <CardHeader>
                {" "}
                <CardTitle className="text-base">
                  {" "}
                  3-Way Matching & GL Assignment{" "}
                </CardTitle>{" "}
                <CardDescription>
                  {" "}
                  PO → Receiving → Invoice matching with auto GL code
                  assignment{" "}
                </CardDescription>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="space-y-3">
                  {" "}
                  <div className="p-3 bg-slate-800/20 rounded flex items-center justify-between">
                    {" "}
                    <span className="text-sm">PO Matching</span>{" "}
                    <Badge variant="outline" className="text-green-600">
                      {" "}
                      ✓ Enabled{" "}
                    </Badge>{" "}
                  </div>{" "}
                  <div className="p-3 bg-slate-800/20 rounded flex items-center justify-between">
                    {" "}
                    <span className="text-sm">
                      Receiving Reconciliation
                    </span>{" "}
                    <Badge variant="outline" className="text-green-600">
                      {" "}
                      ✓ Enabled{" "}
                    </Badge>{" "}
                  </div>{" "}
                  <div className="p-3 bg-slate-800/20 rounded flex items-center justify-between">
                    {" "}
                    <span className="text-sm">
                      GL Code Auto-Assignment
                    </span>{" "}
                    <Badge variant="outline" className="text-green-600">
                      {" "}
                      ✓ Enabled{" "}
                    </Badge>{" "}
                  </div>{" "}
                </div>{" "}
              </CardContent>{" "}
            </Card>{" "}
          </TabsContent>{" "}
          {/* Phase 5: AP Tab */}{" "}
          <TabsContent value="accounting" className="space-y-4 mt-6">
            {" "}
            <div className="grid gap-4 md:grid-cols-3">
              {" "}
              <Card className="border-border bg-surface">
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle className="text-base">
                    Total Payable
                  </CardTitle>{" "}
                </CardHeader>{" "}
                <CardContent>
                  {" "}
                  <p className="text-3xl font-bold">
                    {" "}
                    ${" "}
                    {(
                      MOCK_WORKFLOW_DATA.accounting.payable_amount / 1000
                    ).toFixed(0)}{" "}
                    K{" "}
                  </p>{" "}
                  <p className="text-xs text-slate-400 mt-2">
                    {" "}
                    Outstanding invoices{" "}
                  </p>{" "}
                </CardContent>{" "}
              </Card>{" "}
              <Card className="border-border bg-surface">
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle className="text-base">Due Today</CardTitle>{" "}
                </CardHeader>{" "}
                <CardContent>
                  {" "}
                  <p className="text-3xl font-bold text-amber-400">
                    {" "}
                    ${" "}
                    {(MOCK_WORKFLOW_DATA.accounting.due_today / 1000).toFixed(
                      1,
                    )}{" "}
                    K{" "}
                  </p>{" "}
                  <p className="text-xs text-slate-400 mt-2">
                    {" "}
                    Payment required{" "}
                  </p>{" "}
                </CardContent>{" "}
              </Card>{" "}
              <Card className="border-border bg-surface">
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle className="text-base">
                    Early Discounts
                  </CardTitle>{" "}
                </CardHeader>{" "}
                <CardContent>
                  {" "}
                  <p className="text-3xl font-bold text-blue-400">
                    {" "}
                    {
                      MOCK_WORKFLOW_DATA.accounting.early_discount_available
                    }{" "}
                  </p>{" "}
                  <p className="text-xs text-slate-400 mt-2">
                    {" "}
                    Discounts available{" "}
                  </p>{" "}
                </CardContent>{" "}
              </Card>{" "}
            </div>{" "}
            <Card className="border-border bg-surface">
              {" "}
              <CardHeader>
                {" "}
                <CardTitle className="text-base">
                  Payment Automation
                </CardTitle>{" "}
                <CardDescription>
                  {" "}
                  Auto-payment based on thresholds and contract terms{" "}
                </CardDescription>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="space-y-3">
                  {" "}
                  <div className="p-3 bg-slate-800/20 rounded flex items-center justify-between">
                    {" "}
                    <span className="text-sm">
                      {" "}
                      Auto-Approved Under Threshold{" "}
                    </span>{" "}
                    <Badge variant="outline">
                      {" "}
                      {MOCK_WORKFLOW_DATA.accounting.auto_approved}{" "}
                      payments{" "}
                    </Badge>{" "}
                  </div>{" "}
                  <div className="p-3 bg-slate-800/20 rounded flex items-center justify-between">
                    {" "}
                    <span className="text-sm">
                      Payment Terms Enforcement
                    </span>{" "}
                    <Badge variant="outline" className="text-green-600">
                      {" "}
                      ✓ Active{" "}
                    </Badge>{" "}
                  </div>{" "}
                  <div className="p-3 bg-slate-800/20 rounded flex items-center justify-between">
                    {" "}
                    <span className="text-sm">ACH/Check Processing</span>{" "}
                    <Badge variant="outline" className="text-green-600">
                      {" "}
                      ✓ Configured{" "}
                    </Badge>{" "}
                  </div>{" "}
                </div>{" "}
              </CardContent>{" "}
            </Card>{" "}
          </TabsContent>{" "}
          {/* Phase 6: Alerts Tab */}{" "}
          <TabsContent value="alerts" className="space-y-4 mt-6">
            {" "}
            <div className="grid gap-4 md:grid-cols-2">
              {" "}
              <Card className="border-border bg-surface">
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle className="text-base">
                    Active Alerts
                  </CardTitle>{" "}
                </CardHeader>{" "}
                <CardContent>
                  {" "}
                  <p className="text-3xl font-bold text-red-400">
                    {" "}
                    {MOCK_WORKFLOW_DATA.notifications.alerts}{" "}
                  </p>{" "}
                  <p className="text-xs text-slate-400 mt-2">
                    {" "}
                    Real-time notifications enabled{" "}
                  </p>{" "}
                </CardContent>{" "}
              </Card>{" "}
              <Card className="border-border bg-surface">
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle className="text-base">Audit Trail</CardTitle>{" "}
                </CardHeader>{" "}
                <CardContent>
                  {" "}
                  <p className="text-3xl font-bold">
                    {" "}
                    {MOCK_WORKFLOW_DATA.notifications.audit_records}{" "}
                  </p>{" "}
                  <p className="text-xs text-slate-400 mt-2">
                    {" "}
                    Complete audit log{" "}
                  </p>{" "}
                </CardContent>{" "}
              </Card>{" "}
            </div>{" "}
            <Card className="border-border bg-surface">
              {" "}
              <CardHeader>
                {" "}
                <CardTitle className="text-base">
                  Real-Time Features
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent className="space-y-3">
                {" "}
                <div className="p-3 bg-slate-800/20 rounded flex items-center justify-between">
                  {" "}
                  <span className="text-sm">
                    {" "}
                    WebSocket Delivery Notifications{" "}
                  </span>{" "}
                  <Badge variant="outline" className="text-green-600">
                    {" "}
                    ✓ Active{" "}
                  </Badge>{" "}
                </div>{" "}
                <div className="p-3 bg-slate-800/20 rounded flex items-center justify-between">
                  {" "}
                  <span className="text-sm">
                    Shortage & Exception Alerts
                  </span>{" "}
                  <Badge variant="outline" className="text-green-600">
                    {" "}
                    ✓ Monitoring{" "}
                  </Badge>{" "}
                </div>{" "}
                <div className="p-3 bg-slate-800/20 rounded flex items-center justify-between">
                  {" "}
                  <span className="text-sm">Approval Notifications</span>{" "}
                  <Badge variant="outline">
                    {" "}
                    {MOCK_WORKFLOW_DATA.notifications.approvals} pending{" "}
                  </Badge>{" "}
                </div>{" "}
                <div className="p-3 bg-slate-800/20 rounded flex items-center justify-between">
                  {" "}
                  <span className="text-sm">Comprehensive Audit Logs</span>{" "}
                  <Badge variant="outline" className="text-green-600">
                    {" "}
                    ✓ Tracking{" "}
                  </Badge>{" "}
                </div>{" "}
              </CardContent>{" "}
            </Card>{" "}
          </TabsContent>{" "}
          {/* Phase 9: Reports Tab */}{" "}
          <TabsContent value="reports" className="space-y-4 mt-6">
            {" "}
            <div className="grid gap-4 md:grid-cols-2">
              {" "}
              <Card className="border-border bg-surface">
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle className="text-base flex items-center gap-2">
                    {" "}
                    <BarChart3 className="h-4 w-4" /> Spend Analysis{" "}
                  </CardTitle>{" "}
                </CardHeader>{" "}
                <CardContent className="space-y-3">
                  {" "}
                  <div className="p-2 bg-slate-800/20 rounded">
                    {" "}
                    <p className="text-xs text-slate-400">YTD Spend</p>{" "}
                    <p className="text-2xl font-bold">
                      {" "}
                      ${" "}
                      {(
                        MOCK_WORKFLOW_DATA.analytics.spend_ytd / 1000000
                      ).toFixed(2)}{" "}
                      M{" "}
                    </p>{" "}
                  </div>{" "}
                  <div className="text-xs text-slate-400">
                    {" "}
                    By vendor, category, and time period{" "}
                  </div>{" "}
                </CardContent>{" "}
              </Card>{" "}
              <Card className="border-border bg-surface">
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle className="text-base flex items-center gap-2">
                    {" "}
                    <TrendingUp className="h-4 w-4" /> KPI Dashboards{" "}
                  </CardTitle>{" "}
                </CardHeader>{" "}
                <CardContent className="space-y-3">
                  {" "}
                  <div className="p-2 bg-slate-800/20 rounded">
                    {" "}
                    <p className="text-xs text-slate-400">
                      Invoice Accuracy
                    </p>{" "}
                    <p className="text-2xl font-bold text-green-400">
                      {" "}
                      {MOCK_WORKFLOW_DATA.analytics.invoice_accuracy}%{" "}
                    </p>{" "}
                  </div>{" "}
                  <div className="text-xs text-slate-400">
                    {" "}
                    Days payable outstanding, discount capture{" "}
                  </div>{" "}
                </CardContent>{" "}
              </Card>{" "}
            </div>{" "}
            <Card className="border-border bg-surface">
              {" "}
              <CardHeader>
                {" "}
                <CardTitle className="text-base">
                  {" "}
                  Invoice Aging & Performance{" "}
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="space-y-3">
                  {" "}
                  <div className="flex items-center justify-between p-3 bg-slate-800/20 rounded">
                    {" "}
                    <div>
                      {" "}
                      <p className="text-sm font-medium">
                        {" "}
                        Average Days Payable{" "}
                      </p>{" "}
                      <p className="text-xs text-slate-400">
                        {" "}
                        Payment cycle performance{" "}
                      </p>{" "}
                    </div>{" "}
                    <p className="text-2xl font-bold">
                      {" "}
                      {MOCK_WORKFLOW_DATA.analytics.avg_days_payable} days{" "}
                    </p>{" "}
                  </div>{" "}
                  <div className="flex items-center justify-between p-3 bg-slate-800/20 rounded">
                    {" "}
                    <div>
                      {" "}
                      <p className="text-sm font-medium">
                        {" "}
                        Early Discount Savings YTD{" "}
                      </p>{" "}
                      <p className="text-xs text-slate-400">
                        {" "}
                        Cash saved through early payment{" "}
                      </p>{" "}
                    </div>{" "}
                    <p className="text-2xl font-bold">
                      {" "}
                      ${" "}
                      {(
                        MOCK_WORKFLOW_DATA.analytics.early_discount_savings /
                        1000
                      ).toFixed(1)}{" "}
                      K{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
              </CardContent>{" "}
            </Card>{" "}
          </TabsContent>{" "}
        </Tabs>{" "}
      </div>{" "}
    </AppLayout>
  );
}
