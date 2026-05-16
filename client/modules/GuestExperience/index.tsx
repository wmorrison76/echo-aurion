import React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { AlertCircle, Heart, RefreshCw, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";

import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/glass";
import { getThemePalette } from "@/lib/theme-colors";
import { useAppTheme } from "@/lib/theme-utils";
import { responsiveClasses } from "@/lib/responsive-utils";
import { useGuestExperienceIntegration } from "./integrations/guest-integration";

interface Reservation {
  id: string;
  guestName: string;
  date: string;
  time: string;
  partySize: number;
  email: string;
  phone: string;
  specialRequests: string;
  status: "confirmed" | "pending" | "completed" | "cancelled";
}

interface GuestFeedback {
  id: string;
  guestName: string;
  date: string;
  rating: number;
  category: string;
  sentiment: "positive" | "neutral" | "negative";
  comment: string;
  willReturn: boolean;
}

interface GuestPreference {
  id: string;
  guestName: string;
  email: string;
  preferences: string[];
  allergies: string[];
  diningFrequency: number;
  lifetime: number;
  visits: number;
}

interface SatisfactionTrend {
  week: string;
  avgRating: number;
  reviewCount: number;
  returnRate: number;
}

type GuestExperienceAnalysis = {
  summary: {
    averageRating: number;
    totalFeedback: number;
    retentionRate: number;
    activeReservations: number;
  };
  sentiment: { positive: number; neutral: number; negative: number };
  categories: { name: string; averageRating: number; count: number }[];
  topPreferences: { value: string; count: number }[];
  recommendedActions: string[];
};

const RESERVATIONS: Reservation[] = [
  {
    id: "1",
    guestName: "Sarah Johnson",
    date: "2024-02-20",
    time: "19:00",
    partySize: 4,
    email: "sarah.j@email.com",
    phone: "(410) 555-0123",
    specialRequests: "Window seating, celebration dinner",
    status: "confirmed",
  },
  {
    id: "2",
    guestName: "Michael Chen",
    date: "2024-02-21",
    time: "20:00",
    partySize: 2,
    email: "mchen@email.com",
    phone: "(410) 555-0124",
    specialRequests: "Gluten-free options needed",
    status: "confirmed",
  },
  {
    id: "3",
    guestName: "Emily Rodriguez",
    date: "2024-02-22",
    time: "18:30",
    partySize: 6,
    email: "emily.r@email.com",
    phone: "(410) 555-0125",
    specialRequests: "Birthday party, champagne service",
    status: "pending",
  },
  {
    id: "4",
    guestName: "James Wilson",
    date: "2024-02-19",
    time: "19:30",
    partySize: 3,
    email: "jwilson@email.com",
    phone: "(410) 555-0126",
    specialRequests: "None",
    status: "completed",
  },
];

const FEEDBACK_DATA: GuestFeedback[] = [
  {
    id: "1",
    guestName: "Sarah Johnson",
    date: "2024-02-19",
    rating: 5,
    category: "Food Quality",
    sentiment: "positive",
    comment: "Absolutely exceptional crabcakes! Best I've had in years.",
    willReturn: true,
  },
  {
    id: "2",
    guestName: "Michael Chen",
    date: "2024-02-18",
    rating: 4,
    category: "Service",
    sentiment: "positive",
    comment: "Great service overall, minor wait between courses",
    willReturn: true,
  },
  {
    id: "3",
    guestName: "Lisa Anderson",
    date: "2024-02-17",
    rating: 3,
    category: "Ambiance",
    sentiment: "neutral",
    comment: "Lovely restaurant, but a bit noisy during peak hours",
    willReturn: true,
  },
  {
    id: "4",
    guestName: "David Martinez",
    date: "2024-02-16",
    rating: 2,
    category: "Service",
    sentiment: "negative",
    comment: "Wait time was excessive, food took too long to arrive",
    willReturn: false,
  },
  {
    id: "5",
    guestName: "Jennifer Lee",
    date: "2024-02-15",
    rating: 5,
    category: "Overall Experience",
    sentiment: "positive",
    comment: "Perfect celebration dinner! Staff remembered my preferences.",
    willReturn: true,
  },
];

const GUEST_PREFERENCES: GuestPreference[] = [
  {
    id: "1",
    guestName: "Sarah Johnson",
    email: "sarah.j@email.com",
    preferences: [
      "Window seating",
      "Red wine recommendations",
      "Shellfish focus",
    ],
    allergies: ["Nuts"],
    diningFrequency: 12,
    lifetime: 4800,
    visits: 8,
  },
  {
    id: "2",
    guestName: "Michael Chen",
    email: "mchen@email.com",
    preferences: [
      "Gluten-free options",
      "Vegetarian alternatives",
      "Early dining",
    ],
    allergies: ["Gluten", "Shellfish"],
    diningFrequency: 6,
    lifetime: 2400,
    visits: 4,
  },
  {
    id: "3",
    guestName: "Jennifer Lee",
    email: "jen.lee@email.com",
    preferences: ["Chef's table view", "Wine pairings", "Beef specialties"],
    allergies: [],
    diningFrequency: 24,
    lifetime: 8600,
    visits: 14,
  },
];

const SATISFACTION_TRENDS: SatisfactionTrend[] = [
  { week: "Week 1", avgRating: 4.3, reviewCount: 28, returnRate: 82 },
  { week: "Week 2", avgRating: 4.5, reviewCount: 35, returnRate: 85 },
  { week: "Week 3", avgRating: 4.4, reviewCount: 32, returnRate: 84 },
  { week: "Week 4", avgRating: 4.6, reviewCount: 40, returnRate: 87 },
];

function getOrgIdForRequest(): string {
  if (typeof window === "undefined") return "default";
  const orgRaw = localStorage.getItem("auth_org");
  if (orgRaw) {
    try {
      const parsed = JSON.parse(orgRaw);
      const id = String(parsed?.id || "").trim();
      if (id) return id;
    } catch {
      /* ignore */
    }
  }
  const alt = String(localStorage.getItem("orgId") || "").trim();
  return alt || "default";
}

function statusPill(status: Reservation["status"]) {
  if (status === "confirmed") return "bg-green-500/20 text-green-500";
  if (status === "pending") return "bg-yellow-500/20 text-yellow-500";
  return "bg-primary/20 text-blue-500";
}

export default function GuestExperienceModule() {
  const { t } = useI18n();
  useAppTheme();

  const { syncReservationToSchedule, syncPreferencesToInventory } =
    useGuestExperienceIntegration();

  const palette = getThemePalette();
  const colors = [palette[0], palette[1], palette[3], palette[5]].filter(
    Boolean,
  ) as string[];

  const [activeTab, setActiveTab] = React.useState("overview");
  const [isLoading, setIsLoading] = React.useState(false);
  const [expandedReservation, setExpandedReservation] = React.useState<
    string | null
  >(null);
  const [analysis, setAnalysis] =
    React.useState<GuestExperienceAnalysis | null>(null);

  const avgRating = React.useMemo(() => {
    const v =
      FEEDBACK_DATA.reduce((sum, f) => sum + f.rating, 0) /
      Math.max(1, FEEDBACK_DATA.length);
    return v.toFixed(1);
  }, []);

  const positiveComments = React.useMemo(
    () => FEEDBACK_DATA.filter((f) => f.sentiment === "positive").length,
    [],
  );
  const willReturn = React.useMemo(
    () => FEEDBACK_DATA.filter((f) => f.willReturn).length,
    [],
  );
  const confirmedReservations = React.useMemo(
    () => RESERVATIONS.filter((r) => r.status === "confirmed").length,
    [],
  );
  const totalGuests = React.useMemo(() => GUEST_PREFERENCES.length, []);
  const loyaltySpend = React.useMemo(
    () => GUEST_PREFERENCES.reduce((sum, g) => sum + g.lifetime, 0),
    [],
  );

  const handleAnalyze = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/guest-experience/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Org-ID": getOrgIdForRequest(),
        },
        body: JSON.stringify({
          reservations: RESERVATIONS,
          feedback: FEEDBACK_DATA,
          preferences: GUEST_PREFERENCES,
        }),
      });
      if (!response.ok) throw new Error("Analysis failed");
      const data = (await response.json()) as GuestExperienceAnalysis;
      setAnalysis(data);
      toast.success("Guest experience analysis complete");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    RESERVATIONS.filter((r) => r.status === "confirmed").forEach(
      (reservation) => syncReservationToSchedule(reservation),
    );
  }, [syncReservationToSchedule]);

  React.useEffect(() => {
    GUEST_PREFERENCES.forEach((guest) => {
      if (guest.allergies.length > 0) syncPreferencesToInventory(guest);
    });
  }, [syncPreferencesToInventory]);

  return (
    <div
      className={cn(
        "w-full h-full overflow-y-auto bg-background text-foreground backdrop-blur-sm",
        responsiveClasses({ default: "p-4", md: "p-6", lg: "p-8" }),
        "space-y-6",
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-8 h-8 text-pink-500" />
            {t("module.guest-experience.title")}
          </h1>
          <p className="text-sm text-foreground/60 mt-1">
            {t("module.guest-experience.description")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ModuleChatButton
            moduleId="guest-experience"
            moduleName={t("module.guest-experience.title")}
          />
          <Button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            {t("module.guest-experience.analyze")}
          </Button>
        </div>
      </div>

      <div
        className={responsiveClasses({
          default: "grid grid-cols-1 gap-3",
          sm: "grid grid-cols-2 gap-3",
          md: "grid grid-cols-3 gap-4",
          lg: "grid grid-cols-5 gap-4",
        })}
      >
        <Card className="bg-background border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground/60">
              {t("module.guest-experience.metrics.avgRating")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {avgRating}⭐
            </div>
            <p className="text-xs text-foreground/50 mt-1">
              {t("module.guest-experience.metrics.basedOnReviews").replace(
                "{count}",
                String(FEEDBACK_DATA.length),
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-background border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground/60">
              {t("module.guest-experience.metrics.willReturn")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {willReturn}/{FEEDBACK_DATA.length}
            </div>
            <p className="text-xs text-foreground/50 mt-1">
              {((willReturn / Math.max(1, FEEDBACK_DATA.length)) * 100).toFixed(
                0,
              )}
              % {t("module.guest-experience.metrics.retention")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-background border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground/60">
              {t("module.guest-experience.metrics.next7Days")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {confirmedReservations}
            </div>
            <p className="text-xs text-foreground/50 mt-1">
              {RESERVATIONS.reduce(
                (sum, r) => sum + (r.status === "confirmed" ? r.partySize : 0),
                0,
              )}{" "}
              {t("module.guest-experience.metrics.guests")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-background border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground/60">
              {t("module.guest-experience.metrics.knownGuests")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              {totalGuests}
            </div>
            <p className="text-xs text-foreground/50 mt-1">
              {t("module.guest-experience.metrics.withSavedPreferences")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-background border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground/60">
              {t("module.guest-experience.metrics.loyaltySpend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              ${(loyaltySpend / 1000).toFixed(1)}K
            </div>
            <p className="text-xs text-foreground/50 mt-1">
              {t("module.guest-experience.metrics.lifetimeRevenue")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-background border border-white/10 p-1 rounded-lg">
          <TabsTrigger value="overview">
            {t("module.guest-experience.tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="reservations">
            {t("module.guest-experience.tabs.reservations")}
          </TabsTrigger>
          <TabsTrigger value="feedback">
            {t("module.guest-experience.tabs.feedback")}
          </TabsTrigger>
          <TabsTrigger value="preferences">
            {t("module.guest-experience.tabs.preferences")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {analysis ? (
            <Card className="bg-background border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-pink-500" />
                  {t("module.guest-experience.insights")}
                </CardTitle>
                <CardDescription>
                  {t("module.guest-experience.metrics.avgRating")}{" "}
                  {analysis.summary.averageRating}⭐ •{" "}
                  {t("module.guest-experience.retentionRate")}{" "}
                  {analysis.summary.retentionRate}% •{" "}
                  {t("module.guest-experience.activeReservations")}{" "}
                  {analysis.summary.activeReservations}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      {
                        label: t("module.guest-experience.sentiment.positive"),
                        value: analysis.sentiment.positive,
                        color: "text-green-500",
                        bg: "bg-green-500/10",
                      },
                      {
                        label: t("module.guest-experience.sentiment.neutral"),
                        value: analysis.sentiment.neutral,
                        color: "text-yellow-500",
                        bg: "bg-yellow-500/10",
                      },
                      {
                        label: t("module.guest-experience.sentiment.negative"),
                        value: analysis.sentiment.negative,
                        color: "text-red-500",
                        bg: "bg-red-500/10",
                      },
                    ] as const
                  ).map((s) => (
                    <div
                      key={s.label}
                      className={cn(
                        "rounded-lg border border-white/10 p-3",
                        s.bg,
                      )}
                    >
                      <div className={cn("text-xs font-semibold", s.color)}>
                        {s.label}
                      </div>
                      <div className={cn("text-2xl font-bold mt-1", s.color)}>
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-white/10 p-3 bg-black/10">
                  <div className="text-sm font-semibold mb-2">
                    Recommended actions
                  </div>
                  <ul className="space-y-1">
                    {analysis.recommendedActions.map((a) => (
                      <li
                        key={a}
                        className="text-sm text-foreground/80 flex gap-2"
                      >
                        <AlertCircle className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-background border-white/10">
              <CardHeader>
                <CardTitle>
                  {t("module.guest-experience.charts.satisfactionTrend")}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={SATISFACTION_TRENDS}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      strokeOpacity={0.2}
                    />
                    <XAxis dataKey="week" stroke="var(--muted-foreground)" />
                    <YAxis stroke="var(--muted-foreground)" domain={[4, 5]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        color: "var(--foreground)",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avgRating"
                      stroke={palette[3] || "#00b4d8"}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-background border-white/10">
              <CardHeader>
                <CardTitle>
                  {t("module.guest-experience.charts.feedbackDistribution")}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: "5⭐ Excellent",
                          value: FEEDBACK_DATA.filter((f) => f.rating === 5)
                            .length,
                        },
                        {
                          name: "4⭐ Good",
                          value: FEEDBACK_DATA.filter((f) => f.rating === 4)
                            .length,
                        },
                        {
                          name: "3⭐ Fair",
                          value: FEEDBACK_DATA.filter((f) => f.rating === 3)
                            .length,
                        },
                        {
                          name: "2⭐ Poor",
                          value: FEEDBACK_DATA.filter((f) => f.rating === 2)
                            .length,
                        },
                      ]}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                    >
                      {[0, 1, 2, 3].map((index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={colors[index] || palette[0] || "#00b4d8"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        color: "var(--foreground)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reservations" className="space-y-4 mt-4">
          <Card className="bg-background border-white/10">
            <CardHeader>
              <CardTitle>
                {t("module.guest-experience.upcomingReservations")}
              </CardTitle>
              <CardDescription>
                {t("module.guest-experience.next7Days")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {RESERVATIONS.filter((r) => r.status !== "cancelled").map(
                (reservation) => (
                  <div
                    key={reservation.id}
                    className="border border-white/10 rounded-lg p-4 cursor-pointer hover:bg-background transition-colors"
                    onClick={() =>
                      setExpandedReservation(
                        expandedReservation === reservation.id
                          ? null
                          : reservation.id,
                      )
                    }
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">
                          {reservation.guestName}
                        </h4>
                        <p className="text-xs text-foreground/60 mt-1">
                          {reservation.date} at {reservation.time} • Party of{" "}
                          {reservation.partySize}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-semibold",
                          statusPill(reservation.status),
                        )}
                      >
                        {reservation.status.charAt(0).toUpperCase() +
                          reservation.status.slice(1)}
                      </div>
                    </div>
                    {expandedReservation === reservation.id ? (
                      <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-sm">
                        <p className="text-foreground/80">
                          <span className="font-semibold">Email:</span>{" "}
                          {reservation.email}
                        </p>
                        <p className="text-foreground/80">
                          <span className="font-semibold">Phone:</span>{" "}
                          {reservation.phone}
                        </p>
                        {reservation.specialRequests ? (
                          <p className="text-foreground/80">
                            <span className="font-semibold">
                              Special Requests:
                            </span>{" "}
                            {reservation.specialRequests}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ),
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4 mt-4">
          <Card className="bg-background border-white/10">
            <CardHeader>
              <CardTitle>
                {t("module.guest-experience.recentFeedback")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {FEEDBACK_DATA.map((feedback) => (
                <div
                  key={feedback.id}
                  className="border border-white/10 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">
                        {feedback.guestName}
                      </h4>
                      <p className="text-xs text-foreground/60 mt-1">
                        {feedback.date} • {feedback.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-yellow-500">
                        {feedback.rating}⭐
                      </span>
                      {feedback.willReturn ? (
                        <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                      ) : null}
                    </div>
                  </div>
                  <p className="text-sm text-foreground/80 italic mt-2">
                    "{feedback.comment}"
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4 mt-4">
          <Card className="bg-background border-white/10">
            <CardHeader>
              <CardTitle>{t("module.guest-experience.preferences")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {GUEST_PREFERENCES.map((guest) => (
                <div
                  key={guest.id}
                  className="border border-white/10 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {guest.guestName}
                      </h4>
                      <p className="text-xs text-foreground/60 mt-1">
                        {guest.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-500">
                        ${(guest.lifetime / 1000).toFixed(1)}K
                      </div>
                      <p className="text-xs text-foreground/60">Lifetime</p>
                    </div>
                  </div>
                  {guest.allergies.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold text-foreground/70 mb-2">
                        Allergies:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {guest.allergies.map((allergy) => (
                          <span
                            key={allergy}
                            className="bg-red-500/20 text-red-500 rounded-full px-2 py-1 text-xs"
                          >
                            {allergy}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
