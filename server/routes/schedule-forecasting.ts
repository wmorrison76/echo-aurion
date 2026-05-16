// @ts-nocheck
import { Router, Request, Response } from "express";
import { z } from "zod";
import { getSupabaseServiceClient } from "../lib/supabase-service-client.js";
import { logger } from "../lib/logger";

const router = Router();

const ResortStaffingSchema = z.object({
  outletId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

type StaffingBreakdown = {
  front_of_house: number;
  back_of_house: number;
  stewarding: number;
  banquet_ops: number;
  housekeeping: number;
  front_desk: number;
  bell_services: number;
};

function calculateStaffing(guestCount: number, rooms: number, arrivals: number, banquetGuests: number) {
  const foh = Math.max(1, Math.ceil(guestCount / 30));
  const boh = Math.max(1, Math.ceil(guestCount / 40));
  const stewarding = Math.max(1, Math.ceil(guestCount / 70));
  const banquetOps = Math.max(0, Math.ceil(banquetGuests / 20));
  const housekeeping = Math.max(1, Math.ceil(rooms / 15));
  const frontDesk = Math.max(1, Math.ceil(arrivals / 60));
  const bell = Math.max(1, Math.ceil(arrivals / 80));
  return {
    front_of_house: foh,
    back_of_house: boh,
    stewarding,
    banquet_ops: banquetOps,
    housekeeping,
    front_desk: frontDesk,
    bell_services: bell,
  };
}

function tryGetSupabase() {
  try {
    return getSupabaseServiceClient();
  } catch (error) {
    logger.warn("[ScheduleForecasting] Supabase not configured", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

router.post("/forecast/resort-staffing", async (req: Request, res: Response) => {
  try {
    const { outletId, startDate, endDate } = ResortStaffingSchema.parse(req.body);
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const supabase = tryGetSupabase();
    if (!supabase) {
      return res.status(501).json({ success: false, error: "Supabase not configured" });
    }

    const { data: days, error: dayError } = await supabase
      .from("resort_forecast_days")
      .select("id, forecast_date, guest_count, rooms, arrivals")
      .eq("org_id", orgId)
      .eq("forecast_version", 1)
      .gte("forecast_date", startDate)
      .lte("forecast_date", endDate)
      .order("forecast_date", { ascending: true });
    if (dayError) throw dayError;

    const { data: outletRows, error: outletError } = await supabase
      .from("resort_forecast_outlet")
      .select("forecast_day_id, final_forecast")
      .eq("outlet_id", outletId);
    if (outletError) throw outletError;

    const { data: banquetRows } = await supabase
      .from("resort_group_blocks")
      .select("block_date, guests")
      .eq("org_id", orgId)
      .gte("block_date", startDate)
      .lte("block_date", endDate);

    const outletByDay = (outletRows || []).reduce<Record<string, number>>((acc, row: any) => {
      acc[String(row.forecast_day_id)] = (acc[String(row.forecast_day_id)] || 0) + Number(row.final_forecast || 0);
      return acc;
    }, {});
    const banquetByDate = (banquetRows || []).reduce<Record<string, number>>((acc, row: any) => {
      acc[String(row.block_date)] = (acc[String(row.block_date)] || 0) + Number(row.guests || 0);
      return acc;
    }, {});

    const staffing = (days || []).map((day: any) => {
      const guestCount = Number(outletByDay[String(day.id)] || 0);
      const banquetGuests = Number(banquetByDate[String(day.forecast_date)] || 0);
      const breakdown = calculateStaffing(
        guestCount,
        Number(day.rooms || 0),
        Number(day.arrivals || 0),
        banquetGuests,
      );
      return {
        date: String(day.forecast_date),
        guestCount,
        banquetGuests,
        breakdown,
      };
    });

    const totals = staffing.reduce(
      (acc, day) => {
        Object.entries(day.breakdown).forEach(([key, value]) => {
          acc[key as keyof StaffingBreakdown] += value;
        });
        return acc;
      },
      {
        front_of_house: 0,
        back_of_house: 0,
        stewarding: 0,
        banquet_ops: 0,
        housekeeping: 0,
        front_desk: 0,
        bell_services: 0,
      } as StaffingBreakdown,
    );

    return res.json({
      success: true,
      data: {
        outletId,
        startDate,
        endDate,
        staffing,
        totals,
      },
    });
  } catch (error: any) {
    logger.error("[ScheduleForecasting] Resort staffing error", { error });
    res.status(500).json({ success: false, error: error?.message || "Failed to forecast staffing" });
  }
});

interface ForecastedDay {
  date: string;
  dayOfWeek: string;
  events: number;
  staffingNeeded: number;
  confidenceScore: number;
  recommendations: string[];
}

interface StaffingPrediction {
  date: string;
  role: string;
  requiredCount: number;
  availableCount: number;
  gap: number;
  criticalityLevel: "low" | "medium" | "high";
}

// Generate 14-day forecast based on events
const generate14DayForecast = (events: any[]): ForecastedDay[] => {
  const forecast: ForecastedDay[] = [];
  const today = new Date();

  for (let i = 0; i < 14; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(forecastDate.getDate() + i);
    const dateStr = forecastDate.toISOString().split("T")[0];
    const dayOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][forecastDate.getDay()];

    // Count events for this day
    const dayEvents = events.filter((e) => e.date === dateStr && e.status !== "cancelled");
    const staffingNeeded = dayEvents.reduce((sum, e) => sum + (e.staffingNeeds?.reduce((s: number, n: any) => s + n.count, 0) || 0), 0);

    // Calculate confidence score based on how far in the future
    const confidenceScore = Math.max(0.6, 1 - i * 0.03);

    // Generate recommendations
    const recommendations: string[] = [];
    if (dayEvents.length > 0) {
      recommendations.push(`${dayEvents.length} event${dayEvents.length > 1 ? "s" : ""} scheduled`);
    }
    if (staffingNeeded > 10) {
      recommendations.push("High staffing demand - consider pre-scheduling");
    }
    if (i < 3 && dayEvents.length > 0) {
      recommendations.push("Upcoming event - finalize prep lists");
    }

    forecast.push({
      date: dateStr,
      dayOfWeek,
      events: dayEvents.length,
      staffingNeeded,
      confidenceScore,
      recommendations,
    });
  }

  return forecast;
};

// Predict staffing needs for a role
const predictStaffingNeeds = (
  events: any[],
  role: string,
  daysAhead: number = 14,
): StaffingPrediction[] => {
  const predictions: StaffingPrediction[] = [];
  const today = new Date();

  for (let i = 0; i < daysAhead; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(forecastDate.getDate() + i);
    const dateStr = forecastDate.toISOString().split("T")[0];

    // Find events for this date
    const dayEvents = events.filter((e) => e.date === dateStr && e.status !== "cancelled");

    // Calculate staffing needs
    const requiredCount = dayEvents.reduce((sum, e) => {
      const staffNeed = e.staffingNeeds?.find((s: any) => s.role === role);
      return sum + (staffNeed?.count || 0);
    }, 0);

    // Mock available staff (would be from actual schedule data)
    const availableCount = Math.floor(Math.random() * 15) + 5;
    const gap = Math.max(0, requiredCount - availableCount);

    // Determine criticality
    let criticalityLevel: "low" | "medium" | "high" = "low";
    if (gap > 5) {
      criticalityLevel = "high";
    } else if (gap > 2) {
      criticalityLevel = "medium";
    }

    predictions.push({
      date: dateStr,
      role,
      requiredCount,
      availableCount,
      gap,
      criticalityLevel,
    });
  }

  return predictions;
};

// Get 14-day forecast
router.get("/forecast/14-day", async (req: Request, res: Response) => {
  try {
    console.log("[SCHEDULE-FORECASTING] Generating 14-day forecast");

    // In production, fetch events from EchoEventStudio API
    // For now, use mock events
    const mockEvents = [
      {
        id: "event-1",
        name: "Corporate Gala",
        date: new Date(new Date().setDate(new Date().getDate() + 2))
          .toISOString()
          .split("T")[0],
        staffingNeeds: [
          { role: "Chef", count: 3 },
          { role: "Waiter", count: 12 },
        ],
        status: "confirmed",
      },
    ];

    const forecast = generate14DayForecast(mockEvents);

    res.json({
      generated: new Date().toISOString(),
      daysAhead: 14,
      forecast,
      summary: {
        totalEvents: forecast.reduce((sum, d) => sum + d.events, 0),
        totalStaffingNeed: forecast.reduce((sum, d) => sum + d.staffingNeeded, 0),
        avgConfidence: forecast.reduce((sum, d) => sum + d.confidenceScore, 0) / 14,
      },
    });
  } catch (error) {
    console.error("[SCHEDULE-FORECASTING] Error generating forecast:", error);
    res.status(500).json({
      error: "Failed to generate forecast",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get staffing predictions for a specific role
router.get("/forecast/staffing/:role", async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const { days } = req.query;
    const daysAhead = parseInt(days as string) || 14;

    console.log(
      `[SCHEDULE-FORECASTING] Predicting staffing needs for ${role} (${daysAhead} days)`,
    );

    // Mock events (in production, fetch from EchoEventStudio)
    const mockEvents = [
      {
        id: "event-1",
        date: new Date(new Date().setDate(new Date().getDate() + 2))
          .toISOString()
          .split("T")[0],
        staffingNeeds: [
          { role: "Chef", count: 3 },
          { role: "Waiter", count: 12 },
          { role: "Bartender", count: 2 },
        ],
        status: "confirmed",
      },
    ];

    const predictions = predictStaffingNeeds(mockEvents, role, daysAhead);

    // Identify critical dates
    const criticalDates = predictions.filter((p) => p.criticalityLevel === "high");

    res.json({
      role,
      daysAhead,
      predictions,
      criticalDates,
      summary: {
        avgRequired: predictions.reduce((sum, p) => sum + p.requiredCount, 0) / predictions.length,
        avgAvailable: predictions.reduce((sum, p) => sum + p.availableCount, 0) / predictions.length,
        daysWithGap: predictions.filter((p) => p.gap > 0).length,
        criticalDays: criticalDates.length,
      },
    });
  } catch (error) {
    console.error("[SCHEDULE-FORECASTING] Error predicting staffing:", error);
    res.status(500).json({
      error: "Failed to predict staffing needs",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get auto-scheduling recommendations
router.get("/recommendations", async (req: Request, res: Response) => {
  try {
    console.log("[SCHEDULE-FORECASTING] Generating auto-scheduling recommendations");

    const forecast = generate14DayForecast([
      {
        id: "event-1",
        date: new Date(new Date().setDate(new Date().getDate() + 2))
          .toISOString()
          .split("T")[0],
        staffingNeeds: [
          { role: "Chef", count: 3 },
          { role: "Waiter", count: 12 },
        ],
        status: "confirmed",
      },
    ]);

    const recommendations = forecast
      .filter((day) => day.recommendations.length > 0)
      .map((day) => ({
        date: day.date,
        dayOfWeek: day.dayOfWeek,
        staffingNeeded: day.staffingNeeded,
        recommendations: day.recommendations,
        priority: day.staffingNeeded > 10 ? "high" : "medium",
      }));

    res.json({
      generated: new Date().toISOString(),
      recommendations,
      total: recommendations.length,
      actions: [
        "Review high-priority dates for early scheduling",
        "Send shift offers to available staff",
        "Monitor event confirmations for changes",
      ],
    });
  } catch (error) {
    console.error("[SCHEDULE-FORECASTING] Error generating recommendations:", error);
    res.status(500).json({
      error: "Failed to generate recommendations",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Trigger auto-scheduling for a date
router.post("/auto-schedule/:date", async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    console.log(`[SCHEDULE-FORECASTING] Triggering auto-schedule for ${date}`);

    // In production, this would:
    // 1. Fetch events for this date from EchoEventStudio
    // 2. Calculate staffing needs
    // 3. Match with available staff
    // 4. Create schedule assignments

    res.json({
      date,
      status: "scheduled",
      staffAssignments: 12,
      eventsScheduled: 1,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[SCHEDULE-FORECASTING] Error in auto-schedule:", error);
    res.status(500).json({
      error: "Failed to auto-schedule",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
