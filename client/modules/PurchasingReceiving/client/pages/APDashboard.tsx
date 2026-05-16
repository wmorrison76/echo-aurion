import React from "react";
/** * Accounts Payable Dashboard * Real-time payment tracking, scheduling, and vendor management */ import {
  useMemo,
  useState,
} from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useMultiOutlet } from "@/context/MultiOutletContext";
import { useAccounting } from "@/hooks/useAccounting";
import { logger } from "@/lib/logger";
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
import { TurtleLoader } from "@/components/TurtleLoader";
import { PaymentAutomationWidget } from "@/components/dashboard/PaymentAutomationWidget";
import {
  AlertCircle,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import type { InvoicePayment } from "@shared/types/accounting";
export default function APDashboard() {
  const { user } = useAuth();
  const { currentOutlet } = useMultiOutlet();
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const {
    payments,
    metrics,
    pandl,
    vendorAnalyses,
    isLoading,
    error,
    lastUpdated,
  } = useAccounting({
    organizationId: currentOutlet?.organization_id || "",
    outletId: currentOutlet?.id,
  }); // Check user permissions const hasAPAccess = user?.role ==="admin" || user?.role ==="finance" || user?.role ==="manager"; if (!hasAPAccess) { return ( <AppLayout> <Card className="border-red-200 bg-red-50"> <CardHeader> <CardTitle className="text-red-900">Access Denied</CardTitle> <CardDescription className="text-red-700"> You don't have permission to view Accounts Payable </CardDescription> </CardHeader> <CardContent> <p className="text-sm text-red-600"> Contact your administrator to request AP access. </p> </CardContent> </Card> </AppLayout> ); } if (!currentOutlet) { return ( <AppLayout> <Card> <CardHeader> <CardTitle>Accounts Payable</CardTitle> <CardDescription>Select an outlet to continue</CardDescription> </CardHeader> <CardContent> <TurtleLoader message="Select Outlet" note="Choose from header" /> </CardContent> </Card> </AppLayout> ); } // Calculate payment analytics const analytics = useMemo(() => { const now = new Date(); const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000); const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); return { totalPayable: payments.reduce((sum, p) => sum + p.amount, 0), overdueCount: payments.filter((p) => { const dueDate = new Date(p.due_date); return p.status !=="completed" && dueDate < now; }).length, overdueAmount: payments .filter((p) => { const dueDate = new Date(p.due_date); return p.status !=="completed" && dueDate < now; }) .reduce((sum, p) => sum + p.amount, 0), dueToday: payments.filter((p) => { const dueDate = new Date(p.due_date); return ( p.status !=="completed" && dueDate.toDateString() === now.toDateString() ); }).length, dueTomorrow: payments.filter((p) => { const dueDate = new Date(p.due_date); return ( p.status !=="completed" && dueDate.toDateString() === tomorrow.toDateString() ); }).length, dueIn7Days: payments.filter((p) => { const dueDate = new Date(p.due_date); return p.status !=="completed" && dueDate <= in7Days && dueDate > now; }).length, dueIn30Days: payments.filter((p) => { const dueDate = new Date(p.due_date); return ( p.status !=="completed" && dueDate <= in30Days && dueDate > in7Days ); }).length, earlyPayOpportunities: payments.filter( (p) => p.early_discount_percent && p.status ==="pending", ).length, }; }, [payments]); const filteredPayments = selectedVendor ? payments.filter((p) => p.vendor_id === selectedVendor) : payments; if (isLoading && !payments.length) { return ( <AppLayout> <TurtleLoader message="Loading AP Dashboard" note="Fetching payment data..." /> </AppLayout> ); } return ( <AppLayout> <div className="space-y-6"> {/* Header */} <div> <h1 className="text-3xl font-bold">Accounts Payable</h1> <p className="text-sm text-gray-300 dark:text-gray-300"> Real-time payment tracking and vendor management {lastUpdated && ( <span className="ml-2 text-xs"> (Updated {new Date(lastUpdated).toLocaleTimeString()}) </span> )} </p> </div> {error && ( <Card className="border-yellow-200 bg-yellow-50"> <CardHeader> <CardTitle className="flex items-center gap-2 text-yellow-900"> <AlertCircle className="h-5 w-5" /> Data Load Warning </CardTitle> </CardHeader> <CardContent className="text-sm text-yellow-700"> {error} </CardContent> </Card> )} {/* Key Metrics */} <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"> {/* Total Payable */} <Card> <CardHeader className="pb-3"> <CardTitle className="text-sm font-medium text-gray-300 dark:text-gray-300"> Total Payable </CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold"> $ {analytics.totalPayable.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2, })} </div> <p className="text-xs text-gray-300 mt-1"> {payments.filter((p) => p.status !=="completed").length}{""} pending </p> </CardContent> </Card> {/* Overdue Amount */} <Card className={ analytics.overdueAmount > 0 ?"border-red-200 bg-red-50" :"" } > <CardHeader className="pb-3"> <CardTitle className="flex items-center gap-2 text-sm font-medium"> <AlertCircle className="h-4 w-4 text-red-600" /> <span className={ analytics.overdueAmount > 0 ?"text-red-900" :"text-gray-300 dark:text-gray-300" } > Overdue </span> </CardTitle> </CardHeader> <CardContent> <div className={`text-2xl font-bold ${analytics.overdueAmount > 0 ?"text-red-600" :""}`} > $ {analytics.overdueAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2, })} </div> <p className="text-xs text-gray-300 mt-1"> {analytics.overdueCount} invoices </p> </CardContent> </Card> {/* Due Soon (7 days) */} <Card className="border-yellow-200 bg-yellow-50"> <CardHeader className="pb-3"> <CardTitle className="flex items-center gap-2 text-sm font-medium"> <Clock className="h-4 w-4 text-yellow-600" /> <span className="text-yellow-900">Due Soon</span> </CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold text-yellow-600"> $ {payments .filter((p) => { const dueDate = new Date(p.due_date); const now = new Date(); const in7Days = new Date( now.getTime() + 7 * 24 * 60 * 60 * 1000, ); return ( p.status !=="completed" && dueDate <= in7Days && dueDate >= now ); }) .reduce((sum, p) => sum + p.amount, 0) .toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2, })} </div> <p className="text-xs text-gray-300 mt-1"> {analytics.dueIn7Days} invoices </p> </CardContent> </Card> {/* Early Pay Opportunities */} <Card className="border-green-200 bg-green-50"> <CardHeader className="pb-3"> <CardTitle className="flex items-center gap-2 text-sm font-medium"> <ArrowUpRight className="h-4 w-4 text-green-600" /> <span className="text-green-900">Early Pay Savings</span> </CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold text-green-600"> {analytics.earlyPayOpportunities} invoices </div> <p className="text-xs text-gray-300 mt-1">Available discounts</p> </CardContent> </Card> </div> {/* Main Content Tabs */} <Tabs defaultValue="automation" className="space-y-4"> <TabsList> <TabsTrigger value="automation">Automation</TabsTrigger> <TabsTrigger value="payments">Payments</TabsTrigger> <TabsTrigger value="schedule">Payment Schedule</TabsTrigger> <TabsTrigger value="vendors">Vendors</TabsTrigger> </TabsList> {/* Automation Tab */} <TabsContent value="automation" className="space-y-4"> <PaymentAutomationWidget payments={filteredPayments} isAutomationEnabled={true} onSchedulePayment={(paymentIds) => { logger.info("Scheduling payments:", paymentIds); }} onRunPaymentBatch={() => { logger.info("Running payment batch"); }} onToggleAutomation={(enabled) => { logger.info("Automation toggled:", enabled); }} /> </TabsContent> {/* Payments Tab */} <TabsContent value="payments" className="space-y-4"> <Card> <CardHeader> <CardTitle>Payment List</CardTitle> <CardDescription> {filteredPayments.length} payment {filteredPayments.length !== 1 ?"s" :""} </CardDescription> </CardHeader> <CardContent> {filteredPayments.length === 0 ? ( <div className="text-center py-8"> <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-2" /> <p className="text-gray-300 dark:text-gray-300">No payments found</p> </div> ) : ( <div className="space-y-2"> {filteredPayments.slice(0, 10).map((payment) => ( <PaymentRow key={payment.id} payment={payment} /> ))} {filteredPayments.length > 10 && ( <p className="text-xs text-gray-300 pt-4"> Showing 10 of {filteredPayments.length} payments </p> )} </div> )} </CardContent> </Card> </TabsContent> {/* Schedule Tab */} <TabsContent value="schedule" className="space-y-4"> <Card> <CardHeader> <CardTitle>Payment Schedule</CardTitle> <CardDescription> Upcoming payment runs by due date </CardDescription> </CardHeader> <CardContent> <div className="space-y-3"> {analytics.dueToday > 0 && ( <ScheduleItem label="Due Today" count={analytics.dueToday} icon={<AlertCircle className="h-4 w-4" />} color="red" /> )} {analytics.dueTomorrow > 0 && ( <ScheduleItem label="Due Tomorrow" count={analytics.dueTomorrow} icon={<Calendar className="h-4 w-4" />} color="yellow" /> )} {analytics.dueIn7Days > 0 && ( <ScheduleItem label="Due in 7 Days" count={analytics.dueIn7Days} icon={<Clock className="h-4 w-4" />} color="blue" /> )} {analytics.dueIn30Days > 0 && ( <ScheduleItem label="Due in 30 Days" count={analytics.dueIn30Days} icon={<TrendingUp className="h-4 w-4" />} color="gray" /> )} </div> </CardContent> </Card> </TabsContent> {/* Vendors Tab */} <TabsContent value="vendors" className="space-y-4"> <Card> <CardHeader> <CardTitle>Top Vendors by Payable</CardTitle> <CardDescription> Vendors with highest outstanding balances </CardDescription> </CardHeader> <CardContent> {vendorAnalyses.length === 0 ? ( <div className="text-center py-8"> <p className="text-gray-300 dark:text-gray-300">No vendor data available</p> </div> ) : ( <div className="space-y-2"> {vendorAnalyses.slice(0, 8).map((vendor) => ( <div key={vendor.vendor_id} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface cursor-pointer" onClick={() => setSelectedVendor(vendor.vendor_id)} > <div className="flex-1"> <p className="font-medium text-sm">{vendor.name}</p> <p className="text-xs text-gray-300"> {vendor.invoice_count} invoices </p> </div> <div className="text-right"> <p className="font-semibold"> $ {vendor.total_amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2, })} </p> {vendor.avg_days_to_pay && ( <p className="text-xs text-gray-300"> {Math.round(vendor.avg_days_to_pay)} days avg </p> )} </div> </div> ))} </div> )} </CardContent> </Card> </TabsContent> </Tabs> </div> </AppLayout> );
} /** * Payment Row Component */
function PaymentRow({ payment }: { payment: InvoicePayment }) {
  const dueDate = new Date(payment.due_date);
  const now = new Date();
  const isOverdue = payment.status !== "completed" && dueDate < now;
  const daysUntilDue = Math.ceil(
    (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  const statusConfig: Record<
    string,
    { color: string; icon: any; text: string }
  > = {
    pending: { color: "yellow", icon: Clock, text: "Pending" },
    scheduled: { color: "blue", icon: Calendar, text: "Scheduled" },
    processing: { color: "blue", icon: TrendingUp, text: "Processing" },
    completed: { color: "green", icon: CheckCircle2, text: "Completed" },
    failed: { color: "red", icon: XCircle, text: "Failed" },
    cancelled: { color: "gray", icon: XCircle, text: "Cancelled" },
  };
  const config = statusConfig[payment.status] || statusConfig.pending;
  const Icon = config.icon;
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-surface">
      {" "}
      <div className="flex-1">
        {" "}
        <div className="flex items-center gap-2 mb-1">
          {" "}
          <p className="font-medium text-sm">{payment.vendor_id}</p>{" "}
          <Badge variant="outline" className="text-xs">
            {" "}
            {payment.payment_method}{" "}
          </Badge>{" "}
          {payment.early_discount_percent && (
            <Badge variant="secondary" className="text-xs">
              {" "}
              {payment.early_discount_percent}% early pay{" "}
            </Badge>
          )}{" "}
        </div>{" "}
        <p className="text-xs text-gray-300">
          {" "}
          Invoice {payment.invoice_id?.slice(0, 8)}... · Due{""}{" "}
          {dueDate.toLocaleDateString()}{" "}
          {isOverdue && (
            <span className="text-red-600 font-medium ml-1">(OVERDUE)</span>
          )}{" "}
          {!isOverdue && daysUntilDue > 0 && (
            <span className="text-gray-300 ml-1">({daysUntilDue} days)</span>
          )}{" "}
        </p>{" "}
      </div>{" "}
      <div className="flex items-center gap-4">
        {" "}
        <div className="text-right">
          {" "}
          <p className="font-semibold">
            {" "}
            ${" "}
            {payment.amount.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
          </p>{" "}
          <p className="text-xs text-gray-300">{payment.currency}</p>{" "}
        </div>{" "}
        <div className="flex items-center gap-2">
          {" "}
          <Icon className={`h-4 w-4 text-${config.color}-600`} />{" "}
          <span className={`text-xs font-medium text-${config.color}-700`}>
            {" "}
            {config.text}{" "}
          </span>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
} /** * Schedule Item Component */
function ScheduleItem({
  label,
  count,
  icon,
  color,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    red: "bg-red-50 text-red-700",
    yellow: "bg-yellow-50 text-yellow-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    gray: "bg-surface text-foreground",
  };
  return (
    <div
      className={`p-3 rounded-lg flex items-center justify-between ${colorClasses[color]}`}
    >
      {" "}
      <div className="flex items-center gap-2">
        {" "}
        {icon} <span className="font-medium">{label}</span>{" "}
      </div>{" "}
      <span className="font-bold">{count}</span>{" "}
    </div>
  );
}
