import type { RequestHandler } from "express";

interface DailyForecast {
  day: string;
  date: string;
  dayOfWeek: string;
  weather: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  precipitation: number;
  demandForecast: number;
  confidence: number;
  staffingLevel: string;
  recommendation: string;
  events: string[];
  peakHours: string[];
  revenuePotential: number;
  confidence_level: "High" | "Medium" | "Low";
}

interface DemandAnalysis {
  forecasts: DailyForecast[];
  weekAverage: number;
  peakDay: string;
  lowestDay: string;
  totalPredictedRevenue: number;
  staffingNeeded: number;
  criticalAlerts: string[];
  opportunities: string[];
  seasonalAdjustment: number;
}

const generateDemandForecastHandler: RequestHandler = async (req, res) => {
  try {
    const { days = 7, outlet = "main", includeEvents = true } = req.body;

    const weatherPatterns = [
      {
        weather: "Sunny",
        temp: 72,
        feelsLike: 70,
        humidity: 55,
        precipitation: 0,
        mult: 1.2,
      },
      {
        weather: "Cloudy",
        temp: 68,
        feelsLike: 67,
        humidity: 65,
        precipitation: 0,
        mult: 1.0,
      },
      {
        weather: "Rainy",
        temp: 62,
        feelsLike: 58,
        humidity: 80,
        precipitation: 0.3,
        mult: 0.85,
      },
      {
        weather: "Sunny",
        temp: 75,
        feelsLike: 74,
        humidity: 50,
        precipitation: 0,
        mult: 1.25,
      },
      {
        weather: "Partly Cloudy",
        temp: 70,
        feelsLike: 69,
        humidity: 60,
        precipitation: 0,
        mult: 1.1,
      },
      {
        weather: "Rainy",
        temp: 60,
        feelsLike: 56,
        humidity: 85,
        precipitation: 0.5,
        mult: 0.8,
      },
      {
        weather: "Sunny",
        temp: 74,
        feelsLike: 73,
        humidity: 52,
        precipitation: 0,
        mult: 1.3,
      },
    ];

    const dayNames = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    const events: { [key: number]: string[] } = {
      0: [],
      1: [],
      2: ["Ladies' Night (2x wine sales)"],
      3: [],
      4: ["Happy Hour (5-7 PM - bar focused)"],
      5: ["Private Event (7-10 PM)", "Weekend peak demand"],
      6: ["Brunch Service 11 AM-2 PM"],
    };

    const baseDemand = 65;
    const revenuePerCover = 65;

    const forecasts: DailyForecast[] = Array.from(
      { length: Math.min(days, 7) },
      (_, i) => {
        const today = new Date();
        const forecastDate = new Date(today);
        forecastDate.setDate(forecastDate.getDate() + i);

        const pattern = weatherPatterns[i];

        let eventMultiplier = 1;
        let eventsList: string[] = [];

        if (includeEvents && events[i % 7]) {
          eventsList = events[i % 7];
          if (eventsList.includes("Ladies' Night (2x wine sales)"))
            eventMultiplier *= 1.15;
          if (eventsList.includes("Happy Hour (5-7 PM - bar focused)"))
            eventMultiplier *= 1.1;
          if (
            eventsList.includes(
              "Private Event (7-10 PM)",
              "Weekend peak demand",
            )
          )
            eventMultiplier *= 1.3;
          if (eventsList.includes("Brunch Service 11 AM-2 PM"))
            eventMultiplier *= 1.2;
        }

        const demand = Math.round(baseDemand * pattern.mult * eventMultiplier);

        let staffingLevel = "Standard";
        let peakHours: string[] = [];
        let confidence = Math.floor(Math.random() * 20) + 80;
        let recommendation = "";

        if (demand > 80) {
          staffingLevel = "High";
          peakHours = ["12:00-1:30 PM", "6:00-8:30 PM"];
          confidence = 92;
          recommendation =
            "High demand expected - increase staff by 20%, pre-prep appetizers, ensure full bar coverage";
        } else if (demand > 70) {
          staffingLevel = "Standard+";
          peakHours = ["12:00-1:30 PM", "6:30-8:00 PM"];
          confidence = 85;
          recommendation =
            "Moderate-high demand - standard staffing with cross-training, prep additional proteins";
        } else if (demand < 50) {
          staffingLevel = "Minimal";
          peakHours = ["12:30-1:30 PM", "7:00-8:00 PM"];
          confidence = 78;
          recommendation =
            "Low demand expected - reduce staff, focus on comfort atmosphere, promote specials";
        } else {
          staffingLevel = "Standard";
          peakHours = ["12:00-1:30 PM", "6:30-8:00 PM"];
          confidence = 88;
          recommendation = "Normal demand - standard prep and staffing levels";
        }

        return {
          day: dayNames[i % 7],
          date: forecastDate.toISOString().split("T")[0],
          dayOfWeek: forecastDate.toLocaleDateString("en-US", {
            weekday: "long",
          }),
          weather: pattern.weather,
          temperature: pattern.temp,
          feelsLike: pattern.feelsLike,
          humidity: pattern.humidity,
          precipitation: pattern.precipitation,
          demandForecast: demand,
          confidence,
          staffingLevel,
          recommendation,
          events: eventsList,
          peakHours,
          revenuePotential: demand * revenuePerCover,
          confidence_level:
            confidence >= 85 ? "High" : confidence >= 75 ? "Medium" : "Low",
        };
      },
    );

    const allDemands = forecasts.map((f) => f.demandForecast);
    const weekAverage = Math.round(
      allDemands.reduce((a, b) => a + b, 0) / allDemands.length,
    );
    const peakDay = forecasts.reduce((prev, curr) =>
      prev.demandForecast > curr.demandForecast ? prev : curr,
    ).day;
    const lowestDay = forecasts.reduce((prev, curr) =>
      prev.demandForecast < curr.demandForecast ? prev : curr,
    ).day;

    const totalPredictedRevenue = forecasts.reduce(
      (sum, f) => sum + f.revenuePotential,
      0,
    );
    const avgDemandByStaff = weekAverage / 6;
    const staffingNeeded = Math.ceil(avgDemandByStaff);

    const criticalAlerts: string[] = [];
    const opportunities: string[] = [];

    forecasts.forEach((f) => {
      if (f.weather === "Rainy" && f.demandForecast > 70) {
        criticalAlerts.push(
          `${f.day}: Rain expected but high demand - ensure delivery capacity`,
        );
      }
      if (f.events.length > 0) {
        opportunities.push(
          `${f.day}: Special event "${f.events[0]}" - maximize upsell`,
        );
      }
    });

    const seasonalAdjustment = 1.05;

    const analysis: DemandAnalysis = {
      forecasts,
      weekAverage,
      peakDay,
      lowestDay,
      totalPredictedRevenue,
      staffingNeeded,
      criticalAlerts,
      opportunities,
      seasonalAdjustment,
    };

    res.json(analysis);
  } catch (error) {
    console.error("[DEMAND] Forecast error:", error);
    res.status(500).json({
      error: "Demand forecast generation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export default generateDemandForecastHandler;
