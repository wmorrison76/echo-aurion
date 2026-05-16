import { useState, useEffect } from "react";
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
  CreditCard,
  Download,
  AlertCircle,
  CheckCircle2,
  User,
  Receipt,
} from "lucide-react";
import { supabase } from "@/lib/auth-service";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_annual: number;
  features: string[];
  stripe_price_id: string;
}

interface Subscription {
  id: string;
  plan_name: string;
  status: "active" | "past_due" | "canceled" | "trialing";
  current_period_start: string;
  current_period_end: string;
  cancel_at?: string;
  trial_end?: string;
  seats: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: "paid" | "draft" | "open" | "uncollectible" | "void";
  date: string;
  due_date: string;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price_monthly: 29,
    price_annual: 290,
    stripe_price_id: "price_starter",
    features: [
      "Up to 100 recipes",
      "Basic analytics",
      "Email support",
      "1 location",
      "Mobile app access",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price_monthly: 99,
    price_annual: 990,
    stripe_price_id: "price_professional",
    features: [
      "Unlimited recipes",
      "Advanced analytics",
      "Priority support",
      "Up to 10 locations",
      "Recipe deployment",
      "Team collaboration",
      "API access",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price_monthly: 299,
    price_annual: 2990,
    stripe_price_id: "price_enterprise",
    features: [
      "Everything in Professional",
      "Unlimited locations",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
      "SSO & RBAC",
      "Advanced security",
    ],
  },
];

export default function BillingSubscriptionsWorkspace() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "monthly",
  );

  useEffect(() => {
    if (!supabase) {
      toast.error("Supabase not configured");
      return;
    }
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [subData, invData] = await Promise.all([
        supabase.from("subscriptions").select("*").single(),
        supabase
          .from("invoices")
          .select("*")
          .order("date", { ascending: false })
          .limit(10),
      ]);

      setSubscription(subData.data || null);
      setInvoices(invData.data || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch billing data",
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      active: "bg-green-100 text-green-800 dark:bg-green-900",
      trialing: "bg-blue-100 text-blue-800 dark:bg-blue-900",
      past_due: "bg-red-100 text-red-800 dark:bg-red-900",
      canceled: "bg-gray-100 text-gray-800 dark:bg-gray-800",
    };
    return classes[status] || classes.active;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          Billing & Subscriptions
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your subscription, invoices, and payment methods
        </p>
      </div>

      {subscription && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Current Plan</CardTitle>
                <CardDescription className="capitalize">
                  {subscription.plan_name} Plan
                </CardDescription>
              </div>
              <Badge className={getStatusBadgeClass(subscription.status)}>
                {subscription.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Billing Cycle</p>
                <p className="font-semibold">
                  {new Date(
                    subscription.current_period_start,
                  ).toLocaleDateString()}{" "}
                  -{" "}
                  {new Date(
                    subscription.current_period_end,
                  ).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Seats</p>
                <p className="font-semibold">
                  {subscription.seats} team members
                </p>
              </div>
            </div>
            {subscription.status === "trialing" && subscription.trial_end && (
              <div className="bg-yellow-100/50 dark:bg-yellow-900/30 p-3 rounded-lg">
                <p className="text-sm text-yellow-900 dark:text-yellow-200">
                  Trial ends on{" "}
                  {new Date(subscription.trial_end).toLocaleDateString()}
                </p>
              </div>
            )}
            <Button variant="outline" className="w-full">
              Manage Subscription
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="billing">Billing Info</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <div className="flex gap-2 mb-6">
            <Button
              variant={billingPeriod === "monthly" ? "default" : "outline"}
              onClick={() => setBillingPeriod("monthly")}
            >
              Monthly
            </Button>
            <Button
              variant={billingPeriod === "annual" ? "default" : "outline"}
              onClick={() => setBillingPeriod("annual")}
            >
              Annual (Save 17%)
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={`flex flex-col ${
                  subscription?.plan_name === plan.name
                    ? "border-blue-500 border-2"
                    : ""
                }`}
              >
                <CardHeader>
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div>
                    <p className="text-3xl font-bold">
                      $
                      {billingPeriod === "monthly"
                        ? plan.price_monthly
                        : plan.price_annual}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      per {billingPeriod === "monthly" ? "month" : "year"}
                    </p>
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={
                      subscription?.plan_name === plan.name
                        ? "outline"
                        : "default"
                    }
                  >
                    {subscription?.plan_name === plan.name
                      ? "Current Plan"
                      : "Upgrade"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Invoices
              </CardTitle>
              <CardDescription>
                {invoices.length} invoices available
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices yet</p>
              ) : (
                invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted transition"
                  >
                    <div>
                      <p className="font-semibold text-sm">
                        Invoice #{invoice.invoice_number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(invoice.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold">${invoice.amount}</p>
                        <Badge
                          variant="secondary"
                          className="text-xs capitalize"
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Download invoice"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm">
                  <p className="text-muted-foreground mb-2">Visa ending in</p>
                  <p className="font-semibold text-lg">•••• •••• •••• 4242</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Expires 12/2025
                  </p>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                Update Payment Method
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Billing Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold">John Doe</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold">john@example.com</p>
              </div>
              <Button variant="outline" className="w-full">
                Edit Billing Info
              </Button>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full">
                Cancel Subscription
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
