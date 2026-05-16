import React, { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { CheckCircle } from "lucide-react";
interface Tier {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice?: number;
  features: string[];
  eventLimit?: number;
  userLimit?: number;
  apiCallsLimit?: number;
  storageGb?: number;
}
interface PricingTiersProps {
  onSelectTier?: (tierId: string, billingPeriod: "monthly" | "annual") => void;
  selectedTier?: string;
  isLoading?: boolean;
}
export const PricingTiers: React.FC<PricingTiersProps> = ({
  onSelectTier,
  selectedTier,
  isLoading = false,
}) => {
  const [tiers, setTiers] = useState<Tier[]>([
    {
      id: "starter",
      name: "Starter",
      monthlyPrice: 29,
      annualPrice: 290,
      features: [
        "Up to 5 events/month",
        "Up to 3 users",
        "Basic analytics",
        "Email support",
        "50 MB storage",
      ],
      eventLimit: 5,
      userLimit: 3,
      apiCallsLimit: 1000,
      storageGb: 0.05,
    },
    {
      id: "professional",
      name: "Professional",
      monthlyPrice: 99,
      annualPrice: 990,
      features: [
        "Up to 50 events/month",
        "Up to 10 users",
        "Advanced analytics",
        "Priority support",
        "10 GB storage",
        "API access",
        "Custom integrations",
      ],
      eventLimit: 50,
      userLimit: 10,
      apiCallsLimit: 10000,
      storageGb: 10,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      monthlyPrice: 299,
      annualPrice: 2990,
      features: [
        "Unlimited events",
        "Unlimited users",
        "Custom analytics",
        "24/7 support",
        "500 GB storage",
        "Advanced API",
        "Dedicated account manager",
        "SSO & advanced security",
      ],
      eventLimit: undefined,
      userLimit: undefined,
      apiCallsLimit: undefined,
      storageGb: 500,
    },
  ]);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "monthly",
  );
  const annualSavings = (tier: Tier) => {
    if (!tier.annualPrice) return 0;
    const monthlyTotal = tier.monthlyPrice * 12;
    return Math.round(((monthlyTotal - tier.annualPrice) / monthlyTotal) * 100);
  };
  return (
    <div className="space-y-6 p-6 bg-surface">
      {" "}
      {/* Billing Toggle */}{" "}
      <div className="flex justify-center gap-4">
        {" "}
        <Button
          variant={billingPeriod === "monthly" ? "default" : "outline"}
          onClick={() => setBillingPeriod("monthly")}
        >
          {" "}
          Monthly Billing{" "}
        </Button>{" "}
        <Button
          variant={billingPeriod === "annual" ? "default" : "outline"}
          onClick={() => setBillingPeriod("annual")}
        >
          {" "}
          Annual Billing{" "}
          {billingPeriod === "annual" && (
            <Badge variant="secondary" className="ml-2">
              {" "}
              Save up to 17%{" "}
            </Badge>
          )}{" "}
        </Button>{" "}
      </div>{" "}
      {/* Pricing Cards */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {" "}
        {tiers.map((tier, idx) => {
          const price =
            billingPeriod === "annual" && tier.annualPrice
              ? tier.annualPrice / 12
              : tier.monthlyPrice;
          const savings = annualSavings(tier);
          const isPopular = idx === 1;
          return (
            <Card
              key={tier.id}
              className={`p-6 flex flex-col transition-all ${isPopular ? "ring-2 ring-blue-500 scale-105 shadow-lg" : ""} ${selectedTier === tier.id ? "bg-blue-50" : ""}`}
            >
              {" "}
              {isPopular && (
                <Badge className="w-fit mb-2 bg-primary">Most Popular</Badge>
              )}{" "}
              <h3 className="text-xl font-bold mb-2">{tier.name}</h3>{" "}
              <div className="mb-4">
                {" "}
                <span className="text-4xl font-bold">
                  ${Math.round(price)}
                </span>{" "}
                <span className="text-muted-foreground ml-2">
                  {" "}
                  /month{" "}
                  {billingPeriod === "annual" && "(billed annually)"}{" "}
                </span>{" "}
              </div>{" "}
              {billingPeriod === "annual" && savings > 0 && (
                <Badge variant="secondary" className="w-fit mb-4">
                  {" "}
                  Save ${" "}
                  {Math.round(
                    tier.monthlyPrice * 12 - (tier.annualPrice || 0),
                  )}{" "}
                  /year{" "}
                </Badge>
              )}{" "}
              {/* Specs */}{" "}
              {(tier.eventLimit || tier.userLimit) && (
                <div className="text-xs text-muted-foreground space-y-1 mb-4">
                  {" "}
                  {tier.eventLimit && (
                    <div>• {tier.eventLimit} events/month</div>
                  )}{" "}
                  {tier.userLimit && <div>• {tier.userLimit} users</div>}{" "}
                  {tier.storageGb && (
                    <div>• {tier.storageGb} GB storage</div>
                  )}{" "}
                </div>
              )}{" "}
              {/* Features */}{" "}
              <ul className="space-y-2 mb-6 flex-1">
                {" "}
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {" "}
                    <CheckCircle
                      size={16}
                      className="text-green-600 flex-shrink-0"
                    />{" "}
                    {feature}{" "}
                  </li>
                ))}{" "}
              </ul>{" "}
              {/* CTA */}{" "}
              <Button
                onClick={() => onSelectTier?.(tier.id, billingPeriod)}
                disabled={isLoading}
                variant={isPopular ? "default" : "outline"}
                className="w-full"
              >
                {" "}
                {selectedTier === tier.id ? "Current Plan" : "Choose Plan"}{" "}
              </Button>{" "}
            </Card>
          );
        })}{" "}
      </div>{" "}
      {/* Features Comparison */}{" "}
      <Card className="p-6">
        {" "}
        <h3 className="font-bold text-lg mb-4">Feature Comparison</h3>{" "}
        <div className="overflow-x-auto">
          {" "}
          <table className="w-full text-sm">
            {" "}
            <thead>
              {" "}
              <tr className="border-b">
                {" "}
                <th className="text-left py-2">Feature</th>{" "}
                {tiers.map((tier) => (
                  <th key={tier.id} className="text-center py-2">
                    {" "}
                    {tier.name}{" "}
                  </th>
                ))}{" "}
              </tr>{" "}
            </thead>{" "}
            <tbody>
              {" "}
              <tr className="border-b">
                {" "}
                <td className="py-2">Events per month</td>{" "}
                {tiers.map((tier) => (
                  <td key={tier.id} className="text-center">
                    {" "}
                    {tier.eventLimit || "Unlimited"}{" "}
                  </td>
                ))}{" "}
              </tr>{" "}
              <tr className="border-b">
                {" "}
                <td className="py-2">Team users</td>{" "}
                {tiers.map((tier) => (
                  <td key={tier.id} className="text-center">
                    {" "}
                    {tier.userLimit || "Unlimited"}{" "}
                  </td>
                ))}{" "}
              </tr>{" "}
              <tr className="border-b">
                {" "}
                <td className="py-2">Storage</td>{" "}
                {tiers.map((tier) => (
                  <td key={tier.id} className="text-center">
                    {" "}
                    {tier.storageGb} GB{" "}
                  </td>
                ))}{" "}
              </tr>{" "}
              <tr>
                {" "}
                <td className="py-2">Support</td>{" "}
                {tiers.map((tier) => (
                  <td key={tier.id} className="text-center">
                    {" "}
                    {tier.name === "Starter" ? "Email" : "Priority"}{" "}
                  </td>
                ))}{" "}
              </tr>{" "}
            </tbody>{" "}
          </table>{" "}
        </div>{" "}
      </Card>{" "}
      {/* FAQ */}{" "}
      <Card className="p-6">
        {" "}
        <h3 className="font-bold text-lg mb-4">FAQ</h3>{" "}
        <div className="space-y-4 text-sm">
          {" "}
          <div>
            {" "}
            <p className="font-semibold mb-1">
              Can I change plans anytime?
            </p>{" "}
            <p className="text-muted-foreground">
              {" "}
              Yes! You can upgrade or downgrade at any time. Changes take effect
              on your next billing cycle.{" "}
            </p>{" "}
          </div>{" "}
          <div>
            {" "}
            <p className="font-semibold mb-1">
              Do you offer a free trial?
            </p>{" "}
            <p className="text-muted-foreground">
              {" "}
              Contact our sales team for a 14-day free trial of any plan.{" "}
            </p>{" "}
          </div>{" "}
          <div>
            {" "}
            <p className="font-semibold mb-1">
              {" "}
              What payment methods do you accept?{" "}
            </p>{" "}
            <p className="text-muted-foreground">
              {" "}
              We accept all major credit cards, PayPal, and bank transfers for
              annual plans.{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
      </Card>{" "}
    </div>
  );
};
