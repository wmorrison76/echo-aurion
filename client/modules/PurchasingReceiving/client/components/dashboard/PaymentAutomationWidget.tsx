import React from "react";
/** * Payment Automation Widget * Displays payment scheduling, automation status, and early pay opportunities * Integrated into dashboards and AP management interfaces */ import {
  useMemo,
  useState,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  Play,
  Pause,
  Calendar,
  Percent,
} from "lucide-react";
import type { InvoicePayment, PaymentSchedule } from "@shared/types/accounting";
interface PaymentAutomationWidgetProps {
  payments: InvoicePayment[];
  schedules?: PaymentSchedule[];
  onSchedulePayment?: (paymentIds: string[]) => void;
  onRunPaymentBatch?: () => void;
  isAutomationEnabled?: boolean;
  onToggleAutomation?: (enabled: boolean) => void;
}
export function PaymentAutomationWidget({
  payments,
  schedules = [],
  onSchedulePayment,
  onRunPaymentBatch,
  isAutomationEnabled = true,
  onToggleAutomation,
}: PaymentAutomationWidgetProps) {
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(
    new Set(),
  ); // Calculate early payment opportunities const earlyPayAnalysis = useMemo(() => { const opportunities = payments .filter((p) => p.early_discount_percent && p.status ==="pending") .map((p) => { const discountAmount = p.amount * (p.early_discount_percent! / 100); const daysToEarlyDeadline = p.early_discount_days || 10; const daysUntilDue = Math.ceil( (new Date(p.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24), ); return { paymentId: p.id, vendorId: p.vendor_id, amount: p.amount, discountPercent: p.early_discount_percent, discountAmount, daysToDeadline: daysToEarlyDeadline, daysUntilDue, isWithinWindow: daysUntilDue <= daysToEarlyDeadline, netCost: p.amount - discountAmount, }; }) .sort((a, b) => b.discountAmount - a.discountAmount); const totalPotentialSavings = opportunities.reduce( (sum, opp) => sum + opp.discountAmount, 0, ); const windowedOpportunities = opportunities.filter( (opp) => opp.isWithinWindow, ); return { opportunities, totalOpportunities: opportunities.length, windowedOpportunities: windowedOpportunities.length, totalPotentialSavings, topOpportunity: opportunities[0], }; }, [payments]); // Calculate payment run recommendations const paymentRunRecommendations = useMemo(() => { const now = new Date(); const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000); const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); return { urgent: payments.filter((p) => { const dueDate = new Date(p.due_date); return p.status ==="pending" && dueDate <= now; }), today: payments.filter((p) => { const dueDate = new Date(p.due_date); return ( p.status ==="pending" && dueDate.toDateString() === now.toDateString() ); }), tomorrow: payments.filter((p) => { const dueDate = new Date(p.due_date); return ( p.status ==="pending" && dueDate.toDateString() === tomorrow.toDateString() ); }), within7Days: payments.filter((p) => { const dueDate = new Date(p.due_date); return p.status ==="pending" && dueDate <= in7Days && dueDate > now; }), }; }, [payments]); const togglePaymentSelection = (paymentId: string) => { const newSelected = new Set(selectedPayments); if (newSelected.has(paymentId)) { newSelected.delete(paymentId); } else { newSelected.add(paymentId); } setSelectedPayments(newSelected); }; const toggleAllSelected = (paymentList: InvoicePayment[]) => { const paymentIds = paymentList.map((p) => p.id); const allSelected = paymentIds.every((id) => selectedPayments.has(id)); const newSelected = new Set(selectedPayments); if (allSelected) { paymentIds.forEach((id) => newSelected.delete(id)); } else { paymentIds.forEach((id) => newSelected.add(id)); } setSelectedPayments(newSelected); }; return ( <div className="space-y-4"> {/* Automation Status Card */} <Card> <CardHeader className="flex items-center justify-between pb-3"> <div> <CardTitle className="text-base">Payment Automation</CardTitle> <CardDescription> Real-time payment scheduling and optimization </CardDescription> </div> <Badge variant={isAutomationEnabled ?"default" :"secondary"} className="ml-auto" > {isAutomationEnabled ?"Enabled" :"Disabled"} </Badge> </CardHeader> <CardContent className="space-y-4"> <div className="flex gap-2"> <Button size="sm" variant={isAutomationEnabled ?"default" :"outline"} onClick={() => onToggleAutomation?.(!isAutomationEnabled)} className="gap-2" > {isAutomationEnabled ? ( <Pause className="h-4 w-4" /> ) : ( <Play className="h-4 w-4" /> )} {isAutomationEnabled ?"Disable" :"Enable"} </Button> <Button size="sm" variant="outline" onClick={() => onRunPaymentBatch?.()} disabled={ !isAutomationEnabled || paymentRunRecommendations.urgent.length === 0 } className="gap-2" > <Play className="h-4 w-4" /> Run Payment Batch </Button> </div> {isAutomationEnabled && ( <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700"> <p className="font-medium">✓ Hourly payment checks active</p> <p className="text-primary mt-1"> Automatic payment runs scheduled for </p> </div> )} </CardContent> </Card> {/* Early Pay Opportunities */} <Card> <CardHeader className="pb-3"> <CardTitle className="flex items-center gap-2"> <TrendingUp className="h-5 w-5 text-green-600" /> <span>Early Payment Savings</span> {earlyPayAnalysis.totalPotentialSavings > 0 && ( <Badge variant="secondary" className="ml-auto"> $ {earlyPayAnalysis.totalPotentialSavings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 0, }, )} </Badge> )} </CardTitle> <CardDescription> {earlyPayAnalysis.windowedOpportunities}/ {earlyPayAnalysis.totalOpportunities} invoices with available discounts </CardDescription> </CardHeader> <CardContent> {earlyPayAnalysis.topOpportunity ? ( <div className="space-y-3"> <div className="rounded-lg bg-green-50 p-3 border border-green-200"> <div className="flex items-center justify-between mb-2"> <p className="font-medium text-sm">Top Opportunity</p> <Badge className="gap-1"> <Percent className="h-3 w-3" /> {earlyPayAnalysis.topOpportunity.discountPercent}% </Badge> </div> <div className="space-y-1"> <p className="text-sm text-foreground"> Vendor:{""} {earlyPayAnalysis.topOpportunity.vendorId.slice(0, 20)}... </p> <div className="flex justify-between text-sm font-medium"> <span> Save: $ {earlyPayAnalysis.topOpportunity.discountAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2, }, )} </span> <span className="text-green-700"> {earlyPayAnalysis.topOpportunity.daysToDeadline} days left </span> </div> </div> </div> {earlyPayAnalysis.opportunities.length > 1 && ( <div className="text-xs text-muted-foreground"> <p className="font-medium mb-2"> All {earlyPayAnalysis.opportunities.length} Opportunities: </p> <div className="space-y-1 max-h-32 overflow-y-auto"> {earlyPayAnalysis.opportunities.map((opp) => ( <div key={opp.paymentId} className="flex justify-between p-1.5 rounded hover:bg-surface" > <span>{opp.vendorId.slice(0, 16)}...</span> <span className="font-medium"> Save $ {opp.discountAmount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0, })} </span> </div> ))} </div> </div> )} </div> ) : ( <div className="text-center py-4 text-muted-foreground text-sm"> <CheckCircle2 className="h-8 w-8 text-gray-400 mx-auto mb-2" /> <p>No early payment opportunities available</p> </div> )} </CardContent> </Card> {/* Payment Scheduling */} <Card> <CardHeader className="pb-3"> <CardTitle className="flex items-center gap-2"> <Calendar className="h-5 w-5" /> <span>Payment Scheduling</span> </CardTitle> </CardHeader> <CardContent> <Tabs defaultValue="urgent" className="w-full"> <TabsList className="grid w-full grid-cols-4"> {paymentRunRecommendations.urgent.length > 0 && ( <TabsTrigger value="urgent" className="text-xs"> OVERDUE </TabsTrigger> )} {paymentRunRecommendations.today.length > 0 && ( <TabsTrigger value="today" className="text-xs"> TODAY </TabsTrigger> )} {paymentRunRecommendations.tomorrow.length > 0 && ( <TabsTrigger value="tomorrow" className="text-xs"> TOMORROW </TabsTrigger> )} {paymentRunRecommendations.within7Days.length > 0 && ( <TabsTrigger value="week" className="text-xs"> WITHIN 7 </TabsTrigger> )} </TabsList> {paymentRunRecommendations.urgent.length > 0 && ( <TabsContent value="urgent" className="space-y-2 mt-3"> <PaymentScheduleTab title="Overdue Payments" payments={paymentRunRecommendations.urgent} selectedPayments={selectedPayments} onToggleSelection={togglePaymentSelection} onToggleAll={() => toggleAllSelected(paymentRunRecommendations.urgent) } onSchedule={onSchedulePayment} urgent /> </TabsContent> )} {paymentRunRecommendations.today.length > 0 && ( <TabsContent value="today" className="space-y-2 mt-3"> <PaymentScheduleTab title="Due Today" payments={paymentRunRecommendations.today} selectedPayments={selectedPayments} onToggleSelection={togglePaymentSelection} onToggleAll={() => toggleAllSelected(paymentRunRecommendations.today) } onSchedule={onSchedulePayment} /> </TabsContent> )} {paymentRunRecommendations.tomorrow.length > 0 && ( <TabsContent value="tomorrow" className="space-y-2 mt-3"> <PaymentScheduleTab title="Due Tomorrow" payments={paymentRunRecommendations.tomorrow} selectedPayments={selectedPayments} onToggleSelection={togglePaymentSelection} onToggleAll={() => toggleAllSelected(paymentRunRecommendations.tomorrow) } onSchedule={onSchedulePayment} /> </TabsContent> )} {paymentRunRecommendations.within7Days.length > 0 && ( <TabsContent value="week" className="space-y-2 mt-3"> <PaymentScheduleTab title="Due Within 7 Days" payments={paymentRunRecommendations.within7Days} selectedPayments={selectedPayments} onToggleSelection={togglePaymentSelection} onToggleAll={() => toggleAllSelected(paymentRunRecommendations.within7Days) } onSchedule={onSchedulePayment} /> </TabsContent> )} </Tabs> </CardContent> </Card> </div> );
} /** * Payment Schedule Tab Component */
function PaymentScheduleTab({
  title,
  payments,
  selectedPayments,
  onToggleSelection,
  onToggleAll,
  onSchedule,
  urgent = false,
}: {
  title: string;
  payments: InvoicePayment[];
  selectedPayments: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleAll: () => void;
  onSchedule?: (ids: string[]) => void;
  urgent?: boolean;
}) {
  const selectedCount = payments.filter((p) =>
    selectedPayments.has(p.id),
  ).length;
  const selectedAmount = payments
    .filter((p) => selectedPayments.has(p.id))
    .reduce((sum, p) => sum + p.amount, 0);
  return (
    <div className="space-y-2">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <label className="flex items-center gap-2">
          {" "}
          <input
            type="checkbox"
            checked={selectedCount === payments.length && selectedCount > 0}
            onChange={onToggleAll}
            className="rounded border-border"
          />{" "}
          <span className="text-sm font-medium">{title}</span>{" "}
        </label>{" "}
        {selectedCount > 0 && (
          <Button
            size="sm"
            onClick={() => {
              const selectedIds = Array.from(selectedPayments).filter((id) =>
                payments.some((p) => p.id === id),
              );
              onSchedule?.(selectedIds);
            }}
            className="gap-1"
          >
            {" "}
            <CheckCircle2 className="h-4 w-4" /> Schedule ({selectedCount}){" "}
          </Button>
        )}{" "}
      </div>{" "}
      <div className="space-y-1">
        {" "}
        {payments.slice(0, 5).map((payment) => (
          <PaymentScheduleItem
            key={payment.id}
            payment={payment}
            selected={selectedPayments.has(payment.id)}
            onSelect={() => onToggleSelection(payment.id)}
            urgent={urgent}
          />
        ))}{" "}
      </div>{" "}
      {selectedCount > 0 && (
        <div className="pt-2 border-t text-xs font-medium">
          {" "}
          Selected: ${" "}
          {selectedAmount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
        </div>
      )}{" "}
    </div>
  );
} /** * Individual Payment Schedule Item */
function PaymentScheduleItem({
  payment,
  selected,
  onSelect,
  urgent = false,
}: {
  payment: InvoicePayment;
  selected: boolean;
  onSelect: () => void;
  urgent?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${selected ? "bg-blue-50 border-primary" : urgent ? "bg-red-50 border-red-200 hover:bg-red-100" : "bg-surface border-gray-200 hover:bg-surface"}`}
      onClick={onSelect}
    >
      {" "}
      <input
        type="checkbox"
        checked={selected}
        onChange={onSelect}
        className="rounded"
      />{" "}
      <div className="flex-1 min-w-0">
        {" "}
        <p className="text-xs font-medium truncate">{payment.vendor_id}</p>{" "}
        <p className="text-xs text-gray-300">
          {" "}
          Due {new Date(payment.due_date).toLocaleDateString()}{" "}
        </p>{" "}
      </div>{" "}
      <div className="text-right">
        {" "}
        <p className="text-xs font-semibold">
          {" "}
          ${" "}
          {payment.amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
        </p>{" "}
        {payment.early_discount_percent && (
          <Badge variant="secondary" className="text-xs mt-1">
            {" "}
            {payment.early_discount_percent}% off{" "}
          </Badge>
        )}{" "}
      </div>{" "}
    </div>
  );
}
