import React, { useState } from "react";
import { AlertTriangle, Phone, Mail, MessageSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReceivingDiscrepancies } from "@/hooks/useReceiving";
import { logger } from "@/lib/logger";
import { formatDistance } from "date-fns";
interface ReceivingDiscrepanciesPanelProps {
  organizationId: string;
  currentUserId: string;
}
export function ReceivingDiscrepanciesPanel({
  organizationId,
  currentUserId,
}: ReceivingDiscrepanciesPanelProps) {
  const { discrepancies, notifyVendor } =
    useReceivingDiscrepancies(organizationId);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<string | null>(
    null,
  );
  const [notificationMethod, setNotificationMethod] = useState<
    "phone" | "email" | "sms" | "in_app"
  >("email");
  const [submitting, setSubmitting] = useState(false);
  const handleNotifyVendor = async (discrepancyId: string) => {
    try {
      setSubmitting(true);
      await notifyVendor(discrepancyId, notificationMethod, currentUserId);
      logger.info(`Vendor notified about discrepancy ${discrepancyId}`);
      setSelectedDiscrepancy(null);
    } catch (error) {
      logger.error("Failed to notify vendor:", error);
      alert("Failed to notify vendor");
    } finally {
      setSubmitting(false);
    }
  };
  const openDiscrepancies = discrepancies.filter(
    (d) => d.resolution_status === "open",
  );
  const shortagesByType = {
    short: discrepancies.filter((d) => d.discrepancy_type === "short"),
    damaged: discrepancies.filter((d) => d.discrepancy_type === "damaged"),
    expired: discrepancies.filter((d) => d.discrepancy_type === "expired"),
    other: discrepancies.filter(
      (d) => ["short", "damaged", "expired"].indexOf(d.discrepancy_type) === -1,
    ),
  };
  const getDiscrepancyIcon = (type: string) => {
    switch (type) {
      case "short":
        return "📦";
      case "damaged":
        return "⚠️";
      case "expired":
        return "⏰";
      default:
        return "❓";
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-800";
      case "pending_vendor_response":
        return "bg-yellow-100 text-yellow-800";
      case "pending_credit":
        return "bg-blue-100 text-blue-800";
      case "received_credit":
        return "bg-green-100 text-green-800";
      case "resolved":
        return "bg-surface text-gray-800";
      default:
        return "bg-surface text-gray-800";
    }
  };
  return (
    <Card>
      {" "}
      <CardHeader>
        {" "}
        <div className="flex justify-between items-start">
          {" "}
          <div>
            {" "}
            <CardTitle className="flex items-center gap-2">
              {" "}
              <AlertTriangle className="h-5 w-5 text-amber-600" /> Discrepancies
              & Shorts{" "}
            </CardTitle>{" "}
            <CardDescription>
              {" "}
              {openDiscrepancies.length} open issues requiring attention{" "}
            </CardDescription>{" "}
          </div>{" "}
          <Badge variant="outline" className="text-lg">
            {" "}
            {openDiscrepancies.length}{" "}
          </Badge>{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        {openDiscrepancies.length === 0 ? (
          <Alert className="bg-green-50 border-green-200">
            {" "}
            <AlertDescription className="text-green-800">
              {" "}
              No open discrepancies. All deliveries are in good standing.{" "}
            </AlertDescription>{" "}
          </Alert>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            {" "}
            <TabsList className="grid w-full grid-cols-4">
              {" "}
              <TabsTrigger value="all">
                {" "}
                All ({openDiscrepancies.length}){" "}
              </TabsTrigger>{" "}
              <TabsTrigger value="short">
                {" "}
                Shorts ({shortagesByType.short.length}){" "}
              </TabsTrigger>{" "}
              <TabsTrigger value="damage">
                {" "}
                Damaged ({shortagesByType.damaged.length}){" "}
              </TabsTrigger>{" "}
              <TabsTrigger value="expired">
                {" "}
                Expired ({shortagesByType.expired.length}){" "}
              </TabsTrigger>{" "}
            </TabsList>{" "}
            <TabsContent value="all" className="space-y-2 mt-4">
              {" "}
              {openDiscrepancies.map((disc) => (
                <DiscrepancyRow
                  key={disc.id}
                  discrepancy={disc}
                  isSelected={selectedDiscrepancy === disc.id}
                  onSelect={() => setSelectedDiscrepancy(disc.id)}
                  onNotify={() => handleNotifyVendor(disc.id)}
                  notificationMethod={notificationMethod}
                  setNotificationMethod={setNotificationMethod}
                  submitting={submitting}
                  getStatusColor={getStatusColor}
                  getDiscrepancyIcon={getDiscrepancyIcon}
                />
              ))}{" "}
            </TabsContent>{" "}
            <TabsContent value="short" className="space-y-2 mt-4">
              {" "}
              {shortagesByType.short.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  {" "}
                  No shortages reported{" "}
                </p>
              ) : (
                shortagesByType.short.map((disc) => (
                  <DiscrepancyRow
                    key={disc.id}
                    discrepancy={disc}
                    isSelected={selectedDiscrepancy === disc.id}
                    onSelect={() => setSelectedDiscrepancy(disc.id)}
                    onNotify={() => handleNotifyVendor(disc.id)}
                    notificationMethod={notificationMethod}
                    setNotificationMethod={setNotificationMethod}
                    submitting={submitting}
                    getStatusColor={getStatusColor}
                    getDiscrepancyIcon={getDiscrepancyIcon}
                  />
                ))
              )}{" "}
            </TabsContent>{" "}
            <TabsContent value="damage" className="space-y-2 mt-4">
              {" "}
              {shortagesByType.damaged.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  {" "}
                  No damaged items reported{" "}
                </p>
              ) : (
                shortagesByType.damaged.map((disc) => (
                  <DiscrepancyRow
                    key={disc.id}
                    discrepancy={disc}
                    isSelected={selectedDiscrepancy === disc.id}
                    onSelect={() => setSelectedDiscrepancy(disc.id)}
                    onNotify={() => handleNotifyVendor(disc.id)}
                    notificationMethod={notificationMethod}
                    setNotificationMethod={setNotificationMethod}
                    submitting={submitting}
                    getStatusColor={getStatusColor}
                    getDiscrepancyIcon={getDiscrepancyIcon}
                  />
                ))
              )}{" "}
            </TabsContent>{" "}
            <TabsContent value="expired" className="space-y-2 mt-4">
              {" "}
              {shortagesByType.expired.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  {" "}
                  No expired items reported{" "}
                </p>
              ) : (
                shortagesByType.expired.map((disc) => (
                  <DiscrepancyRow
                    key={disc.id}
                    discrepancy={disc}
                    isSelected={selectedDiscrepancy === disc.id}
                    onSelect={() => setSelectedDiscrepancy(disc.id)}
                    onNotify={() => handleNotifyVendor(disc.id)}
                    notificationMethod={notificationMethod}
                    setNotificationMethod={setNotificationMethod}
                    submitting={submitting}
                    getStatusColor={getStatusColor}
                    getDiscrepancyIcon={getDiscrepancyIcon}
                  />
                ))
              )}{" "}
            </TabsContent>{" "}
          </Tabs>
        )}{" "}
      </CardContent>{" "}
    </Card>
  );
}
function DiscrepancyRow({
  discrepancy,
  isSelected,
  onSelect,
  onNotify,
  notificationMethod,
  setNotificationMethod,
  submitting,
  getStatusColor,
  getDiscrepancyIcon,
}: any) {
  return (
    <div
      className={`p-3 border rounded-lg cursor-pointer transition-colors ${isSelected ? "bg-blue-50 border-primary" : "hover:bg-surface"}`}
      onClick={onSelect}
    >
      {" "}
      <div className="flex items-start justify-between">
        {" "}
        <div className="flex items-start gap-3 flex-1">
          {" "}
          <span className="text-2xl">
            {getDiscrepancyIcon(discrepancy.discrepancy_type)}
          </span>{" "}
          <div className="flex-1">
            {" "}
            <div className="flex items-center gap-2">
              {" "}
              <p className="font-medium">
                {discrepancy.vendors?.name || "Unknown Vendor"}
              </p>{" "}
              <Badge className={getStatusColor(discrepancy.resolution_status)}>
                {" "}
                {discrepancy.resolution_status.replace(/_/g, "")}{" "}
              </Badge>{" "}
            </div>{" "}
            <p className="text-sm text-muted-foreground">
              {" "}
              {discrepancy.quantity_affected} units -{" "}
              {discrepancy.discrepancy_type}{" "}
            </p>{" "}
            {discrepancy.sku && (
              <p className="text-xs text-muted-foreground">
                SKU: {discrepancy.sku}
              </p>
            )}{" "}
          </div>{" "}
        </div>{" "}
        <div className="text-right text-xs text-muted-foreground">
          {" "}
          {discrepancy.vendor_notified ? (
            <span>Notified</span>
          ) : (
            <span className="text-amber-600 font-medium">Not Notified</span>
          )}{" "}
        </div>{" "}
      </div>{" "}
      {isSelected && !discrepancy.vendor_notified && (
        <div className="mt-3 pt-3 border-t">
          {" "}
          <div className="flex gap-2 items-end">
            {" "}
            <div className="flex-1">
              {" "}
              <label className="text-xs font-medium block mb-1">
                {" "}
                Notify Vendor Via:{" "}
              </label>{" "}
              <Select
                value={notificationMethod}
                onValueChange={setNotificationMethod}
              >
                {" "}
                <SelectTrigger size="sm">
                  {" "}
                  <SelectValue />{" "}
                </SelectTrigger>{" "}
                <SelectContent>
                  {" "}
                  <SelectItem value="phone">
                    {" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <Phone className="h-4 w-4" /> Phone{" "}
                    </div>{" "}
                  </SelectItem>{" "}
                  <SelectItem value="email">
                    {" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <Mail className="h-4 w-4" /> Email{" "}
                    </div>{" "}
                  </SelectItem>{" "}
                  <SelectItem value="sms">
                    {" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <MessageSquare className="h-4 w-4" /> SMS{" "}
                    </div>{" "}
                  </SelectItem>{" "}
                  <SelectItem value="in_app">
                    {" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <MessageSquare className="h-4 w-4" /> In-App{" "}
                    </div>{" "}
                  </SelectItem>{" "}
                </SelectContent>{" "}
              </Select>{" "}
            </div>{" "}
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onNotify();
              }}
              disabled={submitting}
            >
              {" "}
              {submitting ? "Notifying..." : "Notify"}{" "}
            </Button>{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
}
