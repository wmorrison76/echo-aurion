import React, { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { AlertCircle, CheckCircle, TrendingUp } from "lucide-react";
interface Subscription {
  id: string;
  status: "active" | "paused" | "cancelled" | "expired";
  billingPeriod: "monthly" | "annual";
  nextBillingDate: Date;
  tierName?: string;
}
interface SubscriptionManagerProps {
  subscriptionId?: string;
  onUpgrade?: (tierId: string) => void;
  onCancel?: () => void;
}
export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  subscriptionId,
  onUpgrade,
  onCancel,
}) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState({
    events: 0,
    eventLimit: 50,
    users: 0,
    userLimit: 10,
    storage: 0,
    storageLimit: 10,
    apiCalls: 0,
    apiCallLimit: 10000,
  });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (subscriptionId) {
      fetchSubscription();
    }
  }, [subscriptionId]);
  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/subscriptions/subscription/${subscriptionId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      if (!response.ok) throw new Error("Failed to fetch subscription");
      const data = await response.json();
      setSubscription(data.data);
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setLoading(false);
    }
  };
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-surface text-gray-800";
    }
  };
  const getUsagePercentage = (used: number, limit: number): number => {
    return limit > 0 ? Math.round((used / limit) * 100) : 0;
  };
  const UsageBar = ({
    used,
    limit,
    label,
  }: {
    used: number;
    limit: number;
    label: string;
  }) => {
    const percentage = getUsagePercentage(used, limit);
    const isWarning = percentage >= 80;
    const isCritical = percentage >= 95;
    return (
      <div className="space-y-2">
        {" "}
        <div className="flex justify-between text-sm">
          {" "}
          <span>{label}</span>{" "}
          <span className="font-semibold">
            {" "}
            {used} / {limit}{" "}
          </span>{" "}
        </div>{" "}
        <div className="w-full bg-surface rounded-full h-2">
          {" "}
          <div
            className={`h-2 rounded-full transition-all ${isCritical ? "bg-red-500" : isWarning ? "bg-yellow-500" : "bg-green-500"}`}
            style={{ width: `${percentage}%` }}
          />{" "}
        </div>{" "}
      </div>
    );
  };
  if (loading) {
    return (
      <Card className="p-8 text-center text-gray-400">
        {" "}
        <p>Loading subscription...</p>{" "}
      </Card>
    );
  }
  if (!subscription) {
    return (
      <Card className="p-8 text-center text-gray-400">
        {" "}
        <p>No active subscription found</p>{" "}
      </Card>
    );
  }
  return (
    <div className="space-y-4 p-6 bg-surface">
      {" "}
      {/* Current Plan */}{" "}
      <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        {" "}
        <div className="flex justify-between items-start mb-4">
          {" "}
          <div>
            {" "}
            <h2 className="text-2xl font-bold">Professional Plan</h2>{" "}
            <p className="text-blue-100 mt-1">Current subscription</p>{" "}
          </div>{" "}
          <Badge className={getStatusColor(subscription.status)}>
            {" "}
            {subscription.status}{" "}
          </Badge>{" "}
        </div>{" "}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {" "}
          <div>
            {" "}
            <p className="text-blue-100">Billing Period</p>{" "}
            <p className="font-semibold capitalize">
              {" "}
              {subscription.billingPeriod}{" "}
            </p>{" "}
          </div>{" "}
          <div>
            {" "}
            <p className="text-blue-100">Next Billing</p>{" "}
            <p className="font-semibold">
              {" "}
              {new Date(subscription.nextBillingDate).toLocaleDateString()}{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
      </Card>{" "}
      {/* Usage Metrics */}{" "}
      <Card className="p-6">
        {" "}
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          {" "}
          <TrendingUp size={18} /> Current Usage{" "}
        </h3>{" "}
        <div className="space-y-4">
          {" "}
          <UsageBar
            used={usage.events}
            limit={usage.eventLimit}
            label="Events"
          />{" "}
          <UsageBar
            used={usage.users}
            limit={usage.userLimit}
            label="Team Members"
          />{" "}
          <UsageBar
            used={usage.storage}
            limit={usage.storageLimit}
            label="Storage (GB)"
          />{" "}
          <UsageBar
            used={usage.apiCalls}
            limit={usage.apiCallLimit}
            label="API Calls"
          />{" "}
        </div>{" "}
      </Card>{" "}
      {/* Plan Features */}{" "}
      <Card className="p-6">
        {" "}
        <h3 className="font-semibold mb-4">Plan Features</h3>{" "}
        <ul className="space-y-2 text-sm">
          {" "}
          {[
            "Up to 50 events per month",
            "Up to 10 team members",
            "10 GB storage",
            "Advanced analytics",
            "API access",
            "Priority support",
          ].map((feature, i) => (
            <li key={i} className="flex items-center gap-2">
              {" "}
              <CheckCircle size={16} className="text-green-600" />{" "}
              {feature}{" "}
            </li>
          ))}{" "}
        </ul>{" "}
      </Card>{" "}
      {/* Actions */}{" "}
      <Card className="p-6 space-y-3">
        {" "}
        <Button onClick={() => onUpgrade?.("enterprise")} className="w-full">
          {" "}
          Upgrade to Enterprise{" "}
        </Button>{" "}
        <Button variant="outline" className="w-full">
          {" "}
          View Plans{" "}
        </Button>{" "}
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => {
            if (confirm("Are you sure you want to cancel your subscription?")) {
              onCancel?.();
            }
          }}
        >
          {" "}
          Cancel Subscription{" "}
        </Button>{" "}
      </Card>{" "}
      {/* Billing Address */}{" "}
      <Card className="p-6">
        {" "}
        <h3 className="font-semibold mb-4">Billing Information</h3>{" "}
        <div className="text-sm text-foreground space-y-2">
          {" "}
          <p>
            {" "}
            <strong>Email:</strong> billing@company.com{" "}
          </p>{" "}
          <p>
            {" "}
            <strong>Card ending in:</strong> ••••4242{" "}
          </p>{" "}
          <Button variant="outline" size="sm" className="mt-3">
            {" "}
            Update Payment Method{" "}
          </Button>{" "}
        </div>{" "}
      </Card>{" "}
    </div>
  );
};
