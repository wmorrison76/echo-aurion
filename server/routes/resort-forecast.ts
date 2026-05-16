// @ts-nocheck
import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { getSupabaseServiceClient } from "../lib/supabase-service-client.js";
import { logger } from "../lib/logger";
import { parseResortForecastCsv } from "../lib/resort-forecast-csv";

const router = Router();
router.use(requireAuth);

const ForecastQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  outletId: z.string().uuid().optional(),
  mealPeriod: z
    .enum(["breakfast", "lunch", "dinner", "late_night", "all_day"])
    .optional(),
});

const OverrideSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  outletId: z.string().uuid(),
  mealPeriod: z.enum(["breakfast", "lunch", "dinner", "late_night", "all_day"]),
  overrideValue: z.number().nonnegative(),
});

function emitAurumForecastEvent(payload: {
  orgId: string;
  outletId: string;
  date: string;
  mealPeriod: string;
  finalForecast: number;
  source: "echoai" | "override";
}) {
  logger.info("[ResortForecast] Aurum forecast event", payload);
}

function getOrgId(req: Request): string {
  const orgId = (req as any).user?.org_id;
  if (!orgId) throw new Error("Not authenticated");
  return orgId;
}

function tryGetSupabase() {
  try {
    return getSupabaseServiceClient();
  } catch (error) {
    logger.warn("[ResortForecast] Supabase client not configured", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function getOutletCategory(outlet: any): string {
  return (
    String(outlet?.resort_category || outlet?.outlet_type || "restaurant").toLowerCase() ||
    "restaurant"
  );
}

function getMealPeriodsForOutlet(outlet: any) {
  const category = getOutletCategory(outlet);
  if (category === "restaurant") {
    return ["breakfast", "lunch", "dinner"];
  }
  if (category === "banquet_catering") {
    return ["all_day"];
  }
  return ["all_day"];
}

function getCategoryShare(category: string) {
  switch (category) {
    case "restaurant":
      return 0.4;
    case "pool":
      return 0.15;
    case "cabana":
      return 0.05;
    case "day_pass":
      return 0.05;
    case "banquet_catering":
      return 0.2;
    case "non_restaurant_outlet":
      return 0.15;
    default:
      return 0.1;
  }
}

function getMealRatio(mealPeriod: string) {
  if (mealPeriod === "breakfast") return 0.3;
  if (mealPeriod === "lunch") return 0.35;
  if (mealPeriod === "dinner") return 0.35;
  return 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseTimeToMinutes(time: string | null | undefined) {
  if (!time) return null;
  const [hours, minutes] = String(time).split(":").map((t) => Number(t));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function diffMinutes(start: string | null | undefined, end: string | null | undefined) {
  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);
  if (startMin === null || endMin === null || endMin <= startMin) return 0;
  return endMin - startMin;
}

function getDateDow(date: string) {
  return new Date(`${date}T00:00:00`).getDay();
}

function getBaselineHours(category: string) {
  switch (category) {
    case "pool":
      return 12;
    case "cabana":
      return 10;
    case "day_pass":
      return 10;
    case "banquet_catering":
      return 8;
    case "non_restaurant_outlet":
      return 10;
    default:
      return 10;
  }
}

function getOutletCapacity(category: string) {
  switch (category) {
    case "pool":
      return 220;
    case "cabana":
      return 40;
    case "day_pass":
      return 100;
    case "banquet_catering":
      return 600;
    case "non_restaurant_outlet":
      return 120;
    default:
      return 140;
  }
}

function getEventChannel(metadata: any) {
  if (!metadata || typeof metadata !== "object") return "unspecified";
  return (
    metadata.booking_channel ||
    metadata.channel ||
    metadata.source ||
    metadata.segment ||
    metadata.market_segment ||
    "unspecified"
  );
}

function buildChannelFactor(channelCounts: Map<string, number>) {
  let topChannel = "unspecified";
  let topCount = 0;
  channelCounts.forEach((count, channel) => {
    if (count > topCount) {
      topCount = count;
      topChannel = channel;
    }
  });
  const channel = String(topChannel).toLowerCase();
  if (channel.includes("group") || channel.includes("event") || channel.includes("banquet")) return 1.05;
  if (channel.includes("ota")) return 0.97;
  if (channel.includes("direct") || channel.includes("loyalty")) return 1.03;
  if (channel.includes("day")) return 1.02;
  return 1;
}

async function loadOutlets(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  orgId: string,
  outletId?: string,
) {
  let query = supabase
    .from("calendar_outlets")
    .select("id, name, resort_category, outlet_type")
    .eq("org_id", orgId)
    .is("is_archived", null);
  if (outletId) query = query.eq("id", outletId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { startDate, endDate, outletId, mealPeriod } = ForecastQuerySchema.parse(req.query);
    const report = await parseResortForecastCsv();

    const filteredDays = report.days.filter((day) => {
      if (startDate && day.date < startDate) return false;
      if (endDate && day.date > endDate) return false;
      return true;
    });

    const supabase = tryGetSupabase();
    if (!supabase) {
      return res.json({
        success: true,
        data: {
          startDate: startDate || report.startDate,
          endDate: endDate || report.endDate,
          days: filteredDays,
          forecastDays: filteredDays.map((day) => ({
            id: undefined,
            date: day.date,
            guestCount: day.guestCount || 0,
            occPct: day.occPct || 0,
            rooms: day.rooms || 0,
          })),
          outletMeta: [],
          outletForecasts: [],
          outlets: [],
          groupBlocks: report.groupBlocks,
          activations: [],
        },
      });
    }

    const outlets = await loadOutlets(supabase, orgId, outletId);
    let activationQuery = supabase
      .from("resort_activations")
      .select("*")
      .eq("org_id", orgId);
    if (startDate) activationQuery = activationQuery.gte("activation_date", startDate);
    if (endDate) activationQuery = activationQuery.lte("activation_date", endDate);
    const { data: activations } = await activationQuery;
    const rangeStart = startDate || report.startDate;
    const rangeEnd = endDate || report.endDate;

    const { data: outletHours } = await supabase
      .from("outlet_operating_hours")
      .select(
        "outlet_id, day_of_week, opens_at, closes_at, lunch_open, lunch_close, dinner_open, dinner_close, is_closed",
      )
      .eq("org_id", orgId);

    const { data: outletClosures } = await supabase
      .from("outlet_closure_dates")
      .select("outlet_id, closure_date")
      .eq("org_id", orgId)
      .gte("closure_date", rangeStart)
      .lte("closure_date", rangeEnd);

    const lookbackStart = new Date(`${rangeStart}T00:00:00`);
    lookbackStart.setDate(lookbackStart.getDate() - 90);
    const lookbackStartStr = lookbackStart.toISOString().split("T")[0];

    const { data: eventHistory } = await supabase
      .from("calendar_events")
      .select("outlet_id, date, guest_count, created_at, metadata")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .gte("date", lookbackStartStr)
      .lte("date", rangeEnd);

    const { data: accuracyRows } = await supabase
      .from("resort_forecast_days")
      .select("forecast_date, guest_count, actual_guest_count")
      .eq("org_id", orgId)
      .lt("forecast_date", rangeStart)
      .order("forecast_date", { ascending: false })
      .limit(7);

    const dayRows = filteredDays.map((day) => ({
      org_id: orgId,
      forecast_date: day.date,
      capacity: day.capacity || 0,
      ooo: day.ooo || 0,
      occ_pct: day.occPct || 0,
      rooms: day.rooms || 0,
      revenue: day.revenue || 0,
      adr: day.adr || 0,
      arrivals: day.arrivals || 0,
      departures: day.departures || 0,
      guest_count: day.guestCount || 0,
      forecast_occ_pct: day.forecastOccPct || 0,
      pickup_rooms: day.pickupRooms || 0,
      pickup_revenue: day.pickupRevenue || 0,
      pickup_adr: day.pickupAdr || 0,
      forecast_version: 1,
    }));

    const { data: dayData, error: dayError } = await supabase
      .from("resort_forecast_days")
      .upsert(dayRows, { onConflict: "org_id,forecast_date,forecast_version" })
      .select("id, forecast_date");
    if (dayError) throw dayError;

    const dayIdMap = new Map<string, string>();
    const dayIdToDate = new Map<string, string>();
    (dayData || []).forEach((row: any) => {
      const dateKey = String(row.forecast_date);
      const idKey = String(row.id);
      dayIdMap.set(dateKey, idKey);
      dayIdToDate.set(idKey, dateKey);
    });

    const groupGuestsByDate = report.groupBlocks.reduce<Record<string, number>>((acc, block) => {
      acc[block.date] = (acc[block.date] || 0) + (block.guests || 0);
      return acc;
    }, {});
    const activationByDate = (activations || []).reduce<Record<string, number>>((acc, act: any) => {
      const dateKey = String(act.activation_date);
      acc[dateKey] = (acc[dateKey] || 0) + 1;
      return acc;
    }, {});

    const outletHourMap = new Map<string, any>();
    (outletHours || []).forEach((row: any) => {
      outletHourMap.set(`${row.outlet_id}|${row.day_of_week}`, row);
    });
    const closureSet = new Set<string>();
    (outletClosures || []).forEach((row: any) => {
      closureSet.add(`${row.outlet_id}|${row.closure_date}`);
    });

    const eventStatsByOutletDate = new Map<string, { count: number; guests: number }>();
    const leadTimeByOutlet = new Map<string, { sum: number; count: number }>();
    const channelByOutlet = new Map<string, Map<string, number>>();

    (eventHistory || []).forEach((event: any) => {
      const outletId = String(event.outlet_id || "");
      const dateKey = String(event.date || "");
      if (!outletId || !dateKey) return;
      const eventKey = `${outletId}|${dateKey}`;
      const stats = eventStatsByOutletDate.get(eventKey) || { count: 0, guests: 0 };
      stats.count += 1;
      stats.guests += Number(event.guest_count || 0);
      eventStatsByOutletDate.set(eventKey, stats);

      if (event.created_at) {
        const lead = Math.max(
          0,
          Math.round(
            (new Date(`${dateKey}T00:00:00`).getTime() - new Date(event.created_at).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        );
        const leadStats = leadTimeByOutlet.get(outletId) || { sum: 0, count: 0 };
        leadStats.sum += lead;
        leadStats.count += 1;
        leadTimeByOutlet.set(outletId, leadStats);
      }

      const channel = String(getEventChannel(event.metadata || {}));
      if (!channelByOutlet.has(outletId)) channelByOutlet.set(outletId, new Map());
      const channelMap = channelByOutlet.get(outletId)!;
      channelMap.set(channel, (channelMap.get(channel) || 0) + 1);
    });

    const channelFactorByOutlet = new Map<string, number>();
    const leadTimeFactorByOutlet = new Map<string, number>();
    outlets.forEach((outlet: any) => {
      const outletId = String(outlet.id);
      const leadStats = leadTimeByOutlet.get(outletId);
      const avgLead = leadStats && leadStats.count > 0 ? leadStats.sum / leadStats.count : 14;
      leadTimeFactorByOutlet.set(outletId, clamp(avgLead / 14, 0.85, 1.15));
      const channelCounts = channelByOutlet.get(outletId) || new Map();
      channelFactorByOutlet.set(outletId, buildChannelFactor(channelCounts));
    });

    const accuracyFactor = (() => {
      if (!accuracyRows || accuracyRows.length === 0) return 1;
      const ratios = accuracyRows
        .filter((row: any) => Number(row.guest_count || 0) > 0 && Number(row.actual_guest_count || 0) > 0)
        .map((row: any) => Number(row.actual_guest_count || 0) / Math.max(1, Number(row.guest_count || 0)));
      if (ratios.length === 0) return 1;
      const avg = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
      return clamp(avg, 0.9, 1.1);
    })();

    const outletRows: Array<any> = [];
    const componentRows: Array<any> = [];
    const factorMap = new Map<string, Record<string, number>>();
    const forecastDays = filteredDays.map((day) => ({
      id: dayIdMap.get(day.date),
      date: day.date,
      guestCount: day.guestCount || 0,
      occPct: day.occPct || 0,
      rooms: day.rooms || 0,
    }));

    filteredDays.forEach((day) => {
      const baseGuests = Math.max(0, Number(day.guestCount || 0) - (groupGuestsByDate[day.date] || 0));
      const dayDow = getDateDow(day.date);
      outlets.forEach((outlet: any) => {
        const category = getOutletCategory(outlet);
        const mealPeriods = getMealPeriodsForOutlet(outlet);
        mealPeriods.forEach((period) => {
          if (mealPeriod && period !== mealPeriod) return;
          const share = getCategoryShare(category);
          const ratio = getMealRatio(period);
          let baseForecast = 0;
          let forecast = 0;
          if (category === "banquet_catering") {
            baseForecast = groupGuestsByDate[day.date] || 0;
            forecast = baseForecast;
          } else {
            baseForecast = Math.round(baseGuests * share * ratio);
            forecast = baseForecast;
          }

          const closureKey = `${outlet.id}|${day.date}`;
          const isClosed = closureSet.has(closureKey);
          const outletHours = outletHourMap.get(`${outlet.id}|${dayDow}`);
          const baselineHours = getBaselineHours(category);
          let openMinutes = 0;
          if (!isClosed && outletHours && !outletHours.is_closed) {
            if (period === "lunch") {
              openMinutes += diffMinutes(outletHours.lunch_open, outletHours.lunch_close);
            } else if (period === "dinner") {
              openMinutes += diffMinutes(outletHours.dinner_open, outletHours.dinner_close);
            } else if (period === "breakfast") {
              openMinutes += diffMinutes(outletHours.opens_at, outletHours.lunch_open || outletHours.closes_at);
            } else {
              openMinutes += diffMinutes(outletHours.opens_at, outletHours.closes_at);
            }
          }
          const openHours = openMinutes > 0 ? openMinutes / 60 : 0;
          const operatingHoursFactor = isClosed ? 0 : clamp(openHours / baselineHours || 1, 0.4, 1.2);

          const capacity = getOutletCapacity(category);
          const capacityFactor = clamp(capacity / Math.max(1, baseForecast), 0.7, 1.2);

          const leadTimeFactor = leadTimeFactorByOutlet.get(String(outlet.id)) || 1;
          const channelMixFactor = channelFactorByOutlet.get(String(outlet.id)) || 1;
          const eventStats = eventStatsByOutletDate.get(`${outlet.id}|${day.date}`) || { count: 0, guests: 0 };
          const eventElasticity = clamp(1 + eventStats.count * 0.02 + eventStats.guests / 1000, 0.9, 1.25);

          if (category !== "banquet_catering") {
            forecast = Math.round(
              baseForecast *
                operatingHoursFactor *
                capacityFactor *
                leadTimeFactor *
                channelMixFactor *
                eventElasticity *
                accuracyFactor,
            );
          }
          if (isClosed) forecast = 0;

          const forecastDayId = dayIdMap.get(day.date);
          if (!forecastDayId) return;
          factorMap.set(`${forecastDayId}|${outlet.id}|${period}`, {
            baseForecast,
            operatingHoursFactor,
            capacityFactor,
            leadTimeFactor,
            channelMixFactor,
            eventElasticity,
            accuracyFactor,
            closed: isClosed ? 1 : 0,
          });
          outletRows.push({
            forecast_day_id: forecastDayId,
            outlet_id: outlet.id,
            meal_period: period,
            echoai_forecast: forecast,
            user_override: 0,
            final_forecast: forecast,
            confidence: 0.62,
          });
        });
      });
    });

    const { data: outletData, error: outletError } = await supabase
      .from("resort_forecast_outlet")
      .upsert(outletRows, { onConflict: "forecast_day_id,outlet_id,meal_period" })
      .select("id, forecast_day_id, outlet_id, meal_period, echoai_forecast, final_forecast, confidence");
    if (outletError) throw outletError;

    const outletIds = (outletData || []).map((row: any) => row.id);
    if (outletIds.length > 0) {
      await supabase.from("resort_forecast_components").delete().in("forecast_outlet_id", outletIds);
    }

    (outletData || []).forEach((row: any) => {
      const dateKey = dayIdToDate.get(String(row.forecast_day_id)) || "";
      const day = filteredDays.find((d) => d.date === dateKey);
      const groupGuests = groupGuestsByDate[dateKey] || 0;
      const factorKey = `${row.forecast_day_id}|${row.outlet_id}|${row.meal_period}`;
      const factor = factorMap.get(factorKey) || {};
      const isWeekend = ["Sat", "Sun"].includes(String(day?.dow || ""));
      const pickupFactor = Math.max(0, Math.min(1, Number(day?.pickupRooms || 0) / Math.max(1, Number(day?.rooms || 0))));
      const seasonalityFactor = isWeekend ? 1.1 : 1.0;
      const historicalRatio = Number(day?.guestCount || 0) && Number(day?.rooms || 0)
        ? Number(day?.guestCount || 0) / Math.max(1, Number(day?.rooms || 0))
        : 1;
      const activationUplift = activationByDate[dateKey] ? 1.05 : 1.0;
      const weatherFactor = 1.0;
      const accuracyFactorValue = factor.accuracyFactor || accuracyFactor;
      componentRows.push(
        {
          forecast_outlet_id: row.id,
          component_type: "base_guests",
          value: Number(day?.guestCount || 0),
          coefficient: 1,
          source: "csv",
        },
        {
          forecast_outlet_id: row.id,
          component_type: "baseline_outlet_forecast",
          value: Number(factor.baseForecast || 0),
          coefficient: 1,
          source: "echoai",
        },
        {
          forecast_outlet_id: row.id,
          component_type: "group_blocks",
          value: groupGuests,
          coefficient: 1,
          source: "csv",
        },
        {
          forecast_outlet_id: row.id,
          component_type: "pickup_factor",
          value: pickupFactor,
          coefficient: 1,
          source: "otb_pickup",
        },
        {
          forecast_outlet_id: row.id,
          component_type: "seasonality_factor",
          value: seasonalityFactor,
          coefficient: 1,
          source: "calendar",
        },
        {
          forecast_outlet_id: row.id,
          component_type: "historical_ratio",
          value: historicalRatio,
          coefficient: 1,
          source: "history",
        },
        {
          forecast_outlet_id: row.id,
          component_type: "activation_uplift",
          value: activationUplift,
          coefficient: 1,
          source: "activations",
        },
        {
          forecast_outlet_id: row.id,
          component_type: "weather_factor",
          value: weatherFactor,
          coefficient: 1,
          source: "weather",
        },
        {
          forecast_outlet_id: row.id,
          component_type: "operating_hours_factor",
          value: Number(factor.operatingHoursFactor || 1),
          coefficient: 1,
          source: "hours",
        },
        {
          forecast_outlet_id: row.id,
          component_type: "capacity_factor",
          value: Number(factor.capacityFactor || 1),
          coefficient: 1,
          source: "capacity",
        },
        {
          forecast_outlet_id: row.id,
          component_type: "lead_time_factor",
          value: Number(factor.leadTimeFactor || 1),
          coefficient: 1,
          source: "lead_time",
        },
        {
          forecast_outlet_id: row.id,
          component_type: "channel_mix_factor",
          value: Number(factor.channelMixFactor || 1),
          coefficient: 1,
          source: "channel",
        },
        {
          forecast_outlet_id: row.id,
          component_type: "event_elasticity",
          value: Number(factor.eventElasticity || 1),
          coefficient: 1,
          source: "events",
        },
        {
          forecast_outlet_id: row.id,
          component_type: "accuracy_factor",
          value: Number(accuracyFactorValue || 1),
          coefficient: 1,
          source: "actuals",
        },
        {
          forecast_outlet_id: row.id,
          component_type: "closure_day",
          value: Number(factor.closed || 0),
          coefficient: 1,
          source: "calendar",
        },
        {
          forecast_outlet_id: row.id,
          component_type: "echoai_forecast",
          value: Number(row.echoai_forecast || 0),
          coefficient: 1,
          source: "echoai",
        },
      );
    });

    if (componentRows.length > 0) {
      const { error: compError } = await supabase
        .from("resort_forecast_components")
        .insert(componentRows);
      if (compError) {
        logger.warn("[ResortForecast] Failed to insert components", { error: compError.message });
      }
    }

    return res.json({
      success: true,
      data: {
        startDate: startDate || report.startDate,
        endDate: endDate || report.endDate,
        days: filteredDays,
        forecastDays,
        outletMeta: outlets,
        outletForecasts: outletData || [],
        outlets: outletData || [],
        groupBlocks: report.groupBlocks,
        activations: activations || [],
      },
    });
  } catch (error: any) {
    logger.error("[ResortForecast] Get forecast error", { error });
    res.status(error?.message === "Not authenticated" ? 401 : 500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

router.put("/override", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const payload = OverrideSchema.parse(req.body);
    const supabase = tryGetSupabase();
    if (!supabase) {
      return res.status(501).json({ success: false, error: "Supabase not configured" });
    }

    const { data: dayRow, error: dayError } = await supabase
      .from("resort_forecast_days")
      .select("id")
      .eq("org_id", orgId)
      .eq("forecast_date", payload.date)
      .eq("forecast_version", 1)
      .maybeSingle();
    if (dayError) throw dayError;
    if (!dayRow?.id) {
      return res.status(404).json({ success: false, error: "Forecast day not found" });
    }

    const { data, error } = await supabase
      .from("resort_forecast_outlet")
      .upsert(
        {
          forecast_day_id: dayRow.id,
          outlet_id: payload.outletId,
          meal_period: payload.mealPeriod,
          user_override: payload.overrideValue,
          final_forecast: payload.overrideValue,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "forecast_day_id,outlet_id,meal_period" },
      )
      .select("*")
      .single();
    if (error) throw error;

    await supabase.from("resort_forecast_components").insert([
      {
        forecast_outlet_id: data.id,
        component_type: "user_override",
        value: payload.overrideValue,
        coefficient: 1,
        source: "manual",
        notes: "Override submitted via resort forecast UI",
      },
    ]);

    emitAurumForecastEvent({
      orgId,
      outletId: payload.outletId,
      date: payload.date,
      mealPeriod: payload.mealPeriod,
      finalForecast: Number(data?.final_forecast || payload.overrideValue),
      source: "override",
    });

    return res.json({ success: true, data });
  } catch (error: any) {
    logger.error("[ResortForecast] Override error", { error });
    res.status(error?.message === "Not authenticated" ? 401 : 500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

router.get("/drilldown", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { date, outletId, mealPeriod } = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        outletId: z.string().uuid(),
        mealPeriod: z.enum(["breakfast", "lunch", "dinner", "late_night", "all_day"]),
      })
      .parse(req.query);

    const supabase = tryGetSupabase();
    if (!supabase) {
      return res.status(501).json({ success: false, error: "Supabase not configured" });
    }
    const { data: dayRow, error: dayError } = await supabase
      .from("resort_forecast_days")
      .select("id")
      .eq("org_id", orgId)
      .eq("forecast_date", date)
      .eq("forecast_version", 1)
      .maybeSingle();
    if (dayError) throw dayError;
    if (!dayRow?.id) {
      return res.status(404).json({ success: false, error: "Forecast day not found" });
    }

    const { data: outletRow, error: outletError } = await supabase
      .from("resort_forecast_outlet")
      .select("id, echoai_forecast, user_override, final_forecast, confidence")
      .eq("forecast_day_id", dayRow.id)
      .eq("outlet_id", outletId)
      .eq("meal_period", mealPeriod)
      .maybeSingle();
    if (outletError) throw outletError;
    if (!outletRow?.id) {
      return res.status(404).json({ success: false, error: "Forecast outlet not found" });
    }

    const { data: components, error: compError } = await supabase
      .from("resort_forecast_components")
      .select("*")
      .eq("forecast_outlet_id", outletRow.id);
    if (compError) throw compError;

    return res.json({ success: true, data: { outlet: outletRow, components: components || [] } });
  } catch (error: any) {
    logger.error("[ResortForecast] Drilldown error", { error });
    res.status(error?.message === "Not authenticated" ? 401 : 500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

router.get("/heatmap", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { startDate, endDate, outletId } = ForecastQuerySchema.parse(req.query);
    const supabase = tryGetSupabase();
    if (!supabase) {
      return res.status(501).json({ success: false, error: "Supabase not configured" });
    }

    let dayQuery = supabase
      .from("resort_forecast_days")
      .select("id, forecast_date")
      .eq("org_id", orgId)
      .eq("forecast_version", 1);
    if (startDate) dayQuery = dayQuery.gte("forecast_date", startDate);
    if (endDate) dayQuery = dayQuery.lte("forecast_date", endDate);
    const { data: days, error: dayError } = await dayQuery;
    if (dayError) throw dayError;

    const dayIds = (days || []).map((d: any) => d.id);
    if (dayIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    let outletQuery = supabase
      .from("resort_forecast_outlet")
      .select("forecast_day_id, outlet_id, final_forecast")
      .in("forecast_day_id", dayIds);
    if (outletId) outletQuery = outletQuery.eq("outlet_id", outletId);
    const { data: outletRows, error: outletError } = await outletQuery;
    if (outletError) throw outletError;

    const maxForecast = Math.max(...(outletRows || []).map((row: any) => row.final_forecast || 0), 1);
    const dayMap = new Map<string, string>();
    (days || []).forEach((d: any) => dayMap.set(String(d.id), String(d.forecast_date)));

    const heatmap = (outletRows || []).map((row: any) => ({
      date: dayMap.get(String(row.forecast_day_id)),
      outletId: row.outlet_id,
      forecast: row.final_forecast || 0,
      intensity: Number(((row.final_forecast || 0) / maxForecast).toFixed(3)),
    }));

    return res.json({ success: true, data: heatmap });
  } catch (error: any) {
    logger.error("[ResortForecast] Heatmap error", { error });
    res.status(error?.message === "Not authenticated" ? 401 : 500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

export default router;
