import React, { useCallback, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  Clock,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export interface PaymentMethod {
  id: string;
  type: "bank_transfer" | "credit_card" | "check" | "ach";
  name: string;
  isDefault: boolean;
  bankName?: string;
  lastFourDigits?: string;
}
export interface ScheduledPayment {
  id: string;
  invoiceId: string;
  vendorName: string;
  amount: number;
  dueDate: string;
  scheduledDate: string;
  paymentMethod: string;
  status: "pending" | "scheduled" | "processing" | "completed" | "failed";
  retryCount?: number;
  lastError?: string;
}
interface PaymentSchedulerProps {
  pendingPayments: ScheduledPayment[];
  paymentMethods: PaymentMethod[];
  onSchedulePayment: (payment: ScheduledPayment) => Promise<void>;
  onCancelPayment: (paymentId: string) => Promise<void>;
  isLoading?: boolean;
}
export function PaymentScheduler({
  pendingPayments,
  paymentMethods,
  onSchedulePayment,
  onCancelPayment,
  isLoading = false,
}: PaymentSchedulerProps) {
  const [activeTab, setActiveTab] = useState<
    "upcoming" | "schedule" | "history"
  >("upcoming");
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState(
    paymentMethods.find((m) => m.isDefault)?.id || "",
  );
  const [batchScheduleDate, setBatchScheduleDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const upcomingPayments = useMemo(() => {
    return pendingPayments
      .filter((p) => p.status === "pending" || p.status === "scheduled")
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      );
  }, [pendingPayments]);
  const urgentPayments = useMemo(() => {
    const today = new Date();
    return upcomingPayments.filter((p) => {
      const dueDate = new Date(p.dueDate);
      const daysUntilDue =
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntilDue <= 3;
    });
  }, [upcomingPayments]);
  const totalAmountDue = useMemo(() => {
    return upcomingPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [upcomingPayments]);
  const selectedPaymentAmount = useMemo(() => {
    return upcomingPayments
      .filter((p) => selectedPayments.includes(p.id))
      .reduce((sum, p) => sum + p.amount, 0);
  }, [upcomingPayments, selectedPayments]);
  const handleSelectPayment = useCallback((paymentId: string) => {
    setSelectedPayments((prev) =>
      prev.includes(paymentId)
        ? prev.filter((id) => id !== paymentId)
        : [...prev, paymentId],
    );
  }, []);
  const handleSelectAll = useCallback(() => {
    if (selectedPayments.length === upcomingPayments.length) {
      setSelectedPayments([]);
    } else {
      setSelectedPayments(upcomingPayments.map((p) => p.id));
    }
  }, [selectedPayments, upcomingPayments]);
  const handleBatchSchedule = useCallback(async () => {
    if (selectedPayments.length === 0 || !selectedMethod) {
      alert("Select payments and payment method");
      return;
    }
    setIsProcessing(true);
    try {
      for (const paymentId of selectedPayments) {
        const payment = upcomingPayments.find((p) => p.id === paymentId);
        if (payment) {
          await onSchedulePayment({
            ...payment,
            scheduledDate: batchScheduleDate,
            paymentMethod: selectedMethod,
            status: "scheduled",
          });
        }
      }
      setSelectedPayments([]);
    } finally {
      setIsProcessing(false);
    }
  }, [
    selectedPayments,
    upcomingPayments,
    selectedMethod,
    batchScheduleDate,
    onSchedulePayment,
  ]);
  const getDaysUntilDue = (dueDate: string): number => {
    const today = new Date();
    const due = new Date(dueDate);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };
  const getStatusColor = (status: ScheduledPayment["status"]) => {
    switch (status) {
      case "pending":
        return "border-yellow-400/40 bg-yellow-500/10 text-yellow-200";
      case "scheduled":
        return "border-blue-400/40 bg-primary/10 text-blue-200";
      case "processing":
        return "border-cyan-400/40 bg-cyan-500/10 text-cyan-200";
      case "completed":
        return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
      case "failed":
        return "border-red-400/40 bg-red-500/10 text-red-200";
    }
  };
  return (
    <div className="space-y-6">
      {" "}
      {/* Summary Cards */}{" "}
      <div className="grid gap-4 md:grid-cols-3">
        {" "}
        <Card className="border-yellow-400/30 bg-card">
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm text-yellow-200/70">
              Pending Payments
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-semibold text-yellow-100">
              {upcomingPayments.length}
            </div>{" "}
            <div className="text-xs text-yellow-200/60 mt-1">
              {" "}
              ${totalAmountDue.toFixed(2)} total due{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="border-red-400/30 bg-card">
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm text-red-200/70">
              Urgent (≤3 days)
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-semibold text-red-100">
              {urgentPayments.length}
            </div>{" "}
            <div className="text-xs text-red-200/60 mt-1">
              {" "}
              ${urgentPayments
                .reduce((sum, p) => sum + p.amount, 0)
                .toFixed(2)}{" "}
              due soon{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="border-emerald-400/30 bg-card">
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm text-emerald-200/70">
              Selected for Payment
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-semibold text-emerald-100">
              {selectedPayments.length}
            </div>{" "}
            <div className="text-xs text-emerald-200/60 mt-1">
              {" "}
              ${selectedPaymentAmount.toFixed(2)} selected{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Tabs */}{" "}
      <Tabs
        value={activeTab}
        onValueChange={(v: any) => setActiveTab(v)}
        className="w-full"
      >
        {" "}
        <TabsList className="grid w-full grid-cols-3">
          {" "}
          <TabsTrigger value="upcoming">Upcoming Payments</TabsTrigger>{" "}
          <TabsTrigger value="schedule">Batch Schedule</TabsTrigger>{" "}
          <TabsTrigger value="history">Payment History</TabsTrigger>{" "}
        </TabsList>{" "}
        {/* Upcoming Payments Tab */}{" "}
        <TabsContent value="upcoming" className="space-y-4">
          {" "}
          <Card className="border-cyan-400/30 bg-card">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="flex items-center gap-2">
                {" "}
                <Clock className="h-5 w-5" /> Pending Payments{" "}
              </CardTitle>{" "}
              <CardDescription className="text-cyan-200/70">
                {" "}
                Review and schedule payments to vendors{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              {urgentPayments.length > 0 && (
                <Alert className="mb-4 border-red-400/40 bg-red-500/10">
                  {" "}
                  <AlertCircle className="h-4 w-4 text-red-400" />{" "}
                  <AlertDescription className="text-red-200">
                    {" "}
                    {urgentPayments.length} payments due within 3 days. Process
                    these first.{" "}
                  </AlertDescription>{" "}
                </Alert>
              )}{" "}
              <div className="overflow-x-auto">
                {" "}
                <Table>
                  {" "}
                  <TableHeader>
                    {" "}
                    <TableRow className="border-cyan-400/20">
                      {" "}
                      <TableHead className="text-cyan-200/70 w-12">
                        {" "}
                        <input
                          type="checkbox"
                          checked={
                            selectedPayments.length === upcomingPayments.length
                          }
                          onChange={handleSelectAll}
                          className="rounded border-cyan-400"
                        />{" "}
                      </TableHead>{" "}
                      <TableHead className="text-cyan-200/70">Vendor</TableHead>{" "}
                      <TableHead className="text-right text-cyan-200/70">
                        Amount
                      </TableHead>{" "}
                      <TableHead className="text-cyan-200/70">
                        Due Date
                      </TableHead>{" "}
                      <TableHead className="text-cyan-200/70">Days</TableHead>{" "}
                      <TableHead className="text-cyan-200/70">
                        Status
                      </TableHead>{" "}
                    </TableRow>{" "}
                  </TableHeader>{" "}
                  <TableBody>
                    {" "}
                    {upcomingPayments.length === 0 ? (
                      <TableRow>
                        {" "}
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-cyan-200/60"
                        >
                          {" "}
                          No pending payments{" "}
                        </TableCell>{" "}
                      </TableRow>
                    ) : (
                      upcomingPayments.map((payment) => {
                        const daysUntilDue = getDaysUntilDue(payment.dueDate);
                        const isUrgent = daysUntilDue <= 3;
                        return (
                          <TableRow
                            key={payment.id}
                            className={`border-b ${isUrgent ? "border-red-400/10 hover:bg-red-500/5" : "border-cyan-400/10"}`}
                          >
                            {" "}
                            <TableCell>
                              {" "}
                              <input
                                type="checkbox"
                                checked={selectedPayments.includes(payment.id)}
                                onChange={() => handleSelectPayment(payment.id)}
                                className="rounded border-cyan-400"
                              />{" "}
                            </TableCell>{" "}
                            <TableCell className="text-cyan-100">
                              {" "}
                              <div className="font-semibold">
                                {payment.vendorName}
                              </div>{" "}
                              <div className="text-xs text-cyan-200/60">
                                {payment.invoiceId}
                              </div>{" "}
                            </TableCell>{" "}
                            <TableCell className="text-right font-mono font-semibold text-cyan-100">
                              {" "}
                              ${payment.amount.toFixed(2)}{" "}
                            </TableCell>{" "}
                            <TableCell className="text-sm text-cyan-200/80">
                              {payment.dueDate}
                            </TableCell>{" "}
                            <TableCell>
                              {" "}
                              <Badge
                                className={
                                  isUrgent
                                    ? "border-red-400 bg-red-500/20 text-red-100"
                                    : "border-cyan-400 bg-cyan-500/20 text-cyan-100"
                                }
                                variant="outline"
                              >
                                {" "}
                                {daysUntilDue} days{" "}
                              </Badge>{" "}
                            </TableCell>{" "}
                            <TableCell>
                              {" "}
                              <Badge className={getStatusColor(payment.status)}>
                                {" "}
                                {payment.status === "pending"
                                  ? "Pending"
                                  : "Scheduled"}{" "}
                              </Badge>{" "}
                            </TableCell>{" "}
                          </TableRow>
                        );
                      })
                    )}{" "}
                  </TableBody>{" "}
                </Table>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Batch Schedule Tab */}{" "}
        <TabsContent value="schedule" className="space-y-4">
          {" "}
          <Card className="border-emerald-400/30 bg-card">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="flex items-center gap-2">
                {" "}
                <Calendar className="h-5 w-5" /> Batch Payment Scheduling{" "}
              </CardTitle>{" "}
              <CardDescription className="text-emerald-200/70">
                {" "}
                Schedule multiple payments at once{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              {" "}
              {selectedPayments.length === 0 ? (
                <Alert className="border-yellow-400/40 bg-yellow-500/10 text-yellow-200">
                  {" "}
                  <AlertCircle className="h-4 w-4" />{" "}
                  <AlertDescription>
                    {" "}
                    Select payments from the"Upcoming Payments" tab first{" "}
                  </AlertDescription>{" "}
                </Alert>
              ) : (
                <>
                  {" "}
                  <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-4">
                    {" "}
                    <div className="grid gap-3 text-sm">
                      {" "}
                      <div className="flex justify-between">
                        {" "}
                        <span className="text-emerald-200/70">
                          Payments Selected
                        </span>{" "}
                        <span className="font-semibold text-emerald-100">
                          {selectedPayments.length}
                        </span>{" "}
                      </div>{" "}
                      <div className="flex justify-between border-t border-emerald-400/20 pt-2">
                        {" "}
                        <span className="text-emerald-200/70">
                          Total Amount
                        </span>{" "}
                        <span className="font-semibold text-emerald-100">
                          {" "}
                          ${selectedPaymentAmount.toFixed(2)}{" "}
                        </span>{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="grid gap-3 md:grid-cols-2">
                    {" "}
                    <div>
                      {" "}
                      <label className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                        {" "}
                        Payment Method{" "}
                      </label>{" "}
                      <Select
                        value={selectedMethod}
                        onValueChange={setSelectedMethod}
                      >
                        {" "}
                        <SelectTrigger className="mt-1 border-emerald-400/20 bg-card">
                          {" "}
                          <SelectValue placeholder="Select method" />{" "}
                        </SelectTrigger>{" "}
                        <SelectContent>
                          {" "}
                          {paymentMethods.map((method) => (
                            <SelectItem key={method.id} value={method.id}>
                              {" "}
                              {method.name}{" "}
                            </SelectItem>
                          ))}{" "}
                        </SelectContent>{" "}
                      </Select>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <label className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                        {" "}
                        Schedule Date{" "}
                      </label>{" "}
                      <Input
                        type="date"
                        value={batchScheduleDate}
                        onChange={(e) => setBatchScheduleDate(e.target.value)}
                        className="mt-1 border-emerald-400/20 bg-card"
                      />{" "}
                    </div>{" "}
                  </div>{" "}
                  <Button
                    onClick={handleBatchSchedule}
                    disabled={isProcessing || !selectedMethod}
                    size="lg"
                    className="w-full gap-2"
                  >
                    {" "}
                    <CheckCircle2 className="h-4 w-4" />{" "}
                    {isProcessing
                      ? "Processing..."
                      : "Schedule Selected Payments"}{" "}
                  </Button>{" "}
                </>
              )}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* History Tab */}{" "}
        <TabsContent value="history" className="space-y-4">
          {" "}
          <Card className="border-cyan-400/30 bg-card">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="flex items-center gap-2">
                {" "}
                <DollarSign className="h-5 w-5" /> Payment History{" "}
              </CardTitle>{" "}
              <CardDescription className="text-cyan-200/70">
                {" "}
                Recently processed and completed payments{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="text-center py-8 text-cyan-200/60">
                {" "}
                <p>No payment history available yet</p>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
    </div>
  );
}
