import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Truck,
  FileText,
  Warehouse,
  CreditCard,
  BarChart3,
} from "lucide-react";
export interface WorkflowMetrics {
  orders: { pending: number; confirmed: number; totalValue: number };
  receiving: { expected: number; arrived: number; processingTime: number };
  invoices: {
    pending: number;
    categorized: number;
    approved: number;
    totalAmount: number;
  };
  inventory: {
    value: number;
    items: number;
    lowStockItems: number;
    lastCountDate?: string;
  };
  commissary: { pendingTransfers: number; activeTransfers: number };
  payments: {
    pending: number;
    dueSoon: number;
    totalDue: number;
    lastPaymentDate?: string;
  };
}
interface UnifiedWorkflowDashboardProps {
  metrics: WorkflowMetrics;
  isLoading?: boolean;
}
export function UnifiedWorkflowDashboard({
  metrics,
  isLoading = false,
}: UnifiedWorkflowDashboardProps) {
  const workflows = useMemo(() => {
    return [
      {
        title: "Purchase Orders",
        icon: ShoppingCart,
        status: metrics.orders.pending > 0 ? "active" : "healthy",
        value: metrics.orders.pending,
        label: "pending",
        total: metrics.orders.confirmed + metrics.orders.pending,
        amount: `$${metrics.orders.totalValue.toFixed(2)}`,
        href: "/purchasing",
        color: "text-cyan-400",
      },
      {
        title: "Receiving",
        icon: Truck,
        status: metrics.receiving.arrived > 0 ? "active" : "pending",
        value: metrics.receiving.arrived,
        label: "arrived",
        total: metrics.receiving.expected,
        amount: `${metrics.receiving.processingTime} avg hours`,
        href: "/receiving",
        color: "text-emerald-400",
      },
      {
        title: "Invoice Processing",
        icon: FileText,
        status: metrics.invoices.pending > 0 ? "urgent" : "healthy",
        value: metrics.invoices.pending,
        label: "pending review",
        total:
          metrics.invoices.approved +
          metrics.invoices.categorized +
          metrics.invoices.pending,
        amount: `$${metrics.invoices.totalAmount.toFixed(2)}`,
        href: "/invoices",
        color: "text-yellow-400",
      },
      {
        title: "Inventory",
        icon: Warehouse,
        status: metrics.inventory.lowStockItems > 0 ? "warning" : "healthy",
        value: metrics.inventory.lowStockItems,
        label: "low stock items",
        total: metrics.inventory.items,
        amount: `$${metrics.inventory.value.toFixed(2)} value`,
        href: "/inventory",
        color: "text-blue-400",
      },
      {
        title: "Commissary Transfers",
        icon: Package,
        status: metrics.commissary.pendingTransfers > 0 ? "active" : "healthy",
        value: metrics.commissary.pendingTransfers,
        label: "pending approval",
        total:
          metrics.commissary.activeTransfers +
          metrics.commissary.pendingTransfers,
        amount: "inter-outlet transfers",
        href: "/inventory",
        color: "text-purple-400",
      },
      {
        title: "Accounts Payable",
        icon: CreditCard,
        status: metrics.payments.dueSoon > 0 ? "urgent" : "active",
        value: metrics.payments.pending,
        label: "pending payment",
        total: metrics.payments.dueSoon,
        amount: `$${metrics.payments.totalDue.toFixed(2)} due`,
        href: "/ap-dashboard",
        color: "text-orange-400",
      },
    ];
  }, [metrics]);
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "urgent":
        return "border-red-400/40 bg-red-500/10 text-red-200";
      case "warning":
        return "border-yellow-400/40 bg-yellow-500/10 text-yellow-200";
      case "active":
        return "border-blue-400/40 bg-primary/10 text-blue-200";
      case "healthy":
        return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
      default:
        return "border-cyan-400/40 bg-cyan-500/10 text-cyan-200";
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "urgent":
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      case "active":
        return <Clock className="h-4 w-4 text-blue-400" />;
      case "healthy":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-cyan-400" />;
    }
  };
  const totalPendingValue = useMemo(() => {
    return (
      metrics.orders.totalValue +
      metrics.invoices.totalAmount +
      metrics.inventory.value +
      metrics.payments.totalDue
    );
  }, [metrics]);
  return (
    <div className="space-y-6">
      {" "}
      {/* Summary Cards */}{" "}
      <div className="grid gap-4 md:grid-cols-4">
        {" "}
        <Card className="border-cyan-400/30 bg-card">
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm text-cyan-200/70 flex items-center gap-2">
              {" "}
              <DollarSign className="h-4 w-4" /> Total Pipeline Value{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-3xl font-semibold text-cyan-100">
              {" "}
              ${totalPendingValue.toFixed(2)}{" "}
            </div>{" "}
            <p className="text-xs text-cyan-200/60 mt-2">
              {" "}
              Across all active workflows{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="border-red-400/30 bg-card">
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm text-red-200/70 flex items-center gap-2">
              {" "}
              <AlertCircle className="h-4 w-4" /> Urgent Items{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-3xl font-semibold text-red-100">
              {" "}
              {metrics.invoices.pending + metrics.payments.dueSoon}{" "}
            </div>{" "}
            <p className="text-xs text-red-200/60 mt-2">
              {" "}
              Invoices & payments due{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="border-yellow-400/30 bg-card">
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm text-yellow-200/70 flex items-center gap-2">
              {" "}
              <Package className="h-4 w-4" /> Inventory Status{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-3xl font-semibold text-yellow-100">
              {" "}
              {metrics.inventory.lowStockItems}{" "}
            </div>{" "}
            <p className="text-xs text-yellow-200/60 mt-2">
              {" "}
              Items below min threshold{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="border-emerald-400/30 bg-card">
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm text-emerald-200/70 flex items-center gap-2">
              {" "}
              <CheckCircle2 className="h-4 w-4" /> Completed Today{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-3xl font-semibold text-emerald-100">
              12
            </div>{" "}
            <p className="text-xs text-emerald-200/60 mt-2">
              {" "}
              Transactions processed{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Workflow Status Grid */}{" "}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {" "}
        {workflows.map((workflow) => {
          const Icon = workflow.icon;
          const completionPercent =
            workflow.total > 0 ? (workflow.value / workflow.total) * 100 : 0;
          return (
            <Link key={workflow.title} to={workflow.href}>
              {" "}
              <Card className="border-cyan-400/20 bg-card hover:border-cyan-400/40 hover:bg-card transition-all cursor-pointer h-full">
                {" "}
                <CardHeader className="pb-3">
                  {" "}
                  <div className="flex items-start justify-between">
                    {" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <Icon className={`h-5 w-5 ${workflow.color}`} />{" "}
                      <CardTitle className="text-base text-cyan-100">
                        {" "}
                        {workflow.title}{" "}
                      </CardTitle>{" "}
                    </div>{" "}
                    <Badge className={getStatusBadgeColor(workflow.status)}>
                      {" "}
                      {getStatusIcon(workflow.status)}{" "}
                      <span className="ml-1">
                        {" "}
                        {workflow.status === "urgent"
                          ? "Urgent"
                          : workflow.status === "warning"
                            ? "Warning"
                            : workflow.status === "active"
                              ? "Active"
                              : "Healthy"}{" "}
                      </span>{" "}
                    </Badge>{" "}
                  </div>{" "}
                </CardHeader>{" "}
                <CardContent className="space-y-3">
                  {" "}
                  <div className="space-y-2">
                    {" "}
                    <div className="flex justify-between text-sm">
                      {" "}
                      <span className="text-cyan-200/70">
                        {" "}
                        {workflow.value} {workflow.label}{" "}
                      </span>{" "}
                      <span className="font-semibold text-cyan-100">
                        {" "}
                        {completionPercent.toFixed(0)}%{" "}
                      </span>{" "}
                    </div>{" "}
                    <Progress
                      value={completionPercent}
                      className="h-2 bg-surface"
                    />{" "}
                  </div>{" "}
                  <div className="rounded-lg bg-surface px-3 py-2 space-y-1">
                    {" "}
                    <div className="text-xs text-cyan-200/60">
                      {" "}
                      {workflow.total} total{" "}
                    </div>{" "}
                    <div className="text-sm font-semibold text-cyan-100">
                      {" "}
                      {workflow.amount}{" "}
                    </div>{" "}
                  </div>{" "}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-cyan-400/30 text-cyan-200 hover:border-cyan-300 hover:text-cyan-100"
                  >
                    {" "}
                    View Details →{" "}
                  </Button>{" "}
                </CardContent>{" "}
              </Card>{" "}
            </Link>
          );
        })}{" "}
      </div>{" "}
      {/* Critical Alerts Section */}{" "}
      {(metrics.invoices.pending > 0 ||
        metrics.payments.dueSoon > 0 ||
        metrics.inventory.lowStockItems > 0) && (
        <Card className="border-red-400/40 bg-red-500/10">
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="flex items-center gap-2 text-red-100">
              {" "}
              <AlertCircle className="h-5 w-5" /> Action Required{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent className="space-y-3">
            {" "}
            {metrics.invoices.pending > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-red-400/30 bg-card p-3">
                {" "}
                <div>
                  {" "}
                  <div className="font-semibold text-red-100">
                    {" "}
                    {metrics.invoices.pending} Invoices Pending Review{" "}
                  </div>{" "}
                  <div className="text-xs text-red-200/70">
                    {" "}
                    Total: ${metrics.invoices.totalAmount.toFixed(2)}{" "}
                  </div>{" "}
                </div>{" "}
                <Link to="/invoices">
                  {" "}
                  <Button size="sm" variant="outline" className="gap-2">
                    {" "}
                    <FileText className="h-3 w-3" /> Review{" "}
                  </Button>{" "}
                </Link>{" "}
              </div>
            )}{" "}
            {metrics.payments.dueSoon > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-orange-400/30 bg-card p-3">
                {" "}
                <div>
                  {" "}
                  <div className="font-semibold text-orange-100">
                    {" "}
                    {metrics.payments.dueSoon} Payments Due Soon{" "}
                  </div>{" "}
                  <div className="text-xs text-orange-200/70">
                    {" "}
                    Total: ${metrics.payments.totalDue.toFixed(2)}{" "}
                  </div>{" "}
                </div>{" "}
                <Link to="/ap-dashboard">
                  {" "}
                  <Button size="sm" variant="outline" className="gap-2">
                    {" "}
                    <CreditCard className="h-3 w-3" /> Pay{" "}
                  </Button>{" "}
                </Link>{" "}
              </div>
            )}{" "}
            {metrics.inventory.lowStockItems > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-yellow-400/30 bg-card p-3">
                {" "}
                <div>
                  {" "}
                  <div className="font-semibold text-yellow-100">
                    {" "}
                    {metrics.inventory.lowStockItems} Items Below Min Stock{" "}
                  </div>{" "}
                  <div className="text-xs text-yellow-200/70">
                    {" "}
                    Consider reordering from commissary{" "}
                  </div>{" "}
                </div>{" "}
                <Link to="/inventory">
                  {" "}
                  <Button size="sm" variant="outline" className="gap-2">
                    {" "}
                    <Package className="h-3 w-3" /> Reorder{" "}
                  </Button>{" "}
                </Link>{" "}
              </div>
            )}{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      {/* Analytics & Reports */}{" "}
      <Card className="border-cyan-400/30 bg-card">
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="flex items-center gap-2">
            {" "}
            <BarChart3 className="h-5 w-5" /> Reports & Analytics{" "}
          </CardTitle>{" "}
          <CardDescription className="text-cyan-200/70">
            {" "}
            Detailed insights into your workflow performance{" "}
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="grid gap-3 md:grid-cols-2">
            {" "}
            <Link to="/analytics">
              {" "}
              <Button variant="outline" className="w-full justify-start gap-2">
                {" "}
                <TrendingUp className="h-4 w-4" /> Vendor Performance{" "}
              </Button>{" "}
            </Link>{" "}
            <Link to="/analytics">
              {" "}
              <Button variant="outline" className="w-full justify-start gap-2">
                {" "}
                <TrendingDown className="h-4 w-4" /> Cost Analysis{" "}
              </Button>{" "}
            </Link>{" "}
            <Link to="/analytics">
              {" "}
              <Button variant="outline" className="w-full justify-start gap-2">
                {" "}
                <Package className="h-4 w-4" /> Inventory Turnover{" "}
              </Button>{" "}
            </Link>{" "}
            <Link to="/ap-dashboard">
              {" "}
              <Button variant="outline" className="w-full justify-start gap-2">
                {" "}
                <Clock className="h-4 w-4" /> Payment Aging{" "}
              </Button>{" "}
            </Link>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
}
